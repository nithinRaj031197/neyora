# Brand artwork

The NEYORA logo is **outlined vector paths**, not live text. Nothing at runtime
loads the typeface it was drawn in.

## Why

The wordmark is set in **Poppins SemiBold** (SIL Open Font License — outlining
it into a logo is permitted commercially). Poppins is deliberately *not* one of
the three faces the site loads (Fraunces, Geist, Geist Mono —
`docs/BRAND_GUIDELINES.md` §3). Converting the glyphs to paths is what keeps
that rule true while still using the face the mark was designed in: the logo
renders identically everywhere, with no font request and no FOUT.

The `o` is replaced by the leaf mark — a circle at the `o`'s exact optical
position (Poppins' `o` is a near-perfect circle, r≈285 centred at 319,277 in
font units) with a pointed-oval leaf inside.

## Output

| File | Use |
| --- | --- |
| `neyora-logo.svg` | Lockup (wordmark + tagline), light grounds |
| `neyora-logo-dark.svg` | Lockup, dark grounds |
| `neyora-wordmark.svg` | Wordmark only, light grounds |
| `neyora-wordmark-dark.svg` | Wordmark only, dark grounds |
| `neyora-mark.svg` | Leaf-in-circle, gradient |
| `neyora-mark-solid.svg` | Leaf-in-circle, single colour |
| `public/icon.svg` | Favicon — simplified, no vein (detail dies below 24px) |

`components/ui/Wordmark.tsx` paints these as CSS `background-image`, which is
what lets the header swap variants as it floats over the hero.

## Regenerating

Only needed if the letterforms or leaf geometry change. Committed output is the
source of truth; this is a one-off tool, not part of the build.

```sh
cd scripts/brand
python3 -m venv .venv && ./.venv/bin/pip install fonttools
curl -sL "$(curl -s -A Mozilla/5.0 \
  'https://fonts.googleapis.com/css2?family=Poppins:wght@600' \
  | grep -oE 'https://[^)]+\.ttf' | head -1)" -o Poppins.ttf
./.venv/bin/python build_logo.py
cp neyora-*.svg ../../public/brand/
```

`.venv/`, `Poppins.ttf` and the generated `*.svg` here are all disposable.
