// ============================================
// RapidWoo Cart — self-contained cart engine
// Works with your existing RapidWoo.Storage and Utils if present
// Emits: 'rapidwoo:cart:updated' on window when cart changes
// ============================================

(function () {
  window.RapidWoo = window.RapidWoo || {};
  const RW = window.RapidWoo;

  const STORAGE_KEY = 'rapidwoo-cart';
  const COUPON_KEY  = 'rapidwoo-cart-coupon';

  // Built-in coupons (simple examples)
  const COUPONS = {
    'SAVE10':   { code: 'SAVE10',   type: 'percent',  value: 10,  minSubtotal: 0,   description: '10% off any order' },
    'SAVE20':   { code: 'SAVE20',   type: 'percent',  value: 20,  minSubtotal: 100, description: '20% off $100+' },
    'FREESHIP': { code: 'FREESHIP', type: 'shipping', value: 0,   minSubtotal: 0,   description: 'Free standard shipping' },
  };

  // Defaults
  const TAX_RATE = 0.06;                 // 6% demo tax
  const SHIPPING_FLAT = 7.99;            // base flat rate
  const FREE_SHIP_THRESHOLD = 75;        // free ship at/over threshold (in addition to FREESHIP)

  // Utilities (use your Utils if present, otherwise safe fallbacks)
  const Utils = RW.Utils || {
    showToast: (msg, type) => console.log(`[Cart ${type || 'info'}]`, msg),
    q: (sel, el = document) => el.querySelector(sel),
    qa: (sel, el = document) => Array.from(el.querySelectorAll(sel)),
  };

  // Product resolver: tries RapidWoo.Storage, then App.products, else minimal shell
  async function resolveProduct(idOrSlug) {
    const idStr = String(idOrSlug).trim();

    // Try Storage first (it's async)
    const Storage = RW.Storage;
    if (Storage?.getProducts) {
      try {
        const data = await Storage.getProducts();
        const arr = data?.products || [];
        
        // Try to find by ID first
        let found = arr.find(p => String(p.id) === idStr);
        if (found) return found;
        
        // Try to find by slug
        found = arr.find(p => String(p.slug) === idStr);
        if (found) return found;
      } catch (e) {
        console.error('Error loading products:', e);
      }
    }

    // Try App.products (synchronous fallback)
    const App = window.App;
    if (App?.products?.length) {
      let found = App.products.find(p => String(p.id) === idStr);
      if (!found) found = App.products.find(p => String(p.slug) === idStr);
      if (found) return found;
    }

    // minimal fallback
    console.warn(`Product ${idStr} not found, using fallback`);
    return {
      id: idStr,
      slug: idStr,
      title: 'Item',
      price: 0,
      regular_price: 0,
      sale_price: null,
      stock_status: 'instock',
      image: ''
    };
  }

  // Core Cart
  const Cart = {
    // ------------- Storage -------------
    _loadItems() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        console.error('Cart load error:', e);
        return [];
      }
    },
    _saveItems(items) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        this.updateCartBadge();
        this._emitUpdated();
        return true;
      } catch (e) {
        console.error('Cart save error:', e);
        return false;
      }
    },
    _loadCoupon() {
      try {
        const raw = localStorage.getItem(COUPON_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    },
    _saveCoupon(couponOrNull) {
      if (!couponOrNull) {
        localStorage.removeItem(COUPON_KEY);
      } else {
        localStorage.setItem(COUPON_KEY, JSON.stringify(couponOrNull));
      }
      this._emitUpdated();
    },

    // ------------- Public: Getters -------------
    getItems() {
      return this._loadItems();
    },
    getItemCount() {
      return this.getItems().reduce((n, it) => n + (Number(it.quantity) || 0), 0);
    },
    getAppliedCoupon() {
      return this._loadCoupon();
    },

    // ------------- Public: Mutations -------------
    async add(idOrSlug, qty = 1) {
      try {
        const product = await resolveProduct(idOrSlug);
        const quantity = Math.max(1, Number(qty) || 1);
        const items = this._loadItems();

        const pid = String(product.id ?? idOrSlug);
        const existing = items.find(it => String(it.id) === pid);

        // Check stock status
        if (product.stock_status === 'outofstock') {
          Utils.showToast('Sorry, this product is out of stock', 'error');
          return false;
        }

        const price = Number(
          product.sale_price ?? product.price ?? product.regular_price ?? 0
        ) || 0;

        if (existing) {
          existing.quantity = Math.max(1, Number(existing.quantity || 1) + quantity);
        } else {
          items.push({
            id: pid,
            slug: product.slug || '',
            title: product.title || 'Item',
            price,
            image: product.image || (product.images?.[0]?.src ?? ''),
            stock_status: product.stock_status || 'instock',
            quantity
          });
        }
        
        this._saveItems(items);
        Utils.showToast(`Added "${product.title || 'Item'}" to cart`, 'success');
        return true;
      } catch (error) {
        console.error('Error adding to cart:', error);
        Utils.showToast('Failed to add item to cart', 'error');
        return false;
      }
    },

    updateQuantity(idOrSlug, qty) {
      const id = String(idOrSlug);
      const quantity = Math.max(0, Number(qty) || 0);
      const items = this._loadItems();
      const idx = items.findIndex(it => String(it.id) === id);
      if (idx === -1) return false;

      if (quantity === 0) {
        items.splice(idx, 1);
      } else {
        items[idx].quantity = quantity;
      }
      this._saveItems(items);
      return true;
    },

    remove(idOrSlug) {
      const id = String(idOrSlug);
      const items = this._loadItems().filter(it => String(it.id) !== id);
      this._saveItems(items);
      Utils.showToast('Item removed from cart', 'success');
      return true;
    },

    clear() {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(COUPON_KEY);
      this.updateCartBadge();
      this._emitUpdated();
      Utils.showToast('Cart cleared', 'success');
    },

    // ------------- Coupons -------------
    applyCoupon(codeRaw) {
      const code = String(codeRaw || '').trim().toUpperCase();
      const def = COUPONS[code];
      if (!def) {
        return { success: false, message: 'Invalid coupon code' };
      }
      const totals = this.getTotalsNoCoupon();
      if (totals.subtotal < (def.minSubtotal || 0)) {
        return { success: false, message: `Requires subtotal of $${def.minSubtotal}` };
      }
      this._saveCoupon(def);
      Utils.showToast(`Coupon applied: ${def.description}`, 'success');
      return { success: true, coupon: def };
    },

    removeCoupon() {
      this._saveCoupon(null);
      Utils.showToast('Coupon removed', 'success');
      return true;
    },

    // ------------- Totals -------------
    // Compute totals WITHOUT coupon for rule-checking
    getTotalsNoCoupon() {
      const items = this._loadItems();
      let subtotal = 0, itemCount = 0;
      items.forEach(it => {
        const price = Number(it.price) || 0;
        const q = Number(it.quantity) || 0;
        subtotal += price * q;
        itemCount += q;
      });

      // shipping (pre-coupon): waive if threshold hit
      let shipping = subtotal >= FREE_SHIP_THRESHOLD ? 0 : SHIPPING_FLAT;

      const tax = subtotal * TAX_RATE;
      const total = subtotal + shipping + tax;

      return { itemCount, subtotal, shipping, tax, discount: 0, total, appliedCoupon: null };
    },

    // Compute totals WITH coupon
    getTotals() {
      const noC = this.getTotalsNoCoupon();
      const coupon = this.getAppliedCoupon();
      if (!coupon) return noC;

      let discount = 0;
      let shipping = noC.shipping;

      if (coupon.type === 'percent') {
        discount = noC.subtotal * (Number(coupon.value) / 100);
      } else if (coupon.type === 'shipping') {
        shipping = 0;
      }

      const tax = (noC.subtotal - discount) * TAX_RATE;
      const total = Math.max(0, (noC.subtotal - discount) + shipping + tax);

      return {
        itemCount: noC.itemCount,
        subtotal: noC.subtotal,
        shipping,
        tax,
        discount,
        total,
        appliedCoupon: coupon
      };
    },

    // ------------- UI helpers -------------
    updateCartBadge() {
      const count = this.getItemCount();
      // .cart-badge-count or #cart-count supported
      const nodes = [
        ...(Utils.qa?.('.cart-badge-count') || []),
        ...(Utils.qa?.('#cart-count') || [])
      ];
      nodes.forEach(n => { 
        n.textContent = String(count);
        // Show/hide badge
        if (count > 0) {
          n.style.display = 'flex';
        }
      });
    },

    // ------------- Events -------------
    _emitUpdated() {
      try {
        const evt = new CustomEvent('rapidwoo:cart:updated', { detail: this.getTotals() });
        window.dispatchEvent(evt);
      } catch (e) {}
    }
  };

  // Sync across tabs
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY || e.key === COUPON_KEY) {
      Cart.updateCartBadge();
      Cart._emitUpdated();
    }
  });

  // Export
  RW.Cart = Cart;

  // Init badge on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      Cart.updateCartBadge();
    });
  } else {
    Cart.updateCartBadge();
  }

  console.log('✅ RapidWoo Cart ready');
})();