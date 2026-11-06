# Parallaxe-Prototyp (v3.26, Levins Frage 6. Nov.: „erkennt wo die Ebene des Markers liegt und blendet alles dahinter aus? Geht sowas?“)
#
# Idee: Zwei Fotos, auf denen dasselbe Maßblatt klebt, aber von verschiedenen Stellen aus (z. B. Flügel-Foto aus 1,5–2 m und das
# Gesamtfoto aus 3 m). Jedes Foto wird mit seinem eigenen Blatt auf die Glasebene entzerrt (gleiches mm-Raster). Alles, was auf der
# Ebene liegt (Rahmen, Glaskanten, Blatt), liegt dann in beiden Bildern an derselben Stelle. Was dahinter liegt (Bäume, Häuser durchs
# Glas), ist verschoben (Parallaxe). Karte: je Stelle die beste Übereinstimmung (normierte Korrelation, 22 mm Fenster) bei bis zu
# ±8 mm Verschiebung (der Rahmen steht ein paar cm vor dem Glas). Grün = Ebene, Rot = dahinter oder davor.
#
# Aufruf: python3 pruefstand/parallaxe.py <Fensterordner> <Blatt> <Foto 1> <Foto 2> [Ausgabeordner]
#   z. B.  python3 pruefstand/parallaxe.py ../foto-lotse-daten/fenster/2026-11-06_1340_fenster 1 lauf-06-fl2-r1 lauf-03-innen /tmp/par
# Schreibt mix.jpg (Rot/Grün-Überlagerung), ebene.jpg (Karte) und gibt die stärksten senkrechten Kanten mit und ohne Maske aus.
# Braucht OpenCV mit ArUco (cv2.aruco) und numpy. Die Fotos bleiben lokal.
import os, sys
import cv2
import numpy as np

MB_B, MB_H, M, R = 210, 297, 80, 12          # Maßblatt wie in index.html (MB): A4, Marker 80 mm, 12 mm vom Rand
ECK = {0: (R, R), 1: (MB_B - R - M, R), 2: (MB_B - R - M, MB_H - R - M), 3: (R, MB_H - R - M)}
MM = 2.0                                      # mm je Pixel im Raster
BOX = (-650, -650, 900, 950)                  # Raster in Blattkoordinaten (mm, ab Blatt oben links)
_det = cv2.aruco.ArucoDetector(cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50), cv2.aruco.DetectorParameters())


def blatt_H(img, blatt):
    """Homographie Blatt (mm) → Foto (px) aus den Markern dieses Blatts (Blatt k = Marker 4(k−1) … 4(k−1)+3)."""
    ecken, ids, _ = _det.detectMarkers(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY))
    src, dst = [], []
    for e, i in zip(ecken, ids.flatten() if ids is not None else []):
        if i // 4 != blatt - 1:
            continue
        x0, y0 = ECK[i % 4]
        for (u, v), (dx, dy) in zip(e[0], [(0, 0), (M, 0), (M, M), (0, M)]):
            src.append((x0 + dx, y0 + dy)); dst.append((u, v))
    if len(src) < 8:
        raise SystemExit('Blatt %d: zu wenige Marker' % blatt)
    H, _ = cv2.findHomography(np.float32(src), np.float32(dst), 0)
    return H


def entzerren(img, H):
    x0, y0, x1, y1 = BOX
    S = np.array([[MM, 0, x0], [0, MM, y0], [0, 0, 1]], float)
    return cv2.warpPerspective(img, H @ S, (int((x1 - x0) / MM), int((y1 - y0) / MM)), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP)


def ebene(a, b, k=11, tol=4):
    """Beste Korrelation je Stelle bei Verschiebung bis ±tol Pixel; dazu, wo überhaupt Struktur ist."""
    mu = lambda x: cv2.blur(x, (k, k))
    best = tex = None
    for dx in range(-tol, tol + 1):
        for dy in range(-tol, tol + 1):
            bs = np.roll(np.roll(b, dy, 0), dx, 1)
            ma, mb = mu(a), mu(bs)
            va, vb = mu(a * a) - ma * ma, mu(bs * bs) - mb * mb
            r = (mu(a * bs) - ma * mb) / np.sqrt(np.maximum(va * vb, 1e-3))
            t = np.sqrt(np.maximum(np.minimum(va, vb), 0))
            best = r if best is None else np.maximum(best, r)
            tex = t if tex is None else np.maximum(tex, t)
    return best, tex > 6


def spitzen(p, n=6):
    sel = []
    for t in np.argsort(p)[::-1]:
        if all(abs(t - s) > 8 for s in sel):
            sel.append(t)
        if len(sel) == n:
            break
    return sorted((int(BOX[0] + MM * t), round(float(p[t]))) for t in sel)


def main():
    if len(sys.argv) < 5:
        raise SystemExit(__doc__ or 'Aufruf siehe Kopf der Datei')
    ordner, blatt, f1, f2 = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4]
    aus = sys.argv[5] if len(sys.argv) > 5 else '/tmp/parallaxe'
    os.makedirs(aus, exist_ok=True)
    bilder = []
    for f in (f1, f2):
        img = cv2.imread(os.path.join(ordner, f if f.endswith('.jpg') else f + '.jpg'))
        bilder.append(cv2.cvtColor(entzerren(img, blatt_H(img, blatt)), cv2.COLOR_BGR2GRAY).astype(np.float32))
    a, b = bilder
    cv2.imwrite(os.path.join(aus, 'mix.jpg'), np.dstack([b, a, np.minimum(a, b)]).astype(np.uint8))
    best, tex = ebene(a, b)
    vis = cv2.cvtColor(((a + b) / 2).astype(np.uint8), cv2.COLOR_GRAY2BGR)
    over = vis.copy()
    over[tex & (best > 0.85)] = (0, 200, 0)
    over[tex & (best < 0.6)] = (0, 0, 230)
    cv2.imwrite(os.path.join(aus, 'ebene.jpg'), cv2.addWeighted(vis, 0.45, over, 0.55, 0))
    hinten = cv2.dilate(((best < 0.6) & tex).astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool)
    gx = np.abs(cv2.Sobel(a, cv2.CV_32F, 1, 0, ksize=3))
    band = slice(150, 650)
    print('Senkrechte Kanten in Foto 1 (mm ab Blatt links, Stärke):')
    print('  ohne Maske:', spitzen(gx[band].mean(0)))
    print('  mit Maske: ', spitzen((gx * ~hinten)[band].mean(0)))
    print('Bilder:', os.path.join(aus, 'mix.jpg'), os.path.join(aus, 'ebene.jpg'))


if __name__ == '__main__':
    main()
