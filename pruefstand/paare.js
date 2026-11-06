// Paar-Prüfstand (v3.28, Parallaxe „Z 0“): misst jedes Lernfoto einmal allein und einmal mit einem Vergleichsfoto desselben Blatts
// (opt.zweit). Mit Vergleichsfoto sucht der Lotse die Glaskanten nur dort, wo beide Fotos auf der Glasebene übereinstimmen; was dahinter
// liegt (Bäume, Häuser durchs Glas), zählt nicht mehr.
// Vergleichsfoto: im selben Ordner, mit demselben Blatt erkannt, Abstand mind. 0,25 m anders, davon das mit dem kleinsten Unterschied
// (so ähnlich wie in der App: das stille Foto beim Zurückgehen). Gibt es keins mit 0,25 m, das mit dem größten Unterschied.
// Aufruf: node pruefstand/paare.js <Pfad zu foto-lotse-daten> [Ausgabeordner] [--kunde] [--nur <Ordner-Muster, z. B. 2026-11-06_1[89]>]
// Ausgabe: Tabelle je Foto (ohne / mit, Vergleichsfoto, Anteil „dahinter“, Rechenzeit) und Zusammenfassung ±2 % / ±5 %.
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ARGS = process.argv.slice(2);
const nurI = ARGS.indexOf('--nur'), NUR = nurI >= 0 ? ARGS[nurI + 1] : null;
const POS = ARGS.filter((a, i) => !a.startsWith('--') && !(nurI >= 0 && i === nurI + 1));
const KUNDE = ARGS.includes('--kunde');
const DATEN = path.resolve(POS[0] || '../foto-lotse-daten');
const AUS = path.resolve(POS[1] || '/tmp/paare');
const LOTSE = path.resolve(__dirname, '..');
const NACHTRAG = JSON.parse(fs.readFileSync(path.join(__dirname, 'nachtrag.json'), 'utf8'));

function wahrheit(ordner) {
  const f = path.join(DATEN, 'fenster', ordner, 'fenster.json');
  const w = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')).fenster : {};
  return Object.assign({}, Object.fromEntries(Object.entries(w).filter(([, v]) => v !== null && v !== '')), NACHTRAG[ordner] || {});
}
function fuerBlatt(w, blatt) {
  const q = (w.fluegelJeBlatt || []).find((x) => x.blatt === blatt && x.breiteMm && x.hoeheMm);
  return q ? Object.assign({}, w, { fluegelBreiteMm: q.breiteMm, fluegelHoeheMm: q.hoeheMm }) : w;
}
const pz = (x) => (x === null ? '–' : (x >= 0 ? '+' : '') + (x * 100).toFixed(1) + ' %');

(async () => {
  fs.mkdirSync(AUS, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.route('http://lotse.test/**', (route) => {
    const u = new URL(route.request().url());
    const p = u.pathname.startsWith('/_daten/') ? path.join(DATEN, decodeURIComponent(u.pathname.slice(8))) : path.join(LOTSE, decodeURIComponent(u.pathname));
    if (!fs.existsSync(p)) return route.fulfill({ status: 404, body: '' });
    const typ = p.endsWith('.html') ? 'text/html' : p.endsWith('.js') ? 'text/javascript' : p.endsWith('.jpg') ? 'image/jpeg' : 'application/octet-stream';
    route.fulfill({ status: 200, body: fs.readFileSync(p), contentType: typ });
  });
  await page.goto('http://lotse.test/index.html?test');
  const TYPEN = await page.evaluate(() => { const T = window.__lotse.TYPEN, r = {}; Object.keys(T).forEach((k) => { r[k] = { fs: T[k].s * 10, fu: T[k].u * 10, tiefe: T[k].tiefe }; }); return r; });

  // Ein Foto messen, wahlweise mit Vergleichsfoto (url2)
  const messe = (url, opt, url2) => page.evaluate(async ({ url, opt, url2 }) => {
    const L = window.__lotse;
    const lade = async (u, mitRgb) => {
      const img = new Image(); img.src = u; await img.decode();
      const q = Math.min(1, 2576 / Math.max(img.naturalWidth, img.naturalHeight));
      const cv = document.createElement('canvas'); cv.width = Math.round(img.naturalWidth * q); cv.height = Math.round(img.naturalHeight * q);
      const c = cv.getContext('2d', { willReadFrequently: true }); c.drawImage(img, 0, 0, cv.width, cv.height);
      const d = c.getImageData(0, 0, cv.width, cv.height).data, g = new Uint8Array(cv.width * cv.height), rgb = mitRgb ? new Uint8Array(cv.width * cv.height * 3) : null;
      for (let i = 0, j = 0; i < g.length; i++, j += 4) { g[i] = (77 * d[j] + 150 * d[j + 1] + 29 * d[j + 2]) >> 8; if (rgb) { rgb[3 * i] = d[j]; rgb[3 * i + 1] = d[j + 1]; rgb[3 * i + 2] = d[j + 2]; } }
      return { g, w: cv.width, h: cv.height, f: 0.693 * Math.max(cv.width, cv.height), rgb };
    };
    const a = await lade(url, true), o = Object.assign({ v3: true }, opt);
    if (url2) { const b = await lade(url2, false); o.zweit = { g: b.g, w: b.w, h: b.h, f: b.f }; }
    const t0 = performance.now();
    const e = L.MASS.messen(a.g, a.w, a.h, a.f, o, false, a.rgb);
    return { ok: !!e.ok, breite: e.ok ? Math.round(e.breite) : null, hoehe: e.ok ? Math.round(e.hoehe) : null, sicher: e.massSicher,
      abstand: e.lage ? Math.round(e.ok ? e.abstand : e.lage.z) : null, blatt: e.blaetter && e.blaetter[0] ? e.blaetter[0].blatt : null,
      mehr: !!e.fluegel, hinten: e.hinten || null, ms: Math.round(performance.now() - t0) };
  }, { url, opt, url2 });

  const zeilen = [];
  const ordnerListe = fs.readdirSync(path.join(DATEN, 'fenster')).filter((o) => fs.statSync(path.join(DATEN, 'fenster', o)).isDirectory() && (!NUR || new RegExp(NUR).test(o))).sort();
  for (const ordner of ordnerListe) {
    const w = wahrheit(ordner);
    if (w.ignorieren) continue;
    const nU = w.fluegelAnzahl || 1;
    const opt = Object.assign({ griff: false, nU }, KUNDE ? TYPEN.holz : TYPEN[w.bauart] || TYPEN.holz);
    const fotos = fs.readdirSync(path.join(DATEN, 'fenster', ordner)).filter((f) => /^(foto|lauf)-.*\.jpg$/.test(f)).sort();
    // 1. Durchgang: jedes Foto allein (Blatt, Abstand, Maß ohne Vergleich)
    const liste = [];
    for (const foto of fotos) {
      const fj = path.join(DATEN, 'fenster', ordner, foto.replace(/\.jpg$/, '.json'));
      const lauf = /^lauf-/.test(foto) && fs.existsSync(fj) ? JSON.parse(fs.readFileSync(fj, 'utf8')) : null;
      const blattNr = lauf && lauf.blatt ? lauf.blatt - 1 : null;
      const o = blattNr !== null ? Object.assign({}, opt, { blattNr }) : opt;
      const url = 'http://lotse.test/_daten/fenster/' + ordner + '/' + foto;
      const r = await messe(url, o, null);
      liste.push({ foto, url, o, r });
      process.stdout.write('.');
    }
    // 2. Durchgang: mit Vergleichsfoto (gleiches Blatt, nur Fotos, auf denen genau ein Blatt gemessen wurde)
    for (const p of liste) {
      if (!p.r.blatt || p.r.mehr || !p.r.abstand) continue;
      const kand = liste.filter((q) => q !== p && q.r.abstand && (q.r.blatt === p.r.blatt || (q.r.mehr && false)));
      if (!kand.length) continue;
      const d = (q) => Math.abs(q.r.abstand - p.r.abstand);
      const weit = kand.filter((q) => d(q) >= 250).sort((x, y) => d(x) - d(y));
      const ref = weit[0] || kand.sort((x, y) => d(y) - d(x))[0];
      const m = await messe(p.url, Object.assign({}, p.o, { blattNr: p.r.blatt - 1 }), ref.url);
      const wf = fuerBlatt(w, p.r.blatt);
      const fehl = (r) => (r.ok && wf.fluegelBreiteMm ? [(r.breite - wf.fluegelBreiteMm) / wf.fluegelBreiteMm, (r.hoehe - wf.fluegelHoeheMm) / wf.fluegelHoeheMm] : null);
      zeilen.push({ ordner, foto: p.foto, ref: ref.foto, blatt: p.r.blatt, abstand: p.r.abstand, refAbstand: ref.r.abstand,
        echt: wf.fluegelBreiteMm ? wf.fluegelBreiteMm + ' × ' + wf.fluegelHoeheMm : '?', ohne: p.r, mit: m, fOhne: fehl(p.r), fMit: fehl(m) });
      process.stdout.write('+');
    }
  }
  await browser.close();
  const gut = (f, t) => f && Math.abs(f[0]) <= t && Math.abs(f[1]) <= t;
  const mitEcht = zeilen.filter((z) => z.echt !== '?');
  const zahl = (key, t) => mitEcht.filter((z) => gut(z[key], t)).length;
  const kopf = '# Paar-Prüfstand (Parallaxe)\n\n' + new Date().toISOString().slice(0, 16).replace('T', ' ') + ' · ' + (KUNDE ? 'wie der Kunde (Holz)' : 'Bauart aus der Wahrheit') +
    ' · ' + mitEcht.length + ' Fotos mit Vergleichsfoto und echtem Maß\n\n' +
    '**ohne Vergleich: ' + zahl('fOhne', 0.02) + ' auf ±2 %, ' + zahl('fOhne', 0.05) + ' auf ±5 %** · **mit Vergleich: ' + zahl('fMit', 0.02) + ' auf ±2 %, ' + zahl('fMit', 0.05) + ' auf ±5 %**\n\n' +
    'besser (größerer Fehler kleiner um > 0,5 Punkte): ' + mitEcht.filter((z) => z.fOhne && z.fMit && Math.max(...z.fMit.map(Math.abs)) < Math.max(...z.fOhne.map(Math.abs)) - 0.005).length +
    ', schlechter: ' + mitEcht.filter((z) => z.fOhne && z.fMit && Math.max(...z.fMit.map(Math.abs)) > Math.max(...z.fOhne.map(Math.abs)) + 0.005).length +
    ', Maß neu: ' + mitEcht.filter((z) => !z.fOhne && z.fMit).length + ', Maß weg: ' + mitEcht.filter((z) => z.fOhne && !z.fMit).length + '\n\n';
  const tab = '| Ordner | Foto | Blatt | Abstand | Vergleich (Abstand) | echt | ohne | mit | dahinter | ms |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n' +
    zeilen.map((z) => '| ' + z.ordner.slice(0, 15) + ' | ' + z.foto + ' | ' + z.blatt + ' | ' + (z.abstand / 1000).toFixed(2) + ' m | ' + z.ref + ' (' + (z.refAbstand / 1000).toFixed(2) + ' m) | ' + z.echt +
      ' | ' + (z.ohne.ok ? z.ohne.breite + '×' + z.ohne.hoehe + (z.fOhne ? ' (' + pz(z.fOhne[0]) + ' / ' + pz(z.fOhne[1]) + ')' : '') : 'kein Maß') +
      ' | ' + (z.mit.ok ? z.mit.breite + '×' + z.mit.hoehe + (z.fMit ? ' (' + pz(z.fMit[0]) + ' / ' + pz(z.fMit[1]) + ')' : '') : 'kein Maß') +
      ' | ' + (z.mit.hinten ? (z.mit.hinten.ok ? z.mit.hinten.anteil + ' %' : z.mit.hinten.grund) : '–') + ' | ' + z.mit.ms + ' |').join('\n') + '\n';
  fs.writeFileSync(path.join(AUS, 'paare.md'), kopf + tab);
  fs.writeFileSync(path.join(AUS, 'paare.json'), JSON.stringify(zeilen.map((z) => Object.assign({}, z, { ohne: Object.assign({}, z.ohne), mit: Object.assign({}, z.mit) })), null, 1));
  console.log('\n' + kopf + tab);
})();
