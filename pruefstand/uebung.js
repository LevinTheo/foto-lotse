// Ablauf-Test: spielt den Übungsmodus mit Playwright ganz durch, wie ein Kunde am Handy (iPhone-Ansicht).
// Aufruf: node pruefstand/uebung.js [Pfad zum Lotsen, Standard: dieses Repo] [--bilder <Ordner>]
// Prüft: Startseite ohne Entwickler-Sachen, Frage „Wie viele Flügel?“ (1–4), Livebild mit „Blatt … erkannt“ (grüner Rahmen ums Blatt,
// v3.17), „Geh … zurück“ und „… gefunden“ (grüner Rahmen, v3.9), Frage „Liegt der grüne Rahmen …?“ bei jedem Flügel-Foto (bei 1 Flügel
// einmal Nein → nochmal, dann Ja; bei 2 Flügeln am ersten Flügel zweimal Nein → geht trotzdem weiter, v3.25), alle Fotos bis „Alle Pflichtfotos sind da“, Griff-Frage nur bei 1 Flügel (einmal gestellt), keine
// Fehler in der Konsole. Ab v3.26: Countdown 4 … 1 vor jedem Fenster-, Flügel- und Gesamtfoto, blauer Knopf nur mit ?test.
// Ab v3.27: vorher „Manuelles Aufmaß“ mit „Selbst eingeben“ und Kunststoff übernommen, die Analyse läuft trotzdem mit Maßblatt.
// Läuft mit 1, 2 und 4 Flügeln. Ab 2 Flügeln Flügel für Flügel (v3.17): je Flügel ein Foto („Flügel 1 von 2“), die Übung zeichnet auf
// jeden Flügel ein eigenes Blatt; zum Schluss „Alle 2 Flügel zusammen“ mit „Gemessen: 2 Flügel nebeneinander“. Dauert ca. 2 Minuten.
// Mit --bilder legt es Bildschirmfotos ab.
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
  pruef(!(await sichtbar(page, '#start-fenster')), 'Blauer Knopf „Analyse nur Fenster“ ist für den Kunden sichtbar');
  await page.click('#manuell');
  pruef(!(await sichtbar(page, '#f-werte-feld')), 'Schalter „Messwerte zeigen“ ist für den Kunden sichtbar');
  // v3.27: „Manuelles Aufmaß“ mit „Selbst eingeben“ und Kunststoff übernehmen; die Analyse muss trotzdem mit Maßblatt laufen
  // (Levin 6. Nov.: danach lief jede Analyse ohne Blatt, ein Foto fürs ganze Fenster)
  await page.check('#typ-kunststoff');
  await page.click('#form button[type=submit]');
  pruef(!(await sichtbar(page, '#form')), 'Formular „Manuelles Aufmaß“ geht nach „Übernehmen“ nicht zu');
  if (BILDER) await page.screenshot({ path: path.join(BILDER, 'start.png') });

  // 2. Analyse starten → Frage nach den Flügeln (1, 2, 3, 4)
  await page.click('#start');
  pruef(await sichtbar(page, '#flu-frage'), 'Frage „Wie viele Flügel?“ kommt nicht');
  if (BILDER && nU === 1) await page.screenshot({ path: path.join(BILDER, 'frage.png') });
  await page.click('#flu-wahl-' + nU);
  await page.waitForSelector('#kamera:not([hidden])');
  // Übungsmodus: Erklärkarte wegtippen
  await page.waitForTimeout(500);
  if (await sichtbar(page, '#k-karte')) await page.click('#k-karte-ok');

  // Status mitlesen, bis eine Bedingung erfüllt ist
  const warteStatus = async (re, ms) => { for (let t = 0; t < ms / 100; t++) { const st = await page.textContent('#k-status'); if (re.test(st)) return st; await page.waitForTimeout(100); } return null; };

  // 3. Alle Fotos: „Zeig’s mir“ fährt das Bild in die Linien, der Lotse löst selbst aus
  const titel = [];
  let fluegelFotos = 0, gesamtFoto = false;
  for (let n = 0; n < 14; n++) {
    if (!(await sichtbar(page, '#kamera'))) break;
    const schritt = await page.textContent('#k-titel');
    const tipp = await page.textContent('#k-tipp');
    const istFluegel = /^Flügel \d von \d$/.test(schritt), istGesamt = /^Alle \d Flügel zusammen$/.test(schritt);
    const mitBlatt = istFluegel || (nU === 1 && n === 0);
    if (n === 0) {
      pruef(nU > 1 ? /auf jeden Flügel/.test(tipp) && schritt === 'Flügel 1 von ' + nU : /auf die Scheibe/.test(tipp), 'Erstes Foto passt nicht zur Flügelzahl: ' + schritt + ' / ' + tipp);
      if (BILDER) await page.screenshot({ path: path.join(BILDER, 'live-' + nU + '.png') });
    }
    if (mitBlatt) {
      // Erst das Blatt lesen: grüner Rahmen ums Blatt, „Blatt … erkannt“ (die Übung beginnt nah am Blatt)
      const gel = await warteStatus(/Blatt \d erkannt/, 5000);
      pruef(!!gel, schritt + ': kein „Blatt … erkannt“');
      if (BILDER && n === 0) await page.screenshot({ path: path.join(BILDER, 'blatt-' + nU + '.png') });
      if (n === 0) pruef(!!(await warteStatus(/zurück/, 4000)), 'Livebild schickt beim ersten Foto nicht zurück: „' + await page.textContent('#k-status') + '“');
    }
    pruef(!(await sichtbar(page, '#k-lern')), 'Knopf „Lernmodus“ ist für den Kunden sichtbar (' + schritt + ')');
    if (await sichtbar(page, '#k-skip')) { titel.push(schritt + ' (übersprungen)'); await page.click('#k-skip'); continue; }
    await page.click('#k-zeig');
    // Auf den Prüfdialog warten; mitlesen, ob „… gefunden“ (grüner Rahmen) bzw. „Alle … Maßblätter im Bild“ kam
    // v3.26: beim Fenster/Flügel und beim Gesamtfoto Countdown 4, 3, 2, 1 (im Auslöser und im Text), erst dann das Foto
    const ausgeloest = async () => {
      let gefunden = false, alle = false, zahlen = new Set(), seit = 0, imText = false;
      for (let t = 0; t < 300; t++) {
        if (await sichtbar(page, '#k-pruefen')) return { ok: true, gefunden, alle, zahlen: [...zahlen].sort().join(''), dauer: seit ? Date.now() - seit : 0, imText };
        const st = await page.textContent('#k-status'), z = await page.textContent('#k-zahl');
        if (/gefunden/.test(st)) gefunden = true;
        if (/Alle \d Maßblätter im Bild/.test(st)) alle = true;
        if (z) { zahlen.add(z); if (!seit) seit = Date.now(); if (/ [1-4]$/.test(st)) imText = true; }
        await page.waitForTimeout(100);
      }
      return { ok: false, gefunden, alle };
    };
    const countdownOk = (a, wo) => {
      pruef(/1/.test(a.zahlen) && /3/.test(a.zahlen) && /4/.test(a.zahlen), wo + ': kein Countdown 4 … 1 im Auslöser (gesehen: ' + (a.zahlen || 'nichts') + ')');
      pruef(a.dauer >= 3000, wo + ': Countdown zu kurz (' + a.dauer + ' ms)');
      pruef(a.imText, wo + ': Countdown fehlt im Text');
    };
    let a = await ausgeloest();
    if (!a.ok) { pruef(false, 'Foto „' + schritt + '“ löst nicht aus'); break; }
    if (mitBlatt || istGesamt) countdownOk(a, schritt);
    if (mitBlatt) {
      pruef(a.gefunden, schritt + ': kein „… gefunden“ (grüner Rahmen) vor dem Auslösen');
      pruef(await sichtbar(page, '#p-rahmen') && /grüne Rahmen genau auf der Kante/.test(await page.textContent('#p-titel')),
        schritt + ': Frage nach dem grünen Rahmen fehlt oder passt nicht: ' + await page.textContent('#p-titel'));
      // v3.31 (Fable F6): der Kunde liest „Gemessen: Flügel 2 ca. …“, das „(Blatt 3)“ sieht nur Levin
      if (istFluegel) pruef(/Gemessen: Flügel \d ca\./.test(await page.textContent('#p-mass')) && !/\(Blatt/.test(await page.textContent('#p-mass')), schritt + ': Maß nennt den Flügel nicht (oder „Blatt“ für den Kunden): ' + await page.textContent('#p-mass'));
      if (BILDER && (n === 0 || istFluegel)) await page.screenshot({ path: path.join(BILDER, 'rahmen-' + nU + '-' + n + '.png') });
      if (nU === 1) {
        // Einmal Nein: Dialog zu, gleiches Foto nochmal, der Lotse muss wieder auslösen
        await page.click('#p-rahmen-nein');
        await page.waitForSelector('#k-pruefen', { state: 'hidden', timeout: 5000 }).catch(() => pruef(false, 'Nein schließt den Prüfdialog nicht'));
        pruef((await page.textContent('#k-titel')) === schritt, 'nach Nein nicht beim selben Foto');
        a = await ausgeloest();
        if (!a.ok) { pruef(false, 'nach Nein löst er nicht wieder aus'); break; }
        pruef(await sichtbar(page, '#p-rahmen'), 'nach Nein und neuem Foto fehlt die Rahmen-Frage');
      }
      if (nU === 2 && n === 0) {
        // v3.25: zweimal Nein → beim zweiten Mal geht es trotzdem weiter, Foto als „Rahmen falsch“ markiert
        await page.click('#p-rahmen-nein');
        await page.waitForSelector('#k-pruefen', { state: 'hidden', timeout: 5000 }).catch(() => pruef(false, 'erstes Nein schließt den Prüfdialog nicht'));
        await page.click('#k-zeig');
        a = await ausgeloest();
        if (!a.ok) { pruef(false, 'nach erstem Nein löst er nicht wieder aus'); break; }
        await page.click('#p-rahmen-nein');
        await page.waitForTimeout(400);
        pruef(await sichtbar(page, '#k-pruefen') && !(await sichtbar(page, '#p-rahmen')), 'nach dem zweiten Nein nicht weiter (Dialog zu oder Frage noch da)');
        pruef(/lag nicht richtig/.test(await page.textContent('#p-mass')), 'nach dem zweiten Nein fehlt der Hinweis: ' + await page.textContent('#p-mass'));
        if (istFluegel) fluegelFotos++;
      } else {
        await page.click('#p-rahmen-ja');
        await page.waitForTimeout(200);
        if (istFluegel) fluegelFotos++;
      }
    }
    if (istGesamt) {
      gesamtFoto = true;
      pruef(a.alle, 'Gesamtfoto: kein „Alle ' + nU + ' Maßblätter im Bild“');
      pruef(fluegelFotos === nU, 'Gesamtfoto kommt vor allen Flügel-Fotos (' + fluegelFotos + ' von ' + nU + ')');
      pruef(!(await sichtbar(page, '#p-rahmen')), 'Gesamtfoto fragt nach dem grünen Rahmen');
      pruef(new RegExp('Gemessen: ' + nU + ' Flügel nebeneinander').test(await page.textContent('#p-mass')), 'Gesamtfoto nennt nicht „' + nU + ' Flügel nebeneinander“: ' + await page.textContent('#p-mass'));
      if (nU === 2) pruef(/Blatt 1 wird von Hand nachgeprüft/.test(await page.textContent('#p-mass')), 'Gesamtfoto nennt den Flügel mit falschem Rahmen nicht: ' + await page.textContent('#p-mass'));
      if (BILDER) await page.screenshot({ path: path.join(BILDER, 'gesamt-' + nU + '.png') });
    }
    const pt = await page.textContent('#p-titel'), pf = (await sichtbar(page, '#p-frage')) ? await page.textContent('#p-frage') : '';
    const mass = (await sichtbar(page, '#p-mass')) ? await page.textContent('#p-mass') : '';
    const werte = await sichtbar(page, '#p-werte');
    titel.push(schritt + ' → „' + pt + '“' + (pf ? ' ' + pf : '') + (mass ? ' · ' + mass : ''));
    if (BILDER && n === 0) await page.screenshot({ path: path.join(BILDER, 'pruefen-' + nU + '.png') });
    pruef(!werte, 'Messwerte (Entwickler) im Prüfdialog sichtbar');
    if (await sichtbar(page, '#p-griff')) {
      pruef(nU === 1, 'Griff-Frage bei mehreren Flügeln nebeneinander (' + schritt + ')');
      pruef(!/Griff/.test(pf), 'Griff-Frage doppelt gestellt: ' + pt + ' / ' + pf);
      await page.click('#p-griff-r');
    } else {
      if (n === 0) pruef(nU > 1, 'keine Griff-Frage bei 1 Flügel');
      if (await sichtbar(page, '#p-weiter')) await page.click('#p-weiter');
    }
    await page.waitForSelector('#k-pruefen', { state: 'hidden', timeout: 10000 }).catch(() => pruef(false, 'Prüfdialog geht nicht weiter'));
    await page.waitForTimeout(300);
  }
  pruef(nU === 1 ? !gesamtFoto && fluegelFotos === 0 : gesamtFoto && fluegelFotos === nU, 'Flügel-Fotos / Gesamtfoto: ' + fluegelFotos + ' / ' + gesamtFoto);
  pruef(await sichtbar(page, '#fertig'), 'Am Ende fehlt „Alle Pflichtfotos sind da“');
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem('foto-lotse-fenster') || '{}'));
  pruef(st.nU === nU, 'Flügelanzahl nicht übernommen (gemerkt: ' + st.nU + ')');
  pruef(!!st.mehr === (nU > 1) && st.flZahl === nU, 'Mehrere Flügel / Zahl nicht gemerkt (' + st.mehr + ', ' + st.flZahl + ')');
  pruef(st.mass === 'blatt' && st.typ === 'holz', 'Analyse nicht mit Maßblatt und Holz gemerkt (' + st.mass + ', ' + st.typ + ')');
  notizen.push(nU + ' Flügel: ' + titel.length + ' Schritte\n  ' + titel.join('\n  '));

  // 4. Mit ?test: Entwickler-Knopf und Messwerte da
  await page.goto('http://lotse.test/index.html?test');
  pruef(await sichtbar(page, '#entw'), 'mit ?test fehlt der Entwickler-Knopf');
  pruef(await sichtbar(page, '#start-fenster'), 'mit ?test fehlt der blaue Knopf „Analyse nur Fenster“');
  await ctx.close();
}

(async () => {
  if (BILDER) fs.mkdirSync(BILDER, { recursive: true });
  const browser = await chromium.launch();
  const fehler = [], notizen = [];
  for (const nU of [1, 2, 4]) {
    try { await durchlauf(browser, nU, fehler, notizen); }
    catch (e) { fehler.push(nU + ' Flügel: abgebrochen (' + String(e.message).split('\n')[0] + ')'); }
  }
  await browser.close();
  console.log(notizen.join('\n'));
  console.log(fehler.length ? '\nFEHLER (' + fehler.length + '):\n- ' + fehler.join('\n- ') : '\nAblauf-Test bestanden: 1, 2 und 4 Flügel (Flügel für Flügel mit Gesamtfoto), keine Fehler.');
  process.exit(fehler.length ? 1 : 0);
})();
