// Wackeltest: jedes Lernfoto in 5 Varianten (Original, 90 %, 75 %, JPEG 70 %, leicht weich [1 2 1]-Kern) durch v3,
// misst, ob dasselbe Foto auf verschiedenen Handys dasselbe Maß ergäbe.
// Aufruf: node pruefstand/wackel.js <Pfad zu foto-lotse-daten> [Pfad zum Lotsen, Standard: dieses Repo]
// Braucht Playwright mit Chromium. Holzbreiten je Bauart kommen aus TYPEN in index.html.
const fs = require('fs'), path = require('path'); const { chromium } = require('playwright');
const DATEN = process.argv[2] || '/home/claude/foto-lotse-daten', LOTSE = process.argv[3] || path.join(__dirname, '..');
const NT = JSON.parse(fs.readFileSync(path.join(LOTSE, 'pruefstand/nachtrag.json'), 'utf8'));
// Ab 2 Flügeln (v3.18) kann es ein echtes Maß je Blatt geben (fluegelJeBlatt); verglichen wird mit dem Flügel, dessen Blatt gemessen wurde
const echt = (w, blatt) => { const q = (w.fluegelJeBlatt || []).find((x) => x.blatt === blatt && x.breiteMm && x.hoeheMm); return q ? [q.breiteMm, q.hoeheMm] : [w.fluegelBreiteMm, w.fluegelHoeheMm]; };
(async () => { const b = await chromium.launch(); const p = await b.newPage();
  await p.route('http://lotse.test/**', (route) => { const u = new URL(route.request().url());
    const f = u.pathname.startsWith('/_daten/') ? path.join(DATEN, decodeURIComponent(u.pathname.slice(8))) : path.join(LOTSE, decodeURIComponent(u.pathname));
    if (!fs.existsSync(f)) return route.fulfill({ status: 404, body: '' });
    route.fulfill({ status: 200, body: fs.readFileSync(f), contentType: f.endsWith('.html') ? 'text/html' : f.endsWith('.jpg') ? 'image/jpeg' : 'text/javascript' }); });
  await p.goto('http://lotse.test/index.html?test');
  const TY = await p.evaluate(() => { const T = window.__lotse.TYPEN, r = {}; Object.keys(T).forEach((k) => { r[k] = { fs: T[k].s * 10, fu: T[k].u * 10, tiefe: T[k].tiefe }; }); return r; });
  let zeilen = [], spreads = [], fehler = [];
  for (const o of fs.readdirSync(path.join(DATEN, 'fenster')).sort()) {
    let w = {}; try { w = JSON.parse(fs.readFileSync(path.join(DATEN, 'fenster', o, 'fenster.json'))).fenster; } catch (e) {}
    w = Object.assign({}, Object.fromEntries(Object.entries(w).filter(([, v]) => v !== null && v !== '')), NT[o] || {});
    if (w.ignorieren) continue;
    const opt = Object.assign({ v3: true, nU: w.fluegelAnzahl || 1 }, TY[w.bauart] || TY.holz);
    for (const f of fs.readdirSync(path.join(DATEN, 'fenster', o)).filter(x => /^foto-.*\.jpg$/.test(x)).sort()) {
      const r = await p.evaluate(async ({ url, opt }) => {
        const L = window.__lotse, img = new Image(); img.src = url; await img.decode();
        async function variante(sk, q, blur) {
          const w = Math.round(img.naturalWidth * sk), h = Math.round(img.naturalHeight * sk);
          let cv = document.createElement('canvas'); cv.width = w; cv.height = h; let c = cv.getContext('2d');
          c.drawImage(img, 0, 0, w, h);
          if (q) { const i2 = new Image(); i2.src = cv.toDataURL('image/jpeg', q); await i2.decode(); cv = document.createElement('canvas'); cv.width = w; cv.height = h; c = cv.getContext('2d'); c.drawImage(i2, 0, 0); }
          c = cv.getContext('2d', { willReadFrequently: true });
          let d = c.getImageData(0, 0, w, h).data;
          // Weichzeichnen selbst rechnen: der Canvas-Filter „blur()“ wird in Headless-Chromium angenommen, aber nicht angewendet
          // (bis 4. Nov. 2026 war diese Variante deshalb mit dem Original identisch). Kern [1 2 1]/4 waagerecht und senkrecht, je Farbkanal.
          if (blur) {
            const e = new Uint8ClampedArray(d.length), z = new Uint8ClampedArray(d.length);
            for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let k = 0; k < 3; k++) {
              const i = (y * w + x) * 4 + k, l = (y * w + Math.max(0, x - 1)) * 4 + k, r = (y * w + Math.min(w - 1, x + 1)) * 4 + k;
              z[i] = (d[l] + 2 * d[i] + d[r] + 2) >> 2;
            }
            for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let k = 0; k < 3; k++) {
              const i = (y * w + x) * 4 + k, o = (Math.max(0, y - 1) * w + x) * 4 + k, u = (Math.min(h - 1, y + 1) * w + x) * 4 + k;
              e[i] = (z[o] + 2 * z[i] + z[u] + 2) >> 2;
            }
            d = e;
          }
          const g = new Uint8Array(w * h), rgb = new Uint8Array(w * h * 3);
          for (let i = 0, j = 0; i < g.length; i++, j += 4) { g[i] = (77 * d[j] + 150 * d[j + 1] + 29 * d[j + 2]) >> 8; rgb[3 * i] = d[j]; rgb[3 * i + 1] = d[j + 1]; rgb[3 * i + 2] = d[j + 2]; }
          const e = L.MASS.messen(g, w, h, 0.693 * Math.max(w, h), opt, false, rgb);
          const blatt = e.fluegel ? ((e.fluegel.find((q) => q.ok) || {}).blatt || null) : e.blaetter && e.blaetter[0] ? e.blaetter[0].blatt : null;
          return e.ok ? [Math.round(e.breite), Math.round(e.hoehe), blatt] : null;
        }
        return [await variante(1, 0, 0), await variante(0.9, 0, 0), await variante(0.75, 0, 0), await variante(1, 0.7, 0), await variante(1, 0, 1)];
      }, { url: 'http://lotse.test/_daten/fenster/' + o + '/' + f, opt });
      const ok = r.filter(Boolean);
      const sb = ok.length ? Math.max(...ok.map(x => x[0])) - Math.min(...ok.map(x => x[0])) : null, sh = ok.length ? Math.max(...ok.map(x => x[1])) - Math.min(...ok.map(x => x[1])) : null;
      const e0 = echt(w, ok.length ? ok[0][2] : null);
      if (ok.length) spreads.push(Math.max(sb / e0[0], sh / e0[1]));
      r.forEach(x => { if (x) { const e = echt(w, x[2]); fehler.push(Math.max(Math.abs(x[0] - e[0]) / e[0], Math.abs(x[1] - e[1]) / e[1])); } });
      zeilen.push(`${(w.name || o).padEnd(22)} ${f}  echt ${e0.join('x')}  ` + r.map(x => x ? x.slice(0, 2).join('x') + (w.fluegelJeBlatt && x[2] ? ' (Bl ' + x[2] + ')' : '') : '—').join('  ') + `  | Streuung B ${sb} H ${sh}  (${ok.length}/5)`);
      process.stderr.write('.');
    }
  }
  console.log('\n' + zeilen.join('\n'));
  spreads.sort((a, c) => a - c); fehler.sort((a, c) => a - c);
  const q = (a, t) => a[Math.floor((a.length - 1) * t)];
  console.log(`\nStreuung (größte Abweichung zwischen Varianten, relativ): Median ${(q(spreads, .5) * 100).toFixed(1)} %, 80 % ${(q(spreads, .8) * 100).toFixed(1)} %; stabil (<1 %): ${spreads.filter(x => x < 0.01).length}/${spreads.length}`);
  console.log(`Fehler aller Varianten: Median ${(q(fehler, .5) * 100).toFixed(1)} %, ±2 %: ${fehler.filter(x => x <= .02).length}/${fehler.length}, ±5 %: ${fehler.filter(x => x <= .05).length}/${fehler.length}`);
  await b.close(); })();
