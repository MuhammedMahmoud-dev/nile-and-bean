---
name: Nile & Bean
description: An Egyptian café's ordering site, lettered as a Cairo shopfront of enamel street plates and painted shop boards.
colors:
  enamel: "#1c3f94"
  enamel-deep: "#13296a"
  enamel-night: "#0b1a3d"
  enamel-tint: "#eef2fb"
  signpainter-red: "#c8281e"
  red-deep: "#9e1d15"
  saffron: "#f2b518"
  saffron-deep: "#c98f00"
  plaster: "#dcebe5"
  plaster-deep: "#c9ded5"
  plaster-line: "#b5cec3"
  enamel-white: "#fbfbf8"
  ink: "#0e1a33"
  ink-soft: "#3b4a63"
  on-enamel-soft: "#c9d6f2"
  ok: "#1d6b45"
  ok-tint: "#d7efe2"
  warn-tint: "#fdf0c8"
  err-tint: "#f9dcd8"
typography:
  sign-arabic-display:
    fontFamily: "'Aref Ruqaa', 'Readex Pro', serif"
    fontSize: "clamp(3.2rem, 9vw, 6rem)"
    fontWeight: 700
    lineHeight: 1.15
  sign-english-display:
    fontFamily: "'Bungee', 'Readex Pro', system-ui, sans-serif"
    fontSize: "clamp(1.6rem, 4.6vw, 3rem)"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "0.04em"
  headline-arabic:
    fontFamily: "'Aref Ruqaa', 'Readex Pro', serif"
    fontSize: "clamp(1.9rem, 4vw, 2.9rem)"
    fontWeight: 700
    lineHeight: 1.25
  headline:
    fontFamily: "'Bungee', 'Readex Pro', system-ui, sans-serif"
    fontSize: "clamp(1.45rem, 3vw, 2.15rem)"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "0.02em"
  title:
    fontFamily: "'Readex Pro', 'Segoe UI', system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.1
  list-arabic:
    fontFamily: "'Aref Ruqaa', 'Readex Pro', serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "'Readex Pro', 'Segoe UI', system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "'Readex Pro', 'Segoe UI', system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.2
  small:
    fontFamily: "'Readex Pro', 'Segoe UI', system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.4
  price:
    fontFamily: "'Readex Pro', 'Segoe UI', system-ui, sans-serif"
    fontWeight: 700
    fontFeature: "tnum"
rounded:
  plate: "12px"
  small: "8px"
  tag: "6px"
  pill: "999px"
spacing:
  rule: "3px"
  rule-gap: "5px"
  xs: "0.35rem"
  sm: "0.6rem"
  md: "1rem"
  lg: "1.75rem"
  xl: "2.5rem"
  section: "clamp(3.5rem, 8vw, 6rem)"
  wrap: "1180px"
components:
  button-enamel:
    backgroundColor: "{colors.enamel}"
    textColor: "{colors.enamel-white}"
    typography: "{typography.label}"
    rounded: "{rounded.small}"
    padding: "0.75rem 1.4rem"
    height: "3rem"
  button-enamel-hover:
    backgroundColor: "{colors.enamel-deep}"
  button-red:
    backgroundColor: "{colors.signpainter-red}"
    textColor: "{colors.enamel-white}"
    rounded: "{rounded.small}"
    padding: "0.75rem 1.4rem"
    height: "3rem"
  button-red-hover:
    backgroundColor: "{colors.red-deep}"
  button-white:
    backgroundColor: "{colors.enamel-white}"
    textColor: "{colors.enamel}"
    rounded: "{rounded.small}"
    padding: "0.75rem 1.4rem"
    height: "3rem"
  button-white-hover:
    backgroundColor: "{colors.enamel-tint}"
  button-saffron:
    backgroundColor: "{colors.saffron}"
    textColor: "{colors.ink}"
    rounded: "{rounded.small}"
    padding: "0.75rem 1.4rem"
    height: "3rem"
  button-ghost:
    textColor: "{colors.enamel}"
    rounded: "{rounded.small}"
    padding: "0.75rem 1.4rem"
    height: "3rem"
  button-sm:
    padding: "0.45rem 0.95rem"
    height: "2.4rem"
  field:
    backgroundColor: "{colors.enamel-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.small}"
    padding: "0.7rem 0.9rem"
    height: "3rem"
  nav-plate:
    textColor: "{colors.enamel}"
    rounded: "{rounded.small}"
    padding: "0.45rem 0.85rem"
  nav-plate-current:
    backgroundColor: "{colors.enamel}"
    textColor: "{colors.enamel-white}"
  option-plate:
    backgroundColor: "{colors.enamel-white}"
    textColor: "{colors.enamel}"
    rounded: "{rounded.small}"
    padding: "0.5rem 1rem"
    height: "3.1rem"
  option-plate-checked:
    backgroundColor: "{colors.enamel}"
    textColor: "{colors.enamel-white}"
  chip:
    backgroundColor: "{colors.enamel-tint}"
    textColor: "{colors.enamel}"
    rounded: "{rounded.pill}"
    padding: "0.12rem 0.55rem"
  price-tag:
    backgroundColor: "{colors.saffron}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tag}"
    padding: "0.35rem 0.75rem 0.4rem"
  panel:
    backgroundColor: "{colors.enamel-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.plate}"
    padding: "clamp(1.5rem, 3vw, 2.1rem)"
  toast:
    backgroundColor: "{colors.enamel-night}"
    textColor: "{colors.enamel-white}"
    rounded: "{rounded.small}"
    padding: "0.85rem 1.2rem"
---

# Design System: Nile & Bean

## Overview

**Creative North Star: "The Cairo Shopfront"**

Every surface is a sign mounted on a street wall. The ground is a flat mint-painted plaster wall with a faint grain; on it hang cobalt enamel street plates (white rule inset from the edge, a soft sheen across the top, rivets in the corners) and hand-painted shop boards in signpainter red and saffron. Sections open with their sign: Arabic in Ruqaa calligraphy, English in Bungee with a painter's drop shade, and everything you actually read set in Readex Pro. The café is Egyptian first; English is the second line on the sign, not the other way round.

The system is the same street on both sides of the counter. Public pages letter the wall loudly: hung boards, direction-arrow signs, a saffron fascia band. The admin area (`admin.css`) reuses the same tokens, plates, buttons, fields and status plates, held quieter: a night-enamel staff bar, white tables with cobalt header rows, door plates for the dashboard, so tables and forms lead.

It refuses the cream-and-latte-photo coffee template: no beige ground, no brown-and-cream palette, no serif "artisan" display, no hero of steam over a cup. Photography exists (product plates, story band), but it is framed by plates, never the identity.

**Key Characteristics:**
- Mint plaster wall as ground; cobalt enamel as the dominant figure; red and saffron as painted accents.
- Plates everywhere: buttons, nav links, filters, options, summaries and panels all carry the inset-rule language.
- Arabic over English on every sign, in three faces with fixed roles.
- Prices in Egyptian pounds, tabular numerals, live from the API.
- One authored motion moment (the home board being hung and lettered); everything else is functional feedback.
- Honest demo strip in saffron at the top of every page, public and admin.

## Colors

A three-pot signpainter palette (cobalt enamel, signpainter red, saffron) laid on a mint plaster wall, with navy ink for reading.

### Primary
- **Cobalt Enamel** (enamel): the street-plate field. Buttons by default, the current nav plate, checked options, page-title plates, product-plate bodies, the shop board, panel rules, admin table headers.
- **Deep Cobalt** (enamel-deep): hover state for enamel, the focus ring on every light surface, and the photo-fallback plate.
- **Night Enamel** (enamel-night): the footer, the admin staff bar, the toast. The darkest plate; never a page ground.
- **Enamel Tint** (enamel-tint): the light cobalt wash for row hovers, the white button's hover, quantity-stepper hovers and option chips.

### Secondary
- **Signpainter Red** (signpainter-red): the "Order now" plate and every commit action (submit, place order), the closing board, Arabic sign lettering on the wall, the double rule under the price board head.
- **Red Deep** (red-deep): red hover, prices on the price board, the drop shade under English and white lettering on cobalt and red, destructive admin actions, and error text (`--err` is this same value).

### Tertiary
- **Saffron** (saffron): drop shade under wall lettering, the saffron fascia band, price tags, cart count, the demo strip, and lettering inside dark plates (brand English, live price, summary total, door-plate Arabic).
- **Saffron Deep** (saffron-deep): the drop shade under white Arabic lettering on cobalt and red boards.

### Neutral
- **Mint Plaster** (plaster): the page ground on every page, public and admin.
- **Plaster Deep** (plaster-deep): banded sections, the lower facade band behind the home board, skeleton and image-loading fill.
- **Plaster Line** (plaster-line): field borders, dashed row dividers, unselected option and choice plate outlines.
- **Enamel White** (enamel-white): white plates, panels, fields, product plates, text on cobalt and red.
- **Ink** (ink): body text and text on saffron.
- **Ink Soft** (ink-soft): secondary text on the wall and on white (7.3:1 on plaster).
- **Soft Enamel Text** (on-enamel-soft): secondary text inside cobalt and night plates.
- **Status** (ok, ok-tint, warn-tint, err-tint): order-status plates, notices and form errors; each tint carries its own darker text and a 2px inset outline.

### Named Rules

**The Surface-Bound Focus Rule.** The focus ring is a 3px outline offset 3px. On light grounds (plaster, white plates, fields, options) it is Deep Cobalt. Saffron is used only inside dark plates (`.on-dark`, the footer, the staff bar). Saffron on the mint wall measures 1.5:1 and is never used there.

**The Saffron Is Not Text On Light Rule.** Saffron is never text on white, on plaster, or on red; on red it measures about 3:1. Saffron text lives only on cobalt or night enamel. The red closing board letters in white, shaded with saffron-deep (Arabic) or red-deep (English).

**The No Caramel Rule.** There is no brown, caramel or latte tone in this system. A warm accent is saffron or red, nothing else.

## Typography

**Arabic Sign Font:** Aref Ruqaa 700 (with Readex Pro, serif)
**English Sign Font:** Bungee 400 (with Readex Pro, system-ui)
**Body Font:** Readex Pro 300 to 700, variable (with Segoe UI, system-ui)

**Character:** Ruqaa is the hand of a Cairo signpainter, Bungee is the vertical-sign capital of a street front, and Readex Pro reads cleanly in both scripts. All three are self-hosted (`css/fonts.css`), latin and arabic subsets only.

### Hierarchy
- **Sign display** (Ruqaa 700, clamp(3.2rem, 9vw, 6rem), 1.15; Bungee clamp(1.6rem, 4.6vw, 3rem), 0.04em): the home shop board only.
- **Headline** (Ruqaa 700 clamp(1.9rem, 4vw, 2.9rem) in red over Bungee 400 clamp(1.45rem, 3vw, 2.15rem) in cobalt, both with a saffron drop shade): every section's sign heading. On inner pages the English h1 is mounted as a cobalt plate with a red-deep shade.
- **Title** (Readex Pro 700, 1.1 to 1.3rem): panel heads, summary heads, prose subheads, door-plate titles; the Arabic companion sits inline in Ruqaa, red on white and saffron on cobalt.
- **List Arabic** (Ruqaa 700, 1.2 to 1.45rem): Arabic names in price rows, product plates, option plates, cart lines.
- **Body** (Readex Pro 400, 1.0625rem, 1.6; 1rem under 520px): running text, capped at 58 to 62ch on the wall.
- **Label** (Readex Pro 600, 0.9375rem): buttons, nav plates, form labels.
- **Small** (Readex Pro 500, 0.8125rem): hints, field errors, status plates, timestamps, the demo strip.
- **Price** (Readex Pro 700, tabular numerals): every money figure. Running totals inside dark plates (live price, summary total) and order numbers are set in Bungee.

### Named Rules

**The Drop Shade Rule.** Sign lettering carries a hard, blur-free offset shade in a second paint colour: Arabic 0.035em 0.045em, English 0.06em 0.06em. Saffron under cobalt or red letters on the wall; saffron-deep under white Arabic on boards; red-deep under English on cobalt and red. This is the signpainter's device and applies to sign lettering only, never to body text, buttons or boxes.

**The Bilingual Sign Rule.** On signs (the shop board, product plates, the product page title) the Arabic sits on its own line, right-aligned, above the English, as on a bilingual sign. Section sign headings lead with the Arabic and let the English follow on the same baseline, wrapping beneath it when narrow. In lists (price rows, cart lines, order lines, option plates) the Arabic sits above the English at the start edge. Every Arabic run carries `lang="ar" dir="rtl"`.

**The Three Faces Rule.** Ruqaa only for Arabic sign lettering, Bungee only for English sign lettering and big figures, Readex Pro for everything read. Arabic inside running prose is Readex Pro (`.ar-body`), not Ruqaa.

## Layout

A single centred column, `min(1180px, 100% - 2.5rem)`, with sections spaced by clamp(3.5rem, 8vw, 6rem) and alternating with plaster-deep bands bordered by a 2px plaster-line rule. The home first viewport is a 1.55fr / 1fr grid: the hung shop board on the left, the white price board on the right. Product grids auto-fill at 250px minimum (320px for the featured three). Product, cart, story and about pages are two-column grids that collapse to one; the product photo and the cart summary are sticky at 6.5rem below the sticky header. Auth and small pages use a 480px narrow column. Admin pages use the same wrap with a 2.25rem top and tables that scroll horizontally above 640px of content.

Breakpoints: 1023px (home grid, direction signs and cart stack), 860px (nav moves to the menu toggle, two-column pages stack, footer to two columns), 520px (body to 1rem, field rows stack, cart lines tighten). Spacing inside components runs on rem steps around 0.35, 0.6, 1, 1.75 and 2.5rem; the plate rule geometry (rule 3px at a 5px gap) is the one fixed-pixel rhythm.

## Elevation & Depth

Depth is physical: signs hang on a wall, so they cast a soft navy shadow downward. Two shadows carry everything, plus the inset rules that make a plate a plate. The rule is drawn with stacked inset box-shadows (field colour at the gap width, then the rule colour at gap plus rule), so it costs no border and follows the radius. Hover lifts a plate by 2 to 4px and steps it from lift to lift-high.

### Shadow Vocabulary
- **Lift** (`box-shadow: 0 10px 22px -10px rgba(11, 26, 61, 0.45), 0 2px 4px rgba(11, 26, 61, 0.12)`): every plate at rest: panels, product plates, page-title plates, order rows, tables.
- **Lift High** (`box-shadow: 0 18px 34px -14px rgba(11, 26, 61, 0.5), 0 3px 6px rgba(11, 26, 61, 0.14)`): the hung shop board, the story and product photos, the toast, and plates on hover.
- **Button shadow** (`0 6px 14px -8px rgba(11, 26, 61, 0.55)`, deepening to `0 12px 22px -10px` on hover): plate buttons.

### Named Rules

**The Hung Not Floating Rule.** Shadows are always navy, soft, and fall downward, as from a sign on a wall. No hard offset box shadows, no coloured glows.

## Shapes

Plates have gently rounded enamel corners: 12px for large plates (boards, panels, product plates, order rows), 8px for small plates (buttons, fields, nav, filter, option and choice plates), 6px for tags, status plates and row hovers, and full pills only for counts and chips. The defining form is the inset white rule (3px at 5px from the edge by default; boards widen it to 4px at 10px, small controls tighten it to about 1.5px at 3px). Large plates add rivets: four small radial-gradient dots inset 14px from the corners. Two signature silhouettes: the direction sign, an arrow plate clipped to a point on its right with an inner 2.5px cobalt rule, and the saffron price tag, rotated 3 degrees off the photo's corner. Lists use 1.5px dashed plaster-line dividers, like chalked lines on a board. Icons follow one grammar: a 24px box, 2px round stroke, round joins, no fills, coloured by `currentColor` (`assets/icons.svg`).

## Components

### Buttons
Buttons are small plates: confident, painted, physical.
- **Shape:** small plate corners (8px), min height 3rem (2.4rem for the small size), with an inset 2px rule at 4px from the edge in the button's rule colour.
- **Primary:** cobalt enamel with white text; red is the commit and order action; white with a cobalt rule for secondary navigation; saffron with an ink rule sparingly.
- **Hover / Focus:** lifts 2px with a deeper shadow; enamel and red darken to their deep tones; white goes to enamel-tint. Focus is the surface-bound ring. Disabled at 0.55 opacity, no lift.
- **Ghost:** transparent with a 2px cobalt inset outline; hover adds an 8% cobalt wash.
- **Admin row actions:** 6px corners, 2.3rem high, white with a 2px cobalt outline that fills cobalt on hover; destructive actions use red-deep. Admin submit is a red plate.

### Chips
- **Style:** pill, enamel-tint ground, cobalt text, 0.8125rem; used for a cart line's chosen options.

### Status plates
- 6px corners, uppercase 0.8125rem 700 with 0.04em tracking, a leading dot in `currentColor`. Pending warn-tint, preparing cobalt tint, ready ok-tint, completed grey-green, cancelled err-tint. Shared by customer and admin pages.

### Cards / Containers
- **Panel:** white, 12px, an inset cobalt rule (2.5px at 5px), lift. The working container for forms, tickets, admin dashboards.
- **Product plate:** white plate with a 4:3 photo over a cobalt enamel body carrying a white inset rule; Arabic name in Ruqaa, English in Readex 600, description in soft enamel text; saffron price tag on the photo. Hover swings it: up 4px and rotate -0.6deg on a top-centre pivot, the tag rotating back to -2deg.
- **Summary:** a cobalt plate, sticky, with dashed light dividers and a saffron Bungee total.
- **Order row:** a white plate with an inset cobalt rule, Bungee order number, status plate, tabular total.
- **Door plate (admin):** a cobalt plate with a saffron icon and saffron Ruqaa name.

### Inputs / Fields
- **Style:** white, 2px plaster-line border, 8px corners, min height 3rem; placeholder in #5b6a82 (5.1:1 on white).
- **Focus:** border goes cobalt with a 3px cobalt halo at 25%.
- **Error:** border and message in red-deep, `aria-invalid` driven; form-level errors in an err-tint notice with a 2px inset outline.
- **Options and choices:** native radios and checkboxes inside label plates; unselected white with a plaster-line outline, checked cobalt with a white inset rule; focus ring on the plate.

### Navigation
- **Header:** a sticky street fascia in translucent plaster with an 8px blur and a 3px cobalt bottom rule; the brand is a small riveted cobalt plate (Ruqaa name over saffron Bungee). Nav links are small plates: cobalt text, white with a cobalt outline on hover, the current page a cobalt plate with a white rule. The cart is a cobalt plate with a saffron pill count.
- **Mobile (under 860px):** nav moves behind a white menu-toggle plate; the menu lists full-width white plates.
- **Admin:** a night-enamel staff bar with a saffron Bungee role badge; the current link is a white plate.
- **Footer:** night enamel with a 5px cobalt top rule, saffron Bungee column heads, white links that underline on hover.

### The Shop Board (signature)
The home's hung board: a cobalt plate with a 4px white rule at 10px, rivets, and lift-high, hung from two chains with hooks; Arabic name in white Ruqaa with a saffron-deep shade, English in saffron Bungee with a red-deep shade, a red painted strip along the bottom edge lettering the drinks in both scripts. Beside it the white price board lists today's drinks from the API under a red double rule: Arabic name over English at the start edge, the price in red-deep with Eastern Arabic numerals beneath it ("٤٥ ج.م").

### Prices
Whole pounds render as "EGP 95"; piastres appear only when present ("EGP 42.50"). All price figures are tabular.

### Photo fallback
A product photo that fails to load is replaced by a deep-cobalt name plate (saffron Ruqaa name, soft English name, an inset half-white rule) at the photo's own aspect ratio, never a broken-image box.

### Motion
One authored moment: on the home page the board is hung (drop, swing, settle over 1.25s), then lettered (Arabic painted in right to left, English left to right, by clip-path), then the price rows are chalked in with a 70ms stagger. Everything else is functional feedback only: the live price flips on change, the cart count bumps, the toast rises, pages cross-fade by view transition with the header held in place. One easing (`cubic-bezier(0.16, 1, 0.3, 1)`) for all of it. All entrance motion is opt-in behind `html.js`, and `prefers-reduced-motion` reduces every animation and transition to near zero and cancels hover lifts.

## Do's and Don'ts

### Do:
- **Do** set every page on the mint plaster wall and build its surfaces as plates with an inset rule, lift shadow, and enamel corners (12px large, 8px small).
- **Do** open every section with a bilingual sign: Ruqaa Arabic leading Bungee English, each with its drop shade.
- **Do** use Deep Cobalt for the focus ring on light surfaces and saffron only inside dark plates.
- **Do** make red the commit action (order, place order, submit) and cobalt the default.
- **Do** show money as "EGP 95" in tabular numerals, with piastres only when present.
- **Do** replace a failed product photo with the name-plate fallback.
- **Do** keep motion to the one home moment plus functional feedback, behind `html.js`, and honour `prefers-reduced-motion`.
- **Do** reuse the public tokens and components on admin pages, held quieter, rather than inventing an admin palette.
- **Do** keep every new text pair at WCAG AA; the shipped build measured 208 pairs across 17 pages with 0 failures.

### Don't:
- **Don't** use saffron as text on white, plaster or red, or as a focus ring on the wall.
- **Don't** introduce caramel, latte, cream or brown tones, or lead a surface with a cup-and-steam photo.
- **Don't** put Ruqaa or Bungee on anything people read at length; body, labels and forms are Readex Pro.
- **Don't** put English above Arabic on a sign.
- **Don't** apply the drop shade to boxes, buttons or body text, and don't add hard offset box shadows; depth is the soft hung shadow.
- **Don't** use glyph characters as icons; use the 2px round-stroke sprite.
- **Don't** add a second authored animation or decorative looping motion.
- **Don't** show a broken-image box anywhere.
