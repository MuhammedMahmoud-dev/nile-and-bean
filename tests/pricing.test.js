// Price calculation in the browser.
//
// This mirrors the server-side pricing tests. The frontend figure is only a
// preview - the server prices every order authoritatively - but it is what the
// customer reads before they commit, so it has to agree.

import { beforeEach, describe, expect, it } from 'vitest';
import { loadApp } from './helpers/loadApp.js';

let NileBean;

beforeEach(async () => {
  localStorage.clear();
  NileBean = await loadApp();
});

describe('calculateTotalPrice', () => {
  const espresso = () => NileBean.getProductById('espresso');
  const croissant = () => NileBean.getProductById('croissant');

  it('returns the base price when nothing is chosen', () => {
    expect(NileBean.calculateTotalPrice(espresso())).toBe(2.99);
  });

  it('adds the size upcharge', () => {
    expect(NileBean.calculateTotalPrice(espresso(), 'Triple')).toBe(4.99);
  });

  it('adds an extra', () => {
    expect(NileBean.calculateTotalPrice(espresso(), null, ['Extra Shot'])).toBe(3.98);
  });

  it('adds size and extras together', () => {
    // The exact case from the audit: 2.99 + 2.00 + 0.50
    expect(NileBean.calculateTotalPrice(espresso(), 'Triple', ['Vanilla Syrup'])).toBe(5.49);
  });

  it('adds every selected extra', () => {
    expect(
      NileBean.calculateTotalPrice(espresso(), null, ['Extra Shot', 'Vanilla Syrup'])
    ).toBe(4.48);
  });

  it('charges nothing extra for a zero-priced size', () => {
    expect(NileBean.calculateTotalPrice(espresso(), 'Single')).toBe(2.99);
  });

  it('prices a product that has no options at all', () => {
    expect(NileBean.calculateTotalPrice(croissant())).toBe(3.29);
  });

  it('rounds away binary floating point error', () => {
    // 4.49 + 1 + 0.99 is 6.4799999999999995 before rounding.
    const result = NileBean.calculateTotalPrice(
      NileBean.getProductById('latte'), 'Large', ['Extra Shot']
    );
    expect(result).toBe(6.48);
    expect(result.toFixed(2)).toBe('6.48');
  });

  it('ignores an option the product does not offer rather than crashing', () => {
    // The server rejects these outright; the client must not invent a price.
    expect(NileBean.calculateTotalPrice(espresso(), 'Gigantic')).toBe(2.99);
    expect(NileBean.calculateTotalPrice(espresso(), null, ['Free Gold Bar'])).toBe(2.99);
  });
});

describe('normalising what the API sends', () => {
  it('converts the price from a JSON string to a number', () => {
    // Pydantic serialises Decimal as a string; toFixed() would throw on it.
    const product = NileBean.getProductById('espresso');
    expect(typeof product.price).toBe('number');
    expect(product.price).toBe(2.99);
    expect(() => product.price.toFixed(2)).not.toThrow();
  });

  it('maps snake_case fields to the names the page scripts use', () => {
    const product = NileBean.getProductById('espresso');
    expect(product.id).toBe('espresso');          // slug becomes the public id
    expect(product.shortDescription).toBe('Bold and full-bodied');
    expect(product.longDescription).toContain('Arabica');
  });

  it('keeps nested option prices numeric', () => {
    const sizes = NileBean.getProductById('espresso').options.sizes;
    expect(sizes.every(s => typeof s.price === 'number')).toBe(true);
  });

  it('leaves a product without options undefined rather than empty', () => {
    expect(NileBean.getProductById('croissant').options).toBeUndefined();
  });
});
