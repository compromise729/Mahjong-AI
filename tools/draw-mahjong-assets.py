"""Draw original numbered Mahjong assets with fixed glyphs and counted motifs."""
from pathlib import Path
import json
import math
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets' / 'tiles'
GLYPHS = json.loads((OUT / 'glyphs.json').read_text(encoding='utf-8-sig'))
NUMBERS = '一二三四五六七八九'
GREEN, RED, INK = '#315b40', '#a8332b', '#25312b'
SVG_NS = 'http://www.w3.org/2000/svg'


def glyph(char, box, color, label=False):
    item = GLYPHS[('label-' if label else '') + char]
    bx, by, bw, bh = map(float, item['bounds'])
    x, y, w, h = box
    if not item['path'] or min(bw, bh) <= 0:
        raise ValueError(f'Invalid actual glyph outline: {char}')
    scale = min(w / bw, h / bh)
    tx = x + (w - bw * scale) / 2 - bx * scale
    ty = y + (h - bh * scale) / 2 - by * scale
    return f'<path data-character="{char}" d="{item["path"]}" transform="translate({tx:.4f} {ty:.4f}) scale({scale:.5f})" fill="{color}"/>'


def label(text, x, y, size=21, color=INK):
    return ''.join(glyph(c, (x + i * size, y, size * .88, size), color, True) for i, c in enumerate(text))


def shell():
    return '<rect x="5" y="13" width="150" height="198" rx="11" fill="#d8d2bc"/><rect x="5" y="5" width="150" height="198" rx="11" fill="#fffdf5" stroke="#cecbb9" stroke-width="1.5"/><rect x="10" y="10" width="140" height="188" rx="7" fill="none" stroke="#ffffff" stroke-width="1.5"/>'


def bamboo(x, y, height, color=GREEN, rotation=0, index=0):
    h = height / 2
    return f'''<g data-pip="{index}" transform="translate({x} {y}) rotate({rotation})">
      <rect x="-8" y="{-h}" width="16" height="{height}" rx="4.6" fill="{color}"/>
      <path d="M-2.8 {-h+3}V{h-3}" stroke="#f4f1da" stroke-width="1.7" opacity=".74"/>
      <path d="M-9 {-h+3}H9 M-9 0H9 M-9 {h-3}H9" fill="none" stroke="{color}" stroke-width="4" stroke-linecap="round"/>
      <path d="M-4.5 {-h+4}H4.5 M-4.5 1H4.5 M-4.5 {h-2}H4.5" fill="none" stroke="#a7b290" stroke-width="1"/>
    </g>'''


def bird():
    return f'''<g data-pip="1" data-representation="bird" stroke="{GREEN}" stroke-linecap="round" stroke-linejoin="round">
      <path d="M27 169Q77 158 131 173" fill="none" stroke-width="5"/>
      <path d="M42 167L43 178 M76 163L74 176 M110 168L108 181" fill="none" stroke-width="2.2"/>
      <path d="M66 133L64 164 M81 136L82 165 M64 164L53 169 M64 164L71 167 M82 165L74 170 M82 165L92 169" fill="none" stroke-width="3.2"/>
      <path d="M70 115Q58 132 41 156Q67 151 78 129Z" fill="#486b48" stroke-width="2"/>
      <path d="M54 137L37 165 M62 137L48 166 M69 136L62 159" fill="none" stroke-width="3"/>
      <path d="M97 60Q116 90 96 124Q86 141 68 135Q49 126 53 99Q58 75 75 64" fill="#f4edd8" stroke-width="5"/>
      <path d="M62 83Q40 99 55 120Q68 132 86 125Q96 100 81 88Q72 82 62 83Z" fill="#557449" stroke-width="3"/>
      <path d="M57 99Q71 96 85 110 M55 106Q70 104 82 117 M58 114Q69 111 76 123" fill="none" stroke="#f4edd8" stroke-width="2"/>
      <path d="M73 63Q69 39 88 35Q104 32 111 49Q116 68 102 76Q88 83 78 72Z" fill="#f4edd8" stroke-width="4"/>
      <path d="M110 52L130 58L112 64" fill="#b5a265" stroke-width="2.5"/>
      <path d="M80 40Q83 25 98 30Q100 35 104 40" fill="none" stroke="{RED}" stroke-width="4"/>
      <circle cx="99" cy="50" r="3" fill="{INK}" stroke="none"/>
      <circle cx="98.1" cy="49" r=".9" fill="#fffdf5" stroke="none"/>
      <path d="M95 71Q90 82 83 88 M91 81Q101 87 101 96" fill="none" stroke-width="2.5"/>
      <path d="M111 177Q124 176 130 186Q116 187 111 177Z M39 170Q25 166 21 153Q36 155 39 170Z" fill="#557449" stroke-width="1.5"/>
    </g>'''


def woven_eight():
    # Eight real, equal-length bamboo pieces, arranged with exact mirror symmetry.
    rise = math.sqrt(52**2 - 40**2)
    upper = [(40, 32), (40, 84), (80, 84-rise), (120, 84), (120, 32)]
    lower = [(x, 209-y) for x, y in upper]
    segments = list(zip(upper, upper[1:])) + list(zip(lower, lower[1:]))
    result = '<g data-representation="woven-eight">'
    for i, ((x1, y1), (x2, y2)) in enumerate(segments):
        length = math.hypot(x2-x1, y2-y1)
        angle = math.degrees(math.atan2(-(x2-x1), y2-y1))
        if angle > 90:
            angle -= 180
        elif angle < -90:
            angle += 180
        result += bamboo((x1+x2)/2, (y1+y2)/2, length, GREEN, angle, i+1)
    return result + '</g>'


BAMBOO = {
    2: [(80, 61, 0), (80, 151, 0)],
    3: [(80, 54, 0), (49, 151, 0), (111, 151, 0)],
    4: [(49, 59, 0), (111, 59, 0), (49, 151, 0), (111, 151, 0)],
    5: [(47, 50, 0), (113, 50, 0), (80, 105, 0), (47, 160, 0), (113, 160, 0)],
    6: [(43, 59, 0), (80, 59, 0), (117, 59, 0), (43, 151, 0), (80, 151, 0), (117, 151, 0)],
    7: [(80, 34, 0), (43, 95, 0), (43, 158, 0), (80, 95, 0), (80, 158, 0), (117, 95, 0), (117, 158, 0)],
    9: [(x, y, 0) for y in (46, 106, 166) for x in (45, 80, 115)],
}
DOTS = {
    1: [(80, 106, GREEN)],
    2: [(80, 73, GREEN), (80, 141, RED)],
    3: [(45, 53, GREEN), (80, 106, RED), (115, 159, GREEN)],
    4: [(49, 60, GREEN), (111, 60, GREEN), (49, 152, GREEN), (111, 152, GREEN)],
    5: [(46, 64, GREEN), (114, 64, GREEN), (80, 106, RED), (46, 148, GREEN), (114, 148, GREEN)],
    6: [(56, 62, GREEN), (104, 62, GREEN), (56, 114, RED), (104, 114, RED), (56, 158, RED), (104, 158, RED)],
    7: [(44, 55, GREEN), (80, 74, GREEN), (116, 93, GREEN), (57, 131, RED), (103, 131, RED), (57, 169, RED), (103, 169, RED)],
    8: [(x, y, GREEN) for y in (44, 85, 126, 167) for x in (58, 102)],
    9: [(x, y, RED if y == 106 else GREEN) for y in (50, 106, 162) for x in (43, 80, 117)],
}


def dot(x, y, radius, color, index, rosette=False):
    result = f'<g data-pip="{index}" transform="translate({x} {y})"><circle r="{radius}" fill="none" stroke="{color}" stroke-width="3.2"/><circle r="{radius-5}" fill="none" stroke="{color}" stroke-width="1.4"/>'
    if rosette:
        for i in range(12):
            angle = i * 30
            result += f'<path d="M0 -8Q-7 -18 0 -25Q7 -18 0 -8Z" transform="rotate({angle})" fill="none" stroke="{color}" stroke-width="1.3"/>'
        result += f'<circle r="7" fill="{RED}"/><circle r="3" fill="#fffdf5"/>'
    else:
        result += f'<circle r="{radius-9}" fill="none" stroke="{color}" stroke-width="2.2"/><circle r="3.3" fill="{color}"/>'
    return result + '</g>'


def face(suit, rank):
    if suit == 'wan':
        return glyph(NUMBERS[rank-1], (32, 27, 96, 60), INK) + glyph('萬', (28, 104, 104, 80), RED)
    if suit == 'tiao':
        if rank == 1:
            return bird()
        if rank == 8:
            return woven_eight()
        height = 56 if rank <= 4 or rank == 6 else 43 if rank in (5, 9) else 34 if rank == 7 else 52
        return ''.join(bamboo(x, y, 47 if rank == 7 and i > 0 else height, RED if (rank == 5 and i == 2) or (rank == 7 and i == 0) or (rank == 9 and i % 3 == 1) else GREEN, rot, i+1) for i, (x, y, rot) in enumerate(BAMBOO[rank]))
    radius = 43 if rank == 1 else 26 if rank == 2 else 22 if rank <= 4 else 20 if rank == 5 else 19 if rank == 6 else 17 if rank == 7 else 16
    return ''.join(dot(x, y, radius, color, i+1, rank == 1) for i, (x, y, color) in enumerate(DOTS[rank]))


def svg(suit, rank, content):
    name = NUMBERS[rank-1] + {'wan':'万','tiao':'条','tong':'筒'}[suit]
    return f'<svg xmlns="{SVG_NS}" viewBox="0 0 160 216" width="160" height="216" data-suit="{suit}" data-rank="{rank}" role="img" aria-label="{name}"><title>{name}</title>{shell()}{content}</svg>'


def verify(path, suit, rank):
    root = ET.parse(path).getroot()
    assert root.get('data-suit') == suit and int(root.get('data-rank')) == rank
    assert not list(root.iter(f'{{{SVG_NS}}}text')), 'Glyphs must be fixed outlines.'
    if suit == 'wan':
        chars = [p.get('data-character') for p in root.iter(f'{{{SVG_NS}}}path') if p.get('data-character')]
        assert chars == [NUMBERS[rank-1], '萬'], chars
    else:
        pips = [p for p in root.iter(f'{{{SVG_NS}}}g') if p.get('data-pip')]
        assert len(pips) == rank, f'{path.name}: {len(pips)} motifs instead of {rank}'
        assert [int(p.get('data-pip')) for p in pips] == list(range(1, rank+1))
    assert not any(root.iter(f'{{{SVG_NS}}}image')), 'Original drawing must not embed the reference photo.'


manifest = []
tiles = {}
for suit in ('wan', 'tiao', 'tong'):
    for rank in range(1, 10):
        name = f'{suit}-{rank}'
        body = shell() + face(suit, rank)
        path = OUT / f'{name}.svg'
        path.write_text(svg(suit, rank, face(suit, rank)), encoding='utf-8')
        verify(path, suit, rank)
        tiles[name] = body
        manifest.append({'id':name,'suit':suit,'rank':rank,'label':NUMBERS[rank-1]+{'wan':'万','tiao':'条','tong':'筒'}[suit],'file':path.name,'motif_count':rank if suit != 'wan' else None,'width':160,'height':216})

back = shell() + '<rect x="11" y="11" width="138" height="186" rx="7" fill="#67866f"/><rect x="18" y="18" width="124" height="172" rx="5" fill="none" stroke="#aabd9f" stroke-width="1.7"/>'
back += '<circle cx="80" cy="105" r="41" fill="none" stroke="#aabd9f" stroke-width="2"/><circle cx="80" cy="105" r="34" fill="none" stroke="#aabd9f" stroke-width="1"/>'
for angle in range(0, 360, 45):
    back += f'<path d="M80 105Q54 84 80 68Q106 84 80 105Z" transform="rotate({angle} 80 105)" fill="none" stroke="#aabd9f" stroke-width="1.1"/>'
(OUT / 'back.svg').write_text(f'<svg xmlns="{SVG_NS}" viewBox="0 0 160 216" width="160" height="216" role="img" aria-label="牌背">{back}</svg>', encoding='utf-8')
(OUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')

# This is an asset contact sheet, not the application interface.
catalog = f'<svg xmlns="{SVG_NS}" width="1780" height="1080" viewBox="0 0 1780 1080"><rect width="1780" height="1080" fill="#f5f3ed"/>'
catalog += label('四川麻将牌面校对', 68, 46, 36)
catalog += label('原创绘制', 1486, 55, 23, GREEN)
catalog += '<path d="M68 112H1712" stroke="#d7d8cd" stroke-width="1"/>'
for row, suit in enumerate(('wan', 'tiao', 'tong')):
    start_y = 154 + row * 282
    catalog += label({'wan':'万','tiao':'条','tong':'筒'}[suit], 31, start_y+91, 27, GREEN)
    for rank in range(1, 10):
        x = 81 + (rank-1) * 183
        name = f'{suit}-{rank}'
        catalog += f'<g transform="translate({x} {start_y})">{tiles[name]}</g>'
        catalog += label(manifest[row*9+rank-1]['label'], x+56, start_y+227, 22)
catalog += label('清晰独立素材', 69, 1028, 19, GREEN)
catalog += label('数字图案逐张核验', 1410, 1028, 19, GREEN)
catalog += '</svg>'
(OUT / 'tile-catalog.svg').write_text(catalog, encoding='utf-8')

# Focused proof of the requested revisions, at a larger scale than the full sheet.
focused = f'<svg xmlns="{SVG_NS}" width="1540" height="650" viewBox="0 0 1540 650"><rect width="1540" height="650" fill="#f5f3ed"/>'
focused += label('麻将牌面校对', 49, 32, 31)
for i, name in enumerate(('tiao-8', 'tiao-7', 'tiao-9', 'tong-5', 'tong-6', 'tong-7', 'tong-8')):
    x = 43 + i * 212
    focused += f'<g transform="translate({x} 114) scale(1.21)">{tiles[name]}</g>'
    item = next(t for t in manifest if t['id'] == name)
    focused += label(item['label'], x+68, 398, 27)
focused += label('条', 58, 493, 25, GREEN)
for i, rank in enumerate(range(2, 8)):
    focused += f'<g transform="translate({145+i*177} 465) scale(.62)">{tiles[f"tiao-{rank}"]}</g>'
focused += '</svg>'
(OUT / 'tile-revisions.svg').write_text(focused, encoding='utf-8')

latest = f'<svg xmlns="{SVG_NS}" width="1080" height="500" viewBox="0 0 1080 500"><rect width="1080" height="500" fill="#f5f3ed"/>'
latest += label('麻将牌面校对', 53, 30, 29)
for i, name in enumerate(('tiao-8', 'tiao-7', 'tong-5', 'tong-6')):
    x = 65+i*255
    latest += f'<g transform="translate({x} 111) scale(1.25)">{tiles[name]}</g>'
    item = next(t for t in manifest if t['id'] == name)
    latest += label(item['label'], x+71, 407, 28)
latest += '</svg>'
(OUT / 'tile-corrections-v3.svg').write_text(latest, encoding='utf-8')
print(json.dumps({'tiles':len(manifest),'checks':'27 ranks, correct motif counts, fixed actual glyph outlines, no embedded reference photo','catalog':str(OUT/'tile-catalog.svg')}, ensure_ascii=False))
