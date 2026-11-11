#!/usr/bin/env node
// Stehen-Test (v3.38, Fable G1): ein Kunde, der sich nicht bewegt, macht Vergleichsfoto und Flügel-Foto vom selben Platz. Dann verschiebt
// sich nichts (keine Parallaxe), beide Fotos messen dieselbe falsche Kante (Baum hinter dem Glas), und bis v3.37 machte die Zweitmessung
// das Maß „einig“ und damit sicher (Fable: 1359 links −23 % als sicher). Geprüft wird über den App-Weg (fotoMessen, Hintergrund-Thread,
// dann konsens wie im Prüfdialog):
// (1) SZ 1359 links, Vergleichsfoto = dasselbe Foto → muss unsicher sein;
// (2) SZ 1252 rechts, Vergleichsfoto = dasselbe Foto → muss unsicher sein;
// (3) gleich danach ein zweiter Versuch vom selben Platz (wie „Nochmal von vorn“, ohne sich zu bewegen) → bleibt unsicher, ein früherer
//     Versuch vom selben Platz zählt nicht als Einigkeit;
// (4) Gegenprobe: SZ 1359 links mit seinem echten Vergleichsfoto (ca. 0,45 m versetzt) → sicher wie am Handy;
// (5) ausgedacht: Einigkeit mit einem früheren Versuch zählt nur, wenn dessen Kamera mind. TOL.einigVersatz woanders stand.
// Aufruf: node pruefstand/stehen.js <Pfad zu foto-lotse-daten> [Pfad zum Lotsen, Standard: dieses Repo]. Dauert ca. 40 s.
const fs = require('fs'), path = require('path');
const { chromium, devices } = require('playwright');
const DATEN = path.resolve(process.argv[2] || '/home/claude/foto-lotse-daten'), LOTSE = path.resolve(process.argv[3] || path.join(__dirname, '..'));
const FALL = [
  { name: 'SZ 1359 links, stehen geblieben', foto: '2026-11-10_1359_fenster/lauf-01-fl1.jpg', vergl: 'gleich', blatt: 0, echt: [810, 1245], soll: 'unsicher', neu: true },
  { name: 'SZ 1252 rechts, stehen geblieben', foto: '2026-11-10_1252_fenster/lauf-01-fl1.jpg', vergl: 'gleich', blatt: 1, echt: [1228, 1245], soll: 'unsicher', neu: true },
  { name: 'SZ 1252 rechts, zweiter Versuch am selben Platz', foto: '2026-11-10_1252_fenster/lauf-01-fl1.jpg', vergl: 'gleich', blatt: 1, echt: [1228, 1245], soll: 'unsicher', neu: false },
  { name: 'SZ 1359 links mit echtem Vergleichsfoto', foto: '2026-11-10_1359_fenster/lauf-01-fl1.jpg', vergl: '2026-11-10_1359_fenster/lauf-06-fl1-v.jpg', blatt: 0, echt: [810, 1245], soll: 'sicher', neu: true }
];
(async () => {
  for (const f of FALL) for (const x of [f.foto, f.vergl]) if (x !== 'gleich' && !fs.existsSync(path.join(DATEN, 'fenster', x))) { console.log('Foto fehlt: ' + x); process.exit(2); }
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
  if (!(await page.evaluate(() => typeof window.__lotse.konsens === 'function'))) { console.log('Lotse ohne __lotse.konsens (vor v3.38)'); process.exit(2); }
  for (const f of FALL) {
    const r = await page.evaluate(async ({ f }) => {
      const L = window.__lotse, k = L.k;
      const lade = async (u) => {
        const img = new Image(); img.src = 'http://lotse.test/_daten/fenster/' + u; await img.decode();
        const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
        cv.getContext('2d', { willReadFrequently: true }).drawImage(img, 0, 0);
        return cv;
      };
      k.blattNr = f.blatt;
      if (f.neu) { k.messPool = []; k.vonVornZahl = 0; } else k.vonVornZahl = (k.vonVornZahl || 0) + 1;
      // wie vergleichMerken: Graubild und Farben
      const cv = await lade(f.vergl === 'gleich' ? f.foto : f.vergl), d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
      const g = new Uint8Array(cv.width * cv.height), rgb = new Uint8Array(cv.width * cv.height * 3);
      for (let i = 0, j = 0; i < g.length; i++, j += 4) { g[i] = (77 * d[j] + 150 * d[j + 1] + 29 * d[j + 2]) >> 8; rgb[3 * i] = d[j]; rgb[3 * i + 1] = d[j + 1]; rgb[3 * i + 2] = d[j + 2]; }
      k.vergleich = { g: g, rgb: rgb, w: cv.width, h: cv.height, f: 0.693 * Math.max(cv.width, cv.height), abstand: 0, blattNr: f.blatt, ausReihe: false, modus: 'foto', info: {} };
      const erg = await L.fotoMessen(await lade(f.foto), 'foto');
      if (erg) L.konsens(erg);
      return { ok: !!(erg && erg.ok), breite: erg && Math.round(erg.breite), hoehe: erg && Math.round(erg.hoehe), sicher: erg && erg.massSicher,
        hinten: erg && erg.hinten, zweit: erg && erg.zweitmessung, konsens: erg && erg.konsens };
    }, { f });
    const pz = (a, b) => ((a - b) / b * 100).toFixed(1).replace('.', ',') + ' %';
    const ist = r.sicher ? 'sicher' : 'unsicher';
    console.log(f.name + ': ' + (r.ok ? r.breite + ' × ' + r.hoehe + ' (' + pz(r.breite, f.echt[0]) + ' / ' + pz(r.hoehe, f.echt[1]) + ')' : 'kein Maß') +
      ', Parallaxe ' + (r.hinten ? (r.hinten.ok ? 'ja' : 'nein (' + r.hinten.grund + ')') + (r.hinten.versatz != null ? ', Versatz ' + r.hinten.versatz + ' mm' : '') : 'keine') +
      ', Zweitmessung ' + (r.zweit && r.zweit.ok ? String(r.zweit.abw).replace('.', ',') + ' %' : 'keine') +
      ', Einigkeit ' + (r.konsens ? (r.konsens.einig ? 'ja' : 'nein') + (r.konsens.quelle ? ' (' + r.konsens.quelle + ', ' + String(r.konsens.abw).replace('.', ',') + ' %' + (r.konsens.versatz != null ? ', ' + r.konsens.versatz + ' mm' : '') + ')' : '') : '–') +
      ' → ' + ist + (ist === f.soll ? '' : '  ← SOLL ' + f.soll));
    if (!r.ok) fehler.push(f.name + ': kein Maß');
    else if (ist !== f.soll) fehler.push(f.name + ': ' + ist + ' statt ' + f.soll);
  }
  // (5) ausgedacht: Flügel-Foto mit wirksamem Vergleichsfoto, Zweitmessung 10 % daneben, ein früherer Versuch mit gleichem Maß.
  // Stand die Kamera beim früheren Versuch am selben Platz → nicht einig; 30 cm daneben → einig, sicher.
  for (const [name, frueher, soll] of [['früherer Versuch am selben Platz (ausgedacht)', [0, 0, 2400], 'unsicher'], ['früherer Versuch 30 cm daneben (ausgedacht)', [300, 0, 2400], 'sicher']]) {
    const r = await page.evaluate(({ frueher }) => {
      const L = window.__lotse, k = L.k;
      k.messPool = [{ b: 810, h: 1245, quelle: 'Flügel-Foto', versuch: 1, kamera: frueher }]; k.vonVornZahl = 1;
      const m = { ok: true, breite: 812, hoehe: 1247, massSicher: false, lage: { kamera: [0, 0, 2400] }, hinten: { ok: true, versatz: 600 },
        zweitmessung: { ok: true, breite: 893, hoehe: 1247, abw: 10, kamera: [0, 0, 1800] } };
      L.konsens(m);
      return { sicher: m.massSicher, konsens: m.konsens };
    }, { frueher });
    const ist = r.sicher ? 'sicher' : 'unsicher';
    console.log(name + ': Einigkeit ' + (r.konsens.einig ? 'ja' : 'nein') + ' (' + r.konsens.quelle + ', ' + String(r.konsens.abw).replace('.', ',') + ' %, ' + r.konsens.versatz + ' mm) → ' + ist + (ist === soll ? '' : '  ← SOLL ' + soll));
    if (ist !== soll) fehler.push(name + ': ' + ist + ' statt ' + soll);
  }
  await browser.close();
  console.log(fehler.length ? '\nFEHLER:\n- ' + fehler.join('\n- ') : '\nStehen-Test bestanden: vom selben Platz nie sicher, mit echtem Vergleichsfoto weiter sicher.');
  process.exit(fehler.length ? 1 : 0);
})();
