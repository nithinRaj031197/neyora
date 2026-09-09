-- ============================================================================
-- NEYORA — 0007  Seed content
--
-- Everything inserted here is flagged `is_demo = true` (where the column
-- exists) and shows a "Demo" badge in the admin. Replace it with real content,
-- then run `select public.purge_demo_content();` to clear the leftovers.
--
-- The seeded media rows point at the brand-toned SVG placeholders committed
-- under /public/images (bucket = 'local'). They are NOT brand photography.
-- Shoot direction: docs/BRAND_GUIDELINES.md §5.
--
-- Idempotent: safe to re-run.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Media (demo placeholders — bucket 'local' means "a file committed to /public")
-- ----------------------------------------------------------------------------
insert into public.media (id, bucket, path, public_url, mime_type, width, height, alt, title, folder, is_demo)
values
  ('11111111-0000-4000-8000-000000000001', 'local', 'images/hero/oyster-mushroom-hero.svg',
   '/images/hero/oyster-mushroom-hero.svg', 'image/svg+xml', 1920, 1280,
   'Clusters of fresh grey oyster mushrooms on raw linen in soft morning light',
   'Hero — oyster mushroom clusters', 'demo', true),

  ('11111111-0000-4000-8000-000000000002', 'local', 'images/farm/growing-room.svg',
   '/images/farm/growing-room.svg', 'image/svg+xml', 1600, 1200,
   'Rows of substrate bags in the NEYORA growing room, daylight through an open doorway',
   'Farm — growing room', 'demo', true),

  ('11111111-0000-4000-8000-000000000003', 'local', 'images/farm/harvest-hands.svg',
   '/images/farm/harvest-hands.svg', 'image/svg+xml', 1400, 1050,
   'A grower''s hands lifting a cluster of oyster mushrooms at harvest',
   'Farm — harvest', 'demo', true),

  ('11111111-0000-4000-8000-000000000004', 'local', 'images/products/oyster-mushrooms-200g.svg',
   '/images/products/oyster-mushrooms-200g.svg', 'image/svg+xml', 1400, 1400,
   'A 200 g punnet of fresh NEYORA grey oyster mushrooms on a warm ivory surface',
   'Product — Fresh Oyster Mushrooms 200 g', 'demo', true),

  ('11111111-0000-4000-8000-000000000005', 'local', 'images/products/oyster-mushrooms-detail.svg',
   '/images/products/oyster-mushrooms-detail.svg', 'image/svg+xml', 1400, 1400,
   'Close detail of the NEYORA 200 g pack showing the harvest date panel',
   'Product — pack detail', 'demo', true),

  ('11111111-0000-4000-8000-000000000006', 'local', 'images/mushrooms/cluster-closeup.svg',
   '/images/mushrooms/cluster-closeup.svg', 'image/svg+xml', 1400, 1750,
   'Macro detail of oyster mushroom gills and cap edges',
   'Texture — cluster close-up', 'demo', true),

  ('11111111-0000-4000-8000-000000000011', 'local', 'images/recipes/garlic-butter-oyster-mushrooms.svg',
   '/images/recipes/garlic-butter-oyster-mushrooms.svg', 'image/svg+xml', 1600, 1200,
   'Garlic butter oyster mushrooms searing golden in a cast-iron pan',
   'Recipe — Garlic Butter Oyster Mushrooms', 'demo', true),

  ('11111111-0000-4000-8000-000000000012', 'local', 'images/recipes/pepper-oyster-mushroom-fry.svg',
   '/images/recipes/pepper-oyster-mushroom-fry.svg', 'image/svg+xml', 1600, 1200,
   'Pepper oyster mushroom fry with curry leaves in a dark ceramic bowl',
   'Recipe — Pepper Oyster Mushroom Fry', 'demo', true),

  ('11111111-0000-4000-8000-000000000013', 'local', 'images/recipes/crispy-oyster-mushroom.svg',
   '/images/recipes/crispy-oyster-mushroom.svg', 'image/svg+xml', 1600, 1200,
   'Crispy battered oyster mushrooms piled on brown paper with a lime wedge',
   'Recipe — Crispy Oyster Mushroom', 'demo', true),

  ('11111111-0000-4000-8000-000000000014', 'local', 'images/recipes/category-quick.svg',
   '/images/recipes/category-quick.svg', 'image/svg+xml', 1200, 800,
   'A pan of mushrooms cooking quickly over high heat',
   'Category — Under 15 minutes', 'demo', true),

  ('11111111-0000-4000-8000-000000000021', 'local', 'images/hero/final-cta.svg',
   '/images/hero/final-cta.svg', 'image/svg+xml', 1800, 900,
   'Fresh produce laid out on a linen cloth, warm daylight',
   'Closing call to action', 'demo', true)
on conflict (id) do nothing;


-- ----------------------------------------------------------------------------
-- Site settings (singleton)
-- ----------------------------------------------------------------------------
insert into public.site_settings (
  id, brand_name, tagline, brand_description,
  contact_email, contact_phone, whatsapp_number, whatsapp_message,
  address_line1, city, state, postal_code, country, business_hours,
  footer_tagline, footer_note, copyright_holder,
  default_seo_title, default_seo_description, default_og_image_id,
  organization_legal_name
)
values (
  1,
  'NEYORA',
  'GROWN FOR LIFE.',
  'NEYORA grows fresh, natural food with care — starting with oyster mushrooms harvested the morning they ship.',
  'hello@neyora.com',
  '+91 00000 00000',
  '910000000000',
  'Hi NEYORA, I would like to know more about your fresh produce.',
  'Update this address in Admin → Site Settings',
  'Bengaluru', 'Karnataka', '560001', 'India',
  'Monday to Saturday, 8am – 6pm IST',
  'Fresh food, grown with care.',
  'NEYORA is a natural-food brand. Our first crop is fresh oyster mushrooms.',
  'NEYORA',
  'NEYORA — Fresh Natural Food',
  'NEYORA grows fresh, natural food with care. Premium oyster mushrooms, harvested to order and delivered at their best.',
  '11111111-0000-4000-8000-000000000001',
  'NEYORA Naturals'
)
on conflict (id) do nothing;


-- ----------------------------------------------------------------------------
-- Homepage (singleton) — every string below is editable in Admin → Homepage
-- ----------------------------------------------------------------------------
insert into public.homepage (
  id,
  hero_eyebrow, hero_headline, hero_subheadline, hero_description,
  hero_image_id, hero_image_caption,
  hero_cta_label, hero_cta_href, hero_secondary_cta_label, hero_secondary_cta_href,
  products_eyebrow, products_heading, products_description, products_cta_label, products_cta_href,
  why_eyebrow, why_heading, why_description, why_pillars,
  farm_eyebrow, farm_heading, farm_description, farm_body, farm_image_id, farm_cta_label, farm_cta_href,
  recipes_eyebrow, recipes_heading, recipes_description, recipes_cta_label, recipes_cta_href,
  community_eyebrow, community_heading, community_description,
  social_eyebrow, social_heading, social_description, social_handle,
  final_cta_eyebrow, final_cta_heading, final_cta_description, final_cta_label, final_cta_href, final_cta_image_id,
  section_visibility, seo_title, seo_description, og_image_id
)
values (
  1,
  'Natural food, grown with care',
  'NEYORA',
  'GROWN FOR LIFE.',
  'Fresh food grown with care. We start each day in the growing rooms and finish it packing what was ready — nothing sits waiting for an order.',
  '11111111-0000-4000-8000-000000000001',
  'Grey oyster mushrooms, picked at first light.',
  'Explore our products', '/products',
  'Discover our recipes', '/recipes',

  'What we grow',
  'Harvested to order, never to stock',
  'One crop today, more to come. Everything we grow is held to the same standard — picked at its peak, cooled straight away, and moved quickly.',
  'View all products', '/products',

  'Why NEYORA',
  'Quality without compromise',
  'Four things we do not negotiate on, whatever we are growing.',
  '[
    {"title":"Quality without compromise","description":"We grade by hand and pack only what we would cook at home that evening. Anything short of it never leaves the farm."},
    {"title":"Freshly grown","description":"Harvest happens the morning of dispatch. From cut to cold storage is under an hour, which is what keeps the texture intact."},
    {"title":"Transparent farming","description":"Substrate, spawn source, water, growing conditions — ask us anything and we will tell you plainly. No vague claims."},
    {"title":"Responsible growing","description":"Agricultural waste becomes our substrate; spent substrate returns to the soil as compost. Very little leaves the loop."}
  ]'::jsonb,

  'Our farm',
  'A quiet room, the right air, and time',
  'Oyster mushrooms are honest. Get the humidity, air exchange and cleanliness right and they grow beautifully. Get it wrong and there is nowhere to hide.',
  'We grow in a controlled room built from ordinary materials — nothing exotic. The work is in the routine: pasteurising substrate properly, keeping the room clean, watching the air, and picking at exactly the right moment.',
  '11111111-0000-4000-8000-000000000002',
  'Read our farm story', '/farm',

  'From the kitchen',
  'What to cook tonight',
  'Simple, well-tested ways to use a pack while it is at its best. Most take under twenty minutes.',
  'Browse all recipes', '/recipes',

  'Our community',
  'Cooked by people who care what they eat',
  'A few words from the kitchens we deliver to.',

  'Follow along',
  'Growing, harvesting, cooking',
  'Day-to-day from the farm and the kitchen.',
  '@neyora',

  'Start here',
  'Fresh food, grown for life',
  'Order a pack, cook it the same week, and tell us what you thought. That feedback is how we improve.',
  'See our products', '/products',
  '11111111-0000-4000-8000-000000000021',

  '{"products":true,"why":true,"farm":true,"recipes":true,"community":true,"social":true,"final_cta":true}'::jsonb,
  'NEYORA — Fresh Natural Food, Grown For Life',
  'NEYORA grows fresh natural food with care. Premium oyster mushrooms harvested to order, plus simple recipes to cook them at their best.',
  '11111111-0000-4000-8000-000000000001'
)
on conflict (id) do nothing;


-- ----------------------------------------------------------------------------
-- Social links — footer and contact page read these directly
-- ----------------------------------------------------------------------------
insert into public.social_links (platform, label, url, handle, sort_order, enabled)
values
  ('instagram', 'Instagram', 'https://instagram.com/neyora', '@neyora', 1, true),
  ('whatsapp',  'WhatsApp',  '',                              null,      2, false),
  ('facebook',  'Facebook',  '',                              null,      3, false),
  ('youtube',   'YouTube',   '',                              null,      4, false),
  ('linkedin',  'LinkedIn',  '',                              null,      5, false),
  ('x',         'X',         '',                              null,      6, false)
on conflict (platform) do nothing;


-- ----------------------------------------------------------------------------
-- QR redirect — the packaging points at /go, permanently.
-- Change `destination` in Admin → QR Redirects; never reprint a label.
-- ----------------------------------------------------------------------------
insert into public.redirects (source, destination, http_status, enabled, label, note)
values
  ('go', '/recipes', 302, true, 'Pack QR — main',
   'Printed on every NEYORA pack. Keep this row enabled forever; change only the destination.'),
  ('go/200g', '/products/fresh-oyster-mushrooms-200g', 302, true, 'Pack QR — 200 g',
   'Optional per-pack QR. Points at the product page by default.')
on conflict (source) do nothing;


-- ----------------------------------------------------------------------------
-- Product category + first product
-- ----------------------------------------------------------------------------
insert into public.product_categories (id, slug, name, description, sort_order, status, published_at, is_demo)
values
  ('22222222-0000-4000-8000-000000000001', 'mushrooms', 'Mushrooms',
   'Freshly grown culinary mushrooms, harvested to order.', 1, 'published', now(), true),
  ('22222222-0000-4000-8000-000000000002', 'fresh-produce', 'Fresh Produce',
   'Seasonal vegetables and greens. Coming soon.', 2, 'draft', null, true)
on conflict (id) do nothing;

insert into public.products (
  id, slug, name, short_description, description,
  category_id, variety, origin,
  weight_grams, weight_label, price, mrp, currency, unit_label,
  nutrition, highlights, storage_notes, shelf_life, availability,
  featured, sort_order, seo_title, seo_description, og_image_id,
  status, published_at, is_demo
)
values (
  '33333333-0000-4000-8000-000000000001',
  'fresh-oyster-mushrooms-200g',
  'Fresh Oyster Mushrooms',
  'Grey oyster mushrooms, hand-picked the morning they ship. Firm caps, clean scent, 200 g pack.',
  E'Grey oyster mushrooms (*Pleurotus ostreatus*) grown on pasteurised agricultural substrate in a controlled room, then hand-picked as clusters at the moment the cap edge begins to flatten.\n\nThat timing matters more than anything else we do. Picked a day early and the yield is low; a day late and the flesh starts to soften and the mushroom loses the meaty bite it is prized for.\n\n## What you get\n\nA 200 g pack of whole clusters — not loose caps. Clusters keep better, and they tear beautifully along the grain, which is exactly what you want for a hard sear.\n\n## How it cooks\n\nOyster mushrooms hold roughly 90% water. Give them a hot, dry pan and space to breathe, and that water leaves as steam and the edges caramelise. Crowd the pan and they stew instead. Salt at the end.\n\n## Growing notes\n\n- Substrate: pasteurised paddy straw and sawdust, no chemical supplementation\n- Spawn: sourced from a certified lab, traceable by batch\n- Water: filtered, tested quarterly\n- No pesticides, no growth regulators, no post-harvest washing\n\n> Harvest date is printed on every pack. If it is more than two days old when it reaches you, tell us.',
  '22222222-0000-4000-8000-000000000001',
  'Pleurotus ostreatus (Grey Oyster)',
  'NEYORA farm, Karnataka',
  200, '200 g', 120.00, 150.00, 'INR', 'pack',
  '{
    "basis": "Per 100 g, raw",
    "per": [
      {"label":"Energy","value":"33","unit":"kcal"},
      {"label":"Protein","value":"3.3","unit":"g"},
      {"label":"Carbohydrate","value":"6.1","unit":"g"},
      {"label":"Dietary fibre","value":"2.3","unit":"g"},
      {"label":"Fat","value":"0.4","unit":"g"},
      {"label":"Potassium","value":"420","unit":"mg"},
      {"label":"Vitamin D","value":"Present","unit":""},
      {"label":"Sodium","value":"18","unit":"mg"}
    ],
    "note": "Indicative values for grey oyster mushrooms. Replace with your own lab report before making any nutrition claim."
  }'::jsonb,
  '["Harvested the morning of dispatch","Whole clusters, hand-graded","No pesticides or growth regulators","Harvest date printed on every pack","Substrate composted back to soil"]'::jsonb,
  E'Keep refrigerated at 2–4 °C. Leave the pack **unwashed and loosely covered** — a sealed airtight box traps moisture and turns the caps slimy within a day.\n\nIf you have decanted them, a paper bag in the vegetable drawer is ideal. Wash only in the minute before cooking, and only if they need it — a dry brush is usually enough.',
  '3–5 days refrigerated, best within 48 hours',
  'in_stock',
  true, 1,
  'Fresh Oyster Mushrooms 200 g — Harvested to Order',
  'Grey oyster mushrooms hand-picked the morning they ship. Firm clusters, clean scent, harvest date on every 200 g pack.',
  '11111111-0000-4000-8000-000000000004',
  'published', now(), true
)
on conflict (id) do nothing;

insert into public.product_images (product_id, media_id, sort_order, is_primary)
values
  ('33333333-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000004', 1, true),
  ('33333333-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000005', 2, false),
  ('33333333-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000006', 3, false)
on conflict (product_id, media_id) do nothing;


-- ----------------------------------------------------------------------------
-- Recipe categories and tags
-- ----------------------------------------------------------------------------
insert into public.recipe_categories (id, slug, name, description, image_id, sort_order, status, published_at, is_demo)
values
  ('44444444-0000-4000-8000-000000000001', 'quick', 'Under 15 Minutes',
   'Weeknight cooking. Pan on, pack open, dinner done.',
   '11111111-0000-4000-8000-000000000014', 1, 'published', now(), true),
  ('44444444-0000-4000-8000-000000000002', 'south-indian', 'South Indian',
   'Curry leaves, black pepper, coconut oil — the way we cook mushrooms at home.',
   null, 2, 'published', now(), true),
  ('44444444-0000-4000-8000-000000000003', 'snacks', 'Snacks & Starters',
   'Crisp, sharable, best eaten standing at the counter.',
   null, 3, 'published', now(), true)
on conflict (id) do nothing;

insert into public.recipe_tags (id, slug, name)
values
  ('55555555-0000-4000-8000-000000000001', 'vegetarian',  'Vegetarian'),
  ('55555555-0000-4000-8000-000000000002', 'high-protein','High Protein'),
  ('55555555-0000-4000-8000-000000000003', 'one-pan',     'One Pan'),
  ('55555555-0000-4000-8000-000000000004', 'gluten-free', 'Gluten Free'),
  ('55555555-0000-4000-8000-000000000005', 'party-food',  'Party Food'),
  ('55555555-0000-4000-8000-000000000006', 'spicy',       'Spicy')
on conflict (id) do nothing;


-- ----------------------------------------------------------------------------
-- Recipe 1 — Garlic Butter Oyster Mushrooms
-- ----------------------------------------------------------------------------
insert into public.recipes (
  id, slug, title, excerpt, body,
  category_id, cover_image_id, og_image_id,
  prep_time_minutes, cook_time_minutes, servings, servings_label, difficulty, cuisine, course,
  recommended_pack_size, base_pack_grams, is_scalable, primary_product_id,
  ingredients, steps, nutrition, equipment, tips,
  featured, sort_order, seo_title, seo_description,
  status, published_at, is_demo
)
values (
  '66666666-0000-4000-8000-000000000001',
  'garlic-butter-oyster-mushrooms',
  'Garlic Butter Oyster Mushrooms',
  'The one to cook first. A hot pan, butter, garlic and one 200 g pack — golden in under ten minutes.',
  E'If you have never cooked oyster mushrooms before, start here. There is almost nothing to it, and it teaches you the only technique that really matters: **a hot pan and no crowding.**\n\n## Why this works\n\nOyster mushrooms are about 90% water. In a hot, uncrowded pan that water leaves as steam and the torn edges caramelise into something genuinely meaty. In a cool or crowded pan the same mushrooms sit in their own liquid and stew — grey, soft, disappointing.\n\nSo: get the pan properly hot, work in a single layer, and be patient for the first two minutes without touching anything.\n\n## A note on salt\n\nSalt draws water out. Add it at the start and you are fighting the sear you are trying to build. Add it at the end.\n\n---\n\n## Ingredients\n\n- 200 g oyster mushrooms, torn into strips\n- 1 tbsp butter\n- 3 garlic cloves, thinly sliced\n- 1 tsp olive oil\n- Black pepper, freshly cracked\n- Salt, to taste\n- A few parsley leaves (optional)\n\n## Preparation\n\n1. **Clean gently.** Brush away any substrate with a dry cloth or a soft brush. Do not rinse — they will absorb the water and refuse to brown.\n2. **Tear, do not chop.** Pull the clusters apart along the grain into finger-width strips. Torn edges catch far more colour than cut ones.\n3. **Heat the pan.** Cast iron or heavy steel, medium-high, until a drop of water skitters. Add the olive oil.\n4. **Single layer.** Lay the mushrooms flat with space between them. Leave them alone for 2–3 minutes. Resist stirring.\n5. **Turn once.** When the undersides are deep gold, flip and give them another 2 minutes.\n6. **Butter and garlic.** Drop in the butter, then the sliced garlic. Swirl for 45–60 seconds until the garlic is fragrant and pale gold — no darker, or it turns bitter.\n7. **Finish.** Off the heat: salt, plenty of cracked pepper, parsley if using. Serve straight away.\n\n## Serving\n\nOn sourdough toast, alongside eggs, folded through pasta, or simply on their own with a squeeze of lemon.\n\n> Any liquid left in the pan is concentrated flavour. Scrape it over the top.',
  '44444444-0000-4000-8000-000000000001',
  '11111111-0000-4000-8000-000000000011',
  '11111111-0000-4000-8000-000000000011',
  5, 10, 2, 'as a side for 2', 'easy', 'Continental', 'Side',
  '200g', 200, true, '33333333-0000-4000-8000-000000000001',
  '[
    {"qty":200,"unit":"g","item":"oyster mushrooms","note":"torn into finger-width strips","scalable":true,"group":""},
    {"qty":1,"unit":"tbsp","item":"butter","note":"unsalted","scalable":true,"group":""},
    {"qty":3,"unit":"clove","item":"garlic","note":"thinly sliced","scalable":true,"group":""},
    {"qty":1,"unit":"tsp","item":"olive oil","note":"","scalable":true,"group":""},
    {"qty":null,"unit":"","item":"Black pepper","note":"freshly cracked, generous","scalable":false,"group":""},
    {"qty":null,"unit":"","item":"Salt","note":"added at the end only","scalable":false,"group":""},
    {"qty":null,"unit":"","item":"Flat-leaf parsley","note":"optional, to finish","scalable":false,"group":""}
  ]'::jsonb,
  '[
    {"title":"Clean gently","body":"Brush away substrate with a dry cloth or soft brush. Do not rinse — wet mushrooms will not brown."},
    {"title":"Tear, do not chop","body":"Pull clusters apart along the grain into finger-width strips. Torn edges catch far more colour."},
    {"title":"Heat the pan","body":"Cast iron or heavy steel over medium-high heat until a drop of water skitters. Add the olive oil.","duration_minutes":2},
    {"title":"Sear in a single layer","body":"Lay the mushrooms flat with space between them. Leave them completely alone for 2–3 minutes.","duration_minutes":3},
    {"title":"Turn once","body":"When the undersides are deep gold, flip and give them another 2 minutes.","duration_minutes":2},
    {"title":"Butter and garlic","body":"Add the butter, then the garlic. Swirl 45–60 seconds until fragrant and pale gold — no darker.","duration_minutes":1},
    {"title":"Season and serve","body":"Off the heat, add salt, plenty of cracked pepper and parsley. Serve immediately."}
  ]'::jsonb,
  '{
    "basis": "Per serving (recipe divided by 2)",
    "per": [
      {"label":"Energy","value":"118","unit":"kcal"},
      {"label":"Protein","value":"3.6","unit":"g"},
      {"label":"Carbohydrate","value":"6.4","unit":"g"},
      {"label":"Fat","value":"8.2","unit":"g"},
      {"label":"Fibre","value":"2.4","unit":"g"}
    ],
    "note": "Estimated. Demo content — replace before publishing nutrition claims."
  }'::jsonb,
  '["Cast-iron or heavy steel pan","Soft brush or dry cloth"]'::jsonb,
  E'Do not wash the mushrooms. Do not crowd the pan. Salt at the end. Those three rules cover ninety per cent of oyster mushroom cooking.',
  true, 1,
  'Garlic Butter Oyster Mushrooms — 10-Minute Recipe for a 200 g Pack',
  'A hot pan, butter, garlic and one 200 g pack of fresh oyster mushrooms. Golden, meaty edges in under ten minutes. Step-by-step method.',
  'published', now() - interval '20 days', true
)
on conflict (id) do nothing;


-- ----------------------------------------------------------------------------
-- Recipe 2 — Pepper Oyster Mushroom Fry
-- ----------------------------------------------------------------------------
insert into public.recipes (
  id, slug, title, excerpt, body,
  category_id, cover_image_id, og_image_id,
  prep_time_minutes, cook_time_minutes, servings, servings_label, difficulty, cuisine, course,
  recommended_pack_size, base_pack_grams, is_scalable, primary_product_id,
  ingredients, steps, nutrition, equipment, tips,
  featured, sort_order, seo_title, seo_description,
  status, published_at, is_demo
)
values (
  '66666666-0000-4000-8000-000000000002',
  'pepper-oyster-mushroom-fry',
  'Pepper Oyster Mushroom Fry',
  'Coarse black pepper, curry leaves and coconut oil. A dry South Indian fry that eats like a starter and works as a side.',
  E'This is the one that convinces people who think they do not like mushrooms. Coarsely crushed black pepper, curry leaves bloomed in coconut oil, and a fry taken far enough that the edges go properly crisp.\n\nIt is a *dry* fry. There should be no sauce at the end — just seasoning clinging to the mushrooms.\n\n## Get the pepper right\n\nCrush whole peppercorns coarsely in a mortar just before cooking. Pre-ground pepper has lost the volatile oils that make this dish work, and the texture of coarse crush against a crisp edge is half the point.\n\n---\n\n## Ingredients\n\n- 200 g oyster mushrooms, torn\n- 1½ tsp black peppercorns, coarsely crushed\n- 1 tbsp coconut oil\n- 1 medium onion, sliced thin\n- 1 sprig curry leaves\n- 2 dried red chillies, broken\n- ½ tsp mustard seeds\n- ¼ tsp turmeric\n- 2 garlic cloves, crushed\n- Salt, to taste\n\n## Preparation\n\n1. Brush the mushrooms clean and tear into strips. Keep them slightly larger than you think you need — they shrink.\n2. Heat the coconut oil in a kadai over medium-high. Add the mustard seeds and wait for them to pop.\n3. Add the dried chillies and curry leaves. Stand back — they will spit. Ten seconds is enough.\n4. Add the onion and a pinch of salt. Fry 3–4 minutes until the edges take colour.\n5. Add the garlic and turmeric. Stir for 30 seconds.\n6. Turn the heat to high and add the mushrooms. Spread them out and **do not stir for two minutes.**\n7. Now stir occasionally for 5–6 minutes. The mushrooms will release water, then reabsorb and begin to fry. Wait for that second stage.\n8. Add the crushed pepper and salt. Fry a final 2 minutes until the pan is dry and the edges are crisp.\n\n## Serving\n\nWith rice and rasam, inside a dosa, or on its own with a wedge of lime.\n\n| Heat level | Adjust |\n| --- | --- |\n| Milder | 1 tsp pepper, 1 chilli |\n| As written | 1½ tsp pepper, 2 chillies |\n| Hotter | 2 tsp pepper, 3 chillies, add a slit green chilli |',
  '44444444-0000-4000-8000-000000000002',
  '11111111-0000-4000-8000-000000000012',
  '11111111-0000-4000-8000-000000000012',
  10, 15, 3, 'as a side for 3', 'medium', 'South Indian', 'Side',
  '200g', 200, true, '33333333-0000-4000-8000-000000000001',
  '[
    {"qty":200,"unit":"g","item":"oyster mushrooms","note":"torn into strips","scalable":true,"group":""},
    {"qty":1.5,"unit":"tsp","item":"black peppercorns","note":"coarsely crushed, freshly","scalable":true,"group":""},
    {"qty":1,"unit":"tbsp","item":"coconut oil","note":"","scalable":true,"group":""},
    {"qty":1,"unit":"medium","item":"onion","note":"sliced thin","scalable":true,"group":""},
    {"qty":1,"unit":"sprig","item":"curry leaves","note":"","scalable":true,"group":"Tempering"},
    {"qty":2,"unit":"","item":"dried red chillies","note":"broken","scalable":true,"group":"Tempering"},
    {"qty":0.5,"unit":"tsp","item":"mustard seeds","note":"","scalable":true,"group":"Tempering"},
    {"qty":0.25,"unit":"tsp","item":"turmeric","note":"","scalable":true,"group":""},
    {"qty":2,"unit":"clove","item":"garlic","note":"crushed","scalable":true,"group":""},
    {"qty":null,"unit":"","item":"Salt","note":"to taste","scalable":false,"group":""}
  ]'::jsonb,
  '[
    {"title":"Prep the mushrooms","body":"Brush clean and tear into strips slightly larger than you think you need — they shrink considerably."},
    {"title":"Temper","body":"Heat coconut oil in a kadai over medium-high. Add mustard seeds and wait for them to pop.","duration_minutes":2},
    {"title":"Chillies and curry leaves","body":"Add broken dried chillies and curry leaves. They will spit. Ten seconds is enough."},
    {"title":"Onion","body":"Add sliced onion with a pinch of salt. Fry until the edges take colour.","duration_minutes":4},
    {"title":"Garlic and turmeric","body":"Add crushed garlic and turmeric. Stir 30 seconds — do not let the turmeric catch."},
    {"title":"Mushrooms in, hands off","body":"Raise the heat to high, add the mushrooms, spread them out and do not stir for two full minutes.","duration_minutes":2},
    {"title":"Fry through both stages","body":"Stir occasionally. The mushrooms release water, then reabsorb it and begin to fry. Wait for that second stage.","duration_minutes":6},
    {"title":"Pepper and finish","body":"Add the crushed pepper and salt. Fry until the pan is dry and the edges are crisp.","duration_minutes":2}
  ]'::jsonb,
  '{
    "basis": "Per serving (recipe divided by 3)",
    "per": [
      {"label":"Energy","value":"96","unit":"kcal"},
      {"label":"Protein","value":"2.9","unit":"g"},
      {"label":"Carbohydrate","value":"7.8","unit":"g"},
      {"label":"Fat","value":"5.1","unit":"g"},
      {"label":"Fibre","value":"2.6","unit":"g"}
    ],
    "note": "Estimated. Demo content — replace before publishing nutrition claims."
  }'::jsonb,
  '["Kadai or wok","Mortar and pestle"]'::jsonb,
  E'Crush the peppercorns yourself, immediately before cooking. Pre-ground pepper cannot carry this dish.',
  true, 2,
  'Pepper Oyster Mushroom Fry — South Indian Dry Fry (200 g)',
  'Coarse black pepper, curry leaves and coconut oil. A crisp, dry South Indian oyster mushroom fry for one 200 g pack.',
  'published', now() - interval '12 days', true
)
on conflict (id) do nothing;


-- ----------------------------------------------------------------------------
-- Recipe 3 — Crispy Oyster Mushroom
-- ----------------------------------------------------------------------------
insert into public.recipes (
  id, slug, title, excerpt, body,
  category_id, cover_image_id, og_image_id,
  prep_time_minutes, cook_time_minutes, servings, servings_label, difficulty, cuisine, course,
  recommended_pack_size, base_pack_grams, is_scalable, primary_product_id,
  ingredients, steps, nutrition, equipment, tips,
  featured, sort_order, seo_title, seo_description,
  status, published_at, is_demo
)
values (
  '66666666-0000-4000-8000-000000000003',
  'crispy-oyster-mushroom',
  'Crispy Oyster Mushroom',
  'A cornflour and rice-flour crust that shatters. The starter everyone finishes before it reaches the table.',
  E'Oyster mushrooms fry better than almost any vegetable. The torn edges hold batter, and the flesh stays juicy while the outside goes glassy and crisp.\n\nThe crust here is rice flour and cornflour, no wheat, which gives a lighter and longer-lasting crispness than a plain flour batter.\n\n## The one thing that ruins this\n\nWet mushrooms. Water in the batter turns to steam, steam softens the crust, and you get a soggy shell that slides off. Brush them clean and keep them dry.\n\n## Oil temperature\n\n175–180 °C. Below that they absorb oil; above and the crust colours before the inside is done. No thermometer? Drop in a pinch of batter — it should sink briefly, then rise and sizzle steadily.\n\n---\n\n## Ingredients\n\n**For the mushrooms**\n\n- 200 g oyster mushrooms, torn into large strips\n\n**For the batter**\n\n- 4 tbsp cornflour\n- 2 tbsp rice flour\n- ½ tsp red chilli powder\n- ¼ tsp black pepper\n- ¼ tsp garlic powder\n- Salt, to taste\n- 5–6 tbsp cold water\n\n**To finish**\n\n- Oil, for frying\n- Chaat masala\n- Lime wedges\n\n## Preparation\n\n1. Brush the mushrooms clean. Tear into large strips — they shrink in the fryer, so err generous.\n2. Whisk the dry batter ingredients together, then add cold water a spoon at a time until it coats the back of a spoon and drips slowly. Thin batter slides off; thick batter goes doughy.\n3. Heat oil to 175–180 °C.\n4. Dip each strip, let the excess run off, and lower it in. Fry in small batches — four or five pieces at a time.\n5. Fry 3–4 minutes until pale gold, then lift onto a rack.\n6. **Fry everything a second time** for 60–90 seconds. This is what makes it shatter rather than crunch.\n7. Drain on a rack, not paper. Dust with chaat masala and serve with lime.\n\n> A rack, not a plate lined with kitchen paper. Paper traps steam under the pieces and softens the base within a minute.',
  '44444444-0000-4000-8000-000000000003',
  '11111111-0000-4000-8000-000000000013',
  '11111111-0000-4000-8000-000000000013',
  15, 12, 3, 'as a starter for 3', 'medium', 'Indo-Chinese', 'Starter',
  '200g', 200, true, '33333333-0000-4000-8000-000000000001',
  '[
    {"qty":200,"unit":"g","item":"oyster mushrooms","note":"torn into large strips","scalable":true,"group":""},
    {"qty":4,"unit":"tbsp","item":"cornflour","note":"","scalable":true,"group":"For the batter"},
    {"qty":2,"unit":"tbsp","item":"rice flour","note":"","scalable":true,"group":"For the batter"},
    {"qty":0.5,"unit":"tsp","item":"red chilli powder","note":"","scalable":true,"group":"For the batter"},
    {"qty":0.25,"unit":"tsp","item":"black pepper","note":"ground","scalable":true,"group":"For the batter"},
    {"qty":0.25,"unit":"tsp","item":"garlic powder","note":"","scalable":true,"group":"For the batter"},
    {"qty":6,"unit":"tbsp","item":"cold water","note":"added gradually","scalable":true,"group":"For the batter"},
    {"qty":null,"unit":"","item":"Oil","note":"for deep frying","scalable":false,"group":"To finish"},
    {"qty":null,"unit":"","item":"Chaat masala","note":"to dust","scalable":false,"group":"To finish"},
    {"qty":null,"unit":"","item":"Lime wedges","note":"to serve","scalable":false,"group":"To finish"},
    {"qty":null,"unit":"","item":"Salt","note":"to taste","scalable":false,"group":"For the batter"}
  ]'::jsonb,
  '[
    {"title":"Prep dry","body":"Brush the mushrooms clean — never rinse. Tear into large strips; they shrink in the fryer."},
    {"title":"Mix the batter","body":"Whisk the dry ingredients, then add cold water a spoon at a time until it coats a spoon and drips slowly."},
    {"title":"Heat the oil","body":"175–180 °C. A pinch of batter should sink briefly, rise, and sizzle steadily.","duration_minutes":5},
    {"title":"First fry","body":"Dip, let excess run off, lower in. Small batches of four or five. Fry to pale gold, then lift onto a rack.","duration_minutes":4},
    {"title":"Second fry","body":"Return everything to the oil for 60–90 seconds. This is what makes the crust shatter.","duration_minutes":2},
    {"title":"Drain and dust","body":"Drain on a rack, not paper. Dust with chaat masala and serve with lime immediately."}
  ]'::jsonb,
  '{
    "basis": "Per serving (recipe divided by 3)",
    "per": [
      {"label":"Energy","value":"186","unit":"kcal"},
      {"label":"Protein","value":"3.1","unit":"g"},
      {"label":"Carbohydrate","value":"22.4","unit":"g"},
      {"label":"Fat","value":"9.6","unit":"g"},
      {"label":"Fibre","value":"1.9","unit":"g"}
    ],
    "note": "Estimated; absorbed frying oil varies. Demo content — replace before publishing nutrition claims."
  }'::jsonb,
  '["Deep pan or kadai","Wire cooling rack","Thermometer (optional)"]'::jsonb,
  E'Two things: keep the mushrooms bone dry, and always fry twice. Drain on a rack — paper steams the base soft.',
  false, 3,
  'Crispy Oyster Mushroom — Shatteringly Crisp Starter (200 g)',
  'A rice-flour and cornflour crust that shatters. Double-fried crispy oyster mushrooms from one 200 g pack, with chaat masala and lime.',
  'published', now() - interval '5 days', true
)
on conflict (id) do nothing;


-- ----------------------------------------------------------------------------
-- Recipe tags
-- ----------------------------------------------------------------------------
insert into public.recipe_tag_map (recipe_id, tag_id)
values
  ('66666666-0000-4000-8000-000000000001', '55555555-0000-4000-8000-000000000001'),
  ('66666666-0000-4000-8000-000000000001', '55555555-0000-4000-8000-000000000003'),
  ('66666666-0000-4000-8000-000000000001', '55555555-0000-4000-8000-000000000004'),
  ('66666666-0000-4000-8000-000000000002', '55555555-0000-4000-8000-000000000001'),
  ('66666666-0000-4000-8000-000000000002', '55555555-0000-4000-8000-000000000003'),
  ('66666666-0000-4000-8000-000000000002', '55555555-0000-4000-8000-000000000006'),
  ('66666666-0000-4000-8000-000000000003', '55555555-0000-4000-8000-000000000001'),
  ('66666666-0000-4000-8000-000000000003', '55555555-0000-4000-8000-000000000005')
on conflict do nothing;


-- ----------------------------------------------------------------------------
-- Pack-size variant — proves the pack-specific ingredient design end to end.
-- Seasoning does not scale linearly, so 500 g gets a hand-tuned list.
-- ----------------------------------------------------------------------------
insert into public.recipe_pack_variants (recipe_id, pack_size, pack_grams, servings, ingredients, note)
values (
  '66666666-0000-4000-8000-000000000001',
  '500g', 500, 5,
  '[
    {"qty":500,"unit":"g","item":"oyster mushrooms","note":"torn into finger-width strips","scalable":true,"group":""},
    {"qty":2,"unit":"tbsp","item":"butter","note":"unsalted","scalable":true,"group":""},
    {"qty":6,"unit":"clove","item":"garlic","note":"thinly sliced","scalable":true,"group":""},
    {"qty":2,"unit":"tsp","item":"olive oil","note":"","scalable":true,"group":""},
    {"qty":null,"unit":"","item":"Black pepper","note":"freshly cracked, generous","scalable":false,"group":""},
    {"qty":null,"unit":"","item":"Salt","note":"added at the end only","scalable":false,"group":""}
  ]'::jsonb,
  'Cook in two batches — 500 g will not fit a single layer in a 28 cm pan, and crowding is what ruins this dish. Butter is doubled rather than 2.5×; garlic is doubled, not tripled.'
)
on conflict (recipe_id, pack_size) do nothing;


-- ----------------------------------------------------------------------------
-- FAQs
-- ----------------------------------------------------------------------------
insert into public.faqs (question, answer, category, sort_order, status, published_at, is_demo)
values
  ('How fresh are NEYORA mushrooms when they reach me?',
   E'We harvest the morning of dispatch. Every pack carries its harvest date, so you are never guessing.\n\nIf a pack reaches you more than two days after its harvest date, tell us and we will replace it.',
   'Freshness', 1, 'published', now(), true),

  ('How should I store fresh oyster mushrooms?',
   E'Refrigerate at 2–4 °C, **unwashed and loosely covered**. An airtight container traps moisture and the caps turn slimy within a day.\n\nIf you have taken them out of the pack, a paper bag in the vegetable drawer is ideal. Full guidance is on our [storage page](/storage).',
   'Storage', 2, 'published', now(), true),

  ('Should I wash them before cooking?',
   E'Preferably not. Oyster mushrooms are grown on clean pasteurised substrate and we do not wash them post-harvest, so there is rarely anything to remove beyond a little substrate at the base.\n\nBrush with a dry cloth or soft brush. If you must rinse, do it in the minute before cooking and pat completely dry — wet mushrooms steam instead of browning.',
   'Cooking', 3, 'published', now(), true),

  ('How long do they keep?',
   'Three to five days refrigerated, and genuinely best within the first 48 hours. The texture is what fades first — the flavour holds longer than the bite does.',
   'Storage', 4, 'published', now(), true),

  ('Do you use pesticides or chemicals?',
   E'No pesticides, no growth regulators, and no post-harvest chemical treatment.\n\nWe grow on pasteurised paddy straw and sawdust with lab-sourced spawn. Cleanliness and air control do the work that chemicals would otherwise be used for. Ask us anything about our process — we would rather answer than post a badge.',
   'Growing', 5, 'published', now(), true),

  ('Is the substrate reused or discarded?',
   'Spent substrate is composted and returns to farmland as a soil amendment. The substrate itself starts as agricultural waste, so very little leaves the loop.',
   'Growing', 6, 'published', now(), true),

  ('What is the QR code on the pack?',
   'It points at a stable link we control. Today it takes you to our recipes; during a season or a campaign we can point it somewhere more useful without reprinting a single label. Scan it whenever you open a pack.',
   'Packaging', 7, 'published', now(), true),

  ('Will NEYORA sell anything other than mushrooms?',
   'Yes. NEYORA is a natural-food brand and mushrooms are simply our first crop. Fresh produce and other farm products will follow, held to the same standard.',
   'About NEYORA', 8, 'published', now(), true),

  ('Do you deliver to my area?',
   'We are expanding steadily. Message us on WhatsApp with your pin code and we will tell you honestly whether we can reach you well — we would rather say no than send you something that has spent two days in transit.',
   'Orders', 9, 'published', now(), true),

  ('Can I visit the farm?',
   'In small groups, yes. Growing rooms need controlled conditions, so visits are scheduled rather than open. Get in touch and we will arrange a time.',
   'About NEYORA', 10, 'published', now(), true)
on conflict do nothing;


-- ----------------------------------------------------------------------------
-- Testimonials
-- ----------------------------------------------------------------------------
insert into public.testimonials (quote, author_name, author_role, location, rating, featured, sort_order, status, published_at, is_demo)
values
  ('The difference is texture. Most mushrooms I buy have already started to go soft — these still squeak when you tear them.',
   'Anitha R.', 'Home cook', 'Bengaluru', 5, true, 1, 'published', now(), true),

  ('We put the pepper fry on the menu as a special and it has not come off since. Consistency pack to pack is what matters to a kitchen, and they deliver it.',
   'Chef Vikram S.', 'Head chef', 'Kochi', 5, true, 2, 'published', now(), true),

  ('I asked what the substrate was and got a real answer, with the spawn batch. That told me everything I needed to know about the people growing it.',
   'Deepa M.', 'Nutritionist', 'Chennai', 5, true, 3, 'published', now(), true),

  ('Harvest date printed on the pack. Such a small thing, and no one else does it.',
   'Rahul K.', 'Subscriber', 'Hyderabad', 4, false, 4, 'published', now(), true)
on conflict do nothing;


-- ----------------------------------------------------------------------------
-- Pages
--
-- `is_system = true` marks pages with a hard-coded route. The admin lets you
-- rewrite them but not delete them, so /about can never 404.
-- ----------------------------------------------------------------------------
insert into public.pages (slug, title, eyebrow, subtitle, body, hero_image_id, is_system, sort_order, status, published_at, seo_title, seo_description, is_demo)
values

('about', 'About NEYORA', 'Who we are',
 'A natural-food brand that started with mushrooms because mushrooms are the hardest thing to fake.',
 E'NEYORA grows food. That is the whole of it.\n\nWe began with grey oyster mushrooms for a specific reason: mushrooms are unforgiving. There is no long ripening window to hide behind, no waxing, no cold-chain trick that makes a three-day-old mushroom taste like a fresh one. Either you picked it this morning and moved it quickly, or you did not — and anyone who cooks can tell.\n\nStarting somewhere unforgiving forced us to build the habits we wanted first: harvest to order, cool immediately, grade by hand, print the harvest date, and answer honestly when someone asks how it was grown.\n\n## Why "GROWN FOR LIFE."\n\nThree readings, all intended.\n\nGrown **for life** — food that supports a healthy one.\nGrown **for a lifetime** — a farm built to still be here in twenty years.\nGrown **for living things** — soil, growers, and the people who eat it.\n\n## What comes next\n\nNEYORA is not a mushroom company. Mushrooms are our first crop. Fresh produce, herbs and other farm products will follow, and every one of them will meet the same standard: harvested to order, graded by hand, dated on the pack, and explained plainly.\n\n## What we will not do\n\n- Sell produce we would not cook at home that evening\n- Make a health claim we cannot support with a document\n- Print a certification badge we have not earned\n- Grow volume at the cost of the thing people buy us for\n\n---\n\n*This page is demo copy. Rewrite it in Admin → Pages → About.*',
 '11111111-0000-4000-8000-000000000003', true, 1, 'published', now(),
 'About NEYORA — A Natural Food Brand, Grown For Life',
 'NEYORA grows fresh natural food with care, starting with grey oyster mushrooms. Our story, our standards, and what comes next.', true),

('farm', 'Our Farm', 'Where it grows',
 'A controlled room, ordinary materials, and a routine we do not shortcut.',
 E'Oyster mushrooms need three things: clean substrate, the right air, and someone paying attention. Nothing about the equipment is exotic. Everything about the routine is deliberate.\n\n## Substrate\n\nWe grow on pasteurised paddy straw and hardwood sawdust — agricultural waste that would otherwise be burned. It is chopped, hydrated to roughly 65% moisture, and pasteurised at 65–70 °C for several hours. Not sterilised: pasteurisation leaves beneficial organisms alive to compete with contaminants, which is why it works better here.\n\nNo chemical supplementation. Nothing added to force yield.\n\n## Spawn\n\nSourced from a certified laboratory and traceable by batch. We keep the records because if something goes wrong two months later, we want to know exactly what went into it.\n\n## The growing room\n\n| Condition | Target |\n| --- | --- |\n| Temperature | 22–26 °C |\n| Relative humidity | 85–90% |\n| CO₂ | Below 800 ppm during fruiting |\n| Light | 8–12 hours indirect daily |\n| Air exchange | 4–6 changes per hour |\n\nAir exchange is where most small farms fail. Too little CO₂ removal and the mushrooms grow long stems with tiny caps, reaching for air. Get it right and you get the short, thick, heavy clusters we grade for.\n\n## Harvest\n\nWe pick when the cap edge just begins to flatten from its curl. A day early costs yield; a day late costs texture. Clusters are cut whole — never picked apart — because whole clusters keep better and travel better.\n\nFrom cut to cold storage is under an hour.\n\n## Grading\n\nBy hand, one cluster at a time. Anything with a torn cap, a dry edge, or an off scent goes to compost. Roughly 8–12% of a harvest does not make it into a pack, and we would rather it stayed that way.\n\n## The loop\n\nAgricultural waste → substrate → mushrooms → spent substrate → compost → farmland.\n\nSpent substrate is a genuinely good soil amendment, and giving it back to the farms our straw comes from closes the loop properly.\n\n---\n\n*This page is demo copy. Rewrite it in Admin → Pages → Farm.*',
 '11111111-0000-4000-8000-000000000002', true, 2, 'published', now(),
 'Our Farm — How NEYORA Grows Oyster Mushrooms',
 'Pasteurised agricultural substrate, lab-sourced spawn, controlled air, hand grading, and spent substrate composted back to soil. How NEYORA grows.', true),

('quality', 'Quality & Growing', 'Our standards',
 'What we measure, what we reject, and what we will tell you if you ask.',
 E'Quality without compromise is easy to print and hard to do. Here is what it actually means in our operation.\n\n## What we test\n\n| What | How often | Why |\n| --- | --- | --- |\n| Water | Quarterly, external lab | Substrate hydration and misting both use it |\n| Substrate moisture | Every batch | Too wet invites bacteria, too dry stalls colonisation |\n| Pasteurisation temperature | Every batch, logged | The single biggest contamination control |\n| Room CO₂ and humidity | Continuously | Determines cluster shape and shelf life |\n| Cold-chain temperature | Every dispatch | Texture is lost here, not on the farm |\n\n## What we reject\n\nA cluster does not go into a pack if it has a torn or dried cap edge, an off or sour scent, visible contamination anywhere on the block, or a stem that has gone woody. Between 8% and 12% of each harvest is diverted to compost. That number is a feature, not a loss.\n\n## What we do not use\n\n- Pesticides or fungicides at any stage\n- Growth regulators\n- Post-harvest washing or chemical treatment\n- Preservatives of any kind\n\n## What we will not claim\n\nWe will not tell you mushrooms cure anything. Oyster mushrooms are a genuinely good food — high in protein for a vegetable, high in fibre, low in calories, a real source of potassium and B vitamins. That is a sound reason to eat them often. It is not medicine, and we will not dress it up as medicine.\n\nIf we ever publish a nutrition figure, it will come from a lab report we can show you.\n\n## Traceability\n\nEvery pack can be traced to its harvest date, growing room, substrate batch and spawn batch. Send us a harvest date and we will tell you exactly where it came from.\n\n---\n\n*This page is demo copy. Rewrite it in Admin → Pages → Quality.*',
 '11111111-0000-4000-8000-000000000006', true, 3, 'published', now(),
 'Quality & Growing Standards — NEYORA',
 'What NEYORA tests, what we reject, what we never use, and what we refuse to claim. Full traceability from pack to substrate batch.', true),

('storage', 'How to Store', 'Keep them at their best',
 'Five days is achievable. Two days is where they are genuinely excellent.',
 E'Almost every complaint about fresh mushrooms comes down to storage, and almost all of it is fixable in thirty seconds.\n\n## The short version\n\n1. **Refrigerate immediately** at 2–4 °C.\n2. **Do not wash them** until the minute you cook.\n3. **Do not seal them airtight.** Loosely covered, or a paper bag.\n4. **Do not freeze them raw.**\n\n## Why airtight fails\n\nOyster mushrooms are roughly 90% water and they keep respiring after harvest. Sealed in plastic, that moisture has nowhere to go: it condenses on the caps, bacteria take the opportunity, and you get a slimy surface within a day.\n\nA paper bag absorbs the excess while still slowing dehydration. It is the single best thing you can do.\n\n## Where in the fridge\n\nThe main compartment or vegetable drawer, never the door — temperature swings there are worse than the average temperature. Keep them away from anything strongly aromatic; mushrooms take on smells readily.\n\n## Reading the pack\n\n| Day since harvest | What to expect |\n| --- | --- |\n| 0–2 | Firm, faint sweet scent, caps squeak when torn. Best. |\n| 3–4 | Slightly softer, still excellent cooked hot and fast. |\n| 5 | Use today. Best in a fry or a curry rather than a plain sear. |\n| 6+ | Check carefully. Slimy patches or a sour smell mean compost. |\n\n## How to tell they have turned\n\nTrust your nose first. Fresh oyster mushrooms smell faintly sweet, a little of aniseed. A sour or ammonia note means they are done. Wet slimy patches, dark bruising that spreads, or any visible fuzz — do not cook them.\n\nDry, slightly leathery edges are not spoilage. They are just dehydrated, and they will still cook well.\n\n## Freezing\n\nDo not freeze raw — the cell walls rupture and they thaw to mush. Instead sear them hard in a dry pan first, cool completely, then freeze in a flat layer. They keep about three months and go straight from frozen into a hot pan.\n\n---\n\n*This page is demo copy. Rewrite it in Admin → Pages → Storage.*',
 '11111111-0000-4000-8000-000000000006', true, 4, 'published', now(),
 'How to Store Fresh Oyster Mushrooms — NEYORA',
 'Refrigerate at 2–4 °C, unwashed, loosely covered. Why airtight containers ruin mushrooms, how to tell when they have turned, and how to freeze them properly.', true),

('privacy', 'Privacy Policy', 'Legal',
 'What we collect, why, and how to have it removed.',
 E'> **This is a template, not legal advice.** Have it reviewed against the law that applies to you — in India, the Digital Personal Data Protection Act 2023; in the EU/UK, the GDPR. Edit it in Admin → Pages → Privacy.\n\n**Last updated:** replace this date when you edit the page.\n\n## Who we are\n\nNEYORA. Our contact details are on the [contact page](/contact).\n\n## What we collect\n\n**When you use the website.** We record aggregate, non-identifying page-view counts and event counts (for example, that a recipe was viewed). We do not use advertising cookies, we do not build a profile of you, and we do not store your IP address.\n\n**When you send us a message.** The contact form collects your name, email address, an optional phone number and your message, so that we can reply. We store a salted, one-way hash of your IP address purely to limit spam — the original address is never written down and cannot be recovered from the hash.\n\n**When you order or enquire on WhatsApp.** That conversation is governed by WhatsApp''s own privacy policy, not ours.\n\n## What we do not do\n\n- Sell or rent your personal data to anyone\n- Share it with advertisers or data brokers\n- Use it for automated decision-making or profiling\n- Send you marketing you did not ask for\n\n## Cookies\n\nWe set no advertising or tracking cookies. See the [cookie policy](/cookies) for the full detail.\n\n## Who processes data for us\n\n| Processor | Purpose | Where |\n| --- | --- | --- |\n| Supabase | Database, authentication and file storage | Region you selected |\n| Cloudflare | Website hosting and delivery | Global edge network |\n\nBoth act as processors on our instructions.\n\n## How long we keep things\n\nContact messages are kept for up to 24 months, then deleted. Aggregate analytics events are kept for up to 12 months.\n\n## Your rights\n\nYou may ask us for a copy of the personal data we hold about you, ask us to correct it, or ask us to delete it. Write to the email address on our [contact page](/contact) and we will respond within 30 days.\n\n## Children\n\nThis website is not directed at children and we do not knowingly collect their data.\n\n## Changes\n\nIf we change this policy we will update the date above.',
 null, true, 90, 'published', now(),
 'Privacy Policy — NEYORA',
 'What data NEYORA collects, why, who processes it, how long we keep it, and how to request access or deletion.', true),

('terms', 'Terms & Conditions', 'Legal',
 'The terms on which this website and our products are offered.',
 E'> **This is a template, not legal advice.** Have a qualified lawyer review it before you rely on it. Edit it in Admin → Pages → Terms.\n\n**Last updated:** replace this date when you edit the page.\n\n## 1. These terms\n\nBy using this website you accept these terms. If you do not accept them, please do not use the site.\n\n## 2. About us\n\nNEYORA. Contact details are on the [contact page](/contact). Insert your registered business name, address and registration number here.\n\n## 3. Our content\n\nThe text, photography, recipes, brand name, logo and design of this website belong to NEYORA and are protected by copyright and trade mark law.\n\nYou may cook our recipes, share links to them, and quote a short extract with attribution and a link. You may not republish a recipe in full, use our photography commercially, or use the NEYORA name or logo without written permission.\n\n## 4. Recipes and food information\n\nOur recipes and nutrition information are provided in good faith for general information. They are not medical or dietary advice.\n\n**You are responsible for checking allergens and cooking food safely.** If you have an allergy, an intolerance, or a medical condition affected by diet, check every ingredient yourself and consult a qualified professional. Nutrition figures are estimates and vary with ingredients and method.\n\n## 5. Products\n\nFresh produce is a natural product. Size, colour and yield vary between harvests, and photographs are illustrative rather than exact.\n\nAvailability is not guaranteed: growing is seasonal and a harvest can fail. Where a price is shown it is the price at the time of display, and we may correct obvious errors.\n\n## 6. Orders and enquiries\n\nAn enquiry through this website or WhatsApp is not a binding order until we confirm it. If we cannot fulfil a confirmed order we will tell you and refund anything you have paid.\n\n## 7. Liability\n\nNothing in these terms limits our liability for death or personal injury caused by our negligence, for fraud, or for anything else that cannot lawfully be limited.\n\nSubject to that, we are not liable for indirect or consequential loss, and our total liability for any claim relating to a product is limited to the amount you paid for it.\n\n## 8. Links\n\nWe link to other websites for convenience. We do not control them and are not responsible for their content.\n\n## 9. Changes\n\nWe may update these terms. The version published here is the one that applies.\n\n## 10. Governing law\n\nThese terms are governed by the laws of India, and the courts of India have exclusive jurisdiction. Change this if you operate elsewhere.',
 null, true, 91, 'published', now(),
 'Terms & Conditions — NEYORA',
 'The terms on which the NEYORA website and products are offered, including content use, recipe disclaimers and liability.', true),

('cookies', 'Cookie Policy', 'Legal',
 'We use very few. Here is every one of them.',
 E'> **This is a template, not legal advice.** Confirm it matches what your deployment actually sets. Edit it in Admin → Pages → Cookies.\n\n**Last updated:** replace this date when you edit the page.\n\n## The short version\n\nWe set **no advertising cookies and no third-party tracking cookies.** Browsing this site does not require you to accept anything, which is why you are not seeing a consent banner.\n\n## What is actually set\n\n| Cookie | Set when | Purpose | Lifetime |\n| --- | --- | --- | --- |\n| `sb-*-auth-token` | You sign in to `/admin` | Keeps the CMS session for staff. Never set for public visitors. | Session / until sign-out |\n\nThat is the complete list for a public visitor: nothing.\n\n## Analytics without cookies\n\nWe count page views and a small number of events — a recipe viewed, a QR code scanned, a WhatsApp button clicked — so we know which recipes are worth writing more of.\n\nThose counts are stored without cookies and without any identifier that could be traced back to you. No IP address is recorded, and there is no cross-site or cross-session tracking. It tells us *"this recipe was viewed 400 times"*, never *"this person viewed this recipe"*.\n\n## Cookies set by other sites\n\nIf you follow a link to Instagram, YouTube or WhatsApp, that service may set its own cookies once you are there. We do not embed their tracking scripts on this site, so nothing is set until you leave.\n\n## Controlling cookies\n\nEvery major browser lets you view, block and delete cookies in its settings. Blocking cookies will not affect your use of the public website in any way — only the staff CMS needs one.\n\n## Questions\n\nAsk us via the [contact page](/contact).',
 null, true, 92, 'published', now(),
 'Cookie Policy — NEYORA',
 'NEYORA sets no advertising or third-party tracking cookies. Exactly what is set, why, and how to control it.', true),

('faq-intro', 'Frequently Asked Questions', 'Answers',
 'Freshness, storage, cooking and growing — the questions we are actually asked.',
 E'If your question is not here, message us on WhatsApp or use the [contact form](/contact). We answer properly rather than quickly.',
 null, true, 5, 'published', now(),
 'FAQ — Fresh Oyster Mushrooms, Storage & Growing | NEYORA',
 'Answers about freshness, storage, washing, shelf life, growing practices, the pack QR code and delivery.', true),

('contact-intro', 'Contact', 'Get in touch',
 'WhatsApp is fastest. Email if it is detailed. We read everything.',
 E'For orders and quick questions, WhatsApp is genuinely the fastest route. For anything longer — wholesale, a kitchen supply enquiry, a farm visit — email or the form below is better, because it gives us room to answer properly.',
 null, true, 6, 'published', now(),
 'Contact NEYORA — WhatsApp, Email & Farm Enquiries',
 'Reach NEYORA by WhatsApp, phone or email. Wholesale enquiries, kitchen supply, farm visits and general questions.', true)

on conflict (slug) do nothing;
