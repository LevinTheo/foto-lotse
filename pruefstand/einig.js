#!/usr/bin/env node
// Einigungs-Test (v3.42, Fable G4): zwei Versuche wie am Handy (erster Versuch, „Nein“, zweiter Versuch), mit demselben Vergleichsfoto wie
// damals. Ist das Flügel-Foto des zweiten Versuchs mit niemandem einig, sein Vergleichsfoto aber mit dem ersten Versuch (anderer Platz),
// soll der Lotse das Maß des Vergleichsfotos nehmen, samt Rahmen, und es sicher nennen.
// (1) SZ 1249 links: 2. Versuch 991 × 1514 (falsch), Vergleichsfoto 815 × 1243, 1. Versuch 806 × 1254 → 815 × 1243 übernehmen;
// (2) SZ 1252 links: am Handy 2. Versuch 1001 × 1378, Vergleichsfoto 805 × 1267, 1. Versuch 811 × 1255. Nachgerechnet misst das Vergleichsfoto
//     aber 805 × 1194 (Foto statt Livebild, siehe Wackeltest), dann ist es mit niemandem einig → darf nicht übernommen werden, bleibt unsicher.
//     Für beide gilt: ist das Ergebnis sicher, muss es auf ±2 % stimmen;
// (3) ausgedacht: Vergleichsfoto mit niemandem einig → eigenes Maß bleibt, unsicher;
// (4) ausgedacht: Vergleichsfoto einig nur mit einer Messung vom selben Platz → nichts übernehmen.
// Aufruf: node pruefstand/einig.js <Pfad zu foto-lotse-daten> [Pfad zum Lotsen]. Dauert ca. 40 s.
const fs = require('fs'), path = require('path');
const { chromium, devices } = require('playwright');
const DATEN = path.resolve(process.argv[2] || '/home/claude/foto-lotse-daten'), LOTSE = path.resolve(process.argv[3] || path.join(__dirname, '..'));
const FALL = [
  { name: 'SZ 1249 links', soll: 'uebernommen', erst: '2026-11-10_1249_fenster/lauf-04-fl1-nein1.jpg', dann: '2026-11-10_1249_fenster/lauf-01-fl1.jpg', vergl: '2026-11-10_1249_fenster/lauf-05-fl1-v.jpg', blatt: 0, echt: [810, 1245] },
  { name: 'SZ 1252 links', soll: 'egal', erst: '2026-11-10_1252_fenster/lauf-05-fl2-nein1.jpg', dann: '2026-11-10_1252_fenster/lauf-02-fl2.jpg', vergl: '2026-11-10_1252_fenster/lauf-07-fl2-v.jpg', blatt: 0, echt: [810, 1245] }
];
(async () => {
  for (const f of FALL) for (const x of [f.erst, f.dann, f.vergl]) if (!fs.existsSync(path.join(DATEN, 'fenster', x))) { console.log('Foto fehlt: ' + x); process.exit(2); }
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
  const pz = (a, b) => ((a - b) / b * 100).toFixed(1).replace('.', ',') + ' %';
  for (const f of FALL) {
    const r = await page.evaluate(async ({ f }) => {
      const L = window.__lotse, k = L.k;
      const lade = async (u) => {
        const img = new Image(); img.src = 'http://lotse.test/_daten/fenster/' + u; await img.decode();
        const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
        cv.getContext('2d', { willReadFrequently: true }).drawImage(img, 0, 0);
        return cv;
      };
      const cv = await lade(f.vergl), d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
      const g = new Uint8Array(cv.width * cv.height), rgb = new Uint8Array(cv.width * cv.height * 3);
      for (let i = 0, j = 0; i < g.length; i++, j += 4) { g[i] = (77 * d[j] + 150 * d[j + 1] + 29 * d[j + 2]) >> 8; rgb[3 * i] = d[j]; rgb[3 * i + 1] = d[j + 1]; rgb[3 * i + 2] = d[j + 2]; }
      k.i = 0; k.blattNr = f.blatt; k.messPool = []; k.vonVornZahl = 0;
      k.vergleich = { g, rgb, w: cv.width, h: cv.height, f: 0.693 * Math.max(cv.width, cv.height), abstand: 0, blattNr: f.blatt, ausReihe: false, modus: 'foto', info: {} };
      const m1 = await L.fotoMessen(await lade(f.erst), 'foto'); L.konsens(m1);
      k.vonVornZahl = 1;
      const m2 = await L.fotoMessen(await lade(f.dann), 'foto'); L.konsens(m2);
      const flaeche = (e) => { let a = 0; for (let i = 0; i < 4; i++) { const p = e[i], q = e[(i + 1) % 4]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a / 2); };
      return { m1: [Math.round(m1.breite), Math.round(m1.hoehe), m1.massSicher], eigen: m2.massEigen || null, m2: [Math.round(m2.breite), Math.round(m2.hoehe), m2.massSicher],
        zweit: m2.zweitmessung && [m2.zweitmessung.breite, m2.zweitmessung.hoehe], konsens: m2.konsens,
        rahmen: m2.ecken ? Math.round(flaeche(m2.ecken)) : null, rel: m2.roh && m2.roh.fluegel && m2.zweitmessung.roh && m2.roh.fluegel === m2.zweitmessung.roh.fluegel };
    }, { f });
    console.log(f.name + ': 1. Versuch ' + r.m1[0] + ' × ' + r.m1[1] + ' · 2. Versuch ' + (r.eigen ? r.eigen.breite + ' × ' + r.eigen.hoehe : r.m2[0] + ' × ' + r.m2[1]) +
      ', Vergleichsfoto ' + (r.zweit ? r.zweit.join(' × ') : '–') + ' → Ergebnis ' + r.m2[0] + ' × ' + r.m2[1] + ' (' + pz(r.m2[0], f.echt[0]) + ' / ' + pz(r.m2[1], f.echt[1]) + '), ' +
      (r.m2[2] ? 'sicher' : 'unsicher') + (r.konsens && r.konsens.uebernommen ? ', übernommen (einig mit ' + r.konsens.quelle + ' Versuch ' + r.konsens.versuch + ', ' + String(r.konsens.abw).replace('.', ',') + ' %, ' + r.konsens.versatz + ' mm)' : ''));
    const ueb = !!(r.konsens && r.konsens.uebernommen), gut = Math.abs(r.m2[0] - f.echt[0]) / f.echt[0] <= 0.02 && Math.abs(r.m2[1] - f.echt[1]) / f.echt[1] <= 0.02;
    if (f.soll === 'uebernommen' && !ueb) fehler.push(f.name + ': nicht übernommen');
    if (r.m2[2] && !gut) fehler.push(f.name + ': sicher, aber nicht auf ±2 %');
    if (ueb && !r.m2[2]) fehler.push(f.name + ': übernommen, aber unsicher');
    if (ueb && !r.rel) fehler.push(f.name + ': Rahmen nicht vom Vergleichsfoto');
  }
  // (3) und (4) ausgedacht
  for (const [name, frueher, soll] of [['Vergleichsfoto mit niemandem einig (ausgedacht)', { b: 700, h: 1100, kamera: [300, 0, 2000] }, 'eigen'],
                                         ['Vergleichsfoto einig nur mit Messung vom selben Platz (ausgedacht)', { b: 812, h: 1247, kamera: [0, 0, 1800] }, 'eigen'],
                                         ['Vergleichsfoto einig mit früherem Versuch 30 cm daneben (ausgedacht)', { b: 812, h: 1247, kamera: [300, 0, 1800] }, 'uebernommen']]) {
    const r = await page.evaluate(({ frueher }) => {
      const L = window.__lotse, k = L.k;
      k.i = 0; k.messPool = [Object.assign({ quelle: 'Flügel-Foto', versuch: 1 }, frueher)]; k.vonVornZahl = 1;
      const H = [[1, 0, 100], [0, 1, 100], [0, 0, 1]];
      const m = { ok: true, breite: 990, hoehe: 1400, massSicher: false, lage: { kamera: [0, 0, 2400], H: H }, hinten: { ok: true, versatz: 600 }, roh: { fluegel: [-300, -400, 690, 1000], glas: null },
        zweitmessung: { ok: true, breite: 810, hoehe: 1245, abw: 18, kamera: [0, 0, 1800], roh: { fluegel: [-200, -450, 610, 795], glas: null } } };
      L.konsens(m);
      return { b: m.breite, h: m.hoehe, sicher: m.massSicher, ueb: !!(m.konsens && m.konsens.uebernommen) };
    }, { frueher });
    const ist = r.ueb ? 'uebernommen' : 'eigen';
    console.log(name + ': ' + r.b + ' × ' + r.h + ', ' + (r.sicher ? 'sicher' : 'unsicher') + ' → ' + ist + (ist === soll ? '' : '  ← SOLL ' + soll));
    if (ist !== soll) fehler.push(name + ': ' + ist + ' statt ' + soll);
    if (ist === 'eigen' && r.sicher) fehler.push(name + ': eigenes Maß, aber sicher');
  }
  await browser.close();
  console.log(fehler.length ? '\nFEHLER:\n- ' + fehler.join('\n- ') : '\nEinigungs-Test bestanden: einig gewinnt, auch gegen das Flügel-Foto; ohne unabhängigen Partner bleibt es beim eigenen Maß; sicher heißt ±2 %.');
  process.exit(fehler.length ? 1 : 0);
})();
