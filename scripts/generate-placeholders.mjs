/**
 * Generates brand-toned placeholder artwork for the cinematic homepage.
 *
 * These exist so the composition reads correctly before real photography
 * lands. Each is the exact aspect ratio the layout crops to, so swapping in a
 * real photograph changes nothing about the geometry.
 *
 * Two rules govern everything below.
 *
 *   1. NO TEXT. An earlier version painted a caption into the middle of each
 *      file. On the full-bleed chapters — hero, food, final frame — that
 *      caption landed directly underneath the real headline and read as a
 *      typography bug. A placeholder must never put marks where the layout
 *      puts type.
 *
 *   2. COMPOSE, DON'T LABEL. A flat grey box tells you nothing about whether
 *      the layout works. These are drawn scenes — cluster, pack, farm, pan —
 *      with a subject, a light direction and depth of field, so the page can
 *      be judged now and the real shot has something to match.
 *
 * They are NOT brand photography. Shoot direction: docs/BRAND_GUIDELINES.md §5.
 *
 * Only the slots STILL AWAITING a photograph are listed below. As each real
 * .webp lands, delete its placeholder and its entry here — otherwise this
 * script quietly resurrects files the site no longer serves.
 *
 *   node scripts/generate-placeholders.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname

/** NEYORA palette. No blue, no cyan, no neon. */
const C = {
  forest: '#123c2a',
  botanical: '#3f7d3a',
  leaf: '#8baf35',
  golden: '#c6b83a',
  ivory: '#f6f0e3',
  beige: '#d8c9b5',
  earth: '#2b2923',
  ink: '#14120f',
  /* Oyster mushroom flesh — warm greys, never blue-grey. */
  flesh: '#e3d8c6',
  fleshShade: '#a2957f',
  fleshDeep: '#6b6152',
}

/* --------------------------------------------------------------------------
   Deterministic randomness
   Seeded per file so re-running the script produces byte-identical output.
   Without this every run would churn 23 files in git for no visual change.
   -------------------------------------------------------------------------- */
function seeded(str) {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  let a = h >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const n = (v) => Math.round(v * 10) / 10
const lerp = (a, b, t) => a + (b - a) * t

/* --------------------------------------------------------------------------
   Geometry
   -------------------------------------------------------------------------- */

/** Catmull-Rom through a closed ring of points, emitted as cubic beziers. */
function smoothClosed(pts) {
  const len = pts.length
  let d = `M${n(pts[0][0])} ${n(pts[0][1])}`
  for (let i = 0; i < len; i++) {
    const p0 = pts[(i - 1 + len) % len]
    const p1 = pts[i]
    const p2 = pts[(i + 1) % len]
    const p3 = pts[(i + 2) % len]
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += `C${n(c1x)} ${n(c1y)} ${n(c2x)} ${n(c2y)} ${n(p2[0])} ${n(p2[1])}`
  }
  return `${d}Z`
}

/**
 * One oyster mushroom cap, drawn in local coordinates with the stem at the
 * origin and the cap opening toward +x.
 *
 * An oyster cap is a shell, not a dome: narrow where it joins the stem, wide
 * and slightly wavy at the rim. That silhouette is what makes the shape
 * readable at a glance, so the rim radius is modulated rather than circular.
 */
function capOutline(r, spread, rand) {
  const steps = 22
  const phase = rand() * Math.PI * 2
  const pts = [[0, 0]]
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const angle = -spread / 2 + spread * t
    // 0 at the shoulders, 1 at the centre — gives the fan its taper.
    const shoulder = Math.sin(Math.PI * t) ** 0.4
    // A gentle wave so no two caps share an outline.
    const wave = 1 + 0.07 * Math.sin(t * Math.PI * 3.2 + phase)
    const rr = r * (0.34 + 0.66 * shoulder) * wave
    pts.push([rr * Math.cos(angle), rr * Math.sin(angle)])
  }
  return smoothClosed(pts)
}

/** The gill lines. The single detail that makes the shape read as "oyster". */
function gills(r, spread, rand, opacity) {
  const count = 13 + Math.floor(rand() * 5)
  let out = ''
  for (let i = 1; i < count; i++) {
    const t = i / count
    const angle = -spread / 2 + spread * t
    const shoulder = Math.sin(Math.PI * t) ** 0.4
    const reach = r * (0.34 + 0.66 * shoulder) * 0.9
    const start = r * 0.1
    const x1 = start * Math.cos(angle)
    const y1 = start * Math.sin(angle)
    const x2 = reach * Math.cos(angle)
    const y2 = reach * Math.sin(angle)
    // Bow each gill slightly, so they splay rather than radiate mechanically.
    const bow = (rand() - 0.5) * r * 0.06
    const mx = lerp(x1, x2, 0.5) - Math.sin(angle) * bow
    const my = lerp(y1, y2, 0.5) + Math.cos(angle) * bow
    out += `<path d="M${n(x1)} ${n(y1)}Q${n(mx)} ${n(my)} ${n(x2)} ${n(y2)}" fill="none" stroke="${C.fleshDeep}" stroke-width="${n(r * 0.013)}" stroke-linecap="round" opacity="${opacity}"/>`
  }
  return out
}

/** A short tapered stem running away from the cap. */
function stem(r, rand) {
  const w = r * (0.1 + rand() * 0.04)
  const len = r * (0.3 + rand() * 0.25)
  return `<path d="M0 ${n(-w)}C${n(-len * 0.5)} ${n(-w * 0.9)} ${n(-len * 0.8)} ${n(-w * 0.5)} ${n(-len)} 0C${n(-len * 0.8)} ${n(w * 0.5)} ${n(-len * 0.5)} ${n(w * 0.9)} 0 ${n(w)}Z" fill="${C.fleshShade}" opacity="0.5"/>`
}

/**
 * A placed cap: outline, gradient, gills, stem.
 *
 * `depth` 0 is the sharp foreground, 1 the softest background layer. It drives
 * blur, opacity and how far the fill is pulled toward the ground colour —
 * which is what produces depth of field rather than a flat sticker collage.
 */
function cap({ x, y, r, rot, depth, rand, gradId, showGills = true }) {
  const spread = 1.9 + rand() * 0.8
  // Three focal planes, not a continuous ramp. A photograph has a subject in
  // focus; blurring everything even slightly reads as a mistake, not as depth.
  const blur = depth < 0.14 ? '' : ` filter="url(#blur${depth < 0.48 ? 1 : 2})"`
  const opacity = n(lerp(1, 0.34, depth))
  const parts = [
    stem(r, rand),
    `<path d="${capOutline(r, spread, rand)}" fill="url(#${gradId})"/>`,
  ]
  if (showGills && depth < 0.48) parts.push(gills(r, spread, rand, n(lerp(0.55, 0.12, depth * 2))))
  return `<g transform="translate(${n(x)} ${n(y)})rotate(${n(rot)})" opacity="${opacity}"${blur}>${parts.join('')}</g>`
}

/* --------------------------------------------------------------------------
   Shared scaffolding
   -------------------------------------------------------------------------- */

/**
 * Grain as a small repeating tile rather than one canvas-sized feTurbulence.
 *
 * The previous version ran a 4-octave turbulence across the full 2400×1350
 * hero, which the browser has to rasterise before it can paint the LCP image.
 * A 180px tile costs a fraction of that for an indistinguishable result.
 */
function defs({ W, H, bloomA, bloomB, lightX, lightY, seed, capStops }) {
  const blurUnit = Math.min(W, H)
  return `<defs>
<radialGradient id="key" cx="${lightX}" cy="${lightY}" r="78%">
<stop offset="0%" stop-color="${bloomA}" stop-opacity="0.9"/>
<stop offset="48%" stop-color="${bloomA}" stop-opacity="0.22"/>
<stop offset="100%" stop-color="${bloomA}" stop-opacity="0"/>
</radialGradient>
<radialGradient id="fill" cx="82%" cy="92%" r="72%">
<stop offset="0%" stop-color="${bloomB}" stop-opacity="0.6"/>
<stop offset="100%" stop-color="${bloomB}" stop-opacity="0"/>
</radialGradient>
<radialGradient id="vig" cx="50%" cy="46%" r="72%">
<stop offset="55%" stop-color="${C.ink}" stop-opacity="0"/>
<stop offset="100%" stop-color="${C.ink}" stop-opacity="0.55"/>
</radialGradient>
${capStops
  .map(
    (s, i) => `<linearGradient id="cg${i}" x1="1" y1="0.24" x2="0.06" y2="0.86">
<stop offset="0%" stop-color="${s[0]}"/>
<stop offset="52%" stop-color="${s[1]}"/>
<stop offset="100%" stop-color="${s[2]}"/>
</linearGradient>`,
  )
  .join('\n')}
<filter id="blur1" x="-12%" y="-12%" width="124%" height="124%"><feGaussianBlur stdDeviation="${n(blurUnit * 0.005)}"/></filter>
<filter id="blur2" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${n(blurUnit * 0.022)}"/></filter>
<linearGradient id="sear" x1="0.9" y1="0.1" x2="0.1" y2="0.95">
<stop offset="0%" stop-color="${C.golden}"/>
<stop offset="34%" stop-color="#c49a4e"/>
<stop offset="100%" stop-color="#5e4526"/>
</linearGradient>
<linearGradient id="bag" x1="0" y1="0" x2="1" y2="0.2">
<stop offset="0%" stop-color="${C.beige}" stop-opacity="0.72"/>
<stop offset="38%" stop-color="${C.fleshShade}" stop-opacity="0.5"/>
<stop offset="100%" stop-color="${C.earth}" stop-opacity="0.85"/>
</linearGradient>
<filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="${seed}"/><feColorMatrix type="saturate" values="0"/></filter>
<pattern id="grain" width="180" height="180" patternUnits="userSpaceOnUse">
<rect width="180" height="180" filter="url(#noise)"/>
</pattern>
</defs>`
}

function wrap({ W, H, label, body }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}">\n${body}\n</svg>\n`
}

/** Ground, key light, fill light — painted before any subject. */
function ground(W, H, groundColor) {
  return `<rect width="${W}" height="${H}" fill="${groundColor}"/><rect width="${W}" height="${H}" fill="url(#key)"/><rect width="${W}" height="${H}" fill="url(#fill)"/>`
}

/** Vignette and grain — painted after every subject. */
function finish(W, H, grainOpacity = 0.07) {
  return `<rect width="${W}" height="${H}" fill="url(#vig)"/><rect width="${W}" height="${H}" fill="url(#grain)" opacity="${grainOpacity}" style="mix-blend-mode:overlay"/>`
}

/* --------------------------------------------------------------------------
   Scene: a cluster of oyster mushrooms
   -------------------------------------------------------------------------- */
function sceneCluster(spec, rand) {
  const { W, H, subject = 0.34, count = 9, focusX = 0.42, focusY = 0.54 } = spec
  const unit = Math.min(W, H)
  const cx = W * focusX
  const cy = H * focusY
  const caps = []

  for (let i = 0; i < count; i++) {
    /*
     * Back of the cluster first, so nearer caps overlap it naturally. The
     * exponent pushes more caps into the sharp end of the range — a linear
     * ramp left one cap in focus and the frame read as a mistake, not depth.
     */
    const depth = (1 - i / (count - 1)) ** 1.7
    // Distant caps scatter to the edges; the sharp ones gather on the subject.
    const spreadR = unit * subject * (0.3 + depth * 1.5)
    const angle = rand() * Math.PI * 2
    const x = cx + Math.cos(angle) * spreadR * (0.35 + rand() * 0.75)
    const y = cy + Math.sin(angle) * spreadR * (0.3 + rand() * 0.6)
    const r = unit * subject * lerp(1.2, 0.5, depth) * (0.8 + rand() * 0.45)
    // Caps hang off a shared stem base, so they lean toward the cluster centre.
    const rot = (Math.atan2(y - cy, x - cx) * 180) / Math.PI + (rand() - 0.5) * 46
    caps.push(
      cap({
        x,
        y,
        r,
        rot,
        depth,
        rand,
        gradId: `cg${i % 3}`,
      }),
    )
  }

  return caps.join('')
}

/* --------------------------------------------------------------------------
   Scene: the retail pack
   -------------------------------------------------------------------------- */
function scenePack(spec, rand) {
  const { W, H } = spec
  const pw = Math.min(W, H) * 0.52
  const ph = pw * 1.34
  const px = (W - pw) / 2
  const py = (H - ph) / 2 + Math.min(W, H) * 0.02
  const r = pw * 0.03

  // Mushrooms visible through the pack window, drawn before the pack front so
  // the window genuinely reads as a window.
  const windowY = py + ph * 0.3
  const inner = []
  for (let i = 0; i < 5; i++) {
    inner.push(
      cap({
        x: px + pw * (0.22 + rand() * 0.56),
        y: windowY + ph * (0.05 + rand() * 0.2),
        r: pw * (0.14 + rand() * 0.1),
        rot: rand() * 360,
        depth: 0.2 + rand() * 0.3,
        rand,
        gradId: `cg${i % 3}`,
      }),
    )
  }

  return `
<ellipse cx="${n(W / 2)}" cy="${n(py + ph + pw * 0.04)}" rx="${n(pw * 0.62)}" ry="${n(pw * 0.06)}" fill="${C.ink}" opacity="0.28" filter="url(#blur2)"/>
<g>
<rect x="${n(px)}" y="${n(py)}" width="${n(pw)}" height="${n(ph)}" rx="${n(r)}" fill="${C.ivory}" opacity="0.95"/>
<rect x="${n(px)}" y="${n(py)}" width="${n(pw)}" height="${n(ph * 0.26)}" rx="${n(r)}" fill="${C.forest}"/>
<rect x="${n(px + pw * 0.12)}" y="${n(py + ph * 0.115)}" width="${n(pw * 0.5)}" height="${n(ph * 0.012)}" fill="${C.leaf}" opacity="0.9"/>
<rect x="${n(px + pw * 0.12)}" y="${n(py + ph * 0.155)}" width="${n(pw * 0.3)}" height="${n(ph * 0.008)}" fill="${C.beige}" opacity="0.55"/>
<clipPath id="win"><rect x="${n(px + pw * 0.1)}" y="${n(windowY)}" width="${n(pw * 0.8)}" height="${n(ph * 0.42)}" rx="${n(r)}"/></clipPath>
<g clip-path="url(#win)">
<rect x="${n(px + pw * 0.1)}" y="${n(windowY)}" width="${n(pw * 0.8)}" height="${n(ph * 0.42)}" fill="${C.earth}"/>
${inner.join('')}
</g>
<rect x="${n(px + pw * 0.1)}" y="${n(windowY)}" width="${n(pw * 0.8)}" height="${n(ph * 0.42)}" rx="${n(r)}" fill="none" stroke="${C.beige}" stroke-width="${n(pw * 0.006)}" opacity="0.8"/>
<rect x="${n(px + pw * 0.1)}" y="${n(py + ph * 0.8)}" width="${n(pw * 0.44)}" height="${n(ph * 0.05)}" rx="${n(r * 0.5)}" fill="${C.beige}" opacity="0.6"/>
<rect x="${n(px + pw * 0.1)}" y="${n(py + ph * 0.88)}" width="${n(pw * 0.26)}" height="${n(ph * 0.03)}" rx="${n(r * 0.5)}" fill="${C.botanical}" opacity="0.5"/>
<rect x="${n(px)}" y="${n(py)}" width="${n(pw)}" height="${n(ph)}" rx="${n(r)}" fill="none" stroke="${C.fleshShade}" stroke-width="${n(pw * 0.004)}" opacity="0.35"/>
</g>`
}

/* --------------------------------------------------------------------------
   Scene: the growing room — substrate bags hanging in rows, receding
   -------------------------------------------------------------------------- */
function sceneFarm(spec, rand) {
  const { W, H, rows = 3 } = spec
  const out = []

  for (let row = rows - 1; row >= 0; row--) {
    // 1 is the far wall, 0 the row nearest the lens.
    const depth = row / rows
    const bagH = H * lerp(0.62, 0.26, depth)
    const bagW = bagH * 0.22
    const gap = bagW * lerp(2.3, 1.6, depth)
    const y = H * (0.2 + depth * 0.2)
    const countAcross = Math.ceil(W / gap) + 2
    // Offset each row so the columns never line up into a fence.
    const offset = -gap * rand()

    for (let i = 0; i < countAcross; i++) {
      // Bags hang at slightly different heights and lengths, which is what
      // stops a row reading as architecture.
      const jitterY = (rand() - 0.5) * bagH * 0.16
      const h = bagH * (0.82 + rand() * 0.3)
      const x = -gap + i * gap + offset
      const top = y + jitterY
      const blur = depth < 0.14 ? '' : ` filter="url(#blur${depth < 0.48 ? 1 : 2})"`

      // Mushrooms burst from the side of a bag, not the top. Only the front
      // rows carry them — beyond that they would be blur on blur.
      const flushes = []
      if (depth < 0.55) {
        const perBag = 2 + Math.floor(rand() * 3)
        for (let k = 0; k < perBag; k++) {
          const left = rand() > 0.5
          flushes.push(
            cap({
              x: x + (left ? 0 : bagW),
              y: top + h * (0.18 + rand() * 0.64),
              r: bagW * (0.8 + rand() * 0.55),
              rot: left ? 150 + rand() * 60 : -30 + rand() * 60,
              depth: Math.min(0.9, depth + rand() * 0.12),
              rand,
              gradId: `cg${k % 3}`,
            }),
          )
        }
      }

      out.push(
        `<g opacity="${n(lerp(1, 0.3, depth))}"${blur}>
<rect x="${n(x + bagW * 0.44)}" y="${n(top - h * 0.06)}" width="${n(bagW * 0.12)}" height="${n(h * 0.08)}" fill="${C.fleshDeep}" opacity="0.5"/>
<path d="M${n(x)} ${n(top)}h${n(bagW)}v${n(h * 0.86)}q0 ${n(h * 0.14)} ${n(-bagW / 2)} ${n(h * 0.14)}q${n(-bagW / 2)} 0 ${n(-bagW / 2)} ${n(-h * 0.14)}Z" fill="url(#bag)" opacity="${n(lerp(0.9, 0.5, depth))}"/>
<rect x="${n(x + bagW * 0.06)}" y="${n(top + h * 0.05)}" width="${n(bagW * 0.2)}" height="${n(h * 0.8)}" rx="${n(bagW * 0.1)}" fill="${C.ivory}" opacity="${n(lerp(0.26, 0.08, depth))}"/>
${flushes.join('')}
</g>`,
      )
    }
  }
  return out.join('')
}

/* --------------------------------------------------------------------------
   Scene: the pan — torn mushrooms, seared edges, hot light
   -------------------------------------------------------------------------- */
function sceneFood(spec, rand) {
  const { W, H } = spec
  const unit = Math.min(W, H)
  const cx = W * 0.5
  const cy = H * 0.58
  const rx = unit * 0.48
  const ry = rx * 0.6

  /*
   * Few, large, overlapping pieces. An earlier version scattered sixteen small
   * ones, which read as eggs in a pan rather than as torn mushroom. Cooked
   * oyster mushroom is big, irregular and caramelised at the edge.
   */
  const pieces = []
  for (let i = 0; i < 11; i++) {
    const a = rand() * Math.PI * 2
    const d = Math.sqrt(rand()) * 0.66
    pieces.push(
      cap({
        x: cx + Math.cos(a) * rx * d,
        y: cy + Math.sin(a) * ry * d,
        r: unit * (0.1 + rand() * 0.08),
        rot: rand() * 360,
        depth: rand() * 0.2,
        rand,
        gradId: 'sear',
      }),
    )
  }

  return `
<ellipse cx="${n(cx)}" cy="${n(cy + ry * 0.06)}" rx="${n(rx * 1.16)}" ry="${n(ry * 1.16)}" fill="${C.ink}" opacity="0.6" filter="url(#blur2)"/>
<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}" fill="${C.ink}"/>
<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx * 0.97)}" ry="${n(ry * 0.97)}" fill="${C.earth}"/>
<ellipse cx="${n(cx)}" cy="${n(cy - ry * 0.16)}" rx="${n(rx * 0.86)}" ry="${n(ry * 0.74)}" fill="${C.golden}" opacity="0.2" filter="url(#blur2)"/>
${pieces.join('')}
<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx * 0.99)}" ry="${n(ry * 0.99)}" fill="none" stroke="${C.golden}" stroke-width="${n(unit * 0.012)}" opacity="0.22" filter="url(#blur1)"/>
<ellipse cx="${n(cx - rx * 0.28)}" cy="${n(cy - ry * 1.4)}" rx="${n(rx * 0.32)}" ry="${n(ry * 0.8)}" fill="${C.ivory}" opacity="0.06" filter="url(#blur2)"/>
<ellipse cx="${n(cx + rx * 0.22)}" cy="${n(cy - ry * 1.7)}" rx="${n(rx * 0.24)}" ry="${n(ry * 0.66)}" fill="${C.ivory}" opacity="0.045" filter="url(#blur2)"/>`
}

const SCENES = {
  cluster: sceneCluster,
  pack: scenePack,
  farm: sceneFarm,
  food: sceneFood,
}

/* --------------------------------------------------------------------------
   Grading presets — the ground and light each chapter is shot against
   -------------------------------------------------------------------------- */
const dark = {
  groundColor: C.ink,
  bloomA: C.beige,
  bloomB: C.botanical,
  capStops: [
    [C.flesh, C.fleshShade, C.fleshDeep],
    ['#d5c8b2', '#948872', C.earth],
    [C.beige, C.fleshShade, '#5c5446'],
  ],
}
const forest = {
  groundColor: C.forest,
  bloomA: C.leaf,
  bloomB: C.golden,
  capStops: [
    [C.ivory, C.beige, C.fleshShade],
    ['#e6dcc4', '#b3a88c', '#5f6a45'],
    [C.flesh, '#9aa36e', '#3f4a2c'],
  ],
}
const earthy = {
  groundColor: C.earth,
  bloomA: C.golden,
  bloomB: C.botanical,
  capStops: [
    [C.flesh, '#b09877', '#584c3a'],
    [C.beige, C.fleshShade, C.earth],
    ['#e8d9bb', '#a8916d', '#4c4334'],
  ],
}
const pale = {
  groundColor: C.beige,
  bloomA: C.ivory,
  bloomB: C.leaf,
  capStops: [
    [C.ivory, C.beige, C.fleshShade],
    ['#f2ead9', '#c9bda6', '#8d8270'],
    [C.flesh, '#bfb098', '#7b7160'],
  ],
}

const SPECS = [
  // --- Chapter 1: hero. Two crops — portrait carries mobile, landscape desktop.
  /*
   * The hero crops both carry the headline on top of them, so the subject is
   * placed OUT of the type column rather than being scrimmed into submission.
   * Desktop sets type across the left, so the cluster sits right of centre;
   * the phone sets type across the bottom, so it sits high. Real photography
   * has to honour the same framing — it is written into the shot list in
   * docs/BRAND_GUIDELINES.md §5.
   */

  { file: 'images/farm/farm-wide.svg', W: 2400, H: 1350, ...earthy, scene: 'farm',
    label: 'The farm, wide', rows: 5, lightX: '86%', lightY: '12%' },



  // --- Chapter 5: product
  { file: 'images/products/oyster-mushrooms-200g.svg', W: 1800, H: 2250, ...pale, scene: 'pack',
    label: 'Fresh oyster mushrooms, 200 g pack', lightX: '20%', lightY: '12%' },
  { file: 'images/products/oyster-mushrooms-detail.svg', W: 1400, H: 1400, ...pale, scene: 'pack',
    label: 'Pack detail', lightX: '76%', lightY: '18%' },

  { file: 'images/recipes/crispy-oyster-mushroom.svg', W: 2000, H: 1500, ...dark, scene: 'food',
    label: 'Crispy oyster mushrooms', lightX: '68%', lightY: '14%' },
  { file: 'images/recipes/category-quick.svg', W: 1600, H: 1000, ...earthy, scene: 'food',
    label: 'Quick mushroom cooking', lightX: '18%', lightY: '16%' },

  // --- Chapter 7: farm detail
  { file: 'images/farm/harvest-hands.svg', W: 1600, H: 2000, ...earthy, scene: 'cluster',
    label: 'Harvesting by hand', subject: 0.42, count: 8, focusX: 0.46, focusY: 0.58,
    lightX: '80%', lightY: '16%' },
  { file: 'images/farm/substrate.svg', W: 1400, H: 1400, ...earthy, scene: 'farm',
    label: 'Paddy straw and sawdust substrate', rows: 3, lightX: '22%', lightY: '16%' },

  // --- The default social card. Shared to WhatsApp far more than it is seen
  // on the site, so it is composed to survive a 1.91:1 centre crop.
  { file: 'images/hero/oyster-mushroom-hero.svg', W: 1920, H: 1280, ...dark, scene: 'cluster',
    label: 'Fresh oyster mushrooms', subject: 0.3, count: 10, focusX: 0.5, focusY: 0.5,
    lightX: '18%', lightY: '18%' },

  // --- Chapter 9: the final frame
  { file: 'images/hero/final-cta.svg', W: 2400, H: 1500, ...forest, scene: 'cluster',
    label: 'Oyster mushrooms, closing frame', subject: 0.26, count: 10, focusX: 0.72, focusY: 0.56,
    lightX: '18%', lightY: '20%' },
]

for (const spec of SPECS) {
  const rand = seeded(spec.file)
  const seed = Math.floor(rand() * 90) + 1
  const body = [
    defs({ ...spec, seed }),
    ground(spec.W, spec.H, spec.groundColor),
    SCENES[spec.scene](spec, rand),
    finish(spec.W, spec.H),
  ].join('\n')

  const svg = wrap({ W: spec.W, H: spec.H, label: spec.label, body })
  const out = join(ROOT, 'public', spec.file)
  await mkdir(dirname(out), { recursive: true })
  await writeFile(out, svg, 'utf8')
  console.log(
    `  ${String(spec.W).padStart(4)}×${String(spec.H).padEnd(4)}  ${String(
      Math.round(svg.length / 1024),
    ).padStart(3)} KB  ${spec.scene.padEnd(7)}  ${spec.file}`,
  )
}
console.log(`\n${SPECS.length} placeholders written. No text is painted into any of them.`)
