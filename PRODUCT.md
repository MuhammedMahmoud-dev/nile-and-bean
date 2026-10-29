# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences, and they are not the same people.

- **The audience that matters: whoever reviews the owner's portfolio or CV** — a
  recruiter or engineer opening the live site to judge the work. They arrive cold,
  click through quickly, and decide in minutes whether the project is complete and
  crafted. Confirmed: this is a portfolio project.
- **The audience the site pretends to serve: customers of an Egyptian café** ordering
  coffee, tea and pastries for pickup or delivery, plus café staff (administrators)
  managing orders, the menu, users and reviews. These are the roles the reviewer
  plays while evaluating it.

## Product Purpose

Nile & Bean is a fictional Egyptian café's online ordering site, built to demonstrate a
complete, working full-stack product: browse a menu, configure a drink, order for
pickup or delivery, and run the shop from an admin area.

Success means a reviewer can sign in, place an order end to end, see it confirmed and
listed, then switch to the admin side and manage it — without hitting a dead end, a
placeholder, or anything that behaves like a mockup.

## Positioning

An Egyptian café, not a generic coffee template — confirmed binding. Prices are in
Egyptian pounds. The name Nile & Bean carries the identity.

What a neighboring demo could not truthfully copy is the depth under the surface: drink
options priced live and re-priced authoritatively by the server, real auth and roles,
and a remediation history documented in AUDIT.md.

## Operating Context

- Orders are for **pickup or delivery**.
- **Payment is a demonstration.** No processor; card details are validated for shape
  and never transmitted. The site must say so plainly wherever payment appears.
- There is **no email infrastructure**. Any flow that would normally email (password
  reset, contact replies) must work without it.
- Runs as one FastAPI process serving both the static site and the API.

## Capabilities and Constraints

Confirmed and existing:

- Catalogue of 9 seeded products in 4 categories (coffee, tea, pastry, seasonal) with
  per-product sizes, milk choices and extras.
- Cart, checkout with validation, server-computed totals.
- JWT sign in / register / sign out; customer and administrator roles.
- Admin: orders with status changes, users, reviews, product create/edit/withdraw/delete.

Confirmed to be completed ("make it work as a whole"):

- A **My Orders** page for customers (the `/api/orders/me` endpoint exists; no page).
- An **order confirmation** after checkout (currently redirects home with no feedback).
- A **working contact form** that stores messages and shows them to administrators.
- **Password reset** without email: an administrator resets it; the page says so.

Technical constraints:

- Vanilla HTML/CSS/JS frontend, no build step. FastAPI + SQLAlchemy + SQLite backend.
- 123 tests must keep passing; CI runs pytest, vitest and a case-sensitive link check.

Decided by Claude, pending confirmation:

- **Currency is EGP.** Follows from the confirmed Egyptian identity.
- **Tax is Egyptian VAT at 14%**, replacing the original 8%, which matched no real
  jurisdiction. Configurable via `TAX_RATE`.

## Brand Commitments

- Name: **Nile & Bean**.
- Identity: an Egyptian café. Binding.
- Existing tagline copy: "Fresh Brews, Friendly Vibes".

## Evidence on Hand

- 9 product photographs, hotlinked from Unsplash (see `Backend/seed_data.json`).
- The 4 reviews are **seeded demo data**, not real customers. Never present them as
  genuine testimonials, and never add invented ones.
- No real customers, press, ratings, opening hours, address or phone number exist.
  Do not invent them as facts; anything shown must read as part of the demo.

## Product Principles

1. **No dead ends.** Every link, button and form does something real. A portfolio
   reviewer who hits one placeholder discounts the whole project.
2. **Honest about the demo.** Payment, reviews and contact are demonstrations; say so
   in place rather than imitate a real business.
3. **The server is the authority.** Prices, totals and permissions are decided by the
   API; the page previews, never decides.
4. **Egyptian, not generic.** The café's identity is the point of difference from every
   other coffee-shop template.

## Accessibility & Inclusion

WCAG 2.2 AA is the established bar: measured contrast (currently 0 failures across 115
pairs), full keyboard operability, accessible names on every control, visible focus,
`prefers-reduced-motion` honoured, and layouts verified at 360, 768 and 1440px.
