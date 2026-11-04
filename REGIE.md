# Foto-Lotse – Regiebericht

Stand: 4. Nov. 2026 abends · Levin (Holtcraft) · **Version v3.3** (geprüft, Messzeug repariert)

## Versionen

Jeder Stand liegt auf GitHub. Zurückholen: Claude sagen „bau zurück auf vX“.

| Version | Wo | Was |
| --- | --- | --- |
| v3.3 | Branch `main` (aktuell), gesichert als `stand-v3.3` | wie v3.2, dazu Spiegeln links ↔ rechts (Holzbreite der sicheren Seite auf die falsche übertragen, nur wenn alle 3 Durchgänge einig) |
| v3.2 | Branch `stand-v3.2` | v3 mit 3-Raster-Mehrheit, Selbsteinschätzung, Ecken/Winkel/Diagonalen |
| v3 | Branch `stand-v3` | Fenstermaß auf dem fertigen Foto von der Holzseite her (entzerren, ruhiger Holzstreifen, Rahmenfarbe, Schattenfuge) |
| v2 | Branch `stand-v2` (Commit `c38168f`) | Ablauf ohne Zwischenklicks, Schärfe, Griffvorschlag, Lernfotos, Prüfstand; Kantensuche vom Blatt nach außen |

Git-Tags lassen sich aus Claudes Umgebung nicht hochladen, deshalb sind Versionen als Branches gesichert.

Dieser Bericht hält jeden Schritt und jede Änderung am Foto-Lotsen fest, damit sich der Stand jederzeit nachvollziehen und nachbauen lässt. Der genaue Stand ist immer der Code in diesem Repo. Neue Änderungen kommen oben ins Änderungsprotokoll.

## Zweck und Zielbild

Der Foto-Lotse soll ein Fenster so vollständig erfassen, dass Holtcraft es in der Werkstatt nachbauen könnte, ohne es je gesehen zu haben. Der Kunde arbeitet dabei so wenig wie möglich: Maßblatt drucken, ans Fenster kleben, auf „Analyse starten“ tippen und nur noch dorthin gehen, wohin der Lotse ihn schickt. Läuft im Browser, ohne App.

Ziel am Ende, nach Prüfung durch Tim und Einbau in die Website:

- Größe von Flügel und Rahmen aus dem Maßblatt
- Bauart (Kastenfenster, Verbundfenster, Holz, Kunststoff)
- Griffseite, Bandseite, Dreh, Dreh-Kipp oder Kipp
- Beschläge, später auch das Getriebe bei geöffnetem Flügel
- grobe Schadenserkennung und daraus in wenigen Klicks ein Preis

Die Maße der Profile (IV 68, 78, 92) und der Aufbau von Kastenfenstern sind weitgehend genormt und können als hinterlegte Werte dienen. Langfristig soll eine wachsende Sammlung echter Fenster (Fotos plus Levins Aufmaß vor Ort) die Erkennung genauer machen.

## Stand und Ablage

| Datei | Inhalt |
| --- | --- |
| `index.html` | Seite, Kamera, Ablauf, Messung, Schärfe, Griffsuche (alles in einem) |
| `REGIE.md` | Dieser Bericht |
| `CLAUDE.md` | Arbeitsregeln für Claude-Sitzungen (aus beiden Accounts) |
| `README.md` | Kurzbeschreibung |
| `vendor/face-api.js` + `vendor/model/` | Gesichtserkennung zum Verpixeln (MIT-Lizenz) |
| `fonts/` | Schrift Space Grotesk (SIL OFL 1.1) |
| `pruefstand/pruefstand.js` | Prüfstand: Lotse über alle Lernfotos, Vergleich mit echten Maßen |
| `pruefstand/wackel.js` | Wackeltest: jedes Lernfoto in 5 Varianten (Weichzeichnen selbst gerechnet), Streuung der Maße |
| `pruefstand/nachtrag.json` | Nachgetragene echte Maße, Flügelanzahl, Bauart und „ignorieren“ je Lernfoto-Ordner (gewinnt gegen `fenster.json`) |

Live: https://levintheo.github.io/foto-lotse/ (GitHub Pages, Branch `main`).

## Startseite

Von oben nach unten: Überschrift „Fotos von deinem Fenster“, kurzer Erklärtext, oranger Knopf „Analyse starten“, darunter Knopf „Manuelles Aufmaß“, darunter gestrichelt „Entwickler: Lernfotos“ (nur für Levin, siehe unten). Der zweite Knopf ist ein Platzhalter: Er öffnet vorerst das Formular mit „Selbst eingeben“ (Fenstertyp, Flügel, Oberlicht, Maße, Messwerte zeigen). Der eigene Lotse ohne Drucker kommt später. Fotoliste, Fensterkasten und „Zum Testen“ sind ausgeblendet (`hidden`), nicht gelöscht.

## Der Ablauf

Nach „Analyse starten“ geht der Lotse alle Fotos der Reihe nach durch. Der Kunde tippt nur den Auslöser. Ein gutes Foto ist 1,5 Sekunden zu sehen, dann kommt von selbst das nächste.

```
Analyse starten → Ganzes Fenster (löst selbst aus)
  → Scharf?  nein: selbst nochmal, bis 3×
  → Griff sicher?  nein: eine Frage „links / rechts“
  → Griff → Schere oben → Ecklager unten → Fenster gekippt (nur Dreh-Kipp) → Von außen (freiwillig)
```

Die Schärfeprüfung läuft nach jedem Foto. Die Griffsuche nur beim ersten Foto und nur bei 1 Flügel. Kastenfenster: oberes und unteres Band statt Schere und Ecklager, kein Kippen.

| Nr. | Foto | Was der Kunde sieht und tut | Auslösen |
| --- | --- | --- | --- |
| 1 | Ganzes Fenster von innen | Maßblatt mittig auf die Scheibe, ca. 3 m mittig davor. Hinweise wie „Geh 1 m zurück“, grüner Umriss | selbst |
| 2 | Griff | Text nennt die Seite („Der Griff ist rechts am Flügel“), kleine Karte zeigt die Stelle | Kunde |
| 3 | Scherenlager oben | Obere Ecke an der Bandseite, Abdeckung in den Kasten | Kunde |
| 4 | Ecklager unten | Untere Ecke an der Bandseite, Abdeckung in den Kasten | Kunde |
| 5 | Fenster gekippt | „Griff nach oben drehen und den Flügel kippen“, ganzes Fenster ins Bild (nur Dreh-Kipp) | Kunde |
| 6 | Von außen | Nur wenn gefahrlos erreichbar, überspringbar | selbst |

## Technik je Baustein

Alles rechnet auf dem Handy, nichts wird verschickt. Die schwere Rechnung läuft in einem Hintergrund-Thread (Web Worker).

| Baustein | Was er tut | Wie (kurz) | Funktion im Code |
| --- | --- | --- | --- |
| Spiegeln links ↔ rechts (v3.3, Levins Idee) | Korrigiert eine falsch gefundene Flügelkante links oder rechts | Bei 1 Flügel ist links und rechts gleich viel Holz (Glaskante → Fuge). Weichen beide Seiten um mehr als `V3.spiegelAb` (15 mm) ab, ist eine falsch: die Seite, deren Holzbreite näher an der Bauart liegt, wird auf die andere gespiegelt. Angewendet nur, wenn alle 3 Raster-Durchgänge dieselbe Seite spiegeln wollen (sonst bleibt das Maß). Nicht bei 2 Flügeln (Stulp). Schalter `V3.spiegeln`. Im Ergebnis: `spiegelVorschlag` (z. B. „lll“, „-rr“), `gespiegelt` | `v3Finden` (Vorschlag), `messenV3` (Entscheidung) |
| Spiegelprobe (v3.3, sammelt nur) | Vergleicht die Ecken links und rechts als Bild | L-förmiger Holzring (Glaskante −4 cm bis Holz +12 mm, Glasinneres und weit außen weggelassen) je Ecke, OL↔OR und UL↔UR gespiegelt verglichen (Korrelation −1…1). Wird gespeichert, entscheidet noch nichts: Werte −0,2…0,44 bei guten und schlechten Fotos gleich | `v3Ring`, `v3Aehnlich`, `v3Spiegelprobe` |
| Ecken, Winkel, Diagonalen (v3.2) | Liefert die vier Eckwinkel und beide Diagonalen von Flügel und Glas | Jede Kante als eigene Gerade (leicht schräg erlaubt): alle 6 mm stärkste Kante in ±10 mm, Ausreißer raus, Gerade durch; Ecken = Schnittpunkte. In `geometrie.fluegel/glas`: Winkel OL/OR/UR/UL, Diagonalen OL→UR / OR→UL, Δ, Neigung der Kanten, Streuung. Messrauschen derzeit ca. ±1° | `v3Ecken`, `v3Gerade`, `v3Schnitt` |
| Ecken abgleichen (Levins Idee, aus) | Oben/unten die Glaskante wählen, deren Holz zur Seite passt | Holzbreite Glaskante→Fuge der Seiten als Vorlage; nur wenn die gefundene Kante klar nicht passt. Wackeltest schlechter (Fuge oben/unten zu unsicher) → `V3.abgleich = false` | `abgleichen` in `v3Finden` |
| Fenstermaß v3 (fertiges Foto) | Findet Glas und Flügel von der Holzseite her | 1. Foto mit dem Maßblatt auf die Glasebene entzerren (2 mm/px, Bereich 3,2 × 3,3 m ums Blatt). 2. Glaskante = Linie, die über die ganze Länge durchläuft und hinter der ein ruhiger Streifen beginnt (Holz). 3. Rahmenfarbe aus den Seiten, oben/unten nur gleiche Farbe (gegen Markise, Decke). 4. Schattenfuge 30–150 mm hinter der Glaskante, sonst Flügelholz je Bauart. Kante außerhalb des Fotos: kein Maß statt raten. Livebild nutzt weiter v2 | `messenV3`, `v3Entzerren`, `v3Finden`, `v3Glaskante`, `v3Fuge`, `v3Bandfarbe` |
| Maßblatt (v2, Livebild) | Misst den Flügel ohne Zollstock | A4 hochkant, 4 ArUco-Marker 4×4 (Nr. 0–3, je 80 mm, 12 mm vom Rand). Aus den Markern: Maßstab, Abstand, Schräge. Dann Kanten Glas und Flügel suchen, Fluchtpunkte, Tiefe je Fenstertyp abziehen | `findeMarker`, `blattLage`, `fensterMessen`, `fensterGenau`, `messen` |
| Führung im Livebild | „Geh 1 m zurück“, „Mittig davor“, „Halt still“ | Etwa 3 Messungen pro Sekunde auf 1280 px, Ziel 2,5–3,5 m, löst selbst aus | `massLive`, `deutenBlatt` |
| Schärfe | Erkennt verwackelte oder falsch scharfgestellte Fotos | Bild auf 1600 px lange Seite, an den stärksten 1,5 % der Kanten Breite des Übergangs 10–90 % messen, senkrecht und waagerecht getrennt, der schlechtere Wert zählt | `schaerfe`, `kantenBreite`, `schaerfeVon` |
| Griffsuche | Schlägt die Griffseite vor, Bänder gegenüber. Vorerst bestätigt der Kunde immer mit einem Tipp (Vorschlag hervorgehoben) | Flügelholz links und rechts in 9 Spalten abtasten, Abweichung vom Rest desselben Holzes plus Kanten, 12-cm-Fenster zwischen 22 % und 82 % der Höhe. Farbunabhängig. Sicher ab Verhältnis 1,35 und Wert 1,5 und nur bei stimmiger Messung, sonst eine Frage | `griffSuchen` |
| Spiegelung | Legt Griff-, Scheren-, Ecklager-Foto auf die richtige Seite | `P.band` = Seite der Bänder; daraus Griff, Schere, Ecklager, Hilfslinien, Texte, Skizze | `geometrie`, `mx`, `mr`, `Lm`, `texteSetzen` |
| Automatisch weiter | Kein Klick zwischen den Fotos | Gutes Foto 1,5 s zeigen, dann weiter. Warten nur bei fehlendem Maß, Unschärfe nach 3 Versuchen oder Griff-Frage | `pruefen`, `weiter` |
| Gesichter | Verpixelt Personen | face-api (TinyFaceDetector) nach dem Auslösen | `gesichterVerpixeln` |
| Lernfotos (Entwickler) | Sammelt echte Fotos mit echtem Maß | Foto aus Kamera-App oder Galerie (Original), Lotse wertet es aus, beides geht per GitHub-API in das private Repo `LevinTheo/foto-lotse-daten`: `fenster/<Datum_Zeit>_<Name>/foto-01.jpg` + `foto-01.json` (echtes Maß, Bauart, Griff, Notiz, was der Lotse erkannt hat). „Fenster fertig“ schreibt die endgültigen Angaben als `fenster.json` (auch nachträglich eingetragene) und leert alles fürs nächste Fenster. Hochgeladen wird verkleinert auf 2576 px lange Seite (so groß rechnet der Lotse, ca. 0,8 statt 2 MB). Felder: Name, Flügel B/H, echte Diagonalen Flügel (OL→UR, OR→UL), Rahmen innen B/H, Rahmen sichtbar, Anzahl Flügel, Bauart, Griff, am/vor dem Fenster (Markise, Rollladen, Rollo innen, Jalousie, Insektenschutz, Gitter, Gardine), Hintergrund (ruhig/gemischt/unruhig), Licht (bewölkt, Gegenlicht, Sonne im Raum, dämmrig, Kunstlicht), Notiz. Aus der Analyse: Knopf „In Lernfotos übernehmen (Entwickler)“ im Prüfdialog (nur mit eingerichtetem Zugang) öffnet die Lernfotos mit diesem Foto als foto-01 eines neuen Fensters (`quelle: analyse`, mit dem Maß, das die Analyse gemessen hat). Die Vorschau rechnet die Abweichung neu, wenn das Maß nachträglich eingetragen wird. Empfehlung: 4 Fotos je Fenster (frontal, schräg links, schräg rechts, nah), bei Balkontüren 5 (nah oben und unten). Optional auch jedes Foto aus dem normalen Durchlauf (`lauf-…`). Token und Repo nur in localStorage auf dem Handy | `entwDatei`, `entwDurchlauf`, `lotseSieht`, `ghPut` |

Testen ohne Kamera: Der Übungsmodus zeichnet ein Fenster mit Maßblatt. Mit `?test` hinter der Adresse ist der Zustand lesbar (`window.__lotse`).

## Stellschrauben

Alle Grenzwerte stehen im Objekt `TOL` in `index.html`.

| Name | Startwert | Bedeutung |
| --- | --- | --- |
| `schaerfe` | 3,6 px | Ab dieser Kantenbreite gilt ein Foto als unscharf (geschätzt, mit echten Handyfotos nachstellen) |
| `unscharfVersuche` | 3 | So oft wiederholt der Lotse ein unscharfes Foto selbst |
| `weiterNach` | 1500 ms | So lange ist ein gutes Foto zu sehen |
| `abstand`, `abstandMin`, `abstandMax` | 3 m, 2,5 m, 3,5 m | Abstand beim ersten Foto |
| `versatz` | 450 mm | So weit darf man neben der Fenstermitte stehen |
| `stabil` | 2,5 % | Zwei Messungen hintereinander dürfen so weit auseinander liegen |
| `halten` | 800 ms | So lange muss alles passen, bis ausgelöst wird |
| `neigungSeite`, `neigungKipp` | 10°, 20° | Ab da „Handy gerade halten“ bzw. „senkrecht halten“ |
| `gegenprobe` | 8 % | Abweichung zum eingetippten Maß für „Bitte nachmessen“ |
| `blattPixel`, `blattTakt` | 1280 px, 150 ms | Bildgröße und Takt der Livemessung |

Grenzen der Griffsuche (1,35 / 1,5 / 22–82 %) stehen in `griffSuchen`, Holzbreiten je Fenstertyp in `TYPEN`. Die Schalter der v3-Messung laufen im Hintergrund-Thread und stehen deshalb im Objekt `V3` (nicht in `TOL`): `spiegeln` (an), `spiegelAb` (15 mm), `abgleich` (aus).

## Wackeltest

`node pruefstand/wackel.js <Pfad zu foto-lotse-daten> [Pfad zum Lotsen]` (braucht Playwright mit Chromium, dauert ca. 6 Minuten): jedes Lernfoto in 5 Varianten (Original, auf 90 % und 75 % verkleinert, JPEG 70 %, leicht weich) durch v3. Misst, ob dasselbe Foto auf verschiedenen Handys dasselbe Maß ergäbe.

| Datum | Stand | stabil (< 1 % Streuung) | Streuung Median | Fehler Median | ±2 % |
| --- | --- | --- | --- | --- | --- |
| 4. Nov. 2026 | v3 | 7 von 27 | 5,3 % | 7,4 % | 6 von 128 |
| 4. Nov. 2026 | „nächste ruhige Kante gewinnt“ (verworfen) | 3–6 von 27 | 7,7–14,1 % | 8,2–14,0 % | 5–7 |
| 4. Nov. 2026 | v3.1: Mehrheit aus 3 Rastern (2/2,5/3 mm) | 7 von 28 | 4,9 % | 7,3 % | 17 von 136 |
| 4. Nov. 2026 | Ecken abgleichen eingeschaltet (verworfen, Schalter `V3.abgleich`) | 6 von 29 | 8,5 % | 8,0 % | 14 von 141 |
| 4. Nov. 2026 | v3.2 (Abgleich aus, Ecken/Winkel neu) | 7 von 29 | 6,2 % | 7,2 % | 19 von 141 (±5 %: 48) |
| 4. Nov. 2026 | v3.3: Spiegeln links ↔ rechts, nur wenn alle 3 Durchgänge einig | 5 von 29 | 6,2 % | 7,1 % | 20 von 141 (**±5 %: 56**) |
| 4. Nov. 2026 | v3.3, **Wackeltest repariert** (Variante „weich“ wirkt jetzt, KiZi v2 als 2 Flügel) – neue Basis | 4 von 29 | 8,5 % | 7,2 % | 17 von 141 (±5 %: 55) |

v3.3: Weniger „stabil“, weil Fotos, die vorher stur falsch lagen, jetzt richtig, aber mit ein paar mm Streuung liegen (Balkontür Foto 2: vorher 830–832 mm in allen Varianten, jetzt 783–792, echt 788).

Bis zum 4. Nov. abends war die 5. Variante („leicht weich“, `c.filter = 'blur(0.7px)'`) wirkungslos: Headless-Chromium nimmt den Canvas-Filter an, wendet ihn aber nicht an, die Spalte war in jeder Zeile identisch mit dem Original. Alle Zeilen oben haben also nur 4 echte Varianten, das Original doppelt gezählt. Seit der Reparatur rechnet `wackel.js` das Weichzeichnen selbst ([1 2 1]-Kern, waagerecht und senkrecht). Die neuen Zahlen sind die Basis für alles Weitere; die Erkennung hat sich dabei nicht geändert.

## Prüfstand

`node pruefstand/pruefstand.js <Pfad zu foto-lotse-daten> [Ausgabe]` lässt den aktuellen Lotsen über alle Lernfotos laufen und vergleicht mit den echten Maßen (`fenster.json`, Nachtrag gewinnt). Bauart und Flügelanzahl kommen aus der Wahrheit – die App selbst läuft beim Kunden immer mit Holz und 1 Flügel (siehe Prüfung, Punkt 2). Griff wird wie in der App nur bei 1 Flügel gesucht. Ausgabe: `ergebnis.md` (Kopfzeile mit ±2 %, ±5 %, Medianen, Selbsteinschätzung, Griff-Trefferquote; Tabelle je Foto) und `ergebnis.json`, dazu pro Foto ein Bild mit dem, was der Lotse erkannt hat (Bilder sind auf ⅓ verkleinert; für Kantenfragen die Ecken im Original ansehen). Nach jeder Änderung an der Erkennung laufen lassen und das Ergebnis hier eintragen. Fotos bleiben lokal, ins öffentliche Repo kommt nur der Code.

| Datum | Commit | Fotos | auf ±2 % | Bemerkung |
| --- | --- | --- | --- | --- |
| 4. Nov. 2026 | Prüfung (siehe unten) | 30 aus 8 Fenstern | **5 von 30** (±5 %: **10**) | Unabhängige Nachprüfung, Erkennung unverändert v3.3. „KiZi v2“ (1505) ist zweiflügelig (fenster.json sagt 1, Nachtrag korrigiert): ohne Spiegeln dort fällt Foto 3 von −4,6 auf −7,3 %, ±5 % damit 10 statt 11. Griff nur noch bei 1 Flügel gezählt: **richtig 12 von 18, als sicher gemeldet 7, davon 6 richtig**. Median Breite 4,2 %, Höhe 4,3 %; sicher 21, davon 10 auf ±5 %; unsicher 8, alle > 5 % daneben. Mit Kundeneinstellung (immer Holz, 1 Flügel, so läuft die App wirklich): ±5 % 13 von 30 – nicht schlechter, aber andere Fotos |
| 4. Nov. 2026 | `a422dd5` | Wackeltest als `pruefstand/wackel.js` ins Repo (Daten- und Lotse-Pfad als Argument); geparkte Ideen gesammelt unter Offene Punkte → Geparkt (Tür-Lotse, Preis, Ablage über Tim, Datenbank) | Ein neuer Chat soll den Lotsen unabhängig prüfen können und dafür alles im Repo finden | Wackeltest aus dem Repo: gleiche Zahlen wie v3.3 (stabil 5/29, ±2 % 20/141, ±5 % 56/141) |
| 4. Nov. 2026 | v3.3 `e4e5abf` | 30 aus 8 Fenstern | **5 von 30** (±5 %: **11**) | Median Breite 4,2 %, Höhe 4,3 %. Spiegeln greift bei 4 Fotos: Balkontür 2 Breite +5,6 → +1,0 %, Balkontür 5 −19,3 → −16,1 %, KiZi v2 Foto 3 −7,3 → −4,6 %, KiZi abends 1 unverändert gut. Kein Foto schlechter. Erster Versuch ohne Einigkeits-Bedingung: 4 von 30, weil KiZi v2 Foto 4 von −0,7 auf −9,4 % kippte (Durchgänge uneinig „rrl“). Selbsteinschätzung: sicher 21, davon 10 auf ±5 %; unsicher 8, davon 7 wirklich > 5 % daneben. Spiegelprobe trennt gute und schlechte Fotos nicht (siehe Offene Punkte) |
| 4. Nov. 2026 | v3.2 `9478d76` | 30 aus 8 Fenstern | **5 von 30** (±5 %: 10) | Median Breite 4,4 %, Höhe 4,3 %. Neu: Ecken, Winkel, Diagonalen. Frontale Analysefotos: Eckwinkel 88,5–91,3°, Diagonalen-Δ −2 bis +22 mm. Dasselbe KiZi-Fenster dreimal: Flügel-Δ 16 / 19 / 2 mm → Messrauschen derzeit ca. ±1° und ±20 mm, ein hängender Flügel (wenige mm) ist damit noch nicht erkennbar. Übungsfenster (exakt rechtwinklig): 89,5/89,5/90,5/90,5° |
| 4. Nov. 2026 | v3.1 `543cc2e` | 29 aus 7 Fenstern | 4 von 29 (±5 %: 9) | Mehrheit aus 3 Rastern + Selbsteinschätzung. Median Breite 4,4 %, Höhe 4,3 %. Als „unsicher“ gemeldet: 8, davon alle 8 wirklich > 5 % daneben (keine Fehlalarme); als „sicher“ gemeldet: 20, davon 9 auf ±5 % (11 falsch, aber sicher gemeldet → noch zu tun). Frontale Analysefotos: WZ 814 × 1244 (echt 810 × 1246), KiZi 1218 × 1301 (1218 × 1320). Rechenzeit ca. 2 s am Rechner |
| 4. Nov. 2026 | v3 (`3a465a9`) | 29 mit Maß aus 8 Fenstern | 1 von 29 (±5 %: 9, v2: 4) | Median Breite 3,1 %, Höhe 4,4 % (v2: 20,5 % / 33,0 %). Neu: Wohnzimmer Kunststoff 2-flüglig (Analysefoto 814 × 1246 statt 810 × 1246), Abendfotos mit Licht an (Spiegelungen vom Zimmer in der Scheibe; Analysefotos −1 bis +3 %). **Auffällig: dasselbe Foto gibt am Handy und im Prüfstand teils verschiedene Maße** (SZ Dunkel: Handy 834 × 1243, Prüfstand 775 × 1454) → v3 reagiert empfindlich auf kleine Unterschiede (Bildverkleinerung, JPEG, Bauart-Einstellung) |
| 4. Nov. 2026 | `53d7150` (v3) | 14 aus 3 Fenstern | 0 von 14 (±5 %: 2, v2: 0) | **v3**: Median Breite 2,5 %, Höhe 7,1 % (v2: 30,3 % / 44,1 %). 4 Nahfotos ohne ganzes Fenster: jetzt „kein Maß“ statt falscher Zahl. Griff 8 von 10 richtig. Höhe noch zu groß: unten Türschwelle, oben Rollokasten (gleiche Farbe wie Rahmen). Rechenzeit ca. 1,3 s am Rechner |
| 4. Nov. 2026 | `e2b8264` | 14 aus 3 Fenstern | 0 von 14 | Neues Fenster „Kinderzimmer“ (Holz, Flügel 1218 × 1320, Ziergitter außen, Markise, Gegenlicht): bestes Foto aus 3,1 m −11,7 % / +0,2 %, sonst −12 bis −68 %. Griff 4 von 5 falsch |
| 4. Nov. 2026 | `27efb0f` | 9 aus 2 Fenstern (beide dieselbe Balkontür) | 0 von 9 | Ausgangslage. Abweichung meist −20 bis −50 %; Ergebnis hängt stark von der Bauart-Einstellung ab (am Handy mit „Holz“ 724 × 2101, im Prüfstand mit „Kunststoff“ 583 × 1130) |

## Lernfotos (Bestand)

Liegen im privaten Repo `LevinTheo/foto-lotse-daten`, bleiben dort dauerhaft. Wahrheit für den Prüfstand: `fenster.json` im Ordner, Abweichungen und Ergänzungen in `pruefstand/nachtrag.json` (gewinnt). „Rahmen innen“ ist in der Praxis das Glas-Lichtmaß (WZ: Lotse-Glas 674 × 1097 zu 673 × 1107). Alle 9 Ordner (Stand 4. Nov. abends):

| Ordner | Fenster | Echtes Maß Flügel | Fotos | Lotse v3.3 (Prüfstand) |
| --- | --- | --- | --- | --- |
| `fenster/2026-11-04_1217_fenster` | Balkontür Küche, Kunststoff, 1 Flügel, Griff rechts (alles im Nachtrag) | 788 × 2023 mm, kein Lichtmaß | 5: frontal ca. 2 m, schräg links, oben nah, unten nah, schräg rechts | frontal +3,0 / +4,4 % (unten sitzt die Kante am Boden statt an der Schwelle); nah: kein oder falsches Maß |
| `fenster/2026-11-04_1231_fenster` | „Terrasse zuhause V2“ = dieselbe Balkontür, hohes Licht | 788 × 2023 mm | 4 | frontal 2,4 m +3,4 / +11,5 % (unsicher), sonst 2 von 3 ganz daneben |
| `fenster/2026-11-04_1331_fenster` | KiZi Holz (Mittag): Holz, 1 Flügel, Griff rechts, Rollo innen, **Ziergitter außen**, Markise, Gegenlicht | 1218 × 1320 mm (Lichtmaß 1068 × 1166, Rahmen sichtbar 76) | 5: aus 1,3–3,1 m, frontal und schräg | Breite bei 3 von 5 auf ±0,2 %, Höhe +7 bis +10 % (Glaskante oben am Rollo bzw. Rollokasten) |
| `fenster/2026-11-04_1425_fenster` | Fenster WZ: Kunststoff, **2 Flügel** (Nachtrag; fenster.json sagt 1), gemessen der linke, Gegenlicht | 810 × 1246 mm (Lichtmaß 673 × 1107) | 4 | frontal 2,8 m +0,5 / −0,2 %, bestes Foto im Bestand |
| `fenster/2026-11-04_1505_fenster` | Fenster KiZi v2: Kunststoff, **2 Flügel** (Nachtrag 4. Nov. abends; fenster.json sagt 1, die Fotos zeigen zwei Flügel mit Griffen mittig), Gardine, Sonne im Raum, **alle 4 Fotos schräg (23–49°) oder nah** | 810 × 1246 mm (Lichtmaß 672 × 1108) | 4 | −0,7 / 0,0 % bis −0,5 / −35,7 %; Foto 1 aus 49° zeigt, wie die Perspektive vom kleinen Blatt kippt |
| `fenster/2026-11-04_1603_fenster` | unbekannt, 1 Foto ohne Maß | – | 1 | wird nicht ausgewertet (`ignorieren` im Nachtrag); im Repo lassen, Claude hat dort nur Lesezugriff |
| `fenster/2026-11-04_1647_fenster` | Fenster SZ Dunkel: Kunststoff (Nachtrag), **2 Flügel** (Nachtrag), gemessen der linke, dämmrig, Licht an | 810 × 1246 mm (Lichtmaß 674 × 1108) | 3 | Höhe immer auf ±1 %, Breite −5 / +13 / −4 % – rechte Fuge am Stulp falsch (Holz rechts 43 / 36 / 54 mm statt 70) |
| `fenster/2026-11-04_1650_fenster` | KiZi Fenster abends = dasselbe Holzfenster wie 1331, nachgemessen 1220 × 1318, Gitter, dämmrig | 1220 × 1318 mm (Lichtmaß 1068 × 1167) | 4 | frontal 2,4 m −2,6 / +2,8 %, die drei nahen/schrägen 10–22 % daneben |
| `fenster/2026-11-04_1734_fenster` | KiZi Fenster v3 = dasselbe Holzfenster (Maß im Nachtrag) | 1220 × 1318 mm | 1 | frontal 2,6 m −1,7 / +2,0 % |

Lücken im Bestand: 0 Kastenfenster, 0 Verbundfenster, 0 dunkles Holz, kein Lichtmaß für die Balkontür. Die `TYPEN`-Werte für Kasten und Verbund sind laut Code geschätzt und an keinem Foto geprüft.

## Prüfung 4. Nov. 2026 (unabhängiger Chat „Foto Lotse Check“)

Ein zweiter Chat hat Code, REGIE und Tests ohne Vorwissen geprüft. Prüfstand und Wackeltest reproduzierten die REGIE-Zahlen exakt; der Übungsmodus läuft mit Playwright (iPhone-Viewport) durch alle 6 Fotos ohne Fehler. Umgesetzt sind daraus die Punkte 1, 3, 4 und 8 (siehe Änderungsprotokoll). Der Rest steht als Befund hier, damit der nächste Chat ihn aufgreifen kann; „gemessen“ heißt mit Prüfstand, Wackeltest oder Playwright belegt, „Vermutung“ heißt noch nicht.

1. **Erledigt – Gegenprobe-Text.** `massZeigen` zeigte im Maßblatt-Modus immer „Das Maßblatt misst … eingetippt ist 81 × 124 cm. Bitte nochmal nachmessen.“ (gemessen mit Galerie-Foto KiZi Mittag 1 auf frischem Handy). Der Kunde hat nie etwas eingetippt; `P.fb/P.fh` sind Startwerte oder das zuletzt gemessene Fenster.
2. **Kundenablauf kennt keine Flügelanzahl** (gemessen): `P.nU` kommt nur aus dem versteckten Formular, „Analyse starten“ läuft immer mit 1 Flügel und Bauart Holz. Folgen bei 2 Flügeln: Griff-Frage links/rechts (Griff ist mittig), Spiegeln läuft, Tipp sagt „auf die Scheibe“ statt „auf die linke Scheibe“. Prüfstand mit Kundeneinstellung: ±5 % 13 statt 10 – nicht schlechter, aber andere Fotos kippen (SZ 2: +13 → +19 %, WZ 4: +6,8 → 0,0 %). Vorschlag: eine Frage „1 oder 2 Flügel?“ vor dem Start; Prüfstand zusätzlich mit Kundeneinstellung laufen lassen.
3. **Erledigt – KiZi v2 ist zweiflügelig.** Der v3.3-Gewinn „±5 %: 11 statt 10“ beruhte auf Spiegeln an diesem Fenster; mit richtigem Label 10 statt 10 (Median Breite 4,2 % bleibt). Auch die Bedingung „alle 3 Durchgänge einig“ wurde an KiZi v2 Foto 4 eingestellt, wo gar nicht gespiegelt werden dürfte. Mit richtigem Label ergibt Einstimmigkeit wie Mehrheit 10 von 30 (KiZi Mittag 3 etwas schlechter, KiZi abends 3 besser) – die Bedingung ist weder belegt noch schädlich.
4. **Erledigt – Wackeltest-Variante „weich“ war tot** (siehe Wackeltest).
5. **Höhe ist das Genauigkeitsproblem, nicht Streuung** (gemessen): 9 frontale Fotos ≥ 2 m: Breite median 2,6 % daneben, Höhe median 2,8 %, aber bei 4 von 9 um 7–11,5 % zu groß (Rollo/Rollokasten oben, Boden/Fensterbank unten). Lotse-Glas gegen Lichtmaß: Breite meist ±2 %, Höhe +12 bis +14 %. Wackeltest: WZ 1 streut 1 mm, Balkontür 1 3–4 mm – die Kante ist falsch, nicht wackelig. Vermutung: oben/unten das **Ende der senkrechten Flügelkanten** nutzen (`v3Gerade` entlang der Seitenfuge, wo die Kantenantwort abreißt, ist die Ecke); Rollo und Fensterbank verdecken die Glaskante, aber nicht das Ende der Seitenfuge. 3–6 h, Ergebnis offen.
6. **Livebild hängt an v2** (gemessen): v2 liefert bei 29 von 30 Fotos „ein Maß“, auf den 9 frontalen Fotos bei 8 um 10–138 % falsch. Der grüne Umriss im Livebild ist also meist falsch, und „ganzes Fenster im Bild“/„mittig“/„stabil“ prüfen falsche Ecken. Vorschlag: auslösen nur am Blatt (Abstand, Blatt mittig, ruhig), Umriss weglassen oder nur bei `sicher`; dann v3 mit einem Raster bei 1280 px live probieren (am Handy brauchte v3 laut Lernfoto-JSON 281 ms bei 2560 px).
7. **Entwickler-Dinge, die der Kunde sieht** (Screenshots): `zeigeWerte = true` (Schärfe, Griff, Winkel im Prüfdialog), Knopf „Entwickler: Lernfotos“ für alle sichtbar, Text „unter ‚Ändern‘ selbst eintragen“ verweist auf einen versteckten Knopf, Griff-Dialog fragt dreimal dasselbe. Vorschlag: Werte nur mit `?test` oder Token, Entwickler-Knopf nur mit Token oder `?entw`, Text auf „Manuelles Aufmaß“. 30 min.
8. **Erledigt – Prüfstand zählte den Griff auch bei 2 Flügeln** (die App sucht nur bei 1). Bereinigt: 12 von 18 richtig, sicher 7, davon 6 richtig.
9. **Grenzwerte außerhalb von TOL/V3** (gelesen): in `v3Glaskante`/`v3Fuge`/`v3Finden`/`messenV3` 0,35 und 0,25 (Kantenanteil), ruhig „< 12 oder Verhältnis 2“, Farbabstand 40/50, „+0,15 besser“-Regel, Faktor 0,3, Zonen 8–44 und 30–150 mm, 25 mm Seitenabgleich, stimmig 20/40/15/45, Griff 1,35/1,5, Umschalten Ähnlichkeit/Homographie bei 10° in `blattLage`. v3 ignoriert `opt.fu` (unten fest `fs + 10`, bei Kunststoff 80 statt 70). `TYPEN` liegt dreimal (index.html, pruefstand.js, wackel.js), nur der Prüfstand kennt „alu“. Vorschlag: nach `V3` mit Namen, `fu` durchreichen; Prüfstand vorher/nachher muss identisch bleiben. 1–2 h.
10. **Toter Code** (gelesen): `v3Eckabgleich`/`v3EckRunde`/`v3Kantenbild` (~90 Zeilen, nur mit `opt.eckabgleich`), `abgleichen` (V3.abgleich aus), `v3Spiegelprobe` (sammelt nur), `messwerte()` (nach `an = false` unerreichbar), `erg.abgeglichen` immer `[false, false]`, `<title>` und eine Meta stehen im `<body>`. `laeufe.forEach(q => q.fluegel[q.spiegel.i] …)` hält nur wegen der Einstimmigkeit (bei Mehrheit stürzt es ab, gemessen in einer Testkopie). Vorschlag: Eckabgleich und Abgleich entfernen (stehen in den Branches `stand-v3.x`). 1 h.
11. **Homographie vom kleinen Blatt** (gemessen, kein einfacher Gewinn): v3 nutzt immer `Hvoll`. Testkopie mit Ähnlichkeit bei < 10°: ±5 % 10 statt 11, WZ 1 von +0,5 auf +6,2 %, KiZi abends 4 von −22 auf +4,6 % – zeigt nur, wie groß der Hebel ist. Vermutung: die Ebene wie in v2 (`fensterGenau`) aus den vier Flügelkanten nachbestimmen, das Blatt nur für den Maßstab. 4–8 h, erst nach Punkt 5.
12. **Übungsfenster −2 % systematisch** (gemessen): gezeichnet 810 × 1240, v3 795 × 1228; die Profil-Kanten sitzen 6–10 mm zu weit innen, die Geraden (`v3Ecken`) treffen 809 × 1239. Auf echten Fotos bringt „Maß aus den Geraden“ nichts (±5 %: 10 statt 11), dort dominiert die falsche Kante. Niedrige Priorität.
13. Kleines: GitHub-Token liegt im localStorage einer öffentlichen Seite – fine-grained Token nur für `foto-lotse-daten` (Contents: write) verwenden. Lichtmaß für die Balkontür nachmessen (trennt bei +3 % Breite Kante von Maßstab). Rechenzeit am Rechner 0,5–1,8 s je Foto. Was fehlt: ein Ablauf-Test im Repo (Playwright-Skript für den Übungsmodus), ein Prüfstand-Modus „wie der Kunde“, eine Plausibilitätsfrage am Ende („Flügel ca. 122 × 132 cm – kommt das hin?“) gegen Ausreißer wie −35 %.

Empfohlene Reihenfolge für den Rest: 2 und 7 (Kundenablauf) → 5 (Höhe) → 6 (Livebild) → 9 und 10 (Aufräumen) → 11. Lernfotos gezielt: Kastenfenster, Verbund, dunkles Holz, immer mit Lichtmaß und Flügelanzahl, das erste Foto so, wie der Kunde es macht (frontal, 2,5–3,5 m).

## Änderungsprotokoll

Neueste oben. Format: Datum · Account/Sitzung · Commit · Änderung · Warum · Ergebnis.

| Datum | Commit | Änderung | Warum | Ergebnis |
| --- | --- | --- | --- | --- |
| 4. Nov. 2026 | Prüfung `e78f573` | (1) Gegenprobe gegen das eingetippte Maß nur noch bei „Selbst eingeben“; im Maßblatt-Modus „Gemessen: Flügel ca. B × H cm“ (`massZeigen`). (3) `pruefstand/nachtrag.json`: KiZi v2 (1505) als 2 Flügel. (4) `wackel.js`: Weichzeichnen selbst gerechnet ([1 2 1]-Kern), weil der Canvas-Filter in Headless-Chromium nicht wirkt. (8) Prüfstand sucht den Griff nur bei 1 Flügel und meldet die Griff-Trefferquote in der Kopfzeile. Abschnitt „Prüfung 4. Nov. 2026“ mit allen Befunden | Unabhängige Prüfung im Chat „Foto Lotse Check“; Levin hat 1, 3, 4, 8 freigegeben | Erkennung unverändert. Prüfstand: 5 von 30 auf ±2 %, 10 auf ±5 % (ehrlich statt 11), Griff 12 von 18. Wackeltest neue Basis: stabil 4 von 29, Streuung 8,5 %, Fehler 7,2 %, ±2 % 17/141, ±5 % 55/141. Übungsmodus (Playwright, iPhone-Viewport): 6 von 6 Fotos, keine Fehler; Galerie-Foto zeigt „Gemessen: Flügel ca. 122 × 129 cm“ statt „eingetippt ist 81 × 124 cm“ |
| 4. Nov. 2026 | v3.3 `e4e5abf` | Spiegeln links ↔ rechts (`V3.spiegeln`, `V3.spiegelAb` 15 mm): weicht das Holz links und rechts um mehr als 15 mm ab, wird die Seite, die zur Bauart passt, auf die andere gespiegelt, aber nur, wenn alle 3 Durchgänge dieselbe Seite wollen; nicht bei 2 Flügeln. Spiegelprobe (Holzring-Vergleich der Ecken) wird mitgespeichert. Prüfstand gibt Anzahl Flügel weiter und zeigt Spiegelprobe und Spiegel-Vorschlag. Anzeige v3.3 | Levin: Ecken spiegeln und abgleichen | Prüfstand ±5 %: 11 statt 10, Median Breite 4,2 statt 4,4 %, kein Foto schlechter. Wackeltest ±5 %: 56 statt 48 von 141. Spiegelprobe noch ohne Aussagekraft. **Nachtrag Prüfung 4. Nov. abends:** einer der 4 Spiegel-Treffer (KiZi v2 Foto 3) war ein zweiflügeliges Fenster mit falschem Label; mit richtigem Label ±5 % 10 statt 10, Median Breite bleibt 4,2 % |
| 4. Nov. 2026 | `3e5e252` | Ecken-Abgleich nach Levins Idee als Bild-Schablonen mit Nachsteuern in Runden gebaut, ausgeschaltet (`opt.eckabgleich`) | Levin: Ecken aufeinanderlegen, Toleranzen eingrenzen | Gespiegelte Ecken zu unähnlich (0,2–0,7), Maß nicht besser; Gründe und nächste Schritte unter Offene Punkte |
| 4. Nov. 2026 | v3.2 `9478d76` | Ecken als Schnittpunkte von vier frei gefitteten Kanten: Eckwinkel und Diagonalen von Flügel und Glas, in allen Daten (Lernfoto-JSON, Durchlauf, Analyse→Lernfotos), in der Lernfoto-Vorschau und im Dialog (Messwerte). Neue Felder: echte Diagonalen. Ecken abgleichen gebaut, im Wackeltest schlechter, daher aus (`V3.abgleich`). Nachtrag: KiZi v3 (1734) mit Maß vom Holzfenster | Levin: Diagonalen/Winkel zeigen Verzug, Schleifen, Schwergängigkeit; alles sammeln | Prüfstand 5 von 30 auf ±2 % (bisher 4 von 29); Winkelrauschen ca. ±1° |
| 4. Nov. 2026 | v3.1 `543cc2e` | v3 sucht dreimal (2, 2,5, 3 mm je Pixel), je Seite zählt die Mehrheit; Selbsteinschätzung `massSicher` (an jeder Seite mindestens 2 von 3 einig). Unsicheres Maß: Dialog sagt „Unsicher: am besten nochmal frontal aus 2 bis 3 m“ und wartet; Lernfoto-Vorschau zeigt „(unsicher)“. Prüfstand zählt Selbsteinschätzung | Gleiches Foto ergab je nach Bildverkleinerung (Handy) ein anderes Maß | Wackeltest ±2 %: 17 statt 6 von ~130; unsicher gemeldet 8, alle wirklich daneben |
| 4. Nov. 2026 | `7c71ecf` | Livebild aufgeräumt: keine Messwerte-Box, kein Kasten „Klappt es nicht?“ (stattdessen nach 8 s in der Statuszeile „Mach einfach ein Foto, wir messen danach genauer.“), beim ersten Foto kein Tipp von selbst (Text kommt später auf die Website vor den Start) | Zu viel Text, zu wenig Platz zum Ausrichten | – |
| 4. Nov. 2026 | `5b96620` | Tipp beim ersten Foto: „Am besten bei gleichmäßigem Tageslicht ohne direkte Sonne aufs Fenster.“ | Levins Idee: Kunden ohne direkte Sonne fotografieren lassen (früher Abend/Morgen, bewölkt), Maße werden besser. Ob es wirklich hilft, zeigt das Feld „Licht“ im Prüfstand | – |
| 4. Nov. 2026 | `27cf973` | Knopf „In Lernfotos übernehmen“ im Prüfdialog der Analyse; Feld „Licht“; Vorschau aktualisiert sich bei nachträglich eingetragenem Maß | Levin testet jedes Fenster zuerst mit der normalen Analyse und übernimmt das Foto dann in die Sammlung | Übungsdurchlauf: Foto landet als foto-01 mit `quelle: analyse`, Vorschau −2 % / −2 % |
| 4. Nov. 2026 | `a545010` | Livebild: Fensterumriss erst zeigen, wenn das Maß 3-mal hintereinander gleich war (`TOL.zeigenAb`) oder alles passt; gestrichelte Glaskante nur noch beim Galeriefoto | Springende, verzerrte Rahmen waren anstrengend für die Augen | Übungsdurchlauf läuft; auf dem Handy testen |
| 4. Nov. 2026 | `53d7150` (v3) | **v3: Fenstermaß von der Holzseite her** (Levins Idee „von außen nach innen“): Entzerren auf die Glasebene, Glaskante = durchgehende Linie vor ruhigem Holzstreifen, Rahmenfarbe rundum gleich, Schattenfuge; nur auf dem fertigen Foto. Prüfstand vergleicht v2 und v3. Versionsanzeige „Foto-Lotse v3“ oben auf der Seite | Kantensuche hing sich an den Hintergrund | Prüfstand: Median Breite 2,5 % / Höhe 7,1 % statt 30 % / 44 %; Übungsfenster 80 × 122 statt 81 × 124 |
| 4. Nov. 2026 | `19f9d53` | Lernfotos: Vorschaubild mit erkanntem Flügel (grün) und Vergleich zum echten Maß in Prozent direkt in der Liste | Levin sieht sofort am Handy, ob der Lotse das Fenster erkannt hat; kein Ankreuzen nötig, der Prüfstand rechnet ohnehin selbst | Getestet mit 2 Balkontür-Fotos (−23 %/−44 % und −37 %/−44 %) |
| 4. Nov. 2026 | `6e6a8a4` | Lernfotos: Felder „Am oder vor dem Fenster“ (Markise, Rollladen, Rollo, Jalousie, Insektenschutz, Gitter, Gardine) und „Hintergrund“ | Erklärt im Prüfstand, warum die Kantensuche danebenliegt (Markise an der Balkontür); wichtig fürs Angebot | – |
| 4. Nov. 2026 | `27efb0f` | Lernfotos verkleinert hochladen (2576 px, ca. 0,8 MB); neue Felder Rahmen innen B/H, Rahmen sichtbar, Anzahl Flügel; Prüfstand `pruefstand/` | Speicher sparen ohne Verlust für die Messung; mehr echte Maße für spätere Erkennung; alle Fenster nach jeder Änderung neu prüfen | Upload 1,95 MB → 0,8 MB. Prüfstand: 0 von 9 auf ±2 % |
| 4. Nov. 2026 | `e321dec` | Knopf „Fenster fertig“ statt „Neues Fenster“: schreibt `fenster.json` mit den endgültigen Angaben, mahnt fehlendes Maß einmal an | Bei den ersten 5 Lernfotos waren Name und Maß leer; so lässt sich das Maß auch nachträglich eintragen | Mit nachgestellter GitHub-Gegenstelle getestet |
| 4. Nov. 2026 | `8aa537f` | Entwickler-Knopf „Lernfotos“: Fotos + echtes Maß + Lotse-Ergebnis ins private Repo `foto-lotse-daten` | Echte Fotos sammeln, damit die Erkennung an echten Fenstern getestet und verbessert werden kann | Mit nachgestellter GitHub-Gegenstelle getestet: Foto und JSON landen in `fenster/<Zeit>_<Name>/` |
| 4. Nov. 2026 | `8aa537f` | Griff wird immer einmal bestätigt, erkannte Seite als Vorschlag hervorgehoben | Erster echter Test (Balkontür Küche, Kunststoff, Flügel 788 × 2023 mm, Griff rechts): Marker 4 von 4, Abstand 2,4 m, Schärfe 1,6 px, aber Kantensuche hängt sich an den Hintergrund (Markise, Sichtschutz, Wimpel) → Maß 499–795 × 739–1574 mm statt 788 × 2023; Griffsuche meldete dabei bei einer Auflösung „links, sicher“ | Keine falsche Griffseite mehr ohne Bestätigung |
| 3. Nov. 2026 | `5f83b24` | `REGIE.md` und `CLAUDE.md` ins Repo | Beide Claude-Accounts sollen am selben Stand weiterbauen und denselben Überblick haben | – |
| 3. Nov. 2026 | `27f53de` | Startseite: Überschrift, Text, „Analyse starten“, darunter Platzhalter „Manuelles Aufmaß“; Fensterkasten und Testhinweise ausgeblendet | Klarer Aufbau, nur ein Weg für den Kunden | – |
| 3. Nov. 2026 | `a793a51` | Fotoliste auf der Startseite ausgeblendet | Kunde soll keine Kategorien anklicken | – |
| 3. Nov. 2026 | `c7f3999` | Griffsuche nur „sicher“ bei stimmiger Fenstermessung | Bei künstlich braun/grau umgefärbten Bildern maß die Fenstermessung falsch (68 statt 82 cm), Griffsuche meldete sicher die falsche Seite | Keine falsche sichere Antwort mehr; sonst fragt der Lotse |
| 3. Nov. 2026 | `c7f3999` | Griff auf dem ersten Foto suchen, Bänder gegenüber, Griff-/Scheren-/Ecklager-Foto gespiegelt, Griffhöhe übernommen | Bisher fest: Bänder links, Griff rechts | Bänder links: Griff rechts erkannt (3,99 zu 0,57). Bänder rechts: Griff links (3,76 zu 0,57) |
| 3. Nov. 2026 | `c7f3999` | Schärfeprüfung nach jedem Foto, unscharf bis zu 3-mal selbst wiederholt | Kunde musste selbst beurteilen, ob scharf | Scharf 0,8 px; Weichzeichner 1 px: 3,0; 1,5 px: 4,1; 3 px: 8,2. Verwackeln 4 px: 7,0 (nur eine Richtung) |
| 3. Nov. 2026 | `c7f3999` | Ein Knopf „Analyse starten“, kein Zwischenklick, gutes Foto geht nach 1,5 s weiter | Kunde soll nur noch auslösen | Durchlauf ohne Klick außer Auslöser |
| 3. Nov. 2026 | `c7f3999` | Neuer Schritt „Fenster kippen“; Schere oben vor Ecklager unten; Kastenfenster mit oberem/unterem Band | Roter Faden ums Fenster | Läuft im Übungsmodus |
| 2. Nov. 2026 | `b0536a7` | Maßblatt misst den Flügel, grüner Rahmen aus dem erkannten Fenster | Aufmaß ohne Zollstock | Ausgangsstand vor diesem Bericht |

Erster echter Test am 4. Nov. 2026 (Balkontür, siehe oben): Marker und Schärfe gut, Fensterkanten falsch.

## Offene Punkte

Aus der Prüfung vom 4. Nov. abends (Nummern wie dort, Reihenfolge = Empfehlung):

- [ ] **Flügelanzahl im Kundenablauf (Prüfung 2):** eine Frage „1 oder 2 Flügel?“ vor dem Start; Prüfstand zusätzlich mit Kundeneinstellung (Holz, 1 Flügel) laufen lassen
- [ ] **Entwickler-Dinge vor dem Kunden verstecken (Prüfung 7):** `zeigeWerte` nur mit `?test`/Token, Entwickler-Knopf nur mit Token oder `?entw`, Text „unter ‚Ändern‘“ → „Manuelles Aufmaß“, Griff-Frage nur einmal stellen
- [ ] **Höhe: Ende der Seitenfugen als Ecke (Prüfung 5)** – größter Hebel für frontale Fotos, nur mit Prüfstand vorher/nachher
- [ ] **Livebild ohne v2-Umriss, Auslösen am Blatt (Prüfung 6)**, danach v3 mit einem Raster live
- [ ] **Grenzwerte nach `V3`, `opt.fu` durchreichen, toten Code entfernen (Prüfung 9 und 10)** – Prüfstand muss identisch bleiben
- [ ] **Ebene aus den Flügelkanten statt nur vom Blatt (Prüfung 11)**
- [ ] Ablauf-Test (Playwright, Übungsmodus) ins Repo; Plausibilitätsfrage am Ende; Lichtmaß der Balkontür nachmessen (Prüfung 13)
- [x] Gegenprobe nur bei „Selbst eingeben“ (Prüfung 1, 4. Nov. 2026)
- [x] Wackeltest-Variante „weich“ repariert, KiZi v2 als 2 Flügel, Griff im Prüfstand nur bei 1 Flügel (Prüfung 3, 4, 8, 4. Nov. 2026)

Ältere Punkte:

- [ ] **Spiegelprobe aussagekräftig machen (v3.3):** Der Bildvergleich der Holzringe links ↔ rechts liegt bei guten und schlechten Fotos gleich um 0 (−0,2…0,44). Gründe: Holzmaserung ist nicht spiegelgleich, Bandseite hat Schere/Ecklager, Licht kommt von einer Seite. Nächster Versuch: statt 2D-Bild den Querschnitt vergleichen (Helligkeitsverlauf quer zur Kante, über die ganze Kantenlänge gemittelt: Glas → Glasleiste → Flügelholz → Fuge → Rahmen). Der ist links und rechts wirklich gleich. Damit (a) die Fuge auf der unsicheren Seite dort suchen, wo der Querschnitt am besten zur sicheren Seite passt, statt nur die Breite zu übertragen, und (b) als Selbsteinschätzung nutzen. Danach dasselbe oben ↔ unten nur für die Glasleiste
- [x] Spiegeln links ↔ rechts über die Holzbreite (v3.3, 4. Nov. 2026)
- [ ] **Ecken abgleichen (Levins Idee, richtig verstanden 4. Nov. abends, gebaut, aus):** Jede Ecke als Bild-Schablone (140 × 140 mm Kantenbild) gespiegelt an die drei anderen legen, in Runden nachsteuern (±16 cm, ±3 cm, ±1 cm …, bis sich nichts mehr bewegt), je Ecke entscheidet die Mehrheit (`v3Eckabgleich`, `v3EckRunde`, Schalter `opt.eckabgleich`). Erster Test: Ähnlichkeit gespiegelter Ecken nur 0,2–0,7, Vorschläge 1–5 cm auseinander, Maß unverändert oder schlechter (WZ +1,1 % statt +0,5 %). Gründe: Schablone enthält den Hintergrund hinter dem Glas; Ecken nicht ganz gleich (unten breiteres Holz, oben Rollokasten, Bandseite Schere/Ecklager); bei 2 Flügeln Stulp statt Rahmen. Nächste Schritte: Schablone nur auf den Holzring (Glaskante −1 cm bis Rahmen +4 cm) beschränken, Glasinneres ausblenden; nur Paare abgleichen, die wirklich gleich gebaut sind (links↔rechts bei 1 Flügel; oben↔unten nur Seitenteile); 2-flügelig gesondert. Älterer Versuch „Holzbreite abgleichen“ (`V3.abgleich`) ebenfalls aus. Ein Fenster ist an allen vier Ecken gleich aufgebaut (Glasleiste, Flügelholz, Fuge, Rahmen). Sauber erkannte Ecke als Vorlage, die anderen dagegen prüfen (Holzbreite, Fugenabstand, Farbe); oben Rollokasten / unten Fensterbank passen dann nicht und fallen raus
- [ ] **Verzug erkennen (Levins Idee, Messung läuft mit, v3.2):** Winkel/Diagonalen werden gemessen und gesammelt; Rauschen ±1° / ±20 mm ist noch zu groß für hängende Flügel (wenige mm). Echte Diagonalen sammeln (neue Felder), dann vergleichen. Diagonalen vergleichen (maßstabsunabhängig), erst sinnvoll wenn Ecken auf wenige mm sitzen und die Ebene nicht nur vom kleinen Blatt kommt (sonst Schein-Trapez). Praktischer zuerst: Fugenbreite in den Nahfotos (Scherenlager oben, Ecklager unten) messen; hängender Flügel = Fuge oben/unten ungleich. Ziel z. B. „Flügel hängt ca. 4 mm, Beschlag nachstellen“, bei Kastendoppelfenstern häufig
- [ ] **v3 robuster machen (teils erledigt, v3.1):** noch 11 von 20 „sicher“ gemeldeten Maßen > 5 % daneben; nahe und schräge Fotos springen weiter. gleiches Foto muss überall dasselbe Maß ergeben (Handy vs. Prüfstand, Bauart leer vs. gesetzt). Ursache suchen (Schwellen bei Kantenstärke/Unruhe, Rahmenfarbe), Ergebnis über mehrere Einstellungen mitteln oder Abstimmung zwischen Kandidaten
- [ ] **v3 Höhe verbessern:** unten nicht die Türschwelle/den Boden nehmen, oben nicht den Rollokasten (beide in Rahmenfarbe). Ideen: Holz unten breiter als seitlich erwarten, Fuge muss gefunden werden, Glaskante oben/unten gegen Seitenverhältnis prüfen
- [ ] v3 auch im Livebild (Führung), wenn schnell genug
- [x] Kantensuche von der Holzseite her (v3, 4. Nov. 2026)
- [ ] **Wichtigster Punkt: Kantensuche robust gegen unruhigen Hintergrund.** Erkenntnis Kinderzimmer: Die verlässlichen Kanten liegen auf der Holzseite, nicht am Glas: Laibung → Blendrahmen → Schattenfuge Rahmen/Flügel → Flügel. Diese Fuge ist unabhängig vom Hintergrund (Gitter, Markise, Gegenlicht). Also von außen nach innen suchen bzw. die Fuge gezielt suchen, nicht nur vom Blatt nach außen über die Scheibe. Weitere Ideen: Glaskante muss über (fast) die ganze Glashöhe bzw. -breite durchlaufen, nicht nur neben dem Blatt; das Profil zwischen Glaskante und Flügelkante muss über die ganze Länge gleichmäßig sein (Zaunlatten, Wimpel, Markise sind es nicht); Bauart-Profilbreiten (IV 68/78/92, Kunststoff) als Erwartung. Mit Lernfotos testen, nicht an einem Foto festmachen
- [ ] Lernfotos sammeln (Ziel erst mal 20–30 Fenster, verschiedene Bauarten, Licht, Hintergründe)
- [ ] „Nochmal analysieren“ nach selbst Auslösen und für Galeriefotos (gründlicher, Gegenlicht ausgleichen)
- [ ] Näher rangehen erlauben (ca. 1,5 m) und Teilfotos (oben/unten, Blatt immer drauf) zu einem Maß zusammenrechnen
- [ ] Selbstbau-Blatt ohne Drucker: weißes A4, Ecken mit Edding schwarz bis in die Spitze, Kreuz/Kreise; Kontrollfoto auf dem Tisch. Erst im Chat mit Levins Fotos testen
- [ ] Maßblatt: Felder „Hier kleben“ links und rechts mittig (Ecken sind von den Markern belegt)
- [ ] Durchlauf an einem echten Fenster mit dem Handy, Werte für Schärfe und Griff aus den Dialogen notieren
- [ ] `TOL.schaerfe` mit echten Handyfotos einstellen
- [ ] Fenstermessung bei dunklem Holz prüfen (im Test mit umgefärbten Bildern falsch)
- [ ] Griffsuche bei 2 Flügeln (Stulp, Gehflügel)
- [ ] Foto vom gekippten Fenster auswerten (Dreh-Kipp bestätigen, Schere sichtbar)
- [ ] Später, erst wenn das normale Aufmaß fehlerfrei läuft, am besten in einem eigenen Chat: Flügel öffnen lassen, um Getriebe und Falz zu sehen (damit klar ist, welches Getriebe bestellt werden muss); Falzmaße aus Schrägfoto oder aus hinterlegten Profilmaßen (IV 68, 78, 92)
- [ ] Bauart aus dem Foto erkennen
- [ ] Grobe Schadenserkennung (Farbe, Fäulnis, Kitt, beschlagenes Glas)
- [ ] „Manuelles Aufmaß“: Kunde misst selbst mit dem Zollstock und gibt Maß für Maß ein (eigener geführter Ablauf)
- [ ] Fotosammlung von Anfang an mitführen: Fotos plus Aufmaß vor Ort als richtige Antwort
- [ ] Prüfung durch Tim vor dem Einbau in die Website

### Geparkt (Ideen von Levin, später, noch nicht begonnen)

- [ ] **Tür-Lotse:** Balkon-, Terrassen- und Haustüren. Levin fragte, ob dafür ein eigenes Repo sinnvoll ist. Vorschlag aus dem Chat: als Modus im selben Lotsen (gleiches Maßblatt, gleiche Messung, andere Fotoschritte), damit beide aus denselben Lernfotos besser werden. Noch nicht entschieden. Erst angehen, wenn das Fenstermaß stabil ist
- [ ] **Preis:** aus Maß, Bauart, Beschlägen und Schäden in wenigen Klicks ein Preis (siehe Zielbild). Noch keine Preislogik im Lotsen
- [ ] **Ablage für echte Kunden:** In der privaten Testphase bleiben die Lernfotos im privaten GitHub-Repo (Levin hat die Erlaubnis der Mieter, keine Personen auf den Fotos). Für den Betrieb mit Kunden kommt später ein großer Speicher über Tim
- [ ] **Gesammelte Fenster als Datenbank:** jedes aufgemessene Fenster (Fotos plus Levins Aufmaß) als Lernfall, damit die Erkennung mit der Zeit genauer wird (siehe „Fotosammlung von Anfang an mitführen“)

## Nachbauen

1. Stand wählen: im Repo unter „Commits“ den Commit öffnen und „Browse files“, oder als ZIP herunterladen.
2. Seite starten: auf einen Webserver legen oder GitHub Pages einschalten (Settings → Pages → Branch `main`). Die Kamera geht nur über https.
3. Maßblatt: A4 in 100 % drucken, vier ArUco-Marker 4×4 Nr. 0–3, je 80 mm, 12 mm vom Papierrand (0 oben links, 1 oben rechts, 2 unten rechts, 3 unten links).
4. Ablauf und Grenzwerte wie oben.
5. Neu bauen lassen: diesen Bericht und `index.html` an Claude geben.
