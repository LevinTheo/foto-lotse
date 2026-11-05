// Nah-fern-Probe (Levins Idee, 5. Nov. 2026): nahes und fernes Foto desselben Fensters (Blatt klebt fest) über das Blatt
// auf die Glasebene entzerren. Was in der Fensterebene liegt, deckt sich; was davor oder dahinter liegt, verschiebt sich.
// Aufruf: node pruefstand/nahfern.js <Pfad zu foto-lotse-daten> [Ausgabeordner] [Toleranz in Pixeln, Standard 5]
//   Legt je Paar ein Bild ab (rot = nah, türkis = fern, grau = deckt sich) und vergleicht das Maß:
//   v3Finden (2 mm Raster) auf dem fernen Foto allein gegen „nur Kanten, die im nahen Foto an derselben Stelle liegen“.
//   Paare: unten in PAARE (nah, fern; dasselbe Blatt). Ergebnis 5. Nov. 2026 in REGIE.md unter Offene Punkte.
'use strict';
const fs = require('fs'), path = require('path'); const { chromium } = require('playwright');
const DATEN = path.resolve(process.argv[2] || '../foto-lotse-daten'), AUS = path.resolve(process.argv[3] || '/tmp/nahfern');
const TOLPX = +(process.argv[4] || 5), LOTSE = path.join(__dirname, '..');
const NT = JSON.parse(fs.readFileSync(path.join(__dirname, 'nachtrag.json'), 'utf8'));
const PAARE = [
  ['2026-11-04_1331_fenster', 'foto-01.jpg', 'foto-05.jpg'], ['2026-11-04_1331_fenster', 'foto-04.jpg', 'foto-05.jpg'],
  ['2026-11-04_1331_fenster', 'foto-02.jpg', 'foto-05.jpg'], ['2026-11-04_1331_fenster', 'foto-03.jpg', 'foto-05.jpg'],
  ['2026-11-04_1425_fenster', 'foto-04.jpg', 'foto-01.jpg'], ['2026-11-04_1425_fenster', 'foto-02.jpg', 'foto-01.jpg'],
  ['2026-11-04_1231_fenster', 'foto-04.jpg', 'foto-01.jpg'], ['2026-11-04_1231_fenster', 'foto-02.jpg', 'foto-01.jpg'],
  ['2026-11-04_1217_fenster', 'foto-03.jpg', 'foto-01.jpg'], ['2026-11-04_1217_fenster', 'foto-04.jpg', 'foto-01.jpg'],
  ['2026-11-04_1650_fenster', 'foto-04.jpg', 'foto-01.jpg'], ['2026-11-04_1650_fenster', 'foto-02.jpg', 'foto-01.jpg'],
  ['2026-11-04_1505_fenster', 'foto-04.jpg', 'foto-01.jpg'], ['2026-11-04_1505_fenster', 'foto-02.jpg', 'foto-01.jpg'],
  ['2026-11-04_1647_fenster', 'foto-03.jpg', 'foto-01.jpg']];
(async () => {
  fs.mkdirSync(AUS, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage();
  await p.route('http://lotse.test/**', (route) => { const u = new URL(route.request().url());
    const f = u.pathname.startsWith('/_daten/') ? path.join(DATEN, decodeURIComponent(u.pathname.slice(8))) : path.join(LOTSE, decodeURIComponent(u.pathname));
    if (!fs.existsSync(f)) return route.fulfill({ status: 404, body: '' });
    route.fulfill({ status: 200, body: fs.readFileSync(f), contentType: f.endsWith('.html') ? 'text/html' : f.endsWith('.jpg') ? 'image/jpeg' : 'text/javascript' }); });
  await p.goto('http://lotse.test/index.html?test');
  const TY = await p.evaluate(() => { const T = window.__lotse.TYPEN, r = {}; Object.keys(T).forEach((k) => { r[k] = { fs: T[k].s * 10, fu: T[k].u * 10, tiefe: T[k].tiefe }; }); return r; });
  const zeilen = [];
  for (const [o, nah, fern] of PAARE) {
    if (!fs.existsSync(path.join(DATEN, 'fenster', o, nah)) || !fs.existsSync(path.join(DATEN, 'fenster', o, fern))) continue;
    let w = {}; try { w = JSON.parse(fs.readFileSync(path.join(DATEN, 'fenster', o, 'fenster.json'))).fenster; } catch (e) {}
    w = Object.assign({}, Object.fromEntries(Object.entries(w).filter(([, v]) => v !== null && v !== '')), NT[o] || {});
    const ty = TY[w.bauart] || TY.holz, nU = w.fluegelAnzahl || 1;
    const r = await p.evaluate(async ({ o, nah, fern, ty, nU, TOLPX }) => {
      const M = window.__lotse.MASS, V = M._v3;
      async function laden(f) {
        const img = new Image(); img.src = 'http://lotse.test/_daten/fenster/' + o + '/' + f; await img.decode();
        const q = Math.min(1, 2576 / Math.max(img.naturalWidth, img.naturalHeight));
        const cv = document.createElement('canvas'); cv.width = Math.round(img.naturalWidth * q); cv.height = Math.round(img.naturalHeight * q);
        const c = cv.getContext('2d', { willReadFrequently: true }); c.drawImage(img, 0, 0, cv.width, cv.height);
        const w = cv.width, h = cv.height, d = c.getImageData(0, 0, w, h).data, g = new Uint8Array(w * h), rgb = new Uint8Array(w * h * 3);
        for (let i = 0, j = 0; i < g.length; i++, j += 4) { g[i] = (77 * d[j] + 150 * d[j + 1] + 29 * d[j + 2]) >> 8; rgb[3 * i] = d[j]; rgb[3 * i + 1] = d[j + 1]; rgb[3 * i + 2] = d[j + 2]; }
        const f0 = 0.693 * Math.max(w, h), lage = M.blattLage(M.findeMarker(g, w, h), w, h, f0);
        V.raster(2);
        return { E: V.entzerren(rgb, g, w, h, lage.Hvoll || lage.H), z: lage.z };
      }
      const N = await laden(nah), F = await laden(fern), V3 = V.V3, W = V3.W, H = V3.H, n = W * H, S = 2;
      // Nahes Kantenbild um TOLPX Pixel verbreitern (der Flügel liegt ein paar cm vor dem Glas und verschiebt sich etwas)
      function breit(src) {
        const t = new Float32Array(n), o2 = new Float32Array(n);
        for (let v = 0; v < H; v++) for (let u = 0; u < W; u++) { let m = 0; for (let k = -TOLPX; k <= TOLPX; k++) { const uu = u + k; if (uu >= 0 && uu < W && src[v * W + uu] > m) m = src[v * W + uu]; } t[v * W + u] = m; }
        for (let v = 0; v < H; v++) for (let u = 0; u < W; u++) { let m = 0; for (let k = -TOLPX; k <= TOLPX; k++) { const vv = v + k; if (vv >= 0 && vv < H && t[vv * W + u] > m) m = t[vv * W + u]; } o2[v * W + u] = m; }
        return o2;
      }
      const K = Object.assign({}, F.E, { ex: new Float32Array(n), ey: new Float32Array(n), gx: new Float32Array(n), gy: new Float32Array(n) });
      const nb = { ex: breit(N.E.ex), ey: breit(N.E.ey), gx: breit(N.E.gx), gy: breit(N.E.gy) };
      for (let i = 0; i < n; i++) ['ex', 'ey', 'gx', 'gy'].forEach((k) => { K[k][i] = N.E.M[i] && F.E.M[i] ? Math.min(F.E[k][i], nb[k][i]) : F.E[k][i]; });
      const allein = V.finden(F.E, ty.fs, nU, ty.fu), komb = V.finden(K, ty.fs, nU, ty.fu);
      V.raster(2);
      const k2 = (F.z - ty.tiefe) / F.z;
      const mass = (q) => q ? [Math.round((q.fluegel[2] - q.fluegel[0]) * k2), Math.round((q.fluegel[3] - q.fluegel[1]) * k2)] : null;
      // Bild: rot = nah, türkis = fern, Helligkeit angeglichen
      const Gl = allein ? allein.glas : [-500, -600, 700, 800];
      const u0 = Math.max(0, Math.round((Gl[0] - 300 - V3.X0) / S)), u1 = Math.min(W, Math.round((Gl[2] + 300 - V3.X0) / S));
      const v0 = Math.max(0, Math.round((Gl[1] - 350 - V3.Y0) / S)), v1 = Math.min(H, Math.round((Gl[3] + 350 - V3.Y0) / S));
      function stat(E) { let s = 0, q = 0, m = 0; for (let v = v0; v < v1; v++) for (let u = u0; u < u1; u++) { const i = v * W + u; if (!N.E.M[i] || !F.E.M[i]) continue; s += E.Y[i]; q += E.Y[i] * E.Y[i]; m++; } const mu = s / m; return [mu, Math.sqrt(q / m - mu * mu)]; }
      const sn = stat(N.E), sf = stat(F.E), bc = document.createElement('canvas'); bc.width = u1 - u0; bc.height = v1 - v0;
      const bx = bc.getContext('2d'), id = bx.createImageData(bc.width, bc.height);
      for (let v = v0; v < v1; v++) for (let u = u0; u < u1; u++) {
        const i = v * W + u, j = ((v - v0) * bc.width + (u - u0)) * 4;
        const a = N.E.M[i] ? Math.max(0, Math.min(255, 128 + (N.E.Y[i] - sn[0]) / sn[1] * 50)) : 0, c = F.E.M[i] ? Math.max(0, Math.min(255, 128 + (F.E.Y[i] - sf[0]) / sf[1] * 50)) : 0;
        id.data[j] = a; id.data[j + 1] = c; id.data[j + 2] = c; id.data[j + 3] = 255;
      }
      bx.putImageData(id, 0, 0);
      return { allein: mass(allein), komb: mass(komb), zN: N.z, zF: F.z, bild: bc.toDataURL('image/jpeg', 0.9) };
    }, { o, nah, fern, ty, nU, TOLPX });
    fs.writeFileSync(path.join(AUS, o.slice(11) + '_' + nah.slice(5, 7) + '-' + fern.slice(5, 7) + '.jpg'), Buffer.from(r.bild.split(',')[1], 'base64'));
    const e = [w.fluegelBreiteMm, w.fluegelHoeheMm], pz = (m, i) => (m ? ((m[i] / e[i] - 1) * 100).toFixed(1).padStart(6) : '     –');
    zeilen.push({ r, e });
    console.log(((w.name || o).slice(0, 20) + ' ' + nah.slice(5, 7) + '→' + fern.slice(5, 7)).padEnd(28) + (r.zN / 1000).toFixed(1) + '/' + (r.zF / 1000).toFixed(1) + ' m | fern allein B' + pz(r.allein, 0) + ' H' + pz(r.allein, 1) + ' | nah+fern B' + pz(r.komb, 0) + ' H' + pz(r.komb, 1));
  }
  const fe = (m, e) => (m ? Math.max(Math.abs(m[0] / e[0] - 1), Math.abs(m[1] / e[1] - 1)) : 9);
  const zaehl = (k, g) => zeilen.filter((z) => fe(z.r[k], z.e) <= g).length;
  console.log('±2 %: fern allein ' + zaehl('allein', 0.02) + ', nah+fern ' + zaehl('komb', 0.02) + ' · ±5 %: fern allein ' + zaehl('allein', 0.05) + ', nah+fern ' + zaehl('komb', 0.05) + ' von ' + zeilen.length + ' Paaren · Bilder in ' + AUS);
  await b.close();
})();
