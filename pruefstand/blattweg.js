#!/usr/bin/env node
// Blatt-weg-Test (v3.40, Fable G5): Kamera-Modus mit der Testkamera von Chromium (bewegtes Testbild, kein Maßblatt), 2 Flügel. So sieht
// es aus, wenn das Blatt verdeckt ist. Erwartet: erst „Geh nah an das Maßblatt …“, nach TOL.blattHilfe (15 s) „Ich kann das Maßblatt nicht
// lesen. Mach einfach ein Foto vom Flügel …“; ein Tipp auf den Auslöser führt in den Prüfdialog (der Kunde hängt nicht fest).
// Bis v3.39 stand dort 45 s und länger nur „Geh nah an das Maßblatt“.
// Aufruf: node pruefstand/blattweg.js [Pfad zum Lotsen, Standard: dieses Repo]. Dauert ca. 30 s.
const fs = require('fs'), path = require('path');
const { chromium, devices } = require('playwright');
const LOTSE = path.resolve(process.argv[2] || path.join(__dirname, '..'));
(async () => {
  const browser = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  const ctx = await browser.newContext(Object.assign({}, devices['iPhone 13'], { reducedMotion: 'reduce', permissions: ['camera'] }));
  const page = await ctx.newPage();
  const fehler = [];
  page.on('pageerror', (e) => fehler.push('Seitenfehler: ' + e.message));
  await page.route('http://localhost:8765/**', (route) => {
    const u = new URL(route.request().url()), p = path.join(LOTSE, decodeURIComponent(u.pathname));
    if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) return route.fulfill({ status: 404, body: '' });
    route.fulfill({ status: 200, body: fs.readFileSync(p), contentType: p.endsWith('.html') ? 'text/html' : 'application/octet-stream' });
  });
  // getUserMedia braucht einen sicheren Ursprung: localhost zählt als sicher (die Seite kommt trotzdem aus page.route, kein Server)
  await page.goto('http://localhost:8765/index.html?test');
  await page.evaluate(() => localStorage.setItem('foto-lotse-entw', JSON.stringify({ reihe: false })));
  await page.goto('http://localhost:8765/index.html?test');
  await page.click('#start');
  await page.click('#flu-wahl-2');
  await page.waitForSelector('#kamera:not([hidden])');
  await page.waitForTimeout(1500);
  if (await page.isVisible('#k-karte')) await page.click('#k-karte-ok');
  const modus = await page.evaluate(() => window.__lotse.k.modus);
  console.log('Modus:', modus);
  if (modus !== 'kamera') { console.log('Testkamera nicht gestartet'); await browser.close(); process.exit(2); }
  const texte = [], t0 = Date.now();
  let hilfeNach = null;
  for (let t = 0; t < 220; t++) {
    const st = (await page.textContent('#k-status')) || '';
    if (!texte.length || texte[texte.length - 1] !== st) texte.push(st);
    if (/Maßblatt nicht lesen/.test(st)) { hilfeNach = (Date.now() - t0) / 1000; break; }
    await page.waitForTimeout(100);
  }
  console.log('Hinweise:', texte.join(' | '));
  if (hilfeNach === null) fehler.push('kein Ausweg-Hinweis nach 22 s');
  else {
    console.log('Ausweg nach', hilfeNach.toFixed(1), 's');
    if (hilfeNach < 13) fehler.push('Ausweg zu früh (' + hilfeNach.toFixed(1) + ' s)');
    if (!/vom Flügel/.test(texte[texte.length - 1])) fehler.push('Text nennt den Flügel nicht');
  }
  if (!texte.some((x) => /Geh nah an das Maßblatt/.test(x))) fehler.push('vorher kein „Geh nah an das Maßblatt“');
  await page.click('#k-ausloeser');
  let dialog = false;
  for (let t = 0; t < 300; t++) { if (await page.isVisible('#k-pruefen')) { dialog = true; break; } await page.waitForTimeout(100); }
  console.log('Auslöser →', dialog ? 'Prüfdialog: ' + (await page.textContent('#p-titel')) + ' · ' + ((await page.textContent('#p-mass')) || '') : 'nichts');
  if (!dialog) fehler.push('Auslöser führt nicht in den Prüfdialog');
  await browser.close();
  console.log(fehler.length ? '\nFEHLER:\n- ' + fehler.join('\n- ') : '\nBlatt-weg-Test bestanden: nach ca. 15 s Ausweg-Hinweis, Auslöser führt weiter.');
  process.exit(fehler.length ? 1 : 0);
})();
