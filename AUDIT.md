# Audit — Nile & Bean, as received

This document records the state of the project **before any remediation work**.
It corresponds exactly to commit `41c611b` (*"chore: import team project as received"*),
which is the unmodified import of the five-person university team deliverable.

Every claim below is tagged with how it was established:

| Tag | Meaning |
|---|---|
| **[EXECUTED]** | Reproduced by running the code — in a browser against the site served over HTTP, or in a Node/Python process. Output quoted. |
| **[READ]** | Established by reading the source, or by a file/index listing. Deterministic, not run. |
| **[INFERRED]** | A conclusion drawn from evidence, not directly observed. Reasoning and confidence stated. |

Verification environment: Windows 11, Python 3.13.14, Node v24.15.0, Chromium via
the project served with `python -m http.server 8123` from the repository root.

---

## 1. What ships, and what is dead

The repository contains **three** codebases. Only one of them runs.

### 1.1 Summary

| Component | Files | Lines | Status |
|---|---:|---:|---|
| **Shipped site** — HTML pages | 13 | 2,177 | **Runs** |
| **Shipped site** — `js/` | 5 | 962 | **Runs** |
| **Shipped site** — `css/styles.css` | 1 | 977 | **Runs** |
| **Backend** — `Backend/**/*.py` | 8 | 138 | Runs, but unreachable from the UI |
| *Shipped subtotal* | *27* | *4,254* | |
| Dead — `src/` React scaffold | 73 | 6,863 | **Never loaded** |
| Dead — root duplicates of `js/`+`css/` | 6 | 1,935 | **Never loaded** |
| Dead — scaffold-only config files | 8 | 348 | Configures only `src/` |
| Dead — `Backend/**/__pycache__/*.pyc` | 8 | (binary) | Build artifact, committed |
| Dead — `bun.lockb`, `package-lock.json` | 2 | (198 KB, 253 KB) | Lockfiles for the dead scaffold |
| *Dead subtotal* | *97* | *9,146 + binaries* | |
| **Total tracked** | **128** | | |

**[READ]** — counts from `git ls-files` and `wc -l` against commit `41c611b`.

So roughly **two-thirds of the tracked files, and more than two-thirds of the
line count, are code that cannot execute.**

### 1.2 The dead React scaffold (`src/`)

`src/` holds a complete React 18 + Vite + TypeScript + shadcn/ui application:
7 page components, 3 layout components, 3 hand-written UI components, a cart
context hook, a typed product catalogue, and 49 unmodified shadcn primitives.

**Nothing loads it.** **[READ]** — `grep` for `src/main.tsx` and `/src/` across all
13 HTML files returns zero matches. The root `index.html` — which is both the site
entry point and the file Vite would use as its entry — ends with
`<script src="js/main.js"></script>`. There is no code path, in any mode, that
reaches `src/main.tsx`.

Corroborating evidence that this is machine-generated and was never adopted:

- `package.json` is named `vite_react_shadcn_ts`, version `0.0.0`. **[READ]**
- `lovable-tagger` is a declared devDependency, and `vite.config.ts` imports and
  registers `componentTagger()` from it. **[READ]**
- `src/pages/Index.tsx` is the untouched generator placeholder — it renders
  *"Welcome to Your Blank App"* and carries the comment *"Update this page (the
  content is just a fallback if you fail to update the page)"*. It is not routed. **[READ]**
- Every public HTML page loads `https://cdn.gpteng.co/gptengineer.js`. **[READ]**
- `index.html` still carries `og:image` pointing at `https://lovable.dev/opengraph-image-p98pqg.png`
  and `twitter:site` set to `@lovable_dev`. **[READ]**

The dead scaffold also duplicates the live app's data model in a third place:
`src/data/products.ts` holds the same nine products as `js/main.js`, and
`src/hooks/useCart.tsx` persists to `localStorage["brewBuddyCart"]` — a different
key from the live app's `localStorage["nilebeanCart"]`. **[READ]**

### 1.3 Duplicated files at the root

Six files exist twice: at the repository root, and under `js/` or `css/`.

**Every one of the 13 HTML pages loads the `js/` and `css/` copies.** The root
copies are dead. **[READ]** — `grep` of all `<script src>` and `<link rel="stylesheet">`
attributes shows only `js/*.js` and `css/styles.css`.

| Pair | Difference |
|---|---|
| `cart.js`, `menu.js`, `product.js`, `about.js` | Byte-identical to their `js/` copies. **[READ]** — `diff` reports no difference. |
| `main.js` vs `js/main.js` | **Differ on one line.** The root copy has a corrupted image URL: `"https://www.https://images.unsplash.com/photo-1511920170033-f8396924c348.com/food-cooking/cooking-tips-tutorials/a60980838/what-is-espresso/"`. The live `js/` copy has the correct `"https://images.unsplash.com/photo-1511920170033-f8396924c348"`. **[READ]** |
| `styles.css` vs `css/styles.css` | **Differ in the footer.** The root copy uses `display: grid; grid-template-columns: 1fr; gap: 2rem`. The live `css/` copy uses `display: flex; justify-content: space-between; margin-right: 20%` plus a `.footer-column p { width: 50% }` rule. **[READ]** |

The dead root `main.js` has a **newer** filesystem timestamp (2025-09-18) than the
live `js/main.js` (2025-05-26). **[READ]**

**[INFERRED]** — *High confidence.* Someone returned to the project roughly four
months after the main work and edited the wrong copy of `main.js`, introducing the
corrupted URL into a file that is never loaded. The edit had no effect on the site,
which is presumably why the corruption was never noticed. The alternative reading —
that the root copies are the intended ones and `js/` is stale — is contradicted by
every HTML page loading `js/`.

---

## 2. The three structural bugs

All three were **reproduced in a browser** against the site served over HTTP, not
merely reasoned about. Console output is quoted verbatim.

### 2.1 The menu page renders zero products

**Symptom:** `menu.html` shows the "no products" empty state for every category,
including "All Items", despite nine products being loaded.

**Mechanism.** `js/main.js` declares the catalogue as a rebindable variable, and
exports it by value before it is populated:

```js
let products = [];                                  // line 3 — empty array A

function fetchProducts() {
  products = [ /* …9 items… */ ];                   // REBINDS to a new array B
  renderFeaturedProducts();
  renderSpecialProducts();
}

document.addEventListener('DOMContentLoaded', function() {
  fetchProducts();                                  // runs after the export below
});

window.NileBean = {
  products,                                         // captures array A, by value
  getProductById,
  /* … */
};
```

The object literal at the bottom captures the **current value** of `products`,
which at script-evaluation time is the empty array `A`. Script evaluation completes
before `DOMContentLoaded` fires. When `fetchProducts()` later runs, `products = [...]`
**rebinds the variable to a new array `B`** — it does not mutate `A`. So
`window.NileBean.products` remains a reference to the empty array `A`, permanently.

`js/menu.js` reads exactly that export:

```js
const filteredProducts = activeCategory === 'all'
  ? window.NileBean.products                        // always []
  : window.NileBean.products.filter(/* … */);
```

**[EXECUTED]** — in the browser on `/menu.html`:

```json
{
  "bug_a_NileBean_products_length": 0,
  "bug_a_live_products_length": 9,
  "rendered_menu_cards": 0,
  "no_products_msg_visible": true,
  "category_title": "All Items"
}
```

**Why the other pages still work.** `index.html` works because
`renderFeaturedProducts()` lives inside `main.js` and reads the live `products`
binding directly. `product.html` works because `getProductById` is a *function* that
closes over the live binding and re-reads it at call time. Only the one consumer
that read the exported *array* is broken. This is why the failure looks isolated
rather than total, and why it survived review.

### 2.2 Two separate cart arrays — the cart UI does not update

**Symptom:** on `cart.html`, the quantity `+`/`−` buttons do not change the
displayed quantity; "Remove" leaves the row on screen; "Clear Cart" appears to do
nothing.

**Mechanism.** Two independent arrays are parsed from the same `localStorage` string:

```js
// js/main.js — script scope
const cart = JSON.parse(localStorage.getItem('nilebeanCart')) || [];

// js/cart.js — inside its own DOMContentLoaded callback, shadowing the above
const cart = JSON.parse(localStorage.getItem('nilebeanCart')) || [];
```

`JSON.parse` returns a **new object each call**, so these are two distinct arrays
holding equal-but-separate data. The click handlers then mutate one and re-render
from the other:

```js
// js/cart.js — `cart` here is cart.js's array
window.NileBean.updateCartItem(index, { quantity: cart[index].quantity + 1 });
renderCartItems();      // re-reads cart.js's array, which never changed
```

`updateCartItem` writes to `main.js`'s array and persists it to `localStorage`.
`renderCartItems` reads `cart.js`'s array. The write and the read never meet.

Because the new quantity is computed from the *stale* array, the operation is
**idempotent**: clicking `+` three times computes `1 + 1 = 2` three times.

**[EXECUTED]** — in the browser on `/cart.html`, clicking `+` three times, then "Clear Cart":

```json
{
  "before":                      { "shown_qty": "1", "stored_qty": 1 },
  "after_three_increment_clicks":{ "shown_qty": "1", "stored_qty": 2 },
  "after_clear_cart": {
    "rows_still_on_screen": 1,
    "localStorage_now": "[]",
    "empty_state_visible": false
  }
}
```

Three clicks produced a single increment, and the display never moved. "Clear Cart"
emptied `localStorage` while leaving the row rendered and the empty state hidden —
the change only becomes visible on reload.

A second consequence: the guard `if (cart.length === 0) initCartPage();` in the
remove handler tests `cart.js`'s array, whose length never decreases. The empty-cart
state is therefore unreachable without a page refresh. **[READ]**

### 2.3 Option upcharges are shown to the customer, then dropped

**Symptom:** the product page prices size and extras correctly and displays the
total; the cart then charges the base price.

**Mechanism.** `js/product.js` computes the correct unit price for display:

```js
function updateTotalPrice() {
  const totalPrice = window.NileBean.calculateTotalPrice(product, selectedSize, selectedExtras) * quantity;
  productPriceElement.textContent = `$${totalPrice.toFixed(2)}`;
  addToCartButton.textContent = `Add to Cart - $${totalPrice.toFixed(2)}`;
}
```

…and then discards it, passing the untouched `product` object to the cart:

```js
window.NileBean.addToCart(product, quantity, options);   // options = {size, milk, extras, notes}
```

`addToCart` spreads the raw product, so `item.price` is the **base** price. The
computed total is never stored anywhere. `js/cart.js` then bills
`item.price * item.quantity`.

The chosen `size`, `milk` and `extras` *are* carried through and *are* rendered on
the cart line — so the customer sees the options they picked, listed against a price
that does not include them.

**[EXECUTED]** — Espresso, size "Triple" (+$2.00), extra "Vanilla Syrup" (+$0.50):

```json
{
  "displayed_to_user_on_product_page": "$5.49",
  "stored_unit_price": 2.99,
  "stored_size": "Triple",
  "stored_extras": ["Vanilla Syrup"],
  "cart_line_total_shown": "$2.99",
  "loss_per_unit": 2.5
}
```

$5.49 was displayed on the button; $2.99 was charged. **$2.50 per unit is lost**,
while the cart line still reads "Size: Triple / Extras: Vanilla Syrup".

**Note:** the dead React scaffold contains the same defect — `src/hooks/useCart.tsx`
reduces its total over `item.price * item.quantity` only. **[READ]**

---

## 3. Broken and missing links

**[READ]** — from `git ls-files` (case-exact, unlike the Windows filesystem) compared
against every `href="*.html"` in the HTML sources.

### 3.1 Files linked but absent

| Link target | Linked from | Status |
|---|---|---|
| `login.html` | `reset-password.html` | **Does not exist** |
| `logout.html` | admin navbar on all 8 admin pages | **Does not exist** |

**[EXECUTED]** — both return HTTP 404 from the local server:

```
404  login.html
404  logout.html
```

There is no login page anywhere in the project, and no logout mechanism.

### 3.2 Case mismatch — would 404 on a case-sensitive filesystem

Three files are stored capitalised but linked in lowercase:

| On disk (from git index) | Linked as | Linked from |
|---|---|---|
| `Admin.html` | `admin.html` | `index.html` navbar |
| `Manage-users.html` | `manage-users.html` | `Admin.html` dashboard |
| `View-Reviews.html` | `view-reviews.html` | `Admin.html` dashboard |

**[EXECUTED]** — on Windows, every one of these resolves:

```
200  admin.html
200  Admin.html
200  manage-users.html
200  view-reviews.html
```

**[INFERRED]** — *High confidence.* On a case-sensitive filesystem (Linux, and
therefore nginx, Apache, GitHub Pages, Netlify, Vercel, and every mainstream host)
the three lowercase links would return 404. The team developed on Windows, whose
case-insensitive filesystem silently resolves them, which is why the defect is
invisible locally and would appear only on first deployment. This is an inference
about untested platforms, not an observation — but the filename casing and the link
casing are both directly verified, and the behaviour of case-sensitive filesystems
is not in question.

Combined, **five of the eight admin-area navigation targets are broken** on a
case-sensitive host: three by casing, two by absence.

---

## 4. The backend is not connected to anything

### 4.1 Zero network calls from the frontend

**[READ]** — `grep` across all HTML and `js/` files for `fetch(`, `XMLHttpRequest`,
`axios`, and any `/users`, `/products`, `/orders` URL returns **no matches**. The
shipped site makes no HTTP request to the API under any circumstance. The two
codebases share a domain model in name only.

The frontend's own comments acknowledge this:

```js
// js/main.js
function fetchProducts() {
  // In a real app, this would be an API call
  products = [ /* 9 hardcoded items */ ];
```

```js
// js/about.js
// In a real app, this would send data to a server
```

### 4.2 Hardcoded absolute path to a different project folder

`Backend/main.py` mounts static files and serves the index page from an absolute
path that does not correspond to this project: **[READ]**

```python
app.mount("/static", StaticFiles(directory="C:\Sw_project_Deliverable-_3-main"), name="static")

@app.get("/", response_class=HTMLResponse)
async def read_index():
    with open("C:\Sw_project_Deliverable-_3-main\index.html", "r", encoding="utf-8") as f:
        return f.read()
```

Three separate problems:

1. The directory `C:\Sw_project_Deliverable-_3-main` is **not this project's folder**
   (`deliverable_03-master`). The path points at what appears to be an earlier or
   parallel copy of the work.
2. It is an absolute Windows path, so the backend cannot serve the frontend on any
   other machine or on any non-Windows host.
3. The strings are **not raw strings**, so the backslashes are escape sequences.
   `\S` and `\i` are not recognised escapes and Python passes them through unchanged,
   so these happen to work — by luck, not design. A path component beginning with
   `n`, `t`, `r`, or `x` would silently corrupt.

**[INFERRED]** — *High confidence.* This is the clearest single indicator that the
two halves were never integrated: the backend was pointed at a copy of the frontend
that is not in this repository, and the frontend never calls the backend.

### 4.3 Only one of four endpoints does real work

**[READ]** — the complete API surface:

| Endpoint | Implementation |
|---|---|
| `POST /users/` | **Real.** Checks username uniqueness, bcrypt-hashes the password via `passlib`, inserts, returns the created user. Raises 400 on duplicate. |
| `GET /products/` | `return {"message": "List of products will be here"}` |
| `GET /orders/` | `return {"message": "List of orders will be here"}` |
| `GET /` | Reads `index.html` from the hardcoded path in §4.2. |
| `/static` | `StaticFiles` mount on the same hardcoded path. |

Two of the three routers are literal placeholder strings.

### 4.4 Dependency list is incomplete and entirely unpinned

`Backend/requirements.txt` in full: **[READ]**

```
fastapi
uvicorn
sqlalchemy
pydantic
```

- **`passlib` is missing.** `Backend/crud.py` opens with `from passlib.hash import bcrypt`.
  A clean `pip install -r requirements.txt` followed by starting the app raises
  `ModuleNotFoundError: No module named 'passlib'`. The one working endpoint cannot run.
- **No version is pinned.** Any install resolves to whatever is current that day.
- `Backend/schemas.py` uses `class Config: orm_mode = True`, which is Pydantic **v1**
  syntax. Unpinned `pydantic` resolves to v2, where the setting was renamed to
  `from_attributes` and `orm_mode` raises a deprecation warning. **[READ]**

**[INFERRED]** — *Moderate confidence.* The `__pycache__` directories contain
`.pyc` files compiled for CPython 3.13 covering `main`, `crud`, `models`, `schemas`,
`database` and all three routers, which proves the backend was successfully imported
and executed on someone's machine at least once. It follows that `passlib` was
installed there manually and never written back to `requirements.txt`. The exact
Pydantic version used is not recoverable — there is no Python lockfile.

---

## 5. Schema drift between `models.py` and the committed `cafe.db`

`Backend/cafe.db` (36 KB) is committed to the repository. Its actual schema does
not match the current `models.py`.

**[EXECUTED]** — read directly from the SQLite file via Python's `sqlite3`:

```
products | rows= 0
    CREATE TABLE products ( id INTEGER NOT NULL, name VARCHAR, description VARCHAR,
                            price FLOAT, available BOOLEAN, PRIMARY KEY (id) )
users    | rows= 0
    CREATE TABLE users ( id INTEGER NOT NULL, username VARCHAR, hashed_password VARCHAR,
                         is_admin BOOLEAN, PRIMARY KEY (id) )
orders   | rows= 0
    CREATE TABLE orders ( id INTEGER NOT NULL, user_id INTEGER, product_id INTEGER,
                          quantity INTEGER, PRIMARY KEY (id),
                          FOREIGN KEY(user_id) REFERENCES users (id),
                          FOREIGN KEY(product_id) REFERENCES products (id) )
```

Compared against `Backend/models.py`: **[READ]**

| Column | In `cafe.db` | In `models.py` |
|---|---|---|
| `products.price` | `FLOAT` | `Integer` |
| `products.available` | `BOOLEAN` | **absent** |

**Cause. [INFERRED]** — *High confidence.* `models.Base.metadata.create_all(bind=engine)`
runs at import time in `main.py`. `create_all` issues `CREATE TABLE IF NOT EXISTS` —
it creates missing tables but **never alters existing ones**. The committed `.db` was
therefore created by an earlier revision of `models.py` that had `price FLOAT` and an
`available` flag; the model was later changed, and the existing database silently kept
its old shape. There are no migrations in the project (no Alembic, no schema versioning
of any kind), so nothing would have caught this.

All three tables contain **zero rows**. The database has never held data.

### 5.1 The data model cannot represent what the UI already builds

Independent of the drift, the model is structurally too narrow: **[READ]**

- **`Order` is one product per order.** `orders` has a single `product_id` and a single
  `quantity`. There is no order-header / line-item split. A cart containing an espresso
  and a croissant cannot be stored as one order. The checkout UI in `cart.html` already
  lets a customer build exactly that.
- **`price` is an `Integer`** in `models.py`. It cannot store $2.99. Every price in the
  frontend catalogue has cents.
- **No `Product` ↔ `Order` relationship.** `product_id` is declared as a foreign key
  column, but neither class defines a SQLAlchemy `relationship()` for it, so
  `order.product` does not exist. Only `User` ↔ `Order` is wired (`owner` / `orders`).
- **No table exists** for reviews, categories, product options (size/milk/extras), or
  order status — all of which the UI displays.
- **The chosen options are unstorable.** Size, milk, extras and special instructions are
  captured by `product.js` and shown in the cart, but have no column anywhere.

### 5.2 Three incompatible product stores

**[READ]** — the same concept is modelled three times, in three shapes, with no
translation between them:

| Store | Shape | Used by |
|---|---|---|
| `js/main.js` array | `{id, name, image, price:float, category, shortDescription, longDescription, options:{sizes,milk,extras}, featured, popular}` | The live storefront |
| `localStorage["products"]` | `{name, price:string, category}` | `add-product.html`, `remove-product.html` |
| `products` DB table | `{id, name, description, price, available}` | Nothing |

Adding a product through the admin panel writes to `localStorage["products"]` and
therefore **never appears on the menu**, which reads the hardcoded array. The two
stores share no field beyond `name`, `price` and `category`, and even `price` differs
in type.

---

## 6. Absent: authentication, tests, error handling, validation

### 6.1 No authentication exists in the running application

**[READ]** — established by reading every file and by `grep` across the repository.

- **No login page.** `login.html` is linked from `reset-password.html` and does not
  exist (§3.1).
- **No session mechanism of any kind.** No cookie, no JWT, no token, no
  `Authorization` header — the strings do not appear anywhere in the frontend.
- **The admin pages are unprotected static HTML.** `Admin.html`, `Manage-users.html`,
  `View-Reviews.html`, `add-product.html`, `remove-product.html`, `update-product.html`
  and `view-orders.html` have no guard whatsoever. Anyone who requests the URL gets the
  page. **[EXECUTED]** — `curl` returns `200 admin.html` with no credentials presented.
- **The public navbar links to the admin area openly.** `index.html` has
  `<li><a href="admin.html">Admin</a></li>` between "About Us" and the cart.
- **`reset-password.html` submits to `"#"`.** `<form action="#" method="POST">` — the
  form posts to the current page. No reset is possible.

**Authorization** exists only as an unused column. `models.User.is_admin` is declared
with `default=False`. **[READ]** — it is never set to `True` by any code path
(`crud.create_user` does not accept or pass it), never read by anything, and no
endpoint checks it. There is no `Depends`, no `OAuth2PasswordBearer`, no current-user
resolution. The role concept exists in the schema and nowhere in the logic.

One thing is done correctly: **passwords are properly hashed** with bcrypt via
`passlib` in `crud.create_user`, together with a uniqueness check returning HTTP 400.
It is unreachable from the UI, but it is correct, and it is worth preserving.

### 6.2 A stray password field in the contact form

`about.html` line 157: **[READ]**

```html
<input type="password" id="password" name="password" class="text-input" required>
```

It sits in the "Get In Touch" contact form between the email and message fields.
`js/about.js` reads only `name`, `email` and `message` — the password value is never
read, never sent, and never used. It is `required`, so it blocks form submission until
filled.

**[INFERRED]** — *High confidence.* A copy-paste artifact from a login form.

### 6.3 No tests

**[READ]** — zero test files. No `pytest`, no test runner in `package.json`'s
`scripts` (which contains only `dev`, `build`, `build:dev`, `lint`, `preview`), no
`conftest.py`, no CI configuration, no `.github/` directory. Nothing in the project
verifies any behaviour.

### 6.4 No error handling

**[READ]** — there is **no `try`/`catch` anywhere in the frontend**, and no exception
handling in the backend beyond the single `HTTPException(400)` on duplicate username.

The most exposed case is `JSON.parse` on `localStorage`, which is called unguarded in
four places (`js/main.js` line 3, `js/cart.js`, `add-product.html`, `remove-product.html`):

```js
const cart = JSON.parse(localStorage.getItem('nilebeanCart')) || [];
```

The `|| []` fallback handles `null` (key absent) but **not malformed JSON**, which
throws before the `||` is ever evaluated.

**[EXECUTED]** — setting `localStorage.nilebeanCart = '{corrupt'` and then evaluating
`js/main.js`:

```
SyntaxError: Expected property name or '}' in JSON at position 1 (line 1 column 2)
```

The exception is thrown at the top of the script, so **`main.js` never finishes
executing**: `window.NileBean` is never defined, `fetchProducts` never runs, and every
page that depends on it renders blank. A single corrupt value in a user's browser —
from a partial write, a quota error, or a stale key from an earlier version — bricks
the entire site for that user, with no recovery path short of manually clearing site
data.

### 6.5 Checkout has no validation and discards everything typed

`cart.html` presents a full checkout form: pickup/delivery toggle, street, city, zip,
full name, phone, email, payment method, card number, expiry, CVC, name on card. **[READ]**

- **Not one of these inputs carries `required`**, a `pattern`, a `minlength`, or any
  other HTML5 constraint.
- **Not one of them is read by JavaScript.** `js/cart.js` queries only the two radio
  groups, and only to show or hide the address and card blocks.
- The entire "Place Order" handler is:

```js
placeOrderButton.addEventListener('click', function() {
  alert('Thank you for your order! It will be ready shortly.');
  window.NileBean.clearCart();
  window.location.href = 'index.html';
});
```

An order can be "placed" with every field blank. The name, address, phone, email and
card number are read by nothing and transmitted nowhere. No order record is created in
any store — not in `localStorage`, not in the database. The order simply ceases to exist.

**The payment flow is UI only.** Radio buttons for Card / Apple Pay / Google Pay, with
the card block revealing number / MM-YY / CVC / name-on-card. There is no processor, no
tokenisation, no submit handler, and no network call. **[READ]**

The 8% sales tax is a magic number appearing once in `js/cart.js`
(`const tax = subtotal * 0.08`), computed entirely client-side. **[READ]**

### 6.6 Admin pages are non-functional mockups

**[READ]** — of the seven admin pages, only two persist anything, and to the wrong store:

| Page | Behaviour |
|---|---|
| `view-orders.html` | 7 hardcoded `<tr>` rows. No JavaScript at all. |
| `View-Reviews.html` | 4 hardcoded `<tr>` rows. No JavaScript at all. |
| `Manage-users.html` | 4 hardcoded rows. "Delete" calls `row.remove()` — DOM only, nothing persisted. "Edit" fires an `alert()` showing the values and changes nothing. "Add User" appends a row to the DOM; lost on refresh. |
| `update-product.html` | 2 hardcoded rows. Despite the filename, **nothing updates** — the form appends a new DOM row, not persisted. Enforces `price >= 5` client-side. |
| `add-product.html` | Persists to `localStorage["products"]` — a store the storefront never reads (§5.2). |
| `remove-product.html` | Reads and splices the same `localStorage["products"]`. |
| `Admin.html` | Six navigation cards. Three of the six links are case-broken (§3.2). |

The dashboard describes the reviews page as letting an admin *"Read and manage customer
comments"*. There is no management capability; the page is a static table.

---

## 7. Other observations

**[READ]** unless noted.

- **Generator artifacts ship to production.** `https://cdn.gpteng.co/gptengineer.js` is
  loaded by all five public pages. `index.html` advertises `og:image` as
  `https://lovable.dev/opengraph-image-p98pqg.png` and `twitter:site` as `@lovable_dev`
  — so any share of this site renders Lovable's branding, not the project's.
- **`createProductCard` is defined twice**, near-identically: once in `js/main.js` and
  again in `js/menu.js`. Both build a card via `innerHTML`.
- **`showToast` is hand-rolled with 12 imperative inline styles** and two nested
  `setTimeout` calls (10 ms fade-in, 3000 ms hold, 300 ms removal), rather than using a
  CSS class from the stylesheet it ships alongside.
- **All product content is interpolated into `innerHTML`** without escaping. With the
  current hardcoded catalogue this is inert, but it becomes an XSS vector the moment
  product data arrives from an API or an admin form.
- **Responsive support is two media queries** (`min-width: 768px`, `min-width: 1024px`)
  in a 977-line stylesheet, plus a JS-toggled mobile menu.
- **Accessibility gaps.** The mobile menu button is `<button>☰</button>` with no
  `aria-expanded`, no `aria-controls`, and no accessible name. No skip link, no ARIA
  anywhere, no visible focus styling in the stylesheet. Product images do carry `alt`
  text, and the dynamically generated radio/checkbox options do carry `<label for>`.
- **The eight admin pages do not share the site's design system.** They use a different
  navbar, a different footer, and large inline `<style>` blocks that redefine layout
  rules already present in `css/styles.css`. The public pages and the admin pages were
  evidently written to different conventions. *(An earlier revision of this document
  speculated about which team member wrote which section. That inference is removed:
  who wrote what is recorded in README.md from first-hand knowledge, not guessed from
  code style.)*
- **Two lockfiles for the same dead scaffold**: `bun.lockb` (198 KB) and
  `package-lock.json` (253 KB) are both committed, implying two package managers were
  used at different times.
- **Committed build artifacts.** Eight `__pycache__/*.pyc` files are tracked.
- **Footer team lists are inconsistent.** `cart.html`, `about.html`, `menu.html` and
  `product.html` each list the same five names, with one spelled two different ways
  (`Mostafa Moahmed` / `Mostafa Mohamed`). `index.html` carries no Team column at all.
  One contributor is also listed under a name other than the one they are credited
  by in README.md, which is why the two lists do not match verbatim.

---

## 8. What was verified how — index

| § | Claim | Method |
|---|---|---|
| 1.1 | File and line counts | **[READ]** `git ls-files`, `wc -l` |
| 1.2 | `src/` is unreachable | **[READ]** `grep` for `/src/`, `src/main.tsx` in all HTML |
| 1.3 | Root duplicates are dead; two differ | **[READ]** `diff`, `grep` of asset references |
| 1.3 | Wrong copy edited months later | **[INFERRED]** high confidence, from mtimes |
| 2.1 | Menu renders zero products | **[EXECUTED]** browser, `/menu.html` |
| 2.2 | Cart UI does not update | **[EXECUTED]** browser, `/cart.html`, 3 clicks + clear |
| 2.3 | $2.50/unit pricing loss | **[EXECUTED]** browser, Espresso + Triple + Vanilla Syrup |
| 3.1 | `login.html`, `logout.html` absent | **[EXECUTED]** HTTP 404 |
| 3.2 | Filename casing vs link casing | **[READ]** `git ls-files` (case-exact) vs `grep` of hrefs |
| 3.2 | Would 404 on Linux | **[INFERRED]** high confidence; 200 on Windows **[EXECUTED]** |
| 4.1 | Zero network calls | **[READ]** `grep` for `fetch`/`XHR`/`axios` |
| 4.2 | Hardcoded foreign absolute path | **[READ]** `Backend/main.py` |
| 4.4 | `passlib` missing from requirements | **[READ]** import in `crud.py` vs `requirements.txt` |
| 4.4 | Backend was run on some machine | **[INFERRED]** moderate confidence, from `.pyc` presence |
| 5 | `cafe.db` schema drift, 0 rows | **[EXECUTED]** `sqlite3` against the committed file |
| 6.1 | No auth; admin pages open | **[READ]** + **[EXECUTED]** `curl` → 200 |
| 6.4 | Corrupt `localStorage` bricks the site | **[EXECUTED]** browser, injected `'{corrupt'` |
| 6.5 | Checkout validates and stores nothing | **[READ]** `cart.html`, `js/cart.js` |

---

## 9. Remediation log

Fixes are recorded here as they land. Each entry states the root cause and the fix.

### Phase 1 — generated artifacts and dead code removed

96 files and 16,257 lines deleted, none of them reachable from the running site:
the `src/` React scaffold (73 files), the root-level duplicates of `js/` and `css/`
(6 files, both differences in §1.3 recorded before deletion), the scaffold-only
configs and both lockfiles (10 files), and the committed `__pycache__` artifacts.
The `cdn.gpteng.co` injector was stripped from all five public pages, and the
Lovable Open Graph and Twitter tags were replaced with tags describing this project,
using an image rendered at 1200×630 from the site's own tokens and typefaces
(`assets/og-image.source.html` carries the source and the regeneration command).

`package.json` — previously the generated `vite_react_shadcn_ts` manifest with 60
dependencies — is now a minimal manifest carrying only `vitest` and `jsdom` for the
Phase 4 frontend tests.

**Verified:** `git grep` for `lovable|gpteng|gptengineer|shadcn|vite_react_shadcn_ts`
returns hits only inside this file, which documents them by design.

### Phase 2 — the structural bugs

Each fix was reproduced as broken beforehand (§2) and re-verified as fixed in a
browser afterwards. Verification output is quoted per item.

#### 2.1 fix — menu page renders the catalogue

**Root cause.** `window.NileBean` exported the `products` *array* by value while it
was still empty. `fetchProducts()` later rebound the variable to a new array, so the
export was a permanently-empty snapshot.

**Fix.** `js/main.js` no longer exports any array. It exports `getProducts()`, which
reads the live binding at call time, and the `products` property was removed from the
public interface entirely — so a stale read is now impossible rather than silently
empty. `js/menu.js` calls `getProducts()` on each filter. The fix is at the source, in
`main.js`; `menu.js` was not patched around it.

**[EXECUTED]** — clicking through every category on `/menu.html`:

```json
{ "all_items": 9, "tea": 2, "pastry": 2, "seasonal": 1, "back_to_all": 9,
  "empty_msg_hidden": true }
```

#### 2.2 fix — one cart, one owner

**Root cause.** `js/main.js` and `js/cart.js` each ran
`JSON.parse(localStorage.getItem('nilebeanCart'))`, producing two independent arrays.
Handlers mutated one and re-rendered from the other.

**Fix.** `js/main.js` owns the only cart array. `js/cart.js` holds no copy; it reads
`window.NileBean.getCart()` fresh on every render and every handler. All mutation goes
through `addToCart` / `updateCartItem` / `removeCartItem` / `clearCart`, which persist
and refresh the header badge through a single `persistCart()`. Emptying the cart now
also clears the rendered rows rather than only hiding their container. Event listeners
were moved out of `initCartPage()`, which re-runs, and are attached once.

**[EXECUTED]** — three `+` clicks then one `−`, on a line whose unit price is $5.49:

```json
{ "before":  { "shown_qty": "1", "line_price": "$5.49",  "total": "$5.93"  },
  "after_three_increments": { "shown_qty": "4", "stored_qty": 4,
                              "line_price": "$21.96", "total": "$23.72" },
  "after_one_decrement":    { "shown_qty": "3", "line_price": "$16.47" } }
```

Previously three clicks produced no visible change and a single stored increment.
Removing the last line now reaches the empty state without a reload:
`{ "rows_in_dom": 0, "empty_state_visible": true, "badge": "0" }`.

#### 2.3 fix — the customer is charged the price they were shown

**Root cause.** `product.js` computed the option-inclusive unit price for display and
then passed the untouched `product` object to `addToCart`, so only the base price
reached the cart line.

**Fix.** `addToCart` now calls `calculateTotalPrice` itself and stores the result as
`unitPrice` on the cart line. `getUnitPrice()` falls back to `price` for entries
written before this field existed, so carts already in a customer's browser still
render. All money now flows through `getLineTotal()` / `getCartSubtotal()`.

**[EXECUTED]** — Latte, size "Large" (+$1.00), extra "Extra Shot" (+$0.99), qty 2:

```json
{ "base_price": 4.49, "stored_unitPrice": 6.48, "qty": 2,
  "line_shown": "$12.96", "subtotal": "$12.96", "total": "$14.00",
  "options_rendered": "Size: Large  Milk: Oat  Extras: Extra Shot" }
```

$6.48 was displayed on the product page and $6.48 is charged. The same case
previously displayed $6.48 and charged $4.49.

#### 2.4 fix — filenames normalised to lowercase

`Admin.html`, `Manage-users.html` and `View-Reviews.html` were renamed to
`admin.html`, `manage-users.html` and `view-reviews.html` (via a two-step `git mv`,
since a case-only rename is a no-op on a case-insensitive filesystem). Every link
already used the lowercase form, so no href needed changing.

**[EXECUTED]** — every `href="*.html"` in the project checked against the case-exact
`git ls-files` listing: 12 of 14 resolve exactly. The two that do not are
`login.html` and `logout.html`, which are still absent and are built in Phase 3.

#### 2.5 fix — every localStorage read is guarded

**Root cause.** `JSON.parse(...) || []` handles a missing key but not malformed JSON,
which throws before `||` is evaluated. Thrown at the top of `main.js`, it aborted the
script, left `window.NileBean` undefined and blanked every page.

**Fix.** All reads go through `readJSON(key, fallback)` in `js/main.js`, which catches
parse failures, drops the corrupt key, and returns the fallback. It also catches
`localStorage` being unavailable outright (private mode, site data disabled), and a
matching `writeJSON` reports quota failures to the user instead of throwing. A
non-array cart of otherwise valid JSON is also rejected. `add-product.html` and
`remove-product.html`, which do not load `main.js`, each received an equivalent
`readStoredProducts()` helper — 5 unguarded parses replaced in total.

**[EXECUTED]** — with `localStorage.nilebeanCart` set to `'{corrupt'`:

```json
{ "fix5_threw": null, "fix5_NileBean_still_defined_with_n_methods": 14,
  "fix5_corrupt_key_removed": null }
```

Previously identical conditions produced
`SyntaxError: Expected property name or '}' in JSON at position 1` and no
`window.NileBean` at all.

#### 2.6 fix — one `createProductCard`

The near-duplicate definition in `js/menu.js` was deleted. The single definition in
`js/main.js` is exported and used by the home page and the menu page alike.

#### Carried in alongside 2.6 — the toast

`showToast` applied 12 inline styles imperatively. It now toggles a `.toast` /
`.toast-visible` pair defined in `css/styles.css`, sets `role="status"`, and honours
`prefers-reduced-motion`. Reveal uses a forced style flush rather than
`requestAnimationFrame`, which is throttled in a background tab and would have left
the toast permanently invisible there.

This item is listed under Phase 4 in the remediation brief. It was brought forward
because rewriting `main.js` for the fixes above necessarily touched `showToast`, and
leaving it half-converted would have shipped an unstyled toast through Phase 3.

### Phase 3 — the two halves became one application

Before this phase the frontend made zero network calls and the backend had one
working endpoint (§4). They are now a single application: FastAPI serves the static
site and the API from one origin.

#### Backend

**Paths.** `Backend/main.py` mounted static files from
`C:\Sw_project_Deliverable-_3-main`, an absolute Windows path belonging to a
different directory than this project (§4.2). Every path is now derived from the
package location in `app/config.py`, so the app runs from any checkout on any OS.

**Layout.** The flat modules used implicit same-directory imports (`import models`),
which only resolve when the process working directory is `Backend/`. That blocks
pytest and Alembic. The code is now an `app` package with explicit relative imports.

**Dependencies.** `requirements.txt` listed four packages with no versions and
omitted `passlib`, which `crud.py` imported — so a clean install could not start the
app (§4.4). Every dependency is now pinned. `bcrypt` is deliberately held at 4.0.1:
`passlib` 1.7.4 reads `bcrypt.__about__`, which bcrypt removed in 4.1, and unpinning
it breaks password hashing. `email-validator` was added because `EmailStr` defers its
dependency check to schema-build time, so its absence fails at startup rather than at
import.

**Pydantic.** `class Config: orm_mode = True` (v1 syntax) is now
`model_config = ConfigDict(from_attributes=True)`, matching the pinned v2.

**Data model.** The three defects in §5.1 are fixed:

| Was | Now |
|---|---|
| `price` as `Integer`, unable to hold $2.99 | `Numeric(10, 2)`, returned as `Decimal`. **[EXECUTED]** — verified to round-trip exactly on SQLite with no warning, for `2.99`, `4.49`, `5.49`, `0.30`, `1234.56`. No money is held as a float anywhere. |
| One product per order | `Order` header + `OrderItem` lines. Each line stores its own `unit_price`, `line_total`, and the chosen `size` / `milk` / `extras` / `special_instructions` — which previously had no column at all. |
| `product_id` a bare FK with no `relationship()` | `Product.order_items` ↔ `OrderItem.product` wired in both directions. |

Prices on an order line are copied at purchase time, so changing a product's price
later does not rewrite past orders. SQLite's `PRAGMA foreign_keys=ON` is now set per
connection — without it SQLite ignores foreign keys entirely, leaving the
constraints decorative.

**Migrations.** Alembic is configured, reading its URL and metadata from the
application so each is defined once, with `render_as_batch=True` because SQLite
cannot `ALTER` most things in place. The committed `cafe.db` was deleted and `*.db`
gitignored, which removes the §5 schema-drift trap at its root: the schema is now
owned by migrations rather than by whatever `create_all()` happened to leave behind.

**Seed.** `Backend/seed_data.json` was extracted **programmatically** from the nine
products hardcoded in `js/main.js`, rather than retyped, so the seeded catalogue is
faithful to what the site served. `seed.py` is idempotent and also creates the two
demo accounts and the four reviews the admin page used to hardcode.

**Endpoints.** 4 routes became 19, all validated by Pydantic schemas and returning
appropriate status codes.

**Authentication.** The bcrypt hashing in the original `crud.create_user` was correct
and is kept unchanged. Added around it: JWT issuing on login, `get_current_user`
resolving the caller from a bearer token, and `get_current_admin` enforcing the
`is_admin` column that previously existed but was never set, read, or checked (§6.1).
Every admin endpoint depends on it. `is_admin` is never accepted from a request body,
so self-signup cannot mint an administrator. Login returns one message for both an
unknown username and a wrong password, and hashes even when the user does not exist,
so neither response nor timing enumerates accounts.

**[EXECUTED]** — authorization, end to end:

```
GET /api/users   no token    -> 401
GET /api/users   admin       -> 200
GET /api/users   customer    -> 403
GET /api/orders  customer    -> 403
POST login       wrong pass  -> 401
```

**Totals are computed server-side.** `OrderCreate` has no field for a price or a
total — a client sends only what it wants and how many. Unknown options are rejected
rather than ignored, since silently dropping an unrecognised extra would let a client
have it for free.

**[EXECUTED]** — a client attempting to name its own price:

```
client sent unit_price=0.01; server charged 5.49, total 5.93
```

**[EXECUTED]** — a fabricated option, and delivery without an address:

```
{"detail":"Espresso has no extra 'Free Gold Bar'"}
Value error, Delivery orders require address_street, address_city, address_zip
```

**CORS** is never a wildcard. In production the frontend is same-origin and the
allow-list is empty; the dev origins exist only for running the static site from a
separate server.

#### Frontend

**Catalogue from the API.** The nine-item array is gone. `js/main.js` fetches the
catalogue, with a loading state and an error state carrying a retry. Because the API
speaks snake_case and serialises `Decimal` prices as JSON *strings* while nested
option prices remain numbers, one `normaliseProduct()` adapter converts the API shape
to the shape the page scripts already used — so `product.js`, `menu.js` and `cart.js`
did not need rewriting around the transport format.

**Checkout is real.** It previously had no validation of any kind, read nothing the
user typed, and fired an `alert()` (§6.5). It now validates every field, posts a real
order, and shows server-side errors.

**[EXECUTED]** — submitting the checkout deliberately incomplete:

```
banner: "Please correct 10 fields below."
street, city, zipCode, fullName, phone, email,
cardNumber, cardExpiry, cardCvc, cardName  -> each with its own message
```

**[EXECUTED]** — then completing it, for a Latte (Large, Oat, Extra Shot) × 2:

```
order #4  delivery -> 12 Nile Corniche, Cairo 11511
  line: 2 x Latte @ 6.48 = 12.96 | size Large milk Oat extras ['Extra Shot']
  subtotal 12.96   tax 1.04   TOTAL 14.00
```

Card details are validated for shape but are **not** part of the request schema and
are never transmitted or stored. The page says so.

**Login and logout now exist.** `login.html` (sign in + register, with per-field
validation) and `logout.html` were the two links that pointed at nothing (§3.1). The
`?next=` parameter is restricted to same-origin relative paths so it cannot be used
as an open redirect.

**Admin pages are real.** All six read from and write to the API. The seven pages of
hardcoded rows and DOM-only handlers described in §6.6 are gone — including
`update-product.html`, which despite its name previously updated nothing.

**Admin pages are guarded.** `js/admin-guard.js` redirects anyone who is not a
signed-in administrator, hiding the document until the check resolves so protected
markup never flashes. This is a usability guard, not the security boundary: the
server enforces access independently on every endpoint.

**[EXECUTED]** — anonymous visitor requesting `/admin.html`:

```
landed_on: "/login.html?next=admin.html"
```

…and after signing in, they are returned to `admin.html`.

**Tax has one definition per side.** `TAX_RATE` is a named constant in
`app/config.py` (authoritative) and in `js/main.js` (preview only). The client's
figure is never trusted; the order total in the confirmation is the server's.

**The stray password field is gone** from the contact form (§6.2), along with two
further artifacts of the same copy-paste that surfaced while removing it: a
"Forgot Password?" link inside the contact form, and a submit button labelled
"Login".

#### Known limitation, accepted deliberately

The access token is held in `localStorage`, so it is readable by any script on the
page and is only as safe as the page is free of XSS. The alternative — an httpOnly
cookie — requires CSRF protection that this project does not implement. This was a
deliberate choice, and it is the one security tradeoff in the current design that a
production deployment should revisit.

### Phase 4 — tests, accessibility, responsiveness, CI

#### Tests

The project had none (§6.3). It now has **123**.

| Suite | Count | Covers |
|---|---:|---|
| `Backend/tests/test_auth.py` | 24 | Hashing, salting, registration validation, duplicate accounts, login, token forgery, expiry, tokens for deleted accounts |
| `Backend/tests/test_pricing.py` | 27 | Half-up rounding, option pricing, rejection of options a product does not offer, order totals, price freezing |
| `Backend/tests/test_orders_api.py` | 13 | Order endpoint auth, validation, price integrity, order privacy |
| `Backend/tests/test_authorization.py` | 27 | Every admin route × anonymous/customer/admin, catalogue visibility, product and user management guards |
| `tests/pricing.test.js` | 13 | Browser-side price calculation and API-shape normalisation |
| `tests/cart.test.js` | 19 | Cart state, persistence, totals, corrupt storage, catalogue error state |

Each of the three structural bugs from §2 now has a test that fails if it returns:

- **§2.1** — `cart.test.js`: "exposes every product through the accessor", and
  "does not expose a raw products array that could go stale".
- **§2.2** — `cart.test.js`: "reflects a mutation immediately in a previously
  fetched reference", and "increments repeatedly rather than idempotently".
- **§2.3** — `pricing.test.js` and `test_pricing.py`: the exact
  Espresso + Triple + Vanilla Syrup case, on both sides.

Backend tests run against a throwaway SQLite file per test, so they never touch a
developer's database and cannot leak state between cases.

**[EXECUTED]** — `91 passed` (backend), `32 passed` (frontend).

#### Accessibility

**Contrast measured, not assumed.** A script walked every text-bearing element on
all 14 pages in a real browser, resolved each element's effective background
through its ancestors, and computed the WCAG contrast ratio against the size and
weight actually rendered.

**[EXECUTED]** — final sweep: **120 colour pairs across 14 pages, 0 failures**,
lowest ratio **5.74** against a 4.5 requirement.

Three real failures were found and fixed:

| Element | Was | Now | Fix |
|---|---:|---:|---|
| Hero text over the header photo | 3.98 worst case | 5.74 | Scrim `rgba(0,0,0,.5)` → `.6`. The photo's brightness is not under our control, so the scrim has to carry the contrast against a worst-case white image. |
| `.auth-hint a` — caramel link on white, 14.4px | 3.23 | 4.95 | Added a `--caramel-text: #9c6408` token. `--caramel` is kept for large text, borders and focus rings, where 3:1 is the bar. |
| `.admin-footer` — grey on the dark footer | 3.66 | 13.08 | `#666` → `#ccc`. |
| `.table-empty` — grey on white | 4.48 | 5.74 | `#777` → `#666`. Four hundredths under the line is still under the line. |

**Keyboard and semantics.** **[EXECUTED]** — across the five main pages, 113
interactive elements: **0 keyboard-unreachable**, and after adding one label to the
special-instructions textarea, **0 without an accessible name**.

- The mobile menu button was `<button>☰</button>` with no name and no state. It now
  carries `aria-label`, `aria-controls`, and `aria-expanded` that the JS keeps in
  sync — **[EXECUTED]**: `false` → click → `true` → click → `false`.
- The cart link was an emoji with no accessible name; it now has `aria-label="View
  cart"`, with the emoji marked `aria-hidden` and the count badge labelled.
- Checkout inputs relied on placeholders as labels. Every one now has a real
  `<label for>`, an error slot, and `aria-invalid` when it fails validation.
- A visible focus style (`3px solid var(--caramel)`) was added; the stylesheet
  previously defined none at all.
- Order-status selects in the admin table have visually-hidden labels.

#### Responsive

**[EXECUTED]** — every page at 360 / 768 / 1440 px: **no horizontal page scroll at
any width**. The mobile menu toggle appears only below 768px. Wide admin tables
scroll inside their own `.table-scroll` container at 360px rather than pushing the
page sideways.

#### CI

`.github/workflows/tests.yml` runs three jobs on every push: pytest, vitest, and a
link checker. Two of them exist because of specific defects in this audit:

- **`alembic check`** fails if `models.py` drifts from the migrations — the same
  class of problem as the §5 schema drift.
- **The link job runs on `ubuntu-latest`**, which is case-sensitive. It is the check
  that would have caught `admin.html` vs `Admin.html` before it reached a Linux host
  (§3.2).

**[EXECUTED]** — both checks pass locally: `No new upgrade operations detected`, and
`broken references: 0`.

### Phase 5 — documentation, and one bug the documentation found

`README.md` was rewritten to state plainly what the five-person team delivered, what
was changed afterwards and by whom, how to run both halves, the architecture, the
full API, and the known `localStorage` token limitation.

#### A regression found while writing the docs

Capturing the README screenshots meant running the app on a port other than 8000 for
the first time — and it broke.

`js/api.js` had resolved the API's location by inspecting `location.port` and falling
back to a hardcoded `http://127.0.0.1:8000` for anything else. Served on any other
port, every request went cross-origin to a port that usually had nothing listening,
and the site showed *"Could not reach the server"* while the API was running
perfectly on the page's own origin.

**[EXECUTED]** — the first screenshot run captured the product page rendering its
error state instead of the product. Fixed in `16d4b5a`: the base URL is now the
page's own origin, whatever port that is, with `window.NILEBEAN_API_BASE` as the
explicit override and `file://` still needing a host because it has no origin to be
relative to.

Worth recording for two reasons. First, it is the same *kind* of defect as the
original §4.2 hardcoded path — an environment assumption baked into code that then
only works on the machine it was written on. Second, no test caught it: the frontend
tests stub the API layer, and the backend tests never exercise the browser's URL
resolution. Taking screenshots was what exercised it.

#### Setup instructions verified from scratch

The README's instructions were run verbatim against a **fresh `git clone` into an
empty directory**, not the working tree.

**[EXECUTED]**:

```
clone            67 files, no cafe.db, no node_modules
python -m venv   ok
pip install -r requirements.txt -r requirements-dev.txt   ok
alembic upgrade head   -> Running upgrade -> d31d38a5eb9d, initial schema
python seed.py         -> 9 products created, 2 users, 4 reviews
python -m pytest       -> 91 passed
npm install && npm test -> 32 passed
uvicorn app.main:app   -> site 200, /docs 200, /api/products 9 products,
                          admin login ok, /api/users 200 as admin, 401 anonymous
```

**[EXECUTED]** — and the clean checkout, served on port 8021, renders the catalogue
from its own database: 9 items, 2 tea, 2 pastry, first card *Espresso $2.99*.
