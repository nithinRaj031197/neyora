/**
 * Generates brand-toned placeholders for the cinematic homepage.
 *
 * These exist so the composition reads correctly before real photography
 * lands — each is the exact aspect ratio the layout crops to, so swapping in
 * a real photograph changes nothing about the geometry.
 *
 * They are NOT brand photography. Shoot direction: docs/BRAND_GUIDELINES.md §5.
 *
 *   node scripts/generate-placeholders.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname

/** NEYORA palette. No blue, no cyan, no neon. */
const C = {
  forest: '#123C2A',
  botanical: '#3F7D3A',
  leaf: '#8BAF35',
  golden: '#C6B83A',
  ivory: '#F6F0E3',
  beige: '#D8C9B5',
  earth: '#2B2923',
  ink: '#14120F',
}

/**
 * A cinematic wash: a dark ground, two soft blooms, a directional light from
 * one edge, and film grain. Reads as "photograph not yet loaded" rather than
 * "broken image", and at the right aspect ratio the layout looks finished.
 */
function placeholder({ width, height, ground, bloomA, bloomB, label, caption, light = 'left' }) {
  const id = Math.abs([...label].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7)) % 9973
  const titleSize = Math.round(Math.min(width, height) * 0.058)
  const capSize = Math.max(9, Math.round(titleSize * 0.36))

  const lightX = light === 'left' ? '6%' : light === 'right' ? '94%' : '50%'

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${label} — placeholder">
  <defs>
    <radialGradient id="a${id}" cx="${lightX}" cy="16%" r="86%">
      <stop offset="0%" stop-color="${bloomA}" stop-opacity="0.95"/>
      <stop offset="55%" stop-color="${bloomA}" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="${bloomA}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="b${id}" cx="80%" cy="92%" r="76%">
      <stop offset="0%" stop-color="${bloomB}" stop-opacity="0.72"/>
      <stop offset="100%" stop-color="${bloomB}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="v${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${C.ink}" stop-opacity="0.34"/>
      <stop offset="42%" stop-color="${C.ink}" stop-opacity="0"/>
      <stop offset="100%" stop-color="${C.ink}" stop-opacity="0.52"/>
    </linearGradient>
    <filter id="g${id}" x="-4%" y="-4%" width="108%" height="108%">
      <feTurbulence type="fractalNoise" baseFrequency="0.86" numOctaves="4" seed="${id % 97}"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.07"/></feComponentTransfer>
    </filter>
  </defs>

  <rect width="${width}" height="${height}" fill="${ground}"/>
  <rect width="${width}" height="${height}" fill="url(#a${id})"/>
  <rect width="${width}" height="${height}" fill="url(#b${id})"/>
  <rect width="${width}" height="${height}" fill="url(#v${id})"/>
  <rect width="${width}" height="${height}" filter="url(#g${id})" opacity="0.85"/>

  <text x="50%" y="${height / 2}" text-anchor="middle"
        font-family="Fraunces, Georgia, serif" font-size="${titleSize}" font-weight="500"
        fill="${C.ivory}" opacity="0.88" letter-spacing="${titleSize * 0.05}">${label}</text>
  <text x="50%" y="${height / 2 + titleSize * 1.55}" text-anchor="middle"
        font-family="Inter, system-ui, sans-serif" font-size="${capSize}" font-weight="500"
        fill="${C.ivory}" opacity="0.5" letter-spacing="${capSize * 0.24}">${caption}</text>
</svg>
`
}

const dark = { ground: C.ink, bloomA: C.beige, bloomB: C.botanical }
const forest = { ground: C.forest, bloomA: C.leaf, bloomB: C.golden }
const earthy = { ground: C.earth, bloomA: C.golden, bloomB: C.botanical }
const pale = { ground: C.beige, bloomA: C.ivory, bloomB: C.leaf }

const SPECS = [
  // --- Chapter 1: hero. Two crops — portrait carries mobile, landscape desktop.
  { file: 'images/hero/hero-desktop.svg', width: 2400, height: 1350, ...dark,
    label: 'HERO', caption: 'REPLACE WITH BRAND PHOTOGRAPHY' },
  { file: 'images/hero/hero-mobile.svg', width: 1200, height: 1800, ...dark,
    label: 'HERO', caption: 'MOBILE CROP' },

  // --- Chapter 2: close → cluster → growing room → farm
  { file: 'images/mushrooms/cap-macro.svg', width: 1600, height: 2000, ...dark,
    label: 'CAP', caption: 'MACRO — SINGLE CAP' },
  { file: 'images/mushrooms/cluster.svg', width: 1800, height: 1800, ...dark,
    label: 'CLUSTER', caption: 'WHOLE CLUSTER' },
  { file: 'images/farm/growing-room.svg', width: 2000, height: 1250, ...earthy,
    label: 'GROWING ROOM', caption: 'SUBSTRATE BAGS, DAYLIGHT' },
  { file: 'images/farm/farm-wide.svg', width: 2400, height: 1350, ...earthy,
    label: 'THE FARM', caption: 'WIDE, ATMOSPHERIC' },

  // --- Chapter 3: the macro moment. Gills, texture, moisture.
  { file: 'images/mushrooms/gills-macro.svg', width: 2000, height: 2500, ...dark,
    label: 'GILLS', caption: 'MACRO — TEXTURE, MOISTURE', light: 'right' },

  // --- Chapter 4: the journey
  { file: 'images/journey/grown.svg', width: 1400, height: 1750, ...forest,
    label: '01 GROWN', caption: 'PLACEHOLDER' },
  { file: 'images/journey/harvested.svg', width: 1400, height: 1750, ...earthy,
    label: '02 HARVESTED', caption: 'HANDS AT HARVEST' },
  { file: 'images/journey/packed.svg', width: 1400, height: 1750, ...pale,
    label: '03 PACKED', caption: 'THE 200 G PACK' },
  { file: 'images/journey/table.svg', width: 1400, height: 1750, ...dark,
    label: '04 AT YOUR TABLE', caption: 'COOKED, PLATED' },

  // --- Chapter 5: product
  { file: 'images/products/oyster-mushrooms-200g.svg', width: 1800, height: 2250, ...pale,
    label: 'FRESH OYSTER MUSHROOMS', caption: '200 G PACK — HERO SHOT' },
  { file: 'images/products/oyster-mushrooms-detail.svg', width: 1400, height: 1400, ...pale,
    label: 'PACK DETAIL', caption: 'HARVEST DATE PANEL' },
  { file: 'images/mushrooms/cluster-closeup.svg', width: 1400, height: 1750, ...dark,
    label: 'IN THE HAND', caption: 'SCALE AND TEXTURE' },

  // --- Chapter 6: food
  { file: 'images/recipes/garlic-butter-oyster-mushrooms.svg', width: 2000, height: 1500, ...dark,
    label: 'GARLIC BUTTER', caption: 'CAST IRON, GOLDEN EDGES' },
  { file: 'images/recipes/pepper-oyster-mushroom-fry.svg', width: 1600, height: 2000, ...earthy,
    label: 'PEPPER FRY', caption: 'CURRY LEAVES, COARSE PEPPER' },
  { file: 'images/recipes/crispy-oyster-mushroom.svg', width: 2000, height: 1500, ...dark,
    label: 'CRISPY', caption: 'SHATTERING CRUST, LIME' },
  { file: 'images/recipes/category-quick.svg', width: 1600, height: 1000, ...earthy,
    label: 'UNDER 15 MINUTES', caption: 'PLACEHOLDER' },
  { file: 'images/food/food-wide.svg', width: 2400, height: 1200, ...dark,
    label: 'THE TABLE', caption: 'FULL-BLEED FOOD MOMENT' },

  // --- Chapter 7: farm detail
  { file: 'images/farm/harvest-hands.svg', width: 1600, height: 2000, ...earthy,
    label: 'HARVEST', caption: "A GROWER'S HANDS" },
  { file: 'images/farm/substrate.svg', width: 1400, height: 1400, ...earthy,
    label: 'SUBSTRATE', caption: 'PADDY STRAW, SAWDUST' },

  // --- Chapter 9: the final frame
  { file: 'images/hero/final-cta.svg', width: 2400, height: 1500, ...forest,
    label: 'BRING GOODNESS HOME', caption: 'FINAL FRAME' },
]

for (const spec of SPECS) {
  const out = join(ROOT, 'public', spec.file)
  await mkdir(dirname(out), { recursive: true })
  await writeFile(out, placeholder(spec), 'utf8')
  console.log(`  ${String(spec.width).padStart(4)}×${String(spec.height).padEnd(4)}  ${spec.file}`)
}
console.log(`\n${SPECS.length} placeholders written.`)
