#!/usr/bin/env node
// Gesamtfoto-Rahmen-Test (v3.41, Fable G6): echte Läufe mit 2 Flügeln nebeneinander. Die Flügel-Fotos werden wie in der App gemessen
// (fotoMessen, mit ihrem Vergleichsfoto), dann das Gesamtfoto (nurLage) und gesamtZusammen. Gemessen wird die „Stufe“ zwischen den beiden
// grünen Rahmen in der Mitte: wie weit liegen Oberkante (bzw. Unterkante) des linken Rahmens an seiner rechten Ecke und des rechten Rahmens
// an seiner linken Ecke senkrecht auseinander, im Bild (so sieht es der Kunde), in mm über die Höhe der Rahmen dort. Beide Flügel sind gleich hoch,
// also soll die Stufe nahe 0 sein. Verglichen: wie bis v3.40 (jeder Rahmen über sein eigenes Blatt) und v3.41 (gemeinsame Ebene aus allen
// Blättern, Schräge je Blatt aus dem Flügel-Foto). BILD=<Ordner> speichert je Lauf ein Bild (rot bis v3.40, grün v3.41).
// Aufruf: node pruefstand/gesamtrahmen.js <Pfad zu foto-lotse-daten> [Pfad zum Lotsen] [Ordner …]. Dauert ca. 1–2 min.
const fs = require('fs'), path = require('path');
const { chromium, devices } = require('playwright');
const DATEN = path.resolve(process.argv[2] || '/home/claude/foto-lotse-daten'), LOTSE = path.resolve(process.argv[3] || path.join(__dirname, '..'));
const BILD = process.env.BILD || null;
const TOL_STUFE = 25;   // mm   // Ordner: dort je Lauf ein Bild (rot ohne, grün mit Drehung)
const ORDNER = process.argv.slice(4).length ? process.argv.slice(4) : ['2026-11-10_1249_fenster', '2026-11-10_1252_fenster', '2026-11-10_1359_fenster', '2026-11-11_1226_fenster'];
function lauf(ordner) {
  const dir = path.join(DATEN, 'fenster', ordner), dateien = fs.readdirSync(dir);
  const finde = (re) => dateien.filter((d) => re.test(d) && d.endsWith('.jpg'))[0] || null;
  const blatt = (jpg) => { try { return JSON.parse(fs.readFileSync(path.join(dir, jpg.replace(/\.jpg$/, '.json')), 'utf8')).blatt; } catch (e) { return null; } };
  const fl = [1, 2].map((n) => { const foto = finde(new RegExp('^lauf-\\d+-fl' + n + '\\.jpg$')), v = finde(new RegExp('^lauf-\\d+-fl' + n + '-v\\.jpg$'));
    return foto ? { id: 'fl' + n, foto: ordner + '/' + foto, vergl: v ? ordner + '/' + v : null, blatt: blatt(foto) } : null; }).filter(Boolean);
  const innen = finde(/^lauf-\d+-innen\.jpg$/);
  return { ordner, fl, innen: innen ? ordner + '/' + innen : null };
}
(async () => {
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
  if (!(await page.evaluate(() => typeof window.__lotse.gesamtZusammen === 'function'))) { console.log('Lotse ohne __lotse.gesamtZusammen (vor v3.41)'); process.exit(2); }
  for (const o of ORDNER) {
    const L0 = lauf(o);
    if (L0.fl.length !== 2 || !L0.innen || L0.fl.some((q) => q.blatt == null)) { console.log(o + ': kein Lauf mit 2 Flügel-Fotos und Gesamtfoto'); continue; }
    const r = await page.evaluate(async ({ L0 }) => {
      const L = window.__lotse, k = L.k, MASS = L.MASS, fotos = L.fotos();
      const lade = async (u) => {
        const img = new Image(); img.src = 'http://lotse.test/_daten/fenster/' + u; await img.decode();
        const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
        cv.getContext('2d', { willReadFrequently: true }).drawImage(img, 0, 0);
        return cv;
      };
      const vergleich = async (u, nr) => {
        const cv = await lade(u), d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
        const g = new Uint8Array(cv.width * cv.height), rgb = new Uint8Array(cv.width * cv.height * 3);
        for (let i = 0, j = 0; i < g.length; i++, j += 4) { g[i] = (77 * d[j] + 150 * d[j + 1] + 29 * d[j + 2]) >> 8; rgb[3 * i] = d[j]; rgb[3 * i + 1] = d[j + 1]; rgb[3 * i + 2] = d[j + 2]; }
        return { g, rgb, w: cv.width, h: cv.height, f: 0.693 * Math.max(cv.width, cv.height), abstand: 0, blattNr: nr, ausReihe: false, modus: 'foto', info: {} };
      };
      const fl = [];
      k.i = 0;   // Schritt fl1: fotoMessen misst nur das gelesene Blatt (k.blattNr)
      for (const q of L0.fl) {
        k.blattNr = q.blatt - 1;
        k.vergleich = q.vergl ? await vergleich(q.vergl, q.blatt - 1) : null;
        const m = await L.fotoMessen(await lade(q.foto), 'foto');
        if (!m || !m.ok || !m.roh) return { fehler: q.id + ': kein Maß' };
        const rel = m.roh.fluegel.map((x, j) => Math.round(x - (j % 2 ? MASS.MB.h : MASS.MB.b) / 2));
        fl.push({ id: q.id, blatt: q.blatt, breite: Math.round(m.breite), hoehe: Math.round(m.hoehe), rel, drehung: m.drehung || 0, ausr: m.ausrichtung, schief: (m.ausrichtung && typeof m.ausrichtung.phi === 'number' && (m.ausrichtung.einig || 0) >= 3) ? (m.ausrichtung.viertel || 0) * 90 + m.ausrichtung.phi : (m.drehung || 0) });
      }
      k.vergleich = null; k.blattNr = null;
      k.i = 2;   // Schritt innen = Gesamtfoto
      const roh = await L.fotoMessen(await lade(L0.innen), 'foto');
      if (!roh || !roh.lage) return { fehler: 'Gesamtfoto ohne Blatt' };
      const inv = (m) => { const [a, b, c] = m[0], [d, e, f] = m[1], [g, h, i] = m[2], A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g, det = a * A + b * B + c * C;
        return [[A / det, -(b * i - c * h) / det, (b * f - c * e) / det], [B / det, (a * i - c * g) / det, -(a * f - c * d) / det], [C / det, -(a * h - b * g) / det, (a * e - b * d) / det]]; };
      const Hi = inv(roh.lage.H);
      const cx = MASS.MB.b / 2, cy = MASS.MB.h / 2;
      // wie bis v3.40: jeder Rahmen über das ungedrehte eigene Blatt (b.H), ohne Drehung
      const wieAlt = () => ({ fluegel: fl.map((q) => { const b = (roh.blaetter || []).filter((x) => x.nr === q.blatt - 1)[0], r = q.rel;
        return b ? { ok: true, hoehe: q.hoehe, ecken: [[cx + r[0], cy + r[1]], [cx + r[2], cy + r[1]], [cx + r[2], cy + r[3]], [cx + r[0], cy + r[3]]].map((p) => MASS.abb(b.H, p[0], p[1])) } : { ok: false }; }) });
      const auswerten = (mitDrehung) => {
        fl.forEach((q) => { fotos[q.id] = { mass: { breite: q.breite, hoehe: q.hoehe, rel: q.rel, blattNr: q.blatt - 1, blatt: q.blatt, sicher: true, drehung: mitDrehung ? q.drehung : 0, schief: mitDrehung ? q.schief : 0 } }; });
        return stufe(L.gesamtZusammen(roh));
      };
      const stufe = (e) => {
        const ok = e.fluegel.filter((q) => q.ok && q.ecken);
        if (ok.length !== 2) return { fehler: 'nur ' + ok.length + ' Rahmen' };
        // Im Bild (so sieht es der Kunde): senkrechter Abstand der Ecken in der Mitte, in mm über die Höhe der beiden Rahmen dort
        const [qa, qb] = ok[0].ecken[0][0] < ok[1].ecken[0][0] ? ok : [ok[1], ok[0]];
        const li = qa.ecken, re = qb.ecken, d = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
        // Ecken: 0 oben links, 1 oben rechts, 2 unten rechts, 3 unten links
        const mmProPx = (qa.hoehe / d(li[1], li[2]) + qb.hoehe / d(re[0], re[3])) / 2;
        return { oben: Math.round((li[1][1] - re[0][1]) * mmProPx), unten: Math.round((li[2][1] - re[3][1]) * mmProPx),
          spalt: Math.round(((re[0][0] + re[3][0]) / 2 - (li[1][0] + li[2][0]) / 2) * mmProPx) };
      };
      const eAlt = wieAlt(), ohne = stufe(eAlt), mit = auswerten(true), eMit = L.gesamtZusammen(roh);
      let bild = null;
      if (L0.bild) {
        const cv = await lade(L0.innen), c = cv.getContext('2d'), lw = Math.max(2, cv.width / 400);
        [[eAlt, '#ff3030'], [eMit, '#30ff60']].forEach(([e, farbe]) => { c.strokeStyle = farbe; c.lineWidth = lw;
          e.fluegel.filter((q) => q.ok && q.ecken).forEach((q) => { c.beginPath(); q.ecken.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.stroke(); }); });
        bild = cv.toDataURL('image/jpeg', 0.85);
      }
      return { ebene: eMit.ebene, fl: fl.map((q) => ({ id: q.id, blatt: q.blatt, mass: q.breite + ' × ' + q.hoehe, drehung: Math.round(q.drehung * 100) / 100, ausr: q.ausr })), ohne, mit, bild,
        blaetter: (roh.blaetter || []).map((b) => ({ blatt: b.blatt, drehung: b.drehung })) };
    }, { L0: Object.assign({}, L0, { bild: !!BILD }) });
    if (BILD && r.bild) { fs.mkdirSync(BILD, { recursive: true }); fs.writeFileSync(path.join(BILD, o + '.jpg'), Buffer.from(r.bild.split(',')[1], 'base64')); }
    if (r.fehler) { console.log(o + ': ' + r.fehler); fehler.push(o + ': ' + r.fehler); continue; }
    const st = (x) => x.fehler ? x.fehler : 'Stufe oben ' + x.oben + ' mm, unten ' + x.unten + ' mm, Spalt ' + x.spalt + ' mm';
    console.log(o + ': ' + r.fl.map((q) => q.id + ' Blatt ' + q.blatt + ' ' + q.mass + ', Drehung ' + String(q.drehung).replace('.', ',') + '°').join(' · '));
    console.log('   Schräge der Blätter (Flügel-Foto): ' + r.fl.map((q) => 'Blatt ' + q.blatt + ' ' + (q.ausr && typeof q.ausr.phi === 'number' ? String(q.ausr.phi).replace('.', ',') + '°' : '–')).join(', '));
    console.log('   wie bis v3.40:            ' + st(r.ohne));
    console.log('   v3.41 (gemeinsame Ebene): ' + st(r.mit) + (r.ebene ? ', Rest ' + String(r.ebene.anteil).replace('.', ',') + ' % der Blattgröße' : ', ohne gemeinsame Ebene'));
    // Bestanden: Stufe höchstens TOL_STUFE mm. Unten zählt nur, wenn beide Flügel-Maße in der Höhe auf 3 % übereinstimmen (sonst ist die
    // Stufe unten ein falsches Maß, kein Zeichenfehler: 1249 und 1252 messen einen Flügel 1385 bzw. 1405 hoch statt 1245)
    const hh = r.fl.map((q) => +q.mass.split(' × ')[1]), gleichHoch = Math.abs(hh[0] - hh[1]) / Math.min(hh[0], hh[1]) <= 0.03;
    if (r.mit.fehler) fehler.push(o + ': ' + r.mit.fehler);
    else if (Math.abs(r.mit.oben) > TOL_STUFE || (gleichHoch && Math.abs(r.mit.unten) > TOL_STUFE)) fehler.push(o + ': Stufe über ' + TOL_STUFE + ' mm');
  }
  await browser.close();
  console.log(fehler.length ? '\nFEHLER:\n- ' + fehler.join('\n- ') : '\nGesamtfoto-Rahmen-Test bestanden: Stufe in der Mitte überall höchstens ' + TOL_STUFE + ' mm (unten nur bei gleich hohen Flügel-Maßen).');
  process.exit(fehler.length ? 1 : 0);
})();
