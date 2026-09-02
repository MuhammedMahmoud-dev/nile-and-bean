// Loads js/main.js into the current jsdom window and returns window.NileBean.
//
// main.js is a classic script, not a module: it assigns window.NileBean as a
// side effect and starts a catalogue fetch on evaluation. So the test harness
// stubs window.NileBeanAPI first, then evaluates the file in this window.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MAIN_JS = fs.readFileSync(path.join(ROOT, 'js', 'main.js'), 'utf8');

// The nine seeded products, in the shape the API returns them: snake_case,
// with Decimal prices serialised as strings and nested option prices as
// numbers. Trimmed to what the cart and pricing tests exercise.
export const API_PRODUCTS = [
  {
    id: 1,
    slug: 'espresso',
    name: 'Espresso',
    image: 'https://example.com/espresso.jpg',
    price: '2.99',
    category: 'coffee',
    short_description: 'Bold and full-bodied',
    long_description: 'A careful blend of Arabica beans.',
    options: {
      sizes: [
        { name: 'Single', price: 0 },
        { name: 'Double', price: 1 },
        { name: 'Triple', price: 2 }
      ],
      extras: [
        { name: 'Extra Shot', price: 0.99 },
        { name: 'Vanilla Syrup', price: 0.5 }
      ],
      milk: ['Whole', 'Oat']
    },
    featured: true,
    popular: true,
    available: true
  },
  {
    id: 2,
    slug: 'latte',
    name: 'Latte',
    image: 'https://example.com/latte.jpg',
    price: '4.49',
    category: 'coffee',
    short_description: 'Smooth espresso with steamed milk',
    long_description: null,
    options: {
      sizes: [
        { name: 'Small', price: 0 },
        { name: 'Medium', price: 0.5 },
        { name: 'Large', price: 1 }
      ],
      extras: [{ name: 'Extra Shot', price: 0.99 }],
      milk: ['Whole', 'Oat', 'Almond']
    },
    featured: true,
    popular: true,
    available: true
  },
  {
    id: 3,
    slug: 'croissant',
    name: 'Butter Croissant',
    image: 'https://example.com/croissant.jpg',
    price: '3.29',
    category: 'pastry',
    short_description: 'Flaky and buttery',
    long_description: null,
    options: null,
    featured: false,
    popular: true,
    available: true
  }
];

/**
 * Evaluate main.js in this window.
 *
 * @param {object} [opts]
 * @param {Array}  [opts.products] catalogue the stub API resolves with
 * @param {Error}  [opts.failWith] make the catalogue request reject instead
 * @returns {Promise<object>} window.NileBean, after the catalogue settles
 */
export async function loadApp({ products = API_PRODUCTS, failWith = null } = {}) {
  window.NileBeanAPI = {
    listProducts: () => (failWith ? Promise.reject(failWith) : Promise.resolve(products)),
    getUser: () => null,
    isAdmin: () => false,
    isLoggedIn: () => false
  };

  // Indirect eval so the script's top-level declarations land on the window,
  // exactly as a <script> tag would place them.
  window.eval(MAIN_JS);

  await window.NileBean.whenProductsReady();
  return window.NileBean;
}
