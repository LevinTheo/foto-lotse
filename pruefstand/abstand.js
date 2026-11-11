#!/usr/bin/env node
// Abstand- und Prüfbild-Test (v3.39, Fable G2 und G3), Übungsmodus mit 1 Flügel:
// (1) G3: nach Blatt und Vergleichsfoto steht die Kamera bei ca. 2,9 m vor dem Flügel → „… näher ran“, kein Foto;
// (2) dann bei ca. 2,15 m → Foto kommt;
// (3) G2: im Prüfdialog ist das Bild auf den Rahmen gezoomt (kleiner als das ganze Foto), „Ja“ und „Nein“ sehen gleich aus;
// (4) G3, „wenn es muss“: Kamera 2,0 m, 44 cm seitlich (gerade noch erlaubt), der Flügel stößt links an den Bildrand → der Lotse schickt weiter zurück,
//     auch über 2,3 m hinaus (zMinDyn über 2,1), sobald der Rahmen im Livebild an den Rand stößt.
// Aufruf: node pruefstand/abstand.js [Pfad zum Lotsen, Standard: dieses Repo]. Dauert ca. 60 s.
const fs = require('fs'), path = require('path');
const { chromium, devices } = require('playwright');
const LOTSE = path.resolve(process.argv[2] || path.join(__dirname, '..'));
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext(Object.assign({}, devices['iPhone 13'], { reducedMotion: 'reduce' }))).newPage();
  const fehler = [];
  page.on('pageerror', (e) => fehler.push('Seitenfehler: ' + e.message));
  await page.route('http://lotse.test/**', (route) => {
    const u = new URL(route.request().url()), p = path.join(LOTSE, decodeURIComponent(u.pathname));
    if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) return route.fulfill({ status: 404, body: '' });
    route.fulfill({ status: 200, body: fs.readFileSync(p), contentType: p.endsWith('.html') ? 'text/html' : 'application/octet-stream' });
  });
  await page.goto('http://lotse.test/index.html?test');
  await page.evaluate(() => localStorage.setItem('foto-lotse-entw', JSON.stringify({ reihe: false })));
  await page.goto('http://lotse.test/index.html?test');
  await page.click('#start');
  await page.click('#flu-wahl-1');
  await page.waitForSelector('#kamera:not([hidden])');
  await page.waitForTimeout(500);
  if (await page.isVisible('#k-karte')) await page.click('#k-karte-ok');
  // Kamera auf einen Abstand (m) vor den Flügel stellen, seitlich um dx (Szene-Einheiten = cm) verschoben; zeigenWeiter abschalten
  const stelle = (m, dx) => page.evaluate(({ m, dx }) => {
    const L = window.__lotse, k = L.k, G = L.G(), r = G.glaeser[0], W = innerWidth, H = innerHeight;
    const s = 6.93 * Math.max(W, H) / (m * 1000);
    k.zeigNach = null; k.anim = null;
    k.cam = { x: r[0] + r[2] / 2 + (dx || 0), y: r[1] + r[3] / 2, s: k.cam.s }; k.cam.s = s;
  }, { m, dx });
  const beobachte = async (ms) => {
    const texte = []; let foto = false;
    for (let t = 0; t < ms / 100; t++) {
      const st = (await page.textContent('#k-status')) || '';
      if (!texte.length || texte[texte.length - 1] !== st) texte.push(st);
      if (await page.isVisible('#k-pruefen')) { foto = true; break; }
      await page.waitForTimeout(100);
    }
    return { texte, foto };
  };
  console.log('Schritt:', await page.textContent('#k-titel'));
  await page.click('#k-zeig');
  // warten, bis Blatt gelesen und das Vergleichsfoto da ist
  for (let t = 0; t < 200 && !(await page.evaluate(() => !!window.__lotse.k.vergleich)); t++) await page.waitForTimeout(100);
  const vg = await page.evaluate(() => window.__lotse.k.vergleich && window.__lotse.k.vergleich.abstand);
  console.log('Vergleichsfoto bei', vg, 'mm');
  if (!vg) fehler.push('kein Vergleichsfoto');
  // (1) zu weit weg
  await stelle(2.9, 0);
  let r = await beobachte(8000);
  console.log('2,9 m:', r.texte.join(' | '));
  if (r.foto) fehler.push('(1) Foto aus 2,9 m');
  if (!r.texte.some((x) => /näher ran/.test(x))) fehler.push('(1) kein „näher ran“ bei 2,9 m');
  // (2) im richtigen Abstand
  await stelle(2.15, 0);
  r = await beobachte(30000);
  console.log('2,15 m:', r.texte.join(' | '), r.foto ? '→ Foto' : '→ kein Foto');
  if (!r.foto) fehler.push('(2) kein Foto bei 2,15 m');
  // (3) Prüfdialog
  if (r.foto) {
    const d = await page.evaluate(async () => {
      const img = document.getElementById('p-bild'); await img.decode().catch(() => {});
      const voll = new Image(); voll.src = window.__lotse.k.url; await voll.decode().catch(() => {});
      const ja = document.getElementById('p-rahmen-ja'), nein = document.getElementById('p-rahmen-nein'), cj = getComputedStyle(ja), cn = getComputedStyle(nein);
      return { bw: img.naturalWidth, bh: img.naturalHeight, W: voll.naturalWidth, H: voll.naturalHeight, frage: !document.getElementById('p-rahmen').hidden,
        gleich: ja.className === nein.className && cj.backgroundColor === cn.backgroundColor && cj.color === cn.color && cj.borderTopColor === cn.borderTopColor,
        mass: document.getElementById('p-mass').textContent, abstand: window.__lotse.k.messung && window.__lotse.k.messung.lage && window.__lotse.k.messung.lage.z };
    });
    console.log('Prüfbild', d.bw + '×' + d.bh, '(ganzes Foto ' + d.W + '×' + d.H + '), Frage Rahmen:', d.frage, ', Knöpfe gleich:', d.gleich, ',', d.mass, ', Abstand', Math.round(d.abstand), 'mm');
    if (!d.frage) fehler.push('(3) keine Rahmen-Frage');
    if (!d.gleich) fehler.push('(3) „Ja“ und „Nein“ sehen verschieden aus');
    if (!(d.bw && d.bw < d.W * 0.9 && d.bh < d.H * 0.9)) fehler.push('(3) Prüfbild nicht gezoomt: ' + d.bw + '×' + d.bh);
    // Nein → von vorn (wie ein Kunde, der es nochmal versucht)
    await page.click('#p-rahmen-nein');
    for (let t = 0; t < 50 && await page.isVisible('#k-pruefen'); t++) await page.waitForTimeout(100);
  }
  // (4) Flügel stößt seitlich an den Bildrand: wieder Blatt lesen und Vergleichsfoto, dann 2,0 m, 44 cm seitlich (bei 2 m sieht die Kamera
  // ca. ±85 cm, der 81 cm breite Flügel reicht dann bis ca. 84,5 cm, also in die 2 % am Rand)
  await page.click('#k-zeig');
  for (let t = 0; t < 200 && !(await page.evaluate(() => !!window.__lotse.k.vergleich)); t++) await page.waitForTimeout(100);
  await stelle(2.0, 44);
  r = await beobachte(12000);
  const dyn = await page.evaluate(() => window.__lotse.k.zMinDyn);
  console.log('2,0 m seitlich:', r.texte.join(' | '), '· zMinDyn', dyn);
  if (r.foto) fehler.push('(4) Foto, obwohl der Flügel aus dem Bild ragt');
  // (der Hinweis „Ich sehe den Flügel nicht ganz“ steht nur einen Takt, danach sagt „Geh … zurück“ dasselbe; ruhigerHinweis zeigt ihn nicht)
  if (!r.texte.some((x) => /zurück/.test(x))) fehler.push('(4) kein „Geh … zurück“');
  if (!(dyn > 2.1)) fehler.push('(4) Rand-Regel hat nicht gegriffen (zMinDyn ' + dyn + ')');
  await browser.close();
  console.log(fehler.length ? '\nFEHLER:\n- ' + fehler.join('\n- ') : '\nAbstand-Test bestanden: zu weit → näher ran, 2,15 m → Foto, Prüfbild gezoomt, Knöpfe gleich, abgeschnittener Flügel → weiter zurück.');
  process.exit(fehler.length ? 1 : 0);
})();
