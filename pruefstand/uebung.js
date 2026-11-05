// Ablauf-Test: spielt den Übungsmodus mit Playwright ganz durch, wie ein Kunde am Handy (iPhone-Ansicht).
// Aufruf: node pruefstand/uebung.js [Pfad zum Lotsen, Standard: dieses Repo] [--bilder <Ordner>]
// Prüft: Startseite ohne Entwickler-Sachen, Frage „1 oder 2 Flügel?“, Livebild mit „Geh … zurück“ und „Fenster gefunden“ (grüner
// Rahmen, v3.9), Frage „Liegt der grüne Rahmen …?“ (bei 1 Flügel einmal Nein → nochmal, dann Ja), alle Fotos bis
// „Alle Pflichtfotos sind da“, Griff-Frage nur bei 1 Flügel (einmal gestellt), keine Fehler in der Konsole.
// Läuft einmal mit 1 und einmal mit 2 Flügeln, dauert ca. 1 Minute. Mit --bilder legt es Bildschirmfotos ab.
// Ergebnis in REGIE.md unter „Ablauf-Test“ eintragen.
// Braucht Playwright mit Chromium. Ohne Kamera (http, headless) startet der Lotse von selbst den Übungsmodus.
'use strict';
const fs = require('fs'), path = require('path');
const { chromium, devices } = require('playwright');
const args = process.argv.slice(2);
const bi = args.indexOf('--bilder');
const BILDER = bi >= 0 ? path.resolve(args[bi + 1]) : null;
const LOTSE = path.resolve(args.filter((a, i) => !a.startsWith('--') && (bi < 0 || i !== bi + 1))[0] || path.join(__dirname, '..'));

function bedienen(page) {
  return page.route('http://lotse.test/**', (route) => {
    const u = new URL(route.request().url()), p = path.join(LOTSE, decodeURIComponent(u.pathname));
    if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) return route.fulfill({ status: 404, body: '' });
    const typ = p.endsWith('.html') ? 'text/html' : p.endsWith('.js') ? 'text/javascript' : p.endsWith('.json') ? 'application/json' : 'application/octet-stream';
    route.fulfill({ status: 200, body: fs.readFileSync(p), contentType: typ });
  });
}
const sichtbar = (page, sel) => page.isVisible(sel).catch(() => false);

async function durchlauf(browser, nU, fehler, notizen) {
  const ctx = await browser.newContext(Object.assign({}, devices['iPhone 13'], { reducedMotion: 'reduce' }));
  const page = await ctx.newPage();
  page.on('pageerror', (e) => fehler.push(nU + ' Flügel: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') fehler.push(nU + ' Flügel, Konsole: ' + m.text()); });
  await bedienen(page);
  const pruef = (ok, text) => { if (!ok) fehler.push(nU + ' Flügel: ' + text); };

  // 1. Startseite wie beim Kunden (ohne ?test): kein Entwickler-Knopf
  await page.goto('http://lotse.test/index.html');
  pruef(!(await sichtbar(page, '#entw')), 'Knopf „Entwickler: Lernfotos“ ist für den Kunden sichtbar');
  pruef(await sichtbar(page, '#start'), 'Knopf „Analyse starten“ fehlt');
  await page.click('#manuell');
  pruef(!(await sichtbar(page, '#f-werte-feld')), 'Schalter „Messwerte zeigen“ ist für den Kunden sichtbar');
  await page.click('#manuell');
  if (BILDER) await page.screenshot({ path: path.join(BILDER, 'start.png') });

  // 2. Analyse starten → Frage nach den Flügeln
  await page.click('#start');
  pruef(await sichtbar(page, '#flu-frage'), 'Frage „Wie viele Flügel?“ kommt nicht');
  if (BILDER && nU === 1) await page.screenshot({ path: path.join(BILDER, 'frage.png') });
  await page.click('#flu-wahl-' + nU);
  await page.waitForSelector('#kamera:not([hidden])');
  // Übungsmodus: Erklärkarte wegtippen
  await page.waitForTimeout(500);
  if (await sichtbar(page, '#k-karte')) await page.click('#k-karte-ok');

  // 3. Alle Fotos: „Zeig’s mir“ fährt das Bild in die Linien, der Lotse löst selbst aus
  const titel = [];
  for (let n = 0; n < 8; n++) {
    if (!(await sichtbar(page, '#kamera'))) break;
    const schritt = await page.textContent('#k-titel');
    const tipp = await page.textContent('#k-tipp');
    if (n === 0) {
      pruef(nU === 2 ? /linke Scheibe/.test(tipp) : /auf die Scheibe/.test(tipp), 'Tipp beim ersten Foto passt nicht zur Flügelzahl: ' + tipp);
      // Die Übung beginnt zu nah (1,8 m): das Livebild muss zurückschicken, nur nach dem Maßblatt
      await page.waitForTimeout(1500);
      const st = await page.textContent('#k-status');
      pruef(/zurück/.test(st), 'Livebild schickt beim ersten Foto nicht zurück: „' + st + '“');
      if (BILDER) await page.screenshot({ path: path.join(BILDER, 'live-' + nU + '.png') });
    }
    if (await sichtbar(page, '#k-skip')) { titel.push(schritt + ' (übersprungen)'); await page.click('#k-skip'); continue; }
    await page.click('#k-zeig');
    // Auf den Prüfdialog warten; beim ganzen Fenster mitlesen, ob „Fenster gefunden“ (grüner Rahmen) kam
    const ausgeloest = async () => {
      let gefunden = false;
      for (let t = 0; t < 300; t++) {
        if (await sichtbar(page, '#k-pruefen')) return { ok: true, gefunden };
        if (/gefunden/.test(await page.textContent('#k-status'))) gefunden = true;
        await page.waitForTimeout(100);
      }
      return { ok: false, gefunden };
    };
    let a = await ausgeloest();
    if (!a.ok) { pruef(false, 'Foto „' + schritt + '“ löst nicht aus'); break; }
    if (n === 0) {
      pruef(a.gefunden, 'kein „Fenster gefunden“ (grüner Rahmen) vor dem Auslösen');
      pruef(await sichtbar(page, '#p-rahmen') && /grüne Rahmen/.test(await page.textContent('#p-titel')), 'Frage „Liegt der grüne Rahmen …?“ fehlt');
      if (BILDER) await page.screenshot({ path: path.join(BILDER, 'rahmen-' + nU + '.png') });
      if (nU === 1) {
        // Einmal Nein: Dialog zu, gleiches Foto nochmal, der Lotse muss wieder auslösen
        await page.click('#p-rahmen-nein');
        await page.waitForSelector('#k-pruefen', { state: 'hidden', timeout: 5000 }).catch(() => pruef(false, 'Nein schließt den Prüfdialog nicht'));
        pruef((await page.textContent('#k-titel')) === schritt, 'nach Nein nicht beim selben Foto');
        a = await ausgeloest();
        if (!a.ok) { pruef(false, 'nach Nein löst er nicht wieder aus'); break; }
        pruef(await sichtbar(page, '#p-rahmen'), 'nach Nein und neuem Foto fehlt die Rahmen-Frage');
      }
      await page.click('#p-rahmen-ja');
      await page.waitForTimeout(200);
    }
    const pt = await page.textContent('#p-titel'), pf = (await sichtbar(page, '#p-frage')) ? await page.textContent('#p-frage') : '';
    const mass = (await sichtbar(page, '#p-mass')) ? await page.textContent('#p-mass') : '';
    const werte = await sichtbar(page, '#p-werte');
    titel.push(schritt + ' → „' + pt + '“' + (pf ? ' ' + pf : '') + (mass ? ' · ' + mass : ''));
    if (BILDER && n === 0) await page.screenshot({ path: path.join(BILDER, 'pruefen-' + nU + '.png') });
    pruef(!werte, 'Messwerte (Entwickler) im Prüfdialog sichtbar');
    if (await sichtbar(page, '#p-griff')) {
      pruef(nU === 1, 'Griff-Frage bei 2 Flügeln');
      pruef(!/Griff/.test(pf), 'Griff-Frage doppelt gestellt: ' + pt + ' / ' + pf);
      await page.click('#p-griff-r');
    } else {
      if (n === 0) pruef(nU === 2, 'keine Griff-Frage bei 1 Flügel');
      if (await sichtbar(page, '#p-weiter')) await page.click('#p-weiter');
    }
    await page.waitForSelector('#k-pruefen', { state: 'hidden', timeout: 10000 }).catch(() => pruef(false, 'Prüfdialog geht nicht weiter'));
    await page.waitForTimeout(300);
  }
  pruef(await sichtbar(page, '#fertig'), 'Am Ende fehlt „Alle Pflichtfotos sind da“');
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem('foto-lotse-fenster') || '{}'));
  pruef(st.nU === nU, 'Flügelanzahl nicht übernommen (gemerkt: ' + st.nU + ')');
  notizen.push(nU + ' Flügel: ' + titel.length + ' Schritte\n  ' + titel.join('\n  '));

  // 4. Mit ?test: Entwickler-Knopf und Messwerte da
  await page.goto('http://lotse.test/index.html?test');
  pruef(await sichtbar(page, '#entw'), 'mit ?test fehlt der Entwickler-Knopf');
  await ctx.close();
}

(async () => {
  if (BILDER) fs.mkdirSync(BILDER, { recursive: true });
  const browser = await chromium.launch();
  const fehler = [], notizen = [];
  for (const nU of [1, 2]) {
    try { await durchlauf(browser, nU, fehler, notizen); }
    catch (e) { fehler.push(nU + ' Flügel: abgebrochen (' + String(e.message).split('\n')[0] + ')'); }
  }
  await browser.close();
  console.log(notizen.join('\n'));
  console.log(fehler.length ? '\nFEHLER (' + fehler.length + '):\n- ' + fehler.join('\n- ') : '\nAblauf-Test bestanden: 1 und 2 Flügel, keine Fehler.');
  process.exit(fehler.length ? 1 : 0);
})();
