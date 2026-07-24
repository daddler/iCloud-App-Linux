# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository policy

- **Develop and push directly to `main`.** This repo does not use feature branches or PRs for regular work — commit and push straight to `main`.
- Every push to `main` automatically triggers `.github/workflows/release.yml`, which builds the AppImage and publishes it as a new GitHub Release (tag `v<package.json version>-<short sha>`). Keep this in mind: a broken build on `main` immediately produces a broken/failed release run, not just a failed PR check.
- `.github/workflows/ci.yml` also runs on every push to `main` (typecheck, lint, test).

## Commands

```bash
npm install
npm run prebuild:rclone   # fetches + checksum-verifies the pinned rclone binary into resources/rclone/<arch>/rclone
npm run dev                # full app with real rclone/Apple auth (electron-vite dev)
npm run dev:mock           # renderer-only dev loop; sets E2E_MOCK_RCLONE=1 so main skips real rclone/mount/IPC wiring
npm run build               # electron-vite build (main + preload + renderer) into dist/
npm run typecheck           # tsc --noEmit against tsconfig.main.json and tsconfig.renderer.json separately
npm run lint                 # eslint . (flat config in eslint.config.js)
npm test                     # vitest run
npm run test:watch          # vitest watch mode
npm run package:linux        # prebuild:rclone + build + electron-builder --linux AppImage -> release/*.AppImage
```

Run a single test file: `npx vitest run test/main/FsBridge.test.ts`. Tests live under `test/main/` (Node/Electron-side unit tests, `electron` is mocked via `vi.mock('electron', ...)` where needed — see `test/main/binaryResolver.test.ts`).

## Architecture

This is an Electron app that gives Linux users a native-feeling file explorer for iCloud Drive and iCloud Photos, packaged as a single AppImage. There is no official Apple API for this — everything goes through a bundled `rclone` binary and its `iclouddrive` backend (rclone's own reverse-engineered client for iCloud's private web API).

### The core idea: rclone mount as the source of truth

The main process spawns a single long-lived `rclone rcd` process (`electron/main/rclone/RcloneManager.ts`) exposing rclone's JSON "remote control" (rc) API on a random localhost port with a random per-launch user/pass. Everything else is built around that one process:

- **Mounting** (`electron/main/mount/MountManager.ts`) uses the rc API's `mount/mount` to expose `icloud:` (Drive) and `icloud:Photos` as local FUSE directories under `app.getPath('userData')/mount/{drive,photos}`. The Photos mount is read-only and best-effort — if it fails, Drive still works.
- Once mounted, the renderer's file explorer just reads a **normal-looking local directory tree**. `FsBridge` (`electron/main/fs/FsBridge.ts`) wraps plain Node `fs` calls scoped to the mount root, with a manual segment-stack path resolver that explicitly rejects `..` traversal attempts above the root (does not silently clamp them — see the tests for the reasoning).
- "Edit in place" is not a custom feature — double-click just calls `shell.openPath()` on the mounted file's real path. Any external app editing and saving that file writes straight back to iCloud through rclone's VFS layer.
- Drag-and-drop upload (`electron/main/transfer/TransferService.ts`) copies dropped files directly onto the mount with plain streaming `fs` calls (not through rclone's `operations`/`sync` rc endpoints) — the VFS cache picks up the write and uploads it in the background. Progress is reported in two phases: "copying" (our own byte counter) and "uploading" (polling rc `core/stats`/`vfs/stats` until nothing is pending).
- Because the renderer is sandboxed (`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`), it can't read mounted files directly for `<img>` tags (e.g. photo thumbnails). `electron/main/protocol/mediaProtocol.ts` registers a privileged `icloud-media://` scheme (`icloud-media://drive/<path>` / `icloud-media://photos/<path>`) that main resolves against the mount roots and streams via `net.fetch(pathToFileURL(...))`.

### Auth flow

`electron/main/auth/AuthService.ts` drives Apple ID + 2FA against rclone's rc `config/create`/`config/update` "continuation" protocol (state token + option round-trips, the same mechanism `rclone config create` uses interactively but driven non-interactively). **The exact shape of this continuation for the `iclouddrive` backend's 2FA step is unverified against a live Apple ID** — this is the single highest-uncertainty part of the codebase; if 2FA login misbehaves, start here and check the field names (`State`/`Result`/`Option`) against whatever rclone version is actually pinned in `resources/rclone/checksums.json`.

### IPC boundary

`src/shared/ipc-types.ts` defines the `IcloudBridge` interface — the single contract shared by main (`electron/main/ipc/registerIpcHandlers.ts`, wiring `ipcMain.handle`), preload (`electron/preload/index.ts`, `contextBridge.exposeInMainWorld('icloud', ...)`), and renderer (`window.icloud.*`). When adding a new main<->renderer capability, extend this interface first, then implement both sides against it.

### The rclone binary: arch naming is load-bearing

`resources/rclone/<arch>/rclone` uses **Node's/electron-builder's arch strings (`x64`, `arm64`)**, not rclone's own uname-style release naming (`amd64`/`arm64` in filenames like `rclone-v1.69.0-linux-amd64.zip`). This must stay consistent across three places that all independently compute or consume this folder name:
- `scripts/fetch-rclone.sh` (writes it, mapping `uname -m` output to `x64`/`arm64`)
- `electron/main/rclone/binaryResolver.ts` (`archFolder()` reads it via `process.arch`, which is already `x64`/`arm64` natively — no translation needed there)
- `electron-builder.yml`'s `extraResources` entry, which uses electron-builder's `${arch}` template macro (resolves to `x64`/`arm64`)

Mismatching these silently drops the rclone binary out of the packaged app with only a quiet "file source doesn't exist" line in the electron-builder build log — it does not fail the build. If the packaged AppImage complains it can't find rclone at runtime, check this three-way naming agreement first.

`resources/rclone/checksums.json` pins an exact rclone version + verified SHA256 per arch; `scripts/fetch-rclone.sh` refuses to download anything if the checksum still says `REPLACE_WITH_VERIFIED_SHA256`. Bumping the rclone version is a deliberate, manual act (update the URL + verified hash), not an automatic latest-version fetch — partly because of the auth continuation fragility noted above.

### electron-builder config gotcha

`publish: null` in `electron-builder.yml` is required, not optional cosmetics — electron-builder auto-detects a GitHub publish target whenever it's run against a tagged/CI ref, and `null` is the only value that actually disables it in config (a string like `"never"` is parsed as a *provider name* and crashes with "Cannot find module 'electron-publisher-never'"). Actual publishing to GitHub Releases in this repo happens via a separate `gh release create` step in `release.yml`, not via electron-builder's own publish mechanism.

### Module system note

Root `package.json` has `"type": "module"`. electron-vite therefore bundles the main and preload processes as ESM (`dist/electron/main/index.js`, `dist/electron/preload/index.mjs`) — `electron/main/index.ts` uses `import.meta.dirname` rather than `__dirname` for this reason, and the preload path referenced from `BrowserWindow`'s `webPreferences.preload` must keep the `.mjs` extension.

## Known limitations (v1, by design)

- No global full-text search across iCloud Drive — only a client-side filter within the currently open folder.
- iCloud Photos view is browse/download only — no rename/delete/organize.
- Single iCloud account per app instance (no account switcher).
- No fallback mode without FUSE; the app simply doesn't work if `fuse3` isn't installed on the host.
- No auto-update mechanism — each `release.yml` run produces a fresh GitHub Release the user downloads manually.
