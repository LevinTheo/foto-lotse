#!/usr/bin/env node
// Test „Nochmal von vorn“ und Einigkeit (v3.35): ruft den Prüfdialog mit ausgedachten Messungen auf (wie nach einem Kamera-Foto) und
// prüft: (1) unsicheres Flügel-Maß (Zweitmessung 18 % daneben) → Frage „Das Maß passt noch nicht“ mit „Nochmal von vorn“; (2) der Knopf
// startet den Flügel neu (Blatt, Vergleichsfoto, Abstand zurückgesetzt, Hinweis „Nochmal von vorn …“), das unsichere Foto bleibt für Levin;
// (3) das nächste Foto (806 × 1254) stimmt auf 2 % mit der Zweitmessung des ersten Versuchs (815 × 1243) überein → sicher, Rahmen-Frage;
// (4) nach TOL.vonVornMax Versuchen keine Frage mehr; (5) „Nein“ beim Rahmen startet ebenfalls von vorn, ohne „ca. 3 m“.
// Aufruf: node pruefstand/vonvorn.js [Pfad zum Lotsen]. Dauert ca. 15 s.
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
  await page.click('#flu-wahl-2');
  await page.waitForSelector('#kamera:not([hidden])');
  await page.waitForTimeout(400);
  const sicht = (sel) => page.evaluate((s) => { const e = document.querySelector(s); return !!e && !e.hidden && !e.closest('[hidden]'); }, sel);
  const zeige = (m) => page.evaluate((m) => {
    const L = window.__lotse, k = L.k, bild = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
    k.modus = 'kamera'; k.blattNr = 0; k.vergleich = { abstand: 1500 };
    L.pruefen(bild, 0, Object.assign({ ok: true, version: 'v3' }, m), bild);
  }, m);
  const zustand = () => page.evaluate(() => { const k = window.__lotse.k; return { vonVorn: k.vonVornZahl, blattNr: k.blattNr, vergleich: k.vergleich, zMin: k.zMinDyn, nein: k.neinFotos.length,
    warte: k.warteText, pool: (k.messPool || []).length, sicher: k.messung && k.messung.massSicher }; });
  // (1) unsicher → Frage
  await zeige({ breite: 991, hoehe: 1514, massSicher: false, zweitmessung: { ok: true, breite: 815, hoehe: 1243, abw: 17.9 } });
  const t1 = await page.textContent('#p-titel');
  if (!(await sicht('#p-neu')) || !/passt noch nicht/.test(t1)) fehler.push('(1) keine Frage „Nochmal von vorn“: ' + t1);
  if (await sicht('#p-rahmen')) fehler.push('(1) Rahmen-Frage zugleich sichtbar');
  // (2) Nochmal von vorn
  await page.click('#p-neu-ja');
  await page.waitForTimeout(200);
  let z = await zustand();
  if (await sicht('#k-pruefen')) fehler.push('(2) Prüfdialog bleibt offen');
  if (z.vonVorn !== 1 || z.blattNr !== null || z.vergleich !== null || z.zMin !== 0) fehler.push('(2) Flügel nicht neu gestartet: ' + JSON.stringify(z));
  if (z.nein !== 1 || !/von vorn/.test(z.warte || '')) fehler.push('(2) unsicheres Foto nicht aufgehoben oder Hinweis fehlt: ' + JSON.stringify(z));
  // (3) nächstes Foto einig mit der Zweitmessung von Versuch 1 → sicher, Rahmen-Frage
  await zeige({ breite: 806, hoehe: 1254, massSicher: false, zweitmessung: { ok: true, breite: 760, hoehe: 1200, abw: 6 } });
  z = await zustand();
  if (!z.sicher) fehler.push('(3) trotz Einigkeit mit Versuch 1 nicht sicher');
  if (!(await sicht('#p-rahmen')) || (await sicht('#p-neu'))) fehler.push('(3) Rahmen-Frage fehlt oder Frage „von vorn“ kommt trotzdem');
  // (5) Nein beim Rahmen → von vorn, ohne „ca. 3 m“
  await page.click('#p-rahmen-nein');
  await page.waitForTimeout(200);
  z = await zustand();
  if (z.vonVorn !== 2 || z.blattNr !== null || /3 m/.test(z.warte || '') || !/von vorn/.test(z.warte || '')) fehler.push('(5) Nein startet nicht von vorn: ' + JSON.stringify(z));
  // (4) nach TOL.vonVornMax (2) keine Frage mehr
  await zeige({ breite: 1100, hoehe: 1600, massSicher: false, zweitmessung: { ok: true, breite: 900, hoehe: 1300, abw: 22 } });
  if (await sicht('#p-neu')) fehler.push('(4) nach 2-mal von vorn kommt die Frage noch');
  if (!(await sicht('#p-rahmen'))) fehler.push('(4) Rahmen-Frage fehlt');
  if (!/Unsicher/.test(await page.textContent('#p-mass'))) fehler.push('(4) „Unsicher“ fehlt: ' + await page.textContent('#p-mass'));
  await page.evaluate(() => { window.__lotse.k.modus = 'uebung'; });
  await browser.close();
  console.log(fehler.length ? 'FEHLER:\n- ' + fehler.join('\n- ') : 'Von-vorn-Test bestanden: Frage bei unsicher, Neustart des Flügels, Einigkeit mit früherem Versuch → sicher, Nein → von vorn, höchstens 2-mal.');
  process.exit(fehler.length ? 1 : 0);
})();
