# iCloud Explorer für Linux

Ein Datei-Explorer für iCloud Drive und iCloud Photos unter Linux, verpackt als einzelne AppImage. Ermöglicht Browsen, direktes Bearbeiten von Dateien "in der Cloud" (über einen lokalen FUSE-Mount) und Hochladen per Drag & Drop.

## Wichtiger Hinweis

Diese App ist **nicht von Apple autorisiert oder mit Apple verbunden**. Apple bietet keine offizielle Linux-API für iCloud. Diese App nutzt stattdessen [rclone](https://rclone.org)s `iclouddrive`-Backend, das die private Web-API von iCloud.com nachbildet (reverse engineering), inklusive 2FA-Anmeldung. Das ist eine seit Jahren von vergleichbaren Open-Source-Tools genutzte Grauzone der Apple-Nutzungsbedingungen für private Nutzung — funktioniert zuverlässig, kann aber von Apple jederzeit ohne Vorankündigung geändert oder blockiert werden. Der 2FA-„Trust Token" läuft nach ca. 30 Tagen ab und erfordert eine erneute Anmeldung.

Zugangsdaten werden ausschließlich lokal gespeichert (verschlüsselt über den System-Keyring, siehe unten) und nur direkt an Apples eigene Server gesendet.

## Voraussetzungen

- Ein Linux-Desktop mit **FUSE** installiert (`fuse3`, i. d. R. bereits vorhanden). Falls nicht:
  - Debian/Ubuntu: `sudo apt install fuse3`
  - Fedora: `sudo dnf install fuse3`
  - Arch: `sudo pacman -S fuse3`
- Ein System-Keyring (gnome-keyring, kwallet o. ä.) für die sichere Speicherung des Konfigurations-Schlüssels. Ohne Keyring fällt die App auf eine Klartext-Datei mit Warnhinweis zurück.

## Nutzung (fertige AppImage)

```bash
chmod +x iCloud-Explorer-*.AppImage
./iCloud-Explorer-*.AppImage
```

Beim ersten Start: Apple-ID + Passwort eingeben, den per Push/SMS gesendeten Bestätigungscode eingeben — danach wird iCloud Drive automatisch eingehängt und im Explorer angezeigt.

## Entwicklung

```bash
npm install
npm run prebuild:rclone   # lädt die gepinnte rclone-Version, siehe resources/rclone/checksums.json
npm run dev               # startet die App mit echtem rclone/Apple-Login
npm run dev:mock          # startet die UI ohne echten rclone-Prozess (Fixture-Daten, für UI-Arbeit ohne Apple-ID)
```

Weitere Skripte:

```bash
npm run typecheck
npm run lint
npm test
npm run package:linux      # baut die AppImage nach release/
```

### Architektur (Kurzfassung)

- **Electron Main Process**: startet und überwacht einen einzelnen langlebigen `rclone rcd`-Prozess (rclones Remote-Control-API), verwaltet Login/2FA, mountet `icloud:` (Drive) und `icloud:Photos` als lokale FUSE-Verzeichnisse.
- Der Datei-Explorer im Renderer liest diese FUSE-Mounts einfach wie einen normalen Ordner — Öffnen einer Datei via Doppelklick nutzt `shell.openPath()` auf den Mount-Pfad, sodass jede externe App beim Speichern transparent zurück nach iCloud schreibt.
- Drag & Drop kopiert Dateien direkt auf den Mount; rclones VFS-Cache-Schicht übernimmt den eigentlichen Upload im Hintergrund.
- Details, Architekturentscheidungen und offene Punkte: siehe `docs/`.

### rclone-Binary

Der `rclone`-Binary wird **nicht** im Repo mitgeführt (siehe `.gitignore`), sondern über `scripts/fetch-rclone.sh` anhand einer gepinnten Version + SHA256-Prüfsumme aus `resources/rclone/checksums.json` heruntergeladen und verifiziert. Ein neuer rclone-Release wird bewusst nicht automatisch übernommen — insbesondere weil die genaue 2FA-Rückfrage-Logik (`config/create` non-interactive continuation) versionssensibel sein kann (siehe `docs/MANUAL_TEST_CHECKLIST.md`).

## Bekannte Grenzen (v1)

- Keine globale Volltextsuche über ganz iCloud Drive (nur Filter im aktuellen Ordner).
- iCloud Photos: nur Browsen/Download, kein Umbenennen/Löschen/Organisieren.
- Ein iCloud-Account pro App-Instanz (kein Konto-Umschalter).
- Kein Fallback-Modus ohne FUSE.

## Lizenz

MIT, siehe `LICENSE`. Nutzt [rclone](https://rclone.org) (MIT-Lizenz) als gebündelte externe Binary.
