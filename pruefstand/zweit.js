#!/usr/bin/env node
// Zweitmessung-Test (v3.34): misst echte Lernfotos über denselben Weg wie die App (fotoMessen, Hintergrund-Thread) mit einem
// Vergleichsfoto und prüft die Zweitmessung: (1) SZ 0730 Flügel 1 (2,91 m) mit Reihe-Foto 1 (1,59 m) → Zweitmessung da, Maß bleibt
// sicher, wenn beide passen; (2) gleich danach ein zweites Foto im selben Schritt (wie nach „Nein“): das Vergleichsfoto muss noch heil
// sein; (3) SZ 1055 links (2,59 m) mit dem stillen Vergleichsfoto (1,52 m): beide weichen stark ab → unsicher; (4) danach läuft der
// Hintergrund-Thread noch (bis v3.34-Entwurf schaltete ein abgegebenes Bild ihn ab, dann kam kein grüner Rahmen mehr).
// Aufruf: node pruefstand/zweit.js <Pfad zu foto-lotse-daten> [Pfad zum Lotsen, Standard: dieses Repo]. Dauert ca. 30 s.
const fs = require('fs'), path = require('path');
const { chromium, devices } = require('playwright');
const DATEN = path.resolve(process.argv[2] || '/home/claude/foto-lotse-daten'), LOTSE = path.resolve(process.argv[3] || path.join(__dirname, '..'));
const FALL = [
  { name: 'SZ 0730 Flügel 1 mit Reihe-Foto 1', foto: '2026-11-07_0730_fenster/lauf-01-fl1.jpg', vergl: '2026-11-07_0730_fenster/lauf-04-fl1-r1.jpg', abstand: 1593, echt: [810, 1245] },
  { name: 'SZ 0730 zweites Foto im selben Schritt', foto: '2026-11-07_0730_fenster/lauf-05-fl1-r2.jpg', gleicherVergleich: true, echt: [810, 1245] },
  { name: 'SZ 1055 links mit stillem Vergleichsfoto', foto: '2026-11-07_1055_fenster/lauf-01-innen.jpg', vergl: '2026-11-07_1055_fenster/lauf-03-innen-v.jpg', abstand: 1524, echt: [810, 1245], unsicher: true }
];
(async () => {
  for (const f of FALL) for (const x of [f.foto, f.vergl]) if (x && !fs.existsSync(path.join(DATEN, 'fenster', x))) { console.log('Foto fehlt: ' + x); process.exit(2); }
  const browser = await chromium.launch();
  const page = await (await browser.newContext(devices['iPhone 13'])).newPage();
  const fehler = [];
  page.on('pageerror', (e) => fehler.push('Seitenfehler: ' + e.message));
  await page.route('http://lotse.test/**', (route) => {
    const u = new URL(route.request().url());
    const p = u.pathname.startsWith('/_daten/') ? path.join(DATEN, decodeURIComponent(u.pathname.slice(8))) : path.join(LOTSE, decodeURIComponent(u.pathname));
    if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) return route.fulfill({ status: 404, body: '' });
    const typ = p.endsWith('.html') ? 'text/html' : p.endsWith('.js') ? 'text/javascript' : p.endsWith('.jpg') ? 'image/jpeg' : 'application/octet-stream';
    route.fulfill({ status: 200, body: fs.readFileSync(p), contentType: typ });
  });
  await page.goto('http://lotse.test/index.html?test');
  await page.evaluate(() => localStorage.setItem('foto-lotse-entw', JSON.stringify({ reihe: false })));
  await page.goto('http://lotse.test/index.html?test');
  await page.click('#start');
  await page.click('#flu-wahl-2');
  await page.waitForSelector('#kamera:not([hidden])');
  await page.waitForTimeout(500);
  for (const f of FALL) {
    const r = await page.evaluate(async ({ f }) => {
      const L = window.__lotse, k = L.k;
      const lade = async (u) => {
        const img = new Image(); img.src = 'http://lotse.test/_daten/fenster/' + u; await img.decode();
        const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
        cv.getContext('2d', { willReadFrequently: true }).drawImage(img, 0, 0);
        return cv;
      };
      k.blattNr = 0;
      if (!f.gleicherVergleich) {
        // wie vergleichMerken: Graubild und Farben
        const cv = await lade(f.vergl), c = cv.getContext('2d'), d = c.getImageData(0, 0, cv.width, cv.height).data, g = new Uint8Array(cv.width * cv.height), rgb = new Uint8Array(cv.width * cv.height * 3);
        for (let i = 0, j = 0; i < g.length; i++, j += 4) { g[i] = (77 * d[j] + 150 * d[j + 1] + 29 * d[j + 2]) >> 8; rgb[3 * i] = d[j]; rgb[3 * i + 1] = d[j + 1]; rgb[3 * i + 2] = d[j + 2]; }
        k.vergleich = { g: g, rgb: rgb, w: cv.width, h: cv.height, f: 0.693 * Math.max(cv.width, cv.height), abstand: f.abstand, blattNr: 0, ausReihe: false, modus: 'foto', info: {} };
      }
      const laengeVorher = k.vergleich.g.length;
      const erg = await L.fotoMessen(await lade(f.foto), 'foto');
      return { ok: !!(erg && erg.ok), breite: erg && Math.round(erg.breite), hoehe: erg && Math.round(erg.hoehe), sicher: erg && erg.massSicher,
        hinten: erg && erg.hinten && erg.hinten.ok, zweit: erg && erg.zweitmessung, vergleichHeil: k.vergleich.g.length === laengeVorher && laengeVorher > 0 && k.vergleich.rgb.length === 3 * laengeVorher };
    }, { f });
    const pz = (a, b) => ((a - b) / b * 100).toFixed(1).replace('.', ',') + ' %';
    console.log(f.name + ': ' + (r.ok ? r.breite + ' × ' + r.hoehe + ' (' + pz(r.breite, f.echt[0]) + ' / ' + pz(r.hoehe, f.echt[1]) + ')' : 'kein Maß') +
      ', Parallaxe ' + (r.hinten ? 'ja' : 'nein') + ', Zweitmessung ' + (r.zweit && r.zweit.ok ? r.zweit.breite + ' × ' + r.zweit.hoehe + ', Abweichung ' + String(r.zweit.abw).replace('.', ',') + ' %' : 'keine') +
      ', ' + (r.sicher ? 'sicher' : 'unsicher') + (r.vergleichHeil ? '' : ', VERGLEICHSFOTO KAPUTT'));
    if (!r.ok || !r.hinten) fehler.push(f.name + ': kein Maß oder keine Parallaxe');
    if (!r.zweit || !r.zweit.ok) fehler.push(f.name + ': keine Zweitmessung');
    if (!r.vergleichHeil) fehler.push(f.name + ': Vergleichsfoto danach leer (Speicher abgegeben)');
    if (f.unsicher && r.sicher !== false) fehler.push(f.name + ': hätte unsicher sein müssen');
  }
  // Läuft der Hintergrund-Thread noch? Nur dann wird der Speicher des Bildes abgegeben (danach Länge 0); ohne Thread rechnet die Seite selbst
  const thread = await page.evaluate(async () => {
    const a = new Uint8Array(64 * 64);
    await window.__lotse.rechnen(a, 64, 64, 50, { nurBlatt: true }, null);
    return a.length === 0;
  });
  if (!thread) fehler.push('Hintergrund-Thread läuft nicht mehr');
  await browser.close();
  console.log(fehler.length ? '\nFEHLER:\n- ' + fehler.join('\n- ') : '\nZweitmessung-Test bestanden: Zweitmessung über den App-Weg, Vergleichsfoto bleibt heil, Hintergrund-Thread läuft, starke Abweichung → unsicher.');
  process.exit(fehler.length ? 1 : 0);
})();
