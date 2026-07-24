#!/usr/bin/env bash
# Downloads the pinned rclone release for the current (or requested) architecture
# into resources/rclone/<arch>/rclone, verifying its SHA256 against
# resources/rclone/checksums.json before it is ever executed.
#
# <arch> uses Node's/electron-builder's naming ("x64", "arm64"), NOT rclone's
# own uname-style release filenames ("linux-amd64"/"linux-arm64") — this must
# stay in sync with electron/main/rclone/binaryResolver.ts and the `${arch}`
# extraResources macro in electron-builder.yml, both of which also use
# "x64"/"arm64".
#
# Usage: scripts/fetch-rclone.sh [x64|arm64]
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHECKSUMS_FILE="$ROOT_DIR/resources/rclone/checksums.json"

if ! command -v jq >/dev/null 2>&1; then
  echo "error: jq is required (apt install jq / dnf install jq / pacman -S jq)" >&2
  exit 1
fi

ARCH="${1:-}"
if [ -z "$ARCH" ]; then
  case "$(uname -m)" in
    x86_64) ARCH="x64" ;;
    aarch64|arm64) ARCH="arm64" ;;
    *) echo "error: unsupported host architecture $(uname -m)" >&2; exit 1 ;;
  esac
fi

URL="$(jq -r --arg arch "$ARCH" '.artifacts[$arch].url' "$CHECKSUMS_FILE")"
EXPECTED_SHA="$(jq -r --arg arch "$ARCH" '.artifacts[$arch].sha256' "$CHECKSUMS_FILE")"
VERSION="$(jq -r '.version' "$CHECKSUMS_FILE")"

if [ "$URL" = "null" ] || [ -z "$URL" ]; then
  echo "error: no rclone artifact configured for arch \"$ARCH\" in checksums.json" >&2
  exit 1
fi

if [ "$EXPECTED_SHA" = "REPLACE_WITH_VERIFIED_SHA256" ]; then
  echo "error: checksums.json still has a placeholder SHA256 for \"$ARCH\"." >&2
  echo "       Download $URL yourself, verify it against rclone's published" >&2
  echo "       checksums (https://downloads.rclone.org/v${VERSION}/), and paste" >&2
  echo "       the verified sha256 into resources/rclone/checksums.json before" >&2
  echo "       running this script. This is a deliberate safety gate: never" >&2
  echo "       execute a downloaded binary whose checksum hasn't been verified." >&2
  exit 1
fi

DEST_DIR="$ROOT_DIR/resources/rclone/$ARCH"
DEST_BIN="$DEST_DIR/rclone"

if [ -x "$DEST_BIN" ]; then
  ACTUAL_SHA_EXISTING="$(sha256sum "$DEST_BIN" | cut -d' ' -f1)"
  # Note: this only checks the already-extracted binary from a prior run;
  # a fresh download+verify still happens below if it doesn't match.
  :
fi

mkdir -p "$DEST_DIR"
TMP_ZIP="$(mktemp)"
trap 'rm -f "$TMP_ZIP"' EXIT

echo "Downloading rclone v$VERSION for $ARCH..."
curl -fsSL -o "$TMP_ZIP" "$URL"

ACTUAL_SHA="$(sha256sum "$TMP_ZIP" | cut -d' ' -f1)"
if [ "$ACTUAL_SHA" != "$EXPECTED_SHA" ]; then
  echo "error: checksum mismatch for $URL" >&2
  echo "  expected: $EXPECTED_SHA" >&2
  echo "  actual:   $ACTUAL_SHA" >&2
  exit 1
fi

TMP_EXTRACT="$(mktemp -d)"
trap 'rm -rf "$TMP_EXTRACT"' EXIT
unzip -q "$TMP_ZIP" -d "$TMP_EXTRACT"

FOUND_BIN="$(find "$TMP_EXTRACT" -type f -name rclone | head -n1)"
if [ -z "$FOUND_BIN" ]; then
  echo "error: no rclone binary found inside downloaded archive" >&2
  exit 1
fi

cp "$FOUND_BIN" "$DEST_BIN"
chmod +x "$DEST_BIN"
echo "rclone v$VERSION installed at $DEST_BIN"
