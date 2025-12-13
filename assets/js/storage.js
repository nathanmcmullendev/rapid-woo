// ============================================
// STORAGE MANAGER
// Unified localStorage handler with priority system
// ============================================

window.RapidWoo = window.RapidWoo || {};

window.RapidWoo.Storage = {
  
  /**
   * Get products with priority:
   * 1. User-uploaded products (highest priority)
   * 2. Demo products from localStorage
   * 3. Products from JSON file
   * 4. Hardcoded demo products (fallback)
   */
  async getProducts() {
    try {
      const keys = window.RapidWoo.Config.STORAGE_KEYS;
      
      // Priority 1: User products (uploaded via home page or edited in demo)
      const userProducts = localStorage.getItem(keys.USER_PRODUCTS);
      if (userProducts) {
        const data = JSON.parse(userProducts);
        if (data.products && Array.isArray(data.products) && data.products.length > 0) {
          console.log('📦 Loaded USER products:', data.products.length);
          return data;
        }
      }
      
      // Priority 2: Check uploaded demo (from home page image upload)
      const uploadedDemo = localStorage.getItem(keys.UPLOADED_DEMO);
      if (uploadedDemo) {
        const data = JSON.parse(uploadedDemo);
        if (data.products && Array.isArray(data.products) && data.products.length > 0) {
          console.log('📦 Loaded UPLOADED products:', data.products.length);
          // Promote to user products for persistence
          this.saveProducts(data);
          return data;
        }
      }
      
      // Priority 3: Demo products from localStorage
      const demoProducts = localStorage.getItem(keys.DEMO_PRODUCTS);
      if (demoProducts) {
        const data = JSON.parse(demoProducts);
        if (data.products && Array.isArray(data.products) && data.products.length > 0) {
          console.log('📦 Loaded DEMO products from storage:', data.products.length);
          return data;
        }
      }
      
      // Priority 4: Load from products.json
      try {
        const response = await fetch(window.RapidWoo.Config.API.PRODUCTS_JSON, { 
          cache: 'no-store' 
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.products && Array.isArray(data.products)) {
            console.log('📦 Loaded products from JSON:', data.products.length);
            // Cache demo products
            localStorage.setItem(keys.DEMO_PRODUCTS, JSON.stringify(data));
            return data;
          }
        }
      } catch (fetchError) {
        console.warn('⚠️ Could not fetch products.json:', fetchError.message);
      }
      
      // Priority 5: Fallback to hardcoded demo products
      console.log('📦 Using fallback demo products');
      const fallbackData = { products: window.RapidWoo.Config.DEMO_PRODUCTS };
      localStorage.setItem(keys.DEMO_PRODUCTS, JSON.stringify(fallbackData));
      return fallbackData;
      
    } catch (error) {
      console.error('❌ Error loading products:', error);
      return { products: window.RapidWoo.Config.DEMO_PRODUCTS };
    }
  },

  /**
   * Save products to USER storage (highest priority)
   */
  saveProducts(data) {
    try {
      const keys = window.RapidWoo.Config.STORAGE_KEYS;
      localStorage.setItem(keys.USER_PRODUCTS, JSON.stringify(data));
      console.log('✅ Saved products to user storage:', data.products.length);
      return true;
    } catch (error) {
      console.error('❌ Error saving products:', error);
      
      // If localStorage is full, try to clear old data
      if (error.name === 'QuotaExceededError') {
        console.warn('⚠️ Storage quota exceeded, clearing old data...');
        this.clearDemoData();
        try {
          localStorage.setItem(window.RapidWoo.Config.STORAGE_KEYS.USER_PRODUCTS, JSON.stringify(data));
          console.log('✅ Saved after clearing space');
          return true;
        } catch (retryError) {
          console.error('❌ Still failed after clearing:', retryError);
          return false;
        }
      }
      return false;
    }
  },

  /**
   * Load demo products (without saving to user storage)
   */
  async loadDemoProducts() {
    try {
      const keys = window.RapidWoo.Config.STORAGE_KEYS;
      
      // Try to load from localStorage first
      const cached = localStorage.getItem(keys.DEMO_PRODUCTS);
      if (cached) {
        const data = JSON.parse(cached);
        if (data.products && Array.isArray(data.products)) {
          console.log('📦 Loaded cached demo products:', data.products.length);
          return data;
        }
      }
      
      // Fetch from JSON
      const response = await fetch(window.RapidWoo.Config.API.PRODUCTS_JSON, { 
        cache: 'no-store' 
      });
      
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem(keys.DEMO_PRODUCTS, JSON.stringify(data));
        console.log('📦 Loaded demo products from JSON:', data.products.length);
        return data;
      }
      
      // Fallback
      const fallbackData = { products: window.RapidWoo.Config.DEMO_PRODUCTS };
      localStorage.setItem(keys.DEMO_PRODUCTS, JSON.stringify(fallbackData));
      return fallbackData;
      
    } catch (error) {
      console.error('❌ Error loading demo products:', error);
      return { products: window.RapidWoo.Config.DEMO_PRODUCTS };
    }
  },

  /**
   * Switch to demo products (replace user products with demo)
   */
  async useDemoProducts() {
    const demoData = await this.loadDemoProducts();
    this.saveProducts(demoData);
    console.log('✅ Switched to demo products');
    return demoData;
  },

  /**
   * Clear all product data
   */
  clearAll() {
    const keys = window.RapidWoo.Config.STORAGE_KEYS;
    Object.values(keys).forEach(key => {
      localStorage.removeItem(key);
    });
    console.log('🗑️ Cleared all product data');
  },

  /**
   * Clear only demo data (keep user products)
   */
  clearDemoData() {
    const keys = window.RapidWoo.Config.STORAGE_KEYS;
    localStorage.removeItem(keys.DEMO_PRODUCTS);
    localStorage.removeItem(keys.UPLOADED_DEMO);
    localStorage.removeItem(keys.LEGACY);
    console.log('🗑️ Cleared demo data');
  },

  /**
   * Check if user has custom products
   */
  hasUserProducts() {
    const userProducts = localStorage.getItem(window.RapidWoo.Config.STORAGE_KEYS.USER_PRODUCTS);
    if (!userProducts) return false;
    
    try {
      const data = JSON.parse(userProducts);
      return data.products && Array.isArray(data.products) && data.products.length > 0;
    } catch (error) {
      return false;
    }
  },

  /**
   * Export products as JSON file
   */
  exportJSON(data, filename = 'products.json') {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      console.log('✅ Exported products to', filename);
      return true;
    } catch (error) {
      console.error('❌ Export failed:', error);
      return false;
    }
  },

  /**
   * Import products from JSON
   */
  async importJSON(file) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!data.products || !Array.isArray(data.products)) {
        throw new Error('Invalid JSON format: missing "products" array');
      }
      
      this.saveProducts(data);
      console.log('✅ Imported', data.products.length, 'products');
      return data;
      
    } catch (error) {
      console.error('❌ Import failed:', error);
      throw error;
    }
  },

  /**
   * Get storage usage info
   */
  getStorageInfo() {
    const keys = window.RapidWoo.Config.STORAGE_KEYS;
    const info = {
      total: 0,
      userProducts: 0,
      demoProducts: 0,
      uploadedDemo: 0
    };
    
    Object.entries(keys).forEach(([name, key]) => {
      const item = localStorage.getItem(key);
      if (item) {
        const size = new Blob([item]).size;
        info[name.toLowerCase().replace('_', '')] = size;
        info.total += size;
      }
    });
    
    return {
      ...info,
      totalMB: (info.total / 1024 / 1024).toFixed(2),
      userProductsMB: (info.userProducts / 1024 / 1024).toFixed(2),
      demoProductsMB: (info.demoProducts / 1024 / 1024).toFixed(2)
    };
  }
};

console.log('✅ RapidWoo Storage loaded');