// Formatting, escaping and the Egyptian additions to the cart.

import { beforeEach, describe, expect, it } from 'vitest';
import { API_PRODUCTS, loadApp } from './helpers/loadApp.js';

const TURKISH = {
  id: 9,
  slug: 'turkish-coffee',
  name: 'Turkish Coffee',
  name_ar: 'قهوة تركي',
  image: 'https://images.unsplash.com/photo-1757079649052-a24c6ab32c64',
  price: '45.00',
  category: 'coffee',
  short_description: 'Brewed in a copper kanaka',
  long_description: null,
  options: {
    sizes: [{ name: 'Single', price: 0 }, { name: 'Double', price: 20 }],
    sugar: ['Sada · no sugar', 'Mazboot · medium'],
    extras: [{ name: 'Cardamom', price: 5 }]
  },
  featured: true,
  popular: true,
  available: true
};

let NileBean;

beforeEach(async () => {
  localStorage.clear();
  document.body.innerHTML = '<span id="cartCount">0</span>';
  NileBean = await loadApp({ products: [...API_PRODUCTS, TURKISH] });
});

describe('formatEGP', () => {
  it('shows whole pounds without piastres', () => {
    expect(NileBean.formatEGP(95)).toBe('EGP 95');
  });

  it('shows piastres when there are some', () => {
    expect(NileBean.formatEGP(108.3)).toBe('EGP 108.30');
    expect(NileBean.formatEGP('239.40')).toBe('EGP 239.40');
  });

  it('groups thousands', () => {
    expect(NileBean.formatEGP(1234)).toBe('EGP 1,234');
  });

  it('treats a float rounding error as a whole number', () => {
    expect(NileBean.formatEGP(0.1 * 3 * 100)).toBe('EGP 30');
  });
});

describe('escaping what reaches innerHTML', () => {
  it('escapes markup characters', () => {
    expect(NileBean.escapeHtml('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x onerror=alert(1)&gt;');
    expect(NileBean.escapeHtml(`"quoted" & 'single'`)).toBe('&quot;quoted&quot; &amp; &#39;single&#39;');
  });

  it('renders a hostile product name as text, not as an element', async () => {
    // Product names come from the admin form now; this is the stored-XSS path.
    const hostile = { ...TURKISH, slug: 'evil', name: '<img src=x onerror="window.pwned=1">' };
    const app = await loadApp({ products: [hostile] });

    const card = app.createProductCard(app.getProductById('evil'));

    expect(card.querySelectorAll('img')).toHaveLength(1); // only the photo
    expect(card.querySelector('.product-plate__en').textContent).toBe(hostile.name);
  });
});

describe('Arabic names and sugar levels', () => {
  it('carries the Arabic name through normalisation', () => {
    expect(NileBean.getProductById('turkish-coffee').nameAr).toBe('قهوة تركي');
  });

  it('keeps the sugar levels as offered', () => {
    expect(NileBean.getProductById('turkish-coffee').options.sugar).toEqual(['Sada · no sugar', 'Mazboot · medium']);
  });

  it('stores the chosen sugar level on the cart line', () => {
    const product = NileBean.getProductById('turkish-coffee');
    NileBean.addToCart(product, 2, { size: 'Double', sugar: 'Mazboot · medium', extras: ['Cardamom'] });

    const line = NileBean.getCart()[0];
    expect(line.sugar).toBe('Mazboot · medium');
    expect(line.unitPrice).toBe(70); // 45 + 20 + 5; sugar is free
    expect(NileBean.getLineTotal(line)).toBe(140);
  });

  it('names every sugar level in Arabic', () => {
    expect(Object.values(NileBean.SUGAR_AR)).toEqual(['سادة', 'ع الريحة', 'مظبوط', 'زيادة']);
  });

  it('uses Egyptian VAT', () => {
    expect(NileBean.TAX_RATE).toBe(0.14);
  });
});

describe('image URLs', () => {
  it('asks Unsplash for the size the slot needs', () => {
    expect(NileBean.imageUrl('https://images.unsplash.com/photo-1?w=3000', 600)).toBe(
      'https://images.unsplash.com/photo-1?w=600&q=70&auto=format&fit=crop&ar=4:3'
    );
  });

  it('leaves other hosts untouched', () => {
    expect(NileBean.imageUrl('https://example.com/a.jpg', 600)).toBe('https://example.com/a.jpg');
  });
});
