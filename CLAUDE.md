# Arbeitsregeln für den Foto-Lotsen

Levin baut den Foto-Lotsen aus zwei Claude-Accounts abwechselnd weiter. Beide arbeiten in diesem Repo. Damit nichts verloren geht:

1. **Vor dem ersten Ändern den neuesten Stand holen** (`git pull --rebase origin main`), auch in einer Sitzung, die das Repo schon geklont hat.
2. **`REGIE.md` lesen.** Dort stehen Zielbild, Ablauf, Technik, Stellschrauben, Änderungsprotokoll und offene Punkte.
3. **Nach jeder Änderung `REGIE.md` nachführen:** neue Zeile oben ins Änderungsprotokoll (Datum, Commit, Änderung, Warum, Ergebnis), betroffene Abschnitte und offene Punkte anpassen. Nur eintragen, was wirklich gemacht und getestet wurde.
4. **Fertige Änderungen gleich hochladen** (commit + push auf `main`), damit die andere Sitzung darauf weiterbaut. Vor dem Push nochmal `git pull --rebase origin main`; bei Konflikten zusammenführen, nichts von der anderen Seite überschreiben.
5. Alles in `index.html` bleibt eine einzige Datei ohne Build-Schritt. Kommentare und Texte auf Deutsch, Ansprache an den Kunden mit „du“.
6. Grenzwerte gehören ins Objekt `TOL` (Bedienung) bzw. `V3` (Messung im Hintergrund-Thread). Testen im Übungsmodus mit `node pruefstand/uebung.js` (Playwright, `?test` für den lesbaren Zustand), Messung mit Prüfstand und Wackeltest, Ergebnis in `REGIE.md` notieren.
7. **Übergabe immer aktuell halten (Levins Wunsch, 5. Nov. 2026):** Nach jeder Version und wenn eine Arbeit angefangen, aber nicht fertig ist, den Abschnitt „Übergabe“ oben in `REGIE.md` auf Stand bringen: Version, was gerade in Arbeit ist, nächster Schritt, offene Fragen an Levin, Start-Text für einen neuen Chat. Jeder Bericht an Levin endet mit einer Zeile „Chat-Name: Foto Lotse vX.Y“, damit er den Chat passend umbenennen kann. Claude kann den Chat nicht selbst umbenennen und sieht nicht vorher, wann ein Chat zusammengefasst wird; deshalb muss die Übergabe jederzeit im Repo stimmen.
