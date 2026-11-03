# foto-lotse

Testseite für den Foto-Lotsen von Holtcraft: eine geführte Kamera für die Fotos in der Anfrage.
Weiße Linien zeigen, wo das Fenster ins Bild soll. Hinweise wie „Geh näher ran“ oder „Handy gerade halten“
helfen beim Ausrichten. Passt es, werden die Linien grün und das Foto macht sich von selbst.

Live: https://levintheo.github.io/foto-lotse/ (sobald GitHub Pages eingeschaltet ist)

- Nur zum Testen. Die Seite schickt nichts weg, Fotos und Maße bleiben auf dem Handy.
- Gesichter auf den Fotos werden nach dem Auslösen automatisch verpixelt, direkt auf dem Handy
  (Gesichtserkennung face-api von Vladimir Mandic, MIT-Lizenz, siehe vendor/LICENSE-face-api.txt).
- Flügel, Oberlicht und Maße lassen sich über „Ändern“ einstellen. Gemessen wird am Flügel (der Rahmen ist oft eingeputzt), der Rahmen wird daraus geschätzt. Später kommen die Maße aus der Anfrage auf holtcraft.de.
- Maßblatt (neu): Klebt das Holtcraft-Maßblatt (A4, vier ArUco-Marker 4×4, Nummern 0–3, je 80 mm) innen auf der Scheibe,
  misst der Lotse beim ersten Foto den Flügel selbst. Er führt auf ca. 3 m Abstand, mittig vors Fenster und das ganze Fenster ins Bild,
  zeigt das erkannte Fenster als Umriss und löst aus, wenn alles passt. Die Rechnung läuft auf dem Handy in einem Hintergrund-Thread.
  Mit „Selbst eingeben“ prüft das Maßblatt die Eingabe nur nach.
- Ein Knopf, ein roter Faden: „Analyse starten“ führt ohne Zwischenklicks durch alle Fotos (ganzes Fenster, Griff, Schere oben, Ecklager unten, gekippt, optional außen).
  Gute Fotos sind kurz zu sehen, dann geht es von selbst weiter.
- Schärfe: Jedes Foto wird an den stärksten Kanten geprüft (Breite des Hell-Dunkel-Übergangs). Unscharf heißt: der Lotse macht es selbst nochmal.
  Grenze `TOL.schaerfe` (3,6 px bei 1600 px langer Seite), muss mit echten Handyfotos nachgestellt werden.
- Griff: Auf dem ersten Foto sucht der Lotse auf dem Flügelholz links und rechts nach der größten Störung (unabhängig von der Farbe).
  Die Bänder liegen gegenüber; Griff-, Scheren- und Ecklager-Foto richten sich danach. Unsicher: eine Frage, links oder rechts. Bei 2 Flügeln noch nicht.
- Ohne Kamera (zum Beispiel am Computer ohne Freigabe) gibt es einen Übungsmodus mit gezeichnetem Fenster.

Schrift: Space Grotesk, Copyright 2020 The Space Grotesk Project Authors, lizenziert unter der
SIL Open Font License 1.1 (https://openfontlicense.org).
