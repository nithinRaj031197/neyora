"""Convert text to SVG outline paths so a logo never depends on a webfont."""
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

def outline(font_path, text, size=100, tracking=0.0):
    """Return (path_d, advance_width) with the baseline at y=0, y-down (SVG)."""
    f = TTFont(font_path)
    upm = f['head'].unitsPerEm
    cmap = f.getBestCmap()
    gs = f.getGlyphSet()
    hmtx = f['hmtx']
    scale = size / upm
    parts, x = [], 0.0
    for ch in text:
        gname = cmap.get(ord(ch))
        if gname is None:
            x += size * 0.3
            continue
        pen = SVGPathPen(gs)
        gs[gname].draw(pen)
        d = pen.getCommands()
        if d:
            # y-flip: font space is y-up, SVG is y-down.
            parts.append(f'<g transform="translate({x:.2f} 0) scale({scale:.5f} {-scale:.5f})"><path d="{d}"/></g>')
        x += hmtx[gname][0] * scale + tracking
    return ''.join(parts), x

def flatten(font_path, text, size=100, tracking=0.0):
    """Same, but merged into one <path d> by baking transforms into coordinates."""
    from fontTools.pens.transformPen import TransformPen
    from fontTools.pens.recordingPen import RecordingPen
    from fontTools.misc.transform import Transform
    f = TTFont(font_path)
    upm = f['head'].unitsPerEm
    cmap, gs, hmtx = f.getBestCmap(), f.getGlyphSet(), f['hmtx']
    scale = size / upm
    out, x = [], 0.0
    for ch in text:
        gname = cmap.get(ord(ch))
        if gname is None:
            x += size * 0.3
            continue
        rec = RecordingPen()
        gs[gname].draw(rec)
        pen = SVGPathPen(gs)
        tp = TransformPen(pen, Transform(scale, 0, 0, -scale, x, 0))
        rec.replay(tp)
        d = pen.getCommands()
        if d:
            out.append(d)
        x += hmtx[gname][0] * scale + tracking
    return ' '.join(out), x
