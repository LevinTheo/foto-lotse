// Lernmodus-Test (v3.18): spielt als Levin (?entw, Lernfoto-Zugang gespeichert) den Übungsmodus mit 2 Flügeln bis zum Griff, wechselt
// unten rechts mit „Lernmodus“ in die Lernfotos und prüft:
//   - der Knopf erscheint erst, wenn der Durchlauf Fotos hat
//   - alle Fotos des Durchlaufs (Flügel 1, Flügel 2, Gesamtfoto) gehen hoch, je Foto mit dem richtigen Blatt
//   - das Formular hat Felder je Flügel („Flügel 1 (mit Blatt 1)“, „Flügel 2 (mit Blatt 2)“)
//   - „Fenster fertig“ schreibt fenster.json mit fluegelJeBlatt
// GitHub wird nachgestellt: nichts geht ins echte Repo.
// Aufruf: node pruefstand/lernmodus.js [Pfad zum Lotsen]   (Playwright mit Chromium, ca. 1 Minute)
'use strict';
const fs = require('fs'), path = require('path');
const { chromium, devices } = require('playwright');
const LOTSE = path.resolve(process.argv[2] || path.join(__dirname, '..'));

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext(Object.assign({}, devices['iPhone 13'], { reducedMotion: 'reduce' }));
  await ctx.addInitScript(() => {
    if (!sessionStorage.getItem('zugang')) {
      localStorage.setItem('foto-lotse-entw', JSON.stringify({ repo: 'test/foto-lotse-daten', token: 'test', mit: false }));
      sessionStorage.setItem('zugang', '1');
    }
  });
  const page = await ctx.newPage();
  const fehler = [], hoch = {};
  const pruef = (ok, text) => { if (!ok) fehler.push(text); };
  page.on('pageerror', (e) => fehler.push('Seite: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') fehler.push('Konsole: ' + m.text()); });
  await page.route('http://lotse.test/**', (route) => {
    const u = new URL(route.request().url()), p = path.join(LOTSE, decodeURIComponent(u.pathname));
    if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) return route.fulfill({ status: 404, body: '' });
    const typ = p.endsWith('.html') ? 'text/html' : p.endsWith('.js') ? 'text/javascript' : p.endsWith('.json') ? 'application/json' : 'application/octet-stream';
    route.fulfill({ status: 200, body: fs.readFileSync(p), contentType: typ });
  });
  // Nachgestellte GitHub-Gegenstelle: merkt sich jede hochgeladene Datei
  await page.route('https://api.github.com/**', (route) => {
    const req = route.request();
    if (req.method() === 'PUT') {
      const pfad = decodeURIComponent(new URL(req.url()).pathname.split('/contents/')[1] || '');
      hoch[pfad] = JSON.parse(req.postData() || '{}').content || '';
      return route.fulfill({ status: 201, contentType: 'application/json', body: '{}' });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  const sichtbar = (sel) => page.isVisible(sel).catch(() => false);
  const warteStatus = async (re, ms) => { for (let t = 0; t < ms / 100; t++) { if (re.test(await page.textContent('#k-status'))) return true; await page.waitForTimeout(100); } return false; };
  const json = (pfad) => JSON.parse(Buffer.from(hoch[pfad], 'base64').toString('utf8'));

  await page.goto('http://lotse.test/index.html?entw');
  await page.click('#start');
  await page.click('#flu-wahl-2');
  await page.waitForSelector('#kamera:not([hidden])');
  await page.waitForTimeout(500);
  if (await sichtbar('#k-karte')) await page.click('#k-karte-ok');

  // Flügel 1, Flügel 2, Gesamtfoto wie ein Kunde
  for (let n = 0; n < 3; n++) {
    const schritt = await page.textContent('#k-titel');
    pruef(n === 0 ? !(await sichtbar('#k-lern')) : await sichtbar('#k-lern'), schritt + ': Knopf „Lernmodus“ ' + (n === 0 ? 'schon vor dem ersten Foto da' : 'fehlt'));
    if (/^Flügel/.test(schritt)) pruef(await warteStatus(/Blatt \d erkannt/, 5000), schritt + ': kein „Blatt … erkannt“');
    // Abstandsreihe (v3.23, Levin): je Flügel 3 Fotos; „Zeig’s mir“ fährt jeweils auf die nächste Stufe, die ersten beiden löst er still aus
    let still = 0;
    for (let v = 0; v < 4 && !(await sichtbar('#k-pruefen')); v++) {
      await page.click('#k-zeig');
      let t = 0;
      for (; t < 300 && !(await sichtbar('#k-pruefen')); t++) {
        if (/Foto \d von 3 ✓/.test(await page.textContent('#k-status'))) { still++; await page.waitForTimeout(1700); break; }
        await page.waitForTimeout(100);
      }
      if (t >= 300) break;
    }
    if (/^Flügel/.test(schritt)) {
      pruef(still === 2, schritt + ': Abstandsreihe mit ' + still + ' stillen Fotos statt 2');
      pruef(/Reihe: \d,\d m \d+ × \d+, \d,\d m \d+ × \d+, jetzt \d,\d m/.test(await page.textContent('#p-mass')), schritt + ': Prüfdialog zeigt die Reihe nicht: ' + await page.textContent('#p-mass'));
    }
    await page.waitForSelector('#k-pruefen:not([hidden])', { timeout: 30000 }).catch(() => pruef(false, schritt + ': löst nicht aus'));
    if (await sichtbar('#p-rahmen')) await page.click('#p-rahmen-ja');
    await page.waitForTimeout(200);
    if (await sichtbar('#p-weiter')) await page.click('#p-weiter');
    await page.waitForSelector('#k-pruefen', { state: 'hidden', timeout: 10000 }).catch(() => pruef(false, schritt + ': Prüfdialog geht nicht weiter'));
    await page.waitForTimeout(300);
  }
  pruef((await page.textContent('#k-titel')) === 'Der Griff', 'nach dem Gesamtfoto nicht beim Griff: ' + await page.textContent('#k-titel'));
  pruef(await sichtbar('#k-lern'), 'beim Griff fehlt „Lernmodus“');
  await page.click('#k-lern');

  // Lernfotos: Formular mit Feldern je Flügel, alle Fotos hochgeladen
  pruef(await sichtbar('#entw-feld'), 'Lernfotos gehen nicht auf');
  pruef(!(await sichtbar('#kamera')), 'Kamera bleibt offen');
  pruef((await page.inputValue('#entw-nu')) === '2', 'Flügelanzahl im Formular nicht 2');
  const legenden = await page.$$eval('#entw-fluegel legend', (l) => l.map((x) => x.textContent));
  pruef(legenden.join(' | ') === 'Flügel 1 (mit Blatt 1) | Flügel 2 (mit Blatt 2)', 'Felder je Flügel: ' + legenden.join(' | '));
  pruef(!(await sichtbar('#entw-b')), 'Einzelfeld „Flügel breit“ trotz 2 Flügeln sichtbar');
  for (let t = 0; t < 150 && Object.keys(hoch).filter((p) => /lauf-.*\.json$/.test(p)).length < 7; t++) await page.waitForTimeout(100);
  const lauf = Object.keys(hoch).filter((p) => /lauf-.*\.json$/.test(p)).sort();
  pruef(lauf.length === 7 && Object.keys(hoch).filter((p) => /lauf-.*\.jpg$/.test(p)).length === 7, 'hochgeladen (erwartet 2 × 3 Flügel-Fotos + Gesamtfoto): ' + Object.keys(hoch).join(', '));
  const daten = lauf.map(json);
  const fl = daten.filter((d) => /^fl\d$/.test(d.schritt)), ges = daten.find((d) => d.schritt === 'innen');
  const rh = daten.filter((d) => /^fl\d-r\d$/.test(d.schritt));
  pruef(rh.length === 4 && rh.every((d) => d.blatt && d.messung && d.ablauf && d.messung.abstand > 1300), 'Reihen-Fotos: ' + JSON.stringify(rh.map((d) => [d.schritt, d.blatt, d.messung && d.messung.abstand])));
  console.log('Abstandsreihe: ' + rh.concat(fl).map((d) => d.schritt + ' ' + (d.messung ? (d.messung.abstand / 1000).toFixed(2) + ' m ' + d.messung.breite + '×' + d.messung.hoehe : '–')).join(' · '));
  pruef(fl.length === 2 && fl.map((d) => d.blatt).sort().join() === '1,2', 'Flügel-Fotos mit Blatt: ' + fl.map((d) => d.schritt + '=' + d.blatt).join(', '));
  pruef(fl.every((d) => d.quelle === 'durchlauf-lernmodus' && d.messung && d.messung.breite > 300), 'Flügel-Fotos ohne Messung oder falsche Quelle');
  // Ablaufprotokoll (v3.18): Hinweise mit Zeit, Blatt gelesen, wie ausgelöst, Livemessungen
  pruef(fl.every((d) => d.ablauf && d.ablauf.hinweise.length >= 3 && d.ablauf.blattGelesen >= 0 && /^(rahmen|ohneRahmen)$/.test(d.ablauf.ausloeser) && d.ablauf.live.n > 0 && d.ablauf.blatt === d.blatt),
    'Ablaufprotokoll der Flügel-Fotos fehlt oder unvollständig: ' + JSON.stringify(fl.map((d) => d.ablauf && { gelesen: d.ablauf.blattGelesen, ausl: d.ablauf.ausloeser, live: d.ablauf.live, h: d.ablauf.hinweise.length })));
  pruef(fl.every((d) => d.ablauf.kamera && d.ablauf.kamera.modus === 'uebung' && typeof d.ablauf.kamera.takePhoto === 'boolean' && d.ablauf.kamera.foto && d.ablauf.kamera.foto[0] > 300), 'Kamera-Angaben im Ablauf fehlen: ' + JSON.stringify(fl[0] && fl[0].ablauf && fl[0].ablauf.kamera));
  pruef(!!ges && ges.ablauf && ges.ablauf.ausloeser === 'gesamt', 'Ablaufprotokoll Gesamtfoto: ' + JSON.stringify(ges && ges.ablauf && ges.ablauf.ausloeser));
  if (fl[0] && fl[0].ablauf) console.log('Ablauf Flügel 1: ' + fl[0].ablauf.hinweise.map((h) => h[0] + ' ms ' + h[1]).join(' → ') + ' · ausgelöst ' + fl[0].ablauf.ausgeloest + ' ms (' + fl[0].ablauf.ausloeser + '), ' + fl[0].ablauf.live.n + ' Livemessungen, Mittel ' + fl[0].ablauf.live.msMittel + ' ms');
  pruef(!!ges && ges.anordnung === 'nebeneinander' && ges.fluegel && ges.fluegel.length === 2, 'Gesamtfoto ohne Anordnung / Flügel: ' + JSON.stringify(ges && { a: ges.anordnung, f: ges.fluegel }));
  const ordner = lauf[0].split('/').slice(0, 2).join('/');

  // Echte Maße je Flügel eintragen, Fenster fertig
  await page.fill('#entw-name', 'Testfenster');
  await page.fill('#entw-f1-b', '450'); await page.fill('#entw-f1-h', '1240'); await page.fill('#entw-f1-rib', '320');
  await page.fill('#entw-f2-b', '451'); await page.fill('#entw-f2-h', '1239');
  pruef(await sichtbar('#entw-zm'), 'Feld „Zwischenraum Mitte“ fehlt');
  await page.fill('#entw-zm', '0');
  await page.click('#entw-neu');
  for (let t = 0; t < 100 && !hoch[ordner + '/fenster.json']; t++) await page.waitForTimeout(100);
  pruef(!!hoch[ordner + '/fenster.json'], 'fenster.json fehlt (Ordner ' + ordner + ')');
  if (hoch[ordner + '/fenster.json']) {
    const f = json(ordner + '/fenster.json').fenster;
    pruef(f.fluegelAnzahl === 2, 'fluegelAnzahl ' + f.fluegelAnzahl);
    pruef(f.fluegelJeBlatt && f.fluegelJeBlatt.length === 2 && f.fluegelJeBlatt[0].blatt === 1 && f.fluegelJeBlatt[0].breiteMm === 450 && f.fluegelJeBlatt[0].lichtBreiteMm === 320 &&
      f.fluegelJeBlatt[1].blatt === 2 && f.fluegelJeBlatt[1].hoeheMm === 1239, 'fluegelJeBlatt: ' + JSON.stringify(f.fluegelJeBlatt));
    pruef(f.fluegelBreiteMm === 450 && f.fluegelHoeheMm === 1240 && f.name === 'Testfenster', 'Einzelwerte: ' + f.fluegelBreiteMm + ' × ' + f.fluegelHoeheMm + ', ' + f.name);
    pruef(f.zwischenraumMitteMm === 0 && f.zwischenraumObenUntenMm === null, 'Zwischenraum: ' + f.zwischenraumMitteMm + ' / ' + f.zwischenraumObenUntenMm);
  }
  await page.waitForFunction(() => /Gespeichert/.test(document.getElementById('entw-ordner').textContent), null, { timeout: 5000 }).catch(() => pruef(false, 'kein „Gespeichert ✓“ nach „Fenster fertig“'));
  pruef(!(await sichtbar('#entw-fluegel')) && (await page.$$('#entw-fluegel fieldset')).length === 0, 'Felder je Flügel nach „Fenster fertig“ nicht geleert');
  await browser.close();
  console.log('Hochgeladen: ' + Object.keys(hoch).sort().join(', '));
  console.log(fehler.length ? '\nFEHLER (' + fehler.length + '):\n- ' + fehler.join('\n- ') : '\nLernmodus-Test bestanden: Abstandsreihe (2 Flügel × 3 Fotos) und Gesamtfoto mit Blatt übernommen, Felder je Flügel, fenster.json mit fluegelJeBlatt.');
  process.exit(fehler.length ? 1 : 0);
})();
