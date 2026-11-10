// Gesamtfoto-Test (v3.31, Fable F2): 2 Flügel im Übungsmodus, beide Flügel-Fotos mit „Zeig’s mir“, beim Gesamtfoto steht die Kamera
// so nah vor Flügel 1, dass Blatt 2 nicht im Bild ist (wie ein Blatt hinter der Gardine). Bis v3.30 stand dann endlos „Ich sehe 1 von 2
// Maßblättern“; jetzt geht es nach TOL.mehrWarten (6 s) mit dem einen Blatt weiter, Countdown, Foto, „Blatt 2 nicht auf dem Gesamtfoto“.
// Aufruf: node pruefstand/gesamtblatt.js [Pfad zum Lotsen, Standard: dieses Repo]. Dauert ca. 40 s.
const fs = require('fs'), path = require('path');
const { chromium, devices } = require('playwright') ;
const LOTSE = path.resolve(process.argv[2] || path.join(__dirname, '..'));
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext(Object.assign({}, devices['iPhone 13'], { reducedMotion: 'reduce' }));
  const page = await ctx.newPage();
  const fehler = [];
  page.on('pageerror', (e) => fehler.push(e.message));
  await page.route('http://lotse.test/**', (route) => {
    const u = new URL(route.request().url()), p = path.join(LOTSE, decodeURIComponent(u.pathname));
    if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) return route.fulfill({ status: 404, body: '' });
    const typ = p.endsWith('.html') ? 'text/html' : p.endsWith('.js') ? 'text/javascript' : 'application/octet-stream';
    route.fulfill({ status: 200, body: fs.readFileSync(p), contentType: typ });
  });
  await page.goto('http://lotse.test/index.html?test');
  await page.evaluate(() => localStorage.setItem('foto-lotse-entw', JSON.stringify({ reihe: false })));
  await page.goto('http://lotse.test/index.html?test');
  await page.click('#start');
  await page.click('#flu-wahl-2');
  await page.waitForSelector('#kamera:not([hidden])');
  await page.waitForTimeout(500);
  if (await page.isVisible('#k-karte')) await page.click('#k-karte-ok');
  for (let n = 0; n < 2; n++) {
    console.log('Schritt:', await page.textContent('#k-titel'));
    await page.click('#k-zeig');
    await page.waitForSelector('#k-pruefen:not([hidden])', { timeout: 40000 });
    if (await page.isVisible('#p-rahmen')) await page.click('#p-rahmen-ja');
    await page.waitForTimeout(200);
    if (await page.isVisible('#p-weiter')) await page.click('#p-weiter');
    for (let t = 0; t < 100 && await page.isVisible('#k-pruefen'); t++) await page.waitForTimeout(100);
    await page.waitForTimeout(300);
  }
  console.log('Schritt:', await page.textContent('#k-titel'));
  // Flügel 1 ganz im Bild (mit Rand, v3.36 prüft das), Blatt 2 knapp rechts außerhalb des Bildes
  await page.evaluate(() => {
    const L = window.__lotse, G = L.G(), r = G.glaeser[0], r2 = G.glaeser[1], k = L.k;
    const s = (window.innerHeight * 0.7) / (r[3] * 1.35), V = window.innerWidth / s;
    const rechts = r2[0] + r2[2] / 2 - 12;   // knapp links vom linken Rand von Blatt 2 (Blatt 21 cm breit)
    k.cam = { x: rechts - V / 2, y: r[1] + r[3] / 2, s: s };
  });
  const texte = new Set(), t0 = Date.now();
  let ausgeloest = false;
  for (let t = 0; t < 250; t++) {
    texte.add(Math.round((Date.now() - t0) / 1000) + ' s: ' + await page.textContent('#k-status'));
    if (await page.isVisible('#k-pruefen')) { ausgeloest = true; break; }
    await page.waitForTimeout(100);
  }
  const st = [...texte];
  const kurz = st.filter((x, i) => i === 0 || x.replace(/^\d+ s: /, '') !== st[i - 1].replace(/^\d+ s: /, ''));
  console.log(kurz.join('\n'));
  console.log('ausgelöst:', ausgeloest, 'nach', Math.round((Date.now() - t0) / 100) / 10, 's');
  if (ausgeloest) console.log('Prüfdialog:', await page.textContent('#p-mass'));
  const reicht = st.some((x) => /1 von 2 Maßblättern im Bild, das reicht/.test(x));
  const mass = ausgeloest ? await page.textContent('#p-mass') : '';
  if (!ausgeloest) fehler.push('kein Foto mit einem Blatt (bleibt bei „Ich sehe 1 von 2 Maßblättern“)');
  if (ausgeloest && !reicht) fehler.push('Hinweis „1 von 2 Maßblättern im Bild, das reicht“ fehlt');
  if (ausgeloest && !/Blatt 2 nicht auf dem Gesamtfoto/.test(mass)) fehler.push('Prüfdialog nennt das fehlende Blatt nicht: ' + mass);
  await browser.close();
  console.log(fehler.length ? '\nFEHLER:\n- ' + fehler.join('\n- ') : '\nGesamtfoto-Test bestanden: mit einem von zwei Blättern nach 6 s weiter, Foto, fehlendes Blatt genannt.');
  process.exit(fehler.length ? 1 : 0);
})();
