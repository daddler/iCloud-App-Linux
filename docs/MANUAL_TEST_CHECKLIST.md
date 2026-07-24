# Manueller Test-Checkliste

Diese Tests brauchen eine echte Apple-ID und können nicht in CI laufen. Vor jedem Meilenstein-Abschluss und vor jedem Release durchgehen.

## Auth / Onboarding

- [ ] Gültige Apple-ID + Passwort → 2FA-Code-Abfrage erscheint → korrekter Code → Mount gelingt → echte Ordner sichtbar.
- [ ] Falscher 2FA-Code → Inline-Fehler, erneuter Versuch funktioniert ohne Neustart bei Apple-ID-Eingabe.
- [ ] App während der Sitzung beenden/neu starten → kein „stale mount"-Fehler, sauberes Re-Mount.
- [ ] Trust-Token erzwungen ablaufen lassen (oder gespeicherten Token manipulieren) → Re-Auth-Banner erscheint reaktiv, Navigationszustand bleibt erhalten.

## Datei-Explorer (Drive)

- [ ] Ordner anlegen/umbenennen/löschen im Explorer → Änderung auf iCloud.com sichtbar (innerhalb des VFS-Flush-Fensters).
- [ ] Datei (z. B. .txt/.docx) per Doppelklick öffnen → in externer App bearbeiten → speichern → aktualisierter Inhalt auf iCloud.com sichtbar.
- [ ] Einzelne Datei, mehrere Dateien und ein verschachtelter Ordner per Drag & Drop aus dem nativen Dateimanager in die App ziehen → korrekt verschachtelt auf iCloud.com sichtbar.
- [ ] Große Datei ziehen (VFS-Cache-Verhalten/Fortschrittsanzeige unter langsamerer Verbindung prüfen).
- [ ] Namenskonflikt beim Drag & Drop (gleicher Dateiname existiert bereits) → automatische Umbenennung nach Explorer-Konvention.

## Fotos

- [ ] Album durchsuchen, Lightbox öffnen, Einzel- und Mehrfachauswahl-Download, Dateien landen korrekt auf der Festplatte.

## Fehlerzustände

- [ ] FUSE fehlt (z. B. minimale VM/Container ohne fuse3) → freundlicher Fehlerbildschirm, kein Absturz.
- [ ] rclone-Binary fehlt/Prüfsumme stimmt nicht → App verweigert Ausführung mit klarer Fehlermeldung statt eines stillen Absturzes.

## Packaging

- [ ] AppImage bauen (`npm run package:linux`), auf mind. zwei verschiedenen Distros/Desktop-Umgebungen frisch testen (z. B. Ubuntu+GNOME, Fedora/Arch+KDE) ohne vorinstallierte Dev-Tools.
- [ ] Deinstallations-/Reset-Test: `userData`-Verzeichnis löschen → App kehrt sauber zum Onboarding zurück, kein verwaister Mount, kein Absturz.
