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
BAMBOO_WIDTH = 23
SVG_NS = 'http://www.w3.org/2000/svg'


def glyph(char, box, color, label=False, stroke_width=0):
    item = GLYPHS[('label-' if label else '') + char]
    bx, by, bw, bh = map(float, item['bounds'])
    x, y, w, h = box
    if not item['path'] or min(bw, bh) <= 0:
        raise ValueError(f'Invalid actual glyph outline: {char}')
    scale = min(w / bw, h / bh)
    tx = x + (w - bw * scale) / 2 - bx * scale
    ty = y + (h - bh * scale) / 2 - by * scale
    outline = f' stroke="{color}" stroke-width="{stroke_width/scale:.4f}" stroke-linejoin="round"' if stroke_width else ''
    return f'<path data-character="{char}" d="{item["path"]}" transform="translate({tx:.4f} {ty:.4f}) scale({scale:.5f})" fill="{color}"{outline}/>'


def label(text, x, y, size=21, color=INK):
    return ''.join(glyph(c, (x + i * size, y, size * .88, size), color, True) for i, c in enumerate(text))


def shell():
    return '<rect x="5" y="13" width="150" height="198" rx="11" fill="#d8d2bc"/><rect x="5" y="5" width="150" height="198" rx="11" fill="#fffdf5" stroke="#cecbb9" stroke-width="1.5"/><rect x="10" y="10" width="140" height="188" rx="7" fill="none" stroke="#ffffff" stroke-width="1.5"/>'


def bamboo(x, y, height, color=GREEN, rotation=0, index=0, hollow=True, width=BAMBOO_WIDTH):
    h = height / 2
    # Three rounded lobes on each side surround a clear central channel.
    # Enlarge only the outer contour slightly; retain the6-unit clear channel.
    contour = f'''M0 {-h}
      C6 {-h} 11 {-h*.88} 11 {-h*.72}
      C11 {-h*.52} 7.2 {-h*.5} 7.2 {-h*.38}
      C7.2 {-h*.24} 11 {-h*.2} 11 0
      C11 {h*.2} 7.2 {h*.24} 7.2 {h*.38}
      C7.2 {h*.5} 11 {h*.52} 11 {h*.72}
      C11 {h*.88} 6 {h} 0 {h}
      C-6 {h} -11 {h*.88} -11 {h*.72}
      C-11 {h*.52} -7.2 {h*.5} -7.2 {h*.38}
      C-7.2 {h*.24} -11 {h*.2} -11 0
      C-11 {-h*.2} -7.2 {-h*.24} -7.2 {-h*.38}
      C-7.2 {-h*.5} -11 {-h*.52} -11 {-h*.72}
      C-11 {-h*.88} -6 {-h} 0 {-h}Z'''
    channel = f'<path data-part="hollow" d="M0 {-h+7}V{h-7}" fill="none" stroke="#fffdf5" stroke-width="6" stroke-linecap="round"/>' if hollow else ''
    return f'<g data-pip="{index}" data-representation="hollow-wave-bamboo" data-length="{height}" data-width="{width}" transform="translate({x} {y}) rotate({rotation})"><path data-part="outline" d="{contour}" transform="scale({width/22} 1)" fill="{color}"/>{channel}</g>'


def bird():
    # Uniformly scale the user's SVG motif into the existing tile shell.
    # Paint the closed head last so the chest fill cannot hide its lower edge.
    return '''<g data-pip="1" data-representation="bird" transform="translate(12.6 -4.8) scale(.58)" fill="none" stroke="url(#tiaoOneInkGreen)" stroke-linecap="round" stroke-linejoin="round">
      <defs>
        <linearGradient id="tiaoOneInkGreen" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#2D5A36"/>
          <stop offset="100%" stop-color="#1E4426"/>
        </linearGradient>
      </defs>
      <circle cx="98" cy="70" r="10.5" stroke-width="7.5" fill="#FAFBF7"/>
      <path d="M 107 66 C 122 76, 148 70, 178 58" stroke-width="8.5"/>
      <path d="M 94 81 C 110 80, 132 76, 178 58" stroke-width="6.5"/>
      <path d="M 93 96 L 66 96 L 91 103" stroke-width="6.5" fill="#254F2E"/>
      <path d="M 91 114 C 72 110, 58 118, 62 140 C 66 162, 74 182, 80 198" stroke-width="8.5"/>
      <path d="M 88 122 L 73 142" stroke-width="5.5"/>
      <path d="M 92 135 L 70 162" stroke-width="6"/>
      <path d="M 95 148 L 76 178" stroke-width="6"/>
      <path d="M 97 142 C 94 160, 88 176, 84 190 C 82 200, 96 205, 122 204 C 142 203, 148 196, 149 180 C 151 164, 149 146, 143 136" stroke-width="8.5" fill="#FAFBF7"/>
      <path d="M 114 147 C 114 155, 111 162, 108 166" stroke-width="5.5"/>
      <path d="M 126 148 C 127 156, 126 164, 124 169" stroke-width="5.5"/>
      <path d="M 138 146 C 139 154, 138 161, 136 165" stroke-width="5.5"/>
      <path d="M 147 116 C 162 102, 174 112, 170 134 C 166 154, 156 168, 149 175" stroke-width="8.5"/>
      <circle cx="35" cy="184" r="11.5" stroke-width="8.5" fill="#FAFBF7"/>
      <path d="M 46 189 C 58 195, 70 198, 82 195" stroke-width="8.5"/>
      <path d="M 83 192 C 66 212, 48 228, 28 238 C 46 234, 66 220, 86 196" stroke-width="6.5" fill="#254F2E"/>
      <path d="M 149 178 C 162 183, 176 183, 188 176" stroke-width="8.5"/>
      <circle cx="198" cy="171" r="11" stroke-width="8.5" fill="#FAFBF7"/>
      <g data-part="tail" transform="translate(0 200) scale(1 1.105) translate(0 -200)">
      <path d="M 80 198 C 88 226, 98 258, 106 282" stroke-width="7.5"/>
      <path d="M 96 202 C 106 238, 122 282, 140 314" stroke-width="8.5"/>
      <path d="M 110 204 C 112 225, 114 242, 124 252 C 132 275, 142 300, 148 318" stroke-width="7"/>
      <path d="M 124 205 C 124 218, 125 230, 126 238" stroke-width="5.5"/>
      <path d="M 134 204 C 133 222, 134 242, 136 256" stroke-width="5"/>
      <path d="M 148 188 C 144 224, 144 268, 152 312" stroke-width="8.5"/>
      </g>
      <path d="M 92 88 C 89 105, 90 128, 95 140 C 102 150, 128 150, 140 138 C 152 126, 150 96, 136 82 C 124 72, 100 76, 92 88 Z" stroke-width="8.5" fill="#FAFBF7"/>
      <circle cx="118" cy="112" r="10.5" stroke="#8E3532" stroke-width="6.5" fill="#FAFBF7"/>
    </g>'''


def woven_eight():
    # Retain the approved horizontal span; slightly lengthen only the diagonals.
    vertical_length, diagonal_length, half_span = 76, 67, 44
    rise = math.sqrt(diagonal_length**2 - half_span**2)
    left, right = 80-half_span, 80+half_span
    upper = [(left, 20), (left, 20+vertical_length), (80, 20+vertical_length-rise), (right, 20+vertical_length), (right, 20)]
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
        result += bamboo((x1+x2)/2, (y1+y2)/2, length, GREEN, angle, i+1, hollow=False)
    # Round both the green outer joins and the ivory center along the same
    # curve. Separate circular joint patches would protrude beyond the bends.
    for points in (upper, lower):
        inset = 7 if points is upper else -7
        channel_points = [(points[0][0], points[0][1]+inset), *points[1:-1], (points[-1][0], points[-1][1]+inset)]
        channel = f'M{channel_points[0][0]} {channel_points[0][1]}'
        for i, (x, y) in enumerate(channel_points[1:-1], start=1):
            px, py = channel_points[i-1]
            nx, ny = channel_points[i+1]
            before, after = math.hypot(x-px, y-py), math.hypot(nx-x, ny-y)
            radius = 8
            ax, ay = x+(px-x)*radius/before, y+(py-y)*radius/before
            bx, by = x+(nx-x)*radius/after, y+(ny-y)*radius/after
            result += f'<path data-part="rounded-joint" d="M{ax} {ay}Q{x} {y} {bx} {by}" fill="none" stroke="{GREEN}" stroke-width="{14.4*BAMBOO_WIDTH/22}" stroke-linecap="round" stroke-linejoin="round"/>'
            channel += f'L{ax} {ay}Q{x} {y} {bx} {by}'
        channel += f'L{channel_points[-1][0]} {channel_points[-1][1]}'
        result += f'<path data-part="joined-hollow" d="{channel}" fill="none" stroke="#fffdf5" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>'
    return result + '</g>'


BAMBOO = {
    2: [(80, 61, 0), (80, 151, 0)],
    3: [(80, 58, 0), (49, 147, 0), (111, 147, 0)],
    4: [(52, 61, 0), (108, 61, 0), (52, 149, 0), (108, 149, 0)],
    5: [(47, 59, 0), (113, 59, 0), (80, 105, 0), (47, 151, 0), (113, 151, 0)],
    6: [(43, 59, 0), (80, 59, 0), (117, 59, 0), (43, 151, 0), (80, 151, 0), (117, 151, 0)],
    7: [(80, 47, 0), (43, 105, 0), (43, 163, 0), (80, 105, 0), (80, 163, 0), (117, 105, 0), (117, 163, 0)],
    9: [(x, y, 0) for y in (46, 106, 166) for x in (45, 80, 115)],
}
DOTS = {
    1: [(80, 106, GREEN)],
    2: [(80, 73, GREEN), (80, 141, RED)],
    3: [(45, 53, GREEN), (80, 106, RED), (115, 159, GREEN)],
    4: [(49, 60, GREEN), (111, 60, GREEN), (49, 152, GREEN), (111, 152, GREEN)],
    5: [(46, 61, GREEN), (114, 61, GREEN), (80, 106, RED), (46, 151, GREEN), (114, 151, GREEN)],
    6: [(56, 62, GREEN), (104, 62, GREEN), (56, 114, RED), (104, 114, RED), (56, 158, RED), (104, 158, RED)],
    7: [(44, 55, GREEN), (80, 74, GREEN), (116, 93, GREEN), (57, 131, RED), (103, 131, RED), (57, 169, RED), (103, 169, RED)],
    8: [(x, y, GREEN) for y in (44, 85, 126, 167) for x in (58, 102)],
    9: [(x, y, RED if y == 106 else GREEN) for y in (50, 106, 162) for x in (43, 80, 117)],
}


def dot(x, y, radius, color, index, rosette=False):
    result = f'<g data-pip="{index}" transform="translate({x} {y})"><circle r="{radius}" fill="none" stroke="{color}" stroke-width="3.9"/><circle r="{radius-5}" fill="none" stroke="{color}" stroke-width="1.8"/>'
    if rosette:
        for i in range(12):
            angle = i * 30
            result += f'<path d="M0 -8Q-7 -18 0 -25Q7 -18 0 -8Z" transform="rotate({angle})" fill="none" stroke="{color}" stroke-width="1.65"/>'
        result += f'<circle r="7" fill="{RED}"/><circle r="3" fill="#fffdf5"/>'
    else:
        result += f'<circle r="{radius-9}" fill="none" stroke="{color}" stroke-width="2.7"/><circle r="3.3" fill="{color}"/>'
    return result + '</g>'


def face(suit, rank):
    if suit == 'wan':
        return glyph(NUMBERS[rank-1], (32, 27, 96, 60), INK, stroke_width=1.0) + glyph('萬', (28, 104, 104, 80), RED, stroke_width=2.0)
    if suit == 'tiao':
        if rank == 1:
            return bird()
        if rank == 8:
            return woven_eight()
        # Two-row layouts stay elongated; seven's three rows use equal
        # red/green lengths, with its green pieces longer than the old47.
        height = 76 if 2 <= rank <= 6 else 52 if rank == 7 else 48 if rank == 9 else 52
        return ''.join(bamboo(x, y, height, RED if (rank == 5 and i == 2) or (rank == 7 and i == 0) or (rank == 9 and i % 3 == 1) else GREEN, rot, i+1, width=22 if rank == 9 else BAMBOO_WIDTH) for i, (x, y, rot) in enumerate(BAMBOO[rank]))
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

lengths = f'<svg xmlns="{SVG_NS}" width="960" height="680" viewBox="0 0 960 680"><rect width="960" height="680" fill="#f5f3ed"/>'
lengths += label('麻将牌面校对', 48, 23, 28)
for i, rank in enumerate(range(2, 10)):
    x, y = 28 + (i % 4) * 240, 75 + (i // 4) * 290
    lengths += f'<g transform="translate({x} {y}) scale(1.15)">{tiles[f"tiao-{rank}"]}</g>'
    lengths += label(NUMBERS[rank-1] + '条', x+66, y+261, 22)
lengths += '</svg>'
(OUT / 'tile-bamboo-lengths.svg').write_text(lengths, encoding='utf-8')
print(json.dumps({'tiles':len(manifest),'checks':'27 ranks, correct motif counts, fixed actual glyph outlines, no embedded reference photo','catalog':str(OUT/'tile-catalog.svg')}, ensure_ascii=False))
