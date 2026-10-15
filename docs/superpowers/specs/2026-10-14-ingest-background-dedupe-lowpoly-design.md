# SHADED-LM – Background Ingest, Dedupe, Cleanup & Low-Poly Export

**Status:** Approved conversational design, written specification for implementation review
**Repository:** `Lootziffer666/SHADED-LM`
**Branch:** `feat/mobile-library-v1`
**Date:** 2026-10-14

## 1. Ziel

SHADED-LM soll nicht nur Assets anzeigen, sondern verstreute 3D-Dateien auf Android dauerhaft katalogisieren, im Hintergrund verarbeiten, in einen verwalteten Library-Ordner überführen, Duplikate erkennen, ZIP-Archive und lose Texturen sinnvoll zuordnen und anschließend sichere Aufräumvorschläge machen.

Die Verarbeitung muss auf großen Download-Beständen funktionieren, einschließlich hunderter oder tausender irrelevanter ZIP-Dateien und vieler Bilddateien. Die App darf dabei nicht voraussetzen, dass sie geöffnet bleibt.

## 2. Grundprinzipien

1. **Lokale Verarbeitung zuerst.** Kein Cloud- oder LLM-Zwang für normale Erkennung.
2. **Master-Dateien nie still verändern.** Low-Poly ist standardmäßig Exporttransformation, nicht destruktive Bearbeitung.
3. **Keine unnötige Extraktion.** Bereits entpackte Modelle werden verschoben; ZIP-Inhalte werden nur extrahiert, wenn kein geeigneter loser Kandidat vorhanden ist.
4. **Löschen nur als Vorschlag.** ZIPs, Modelle, Texturen oder Duplikate werden nie automatisch gelöscht.
5. **Checkpointbar.** Jeder lange Vorgang muss pausierbar, fortsetzbar und nach Prozess-/Geräteunterbrechung wiederaufnehmbar sein.
6. **Physische Library als Quelle der Wahrheit.** Persistenter Library-State muss eine App-Deinstallation überleben; IndexedDB dient nur als schneller lokaler Cache.
7. **Technische und semantische Daten trennen.** Rig/Animation/Face/Textured/Low-Poly sind technische Merkmale; Characters/Animals/Vegetation usw. sind Klassen/Kategorien.

## 3. Background Ingest Job

### 3.1 Orchestrierung

Android `WorkManager` orchestriert einen langlebigen Ingest-Job. Dateisystemzugriff, Traversierung, ZIP-Katalogisierung, Dateibewegung und Checkpointing laufen nativ. Three.js/WebView bleibt zuständig für Modellinspektion, Thumbnails, Viewer und UI-nahe Verarbeitung.

Der Job besitzt persistente Zustände:

- `queued`
- `running`
- `pausing`
- `paused`
- `resuming`
- `completed`
- `cancelled`
- `failed`

### 3.2 Pause, Fortsetzen, Abbrechen

**Pause** beendet den aktuellen atomaren Schritt sauber, schreibt einen Checkpoint und beendet danach den Worker. **Fortsetzen** startet einen neuen Worker ab dem letzten vollständigen Checkpoint. **Abbrechen** markiert den Gesamtjob dauerhaft als beendet und räumt nur temporäre Arbeitsdateien auf, nicht importierte Originale oder bereits bestätigte Library-Dateien.

Aktionen müssen sowohl in der App als auch – soweit Android dies erlaubt – direkt in der laufenden Notification verfügbar sein.

### 3.3 Fortschritt

Fortschritt wird persistent gespeichert und in App + Notification gezeigt:

- gefundene Dateien
- berücksichtigte Dateien
- Gesamtzahl, sobald Traversierung abgeschlossen ist
- relevante Modelle
- irrelevante ZIPs
- Textur-Kandidaten
- Duplikatgruppen
- importierte Assets
- Fehler
- aktueller Pfad / aktueller Verarbeitungsschritt

Vor bekannter Gesamtzahl wird ein indeterminierter Discovery-Fortschritt angezeigt. Danach `erledigt / insgesamt`.

## 4. Quellen und Download-Ordner

SHADED-LM unterstützt mehrere Quellen gleichzeitig. Ein `+` fügt eine Quelle hinzu, statt die bestehende Quelle zu ersetzen.

Quelltypen:

- SAF-Verzeichnisbaum
- verwalteter Library-Root
- optionaler All-Files-/Downloads-Modus für Sideload-Builds

Androids SAF-Beschränkung auf den Download-Root wird nicht verschleiert. Falls der Nutzer vollen Download-Zugriff aktiviert, wird dieser als eigener Quelltyp behandelt.

## 5. Inkrementelle Dateitraversierung

Der aktuelle vollständige Vorabscan wird ersetzt. Der native Walker liefert echte inkrementelle Seiten und persistiert den Traversierungszustand. Große Verzeichnisse blockieren weder UI noch Worker-Start.

Für jede Datei wird mindestens gespeichert:

- stabile Quellenkennung
- relativer Pfad
- Dateiname
- Größe
- Änderungszeit, sofern verfügbar
- MIME/Extension
- Quelltyp

## 6. ZIP-Strategie

### 6.1 Kein Vollkopieren nur zur Erkennung

Eine ZIP wird nicht standardmäßig komplett in einen Cache kopiert, nur um festzustellen, ob Modelle enthalten sind.

Vorgehen:

1. Central Directory / ZIP-Inhaltsverzeichnis lesen.
2. Nur Eintragsnamen und Metadaten erfassen.
3. Relevanz bestimmen.
4. Nur relevante Modell-/Abhängigkeitsdaten bei Bedarf lesen oder extrahieren.

Seekbarer Zugriff wird bevorzugt. Nicht seekbare Provider erhalten einen Fallback, dessen Kosten sichtbar bleiben und der gecacht wird.

### 6.2 Negativ-Cache

Irrelevante ZIPs erhalten einen persistenten Cache-Eintrag auf Basis von Quellenkennung, Größe und Änderungszeit. Unveränderte ZIPs ohne unterstützte Modelle oder relevante verschachtelte ZIPs werden bei Folgescans nicht erneut tief untersucht.

### 6.3 Nested ZIP

Verschachtelte ZIPs bleiben bis zur konfigurierten Tiefe unterstützt. Sie werden nur geöffnet, wenn das übergeordnete Inhaltsverzeichnis sie tatsächlich enthält.

## 7. Persistenter Library-State über Deinstallation

IndexedDB/Dexie bleibt ein Performance-Cache, ist aber nicht die einzige Quelle der Wahrheit.

Der verwaltete Library-Root enthält einen persistenten SHADED-LM-State, mindestens:

- Library-Manifest
- Kategorien
- Tags
- Packs/Provenienz
- technische Inspektionen
- Thumbnail-Dateien
- Ingest-/Ignore-/Negativ-Cache-Metadaten, soweit sinnvoll
- Dedupe-Gruppen und bestätigte Entscheidungen

Nach Neuinstallation kann die Library aus diesem State wiederhergestellt werden.

## 8. Import in den verwalteten Library-Root

Einmal festgelegt, ist der Library-Root das physische Ziel.

Priorität beim Import:

1. Bereits vorhandenes korrektes Library-Asset wiederverwenden.
2. Bereits lose/entpackte passende Datei verschieben.
3. Erst wenn nötig aus ZIP direkt in das endgültige Ziel extrahieren.

Es wird nicht zunächst in einen Zwischenordner entpackt und anschließend nochmals verschoben, wenn der endgültige Zielpfad bereits bekannt ist.

Bundle-Abhängigkeiten von GLTF/OBJ/FBX werden gemeinsam behandelt.

## 9. Duplikaterkennung

Drei getrennte Ebenen:

### 9.1 Byte-identisch

SHA-256 identisch. Sicherster Löschkandidat.

### 9.2 Bundle-identisch

Primärmodell und alle relevanten Sidecars/Abhängigkeiten inhaltlich identisch.

### 9.3 Geometrisch identisch

Kanonischer Geometry Fingerprint aus normalisierter Geometrie. Gleiche Geometrie bedeutet **nicht automatisch löschbar**, weil Materialien, Texturen, Rigging oder Animationen abweichen können.

UI trennt daher:

- `Exakte Duplikate – Löschung vorschlagbar`
- `Gleiche Geometrie – prüfen`

Automatische Löschung ist ausgeschlossen.

## 10. ZIP- und Datei-Cleanup-Vorschläge

Nach verifiziertem Import kann SHADED-LM Dateien als aufräumbar markieren.

Eine ZIP ist sicher vorschlagbar, wenn alle relevanten 3D-Inhalte verifiziert in der Library vorhanden sind. Enthält die ZIP zusätzliche nicht importierte Dateien, zeigt die UI dies explizit an.

Beispiele:

- `37 Archive können vermutlich gelöscht werden`
- `11,4 GB potenziell freigebbar`
- `enthält zusätzlich 84 nicht importierte Dateien`

Ein Löschen erfolgt nur nach expliziter Auswahl + Bestätigung.

## 11. Lose Texturen im Download-Ordner

Bilddateien werden katalogisiert, aber nicht als normale 3D-Library-Assets angezeigt.

Für Modelle ohne erkannte Texturzuordnung sucht ein `TextureCandidateResolver` Kandidaten über mehrere Evidenzen:

1. explizite Referenz im Modell/Sidecar
2. Dateinamensähnlichkeit
3. bekannte Map-Suffixe (`albedo`, `basecolor`, `diffuse`, `normal`, `roughness`, `metallic`, `ao`, `orm`, `opacity`, `emission`, `height` usw.)
4. gemeinsamer Quellordner / gemeinsames Pack / gleiche ZIP
5. zeitliche Nähe im Download-Verlauf
6. Bildabmessungen und technisch plausible Nutzung

Zeitliche Nähe ist nur Zusatzsignal, nie alleinige Zuordnung.

### 11.1 Confidence

Kandidaten erhalten einen Score und eine Erklärung der Evidenz.

Beispiel:

- 94 % → direkte Übernahme vorschlagen
- mittlere Sicherheit → `Prüfen`
- geringe Sicherheit → optional `Für LLM markieren`

### 11.2 LLM-Review-Queue

`Für LLM markieren` legt nur lokal einen Review-Datensatz an. Es erfolgt kein automatischer Upload. Ein später angebundenes LLM erhält nur nach expliziter Nutzeraktion die nötigen Kandidateninformationen.

## 12. Technische Filter und Klassen-Navigation

Technische Filter bleiben separate Chips:

- Rigged
- Animated
- Face Rig
- Textured
- Low Poly

Daneben steht die Klassenhierarchie:

- Characters
- Animals
- Vegetation
- Architecture
- Props
- Vehicles
- Environment
- Food
- Structures
- Effects
- Animations
- Collections

Tippen auf eine Klasse erweitert ihre Kinder horizontal direkt rechts daneben; weitere Ebenen verhalten sich genauso.

## 13. Low-Poly-Erkennung

`Low Poly` wird automatisch als technisches Merkmal berechnet. Es ist kein semantisches Tag.

Die Bewertung nutzt mindestens:

- Triangle Count
- Vertex Count
- Tris pro Mesh
- Material-/Texture-Komplexität
- Bounds/Größenrelation, soweit sinnvoll

Gespeichert werden sowohl `lowPolyScore` als auch eine boolesche Filterklassifikation. Schwellenwerte bleiben intern versioniert, damit spätere Änderungen nachvollziehbar sind.

## 14. Low-Poly-Export

### 14.1 Engine

SHADED-LM verwendet für allgemeinen Export `meshoptimizer` als primären Simplifier. SHADEDs eigener `simplifyLocked` bleibt Referenz/Alternative für SHADED-spezifische Cluster-DAG-Anwendungen, wird aber nicht als Standard-Asset-Exporter übernommen.

### 14.2 Bedienung

Der Viewer bekommt einen stufenlosen Regler. Angezeigt werden mindestens:

- Originaltris
- Zieltris
- Reduktionsprozent
- gemessener/geschätzter Fehler

Exportoptionen:

- Original
- aktueller Reglerwert
- Ziel-Triangle-Count
- benutzerdefiniert

Der Master bleibt unverändert. Optional kann später eine zusätzliche Low-Poly-Variante bewusst in die Library gespeichert werden.

## 15. Tag- und Löschmodus

### 15.1 Tag

`Tag` aktiviert Auswahlmodus. Der Nutzer wählt Assets, bestätigt die Auswahl oder bricht ab. Erst nach Auswahlbestätigung öffnet der Tag-Editor. Nach Speichern oder Abbruch ist Tag-Modus aus und die Auswahl leer.

### 15.2 Löschen

`Löschen` nutzt denselben Auswahlmodus. Bundle-Mitglieder werden gemeinsam behandelt. Assets aus ZIPs werden nicht destruktiv aus dem Archiv entfernt; stattdessen werden Library-/Ignore-Zustände aktualisiert und das Archiv kann separat zum Löschen vorgeschlagen werden.

## 16. Fehlerbehandlung und Recovery

Jeder Arbeitsschritt muss idempotent oder journalisiert sein. Crash, App-Schließen, Geräte-Neustart oder Worker-Abbruch dürfen keinen halb verschobenen Zustand als erfolgreich markieren.

Move/Extract/Delete folgen weiterhin dem Muster:

`write/copy → verify → persist state → optional source cleanup`

Fehler betreffen einzelne Assets/Archive und stoppen nicht zwangsläufig den gesamten Job.

## 17. Tests

Erforderliche Tests umfassen:

- Pause/Fortsetzen/Abbrechen mit persistentem Checkpoint
- Fortschrittszählung vor/nach bekannter Gesamtzahl
- tausende irrelevante ZIPs ohne Vollkopie
- Negativ-Cache für unveränderte ZIPs
- nested ZIP bis Tiefenlimit
- bereits entpacktes Modell wird verschoben statt erneut extrahiert
- exakte Dedupe-Erkennung
- gleiche Geometrie mit unterschiedlichen Materialien wird nicht als sicher löschbar markiert
- ZIP-Cleanup nur nach verifiziertem Import
- Texturkandidat per Dateiname
- Texturkandidat per Zeitnähe ohne falsche automatische Übernahme
- Persistenzwiederherstellung nach leerem App-Cache
- technische Klassenfilter-Hierarchie
- Low-Poly-Score
- meshoptimizer-Export mit unverändertem Master
- Tag- und Löschmodus mit Auswahlbestätigung und sauberem Abbruch

## 18. Nicht-Ziele dieser Erweiterung

- vollautomatische semantische KI-Klassifikation aller Assets
- automatisches Löschen ohne Nutzerbestätigung
- destruktive Bearbeitung der Mastermodelle
- Cloud-Zwang
- Umschreiben von ZIP-Archiven, um einzelne enthaltene Assets zu entfernen

## 19. Implementierungsreihenfolge

Die Umsetzung soll in dieser Reihenfolge erfolgen:

1. persistentes Job-/Checkpoint-/Progress-Modell
2. echter inkrementeller Android-Dateiwalker
3. ZIP-Central-Directory-Indexer + Negativ-Cache
4. persistenter Library-State außerhalb des App-Sandboxes
5. Multi-Source + Download-/All-Files-Quelle
6. Tag-/Delete-Auswahlmodus
7. Import/Sammelordner + verifiziertes Move/Extract
8. Dedupe + Cleanup-Vorschläge
9. TextureCandidateResolver + Review-Queue
10. technische Klassen-/Low-Poly-Filter
11. meshoptimizer-Export
12. End-to-End Android-Verifikation und updatefähiges APK
