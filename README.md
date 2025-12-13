# RapidWoo

A JSON-driven static storefront with a spreadsheet-style product editor. Built with vanilla JavaScript — no frameworks, no build tools, runs on GitHub Pages.

![Editor Screenshot](screenshots/editor.png)

## What It Does

RapidWoo is a complete static e-commerce prototype system:

- **Product Editor** — Inline table editing with a slide-out panel for detailed product data
- **Shop Page** — Dynamically generated product grid with filtering and sorting
- **Product Pages** — Individual product pages with image galleries, variant selection, and Snipcart-ready markup
- **Data Persistence** — localStorage keeps your edits between sessions; JSON import/export for portability

Everything runs client-side. Edit products, see changes instantly on the shop and product pages.

## Features

### Editor (`/demo/index.html`)
- Inline editing for name, SKU, price, categories, tags
- Slide-out panel for full product editing
- **Variable products** with auto-generated variations (Size: S, M, L, XL → creates 4 variation rows)
- **Auto-generated SKUs** (TSHIRT-NEON-001 → TSHIRT-NEON-001-S, TSHIRT-NEON-001-M, etc.)
- Per-variation pricing with price deltas
- Per-variation stock status
- Multi-image upload with drag-and-drop
- Bulk actions (delete, duplicate)
- Column visibility toggles
- JSON import/export
- Inventory management (stock quantity, manage stock toggle)
- Shipping data (weight, dimensions, shipping class)

### Shop (`/shop.html`)
- Responsive product grid
- Category filtering
- Sort by newest, price, name
- Sale badges
- Quick view modal

### Product Page (`/product.html`)
- Image gallery with thumbnail navigation
- Variant selector (updates displayed SKU)
- Snipcart-ready "Add to Cart" button
- Breadcrumb navigation

## Screenshots

| Editor View | Shop View | Product Page |
|-------------|-----------|--------------|
| ![Editor](screenshots/editor.png) | ![Shop](screenshots/shop.png) | ![Product](screenshots/product.png) |

| Edit Panel - General | Edit Panel - Variations | Edit Panel - Inventory |
|---------------------|------------------------|----------------------|
| ![Panel 1](screenshots/panel-general.png) | ![Panel 2](screenshots/panel-variations.png) | ![Panel 3](screenshots/panel-inventory.png) |

## Tech Stack

- **Vanilla JavaScript** — No React, Vue, or build tools
- **localStorage** — Client-side persistence
- **CSS Grid/Flexbox** — Responsive layout
- **Snipcart** — Payment integration (ready, not active in demo)

### File Structure
```
/
├── index.html          # Landing page
├── shop.html           # Product listing
├── product.html        # Single product (reads ?product=slug from URL)
├── demo/
│   ├── index.html      # Product editor
│   └── products.json   # Sample product data
├── assets/
│   ├── css/
│   │   ├── main.css
│   │   └── components.css
│   └── js/
│       ├── config.js
│       ├── storage.js
│       ├── utils.js
│       ├── imageHandler.js
│       └── editor.js
└── upload-temp.php     # Optional: server-side image upload
```

## Running Locally

```bash
# Clone the repo
git clone https://github.com/nathanmcmullendev/rapidwoo.git

# Serve with any static server
npx serve .
# or
python -m http.server 8000
```

Open `http://localhost:8000/demo/` to access the editor.

## Data Model

Products follow a WooCommerce-compatible structure:

```json
{
  "id": 1762000000001,
  "title": "Graphic T-Shirt — Neon Wave",
  "slug": "graphic-tshirt-neon-wave",
  "sku": "TSHIRT-NEON-001",
  "type": "variable",
  "stock_status": "instock",
  "regular_price": "24.99",
  "sale_price": "19.99",
  "attributes": {
    "Size": ["S", "M", "L", "XL"]
  },
  "variations": [
    {
      "sku": "TSHIRT-NEON-001-S",
      "attributes": { "Size": "S" },
      "price_delta": "+0.00",
      "stock_status": "instock"
    }
  ],
  "categories": ["Clothing", "Apparel"],
  "tags": ["tshirt", "cotton", "unisex"],
  "image": "https://example.com/product.jpg",
  "images": ["https://example.com/gallery-1.jpg"],
  "description": "<p>Product description here.</p>",
  "manage_stock": true,
  "stock_quantity": 60,
  "weight": "0.4",
  "dimensions": { "length": "", "width": "", "height": "" },
  "shipping_class": "apparel"
}
```

## Limitations & Future Work

**Current limitations (client-side only):**
- Image uploads use base64 encoding (localStorage size limits apply)
- No real payment processing (Snipcart markup is ready but not connected)
- No user authentication

**With a server, you could add:**
- Persistent image uploads to `/uploads/tmp/` (PHP handler included)
- Database storage instead of localStorage
- WooCommerce REST API sync
- Real payment processing

**Work in progress:**
- Spreadsheet View mode exists but Import/Export/Save buttons are disabled (UI complete, functionality paused)

## Why This Exists

Built as a proof-of-concept for rapid e-commerce prototyping without WordPress overhead. The goal: let someone spin up a product catalog, edit it visually, and export clean JSON — all without touching a CMS.

## License

MIT

---

**Note:** This is a portfolio project demonstrating front-end architecture, state management, and e-commerce UX patterns. It is not production e-commerce software.
