# foto-lotse

Testseite für den Foto-Lotsen von Holtcraft: eine geführte Kamera für die Fotos in der Anfrage.
Weiße Linien zeigen, wo das Fenster ins Bild soll. Hinweise wie „Geh näher ran“ oder „Handy gerade halten“
helfen beim Ausrichten. Passt es, werden die Linien grün und das Foto macht sich von selbst.

Live: https://levintheo.github.io/foto-lotse/ (sobald GitHub Pages eingeschaltet ist)

- Nur zum Testen. Die Seite schickt nichts weg, Fotos und Maße bleiben auf dem Handy.
- Gesichter auf den Fotos werden nach dem Auslösen automatisch verpixelt, direkt auf dem Handy
  (Gesichtserkennung face-api von Vladimir Mandic, MIT-Lizenz, siehe vendor/LICENSE-face-api.txt).
- Vor dem Start fragt der Lotse: „Wie viele Flügel hat dein Fenster?“ (1 oder 2). Gemessen wird am Flügel (der Rahmen ist oft eingeputzt).
  „Manuelles Aufmaß“ ist vorerst ein Formular zum Selbst-Eintragen.
- Maßblatt: Klebt das Holtcraft-Maßblatt (A4, vier ArUco-Marker 4×4, Nummern 0–3, je 80 mm) innen auf der Scheibe (bei 2 Flügeln
  auf der linken), führt der Lotse im Livebild nur nach dem Blatt auf ca. 3 m Abstand und mittig davor und löst aus, wenn alles passt.
  Das Maß kommt danach vom fertigen Foto: Fenster von der Holzseite her (v3), Einzelheiten in REGIE.md.
  Die Rechnung läuft auf dem Handy in einem Hintergrund-Thread.
- Ein Knopf, ein roter Faden: „Analyse starten“ führt ohne Zwischenklicks durch alle Fotos (ganzes Fenster, Griff, Schere oben, Ecklager unten, gekippt, optional außen).
  Gute Fotos sind kurz zu sehen, dann geht es von selbst weiter.
- Schärfe: Jedes Foto wird an den stärksten Kanten geprüft (Breite des Hell-Dunkel-Übergangs). Unscharf heißt: der Lotse macht es selbst nochmal.
  Grenze `TOL.schaerfe` (3,6 px bei 1600 px langer Seite), muss mit echten Handyfotos nachgestellt werden.
- Griff: Auf dem ersten Foto sucht der Lotse auf dem Flügelholz links und rechts nach der größten Störung (unabhängig von der Farbe).
  Die Bänder liegen gegenüber; Griff-, Scheren- und Ecklager-Foto richten sich danach. Der Kunde bestätigt mit einem Tipp (links oder rechts, Vorschlag hervorgehoben). Bei 2 Flügeln keine Frage.
- Ohne Kamera (zum Beispiel am Computer ohne Freigabe) gibt es einen Übungsmodus mit gezeichnetem Fenster.
- Tests: `pruefstand/uebung.js` (Ablauf), `pruefstand/pruefstand.js` und `pruefstand/wackel.js` (Messung an den Lernfotos), siehe REGIE.md.

Schrift: Space Grotesk, Copyright 2020 The Space Grotesk Project Authors, lizenziert unter der
SIL Open Font License 1.1 (https://openfontlicense.org).
