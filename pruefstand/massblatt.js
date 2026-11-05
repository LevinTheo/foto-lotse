// Erzeugt massblatt.pdf: 4 Maßblätter (A4), jedes mit eigenen Markern. Blatt 1 = Marker 0–3 (wie das bisherige Blatt),
// Blatt 2 = 4–7, Blatt 3 = 8–11, Blatt 4 = 12–15. ArUco 4×4 (DICT_4X4_50), je 80 mm, 12 mm vom Rand:
// erste Nummer oben links, dann oben rechts, unten rechts, unten links (wie markerEcken in index.html).
// Aufruf: node pruefstand/massblatt.js [Ausgabe, Standard: massblatt.pdf im Repo]. Braucht Playwright mit Chromium.
'use strict';
const fs = require('fs'), path = require('path'); const { chromium } = require('playwright');
const AUS = path.resolve(process.argv[2] || path.join(__dirname, '..', 'massblatt.pdf'));
// Bits je Marker (4×4, zeilenweise, 1 = weiß), aus OpenCV DICT_4X4_50; die ersten vier stehen gleich in index.html (MARKER_BITS)
const BITS = ['1011010100110010', '0000111110011010', '0011001100101101', '1001100101000110', '0101010010011110', '0111100111001101',
  '1001111000101110', '1100010011110010', '1111111011011010', '1100111101010110', '1111100110010001', '0001000110100111',
  '0000111010110111', '0010101000001111', '0010010010110001', '0010011000111110'];
const B = 210, H = 297, M = 80, R = 12, Z = M / 6;
function marker(id, x, y) {
  let s = `<rect x="${x}" y="${y}" width="${M}" height="${M}" fill="#000"/>`;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if (BITS[id][i * 4 + j] === '1') s += `<rect x="${x + (j + 1) * Z}" y="${y + (i + 1) * Z}" width="${Z + 0.02}" height="${Z + 0.02}" fill="#fff"/>`;
  return s;
}
function seite(k) {
  const pos = [[R, R], [B - R - M, R], [B - R - M, H - R - M], [R, H - R - M]];
  const mk = pos.map((p, i) => marker(4 * k + i, p[0], p[1])).join('');
  return `<section class="blatt"><svg viewBox="0 0 ${B} ${H}" width="${B}mm" height="${H}mm">${mk}
    <text x="105" y="112" class="t1">Holtcraft Maßblatt</text>
    <text x="105" y="134" class="t2">Blatt ${k + 1}</text>
    <text x="105" y="146" class="t3">Marker ${4 * k}–${4 * k + 3}</text>
    <text x="105" y="160" class="t4">In 100 % drucken, nicht „an Seite anpassen“.</text>
    <text x="105" y="167" class="t4">Innen mittig auf die Scheibe kleben.</text>
    <text x="105" y="174" class="t4">Mehrere Flügel: auf jeden Flügel ein Blatt, egal welches.</text>
    <line x1="55" y1="188" x2="155" y2="188" stroke="#000" stroke-width="0.6"/>
    <line x1="55" y1="185" x2="55" y2="191" stroke="#000" stroke-width="0.6"/><line x1="155" y1="185" x2="155" y2="191" stroke="#000" stroke-width="0.6"/>
    <text x="105" y="197" class="t4">Kontrolle: diese Linie ist genau 10 cm lang</text>
  </svg></section>`;
}
(async () => {
  const font = fs.readFileSync(path.join(__dirname, '..', 'fonts', 'SpaceGrotesk-Variable.ttf')).toString('base64');
  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>
    @font-face { font-family: SG; src: url(data:font/ttf;base64,${font}); font-weight: 300 700; }
    @page { size: A4; margin: 0; } html, body { margin: 0; padding: 0; }
    .blatt { width: 210mm; height: 297mm; page-break-after: always; overflow: hidden; } .blatt:last-child { page-break-after: auto; }
    svg { display: block; } text { font-family: SG, sans-serif; text-anchor: middle; fill: #0f1b16; }
    .t1 { font-size: 7px; font-weight: 600; } .t2 { font-size: 14px; font-weight: 700; } .t3 { font-size: 5px; } .t4 { font-size: 3.6px; }
  </style></head><body>${[0, 1, 2, 3].map(seite).join('')}</body></html>`;
  const b = await chromium.launch(); const p = await b.newPage();
  await p.setContent(html, { waitUntil: 'load' });
  await p.pdf({ path: AUS, format: 'A4', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  await b.close();
  console.log('geschrieben: ' + AUS);
})();
