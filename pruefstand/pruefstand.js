// Prüfstand: lässt den aktuellen Foto-Lotsen über alle Lernfotos laufen und vergleicht mit den echten Maßen.
// Aufruf:  node pruefstand/pruefstand.js <Pfad zu foto-lotse-daten> [Ausgabeordner]
// Braucht Playwright (Chromium). Die Fotos bleiben lokal, ins öffentliche Repo kommt nur dieser Code.
// Echte Maße: fenster.json im Fensterordner, sonst pruefstand/nachtrag.json (für Ordner von vor dem Knopf „Fenster fertig“).
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const DATEN = path.resolve(process.argv[2] || '../foto-lotse-daten');
const AUS = path.resolve(process.argv[3] || '/tmp/pruefstand');
const LOTSE = path.resolve(__dirname, '..');
const NACHTRAG = JSON.parse(fs.readFileSync(path.join(__dirname, 'nachtrag.json'), 'utf8'));

function wahrheit(ordner) {
  const f = path.join(DATEN, 'fenster', ordner, 'fenster.json');
  const w = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')).fenster : {};
  return Object.assign({}, NACHTRAG[ordner] || {}, Object.fromEntries(Object.entries(w).filter(([, v]) => v !== null && v !== '')));
}
const TYPEN = { kasten: { fs: 45, fu: 55, tiefe: 30 }, verbund: { fs: 50, fu: 60, tiefe: 35 }, holz: { fs: 65, fu: 75, tiefe: 40 },
  kunststoff: { fs: 70, fu: 70, tiefe: 40 }, alu: { fs: 70, fu: 70, tiefe: 40 } };

(async () => {
  fs.mkdirSync(AUS, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  // Lotse und Fotos direkt von der Platte ausliefern
  await page.route('http://lotse.test/**', (route) => {
    const u = new URL(route.request().url());
    const p = u.pathname.startsWith('/_daten/') ? path.join(DATEN, decodeURIComponent(u.pathname.slice(8))) : path.join(LOTSE, decodeURIComponent(u.pathname));
    if (!fs.existsSync(p)) return route.fulfill({ status: 404, body: '' });
    const typ = p.endsWith('.html') ? 'text/html' : p.endsWith('.js') ? 'text/javascript' : p.endsWith('.jpg') ? 'image/jpeg' : 'application/octet-stream';
    route.fulfill({ status: 200, body: fs.readFileSync(p), contentType: typ });
  });
  await page.goto('http://lotse.test/index.html?test');

  const zeilen = [];
  const ordnerListe = fs.readdirSync(path.join(DATEN, 'fenster')).filter((o) => fs.statSync(path.join(DATEN, 'fenster', o)).isDirectory()).sort();
  for (const ordner of ordnerListe) {
    const w = wahrheit(ordner);
    const opt = Object.assign({ griff: true }, TYPEN[w.bauart] || TYPEN.holz);
    const fotos = fs.readdirSync(path.join(DATEN, 'fenster', ordner)).filter((f) => /^(foto|lauf)-.*\.jpg$/.test(f)).sort();
    for (const foto of fotos) {
      const r = await page.evaluate(async ({ url, opt }) => {
        const L = window.__lotse, img = new Image(); img.src = url; await img.decode();
        const q = Math.min(1, 2576 / Math.max(img.naturalWidth, img.naturalHeight));
        const cv = document.createElement('canvas'); cv.width = Math.round(img.naturalWidth * q); cv.height = Math.round(img.naturalHeight * q);
        const c = cv.getContext('2d', { willReadFrequently: true }); c.drawImage(img, 0, 0, cv.width, cv.height);
        const d = c.getImageData(0, 0, cv.width, cv.height).data, g = new Uint8Array(cv.width * cv.height);
        for (let i = 0, j = 0; i < g.length; i++, j += 4) g[i] = (77 * d[j] + 150 * d[j + 1] + 29 * d[j + 2]) >> 8;
        const t0 = performance.now();
        const e = L.MASS.messen(g, cv.width, cv.height, 0.693 * Math.max(cv.width, cv.height), opt, false);
        const ms = Math.round(performance.now() - t0);
        // Bild mit dem, was der Lotse erkannt hat (grün Flügel, rot gestrichelt Glas)
        if (e.ecken) {
          c.lineWidth = Math.max(3, cv.width / 400); c.strokeStyle = '#00e060';
          c.beginPath(); e.ecken.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); c.stroke();
          if (e.roh && e.roh.glas && e.lage) {
            const gl = e.roh.glas, ab = (x, y) => L.MASS.abb(e.lage.H, x, y);
            c.strokeStyle = '#ff3030'; c.setLineDash([16, 10]);
            c.beginPath(); [[gl[0], gl[1]], [gl[2], gl[1]], [gl[2], gl[3]], [gl[0], gl[3]]].map((q) => ab(q[0], q[1])).forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); c.stroke();
          }
        }
        const k = document.createElement('canvas'); k.width = Math.round(cv.width / 3); k.height = Math.round(cv.height / 3);
        k.getContext('2d').drawImage(cv, 0, 0, k.width, k.height);
        return { marker: e.marker, abstand: e.lage ? Math.round(e.ok ? e.abstand : e.lage.z) : null, ok: !!e.ok, breite: e.ok ? Math.round(e.breite) : null,
          hoehe: e.ok ? Math.round(e.hoehe) : null, stimmig: e.sicher, griff: e.griff ? { seite: e.griff.seite, sicher: e.griff.sicher } : null, ms,
          bild: k.toDataURL('image/jpeg', 0.7) };
      }, { url: 'http://lotse.test/_daten/fenster/' + ordner + '/' + foto, opt });
      fs.writeFileSync(path.join(AUS, ordner + '__' + foto), Buffer.from(r.bild.split(',')[1], 'base64'));
      const fb = r.breite && w.fluegelBreiteMm ? (r.breite - w.fluegelBreiteMm) / w.fluegelBreiteMm : null;
      const fh = r.hoehe && w.fluegelHoeheMm ? (r.hoehe - w.fluegelHoeheMm) / w.fluegelHoeheMm : null;
      const griffEcht = w.griff === 'links' ? 'l' : w.griff === 'rechts' ? 'r' : null;
      zeilen.push({ ordner, name: w.name || '', foto, echt: w.fluegelBreiteMm ? w.fluegelBreiteMm + ' × ' + w.fluegelHoeheMm : '?',
        lotse: r.ok ? r.breite + ' × ' + r.hoehe : 'kein Maß', fb, fh, marker: r.marker, abstand: r.abstand, stimmig: r.stimmig,
        griff: r.griff ? (r.griff.seite === griffEcht ? 'richtig' : griffEcht ? 'FALSCH' : r.griff.seite) + (r.griff.sicher ? ' (sicher)' : '') : '–', ms: r.ms });
      process.stdout.write('.');
    }
  }
  await browser.close();

  const pz = (x) => (x === null ? '–' : (x >= 0 ? '+' : '') + (x * 100).toFixed(1) + ' %');
  const gut = zeilen.filter((z) => z.fb !== null && Math.abs(z.fb) <= 0.02 && Math.abs(z.fh) <= 0.02).length;
  const mitMass = zeilen.filter((z) => z.echt !== '?').length;
  let md = '# Prüfstand Foto-Lotse\n\n' + new Date().toISOString().slice(0, 16).replace('T', ' ') + ' · ' + zeilen.length + ' Fotos aus ' +
    new Set(zeilen.map((z) => z.ordner)).size + ' Fenstern · **' + gut + ' von ' + mitMass + '** Fotos mit echtem Maß auf ±2 % genau\n\n' +
    '| Fenster | Foto | echt (mm) | Lotse (mm) | Breite | Höhe | Marker | Abstand | stimmig | Griff | ms |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n';
  zeilen.forEach((z) => { md += `| ${z.name || z.ordner} | ${z.foto} | ${z.echt} | ${z.lotse} | ${pz(z.fb)} | ${pz(z.fh)} | ${z.marker} | ${z.abstand ? (z.abstand / 1000).toFixed(2) + ' m' : '–'} | ${z.stimmig === undefined ? '–' : z.stimmig ? 'ja' : 'nein'} | ${z.griff} | ${z.ms} |\n`; });
  fs.writeFileSync(path.join(AUS, 'ergebnis.md'), md);
  fs.writeFileSync(path.join(AUS, 'ergebnis.json'), JSON.stringify(zeilen, null, 2));
  console.log('\n' + md);
})();
