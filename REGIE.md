# Foto-Lotse – Regiebericht

Stand: 4. Nov. 2026 · Levin (Holtcraft) · **Version v3**

## Versionen

Jeder Stand liegt auf GitHub. Zurückholen: Claude sagen „bau zurück auf vX“.

| Version | Wo | Was |
| --- | --- | --- |
| v3 | Branch `main` (aktuell) | Fenstermaß auf dem fertigen Foto von der Holzseite her (entzerren, ruhiger Holzstreifen, Rahmenfarbe, Schattenfuge) |
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
| Fenstermaß v3 (fertiges Foto) | Findet Glas und Flügel von der Holzseite her | 1. Foto mit dem Maßblatt auf die Glasebene entzerren (2 mm/px, Bereich 3,2 × 3,3 m ums Blatt). 2. Glaskante = Linie, die über die ganze Länge durchläuft und hinter der ein ruhiger Streifen beginnt (Holz). 3. Rahmenfarbe aus den Seiten, oben/unten nur gleiche Farbe (gegen Markise, Decke). 4. Schattenfuge 30–150 mm hinter der Glaskante, sonst Flügelholz je Bauart. Kante außerhalb des Fotos: kein Maß statt raten. Livebild nutzt weiter v2 | `messenV3`, `v3Entzerren`, `v3Finden`, `v3Glaskante`, `v3Fuge`, `v3Bandfarbe` |
| Maßblatt (v2, Livebild) | Misst den Flügel ohne Zollstock | A4 hochkant, 4 ArUco-Marker 4×4 (Nr. 0–3, je 80 mm, 12 mm vom Rand). Aus den Markern: Maßstab, Abstand, Schräge. Dann Kanten Glas und Flügel suchen, Fluchtpunkte, Tiefe je Fenstertyp abziehen | `findeMarker`, `blattLage`, `fensterMessen`, `fensterGenau`, `messen` |
| Führung im Livebild | „Geh 1 m zurück“, „Mittig davor“, „Halt still“ | Etwa 3 Messungen pro Sekunde auf 1280 px, Ziel 2,5–3,5 m, löst selbst aus | `massLive`, `deutenBlatt` |
| Schärfe | Erkennt verwackelte oder falsch scharfgestellte Fotos | Bild auf 1600 px lange Seite, an den stärksten 1,5 % der Kanten Breite des Übergangs 10–90 % messen, senkrecht und waagerecht getrennt, der schlechtere Wert zählt | `schaerfe`, `kantenBreite`, `schaerfeVon` |
| Griffsuche | Schlägt die Griffseite vor, Bänder gegenüber. Vorerst bestätigt der Kunde immer mit einem Tipp (Vorschlag hervorgehoben) | Flügelholz links und rechts in 9 Spalten abtasten, Abweichung vom Rest desselben Holzes plus Kanten, 12-cm-Fenster zwischen 22 % und 82 % der Höhe. Farbunabhängig. Sicher ab Verhältnis 1,35 und Wert 1,5 und nur bei stimmiger Messung, sonst eine Frage | `griffSuchen` |
| Spiegelung | Legt Griff-, Scheren-, Ecklager-Foto auf die richtige Seite | `P.band` = Seite der Bänder; daraus Griff, Schere, Ecklager, Hilfslinien, Texte, Skizze | `geometrie`, `mx`, `mr`, `Lm`, `texteSetzen` |
| Automatisch weiter | Kein Klick zwischen den Fotos | Gutes Foto 1,5 s zeigen, dann weiter. Warten nur bei fehlendem Maß, Unschärfe nach 3 Versuchen oder Griff-Frage | `pruefen`, `weiter` |
| Gesichter | Verpixelt Personen | face-api (TinyFaceDetector) nach dem Auslösen | `gesichterVerpixeln` |
| Lernfotos (Entwickler) | Sammelt echte Fotos mit echtem Maß | Foto aus Kamera-App oder Galerie (Original), Lotse wertet es aus, beides geht per GitHub-API in das private Repo `LevinTheo/foto-lotse-daten`: `fenster/<Datum_Zeit>_<Name>/foto-01.jpg` + `foto-01.json` (echtes Maß, Bauart, Griff, Notiz, was der Lotse erkannt hat). „Fenster fertig“ schreibt die endgültigen Angaben als `fenster.json` (auch nachträglich eingetragene) und leert alles fürs nächste Fenster. Hochgeladen wird verkleinert auf 2576 px lange Seite (so groß rechnet der Lotse, ca. 0,8 statt 2 MB). Felder: Name, Flügel B/H, Rahmen innen B/H, Rahmen sichtbar, Anzahl Flügel, Bauart, Griff, am/vor dem Fenster (Markise, Rollladen, Rollo innen, Jalousie, Insektenschutz, Gitter, Gardine), Hintergrund (ruhig/gemischt/unruhig), Licht (bewölkt, Gegenlicht, Sonne im Raum, dämmrig, Kunstlicht), Notiz. Aus der Analyse: Knopf „In Lernfotos übernehmen (Entwickler)“ im Prüfdialog (nur mit eingerichtetem Zugang) öffnet die Lernfotos mit diesem Foto als foto-01 eines neuen Fensters (`quelle: analyse`, mit dem Maß, das die Analyse gemessen hat). Die Vorschau rechnet die Abweichung neu, wenn das Maß nachträglich eingetragen wird. Empfehlung: 4 Fotos je Fenster (frontal, schräg links, schräg rechts, nah), bei Balkontüren 5 (nah oben und unten). Optional auch jedes Foto aus dem normalen Durchlauf (`lauf-…`). Token und Repo nur in localStorage auf dem Handy | `entwDatei`, `entwDurchlauf`, `lotseSieht`, `ghPut` |

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

Grenzen der Griffsuche (1,35 / 1,5 / 22–82 %) stehen in `griffSuchen`, Holzbreiten je Fenstertyp in `TYPEN`.

## Wackeltest

`node <proto>/wackel.js` (liegt nicht im Repo, Vorlage siehe Commit-Beschreibung): jedes Lernfoto in 5 Varianten (Original, auf 90 % und 75 % verkleinert, JPEG 70 %, leicht weich) durch v3. Misst, ob dasselbe Foto auf verschiedenen Handys dasselbe Maß ergäbe.

| Datum | Stand | stabil (< 1 % Streuung) | Streuung Median | Fehler Median | ±2 % |
| --- | --- | --- | --- | --- | --- |
| 4. Nov. 2026 | v3 | 7 von 27 | 5,3 % | 7,4 % | 6 von 128 |
| 4. Nov. 2026 | „nächste ruhige Kante gewinnt“ (verworfen) | 3–6 von 27 | 7,7–14,1 % | 8,2–14,0 % | 5–7 |
| 4. Nov. 2026 | v3.1: Mehrheit aus 3 Rastern (2/2,5/3 mm) | 7 von 28 | 4,9 % | 7,3 % | 17 von 136 |

## Prüfstand

`node pruefstand/pruefstand.js <Pfad zu foto-lotse-daten> [Ausgabe]` lässt den aktuellen Lotsen über alle Lernfotos laufen und vergleicht mit den echten Maßen (`fenster.json`, sonst `pruefstand/nachtrag.json`). Ausgabe: `ergebnis.md` (Tabelle: Abweichung Breite/Höhe, Marker, Abstand, Griff richtig/falsch) und pro Foto ein Bild mit dem, was der Lotse erkannt hat. Nach jeder Änderung an der Erkennung laufen lassen und das Ergebnis hier eintragen. Fotos bleiben lokal, ins öffentliche Repo kommt nur der Code.

| Datum | Commit | Fotos | auf ±2 % | Bemerkung |
| --- | --- | --- | --- | --- |
| 4. Nov. 2026 | v3.1 `543cc2e` | 29 aus 7 Fenstern | 4 von 29 (±5 %: 9) | Mehrheit aus 3 Rastern + Selbsteinschätzung. Median Breite 4,4 %, Höhe 4,3 %. Als „unsicher“ gemeldet: 8, davon alle 8 wirklich > 5 % daneben (keine Fehlalarme); als „sicher“ gemeldet: 20, davon 9 auf ±5 % (11 falsch, aber sicher gemeldet → noch zu tun). Frontale Analysefotos: WZ 814 × 1244 (echt 810 × 1246), KiZi 1218 × 1301 (1218 × 1320). Rechenzeit ca. 2 s am Rechner |
| 4. Nov. 2026 | v3 (`3a465a9`) | 29 mit Maß aus 8 Fenstern | 1 von 29 (±5 %: 9, v2: 4) | Median Breite 3,1 %, Höhe 4,4 % (v2: 20,5 % / 33,0 %). Neu: Wohnzimmer Kunststoff 2-flüglig (Analysefoto 814 × 1246 statt 810 × 1246), Abendfotos mit Licht an (Spiegelungen vom Zimmer in der Scheibe; Analysefotos −1 bis +3 %). **Auffällig: dasselbe Foto gibt am Handy und im Prüfstand teils verschiedene Maße** (SZ Dunkel: Handy 834 × 1243, Prüfstand 775 × 1454) → v3 reagiert empfindlich auf kleine Unterschiede (Bildverkleinerung, JPEG, Bauart-Einstellung) |
| 4. Nov. 2026 | `53d7150` (v3) | 14 aus 3 Fenstern | 0 von 14 (±5 %: 2, v2: 0) | **v3**: Median Breite 2,5 %, Höhe 7,1 % (v2: 30,3 % / 44,1 %). 4 Nahfotos ohne ganzes Fenster: jetzt „kein Maß“ statt falscher Zahl. Griff 8 von 10 richtig. Höhe noch zu groß: unten Türschwelle, oben Rollokasten (gleiche Farbe wie Rahmen). Rechenzeit ca. 1,3 s am Rechner |
| 4. Nov. 2026 | `e2b8264` | 14 aus 3 Fenstern | 0 von 14 | Neues Fenster „Kinderzimmer“ (Holz, Flügel 1218 × 1320, Ziergitter außen, Markise, Gegenlicht): bestes Foto aus 3,1 m −11,7 % / +0,2 %, sonst −12 bis −68 %. Griff 4 von 5 falsch |
| 4. Nov. 2026 | `27efb0f` | 9 aus 2 Fenstern (beide dieselbe Balkontür) | 0 von 9 | Ausgangslage. Abweichung meist −20 bis −50 %; Ergebnis hängt stark von der Bauart-Einstellung ab (am Handy mit „Holz“ 724 × 2101, im Prüfstand mit „Kunststoff“ 583 × 1130) |

## Lernfotos (Bestand)

Liegen im privaten Repo `LevinTheo/foto-lotse-daten`, bleiben dort dauerhaft. Ordner ohne `fenster.json` (vor dem Knopf „Fenster fertig“) hier zuordnen:

| Ordner | Fenster | Echtes Maß Flügel | Fotos | Lotse (Stand 4. Nov.) |
| --- | --- | --- | --- | --- |
| `fenster/2026-11-04_1603_fenster` | unbekannt, 1 Foto ohne Maß | – | 1 | wird nicht ausgewertet (`ignorieren` im Nachtrag); im Repo lassen, Claude hat dort nur Lesezugriff |
| `fenster/2026-11-04_1647_fenster` | Schlafzimmer, Kunststoff (nachgetragen), 2 Flügel (nachgetragen, gemessen der linke), dämmrig, Licht an | 810 × 1246 mm | 3 | Analyse am Handy 834 × 1243 |
| `fenster/2026-11-04_1425_fenster` | Wohnzimmer, Kunststoff, 2 Flügel (nachgetragen, gemessen der linke), Gegenlicht | 810 × 1246 mm | 4 | Analyse 814 × 1246 |
| `fenster/2026-11-04_1331_fenster` | Kinderzimmer, Holz, 1 Flügel, Griff rechts, Rollo innen, **Ziergitter außen** (nicht angehakt), Markise, Gegenlicht | 1218 × 1320 mm (Rahmen innen 1068 × 1166, Rahmen sichtbar 76) | 5: aus 1,3–3,1 m, frontal und schräg | Schlimmster Fall bisher: Gitter + Markise + Sonne; selbst Levin sieht die Flügelkante nur unten an den Ecken |
| `fenster/2026-11-04_1217_fenster` | Balkontür Küche, Kunststoff, Griff rechts | 788 × 2023 mm | 5: frontal ca. 1,9 m, schräg von links, oben nah, unten nah, schräg von rechts | Marker immer 4/4, Schärfe 1,6 px; Maß immer falsch (397–523 × 772–1829 mm), unten nah gar keins |

## Änderungsprotokoll

Neueste oben. Format: Datum · Account/Sitzung · Commit · Änderung · Warum · Ergebnis.

| Datum | Commit | Änderung | Warum | Ergebnis |
| --- | --- | --- | --- | --- |
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

- [ ] **Ecken abgleichen (Levins Idee, nächster Schritt):** Ein Fenster ist an allen vier Ecken gleich aufgebaut (Glasleiste, Flügelholz, Fuge, Rahmen). Sauber erkannte Ecke als Vorlage, die anderen dagegen prüfen (Holzbreite, Fugenabstand, Farbe); oben Rollokasten / unten Fensterbank passen dann nicht und fallen raus
- [ ] **Später: Verzug erkennen (Levins Idee).** Diagonalen vergleichen (maßstabsunabhängig), erst sinnvoll wenn Ecken auf wenige mm sitzen und die Ebene nicht nur vom kleinen Blatt kommt (sonst Schein-Trapez). Praktischer zuerst: Fugenbreite in den Nahfotos (Scherenlager oben, Ecklager unten) messen; hängender Flügel = Fuge oben/unten ungleich. Ziel z. B. „Flügel hängt ca. 4 mm, Beschlag nachstellen“, bei Kastendoppelfenstern häufig
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

## Nachbauen

1. Stand wählen: im Repo unter „Commits“ den Commit öffnen und „Browse files“, oder als ZIP herunterladen.
2. Seite starten: auf einen Webserver legen oder GitHub Pages einschalten (Settings → Pages → Branch `main`). Die Kamera geht nur über https.
3. Maßblatt: A4 in 100 % drucken, vier ArUco-Marker 4×4 Nr. 0–3, je 80 mm, 12 mm vom Papierrand (0 oben links, 1 oben rechts, 2 unten rechts, 3 unten links).
4. Ablauf und Grenzwerte wie oben.
5. Neu bauen lassen: diesen Bericht und `index.html` an Claude geben.
