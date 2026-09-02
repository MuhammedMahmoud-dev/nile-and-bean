// Cart logic.
//
// These cover the three structural bugs recorded in AUDIT.md section 2, so a
// regression on any of them fails the build rather than reaching a customer.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadApp } from './helpers/loadApp.js';

let NileBean;

beforeEach(async () => {
  localStorage.clear();
  document.body.innerHTML = '<span id="cartCount">0</span>';
  NileBean = await loadApp();
});

const espresso = () => NileBean.getProductById('espresso');
const croissant = () => NileBean.getProductById('croissant');

describe('the catalogue is readable after it loads', () => {
  it('exposes every product through the accessor', () => {
    // The old export captured the array while it was still empty, so the menu
    // page rendered nothing (AUDIT.md 2.1).
    expect(NileBean.getProducts()).toHaveLength(3);
  });

  it('does not expose a raw products array that could go stale', () => {
    expect(NileBean.products).toBeUndefined();
  });

  it('reports a ready state once loaded', () => {
    expect(NileBean.getLoadState().state).toBe('ready');
  });

  it('finds a product by its public id', () => {
    expect(NileBean.getProductById('latte').name).toBe('Latte');
    expect(NileBean.getProductById('nope')).toBeUndefined();
  });
});

describe('adding to the cart', () => {
  it('stores the option-inclusive unit price, not the base price', () => {
    // The original stored only product.price, so a $5.49 espresso was
    // charged at $2.99 (AUDIT.md 2.3).
    NileBean.addToCart(espresso(), 1, { size: 'Triple', extras: ['Vanilla Syrup'] });

    const line = NileBean.getCart()[0];
    expect(line.unitPrice).toBe(5.49);
    expect(line.price).toBe(2.99); // base kept for reference
    expect(NileBean.getLineTotal(line)).toBe(5.49);
  });

  it('multiplies the unit price by the quantity', () => {
    NileBean.addToCart(espresso(), 3, { size: 'Triple', extras: ['Vanilla Syrup'] });
    expect(NileBean.getLineTotal(NileBean.getCart()[0])).toBeCloseTo(16.47, 2);
  });

  it('keeps the chosen options on the line', () => {
    NileBean.addToCart(espresso(), 1, {
      size: 'Double',
      milk: 'Oat',
      extras: ['Extra Shot'],
      specialInstructions: 'Extra hot'
    });

    const line = NileBean.getCart()[0];
    expect(line).toMatchObject({
      size: 'Double',
      milk: 'Oat',
      extras: ['Extra Shot'],
      specialInstructions: 'Extra hot'
    });
  });

  it('persists to localStorage', () => {
    NileBean.addToCart(croissant(), 2);
    const stored = JSON.parse(localStorage.getItem('nilebeanCart'));
    expect(stored).toHaveLength(1);
    expect(stored[0].quantity).toBe(2);
  });

  it('updates the header count badge', () => {
    NileBean.addToCart(espresso(), 2);
    NileBean.addToCart(croissant(), 3);
    expect(NileBean.getCartCount()).toBe(5);
    expect(document.getElementById('cartCount').textContent).toBe('5');
  });
});

describe('one source of truth for cart state', () => {
  it('reflects a mutation immediately in a previously fetched reference', () => {
    // Two independent copies of the cart were the reason the quantity buttons
    // did nothing on screen (AUDIT.md 2.2).
    NileBean.addToCart(espresso(), 1);
    const before = NileBean.getCart();

    NileBean.updateCartItem(0, { quantity: 4 });

    expect(before[0].quantity).toBe(4);
    expect(NileBean.getCart()[0].quantity).toBe(4);
  });

  it('increments repeatedly rather than idempotently', () => {
    // Three clicks used to produce a single increment.
    NileBean.addToCart(espresso(), 1);
    for (let i = 0; i < 3; i++) {
      NileBean.updateCartItem(0, { quantity: NileBean.getCart()[0].quantity + 1 });
    }
    expect(NileBean.getCart()[0].quantity).toBe(4);
  });

  it('empties fully on clear, in memory and in storage', () => {
    NileBean.addToCart(espresso(), 1);
    NileBean.clearCart();

    expect(NileBean.getCart()).toHaveLength(0);
    expect(JSON.parse(localStorage.getItem('nilebeanCart'))).toEqual([]);
    expect(document.getElementById('cartCount').textContent).toBe('0');
  });

  it('removes the right line and reaches zero', () => {
    NileBean.addToCart(espresso(), 1);
    NileBean.addToCart(croissant(), 1);

    NileBean.removeCartItem(0);
    expect(NileBean.getCart()).toHaveLength(1);
    expect(NileBean.getCart()[0].name).toBe('Butter Croissant');

    NileBean.removeCartItem(0);
    expect(NileBean.getCart()).toHaveLength(0);
  });

  it('ignores an out-of-range index instead of corrupting the cart', () => {
    NileBean.addToCart(espresso(), 1);
    NileBean.removeCartItem(99);
    NileBean.updateCartItem(-1, { quantity: 50 });

    expect(NileBean.getCart()).toHaveLength(1);
    expect(NileBean.getCart()[0].quantity).toBe(1);
  });
});

describe('cart totals', () => {
  it('sums every line at its option-inclusive price', () => {
    NileBean.addToCart(espresso(), 1, { size: 'Triple', extras: ['Vanilla Syrup'] }); // 5.49
    NileBean.addToCart(croissant(), 2);                                              // 6.58
    expect(NileBean.getCartSubtotal()).toBeCloseTo(12.07, 2);
  });

  it('falls back to the base price for a line saved before unitPrice existed', () => {
    // A cart already in a returning customer's browser must still render.
    localStorage.setItem(
      'nilebeanCart',
      JSON.stringify([{ id: 'espresso', name: 'Espresso', price: 2.99, quantity: 2 }])
    );
    const reloaded = { unitPrice: undefined, price: 2.99, quantity: 2 };
    expect(NileBean.getUnitPrice(reloaded)).toBe(2.99);
    expect(NileBean.getLineTotal(reloaded)).toBe(5.98);
  });
});

describe('reading a damaged localStorage', () => {
  it('recovers from malformed JSON instead of blanking the page', async () => {
    // This used to throw at the top of main.js, leaving window.NileBean
    // undefined and every page blank (AUDIT.md 6.4).
    localStorage.setItem('nilebeanCart', '{corrupt');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const app = await loadApp();

    expect(app).toBeDefined();
    expect(app.getCart()).toEqual([]);
    expect(localStorage.getItem('nilebeanCart')).toBeNull(); // corrupt key dropped
    warn.mockRestore();
  });

  it('rejects well-formed JSON of the wrong shape', async () => {
    localStorage.setItem('nilebeanCart', JSON.stringify({ not: 'an array' }));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const app = await loadApp();

    expect(Array.isArray(app.getCart())).toBe(true);
    expect(app.getCart()).toHaveLength(0);
    warn.mockRestore();
  });
});

describe('when the catalogue cannot be fetched', () => {
  it('reports an error state rather than an empty menu', async () => {
    const error = new Error('Could not reach the server.');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const app = await loadApp({ failWith: error });

    expect(app.getLoadState().state).toBe('error');
    expect(app.getLoadState().error.message).toBe('Could not reach the server.');
    expect(app.getProducts()).toEqual([]);
    errorSpy.mockRestore();
  });
});
