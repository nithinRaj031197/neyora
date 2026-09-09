# NEYORA — Admin Guide

Everything you can change on the website, and how.

No part of this requires editing code. If you find yourself needing to, that is
a gap worth reporting.

---

## Contents

- [Signing in](#signing-in)
- [The dashboard](#the-dashboard)
- [Recipes](#recipes)
- [Pack sizes and scaling](#pack-sizes-and-scaling)
- [The Markdown editor](#the-markdown-editor)
- [Products](#products)
- [The media library](#the-media-library)
- [Pages](#pages)
- [The homepage](#the-homepage)
- [FAQs and testimonials](#faqs-and-testimonials)
- [Categories and tags](#categories-and-tags)
- [Site settings](#site-settings)
- [Social links](#social-links)
- [The QR code on your packaging](#the-qr-code-on-your-packaging)
- [Messages](#messages)
- [SEO](#seo)
- [Users and admins](#users-and-admins)
- [Publishing, scheduling and deleting](#publishing-scheduling-and-deleting)
- [Writing well for NEYORA](#writing-well-for-neyora)
- [Before you launch](#before-you-launch)

---

## Signing in

Go to **`/admin`**. Sign in with the email and password of your Supabase Auth
account.

Two things have to be true: the account exists in Supabase Auth, **and** it has
been granted CMS access. If you are signed in but told the account has no
access, an owner needs to add you at **Admin → Users**.

Sessions refresh themselves while you work, so a long editing session will not
throw you out mid-recipe.

---

## The dashboard

The landing screen shows what needs attention: published and draft counts,
messages waiting for a reply, where the pack QR currently leads and how many
times it has been scanned, and your most-read recipes.

If something is misconfigured — no WhatsApp number, a missing server key, a
setup token still lying around — it says so here rather than letting you
discover it later.

---

## Recipes

**Admin → Recipes.**

The list shows status, category, pack size, views and when each was last
edited. Search by title or slug; filter by status. Each row has quick actions:
feature, publish/unpublish, duplicate, preview, view live, edit.

### Writing one

1. **New recipe.**
2. **Title.** The slug — the part of the URL after `/recipes/` — generates
   itself. Once you have published, changing the slug breaks any existing link
   to the recipe, so the field stops following the title after the first save.
3. **Excerpt.** One or two sentences. It appears on recipe cards and becomes
   the description in Google when you have not written a separate SEO one.
   Worth the effort.
4. **Category** and **difficulty**.
5. **Cover image.** Landscape. Used on cards, the recipe hero, and social
   previews. Give it real alt text in the media library.
6. **Timings and yield.** Prep and cook in minutes; total is calculated.
7. **Pack size** — see the next section.
8. **Ingredients.** One row each. Use the numeric quantity field rather than
   typing "200g" into the name — this is what lets the site scale the recipe
   and what search engines read.
9. **Method.** One step per instruction. Optional short title, optional
   duration. These become the numbered steps on the page and the structured
   steps Google reads.
10. **Notes and story.** The editorial part — why it works, what to watch for,
    what to serve it with. Written in Markdown.
11. **Extras.** Equipment, a "Worth knowing" note, tags.
12. **Nutrition.** Optional. Always fill in the note field saying where the
    figures come from.
13. **Search and social.** Leave blank and the title and excerpt are used,
    which is usually right.
14. Set the status and **Save**.

### Preview

**Preview** opens the recipe exactly as it will look, with an unmistakable
banner saying it is not public. Drafts are genuinely invisible to visitors —
that is enforced by the database, not by a setting.

### Duplicate

Copies a recipe as an unpublished draft with a `-copy` slug. The way to build a
variation on something that already works, with no risk of publishing it by
accident.

---

## Pack sizes and scaling

Recipes are written for a specific pack, because "200 g of mushrooms" is a real
constraint in a real kitchen.

**Recommended pack** — the pack this recipe is for.
**Base pack weight (grams)** — what the ingredient list below is written for.
Required for scaling to work.
**Allow automatic scaling** — leave on unless the quantities genuinely do not
scale (a batter, or anything that depends on pan size).

### The "scale with pack size" tick

On each ingredient. Untick it for anything measured by taste — salt, pepper,
oil for frying, chilli. Those pass through unchanged when the recipe is scaled.

This one tick is the difference between a scaled recipe that works and one that
is inedible. Doubling a recipe should not double the chilli.

### Hand-written lists for other packs

After the first save, a **Pack-size specific ingredients** panel appears. Pick
a pack size and it pre-fills with the arithmetically scaled list; adjust
anything that does not scale cleanly and save.

A saved list always wins over automatic scaling. Add a note too — "cook in two
batches" is exactly the kind of thing 500 g needs and 200 g does not.

Visitors see a pack-size switcher on the recipe page, and the page tells them
whether they are looking at quantities written for that pack or scaled ones.

---

## The Markdown editor

Editor on the left, live preview on the right. On a phone, tabs.

The preview runs the **same** sanitiser as the live site, so what you see is
exactly what visitors get.

### Toolbar

**H2 / H3** headings · **B** bold · **I** italic · bulleted list · numbered
list · quote · link · table · horizontal rule · code block · **Image** (opens
the media library)

Shortcuts: `⌘B` bold, `⌘I` italic, `⌘K` link.

### Markdown, briefly

```markdown
## A heading
### A smaller heading

**bold**  _italic_

- a bullet
- another

1. first
2. second

> A quote — good for a single important note.

[link text](/farm)   or   [external](https://example.com)

| Day | What to expect |
| --- | --- |
| 0–2 | Firm, faint sweet scent |
| 3–4 | Slightly softer |

---
```

Raw HTML is not rendered. Anything unsafe is stripped, which is why the preview
occasionally drops something you pasted from elsewhere.

---

## Products

**Admin → Products.**

The fields are deliberately generic — category, variety, weight, highlights —
so adding greens, herbs or honey is a content change, not a code change. Create
a new category and the products page picks it up.

Notable fields:

- **Weight label** is what customers see ("200 g"); **weight in grams** is what
  structured data uses.
- **MRP** is shown struck through only when it is higher than the price. The
  form refuses an MRP below the price, because that is always a typo.
- Leave the price blank and the page simply omits it.
- **Availability** changes the badge and the structured data.
- **Highlights** appear as a checklist. Keep them to things you can stand
  behind — "Harvested the morning of dispatch", not "The World's Best".
- **Photography.** The first image is the primary one, used on cards and social
  previews. Reorder with the arrows.
- **Storage notes** appear in the sidebar alongside a link to the full storage
  page.

There is no shopping cart. Ordering happens on WhatsApp, so the product page's
main action is a WhatsApp link pre-filled with the product name — configure the
number in Site settings.

---

## The media library

**Admin → Media.**

Drag images in, or choose files. Each upload is resized in your browser to WebP
at four widths before it leaves your machine, so pages load quickly without a
paid image service. Upload the best original you have, up to 25 MB.

SVG logos are stored as-is.

**Alt text matters.** It is read aloud by screen readers and shown when an
image fails to load. Images without it are flagged on the thumbnail. Describe
what is in the picture — "Clusters of grey oyster mushrooms on raw linen in
morning light" — and skip "image of", which screen readers already say.

Click any image for details: dimensions, file size, how many sizes are stored,
a copyable URL, and the alt/title/description/folder fields.

**Folders** are just labels (lowercase, hyphens) for finding things again:
`hero`, `recipes`, `products`, `farm`, `social`.

Deleting removes every stored size permanently. Check nothing is using it
first — unlike content, this one is not recoverable.

---

## Pages

**Admin → Pages.**

The editorial pages: About, Our Farm, Quality & Growing, How to Store, the FAQ
and Contact introductions, and the three legal pages.

Pages marked **Fixed URL** have a route in the application pointing at them.
Rewrite them freely — every word, the hero image, the SEO fields — but their
slug cannot change and they cannot be deleted, because either would break a
real URL.

Pages marked **Demo copy** still have their seeded text. It was written to
sound like NEYORA, not to state facts about your farm. Rewrite before launch.

### Adding a genuinely new page

A new slug needs a matching route file, or the URL will 404. Create the page
here, then add `app/(public)/<slug>/page.tsx` copying the three-line pattern
from `app/(public)/about/page.tsx`. Editing an existing page needs nothing.

---

## The homepage

**Admin → Homepage.**

Every headline, paragraph, button label, button link and image on the homepage
is a field on this screen, grouped by section: Hero, Products, Why NEYORA, Farm
story, Recipes, Community and social, Closing call to action, and Homepage SEO.

**Sections shown** turns a whole block off without losing the copy you wrote
for it. Useful when you have no testimonials yet, or no products in season.

**Why NEYORA pillars** are numbered across the dark green band. Four reads
best; more than six starts to look like a list of features.

Buttons need both a label and a link. A path like `/products`, or a full
`https://` URL. Leave either blank and the button does not render.

Saving is live immediately.

---

## FAQs and testimonials

**Admin → FAQs.** Grouped by category on the public page, and published as FAQ
structured data so answers can appear directly in search results. Answers are
Markdown. Use the category field to group; existing categories are suggested.

**Admin → Testimonials.** Tick "Show on the homepage" for the community
section. Ratings are stored but not displayed as stars, and the site publishes
no aggregate rating.

Publish only what someone actually said, with their permission. Invented
reviews are dishonest and, in most markets, illegal.

---

## Categories and tags

**Admin → Categories.**

**Recipe categories** get their own landing page at
`/recipes/category/<slug>`, with a description, image and SEO fields.

**Product categories** filter the products page. This is where a second product
line begins.

**Recipe tags** are lighter — they only drive the filters on the recipes page,
and appear as keywords in each recipe's structured data.

Deleting a category does not delete its content; the content simply loses its
category.

---

## Site settings

**Admin → Site settings.** Requires the admin or owner role.

**Brand** — name, tagline, description, legal entity name.

**Contact** — email, phone, address, business hours. Anything left blank is
removed from the site rather than shown as a dead link.

**WhatsApp** — digits only, including the country code: `919876543210`. No plus
sign, spaces or dashes; `wa.me` rejects them. Until this is set, every WhatsApp
button on the site is hidden. The default message is pre-filled when someone
taps one.

**Footer** — tagline, note, copyright holder.

**Announcement bar** — a single line above the header. Good for a seasonal note
or a delivery pause. Turn it off when it stops being true.

**Default SEO** — used wherever a page has not set its own. Worth filling in
all three, including the sharing image.

**Demo content** — removes every seeded recipe, product, FAQ, testimonial and
placeholder image. Permanent. Seeded *pages* are kept, because they are real
routes; rewrite those instead.

---

## Social links

**Admin → Social links.**

Fill in the URL, tick "Show on the site", save. The footer, contact page and
homepage social band update immediately, and the URLs are published as `sameAs`
in your organisation's structured data — which is how search engines associate
your profiles with your brand.

A link appears only when it is both ticked and has a URL. Untick one to hide it
without losing the address.

WhatsApp lives in Site settings instead, because the number is used to build
links across the whole site.

---

## The QR code on your packaging

**Admin → QR redirects.** This is the most valuable screen in the CMS.

**Print a QR code that resolves to `https://your-domain.com/go`.** Nothing
else. Never print a link to a specific recipe — you would be committing to it
for the life of every label already in circulation.

To change where every pack already printed leads: edit the `go` row's
destination and save. That is the whole procedure.

- **Keep the type at 302.** A 301 is cached permanently by browsers, so anyone
  who has already scanned would keep going to the old destination. The form
  refuses a 301 on `go` for this reason.
- **Destinations must be a path on your own site.** External URLs are rejected
  by the form and by the database, so the code can never be turned into a link
  to somewhere else.
- **Landing screen.** Add a title to show a short mobile-first message before
  continuing, instead of redirecting instantly. Good for a seasonal note that
  would otherwise flash past. Leave the title blank for an immediate redirect.
- **Namespaced codes.** `go/200g`, `go/spring`, `go/wholesale` — a per-pack or
  per-campaign code. An unknown code falls back to whatever `go` points at, so
  a mis-printed label still lands somewhere sensible.
- **Scans are counted**, with the last scan time, on this screen and the
  dashboard.
- The `go` row cannot be deleted. Every printed label depends on it. Re-point
  it or disable it; a disabled code falls back to the recipes page rather than
  erroring, so a scan is never a dead end.

### Ideas for what to point it at

Recipes page (the default) · a seasonal recipe collection · a specific recipe
during a promotion · the storage guide, if that is what customers ask about
most · a campaign page · the product page for reorders

---

## Messages

**Admin → Messages.**

Contact form submissions land here. Nothing is emailed — that keeps the site
free of a paid email service.

Open a message to read it, reply by email (opens your mail client with the
subject pre-filled), or WhatsApp if they left a number. Set a status — New,
Read, Replied, Archived, Spam — and add an internal note that is never sent to
the sender.

We store a salted one-way hash of the sender's IP purely to limit spam. The
address itself is never recorded.

---

## SEO

Per-page titles and descriptions are edited alongside the content itself, which
is where you are already looking. **Admin → SEO** exists to tell you what is
missing and to show what is actually being emitted.

It lists what is generated automatically with no configuration —
`sitemap.xml`, `robots.txt`, Organization, WebSite, Recipe, Product, FAQPage
and Breadcrumb structured data, Open Graph and X cards, canonical URLs — plus
any gaps worth fixing, and a preview of how each published recipe will appear
in Google.

Titles over about 60 characters and descriptions over about 155 get truncated;
the previews flag both.

---

## Users and admins

**Admin → Users.** Requires the admin or owner role.

Two steps, on purpose:

1. Create the account in **Supabase → Authentication → Users**.
2. Grant it CMS access here.

Passwords, email confirmation and rate limiting are Supabase's job. We do not
reimplement them.

| Role | Can do |
| --- | --- |
| **Editor** | All content: recipes, products, pages, media, FAQs, testimonials |
| **Admin** | The above, plus site settings, QR redirects and granting access |
| **Owner** | Everything, including creating other owners |

You cannot revoke your own access, and the last remaining owner cannot be
removed or demoted. Neither is a UI nicety — the database refuses both, so you
cannot lock yourself out.

Revoking access leaves the Supabase Auth account intact, so it can be granted
again later.

---

## Publishing, scheduling and deleting

Every piece of content has one of three states:

| Status | Meaning |
| --- | --- |
| **Draft** | Not visible to anyone but you. Genuinely invisible — enforced by the database. |
| **Published** | Live now. |
| **Scheduled** | Goes live on its own once the date and time pass. |

**Scheduled times are UTC.** If a recipe has not appeared, check the date has
passed.

**Deleting is a soft delete.** Content disappears from the website immediately
but is retained in the database, so a mis-click during a launch is recoverable
by an administrator. The exceptions, which are permanent: deleting an image,
deleting a tag, and purging demo content.

Publishing takes effect on the public site immediately.

---

## Writing well for NEYORA

From `docs/BRAND_GUIDELINES.md`, because it applies to everything you type
here.

The voice is **calm, specific, unhurried.** State facts about how food is
grown. Do not shout.

> Write "Harvested the morning it ships."
> Not "The FRESHEST mushrooms EVER!"

- Specific beats enthusiastic. "From cut to cold storage is under an hour"
  earns more trust than "super fresh".
- Say what you will not do. "Between 8% and 12% of each harvest goes to
  compost" is more convincing than any badge.
- No health claims you cannot support with a document. Oyster mushrooms are a
  genuinely good food; that is not the same as medicine.
- No invented certifications, awards or reviews.
- Answer "it depends" honestly, then say what it depends on.
- Keep paragraphs short. Long measure reads as a blog, not a brand.

---

## Before you launch

- [ ] Rewrite every page marked **Demo copy** — especially About, Farm and
      Quality.
- [ ] **Have the privacy, terms and cookie pages reviewed.** They are
      templates, not legal advice.
- [ ] Replace the placeholder images with real photography. Shoot direction is
      in `docs/BRAND_GUIDELINES.md` §5.
- [ ] Write alt text for every image.
- [ ] Set the WhatsApp number, email, phone and address in Site settings.
- [ ] Fill in the default SEO title, description and sharing image.
- [ ] Add your real social links.
- [ ] Point the `go` redirect where you want it, and print the QR against
      `https://your-domain.com/go`.
- [ ] Replace the demo product's price, weight and nutrition figures — or
      remove the nutrition table until you have a lab report.
- [ ] Publish at least three recipes, so the recipes page and the homepage
      section both look considered.
- [ ] Check the site on a phone. The QR landing especially.
- [ ] Confirm `NEXT_PUBLIC_SITE_URL` is your real domain, then rebuild — the
      sitemap and canonical URLs depend on it.
- [ ] Remove `ADMIN_SETUP_TOKEN` from your hosting environment.
- [ ] Remove the demo content.
- [ ] Submit `https://your-domain.com/sitemap.xml` to Google Search Console.
