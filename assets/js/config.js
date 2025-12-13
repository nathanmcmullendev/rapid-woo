// ============================================
// RAPIDWOO CONFIGURATION
// Global constants and settings
// ============================================

window.RapidWoo = window.RapidWoo || {};

window.RapidWoo.Config = {
  // --------------------------------------------
  // LocalStorage Keys
  // --------------------------------------------
  STORAGE_KEYS: {
    USER_PRODUCTS: 'rapidwoo-user-products',
    DEMO_PRODUCTS: 'rapidwoo-demo-products',
    UPLOADED_DEMO: 'rapidwoo-uploaded-demo',
    LEGACY: 'wfsm-v22-backup' // For backwards compatibility
  },

  // --------------------------------------------
  // API Endpoints
  // NOTE: UPLOAD MUST POINT TO YOUR PHP ENDPOINT
  // --------------------------------------------
  API: {
    // If you kept the filename I provided earlier:
    // UPLOAD: '/upload-temp.php',
    //
    // If you prefer your existing name, make sure the PHP is at this path:
    UPLOAD: '/upload-temp.php',
    PRODUCTS_JSON: '/demo/products.json'
  },

  // --------------------------------------------
  // Image Settings (used by ImageHandler)
  // --------------------------------------------
  IMAGE: {
    MAX_SIZE: 8 * 1024 * 1024, // 8MB (match PHP)
    MAX_WIDTH: 1200,
    QUALITY: 0.85,
    THUMBNAIL_SIZE: 400,
    THUMBNAIL_QUALITY: 0.8,
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  },

  // --------------------------------------------
  // Product Defaults
  // --------------------------------------------
  DEFAULTS: {
    PRODUCT: {
      id: null,
      title: 'New Product',
      slug: '',
      sku: '',
      type: 'simple',
      status: 'publish',
      stock_status: 'instock',
      regular_price: '',
      sale_price: '',
      price: '',
      description: '',
      short_description: '',
      categories: [],
      tags: [],
      image: '',
      images: [],
      // for editor side panel (two explicit slots)
      gallery: [{ url: '' }, { url: '' }],
      extra_images_enabled: false,

      manage_stock: false,
      stock_quantity: null,
      weight: '',
      dimensions: { length: '', width: '', height: '' },
      shipping_class: '',
      featured: false,
      sold_individually: false,
      hidden: false
    }
  },

  // --------------------------------------------
  // Demo Products (fallback if JSON fails)
  // --------------------------------------------
  DEMO_PRODUCTS: [
    {
      id: 1761000000001,
      title: 'Neon City Lights',
      slug: 'neon-city-lights',
      sku: 'ARTP-NEON-001',
      stock_status: 'instock',
      regular_price: '82.00',
      categories: ['Art Prints', 'Photography'],
      tags: ['neon', 'city', 'night'],
      image: 'https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?w=1200&auto=format&fit=crop&q=80',
      images: [
        { src: 'https://images.unsplash.com/photo-1517816743773-6e0fd518b4a6?w=1000&auto=format&fit=crop&q=80' },
        { src: 'https://images.unsplash.com/photo-1503602642458-232111445657?w=1000&auto=format&fit=crop&q=80' }
      ],
      gallery: [{ url: '' }, { url: '' }],
      extra_images_enabled: false,
      description: '<p>Vibrant neon reflections across a rainy avenue. Perfect centerpiece for modern spaces.</p>',
      short_description: 'A vibrant nightscape bathed in neon.',
      type: 'simple',
      manage_stock: true,
      stock_quantity: 18,
      weight: '',
      dimensions: { length: '', width: '', height: '' },
      hidden: false
    },
    {
      id: 1761000000003,
      title: 'Tropical Wave',
      slug: 'tropical-wave',
      sku: 'ARTP-OCEAN-001',
      stock_status: 'instock',
      regular_price: '99.00',
      categories: ['Art Prints', 'Nature'],
      tags: ['ocean', 'surf', 'blue'],
      image: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1200&auto=format&fit=crop&q=80',
      images: [
        { src: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1000&auto=format&fit=crop&q=80' },
        { src: 'https://images.unsplash.com/photo-1504196606672-aef5c9cefc92?w=1000&auto=format&fit=crop&q=80' }
      ],
      gallery: [{ url: '' }, { url: '' }],
      extra_images_enabled: false,
      description: '<p>A crystalline breaker captured at golden hour. Cool blues with soft foam detail.</p>',
      short_description: 'Serene, high-energy ocean print.',
      type: 'simple',
      manage_stock: true,
      stock_quantity: 32,
      weight: '',
      dimensions: { length: '', width: '', height: '' },
      hidden: false
    },
    {
      id: 1761000000004,
      title: 'Golden Desert Dunes',
      slug: 'golden-desert-dunes',
      sku: 'ARTP-DESERT-001',
      stock_status: 'instock',
      regular_price: '109.00',
      categories: ['Art Prints', 'Landscape'],
      tags: ['desert', 'sand', 'minimal'],
      image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&auto=format&fit=crop&q=80',
      images: [
        { src: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1000&auto=format&fit=crop&q=80' },
        { src: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&auto=format&fit=crop&q=80' }
      ],
      gallery: [{ url: '' }, { url: '' }],
      extra_images_enabled: false,
      description: '<p>Minimalist ridgelines and long shadows—calm, warm, and sculptural.</p>',
      short_description: 'Minimal desert geometry.',
      type: 'simple',
      manage_stock: false,
      stock_quantity: null,
      weight: '',
      dimensions: { length: '', width: '', height: '' },
      hidden: false
    },
    {
      id: 1761000000007,
      title: 'Geometric Prism',
      slug: 'geometric-prism',
      sku: 'ARTP-GEO-001',
      stock_status: 'outofstock',
      regular_price: '139.00',
      categories: ['Art Prints', 'Abstract'],
      tags: ['geometric', 'modern', 'color'],
      image: 'https://images.unsplash.com/photo-1520975916090-3105956dac38?w=1200&auto=format&fit=crop&q=80',
      images: [
        { src: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1000&auto=format&fit=crop&q=80' },
        { src: 'https://images.unsplash.com/photo-1501769214405-5e86a7334e36?w=1000&auto=format&fit=crop&q=80' }
      ],
      gallery: [{ url: '' }, { url: '' }],
      extra_images_enabled: false,
      description: '<p>Crystal-like geometry with saturated color transitions—bold and contemporary.</p>',
      short_description: 'Bold geometric abstraction.',
      type: 'simple',
      manage_stock: false,
      stock_quantity: null,
      weight: '',
      dimensions: { length: '', width: '', height: '' },
      hidden: false
    },
    {
      id: 1761000000008,
      title: 'Cosmic Aurora',
      slug: 'cosmic-aurora',
      sku: 'ARTP-AUR-001',
      stock_status: 'instock',
      regular_price: '149.00',
      categories: ['Art Prints', 'Photography'],
      tags: ['aurora', 'night', 'sky'],
      image: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1200&auto=format&fit=crop&q=80',
      images: [
        { src: 'https://images.unsplash.com/photo-1454789548928-9efd52dc4031?w=1000&auto=format&fit=crop&q=80' },
        { src: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1000&auto=format&fit=crop&q=80' }
      ],
      gallery: [{ url: '' }, { url: '' }],
      extra_images_enabled: false,
      description: '<p>A sweeping aurora dances under a field of stars. Deep greens and violets for a dramatic focal point.</p>',
      short_description: 'Sweeping aurora under the stars.',
      type: 'simple',
      manage_stock: true,
      stock_quantity: 12,
      weight: '',
      dimensions: { length: '', width: '', height: '' },
      hidden: false
    }
  ]
};

console.log('✅ RapidWoo Config loaded');
