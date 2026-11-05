// Prüfstand: lässt den aktuellen Foto-Lotsen über alle Lernfotos laufen und vergleicht mit den echten Maßen.
// Aufruf:  node pruefstand/pruefstand.js <Pfad zu foto-lotse-daten> [Ausgabeordner] [--kunde | --kunde1]
//   ohne Schalter: Bauart und Flügelanzahl aus der Wahrheit (zeigt, was die Erkennung kann)
//   --kunde:  wie der Kunde ab v3.4: Bauart immer Holz (der Kunde wählt keine), Flügelanzahl wie beantwortet (= Wahrheit)
//   --kunde1: wie die App bis v3.3: Bauart Holz, immer 1 Flügel
// Braucht Playwright (Chromium). Die Fotos bleiben lokal, ins öffentliche Repo kommt nur dieser Code.
// Echte Maße: fenster.json im Fensterordner, sonst pruefstand/nachtrag.json (für Ordner von vor dem Knopf „Fenster fertig“).
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ARGS = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const MODUS = process.argv.includes('--kunde1') ? 'kunde1' : process.argv.includes('--kunde') ? 'kunde' : 'wahrheit';
const DATEN = path.resolve(ARGS[0] || '../foto-lotse-daten');
const AUS = path.resolve(ARGS[1] || '/tmp/pruefstand');
const LOTSE = path.resolve(__dirname, '..');
const NACHTRAG = JSON.parse(fs.readFileSync(path.join(__dirname, 'nachtrag.json'), 'utf8'));

// Ab 2 Flügeln (v3.18) kann fenster.json je Blatt ein eigenes echtes Maß haben (fluegelJeBlatt). Für ein Foto zählt dann das Maß
// des Flügels, dessen Blatt der Lotse gemessen hat; sonst wie bisher das eine Maß.
function fuerBlatt(w, blatt) {
  const q = (w.fluegelJeBlatt || []).find((x) => x.blatt === blatt && x.breiteMm && x.hoeheMm);
  if (!q) return w;
  return Object.assign({}, w, { fluegelBreiteMm: q.breiteMm, fluegelHoeheMm: q.hoeheMm, rahmenInnenBreiteMm: q.lichtBreiteMm || null, rahmenInnenHoeheMm: q.lichtHoeheMm || null, blattWahrheit: blatt });
}
const pz1 = (x) => (x === null ? '–' : (x >= 0 ? '+' : '') + (x * 100).toFixed(1) + ' %');
function wahrheit(ordner) {
  const f = path.join(DATEN, 'fenster', ordner, 'fenster.json');
  const w = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')).fenster : {};
  // Nachtrag ergänzt fehlende Angaben und korrigiert falsche (er gewinnt gegen fenster.json)
  return Object.assign({}, Object.fromEntries(Object.entries(w).filter(([, v]) => v !== null && v !== '')), NACHTRAG[ordner] || {});
}

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
  // Holzbreiten je Bauart aus dem Lotsen selbst (TYPEN in index.html, cm → mm), damit sie nur an einer Stelle stehen
  const TYPEN = await page.evaluate(() => { const T = window.__lotse.TYPEN, r = {}; Object.keys(T).forEach((k) => { r[k] = { fs: T[k].s * 10, fu: T[k].u * 10, tiefe: T[k].tiefe }; }); return r; });

  const zeilen = [];
  const ordnerListe = fs.readdirSync(path.join(DATEN, 'fenster')).filter((o) => fs.statSync(path.join(DATEN, 'fenster', o)).isDirectory()).sort();
  for (const ordner of ordnerListe) {
    const w = wahrheit(ordner);
    if (w.ignorieren) continue;
    // Griff wie in der App nur bei 1 Flügel suchen (bei 2 Flügeln sitzt er in der Mitte, links/rechts wäre Zufall)
    const nU = MODUS === 'kunde1' ? 1 : w.fluegelAnzahl || 1;
    const opt = Object.assign({ griff: nU === 1, nU }, MODUS === 'wahrheit' ? TYPEN[w.bauart] || TYPEN.holz : TYPEN.holz);
    const fotos = fs.readdirSync(path.join(DATEN, 'fenster', ordner)).filter((f) => /^(foto|lauf)-.*\.jpg$/.test(f)).sort();
    for (const foto of fotos) {
      // Flügel-Foto aus der Analyse (v3.17, lauf-…-fl1): die App hat nur das gelesene Blatt gemessen, der Prüfstand auch
      const fj = path.join(DATEN, 'fenster', ordner, foto.replace(/\.jpg$/, '.json'));
      const lauf = /^lauf-/.test(foto) && fs.existsSync(fj) ? JSON.parse(fs.readFileSync(fj, 'utf8')) : null;
      const optFoto = lauf && /^fl\d$/.test(lauf.schritt || '') && lauf.blatt ? Object.assign({}, opt, { blattNr: lauf.blatt - 1 }) : opt;
      const r = await page.evaluate(async ({ url, opt }) => {
        const L = window.__lotse, img = new Image(); img.src = url; await img.decode();
        const q = Math.min(1, 2576 / Math.max(img.naturalWidth, img.naturalHeight));
        const cv = document.createElement('canvas'); cv.width = Math.round(img.naturalWidth * q); cv.height = Math.round(img.naturalHeight * q);
        const c = cv.getContext('2d', { willReadFrequently: true }); c.drawImage(img, 0, 0, cv.width, cv.height);
        const d = c.getImageData(0, 0, cv.width, cv.height).data, g = new Uint8Array(cv.width * cv.height);
        const rgb = new Uint8Array(cv.width * cv.height * 3);
        for (let i = 0, j = 0; i < g.length; i++, j += 4) { g[i] = (77 * d[j] + 150 * d[j + 1] + 29 * d[j + 2]) >> 8; rgb[3 * i] = d[j]; rgb[3 * i + 1] = d[j + 1]; rgb[3 * i + 2] = d[j + 2]; }
        const f = 0.693 * Math.max(cv.width, cv.height);
        const t0 = performance.now();
        const e = L.MASS.messen(g, cv.width, cv.height, f, Object.assign({ v3: true }, opt), false, rgb);
        const ms = Math.round(performance.now() - t0);
        // Bild mit dem, was der Lotse erkannt hat (grün Flügel, rot gestrichelt Glas)
        if (e.ecken) {
          c.lineWidth = Math.max(3, cv.width / 400); c.strokeStyle = '#00e060';
          // Mehrere Maßblätter (v3.14): ein Rahmen je Flügel
          (e.fluegel ? e.fluegel.filter((q) => q.ok).map((q) => q.ecken) : [e.ecken]).forEach((pk) => { c.beginPath(); pk.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); c.stroke(); });
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
        const glMm = e.roh && e.roh.glas ? [Math.round(e.roh.glas[2] - e.roh.glas[0]), Math.round(e.roh.glas[3] - e.roh.glas[1])] : null;
        const holz = e.roh && e.roh.holz ? e.roh.holz.map(Math.round) : null;
        return { glMm, holz, gesp: (e.spiegelVorschlag || '') + (e.gespiegelt ? ' → ' + e.gespiegelt : '') + (e.amEnde && /[ou]/.test(e.amEnde) ? ' · Ende ' + e.amEnde : '') + (e.vorlage ? ' · Vorlage ' + e.vorlage.seite + ' ' + e.vorlage.breite + ' (' + e.vorlage.geaendert + ')' : ''), geoF: gf ? { w: gf.winkel, d: gf.diagonalenMm, dd: gf.diagonalenDiffMm, b: gf.breiteMm, h: gf.hoeheMm } : null, geoG: gg ? { w: gg.winkel, dd: gg.diagonalenDiffMm } : null,
          sicherM: e.massSicher, marker: e.marker, abstand: e.lage ? Math.round(e.ok ? e.abstand : e.lage.z) : null, ok: !!e.ok, breite: e.ok ? Math.round(e.breite) : null,
          hoehe: e.ok ? Math.round(e.hoehe) : null, stimmig: e.sicher, griff: e.griff ? { seite: e.griff.seite, sicher: e.griff.sicher } : null, ms,
          ausr: e.ausrichtung || null, drehung: e.drehung || 0,
          blatt: e.fluegel ? ((e.fluegel.find((q) => q.ok) || {}).blatt || null) : e.blaetter && e.blaetter[0] ? e.blaetter[0].blatt : null,
          blaetter: e.blaetter ? e.blaetter.length : null, anordnung: e.anordnung || null, gesamt: e.gesamt ? [Math.round(e.gesamt.breite), Math.round(e.gesamt.hoehe)] : null,
          fluegel: e.fluegel ? e.fluegel.map((q) => ({ blatt: q.blatt, ok: q.ok, b: q.ok ? Math.round(q.breite) : null, h: q.ok ? Math.round(q.hoehe) : null, sicher: q.massSicher })) : null,
          bild: k.toDataURL('image/jpeg', 0.7) };
      }, { url: 'http://lotse.test/_daten/fenster/' + ordner + '/' + foto, opt: optFoto });
      const wf = fuerBlatt(w, r.blatt);
      fs.writeFileSync(path.join(AUS, ordner + '__' + foto), Buffer.from(r.bild.split(',')[1], 'base64'));
      const fb = r.breite && wf.fluegelBreiteMm ? (r.breite - wf.fluegelBreiteMm) / wf.fluegelBreiteMm : null;
      const fh = r.hoehe && wf.fluegelHoeheMm ? (r.hoehe - wf.fluegelHoeheMm) / wf.fluegelHoeheMm : null;
      const griffEcht = wf.griff === 'links' ? 'l' : wf.griff === 'rechts' ? 'r' : null;
      zeilen.push({ ordner, name: wf.name || '', foto, echt: wf.fluegelBreiteMm ? wf.fluegelBreiteMm + ' × ' + wf.fluegelHoeheMm : '?',
        lotse: r.ok ? r.breite + ' × ' + r.hoehe + (r.sicherM === false ? ' (unsicher)' : '') : 'kein Maß', fb, fh, sicherM: r.sicherM,
        geo: r.geoF ? r.geoF.w.map((x) => x.toFixed(1)).join('/') + '° · Diag Δ ' + r.geoF.dd + ' mm' : '–',
        geoGlas: r.geoG ? r.geoG.w.map((x) => x.toFixed(1)).join('/') + '° · Δ ' + r.geoG.dd + ' mm' : '–',
        fbL: r.geoF && wf.fluegelBreiteMm ? (r.geoF.b - wf.fluegelBreiteMm) / wf.fluegelBreiteMm : null, fhL: r.geoF && wf.fluegelHoeheMm ? (r.geoF.h - wf.fluegelHoeheMm) / wf.fluegelHoeheMm : null,
        gesp: (r.gesp || '') + (r.drehung ? ' · gedreht ' + (Math.round(r.drehung * 10) / 10) + '°' : ''), marker: r.marker, ausr: r.ausr, glas: r.glMm, holz: r.holz,
        rahmen: wf.rahmenSichtbarSeitenMm ? [wf.rahmenSichtbarSeitenMm.links, wf.rahmenSichtbarSeitenMm.oben, wf.rahmenSichtbarSeitenMm.rechts, wf.rahmenSichtbarSeitenMm.unten] : wf.rahmenSichtbarMm ? [wf.rahmenSichtbarMm, wf.rahmenSichtbarMm, wf.rahmenSichtbarMm, wf.rahmenSichtbarMm] : null, licht: wf.rahmenInnenBreiteMm ? [wf.rahmenInnenBreiteMm, wf.rahmenInnenHoeheMm] : null,
        gb: r.glMm && wf.rahmenInnenBreiteMm ? (r.glMm[0] - wf.rahmenInnenBreiteMm) / wf.rahmenInnenBreiteMm : null, gh: r.glMm && wf.rahmenInnenHoeheMm ? (r.glMm[1] - wf.rahmenInnenHoeheMm) / wf.rahmenInnenHoeheMm : null, abstand: r.abstand, stimmig: r.stimmig,
        griff: r.griff ? (r.griff.seite === griffEcht ? 'richtig' : griffEcht ? 'FALSCH' : r.griff.seite) + (r.griff.sicher ? ' (sicher)' : '') : '–', ms: r.ms,
        // Mehrere Maßblätter (v3.14): je Flügel gegen das eine echte Maß (Levin misst einen Flügel; gleich große Flügel angenommen)
        blaetter: r.fluegel ? r.blaetter + ' Blätter, ' + r.anordnung + ': ' + r.fluegel.map((q) => 'Blatt ' + q.blatt + ' ' + (q.ok ? q.b + '×' + q.h +
          (fuerBlatt(w, q.blatt).fluegelBreiteMm ? ' (' + pz1((q.b - fuerBlatt(w, q.blatt).fluegelBreiteMm) / fuerBlatt(w, q.blatt).fluegelBreiteMm) + ' / ' + pz1((q.h - fuerBlatt(w, q.blatt).fluegelHoeheMm) / fuerBlatt(w, q.blatt).fluegelHoeheMm) + ')' : '') + (q.sicher ? '' : ' unsicher') : 'kein Maß')).join(' · ') +
          (r.gesamt ? ' · zusammen ' + r.gesamt.join('×') : '') : '' });
      process.stdout.write('.');
    }
  }
  await browser.close();

  const pz = pz1;
  const gut = zeilen.filter((z) => z.fb !== null && Math.abs(z.fb) <= 0.02 && Math.abs(z.fh) <= 0.02).length;
  const sicherOk = zeilen.filter((z) => z.sicherM && z.fb !== null), sicherGut = sicherOk.filter((z) => Math.abs(z.fb) <= 0.05 && Math.abs(z.fh) <= 0.05).length;
  const unsicherSchlecht = zeilen.filter((z) => z.sicherM === false && z.fb !== null && (Math.abs(z.fb) > 0.05 || Math.abs(z.fh) > 0.05)).length, unsicherAlle = zeilen.filter((z) => z.sicherM === false && z.fb !== null).length;
  const gut5 = zeilen.filter((z) => z.fb !== null && Math.abs(z.fb) <= 0.05 && Math.abs(z.fh) <= 0.05).length;
  const med = (a) => { a = a.filter((x) => x !== null).map(Math.abs).sort((p, q) => p - q); return a.length ? (a[Math.floor((a.length - 1) / 2)] * 100).toFixed(1) + ' %' : '–'; };
  const mitMass = zeilen.filter((z) => z.echt !== '?').length;
  const gr = zeilen.filter((z) => z.griff.startsWith('richtig') || z.griff.startsWith('FALSCH'));
  const grRichtig = gr.filter((z) => z.griff.startsWith('richtig')).length, grSicher = gr.filter((z) => z.griff.includes('sicher'));
  const grSicherRichtig = grSicher.filter((z) => z.griff.startsWith('richtig')).length;
  let md = '# Prüfstand Foto-Lotse\n\n' + new Date().toISOString().slice(0, 16).replace('T', ' ') + ' · ' +
    { wahrheit: 'Bauart und Flügel aus der Wahrheit', kunde: 'wie der Kunde (Holz, Flügel wie beantwortet)', kunde1: 'wie die App bis v3.3 (Holz, 1 Flügel)' }[MODUS] + ' · ' + zeilen.length + ' Fotos aus ' +
    new Set(zeilen.map((z) => z.ordner)).size + ' Fenstern · **' + gut + ' von ' + mitMass + '** Fotos mit echtem Maß auf ±2 % genau, **' + gut5 + '** auf ±5 %\n\n' +
    'Maß aus den Geraden (Ecken): Breite ' + med(zeilen.map((z) => z.fbL)) + ', Höhe ' + med(zeilen.map((z) => z.fhL)) + '\n\n' +
    'Mittlere Abweichung (Median über Fotos mit Maß): v3 Breite ' + med(zeilen.map((z) => z.fb)) + ', Höhe ' + med(zeilen.map((z) => z.fh)) +
    '. „kein Maß“ zählt beim Median nicht mit.\n\n' +
    'Glas gegen Lichtmaß (wo bekannt, ' + zeilen.filter((z) => z.gb !== null).length + ' Fotos): Breite ' + med(zeilen.map((z) => z.gb)) + ', Höhe ' + med(zeilen.map((z) => z.gh)) + '\n\n' +
    (() => { const d = [[], [], []]; zeilen.forEach((z) => { if (!z.holz || !z.rahmen || z.fb === null || Math.abs(z.fb) > 0.05 || Math.abs(z.fh) > 0.05) return; [0, 2].forEach((i) => z.rahmen[i] && d[0].push(Math.abs(z.holz[i] - z.rahmen[i]))); if (z.rahmen[1]) d[1].push(Math.abs(z.holz[1] - z.rahmen[1])); if (z.rahmen[3]) d[2].push(Math.abs(z.holz[3] - z.rahmen[3])); });
      const m = (a) => { a.sort((x, y) => x - y); return a.length ? a[(a.length - 1) >> 1] + ' mm' : '–'; };
      return 'Rahmen sichtbar (Glaskante bis Fuge) gegen echt, Fotos auf ±5 %: seitlich ' + m(d[0]) + ' (' + d[0].length + '), oben ' + m(d[1]) + ', unten ' + m(d[2]) + ' (Median der Abweichung)\n\n'; })() +
    'Selbsteinschätzung v3: als sicher gemeldet ' + sicherOk.length + ', davon auf ±5 % ' + sicherGut + ' · als unsicher gemeldet ' + unsicherAlle + ', davon wirklich > 5 % daneben ' + unsicherSchlecht + '\n\n' +
    'Griff (nur 1 Flügel, mit bekannter Seite): richtig ' + grRichtig + ' von ' + gr.length + ' · als sicher gemeldet ' + grSicher.length + ', davon richtig ' + grSicherRichtig + '\n\n' +
    '| Fenster | Foto | echt (mm) | Lotse (mm) | Breite | Höhe | Glas zu Lichtmaß | Marker | Abstand | stimmig | Griff | Ecken Flügel (OL/OR/UR/UL) | Ecken Glas | gespiegelt · Ende | ms | mehrere Blätter |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n';
  zeilen.forEach((z) => { md += `| ${z.name || z.ordner} | ${z.foto} | ${z.echt} | ${z.lotse} | ${pz(z.fb)} | ${pz(z.fh)} | ${z.gb === null ? '–' : pz(z.gb) + ' / ' + pz(z.gh)} | ${z.marker} | ${z.abstand ? (z.abstand / 1000).toFixed(2) + ' m' : '–'} | ${z.stimmig === undefined ? '–' : z.stimmig ? 'ja' : 'nein'} | ${z.griff} | ${z.geo} | ${z.geoGlas} | ${z.gesp} | ${z.ms} | ${z.blaetter || '–'} |\n`; });
  fs.writeFileSync(path.join(AUS, 'ergebnis.md'), md);
  fs.writeFileSync(path.join(AUS, 'ergebnis.json'), JSON.stringify(zeilen, null, 2));
  console.log('\n' + md);
})();
