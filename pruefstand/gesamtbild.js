// Gesamtfoto-Bild-Test (v3.36, Levin 10. Nov.): 2 Flügel in der Übung, beide Flügel-Fotos mit „Zeig’s mir“. Beim Gesamtfoto steht die
// Kamera so nah, dass beide Blätter zu sehen sind, die Flügel aber links und rechts abgeschnitten. Erwartet: kein grüner Rahmen, kein Foto,
// Hinweis „Geh noch … zurück, damit alle Flügel ganz drauf sind“. Dann weiter weg: Foto mit beiden Flügeln.
// Aufruf: node pruefstand/gesamtbild.js [Pfad zum Lotsen, Standard: dieses Repo]. Dauert ca. 40 s.
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
  // So nah vors ganze Fenster, dass beide Blätter drauf sind, die Flügel aber links und rechts abgeschnitten
  await page.evaluate(() => { const L = window.__lotse, G = L.G(), a = G.glaeser[0], b = G.glaeser[G.glaeser.length - 1], k = L.k;
    const x0 = a[0], x1 = b[0] + b[2]; k.cam = { x: (x0 + x1) / 2, y: a[1] + a[3] / 2, s: window.innerWidth / ((x1 - x0) * 0.8) }; });
  const texte = [], t0 = Date.now();
  let frueh = false;
  for (let t = 0; t < 80; t++) {
    const st = await page.textContent('#k-status');
    if (!texte.length || texte[texte.length - 1] !== st) texte.push(st);
    if (await page.isVisible('#k-pruefen')) { frueh = true; break; }
    await page.waitForTimeout(100);
  }
  console.log('nah:', texte.join(' | '));
  if (frueh) fehler.push('Foto trotz abgeschnittener Flügel');
  if (!texte.some((x) => /zurück, damit alle Flügel ganz drauf sind/.test(x))) fehler.push('Hinweis „Geh noch … zurück, damit alle Flügel ganz drauf sind“ fehlt');
  // weiter weg
  await page.evaluate(() => { const k = window.__lotse.k; k.cam = Object.assign({}, k.cam, { s: k.cam.s / 1.8 }); });
  let ausgeloest = false;
  for (let t = 0; t < 200; t++) { if (await page.isVisible('#k-pruefen')) { ausgeloest = true; break; } await page.waitForTimeout(100); }
  if (!ausgeloest) fehler.push('weiter weg kein Foto');
  const mass = ausgeloest ? await page.textContent('#p-mass') : '';
  console.log('weit:', ausgeloest ? 'Foto nach ' + Math.round((Date.now() - t0) / 1000) + ' s: ' + mass : 'kein Foto');
  if (ausgeloest && !/2 Flügel/.test(mass)) fehler.push('Gesamtfoto ohne beide Flügel: ' + mass);
  await browser.close();
  console.log(fehler.length ? '\nFEHLER:\n- ' + fehler.join('\n- ') : '\nGesamtfoto-Bild-Test bestanden: abgeschnittene Flügel → kein Foto, Hinweis zurück; weiter weg → Foto mit beiden Flügeln.');
  process.exit(fehler.length ? 1 : 0);
})();
