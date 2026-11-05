# Erzeugt massblatt.pdf: 4 Maßblätter, jedes mit eigenen Markern. Blatt 1 = Marker 0–3 (wie das bisherige Blatt),
# Blatt 2 = 4–7, Blatt 3 = 8–11, Blatt 4 = 12–15. ArUco 4×4 (DICT_4X4_50), je 80 mm, 12 mm vom Rand:
# erste Nummer oben links, dann oben rechts, unten rechts, unten links (wie markerEcken in index.html).
#
# Seit 5. Nov. 2026 mit reportlab statt Chromium: Chromium machte die Seite 210,2 × 297,4 mm groß statt genau A4
# (595,92 × 842,88 pt). Manche Drucker verkleinern eine Seite, die größer als A4 ist, dann auf den druckbaren Bereich,
# bei Levin auf 95 % (10-cm-Linie nur 95 mm). Hier ist die Seite genau A4 (595,28 × 841,89 pt), alles in mm gezeichnet.
#
# Aufruf: python3 pruefstand/massblatt.py [Ausgabe, Standard: massblatt.pdf im Repo]
# Braucht reportlab und fontTools (pip install reportlab fonttools). Schrift: fonts/SpaceGrotesk-Variable.ttf (SIL OFL 1.1).
import os
import sys
import tempfile

from fontTools.ttLib import TTFont as FTFont
from fontTools.varLib.instancer import instantiateVariableFont
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

HIER = os.path.dirname(os.path.abspath(__file__))
AUS = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(HIER, '..', 'massblatt.pdf'))
SCHRIFT = os.path.join(HIER, '..', 'fonts', 'SpaceGrotesk-Variable.ttf')

# Bits je Marker (4×4, zeilenweise, 1 = weiß), aus OpenCV DICT_4X4_50; gleich wie MARKER_BITS in index.html
BITS = ['1011010100110010', '0000111110011010', '0011001100101101', '1001100101000110', '0101010010011110', '0111100111001101',
        '1001111000101110', '1100010011110010', '1111111011011010', '1100111101010110', '1111100110010001', '0001000110100111',
        '0000111010110111', '0010101000001111', '0010010010110001', '0010011000111110']
B, H, M, R = 210.0, 297.0, 80.0, 12.0
Z = M / 6
TINTE = (0x0f / 255, 0x1b / 255, 0x16 / 255)

# Feste Schnitte aus der variablen Schrift (Regular 400, Halbfett 600, Fett 700)
tmp = tempfile.mkdtemp()
for name, gewicht in (('SG', 400), ('SG-Halb', 600), ('SG-Fett', 700)):
    f = instantiateVariableFont(FTFont(SCHRIFT), {'wght': gewicht})
    # Eigener Name je Schnitt, sonst hält reportlab alle drei für dieselbe Schrift (alles wurde Light)
    for rec in f['name'].names:
        if rec.nameID in (4, 6):
            rec.string = 'SpaceGrotesk-' + str(gewicht)
    pfad = os.path.join(tmp, name + '.ttf')
    f.save(pfad)
    pdfmetrics.registerFont(TTFont(name, pfad))

assert abs(A4[0] - B * mm) < 0.01 and abs(A4[1] - H * mm) < 0.01, 'A4 stimmt nicht'
c = canvas.Canvas(AUS, pagesize=A4)
c.setTitle('Holtcraft Maßblatt')
c.setAuthor('Holtcraft')
c.setSubject('Maßblätter 1–4 für den Foto-Lotsen, in 100 % drucken')


def rechteck(x, y, w, h, farbe):
    # x, y: oben links in mm (wie im Blatt), PDF zählt von unten
    c.setFillColorRGB(*farbe)
    c.rect(x * mm, (H - y - h) * mm, w * mm, h * mm, stroke=0, fill=1)


def linie(x1, y1, x2, y2, breite=0.6):
    c.setStrokeColorRGB(0, 0, 0)
    c.setLineWidth(breite * mm)
    c.line(x1 * mm, (H - y1) * mm, x2 * mm, (H - y2) * mm)


def text(x, y, inhalt, schrift, groesse_mm):
    # y = Grundlinie in mm von oben, Größe in mm (wie im bisherigen SVG)
    c.setFillColorRGB(*TINTE)
    c.setFont(schrift, groesse_mm * mm)
    c.drawCentredString(x * mm, (H - y) * mm, inhalt)


def marker(nr, x, y):
    rechteck(x, y, M, M, (0, 0, 0))
    for i in range(4):
        for j in range(4):
            if BITS[nr][i * 4 + j] == '1':
                rechteck(x + (j + 1) * Z, y + (i + 1) * Z, Z + 0.02, Z + 0.02, (1, 1, 1))


for k in range(4):
    for i, (x, y) in enumerate([(R, R), (B - R - M, R), (B - R - M, H - R - M), (R, H - R - M)]):
        marker(4 * k + i, x, y)
    text(105, 112, 'Holtcraft Maßblatt', 'SG-Halb', 7)
    text(105, 134, 'Blatt %d' % (k + 1), 'SG-Fett', 14)
    text(105, 146, 'Marker %d–%d' % (4 * k, 4 * k + 3), 'SG', 5)
    text(105, 160, 'In 100 % drucken („Tatsächliche Größe“), nicht „an Seite anpassen“.', 'SG', 3.6)
    text(105, 167, 'Innen mittig auf die Scheibe kleben.', 'SG', 3.6)
    text(105, 174, 'Mehrere Flügel: auf jeden Flügel ein Blatt, egal welches.', 'SG', 3.6)
    linie(55, 188, 155, 188)
    linie(55, 185, 55, 191)
    linie(155, 185, 155, 191)
    text(105, 197, 'Kontrolle: diese Linie ist genau 10 cm lang', 'SG', 3.6)
    c.showPage()
c.save()
print('geschrieben: ' + AUS)
