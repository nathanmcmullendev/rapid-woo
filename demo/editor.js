// File: /demo/editor.js

// ============================================
// RAPIDWOO EDITOR - MAIN APPLICATION
// Loads saved products from LocalStorage (preferred)
// Falls back to /demo/products.json on first run
// Saves edits to LocalStorage so shop/product pages see changes
// ============================================

const Utils        = window.RapidWoo.Utils;
const Storage      = window.RapidWoo.Storage;
const Config       = window.RapidWoo.Config;
const ImageHandler = window.RapidWoo.ImageHandler;

// --------------------------------------------
// App state
// --------------------------------------------
const App = {
  products: [],
  selectedIds: new Set(),
  currentEditIndex: -1
};

// --------------------------------------------
// Small helpers
// --------------------------------------------
const isStr     = v => typeof v === 'string';
const isObj     = v => v && typeof v === 'object';
const asStr     = v => (isObj(v) ? v.src : v);
const isDataUrl = u => isStr(u) && u.startsWith('data:image/');

// For Snipcart buttons, prefer a non-base64 image
function getSnipcartSafeImage(p) {
  const gallery = Array.isArray(p.gallery) ? p.gallery.map(g => (g && g.url) || '') : [];
  const candidates = [p.image, ...(Array.isArray(p.images) ? p.images : []), ...gallery];
  return candidates.find(u => u && !isDataUrl(u)) || '';
}
window.RapidWoo = window.RapidWoo || {};
window.RapidWoo.getSnipcartSafeImage = getSnipcartSafeImage;

// --------------------------------------------
// COLUMN VISIBILITY (SKU OFF BY DEFAULT)
// --------------------------------------------
const COL_KEY = 'fpe.columns';
const COLS = ['image', 'sku', 'price', 'categories', 'tags'];

function getColumnState() {
  return JSON.parse(localStorage.getItem(COL_KEY) || 'null') || {
    image: true,
    sku: false, // hidden first load
    price: true,
    categories: true,
    tags: true
  };
}
function reflectColumnCheckboxes(state) {
  COLS.forEach(k => {
    const cb = document.getElementById(`toggle-home-${k}`);
    if (cb) cb.checked = !!state[k];
  });
}
function applyColumnVisibility(state) {
  COLS.forEach(k => {
    const show = !!state[k];
    Utils.qa(`th[data-col="${k}"], td[data-col="${k}"]`).forEach(el => {
      el.classList.toggle('hidden', !show);
      el.style.display = show ? '' : 'none';
    });
  });
}
function persistColumnStateFromUI() {
  const state = Object.fromEntries(
    COLS.map(k => [k, !!document.getElementById(`toggle-home-${k}`)?.checked])
  );
  localStorage.setItem(COL_KEY, JSON.stringify(state));
  return state;
}

// --------------------------------------------
// EDIT PANEL BACKDROP (click outside to close)
// --------------------------------------------
let panelBackdrop = null;
function showPanelBackdrop(show) {
  if (!panelBackdrop) {
    panelBackdrop = document.createElement('div');
    panelBackdrop.id = 'fpe-panel-backdrop';
    Object.assign(panelBackdrop.style, {
      position: 'fixed',
      inset: '0',
      background: 'rgba(0,0,0,.06)',
      zIndex: '1999', // panel is 2000
      opacity: '0',
      pointerEvents: 'none',
      transition: 'opacity .2s ease'
    });
    panelBackdrop.addEventListener('click', closePanel);
    document.body.appendChild(panelBackdrop);
  }
  requestAnimationFrame(() => {
    if (show) {
      panelBackdrop.style.opacity = '1';
      panelBackdrop.style.pointerEvents = 'auto';
    } else {
      panelBackdrop.style.opacity = '0';
      panelBackdrop.style.pointerEvents = 'none';
    }
  });
}

// --------------------------------------------
// Tiny DOM util
// --------------------------------------------
function el(tag, attrs = {}, children = []) {
  const n = document.createElement(typeof tag === 'string' ? tag : String(tag));
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else n.setAttribute(k, v);
  }
  (Array.isArray(children) ? children : [children]).forEach(c => c && n.appendChild(c));
  return n;
}

// Reusable: turn a File into a URL (server upload first, base64 fallback)
async function processImageFile(file) {
  const validation = ImageHandler.validateImage(file);
  if (!validation.valid) {
    const msg = validation.errors.join(', ');
    Utils.showToast(msg, 'error');
    throw new Error(msg);
  }

  try {
    const url = await ImageHandler.uploadToServer(file);
    Utils.showToast('Image uploaded to server successfully!', 'success');
    return url;
  } catch (uploadError) {
    console.warn('Server upload failed, falling back to base64:', uploadError);
    const url = await ImageHandler.compressImage(file);
    Utils.showToast('Image compressed (stored locally)', 'warning');
    return url;
  }
}

// --------------------------------------------
// IMAGE UPLOAD (server-first, base64 fallback)
// --------------------------------------------
function bindImageUpload() {
  const imageField   = Utils.q('#fld-image');
  const imagePreview = Utils.q('#image-preview');
  const uploadBtn    = Utils.q('#btn-upload-image');
  const fileInput    = Utils.q('#image-file-input');
  const clearBtn     = Utils.q('#btn-clear-image');           // NEW

  if (!uploadBtn || !fileInput) {
    console.warn('⚠️ Image upload elements not found');
    return;
  }

  uploadBtn.addEventListener('click', (e) => {
    e.preventDefault();
    fileInput.click();
  });

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      uploadBtn.textContent = '⏳ Uploading...';
      uploadBtn.disabled = true;

      const imageUrl = await processImageFile(file);

      imageField.value = imageUrl;
      if (imagePreview) {
        imagePreview.src = imageUrl;
        imagePreview.style.display = 'block';
      }
    } catch (error) {
      console.error('❌ Image upload error:', error);
      Utils.showToast(error.message || 'Failed to process image', 'error');
    } finally {
      uploadBtn.textContent = '📤 Upload New Image';
      uploadBtn.disabled = false;
      e.target.value = '';
    }
  });

// [PRIMARY CLEAR BTN] clear the primary image like gallery "Remove"
if (clearBtn && !clearBtn.dataset.bound) {
  clearBtn.addEventListener('click', (e) => {
    e.preventDefault();

    // Clear the input field (and keep DOM attribute in sync for devtools)
    if (imageField) {
      imageField.value = '';
      imageField.setAttribute('value', '');
    }

    // Hide preview
    if (imagePreview) {
      imagePreview.removeAttribute('src');
      imagePreview.style.display = 'none';
    }

    Utils.showToast('Primary image cleared', 'success');
  });
  clearBtn.dataset.bound = '1';
}


  if (imageField) {
    imageField.addEventListener('input', (e) => {
      const url = e.target.value.trim();
      if (!imagePreview) return;
      if (url) {
        imagePreview.src = url;
        imagePreview.style.display = 'block';
        imagePreview.onerror = () => { imagePreview.style.display = 'none'; };
      } else {
        imagePreview.style.display = 'none';
      }
    });
  }

  // Drag & drop on the main preview zone
  const dropZone = imagePreview?.closest('.image-preview-container');
  if (dropZone && !dropZone.dataset.dndBound) {
    const stop = (ev) => { ev.preventDefault(); ev.stopPropagation(); };

    ['dragenter','dragover'].forEach(evt => {
      dropZone.addEventListener(evt, (e) => { stop(e); dropZone.classList.add('drop-active'); });
    });
    ['dragleave','dragend','drop'].forEach(evt => {
      dropZone.addEventListener(evt, () => dropZone.classList.remove('drop-active'));
    });

    dropZone.addEventListener('drop', async (e) => {
      stop(e);
      const file = e.dataTransfer?.files?.[0];
      if (!file) return;
      try {
        uploadBtn.textContent = '⏳ Uploading...';
        uploadBtn.disabled = true;
        const imageUrl = await processImageFile(file);
        imageField.value = imageUrl;
        if (imagePreview) {
          imagePreview.src = imageUrl;
          imagePreview.style.display = 'block';
        }
      } catch (err) {
        console.error('Drop upload error:', err);
        Utils.showToast(err.message || 'Failed to process image', 'error');
      } finally {
        uploadBtn.textContent = '📤 Upload New Image';
        uploadBtn.disabled = false;
      }
    });

    // Click the preview area (image or empty) to open picker (keeps working after image loads)
    if (!dropZone.dataset.clickBound) {
      dropZone.addEventListener('click', (e) => {
        if (e.target.closest('button')) return; // floating button gets priority
        uploadBtn.click();
      });
      dropZone.dataset.clickBound = '1';
    }

    dropZone.dataset.dndBound = '1';
  }

  // Floating “re-upload” button in the preview (tiny overlay icon)
  const reup = document.getElementById('reupload-primary');
  if (reup && !reup.dataset.bound) {
    reup.addEventListener('click', (e) => {
      e.preventDefault();
      uploadBtn.click();
    });
    reup.dataset.bound = '1';
  }
}

// ============================================
// ADDITIONAL IMAGES – UI + LOGIC (single-or-both)
// ============================================
let GalleryUI = null;

function ensureGalleryUI() {
  // If refs already exist, re-query (in case panel re-rendered) and return
  if (GalleryUI) {
    const mk = (n) => ({
      wrap:   Utils.q(`#rw-gal${n}-wrap`),
      img:    Utils.q(`#rw-gal${n}-img`),
      url:    Utils.q(`#rw-gal${n}-url`),
      upload: Utils.q(`#rw-gal${n}-upload`),
      clear:  Utils.q(`#rw-gal${n}-clear`)
    });
    GalleryUI = {
      enabled: Utils.q('#rw-gal-enabled'),
      editBox: Utils.q('#rw-gal-editbox'),
      slot1:   mk(1),
      slot2:   mk(2)
    };
    return GalleryUI;
  }

  try {
    // 1) Find a safe insertion anchor (prefer after main image field container)
    const panel = document.getElementById('fpe-panel') || document.body;
    const fldImage = Utils.q('#fld-image');
    const fieldContainer =
      (fldImage && (fldImage.closest('.fpe-field') || fldImage.parentElement)) ||
      panel.querySelector('.fpe-section .sec-c') ||
      panel;

    // 2) If the block already exists, just build refs & return
    let block = document.getElementById('rw-gallery-block');
    if (!block) {
      const wrapper = document.createElement('div');
      wrapper.id = 'rw-gallery-block';
      wrapper.className = 'fpe-field';
      wrapper.innerHTML = `
        <label style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
          <input id="rw-gal-enabled" type="checkbox" class="fpe-checkbox">
          <span>Show/Hide Additional Images on Product Page</span>
        </label>

        <div id="rw-gal-editbox">
          <div class="fpe-inline" style="gap:0px; align-items:flex-start; width:100%;">
            <div class="fpe-field" style="flex:1">
              <div class="image-preview-container" id="rw-gal1-wrap" style="min-height:110px; flex:1; position:relative;">
                <img id="rw-gal1-img" alt="Gallery image 1"
                     style="display:none; max-width:100%; height:auto; border-radius:8px; border:2px solid #e5e7eb;">
                 
              </div>

              <div class="rw-slot">
  <div class="rw-url-wrap">
    <input id="rw-gal1-url" class="rw-url-input" type="text" placeholder="paste image URL">

  </div>
  <div class="rw-actions">
    <button id="rw-gal1-upload" type="button" class="button rw-icon" title="Upload"><span>📤 Upload New Image</span></button>
    <button id="rw-gal1-clear" type="button" class="button" title="Clear"><span>Remove</span></button>
  </div>
</div>


            </div>

            <div class="fpe-field" style="flex:1">
              <div class="image-preview-container" id="rw-gal2-wrap" style="min-height:110px; flex:1; position:relative;">
                <img id="rw-gal2-img" alt="Gallery image 2"
                     style="display:none; max-width:100%; height:auto; border-radius:8px; border:2px solid #e5e7eb;">
                
              </div>

              <div class="rw-slot">
  <div class="rw-url-wrap">
    <input id="rw-gal2-url" class="rw-url-input" type="text" placeholder="paste image URL">

  </div>
  <div class="rw-actions">
    <button id="rw-gal2-upload" type="button" class="button rw-icon" title="Upload"><span>📤 Upload New Image</span></button>
    <button id="rw-gal2-clear" type="button" class="button" title="Clear"><span>Remove</span></button>
  </div>
</div>


            </div>
          </div>

          <small style="color:#666; font-size:12px; display:block; margin-top:6px;">
            When enabled, 1 or 2 additional images can be shown. If only one URL is provided, only that image is shown.
          </small>
        </div>
      `;
      // Prefer: insert as the next sibling of the primary image field (inside the panel)
if (fieldContainer && fieldContainer.parentElement) {
  fieldContainer.parentElement.insertBefore(wrapper, fieldContainer.nextSibling);
} else if (panel) {
  // Fallback: append at the end of the panel
  panel.appendChild(wrapper);
}
      block = wrapper;
    }

    // 3) Build refs and assign BEFORE binding
    const mk = (n) => ({
      wrap:   Utils.q(`#rw-gal${n}-wrap`),
      img:    Utils.q(`#rw-gal${n}-img`),
      url:    Utils.q(`#rw-gal${n}-url`),
      upload: Utils.q(`#rw-gal${n}-upload`),
      clear:  Utils.q(`#rw-gal${n}-clear`)
    });

    GalleryUI = {
      enabled: Utils.q('#rw-gal-enabled'),
      editBox: Utils.q('#rw-gal-editbox'),
      slot1:   mk(1),
      slot2:   mk(2)
    };

    // 4) Bind once (idempotent via dataset flags)
    [GalleryUI.slot1, GalleryUI.slot2].forEach((slot, idx) => {
      if (!slot) return;

if (slot.url && !slot.url.dataset.bound) {
  const idxForProduct = idx; // 0 for first slot, 1 for second slot
  const handleInput = () => {
    const v = slot.url.value.trim();
    paintGallerySlot(slot, v);
    const pr = App.products[App.currentEditIndex];
    if (pr) writeGallerySlotToProduct(pr, idxForProduct, v);
  };
  slot.url.addEventListener('input', handleInput);
  slot.url.addEventListener('change', handleInput);
  slot.url.dataset.bound = '1';
}


if (slot.clear && !slot.clear.dataset.bound) {
  slot.clear.addEventListener('click', () => {
if (slot.url) {
  slot.url.value = '';
  slot.url.setAttribute('value', '');
}
paintGallerySlot(slot, '');
const pr = App.products[App.currentEditIndex];
if (pr) writeGallerySlotToProduct(pr, idx, '');

  });
  slot.clear.dataset.bound = '1';
}


if (slot.upload && !slot.upload.dataset.bound) {
  slot.upload.addEventListener('click', async () => {
    try {
      const url = await pickAndProcessImage();
if (url) {
  if (slot.url) {
    slot.url.value = url;
    slot.url.setAttribute('value', url);
  }
  paintGallerySlot(slot, url);
  const pr = App.products[App.currentEditIndex];
  if (pr) writeGallerySlotToProduct(pr, idx, url);
}

    } catch (err) {
      console.warn('[Gallery] upload failed:', err);
    }
  });
  slot.upload.dataset.bound = '1';
}


      // Drag & drop on each gallery slot
      if (slot.wrap && !slot.wrap.dataset.dndBound) {
        const dz = slot.wrap;
        const stop = (ev) => { ev.preventDefault(); ev.stopPropagation(); };

        ['dragenter','dragover'].forEach(evt => {
          dz.addEventListener(evt, (e) => { stop(e); dz.classList.add('drop-active'); });
        });
        ['dragleave','dragend','drop'].forEach(evt => {
          dz.addEventListener(evt, () => dz.classList.remove('drop-active'));
        });

dz.addEventListener('drop', async (e) => {
  stop(e);
  const file = e.dataTransfer?.files?.[0];
  if (!file) return;
  try {
    const url = await processImageFile(file);
if (url) {
  if (slot.url) {
    slot.url.value = url;
    slot.url.setAttribute('value', url);
  }
  paintGallerySlot(slot, url);
  const pr = App.products[App.currentEditIndex];
  if (pr) writeGallerySlotToProduct(pr, idx, url);
}



  } catch (err) {
    console.warn('[Gallery] drop failed:', err);
    Utils.showToast(err.message || 'Failed to process image', 'error');
  }
});


        // Floating re-upload button for each slot
        const reBtnId = idx === 0 ? 'rw-gal1-reupload' : 'rw-gal2-reupload';
        const reBtn = document.getElementById(reBtnId);
        if (reBtn && !reBtn.dataset.bound) {
          reBtn.addEventListener('click', (e) => {
            e.preventDefault();
            slot.upload?.click();
          });
          reBtn.dataset.bound = '1';
        }

        // Click empty area of slot to open picker (works with/without image)
        if (!dz.dataset.clickBound) {
          dz.addEventListener('click', (e) => {
            if (e.target.closest('button')) return; // let the button handle
            slot.upload?.click();
          });
          dz.dataset.clickBound = '1';
        }

        slot.wrap.dataset.dndBound = '1';
      }
    });

    if (GalleryUI.enabled && !GalleryUI.enabled.dataset.bound) {
      GalleryUI.enabled.addEventListener('change', () => {
        if (GalleryUI.editBox) {
          GalleryUI.editBox.style.display = GalleryUI.enabled.checked ? 'block' : 'none';
        }
      });
      GalleryUI.enabled.dataset.bound = '1';
    }

    return GalleryUI;
  } catch (e) {
    console.warn('[RapidWoo] ensureGalleryUI error (non-fatal):', e);
    const dummy = {
      enabled: { checked: false },
      editBox: null,
      slot1: { wrap:null,img:null,url:{value:''},upload:{},clear:{} },
      slot2: { wrap:null,img:null,url:{value:''},upload:{},clear:{} }
    };
    GalleryUI = dummy;
    return dummy;
  }
}

function paintGallerySlot(slotEl, url) {
  if (!slotEl) return;

  if (slotEl.wrap) {
    slotEl.wrap.classList.remove('hidden-slot', 'shown-slot', 'debug-slot');
    slotEl.wrap.removeAttribute('data-state');
  }

  if (slotEl.url) {
    const v = url || '';
    slotEl.url.value = v;                 // UI value
    slotEl.url.setAttribute('value', v);  // attribute (shows up in DevTools markup)
  }

  if (slotEl.img) {
    if (url) {
      slotEl.img.src = url;
      slotEl.img.style.display = 'block';
      slotEl.img.removeAttribute('aria-hidden');
    } else {
      slotEl.img.removeAttribute('src');
      slotEl.img.style.display = 'none';
      slotEl.img.setAttribute('aria-hidden', 'true');
    }
  }
}


async function pickAndProcessImage() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      try {
        const f = input.files && input.files[0];
        if (!f) return reject(new Error('No file selected'));

        const validation = ImageHandler.validateImage(f);
        if (!validation.valid) {
          Utils.showToast(validation.errors.join(', '), 'error');
          return reject(new Error('Invalid image'));
        }

        try {
          const url = await ImageHandler.uploadToServer(f);
          Utils.showToast('Image uploaded to server successfully!', 'success');
          resolve(url);
        } catch {
          const url = await ImageHandler.compressImage(f);
          Utils.showToast('Image compressed (stored locally)', 'warning');
          resolve(url);
        }
      } catch (e) { reject(e); }
    };
    input.click();
    setTimeout(() => reject(new Error('Picker timeout')), 60000);
  });
}


// --- begin: gallery write helpers ---
function _ensureTwoGallerySlots(p) {
  if (!Array.isArray(p.gallery)) p.gallery = [{ url: '' }, { url: '' }];
  if (p.gallery.length < 2) {
    p.gallery = [
      { url: (p.gallery[0]?.url || '') },
      { url: (p.gallery[1]?.url || '') }
    ];
  }
  if (!('extra_images_enabled' in p)) p.extra_images_enabled = false;
}

function writeGallerySlotToProduct(p, slotIndex, url) {
  if (!p) return;
  _ensureTwoGallerySlots(p);
  const u = (url || '').trim();
  p.gallery[slotIndex] = { url: u };

  // Mark enabled if any gallery URL exists (UI toggle can still disable store-wide display)
  const hasAny = !!(p.gallery[0]?.url || p.gallery[1]?.url);
  if (hasAny && p.extra_images_enabled === undefined) {
    p.extra_images_enabled = true;
  }

  // Keep images[] synced (non-base64, no dupes, exclude primary)
  const isData = (s) => typeof s === 'string' && s.startsWith('data:image/');
  const extras = [p.gallery[0]?.url || '', p.gallery[1]?.url || '']
    .filter(Boolean)
    .filter(u => !isData(u));
  const seen = new Set();
  p.images = extras
    .filter(u => (u && u !== p.image))
    .filter(u => (seen.has(u) ? false : (seen.add(u), true)));
}
// --- end: gallery write helpers ---


// ============================================
// PRODUCT NORMALIZATION (keeps gallery + strips base64 from storage)
// ============================================
function toStringImages(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(asStr).filter(Boolean);
}

/**
 * Normalize a single product:
 * - Canonical gallery = exactly 2 slots: [{url:''},{url:''}]
 * - extra_images_enabled: explicit wins, else inferred by gallery content
 * - images[]: **no base64** (safe for Snipcart/storage)
 * - primary image fallback + de-dup with images[]
 */
function normalizeProduct(p) {
  if (!p || typeof p !== 'object') return p;

  // Canonical gallery (preserve empties)
  const g = Array.isArray(p.gallery) ? p.gallery : [];
  const url1 = (g[0] && isStr(g[0].url)) ? g[0].url.trim() : '';
  const url2 = (g[1] && isStr(g[1].url)) ? g[1].url.trim() : '';
  p.gallery = [{ url: url1 }, { url: url2 }];

  // Flag: explicit wins; otherwise inferred
  const inferredEnabled = !!(url1 || url2);
  p.extra_images_enabled = (typeof p.extra_images_enabled === 'boolean')
    ? p.extra_images_enabled
    : inferredEnabled;

  // images[] should NEVER contain base64 (storage + Snipcart safety)
  const legacy = toStringImages(p.images);
  const cleaned = [url1, url2, ...legacy]
    .filter(Boolean)
    .filter(u => !isDataUrl(u));

  // keep unique
  const seen = new Set();
  p.images = cleaned.filter(u => (seen.has(u) ? false : (seen.add(u), true)));

  // primary fallback + de-dup
  if (!p.image || !p.image.trim()) {
    p.image = url1 || url2 || p.image || '';
  }
  // Make sure primary is not base64
  if (isDataUrl(p.image)) {
    p.image = p.images.find(u => u && !isDataUrl(u)) || '';
  }
  p.images = p.images.filter(src => src && src !== p.image);

  // Essentials
  p.title = p.title || 'Untitled Product';
  p.id = p.id || Date.now() + Math.floor(Math.random() * 1000);

  return p;
}
function normalizeAllProducts(list) {
  return Array.isArray(list) ? list.map(normalizeProduct) : [];
}

/**
 * For UI previews (editor/shop modal), prefer gallery (0/1/2),
 * fall back to legacy images[]. This can include base64 because
 * it only paints the current page (we never store base64 in images[]).
 */
function getVisibleGalleryUrls(product) {
  // Only show extras if the feature is enabled
  if (!product || !product.extra_images_enabled) return [];

  const fromGallery = Array.isArray(product.gallery)
    ? product.gallery.map(g => (g && g.url) ? g.url : '').filter(Boolean)
    : [];
  if (fromGallery.length) return fromGallery;

  // Fallback (defensive): legacy images[] if present
  const imgs = Array.isArray(product.images) ? product.images : [];
  return imgs.map(asStr).filter(Boolean);
}


// --- Price parsing (handles "$", commas, spaces, etc.) ---
function pickPriceNumber(p) {
  const tryParse = (v) => {
    if (v == null) return null;
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string') {
      const s = v.trim().replace(/[^0-9.\-]/g, ''); // strip $, commas, spaces, currency
      if (!s) return null;
      const n = parseFloat(s);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };
  // priority: sale → price → regular
  return tryParse(p?.sale_price) ?? tryParse(p?.price) ?? tryParse(p?.regular_price) ?? 0;
}

// --------------------------------------------
// Global Shop Display Prefs (persisted)
// --------------------------------------------
const SHOP_PREFS_KEY = 'fpe.shop.prefs';
function getShopPrefs() {
  try {
    return JSON.parse(localStorage.getItem(SHOP_PREFS_KEY) || 'null') || {
      title: true,
      price: true,
      description: true,
      stock: true,
      add: true
    };
  } catch {
    return { title: true, price: true, description: true, stock: true, add: true };
  }
}
function saveShopPrefs(prefs) {
  try { localStorage.setItem(SHOP_PREFS_KEY, JSON.stringify(prefs)); } catch {}
}
function prefsFromToggles(tTitle, tPrice, tDesc, tStock, tAdd) {
  return {
    title: !!tTitle?.checked,
    price: !!tPrice?.checked,
    description: !!tDesc?.checked,
    stock: !!tStock?.checked,
    add: !!tAdd?.checked
  };
}
// Apply prefs to elements inside the modal grid (pv-*), to generic classes used on shop pages,
// and to native classes that already exist in shop markup (.stock-badge, .add-btn).
function applyPrefsToGrid(grid, prefs) {
  if (!grid) return;
  const showTitle = prefs.title !== false;
  const showPrice = prefs.price !== false;
  const showDesc  = prefs.description !== false;
  const showStock = prefs.stock !== false;
  const showAdd   = prefs.add !== false;

  const setDisplay = (selector, show) => {
    const roots = grid ? [grid, document] : [document];
    roots.forEach(root => {
      root.querySelectorAll(selector).forEach(n => { n.style.display = show ? '' : 'none'; });
    });
  };

  setDisplay('.pv-title, .shop-product-title, .product-title', showTitle);
  setDisplay('.pv-price, .shop-product-price, .product-price', showPrice);
  setDisplay('.pv-desc,  .shop-product-description, .product-description', showDesc);

  // Stock badge and Add button
  setDisplay('.shop-product-stock, .product-stock, .stock-badge', showStock);
  setDisplay('.shop-product-add, .product-add, .add-btn', showAdd);
}

// ============================================
// DATA LOADING
// ============================================
async function loadDemoFromFile() {
  try {
    const res = await fetch(window.RapidWoo.Config.API.PRODUCTS_JSON, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return Array.isArray(json.products) ? json.products : [];
  } catch (err) {
    console.error('[editor] Failed to load /demo/products.json:', err);
    return [];
  }
}

/**
 * Preferred loader:
 * 1) If LocalStorage has a saved object with a products array (even empty), use it.
 * 2) Otherwise (first run), load demo file.
 */
async function loadSavedOrDemo() {
  try {
    const saved = await Storage.getProducts(); // { products: [...] } or null
    if (saved && Array.isArray(saved.products)) {
      return normalizeAllProducts(saved.products);
    }
  } catch (e) {
    console.warn('[editor] Saved data was unreadable, falling back to demo:', e);
  }
  const demo = await loadDemoFromFile();
  return normalizeAllProducts(demo);
}

// ============================================
// INITIALIZATION (load saved first; fallback to file)
// ============================================
async function init() {
  console.log('🚀 Initializing RapidWoo Editor…');

  // ✅ Use saved dataset if present (even empty by design). Only load demo on true first run.
  App.products = await loadSavedOrDemo();

  // 1) Initial table render
  renderTable();

  // 2) Column visibility
  const colState = getColumnState();
  reflectColumnCheckboxes(colState);
  applyColumnVisibility(colState);

  // Bind handlers
  bindToolbar();
  bindTableToggles();
  bindPanel();
  bindModals();
  bindBulkActions();

  Utils.initMobileMenu();
  bindImageUpload();

  // Build gallery UI once (safe no-op if panel not yet visible)
  ensureGalleryUI();

  console.log('✅ Editor initialized with', App.products.length, 'product(s). Source:',
    (await Storage.getProducts())?.products !== undefined ? 'saved' : 'demo');
}

// ============================================
// STORAGE SAVE (normalize first; strips base64)
// ============================================
function safeSaveProducts() {
  try {
    // Ensure normalized (base64-free in images[]/image)
    const clean = normalizeAllProducts(App.products.map(p => ({ ...p })));
    Storage.saveProducts({ products: clean });
  } catch (err) {
    console.error('saveProducts failed:', err);
    Utils.showToast(
      'Could not save products (likely storage quota). Try removing very large images or reducing image size.',
      'error',
      'Save Failed'
    );
  }
}

// ============================================
// TOOLBAR ACTIONS
// ============================================
function bindToolbar() {
  // 🔄 Reload from /demo/products.json (explicit user action)
  Utils.q('#btn-load-demo').addEventListener('click', async () => {
    const confirmed = await Utils.showConfirm(
      'Reload the demo products from /demo/products.json? This will replace your current working set in the editor (you can import/export JSON anytime).',
      'Load Demo Products'
    );
    if (!confirmed) return;

    const fileProducts = await loadDemoFromFile();
    App.products = normalizeAllProducts(fileProducts);
    safeSaveProducts(); // persist the new working set so it sticks
    renderTable();
    Utils.showToast('Demo products loaded from /demo/products.json', 'success');
  });

  // View Shop button (persist first so standalone /shop.html sees edits)
  Utils.q('#btn-view-shop').addEventListener('click', () => {
    safeSaveProducts();
    window.open('/shop.html', '_blank');
  });

  // Live shop modal (persist first)
  Utils.q('#btn-view-live-shop').addEventListener('click', () => {
    safeSaveProducts();
    openShopModal();
  });

  // Import JSON (replaces App.products; still normalized)
  Utils.q('#file-import').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await Storage.importJSON(file);
      App.products = normalizeAllProducts(data.products || []);
      safeSaveProducts(); // persist imported dataset immediately
      renderTable();
      Utils.showToast(`Imported ${App.products.length} product(s) successfully`, 'success');
    } catch (error) {
      Utils.showToast(error.message, 'error', 'Import Failed');
    }
    e.target.value = '';
  });

  // Export JSON (saves the in-memory App.products)
  Utils.q('#btn-download').addEventListener('click', () => {
    Storage.exportJSON({ products: App.products });
    Utils.showToast('Products exported successfully', 'success');
  });

  // Add product
  Utils.q('#btn-add').addEventListener('click', addProduct);
}

// ============================================
// TABLE RENDERING
// ============================================
function renderTable() {
  const tbody = Utils.q('#fpe-tbody');
  tbody.innerHTML = '';

  App.products.forEach((product, index) => {
    const tr = document.createElement('tr');
    const isSelected = App.selectedIds.has(product.id);
    const theHidden   = product.hidden === true;

    if (isSelected) tr.classList.add('selected');
    if (theHidden)   tr.classList.add('hidden-product');

tr.innerHTML = `
  <td>
    <input type="checkbox"
           class="fpe-checkbox row-select"
           data-id="${product.id}"
           ${isSelected ? 'checked' : ''}>
  </td>
  <td data-col="image">
    <img class="fpe-thumb"
         src="${product.image || ''}"
         onerror="this.style.background='#ddd'">
    ${theHidden ? '<div style="font-size:10px;color:#999;margin-top:2px">Hidden</div>' : ''}
  </td>
  <td data-col="edit" style="text-align:center;">
    <button class="fpe-icon-btn" title="Edit" data-idx="${index}" data-action="edit">✏️</button>
  </td>
  <td data-col="preview" style="text-align:center;">
    <button class="fpe-icon-btn" title="Preview" data-idx="${index}" data-action="preview">👁️</button>
  </td>
  <td data-col="name">
    <div contenteditable="true"
         class="fpe-cell-edit"
         data-field="title"
         data-idx="${index}">${product.title || ''}</div>
  </td>
  <td data-col="sku"
      contenteditable="true"
      class="fpe-cell-edit"
      data-field="sku"
      data-idx="${index}">${product.sku || ''}</td>
  <td data-col="stock">
    <select class="fpe-select" data-field="stock_status" data-idx="${index}">
      <option value="instock"${product.stock_status === 'instock' ? ' selected' : ''}>In stock</option>
      <option value="outofstock"${product.stock_status === 'outofstock' ? ' selected' : ''}>Out of stock</option>
      <option value="onbackorder"${product.stock_status === 'onbackorder' ? ' selected' : ''}>On backorder</option>
    </select>
  </td>
  <td data-col="price"
      contenteditable="true"
      class="fpe-cell-edit"
      data-field="regular_price"
      data-idx="${index}">${product.regular_price || ''}</td>
  <td data-col="categories"
      contenteditable="true"
      class="fpe-cell-edit"
      data-field="categories"
      data-idx="${index}">${(product.categories || []).join(', ')}</td>
  <td data-col="tags"
      contenteditable="true"
      class="fpe-cell-edit"
      data-field="tags"
      data-idx="${index}">${(product.tags || []).join(', ')}</td>
  <td data-col="actions">
    <div class="fpe-row-actions">
      <button class="button" data-action="duplicate" data-idx="${index}">Duplicate</button>
      <button class="button button-danger" data-action="delete" data-idx="${index}">Delete</button>
    </div>
  </td>
`;

    tbody.appendChild(tr);
  });

  bindTableEvents(tbody);
  updateBulkBar();
  applyColumnVisibility(getColumnState());
}

function bindTableEvents(tbody) {
  Utils.qa('button[data-action="edit"]', tbody).forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = Number(e.currentTarget.dataset.idx);
      openPanel(index);
    });
  });

  Utils.qa('button[data-action="preview"]', tbody).forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = Number(e.currentTarget.dataset.idx);
      openProductModal(index);
    });
  });

  Utils.qa('button[data-action="duplicate"]', tbody).forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = Number(e.currentTarget.dataset.idx);
      duplicateProduct(index);
    });
  });

  Utils.qa('button[data-action="delete"]', tbody).forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const index = Number(e.currentTarget.dataset.idx);
      await deleteProduct(index);
    });
  });

  Utils.qa('.fpe-cell-edit[contenteditable="true"]', tbody).forEach(cell => {
    cell.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); cell.blur(); }
    });

    cell.addEventListener('blur', () => {
      const index = Number(cell.dataset.idx);
      const field = cell.dataset.field;
      const value = cell.textContent.trim();

      if (field === 'categories' || field === 'tags') {
        App.products[index][field] = value ? value.split(',').map(s => s.trim()).filter(Boolean) : [];
      } else {
        App.products[index][field] = value;
      }
      safeSaveProducts();
    });
  });

  Utils.qa('select.fpe-select', tbody).forEach(select => {
    select.addEventListener('change', (e) => {
      const index = Number(e.currentTarget.dataset.idx);
      const field = e.currentTarget.dataset.field;
      App.products[index][field] = e.currentTarget.value;
      safeSaveProducts();
    });
  });

  Utils.qa('.row-select', tbody).forEach(cb => {
    cb.addEventListener('change', (e) => {
      const id = Number(e.target.dataset.id);
      if (e.target.checked) App.selectedIds.add(id); else App.selectedIds.delete(id);
      updateBulkBar();
      renderTable();
    });
  });
}

// ============================================
// PRODUCT ACTIONS
// ============================================
function addProduct() {
  const newProduct = JSON.parse(JSON.stringify(Config.DEFAULTS.PRODUCT));
  newProduct.id = Date.now();
  newProduct.title = 'New Product';
  normalizeProduct(newProduct);

  App.products.unshift(newProduct);
  safeSaveProducts();
  renderTable();
  Utils.showToast('New product added', 'success');
}

function duplicateProduct(index) {
  const original = App.products[index];
  const copy = JSON.parse(JSON.stringify(original));
  copy.id = Date.now();
  copy.slug = original.slug ? original.slug + '-copy' : '';
  copy.title = original.title + ' (Copy)';
  normalizeProduct(copy);

  App.products.splice(index + 1, 0, copy);
  safeSaveProducts();
  renderTable();
  Utils.showToast(`"${original.title}" duplicated successfully`, 'success');
}

async function deleteProduct(index) {
  const product = App.products[index];
  const confirmed = await Utils.showConfirm(
    `Are you sure you want to delete "${product.title}"? This action cannot be undone.`,
    'Delete Product'
  );

  if (!confirmed) return;

  App.products.splice(index, 1);
  safeSaveProducts();
  renderTable();
  Utils.showToast(`"${product.title}" deleted successfully`, 'success');
}

// ============================================
// BULK ACTIONS
// ============================================
function bindBulkActions() {
  Utils.q('#select-all').addEventListener('change', (e) => {
    App.selectedIds.clear();
    if (e.target.checked) {
      App.products.forEach(p => App.selectedIds.add(p.id));
    }
    renderTable();
  });

  Utils.q('#bulk-select-all').addEventListener('change', (e) => {
    App.selectedIds.clear();
    if (e.target.checked) {
      App.products.forEach(p => App.selectedIds.add(p.id));
    }
    renderTable();
  });

  Utils.q('#apply-bulk').addEventListener('click', async () => {
    const action = Utils.q('#bulk-action').value;

    if (!action) {
      Utils.showToast('Please select a bulk action', 'warning');
      return;
    }
    if (App.selectedIds.size === 0) {
      Utils.showToast('Please select at least one product', 'warning');
      return;
    }

    const count = App.selectedIds.size;

    if (action === 'delete') {
      const confirmed = await Utils.showConfirm(
        `Are you sure you want to delete ${count} product${count > 1 ? 's' : ''}?`,
        'Delete Products'
      );
      if (!confirmed) return;

      App.products = App.products.filter(p => !App.selectedIds.has(p.id));
      Utils.showToast(`${count} product${count > 1 ? 's' : ''} deleted`, 'success');
    } else if (action === 'hide') {
      App.products.forEach(p => { if (App.selectedIds.has(p.id)) p.hidden = true; });
      Utils.showToast(`${count} product${count > 1 ? 's' : ''} hidden from shop`, 'success');
    } else if (action === 'unhide') {
      App.products.forEach(p => { if (App.selectedIds.has(p.id)) p.hidden = false; });
      Utils.showToast(`${count} product${count > 1 ? 's' : ''} now visible`, 'success');
    }

    App.selectedIds.clear();
    safeSaveProducts();
    renderTable();
    Utils.q('#bulk-action').value = '';
  });
}
function updateBulkBar() {
  const allSelected = App.products.length > 0 &&
                      App.selectedIds.size === App.products.length;
  Utils.q('#select-all').checked = allSelected;
  Utils.q('#bulk-select-all').checked = allSelected;
}

// ============================================
// SIDE PANEL
// ============================================
function bindPanel() {
  Utils.q('#fpe-close').addEventListener('click', closePanel);
  Utils.q('#fpe-cancel').addEventListener('click', closePanel);
  Utils.q('#fpe-apply').addEventListener('click', applyPanel);
    Utils.q('#fpe-save-top').addEventListener('click', applyPanel); // NEW LINE

  // Collapsible sections
  Utils.qa('.fpe-section .sec-h').forEach(header => {
    header.addEventListener('click', () => {
      header.parentElement.classList.toggle('open');
    });
  });

  // ESC to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePanel();
  });
}


// ===== Full-screen editor toggle (panel) =====


/**
 * Open the side editor panel for a product.
 * Paints RAW gallery values (product.gallery) so slots don't shift.
 */
function openPanel(index) {
  try {
    App.currentEditIndex = index;
    const product = App.products[index] || {};

    const setInputValue = (sel, val = '') => { const el = Utils.q(sel); if (el) el.value = val; return el; };

    // Basic fields
    setInputValue('#fld-title', product.title || '');
    setInputValue('#fld-slug',  product.slug  || '');
    setInputValue('#fld-sku',   product.sku   || '');
    setInputValue('#fld-image', product.image || '');

    const imagePreview = Utils.q('#image-preview');
    if (imagePreview) {
      if (product.image) {
        imagePreview.src = product.image;
        imagePreview.style.display = 'block';
        imagePreview.onerror = () => { imagePreview.style.display = 'none'; };
      } else {
        imagePreview.style.display = 'none';
      }
    }

// Enable/disable the Remove button depending on whether a primary image exists
const clearBtn = Utils.q('#btn-clear-image');
if (clearBtn) clearBtn.disabled = !(product.image && product.image.trim());

    setInputValue('#fld-short', product.short_description || '');
    setInputValue('#fld-desc', (product.description || '').replace(/<[^>]+>/g, ''));
    setInputValue('#fld-reg',  product.regular_price || '');
    setInputValue('#fld-sale', product.sale_price    || '');

    // VARIABLE: load fields (Woo-style)
    setInputValue('#fld-type', (product.type === 'variable') ? 'variable' : 'simple');

    const attrName = (product.attributes && Object.keys(product.attributes)[0]) || 'Size';
    const attrOpts = (product.attributes && product.attributes[attrName]) || [];
    setInputValue('#fld-attr-name', attrName);

    // Try to match a preset; if none, set to custom and fill the text field
    (function syncPresetAndOptions() {
      const presetEl = Utils.q('#fld-attr-preset');
      const optsText = Array.isArray(attrOpts) ? attrOpts.join(', ') : '';
      setInputValue('#fld-attr-options', optsText);

      if (!presetEl) return;
      const s = (optsText || '').replace(/\s+/g,'');
      if (s === 'S,M,L,XL') presetEl.value = 'S,M,L,XL';
      else if (s === 'XS,S,M,L,XL,XXL,3XL') presetEl.value = 'XS,S,M,L,XL,XXL,3XL';
      else if (s === '28,30,32,34,36,38') presetEl.value = '28,30,32,34,36,38';
      else presetEl.value = 'custom';
    })();

    // Show variations area for variable products
    const varWrap = Utils.q('#var-wrap');
    if (varWrap) varWrap.style.display = (product.type === 'variable') ? '' : 'none';

    // Render table rows (from existing variations or from options)
    (function renderVariationsUI(){
      const tbody = Utils.q('#var-tbody');
      if (!tbody) return;
      tbody.innerHTML = '';

      const sizes = Array.isArray(attrOpts) ? attrOpts : [];
      const rows = Array.isArray(product.variations) && product.variations.length
        ? product.variations
        : sizes.map((opt, idx) => ({
            id: Number(`${product.id || Date.now()}${idx+1}`),
            sku: product.sku ? `${product.sku}-${opt}` : `SKU-${opt}`,
            attributes: { [attrName]: opt },
            regular_price: product.regular_price || '',
            sale_price: product.sale_price || '',
            stock_status: product.stock_status || 'instock'
          }));

      rows.forEach(v => {
        // Compute display values:
        const baseReg  = Number(product.regular_price);
        const baseSale = Number(product.sale_price);
        const hasBaseReg  = Number.isFinite(baseReg)  && baseReg  > 0;
        const hasBaseSale = Number.isFinite(baseSale) && baseSale > 0;

        const cleanDelta = (d) => {
          if (d == null) return 0;
          const n = Number(String(d).replace(/[^0-9.\-]/g,''));
          return Number.isFinite(n) ? n : 0;
        };
        const delta = cleanDelta(v.price_delta);

        // Prefer variation’s own prices; else compute from base ± delta
        const varRegNum  = Number(v.regular_price);
        const varSaleNum = Number(v.sale_price);
        const hasVarReg  = Number.isFinite(varRegNum)  && varRegNum  > 0;
        const hasVarSale = Number.isFinite(varSaleNum) && varSaleNum > 0;

        const regValue  = hasVarReg  ? varRegNum.toFixed(2)
                         : hasBaseReg ? (baseReg + delta).toFixed(2) : '';
        const saleValue = hasVarSale ? varSaleNum.toFixed(2)
                         : hasBaseSale ? (baseSale + delta).toFixed(2) : '';

        const regPlaceholder  = hasBaseReg  ? baseReg.toFixed(2)  : '';
        const salePlaceholder = hasBaseSale ? baseSale.toFixed(2) : '';

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="padding:6px 8px;"><input class="var-size" type="text" value="${v.attributes?.[attrName] || ''}"></td>
          <td style="padding:6px 8px;"><input class="var-sku" type="text" value="${v.sku || ''}"></td>
          <td style="padding:6px 8px;"><input class="var-reg"  type="number" step="0.01" value="${regValue}"  placeholder="${regPlaceholder}"></td>
          <td style="padding:6px 8px;"><input class="var-sale" type="number" step="0.01" value="${saleValue}" placeholder="${salePlaceholder}"></td>
          <td style="padding:6px 8px;">
            <select class="var-stock">
              <option value="instock"${(v.stock_status||'instock')==='instock'?' selected':''}>In stock</option>
              <option value="onbackorder"${(v.stock_status)==='onbackorder'?' selected':''}>On backorder</option>
              <option value="outofstock"${(v.stock_status)==='outofstock'?' selected':''}>Out of stock</option>
            </select>
          </td>
          <td style="padding:6px 8px;"><button class="var-remove button">✕</button></td>
        `;
        tbody.appendChild(tr);
      });

      Utils.qa('.var-remove', tbody).forEach(btn=>{
        btn.addEventListener('click', () => btn.closest('tr')?.remove());
      });
    })();

    // Preset → fill the options text automatically
    Utils.q('#fld-attr-preset')?.addEventListener('change', () => {
      const preset = Utils.q('#fld-attr-preset').value;
      if (preset !== 'custom') {
        Utils.q('#fld-attr-options').value = preset;
      }
    });

    // Generate variations from Attribute Options
    Utils.q('#btn-generate-vars')?.addEventListener('click', () => {
      const attrName2 = (Utils.q('#fld-attr-name')?.value || 'Size').trim();
      const opts = (Utils.q('#fld-attr-options')?.value || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const tbody = Utils.q('#var-tbody');
      const wrap = Utils.q('#var-wrap');
      if (!tbody) return;

      tbody.innerHTML = '';
      if (wrap) wrap.style.display = (Utils.q('#fld-type')?.value === 'variable') ? '' : 'none';

      opts.forEach((opt) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="padding:6px 8px;"><input class="var-size" type="text" value="${opt}"></td>
          <td style="padding:6px 8px;"><input class="var-sku" type="text" value=""></td>
          <td style="padding:6px 8px;"><input class="var-reg" type="number" step="0.01" value="" placeholder="${Utils.q('#fld-reg')?.value || ''}"></td>
          <td style="padding:6px 8px;"><input class="var-sale" type="number" step="0.01" value="" placeholder="${Utils.q('#fld-sale')?.value || ''}"></td>
          <td style="padding:6px 8px;">
            <select class="var-stock">
              <option value="instock" selected>In stock</option>
              <option value="onbackorder">On backorder</option>
              <option value="outofstock">Out of stock</option>
            </select>
          </td>
          <td style="padding:6px 8px;"><button class="var-remove button">✕</button></td>
        `;
        tbody.appendChild(tr);
      });

      Utils.qa('.var-remove', tbody).forEach(btn=>{
        btn.addEventListener('click', () => btn.closest('tr')?.remove());
      });
    });

    // Generate SKUs (unique): baseSKU-size, de-dupe with -2, -3, …
    Utils.q('#btn-generate-skus')?.addEventListener('click', () => {
      const base = (Utils.q('#fld-sku')?.value || '').trim() || 'SKU';
      const tbody = Utils.q('#var-tbody');
      if (!tbody) return;

      const used = new Set();
      Utils.qa('tr', tbody).forEach(tr => {
        const size = tr.querySelector('.var-size')?.value?.trim() || '';
        if (!size) return;
        let candidate = `${base}-${size}`;
        let n = 2;
        while (used.has(candidate)) {
          candidate = `${base}-${size}-${n++}`;
        }
        used.add(candidate);
        const skuEl = tr.querySelector('.var-sku');
        if (skuEl && !skuEl.value) skuEl.value = candidate;
      });
    });

    // Toggle table when switching type
    Utils.q('#fld-type')?.addEventListener('change', () => {
      const wrap = Utils.q('#var-wrap');
      if (wrap) wrap.style.display = (Utils.q('#fld-type')?.value === 'variable') ? '' : 'none';
    });

    setInputValue('#fld-stock-status', product.stock_status || 'instock');
    setInputValue('#fld-stock-qty',    product.stock_quantity || '');
    setInputValue('#fld-manage',   String(!!product.manage_stock));
    setInputValue('#fld-featured', String(!!product.featured));
    setInputValue('#fld-sold',     String(!!product.sold_individually));
    setInputValue('#fld-weight',     product.weight || '');
    setInputValue('#fld-ship-class', product.shipping_class || '');
    setInputValue('#fld-l', product.dimensions?.length || '');
    setInputValue('#fld-w', product.dimensions?.width  || '');
    setInputValue('#fld-h', product.dimensions?.height || '');
    setInputValue('#fld-cats', (product.categories || []).join(', '));
    setInputValue('#fld-tags', (product.tags || []).join(', '));

    // Additional images: paint strictly from gallery only
// Additional images: prefer gallery[0..1]; fallback to images[] (excluding primary)
const ui = ensureGalleryUI();
if (ui && ui.slot1 && ui.slot2) {
  const g = Array.isArray(product.gallery) ? product.gallery : [];
  let urlA = (g[0] && isStr(g[0].url)) ? g[0].url.trim() : '';
  let urlB = (g[1] && isStr(g[1].url)) ? g[1].url.trim() : '';

  // Fallback: use images[] if gallery is empty
  if (!urlA && !urlB) {
    const fromImages = toStringImages(product.images)
      .filter(u => u && u !== product.image); // don’t repeat the main image
    urlA = fromImages[0] || '';
    urlB = fromImages[1] || '';
  }

  // Default ON when any extra URL exists, unless explicitly disabled
  const hasUrls = !!(urlA || urlB);
  const enabled = (product.extra_images_enabled !== false) && hasUrls;

  // Reflect checkbox, but ALWAYS show the edit box so users can paste URLs
  if (ui.enabled) ui.enabled.checked = enabled;
  if (ui.editBox) ui.editBox.style.display = 'block';

  paintGallerySlot(ui.slot1, urlA);
  paintGallerySlot(ui.slot2, urlB);

  // Keep the URL input fields visually in sync
// Keep the URL input fields visually + attribute in sync
if (ui.slot1?.url) {
  ui.slot1.url.value = urlA || '';
  ui.slot1.url.setAttribute('value', urlA || '');
}
if (ui.slot2?.url) {
  ui.slot2.url.value = urlB || '';
  ui.slot2.url.setAttribute('value', urlB || '');
}

}



// NEW: open as full-screen slide-out + lock page scroll + ARIA
const panel = Utils.q('#fpe-panel');
if (panel) {
  panel.classList.add('open');
  panel.setAttribute('aria-hidden', 'false');
}
showPanelBackdrop(true);
document.body.classList.add('fpe-lock');

  } catch (err) {
    console.error('[openPanel] error:', err);
    Utils?.showToast?.(`Could not open panel: ${err.message || 'Unknown error'}`, 'error');
  }
}

function closePanel() {
  const panel = Utils.q('#fpe-panel');
  if (panel) {
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
  }
  showPanelBackdrop(false);

  // Always clear locks / legacy classes
  document.body.classList.remove('fpe-full', 'fpe-lock');

  App.currentEditIndex = -1;
}


function applyPanel() {
  if (App.currentEditIndex < 0) return;
  const product = App.products[App.currentEditIndex];

  product.title = Utils.q('#fld-title').value.trim();
  product.slug = Utils.q('#fld-slug').value.trim() || Utils.slugify(product.title);
  product.sku = Utils.q('#fld-sku').value.trim();
  product.image = Utils.q('#fld-image').value.trim();
  product.short_description = Utils.q('#fld-short').value;

  const desc = Utils.q('#fld-desc').value.trim();
  product.description = desc ? `<p>${desc.replace(/\n/g, '</p><p>')}</p>` : '';

  const regPrice = Utils.q('#fld-reg').value;
  const salePrice = Utils.q('#fld-sale').value;
  product.regular_price = regPrice ? Number(regPrice).toFixed(2) : '';
  product.sale_price = salePrice ? Number(salePrice).toFixed(2) : '';
  product.price = product.sale_price || product.regular_price || '';

  // VARIABLE: save fields
  const _typeEl = Utils.q('#fld-type');
  product.type = (_typeEl && _typeEl.value === 'variable') ? 'variable' : 'simple';

  if (product.type === 'variable') {
    const attrName = (Utils.q('#fld-attr-name')?.value || 'Size').trim();

    // 1) Read the table rows as the source of truth
    const tbody = Utils.q('#var-tbody');
    const rows  = tbody ? Array.from(tbody.querySelectorAll('tr')) : [];

    // If no rows yet, derive from options input (for first-time generation)
    if (!rows.length) {
      const attrOptions = (Utils.q('#fld-attr-options')?.value || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      product.attributes = { [attrName]: attrOptions };
      const baseId = String(product.id || Date.now());
      product.variations = attrOptions.map((opt, idx) => ({
        id: Number(baseId + String(idx + 1)),
        sku: product.sku ? `${product.sku}-${opt}` : `SKU-${opt}`,
        attributes: { [attrName]: opt },
        regular_price: product.regular_price || '',
        sale_price: product.sale_price || '',
        stock_status: product.stock_status || 'instock'
      }));
    } else {
      // 2) Build attributes and variations from the table
      const sizes = [];
      const variations = [];

      const baseSale = Number(product.sale_price);
      const baseReg  = Number(product.regular_price);
      const baseEffective = Number.isFinite(baseSale) && baseSale > 0
        ? baseSale
        : (Number.isFinite(baseReg) && baseReg > 0 ? baseReg : 0);

      rows.forEach((tr, idx) => {
        const size = tr.querySelector('.var-size')?.value?.trim() || '';
        const sku  = tr.querySelector('.var-sku')?.value?.trim()  || '';
        const regS = tr.querySelector('.var-reg')?.value?.trim()  || '';
        const saleS= tr.querySelector('.var-sale')?.value?.trim() || '';
        const stock= tr.querySelector('.var-stock')?.value || 'instock';

        if (!size) return;

        sizes.push(size);

        const reg  = regS ? Number(regS)  : NaN;
        const sale = saleS ? Number(saleS) : NaN;

        const varReg  = Number.isFinite(reg)  && reg  > 0 ? reg  : null;
        const varSale = Number.isFinite(sale) && sale > 0 ? sale : null;

        // Compute a price_delta for compatibility (based on effective price)
        const varEffective = (varSale ?? varReg ?? null);
        let price_delta = '';
        if (varEffective != null && Number.isFinite(baseEffective)) {
          const d = (varEffective - baseEffective);
          const sign = d >= 0 ? '+' : '';
          price_delta = `${sign}${d.toFixed(2)}`;
        }

        variations.push({
          id: Number(String(product.id || Date.now()) + String(idx + 1)),
          sku,
          attributes: { [attrName]: size },
          regular_price: varReg != null ? varReg.toFixed(2) : '',
          sale_price:    varSale != null ? varSale.toFixed(2) : '',
          stock_status:  stock,
          price_delta    // keep this so product page can still fallback if needed
        });
      });

      product.attributes = { [attrName]: sizes };
      product.variations = variations;
    }
  } else {
    delete product.attributes;
    delete product.variations;
  }

  product.stock_status = Utils.q('#fld-stock-status').value;
  const stockQty = Utils.q('#fld-stock-qty').value;
  product.stock_quantity = stockQty ? Number(stockQty) : null;
  product.manage_stock = Utils.q('#fld-manage').value === 'true';
  product.featured = Utils.q('#fld-featured').value === 'true';
  product.sold_individually = Utils.q('#fld-sold').value === 'true';

  product.weight = Utils.q('#fld-weight').value.trim();
  product.shipping_class = Utils.q('#fld-ship-class').value.trim();
  product.dimensions = {
    length: Utils.q('#fld-l').value.trim(),
    width:  Utils.q('#fld-w').value.trim(),
    height: Utils.q('#fld-h').value.trim()
  };

  product.categories = Utils.q('#fld-cats').value.split(',').map(s => s.trim()).filter(Boolean);
  product.tags = Utils.q('#fld-tags').value.split(',').map(s => s.trim()).filter(Boolean);

  // ----- Additional images: 0, 1, or 2 allowed -----
  if (GalleryUI) {
    const a = (GalleryUI.slot1?.url?.value || '').trim();
    const b = (GalleryUI.slot2?.url?.value || '').trim();
    const enabled = !!GalleryUI.enabled?.checked;

    product.gallery = [{ url: a }, { url: b }];
    product.extra_images_enabled = enabled;

    if (enabled) {
      // Save any non-empty URLs (single or both), de-dup
      const seen = new Set();
      product.images = [a, b]
        .filter(Boolean)
        .filter(u => (u && !seen.has(u) ? (seen.add(u), true) : false));
    } else {
      product.images = [];
    }

    // Primary fallback (prefer primary; else first extra that exists)
    if (!product.image || !product.image.trim()) {
      product.image = a || b || '';
    }

    // keep product.image safe for Snipcart (no base64)
    if (isDataUrl(product.image)) {
      product.image = [a, b].find(u => u && !isDataUrl(u)) || '';
    }

    // De-dupe primary from extras
    product.images = product.images.filter(src => src && src !== product.image);
  }

  // Final normalization (also strips base64 from images[]/image)
  normalizeProduct(product);

  safeSaveProducts();
  renderTable();
  closePanel();
  Utils.showToast(`"${product.title}" updated successfully`, 'success');
}

// ============================================
// TABLE COLUMN TOGGLES (UNIFIED)
// ============================================
function bindTableToggles() {
  COLS.forEach(k => {
    const cb = document.getElementById(`toggle-home-${k}`);
    if (!cb) return;
    cb.addEventListener('change', () => {
      const state = persistColumnStateFromUI();
      applyColumnVisibility(state);
    });
  });
}

// ============================================
// MODALS (product preview, live shop, quick view)
// ============================================
function bindModals() {
  // Product preview modal
  Utils.q('#modal-close').addEventListener('click', closeProductModal);
  Utils.q('#product-modal').addEventListener('click', (e) => {
    if (e.target.id === 'product-modal') closeProductModal();
  });

  // Shop preview modal
  Utils.q('#shop-close').addEventListener('click', closeShopModal);
  Utils.q('#shop-modal').addEventListener('click', (e) => {
    if (e.target.id === 'shop-modal') closeShopModal();
  });

  // Quick view modal
  Utils.q('#quickview-close').addEventListener('click', closeQuickView);
  Utils.q('#quickview-modal').addEventListener('click', (e) => {
    if (e.target.id === 'quickview-modal') closeQuickView();
  });

  // (No direct toggle handlers here—openShopModal owns persistence + live apply)
}

function openProductModal(index) {
  const product = App.products[index];
  if (!product) return;

  Utils.q('#modal-title').textContent = product.title || 'Untitled Product';

  const price = product.sale_price || product.price || product.regular_price;
  if (product.sale_price && product.regular_price) {
    Utils.q('#modal-price').innerHTML = `$${price} <del style="color:#999;font-size:18px;margin-left:8px">$${product.regular_price}</del>`;
  } else {
    Utils.q('#modal-price').textContent = `$${price || '0.00'}`;
  }

  const stockEl = Utils.q('#modal-stock');
  stockEl.textContent = product.stock_status === 'instock' ? 'In Stock' :
                        product.stock_status === 'outofstock' ? 'Out of Stock' : 'On Backorder';
  stockEl.className = `stock-badge ${product.stock_status}`;

  Utils.q('#modal-featured').style.display = product.featured ? 'inline' : 'none';

  if (product.description || product.short_description) {
    Utils.q('#modal-desc-section').style.display = 'block';
    Utils.q('#modal-description').innerHTML = product.description || `<p>${product.short_description}</p>`;
  } else {
    Utils.q('#modal-desc-section').style.display = 'none';
  }

  if (product.sku) {
    Utils.q('#modal-sku-row').style.display = 'grid';
    Utils.q('#modal-sku').textContent = product.sku;
  } else {
    Utils.q('#modal-sku-row').style.display = 'none';
  }

  if (product.categories && product.categories.length > 0) {
    Utils.q('#modal-cat-row').style.display = 'grid';
    Utils.q('#modal-categories').innerHTML = product.categories.map(c => `<span class="cat-tag">${c}</span>`).join(' ');
  } else {
    Utils.q('#modal-cat-row').style.display = 'none';
  }

  if (product.tags && product.tags.length > 0) {
    Utils.q('#modal-tag-row').style.display = 'grid';
    Utils.q('#modal-tags').innerHTML = product.tags.map(t => `<span class="cat-tag">${t}</span>`).join(' ');
  } else {
    Utils.q('#modal-tag-row').style.display = 'none';
  }

  const mainImg = Utils.q('#modal-main-image');
  const placeholder = Utils.q('#image-placeholder');

  if (product.image) {
    mainImg.src = product.image;
    mainImg.style.display = 'block';
    placeholder.style.display = 'none';
    mainImg.onclick = () => Utils.openLightbox(product.image);
  } else {
    mainImg.style.display = 'none';
    placeholder.style.display = 'grid';
  }

  const galleryEl = Utils.q('#modal-gallery');
  galleryEl.innerHTML = '';

  const extras = getVisibleGalleryUrls(product);
  const seen = new Set();
  const allImages = [product.image, ...extras]
    .filter(Boolean)
    .filter(src => (seen.has(src) ? false : (seen.add(src), true)));

  if (allImages.length > 1) {
    allImages.forEach((src, idx) => {
      const thumb = document.createElement('div');
      thumb.className = `gallery-thumb${idx === 0 ? ' active' : ''}`;
      thumb.innerHTML = `<img src='${src}' alt=''>`;
      thumb.addEventListener('click', () => {
        mainImg.src = src;
        Utils.qa('.gallery-thumb', galleryEl).forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
      });
      galleryEl.appendChild(thumb);
    });
  }

  Utils.q('#product-modal').classList.add('show');
}
function closeProductModal() {
  Utils.q('#product-modal').classList.remove('show');
}

// ---------- Live Shop modal (uses Snipcart-safe image) ----------
async function openShopModal() {
  const modal = document.getElementById('shop-modal');
  const grid  = document.getElementById('shop-products-grid');
  const tTitle = document.getElementById('toggle-title');
  const tPrice = document.getElementById('toggle-price');
  const tDesc  = document.getElementById('toggle-description');
  const tStock = document.getElementById('toggle-stock');
  const tAdd   = document.getElementById('toggle-add');

  if (!modal || !grid) {
    console.warn('[Editor] shop modal elements missing');
    return;
  }

  // ✅ Load saved prefs & reflect in toggles BEFORE rendering cards
  const saved = getShopPrefs();
  if (tTitle) tTitle.checked = saved.title !== false;
  if (tPrice) tPrice.checked = saved.price !== false;
  if (tDesc)  tDesc.checked  = saved.description !== false;
  if (tStock) tStock.checked = saved.stock !== false;
  if (tAdd)   tAdd.checked   = saved.add   !== false;

  // ✅ Auto-save current toggle state immediately on open + broadcast
  saveShopPrefs({
    title: tTitle ? !!tTitle.checked : true,
    price: tPrice ? !!tPrice.checked : true,
    description: tDesc ? !!tDesc.checked : true,
    stock: tStock ? !!tStock.checked : true,
    add: tAdd ? !!tAdd.checked : true
  });
  document.dispatchEvent(new CustomEvent('rapidwoo:prefs:updated'));

  // In-memory products (already normalized)
  const products = (Array.isArray(App.products) && App.products.length
    ? App.products
    : ((await Storage.getProducts())?.products || [])
  ).slice();

  const nf = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  grid.innerHTML = '';

  products.forEach((p) => {
    const price = pickPriceNumber(p);
    const title = p?.title || 'Untitled Product';
    const extras = getVisibleGalleryUrls(p);
    const primaryOrExtra = p?.image || extras[0] || '';
    const safeImg = getSnipcartSafeImage(p); // http/https only (no base64)

    const desc  = (p?.short_description || p?.description || '').toString().replace(/<[^>]*>/g, '');
    const short = desc.length > 120 ? (desc.slice(0, 120) + '…') : desc;

    const productUrl = (location && location.origin ? location.origin : '') + '/shop.html';

    const card = document.createElement('div');
    card.className = 'shop-preview-card';
    card.style.border = '1px solid var(--line)';
    card.style.borderRadius = '8px';
    card.style.background = '#fff';
    card.style.overflow = 'hidden';

    card.innerHTML = `
      <div style="aspect-ratio:1/1;background:#fafafa;display:grid;place-items:center">
        ${primaryOrExtra ? `<img src="${primaryOrExtra}" alt="${title.replace(/"/g,'&quot;')}" style="width:100%;height:100%;object-fit:cover">`
                          : `<div style="font-size:48px;color:#cbd5e1">📦</div>`}
      </div>
      <div style="padding:12px;display:grid;gap:8px">
        <div class="pv-title shop-product-title product-title" style="font-weight:700;font-size:16px;">${title}</div>
        <div class="pv-desc shop-product-description product-description"  style="color:#6b7280;font-size:13px;min-height:32px;">${short || ''}</div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
          <div class="pv-price shop-product-price product-price" style="font-weight:700;">${nf.format(price)}</div>

          <!-- Snipcart button (attributes read at click-time) -->
          <button
            class="product-add shop-product-add add-btn button button-primary snipcart-add-item"
            data-item-id="${String(p.id)}"
            data-item-name="${title.replace(/"/g,'&quot;')}"
            data-item-price="${(price || 0).toFixed(2)}"
            data-item-url="${productUrl}"
            ${safeImg ? `data-item-image="${safeImg.replace(/"/g,'&quot;')}"` : ''}
          >
            🛒 Add
          </button>
        </div>
        <div>
          <span class="product-stock shop-product-stock stock-badge ${p.stock_status || 'instock'}">
            ${p.stock_status === 'outofstock' ? 'Out of Stock' : p.stock_status === 'onbackorder' ? 'On Backorder' : 'In Stock'}
          </span>
        </div>
      </div>
    `;

    grid.appendChild(card);
  });

  // Apply prefs to the freshly-rendered grid
  applyPrefsToGrid(grid, getShopPrefs());

  // Bind toggle → persist + live apply (once)
  if (!grid.dataset.togglesBound) {
    function handleToggleChange() {
      const prefs = prefsFromToggles(tTitle, tPrice, tDesc, tStock, tAdd);
      saveShopPrefs(prefs);
      applyPrefsToGrid(grid, prefs);
      // Broadcast so any same-page listeners (or embedded shop) can react
      document.dispatchEvent(new CustomEvent('rapidwoo:prefs:updated', { detail: prefs }));
    }
    ['change','input'].forEach(evt => {
      tTitle?.addEventListener(evt, handleToggleChange);
      tPrice?.addEventListener(evt, handleToggleChange);
      tDesc ?.addEventListener(evt, handleToggleChange);
      tStock?.addEventListener(evt, handleToggleChange);
      tAdd  ?.addEventListener(evt, handleToggleChange);
    });
    grid.dataset.togglesBound = '1';
  }

  modal.classList.add('show');
  modal.style.display = 'block';

  const closeBtn = document.getElementById('shop-close');
  if (closeBtn && !closeBtn.dataset.bound) {
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('show');
      modal.style.display = 'none';
    });
    closeBtn.dataset.bound = '1';
  }
}
function closeShopModal() {
  Utils.q('#shop-modal').classList.remove('show');
}

// ---------- Quick View ----------
function openQuickView(index) {
  const product = App.products[index];
  if (!product) return;

  Utils.q('#quickview-title').textContent = product.title || 'Untitled Product';

  const price = product.sale_price || product.price || product.regular_price;
  if (product.sale_price && product.regular_price) {
    Utils.q('#quickview-price').innerHTML = `${price} <del style="color:#999;font-size:18px;margin-left:8px">${product.regular_price}</del>`;
  } else {
    Utils.q('#quickview-price').textContent = `${price || '0.00'}`;
  }

  const stockEl = Utils.q('#quickview-stock');
  stockEl.textContent = product.stock_status === 'instock' ? 'In Stock' :
                        product.stock_status === 'outofstock' ? 'Out of Stock' : 'On Backorder';
  stockEl.className = `stock-badge ${product.stock_status}`;

  Utils.q('#quickview-featured').style.display = product.featured ? 'inline' : 'none';

  if (product.description || product.short_description) {
    Utils.q('#quickview-desc-section').style.display = 'block';
    Utils.q('#quickview-description').innerHTML = product.description || `<p>${product.short_description}</p>`;
  } else {
    Utils.q('#quickview-desc-section').style.display = 'none';
  }

  if (product.sku) {
    Utils.q('#quickview-sku-row').style.display = 'grid';
    Utils.q('#quickview-sku').textContent = product.sku;
  } else {
    Utils.q('#quickview-sku-row').style.display = 'none';
  }

  if (product.categories && product.categories.length > 0) {
    Utils.q('#quickview-cat-row').style.display = 'grid';
    Utils.q('#quickview-categories').innerHTML = product.categories.map(c => `<span class="cat-tag">${c}</span>`).join(' ');
  } else {
    Utils.q('#quickview-cat-row').style.display = 'none';
  }

  if (product.tags && product.tags.length > 0) {
    Utils.q('#quickview-tag-row').style.display = 'grid';
    Utils.q('#quickview-tags').innerHTML = product.tags.map(t => `<span class="cat-tag">${t}</span>`).join(' ');
  } else {
    Utils.q('#quickview-tag-row').style.display = 'none';
  }

  const mainImg = Utils.q('#quickview-main-image');
  const placeholder = Utils.q('#quickview-placeholder');

  if (product.image) {
    mainImg.src = product.image;
    mainImg.style.display = 'block';
    placeholder.style.display = 'none';
    mainImg.onclick = () => Utils.openLightbox(product.image);
  } else {
    mainImg.style.display = 'none';
    placeholder.style.display = 'grid';
  }

  const galleryEl = Utils.q('#quickview-gallery');
  galleryEl.innerHTML = '';

  const extras = getVisibleGalleryUrls(product);
  const seen = new Set();
  const allImages = [product.image, ...extras]
    .filter(Boolean)
    .filter(src => (seen.has(src) ? false : (seen.add(src), true)));

  if (allImages.length > 1) {
    allImages.forEach((src, idx) => {
      const thumb = document.createElement('div');
      thumb.className = `gallery-thumb${idx === 0 ? ' active' : ''}`;
      thumb.innerHTML = `<img src='${src}' alt=''>`;
      thumb.addEventListener('click', () => {
        mainImg.src = src;
        Utils.qa('.gallery-thumb', galleryEl).forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
      });
      galleryEl.appendChild(thumb);
    });
  }

  Utils.q('#quickview-modal').classList.add('show');
}
function closeQuickView() {
  Utils.q('#quickview-modal').classList.remove('show');
}

// ============================================
// START APPLICATION
// ============================================
document.addEventListener('DOMContentLoaded', init);

/* =========================================================
   RapidWoo — Default "Show Additional Images" = ON (when exists)
   Drop-in patch: place at the very end of /demo/editor.js
   ========================================================= */
(function () {
  // Defensive helpers (no dependency on your internal utils)
  const q  = (sel, r = document) => r.querySelector(sel);
  const qa = (sel, r = document) => Array.from(r.querySelectorAll(sel));

  // Find the “Show Additional Images” checkbox inside the editor panel
  function findAdditionalImagesCheckbox(panelRoot) {
    if (!panelRoot) return null;
    // 1) direct id (if you added one later)
    const byId = panelRoot.querySelector('#fld-additional-images, #toggle-additional-images, #show-additional-images');
    if (byId) return byId;

    // 2) best-effort: look for a checkbox whose nearby label text contains our phrase
    const inputs = qa('input[type="checkbox"]', panelRoot);
    for (const input of inputs) {
      // Try <label for="…">text</label>
      const id = input.getAttribute('id');
      if (id) {
        const label = panelRoot.querySelector(`label[for="${CSS.escape(id)}"]`);
        if (label && /show\s+additional\s+images/i.test(label.textContent || '')) return input;
      }
      // Try a wrapper where the label is a sibling/ancestor
      const maybe = input.closest('.fpe-field, .field, div, label');
      if (maybe && /show\s+additional\s+images/i.test(maybe.textContent || '')) return input;
    }
    return null;
  }

  // Decide the default state:
  // - If product.show_additional_images is explicitly set, respect it.
  // - Otherwise, default to true when product.images exists and has length > 0.
  function defaultWantsAdditional(product) {
    const explicit = product && Object.prototype.hasOwnProperty.call(product, 'show_additional_images')
      ? product.show_additional_images
      : undefined;
    if (typeof explicit === 'boolean') return explicit;

    const imgs = Array.isArray(product?.images) ? product.images : [];
    return imgs.length > 0;
  }

  // Apply default to the open panel
  function applyDefaultToOpenPanel() {
    const panel = q('.fpe-panel');
    if (!panel || !panel.classList.contains('open')) return;

    const checkbox = findAdditionalImagesCheckbox(panel);
    if (!checkbox) return;

    // Pull the product being edited (editor.js defines App.currentEditIndex / App.products)
    const App = window.App || window.RapidWoo?.App || window;
    const idx = Number(App?.currentEditIndex);
    const product = Array.isArray(App?.products) ? App.products[idx] : null;
    if (!product) return;

    const shouldBeOn = defaultWantsAdditional(product);

    // If it’s already correct, do nothing. Otherwise set and emit change.
    if (checkbox.checked !== shouldBeOn) {
      checkbox.checked = shouldBeOn;
      checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Also hydrate the in-memory flag so future saves keep the intent.
    product.show_additional_images = shouldBeOn;
  }

  // Observe when the editor panel opens/closes so we can apply the default
  function watchPanel() {
    const panel = q('.fpe-panel');
    if (!panel) return;
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && m.attributeName === 'class') {
          // When it becomes visible, enforce the default
          if (panel.classList.contains('open')) {
            // Give the panel content a tick to render its fields
            setTimeout(applyDefaultToOpenPanel, 0);
          }
        }
      }
    });
    mo.observe(panel, { attributes: true });
  }

  // Also set sane defaults as soon as products are loaded (no UI needed)
  function primeProductsFlagIfMissing() {
    const App = window.App || window.RapidWoo?.App || window;
    if (!Array.isArray(App?.products)) return;
    for (const p of App.products) {
      if (!Object.prototype.hasOwnProperty.call(p, 'show_additional_images')) {
        p.show_additional_images = defaultWantsAdditional(p);
      }
    }
  }

  // Run now (if DOM ready) or after DOM loads
  function init() {
    primeProductsFlagIfMissing();
    watchPanel();
    // Re-apply whenever products refresh from import/demo
    window.addEventListener('rapidwoo:products:updated', () => {
      primeProductsFlagIfMissing();
      // If the panel is currently open, re-apply immediately
      setTimeout(applyDefaultToOpenPanel, 0);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

