"""Build the NEYORA logo lockup as outlined SVG paths (no webfont dependency)."""
import sys; sys.path.insert(0, '.')
from outline import flatten
from fontTools.ttLib import TTFont

FONT, SIZE = 'Poppins.ttf', 120.0
f = TTFont(FONT); UPM = f['head'].unitsPerEm
cmap, hmtx = f.getBestCmap(), f['hmtx']
S = SIZE / UPM
adv = lambda ch: hmtx[cmap[ord(ch)]][0] * S

C = dict(forest='#123C2A', botanical='#3F7D3A', leaf='#8BAF35',
         golden='#C6B83A', ivory='#F6F0E3', beige='#D8C9B5', earth='#2B2923')

# --- wordmark: "Ney" + [leaf-o] + "ra" ------------------------------------
d_ney, w_ney = flatten(FONT, 'Ney', SIZE)
d_ra,  w_ra  = flatten(FONT, 'ra',  SIZE)
w_o = adv('o')

# The 'o' reads as a circle: bounds x 34..604, y -9..563 in font units.
OCX, OCY, OR = 319 * S, 277 * S, 285 * S
ocx, ocy = w_ney + OCX, -OCY          # SVG y-down, baseline at 0
total_w = w_ney + w_o + w_ra

def leaf(cx, cy, r, fill, vein):
    """A pointed-oval leaf, tip up-right.

    Built from an axis (base -> tip) with both arcs bowed perpendicular to it,
    so the body stays fat enough to read as a leaf at 24px rather than
    collapsing into a sliver.
    """
    bx, by = cx - 0.58 * r, cy + 0.58 * r      # base, lower-left
    tx, ty = cx + 0.62 * r, cy - 0.62 * r      # tip, upper-right
    ax, ay = tx - bx, ty - by                  # axis
    ux, uy = 0.7071, 0.7071                    # unit perpendicular
    # A cubic reaches only ~3/4 of its control offset, so d is set for a
    # finished width of ~0.9r — a leaf of roughly 1.8:1, not a sliver.
    d = 0.62 * r
    def pt(t, sign):
        return (bx + t * ax + sign * d * ux, by + t * ay + sign * d * uy)
    c1, c2 = pt(0.28, -1), pt(0.72, -1)        # upper-left arc
    c3, c4 = pt(0.72, +1), pt(0.28, +1)        # lower-right arc
    return (
      f'<path d="M{bx:.2f} {by:.2f}'
      f' C{c1[0]:.2f} {c1[1]:.2f} {c2[0]:.2f} {c2[1]:.2f} {tx:.2f} {ty:.2f}'
      f' C{c3[0]:.2f} {c3[1]:.2f} {c4[0]:.2f} {c4[1]:.2f} {bx:.2f} {by:.2f}Z"'
      f' fill="{fill}"/>'
      f'<path d="M{bx + 0.10 * r:.2f} {by - 0.10 * r:.2f} L{tx - 0.14 * r:.2f} {ty + 0.14 * r:.2f}"'
      f' fill="none" stroke="{vein}" stroke-width="{r * 0.11:.2f}" stroke-linecap="round"/>')

TAG_SIZE, TAG_TRACK = 19.0, 7.2
d_tag, w_tag = flatten(FONT, 'GROWN FOR LIFE.', TAG_SIZE, TAG_TRACK)

PAD, CAP = 16.0, 701 * S
VB_W = max(total_w, w_tag) + PAD * 2
TAG_Y = 46.0
VB_H = CAP + TAG_Y + PAD * 2

def build(dark=False):
    word_fill = 'url(#wm)'
    circle_fill = 'url(#om)'
    leaf_fill = C['ivory'] if not dark else C['forest']
    tag_fill = C['forest'] if not dark else C['beige']
    # Brightest point sits on the leaf mark, as in the reference.
    stops = ([('0%', C['forest']), ('30%', C['botanical']), ('52%', C['leaf']),
              ('68%', C['golden']), ('86%', C['botanical']), ('100%', C['forest'])] if not dark else
             [('0%', C['ivory']), ('34%', C['beige']), ('58%', C['leaf']),
              ('74%', C['golden']), ('100%', C['ivory'])])
    sd = ''.join(f'<stop offset="{o}" stop-color="{c}"/>' for o, c in stops)
    ostops = ([('0%', C['leaf']), ('100%', C['botanical'])] if not dark
              else [('0%', C['golden']), ('100%', C['leaf'])])
    od = ''.join(f'<stop offset="{o}" stop-color="{c}"/>' for o, c in ostops)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {VB_W:.1f} {VB_H:.1f}" role="img" aria-label="NEYORA — GROWN FOR LIFE.">
<defs>
<linearGradient id="wm" x1="0" y1="0" x2="1" y2="0">{sd}</linearGradient>
<linearGradient id="om" x1="0.15" y1="0" x2="0.85" y2="1">{od}</linearGradient>
</defs>
<g transform="translate({PAD:.1f} {PAD + CAP:.1f})">
<path d="{d_ney}" fill="{word_fill}"/>
<circle cx="{ocx:.2f}" cy="{ocy:.2f}" r="{OR:.2f}" fill="{circle_fill}"/>
{leaf(ocx, ocy, OR, leaf_fill, circle_fill if not dark else C['golden'])}
<g transform="translate({w_ney + w_o:.2f} 0)"><path d="{d_ra}" fill="{word_fill}"/></g>
<g transform="translate(0 {TAG_Y:.1f})"><path d="{d_tag}" fill="{tag_fill}"/></g>
</g>
</svg>
'''

def mark(solid=None):
    r, pad = 100.0, 8.0
    size = r * 2 + pad * 2
    cx = cy = r + pad
    fill = solid or 'url(#om)'
    lf = C['ivory'] if solid is None else C['ivory']
    defs = '' if solid else f'<defs><linearGradient id="om" x1="0.15" y1="0" x2="0.85" y2="1"><stop offset="0%" stop-color="{C["leaf"]}"/><stop offset="100%" stop-color="{C["botanical"]}"/></linearGradient></defs>'
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size:.0f} {size:.0f}" role="img" aria-label="NEYORA">
{defs}<circle cx="{cx:.0f}" cy="{cy:.0f}" r="{r:.0f}" fill="{fill}"/>
{leaf(cx, cy, r, lf, fill if not solid else C['ivory'])}
</svg>
'''

open('neyora-logo.svg','w').write(build(False))
open('neyora-logo-dark.svg','w').write(build(True))
open('neyora-mark.svg','w').write(mark())
open('neyora-mark-solid.svg','w').write(mark(C['forest']))
print(f'viewBox {VB_W:.0f}x{VB_H:.0f}  wordmark {total_w:.0f}  tagline {w_tag:.0f}')
