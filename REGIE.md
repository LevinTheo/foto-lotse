# Foto-Lotse – Regiebericht

Stand: 4. Nov. 2026 · Levin (Holtcraft)

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
| Maßblatt | Misst den Flügel ohne Zollstock | A4 hochkant, 4 ArUco-Marker 4×4 (Nr. 0–3, je 80 mm, 12 mm vom Rand). Aus den Markern: Maßstab, Abstand, Schräge. Dann Kanten Glas und Flügel suchen, Fluchtpunkte, Tiefe je Fenstertyp abziehen | `findeMarker`, `blattLage`, `fensterMessen`, `fensterGenau`, `messen` |
| Führung im Livebild | „Geh 1 m zurück“, „Mittig davor“, „Halt still“ | Etwa 3 Messungen pro Sekunde auf 1280 px, Ziel 2,5–3,5 m, löst selbst aus | `massLive`, `deutenBlatt` |
| Schärfe | Erkennt verwackelte oder falsch scharfgestellte Fotos | Bild auf 1600 px lange Seite, an den stärksten 1,5 % der Kanten Breite des Übergangs 10–90 % messen, senkrecht und waagerecht getrennt, der schlechtere Wert zählt | `schaerfe`, `kantenBreite`, `schaerfeVon` |
| Griffsuche | Schlägt die Griffseite vor, Bänder gegenüber. Vorerst bestätigt der Kunde immer mit einem Tipp (Vorschlag hervorgehoben) | Flügelholz links und rechts in 9 Spalten abtasten, Abweichung vom Rest desselben Holzes plus Kanten, 12-cm-Fenster zwischen 22 % und 82 % der Höhe. Farbunabhängig. Sicher ab Verhältnis 1,35 und Wert 1,5 und nur bei stimmiger Messung, sonst eine Frage | `griffSuchen` |
| Spiegelung | Legt Griff-, Scheren-, Ecklager-Foto auf die richtige Seite | `P.band` = Seite der Bänder; daraus Griff, Schere, Ecklager, Hilfslinien, Texte, Skizze | `geometrie`, `mx`, `mr`, `Lm`, `texteSetzen` |
| Automatisch weiter | Kein Klick zwischen den Fotos | Gutes Foto 1,5 s zeigen, dann weiter. Warten nur bei fehlendem Maß, Unschärfe nach 3 Versuchen oder Griff-Frage | `pruefen`, `weiter` |
| Gesichter | Verpixelt Personen | face-api (TinyFaceDetector) nach dem Auslösen | `gesichterVerpixeln` |
| Lernfotos (Entwickler) | Sammelt echte Fotos mit echtem Maß | Foto aus Kamera-App oder Galerie (Original), Lotse wertet es aus, beides geht per GitHub-API in das private Repo `LevinTheo/foto-lotse-daten`: `fenster/<Datum_Zeit>_<Name>/foto-01.jpg` + `foto-01.json` (echtes Maß, Bauart, Griff, Notiz, was der Lotse erkannt hat). Optional auch jedes Foto aus dem normalen Durchlauf (`lauf-…`). Token und Repo nur in localStorage auf dem Handy | `entwDatei`, `entwDurchlauf`, `lotseSieht`, `ghPut` |

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

## Änderungsprotokoll

Neueste oben. Format: Datum · Account/Sitzung · Commit · Änderung · Warum · Ergebnis.

| Datum | Commit | Änderung | Warum | Ergebnis |
| --- | --- | --- | --- | --- |
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

- [ ] **Wichtigster Punkt: Kantensuche robust gegen unruhigen Hintergrund.** Ideen: Glaskante muss über (fast) die ganze Glashöhe bzw. -breite durchlaufen, nicht nur neben dem Blatt; das Profil zwischen Glaskante und Flügelkante muss über die ganze Länge gleichmäßig sein (Zaunlatten, Wimpel, Markise sind es nicht); Bauart-Profilbreiten (IV 68/78/92, Kunststoff) als Erwartung. Mit Lernfotos testen, nicht an einem Foto festmachen
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
- [ ] Entscheiden, ob der Kunde den Flügel öffnen soll (Getriebe), und ob Falzmaße aus einem Schrägfoto oder aus hinterlegten Profilmaßen (IV 68, 78, 92) kommen
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
