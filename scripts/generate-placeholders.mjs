/**
 * Generates brand-toned SVG placeholders for the seeded demo content.
 *
 * These exist so a fresh install is never a page of grey boxes. They are NOT
 * brand photography — replace them with real shots via Admin -> Media Library.
 * Direction for the real photographs lives in docs/BRAND_GUIDELINES.md.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname

/** NEYORA palette — no blue, no cyan, no neon. */
const PALETTE = {
  forest: '#123C2A',
  botanical: '#3F7D3A',
  leaf: '#8BAF35',
  golden: '#C6B83A',
  ivory: '#F6F0E3',
  beige: '#D8C9B5',
  earth: '#2B2923',
}

/**
 * A deterministic, low-contrast organic wash. Two soft radial blooms over a
 * flat ground reads as "photograph not yet loaded" rather than "broken image".
 */
function placeholder({ width, height, ground, bloomA, bloomB, label, caption }) {
  const id = Math.abs([...label].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7))
  const titleSize = Math.round(Math.min(width, height) * 0.052)
  const capSize = Math.max(9, Math.round(titleSize * 0.42))
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${label} — demo placeholder">
  <defs>
    <radialGradient id="a${id}" cx="18%" cy="22%" r="78%">
      <stop offset="0%" stop-color="${bloomA}" stop-opacity="0.92"/>
      <stop offset="100%" stop-color="${bloomA}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="b${id}" cx="84%" cy="88%" r="72%">
      <stop offset="0%" stop-color="${bloomB}" stop-opacity="0.78"/>
      <stop offset="100%" stop-color="${bloomB}" stop-opacity="0"/>
    </radialGradient>
    <filter id="g${id}" x="-6%" y="-6%" width="112%" height="112%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="${id % 97}"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.055"/></feComponentTransfer>
    </filter>
  </defs>
  <rect width="${width}" height="${height}" fill="${ground}"/>
  <rect width="${width}" height="${height}" fill="url(#a${id})"/>
  <rect width="${width}" height="${height}" fill="url(#b${id})"/>
  <rect width="${width}" height="${height}" filter="url(#g${id})" opacity="0.9"/>
  <g font-family="Fraunces, Georgia, serif" text-anchor="middle">
    <text x="50%" y="${height / 2}" font-size="${titleSize}" font-weight="500"
          fill="${PALETTE.ivory}" opacity="0.9" letter-spacing="${titleSize * 0.06}">${label}</text>
  </g>
  <text x="50%" y="${height / 2 + titleSize * 1.5}" text-anchor="middle"
        font-family="Inter, system-ui, sans-serif" font-size="${capSize}" font-weight="500"
        fill="${PALETTE.ivory}" opacity="0.55" letter-spacing="${capSize * 0.22}">${caption}</text>
</svg>
`
}

const SPECS = [
  // hero
  { file: 'images/hero/oyster-mushroom-hero.svg', width: 1920, height: 1280,
    ground: PALETTE.forest, bloomA: PALETTE.botanical, bloomB: PALETTE.golden,
    label: 'HERO', caption: 'REPLACE WITH BRAND PHOTOGRAPHY' },
  // farm
  { file: 'images/farm/growing-room.svg', width: 1600, height: 1200,
    ground: PALETTE.earth, bloomA: PALETTE.botanical, bloomB: PALETTE.beige,
    label: 'OUR FARM', caption: 'DEMO PLACEHOLDER' },
  { file: 'images/farm/harvest-hands.svg', width: 1400, height: 1050,
    ground: PALETTE.forest, bloomA: PALETTE.leaf, bloomB: PALETTE.beige,
    label: 'HARVEST', caption: 'DEMO PLACEHOLDER' },
  // products
  { file: 'images/products/oyster-mushrooms-200g.svg', width: 1400, height: 1400,
    ground: PALETTE.beige, bloomA: PALETTE.ivory, bloomB: PALETTE.botanical,
    label: 'FRESH OYSTER MUSHROOMS', caption: '200 G — DEMO PLACEHOLDER' },
  { file: 'images/products/oyster-mushrooms-detail.svg', width: 1400, height: 1400,
    ground: PALETTE.ivory, bloomA: PALETTE.beige, bloomB: PALETTE.leaf,
    label: 'PACK DETAIL', caption: 'DEMO PLACEHOLDER' },
  // mushrooms / texture
  { file: 'images/mushrooms/cluster-closeup.svg', width: 1400, height: 1750,
    ground: PALETTE.earth, bloomA: PALETTE.beige, bloomB: PALETTE.botanical,
    label: 'CLUSTER', caption: 'DEMO PLACEHOLDER' },
  // recipes
  { file: 'images/recipes/garlic-butter-oyster-mushrooms.svg', width: 1600, height: 1200,
    ground: PALETTE.earth, bloomA: PALETTE.golden, bloomB: PALETTE.botanical,
    label: 'GARLIC BUTTER', caption: 'DEMO PLACEHOLDER' },
  { file: 'images/recipes/pepper-oyster-mushroom-fry.svg', width: 1600, height: 1200,
    ground: PALETTE.forest, bloomA: PALETTE.golden, bloomB: PALETTE.earth,
    label: 'PEPPER FRY', caption: 'DEMO PLACEHOLDER' },
  { file: 'images/recipes/crispy-oyster-mushroom.svg', width: 1600, height: 1200,
    ground: PALETTE.beige, bloomA: PALETTE.golden, bloomB: PALETTE.earth,
    label: 'CRISPY', caption: 'DEMO PLACEHOLDER' },
  { file: 'images/recipes/category-quick.svg', width: 1200, height: 800,
    ground: PALETTE.botanical, bloomA: PALETTE.leaf, bloomB: PALETTE.forest,
    label: 'UNDER 15 MINUTES', caption: 'DEMO PLACEHOLDER' },
  // social / cta
  { file: 'images/hero/final-cta.svg', width: 1800, height: 900,
    ground: PALETTE.forest, bloomA: PALETTE.botanical, bloomB: PALETTE.golden,
    label: 'GROWN FOR LIFE.', caption: 'DEMO PLACEHOLDER' },
]

for (const spec of SPECS) {
  const out = join(ROOT, 'public', spec.file)
  await mkdir(dirname(out), { recursive: true })
  await writeFile(out, placeholder(spec), 'utf8')
  console.log('wrote', spec.file)
}
