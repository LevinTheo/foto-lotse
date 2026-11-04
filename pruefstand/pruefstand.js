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
  // Nachtrag ergänzt fehlende Angaben und korrigiert falsche (er gewinnt gegen fenster.json)
  return Object.assign({}, Object.fromEntries(Object.entries(w).filter(([, v]) => v !== null && v !== '')), NACHTRAG[ordner] || {});
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
    if (w.ignorieren) continue;
    const opt = Object.assign({ griff: true, nU: w.fluegelAnzahl || 1 }, TYPEN[w.bauart] || TYPEN.holz);
    const fotos = fs.readdirSync(path.join(DATEN, 'fenster', ordner)).filter((f) => /^(foto|lauf)-.*\.jpg$/.test(f)).sort();
    for (const foto of fotos) {
      const r = await page.evaluate(async ({ url, opt }) => {
        const L = window.__lotse, img = new Image(); img.src = url; await img.decode();
        const q = Math.min(1, 2576 / Math.max(img.naturalWidth, img.naturalHeight));
        const cv = document.createElement('canvas'); cv.width = Math.round(img.naturalWidth * q); cv.height = Math.round(img.naturalHeight * q);
        const c = cv.getContext('2d', { willReadFrequently: true }); c.drawImage(img, 0, 0, cv.width, cv.height);
        const d = c.getImageData(0, 0, cv.width, cv.height).data, g = new Uint8Array(cv.width * cv.height);
        const rgb = new Uint8Array(cv.width * cv.height * 3);
        for (let i = 0, j = 0; i < g.length; i++, j += 4) { g[i] = (77 * d[j] + 150 * d[j + 1] + 29 * d[j + 2]) >> 8; rgb[3 * i] = d[j]; rgb[3 * i + 1] = d[j + 1]; rgb[3 * i + 2] = d[j + 2]; }
        const f = 0.693 * Math.max(cv.width, cv.height);
        const e2 = L.MASS.messen(g, cv.width, cv.height, f, opt, false);   // alte Suche (v2) zum Vergleich
        const t0 = performance.now();
        const e = L.MASS.messen(g, cv.width, cv.height, f, Object.assign({ v3: true }, opt), false, rgb);
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
        const gf = e.geometrie && e.geometrie.fluegel, gg = e.geometrie && e.geometrie.glas;
        if (gf && gf.eckenBild) { c.strokeStyle = '#ffd400'; c.lineWidth = Math.max(2, cv.width / 600); c.setLineDash([]); c.beginPath(); gf.eckenBild.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); c.stroke(); }
        return { spiegel: e.spiegelprobe || null, gesp: (e.spiegelVorschlag || '') + (e.gespiegelt ? ' → ' + e.gespiegelt : ''), geoF: gf ? { w: gf.winkel, d: gf.diagonalenMm, dd: gf.diagonalenDiffMm, b: gf.breiteMm, h: gf.hoeheMm } : null, geoG: gg ? { w: gg.winkel, dd: gg.diagonalenDiffMm } : null, abgl: e.abgeglichen,
          v2: e2.ok ? [Math.round(e2.breite), Math.round(e2.hoehe)] : null, sicherM: e.massSicher, marker: e.marker, abstand: e.lage ? Math.round(e.ok ? e.abstand : e.lage.z) : null, ok: !!e.ok, breite: e.ok ? Math.round(e.breite) : null,
          hoehe: e.ok ? Math.round(e.hoehe) : null, stimmig: e.sicher, griff: e.griff ? { seite: e.griff.seite, sicher: e.griff.sicher } : null, ms,
          bild: k.toDataURL('image/jpeg', 0.7) };
      }, { url: 'http://lotse.test/_daten/fenster/' + ordner + '/' + foto, opt });
      fs.writeFileSync(path.join(AUS, ordner + '__' + foto), Buffer.from(r.bild.split(',')[1], 'base64'));
      const fb = r.breite && w.fluegelBreiteMm ? (r.breite - w.fluegelBreiteMm) / w.fluegelBreiteMm : null;
      const fh = r.hoehe && w.fluegelHoeheMm ? (r.hoehe - w.fluegelHoeheMm) / w.fluegelHoeheMm : null;
      const griffEcht = w.griff === 'links' ? 'l' : w.griff === 'rechts' ? 'r' : null;
      zeilen.push({ ordner, name: w.name || '', foto, echt: w.fluegelBreiteMm ? w.fluegelBreiteMm + ' × ' + w.fluegelHoeheMm : '?',
        lotse: r.ok ? r.breite + ' × ' + r.hoehe + (r.sicherM === false ? ' (unsicher)' : '') : 'kein Maß', fb, fh, sicherM: r.sicherM,
        geo: r.geoF ? r.geoF.w.map((x) => x.toFixed(1)).join('/') + '° · Diag Δ ' + r.geoF.dd + ' mm' : '–',
        geoGlas: r.geoG ? r.geoG.w.map((x) => x.toFixed(1)).join('/') + '° · Δ ' + r.geoG.dd + ' mm' : '–',
        fbL: r.geoF && w.fluegelBreiteMm ? (r.geoF.b - w.fluegelBreiteMm) / w.fluegelBreiteMm : null, fhL: r.geoF && w.fluegelHoeheMm ? (r.geoF.h - w.fluegelHoeheMm) / w.fluegelHoeheMm : null,
        spiegel: r.spiegel ? r.spiegel.oben + '/' + r.spiegel.unten : '–', gesp: r.gesp || '',
        abgl: r.abgl ? r.abgl.map((a) => (a[0] ? 'o' : '') + (a[1] ? 'u' : '')).join(',') : '',
        fb2: r.v2 && w.fluegelBreiteMm ? (r.v2[0] - w.fluegelBreiteMm) / w.fluegelBreiteMm : null, fh2: r.v2 && w.fluegelHoeheMm ? (r.v2[1] - w.fluegelHoeheMm) / w.fluegelHoeheMm : null, marker: r.marker, abstand: r.abstand, stimmig: r.stimmig,
        griff: r.griff ? (r.griff.seite === griffEcht ? 'richtig' : griffEcht ? 'FALSCH' : r.griff.seite) + (r.griff.sicher ? ' (sicher)' : '') : '–', ms: r.ms });
      process.stdout.write('.');
    }
  }
  await browser.close();

  const pz = (x) => (x === null ? '–' : (x >= 0 ? '+' : '') + (x * 100).toFixed(1) + ' %');
  const gut = zeilen.filter((z) => z.fb !== null && Math.abs(z.fb) <= 0.02 && Math.abs(z.fh) <= 0.02).length;
  const sicherOk = zeilen.filter((z) => z.sicherM && z.fb !== null), sicherGut = sicherOk.filter((z) => Math.abs(z.fb) <= 0.05 && Math.abs(z.fh) <= 0.05).length;
  const unsicherSchlecht = zeilen.filter((z) => z.sicherM === false && z.fb !== null && (Math.abs(z.fb) > 0.05 || Math.abs(z.fh) > 0.05)).length, unsicherAlle = zeilen.filter((z) => z.sicherM === false && z.fb !== null).length;
  const gut5 = zeilen.filter((z) => z.fb !== null && Math.abs(z.fb) <= 0.05 && Math.abs(z.fh) <= 0.05).length;
  const gut5v2 = zeilen.filter((z) => z.fb2 !== null && Math.abs(z.fb2) <= 0.05 && Math.abs(z.fh2) <= 0.05).length;
  const med = (a) => { a = a.filter((x) => x !== null).map(Math.abs).sort((p, q) => p - q); return a.length ? (a[Math.floor((a.length - 1) / 2)] * 100).toFixed(1) + ' %' : '–'; };
  const mitMass = zeilen.filter((z) => z.echt !== '?').length;
  let md = '# Prüfstand Foto-Lotse\n\n' + new Date().toISOString().slice(0, 16).replace('T', ' ') + ' · ' + zeilen.length + ' Fotos aus ' +
    new Set(zeilen.map((z) => z.ordner)).size + ' Fenstern · **' + gut + ' von ' + mitMass + '** Fotos mit echtem Maß auf ±2 % genau, **' + gut5 + '** auf ±5 % (alte Suche v2: ' + gut5v2 + ')\n\n' +
    'Maß aus den Geraden (Ecken): Breite ' + med(zeilen.map((z) => z.fbL)) + ', Höhe ' + med(zeilen.map((z) => z.fhL)) + '\n\n' +
    'Mittlere Abweichung (Median über Fotos mit Maß): v3 Breite ' + med(zeilen.map((z) => z.fb)) + ', Höhe ' + med(zeilen.map((z) => z.fh)) +
    ' · v2 Breite ' + med(zeilen.map((z) => z.fb2)) + ', Höhe ' + med(zeilen.map((z) => z.fh2)) + '. „kein Maß“ zählt beim Median nicht mit.\n\n' +
    'Selbsteinschätzung v3: als sicher gemeldet ' + sicherOk.length + ', davon auf ±5 % ' + sicherGut + ' · als unsicher gemeldet ' + unsicherAlle + ', davon wirklich > 5 % daneben ' + unsicherSchlecht + '\n\n' +
    '| Fenster | Foto | echt (mm) | Lotse (mm) | Breite | Höhe | Marker | Abstand | stimmig | Griff | Ecken Flügel (OL/OR/UR/UL) | Ecken Glas | Spiegelprobe oben/unten | gespiegelt | ms |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n';
  zeilen.forEach((z) => { md += `| ${z.name || z.ordner} | ${z.foto} | ${z.echt} | ${z.lotse} | ${pz(z.fb)} | ${pz(z.fh)} | ${z.marker} | ${z.abstand ? (z.abstand / 1000).toFixed(2) + ' m' : '–'} | ${z.stimmig === undefined ? '–' : z.stimmig ? 'ja' : 'nein'} | ${z.griff} | ${z.geo} | ${z.geoGlas} | ${z.spiegel} | ${z.gesp} | ${z.ms} |\n`; });
  fs.writeFileSync(path.join(AUS, 'ergebnis.md'), md);
  fs.writeFileSync(path.join(AUS, 'ergebnis.json'), JSON.stringify(zeilen, null, 2));
  console.log('\n' + md);
})();
