// assets/js/imageHandler.js
// ============================================
// IMAGE HANDLER - SERVER UPLOAD VERSION
// ============================================

window.RapidWoo = window.RapidWoo || {};

window.RapidWoo.ImageHandler = {

  // Try server first; fallback to base64 (smaller, compressed)
  async processImageFile(file) {
    try {
      const url = await this.uploadToServer(file);
      return { type: 'url', data: url };
    } catch (error) {
      console.warn('⚠️ Server upload failed, using base64 fallback:', error.message);
      const dataURL = await this.compressImage(file);
      return { type: 'base64', data: dataURL };
    }
  },

  // Upload to PHP endpoint; PHP accepts 'file' or 'image'
  async uploadToServer(file) {
    const fd = new FormData();
    fd.append('file', file); // field name 'file' (PHP accepts both)

    const endpoint = (window.RapidWoo?.Config?.API?.UPLOAD) || '/upload-temp.php';
    const res = await fetch(endpoint, {
      method: 'POST',
      body: fd,
      // credentials: 'same-origin', // uncomment if you rely on cookies/sessions
    });

    let json = null;
    try { json = await res.json(); } catch (_) {}

    if (!res.ok || !json || json.ok !== true || !json.url) {
      const msg = (json && (json.error || json.message)) || `Upload failed (${res.status})`;
      throw new Error(msg);
    }
    return json.url;
  },

  // Base64 fallback (compressed jpeg)
  compressImage(file, maxWidth = 800, quality = 0.7) {
    const config = window.RapidWoo.Config.IMAGE;
    return new Promise((resolve, reject) => {
      if (!config.ALLOWED_TYPES.includes(file.type)) {
        reject(new Error(`Invalid file type: ${file.type}`)); return;
      }
      if (file.size > config.MAX_SIZE) {
        reject(new Error(`File too large: ${(file.size/1048576).toFixed(2)}MB`)); return;
      }

      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          try {
            let w = img.width, h = img.height;
            if (w > maxWidth) { h = h * (maxWidth / w); w = maxWidth; }

            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, w, h);
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve(dataUrl);
          } catch (err) { reject(err); }
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  },

  // Bulk helper (kept compatible with your editor)
  async processImages(files, progressCallback = null) {
    const out = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      progressCallback?.({ current: i+1, total: files.length, filename: file.name, status: 'processing' });
      try {
        const res = await this.processImageFile(file);
        const imageUrl = res.data;

        const basename = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').trim();
        const priceMatch = basename.match(/\$?\s*(\d+(?:\.\d{1,2})?)/);
        const price = priceMatch ? Number(priceMatch[1]).toFixed(2) : (Math.random() * 200 + 50).toFixed(2);

        out.push({
          id: Date.now() + i,
          title: basename.replace(/,?\s*\$\d+(\.\d{1,2})?/, '') || `Product ${i+1}`,
          slug: this.slugify(basename.replace(/,?\s*\$\d+(\.\d{1,2})?/, '') || `product-${i+1}`),
          image: imageUrl,
          images: [imageUrl], // store as pure URLs
          regular_price: price,
          price,
          sale_price: '',
          stock_status: 'instock',
          categories: ['Artwork'],
          tags: ['art'],
          description: '<p>Beautiful original artwork from your collection.</p>',
          short_description: 'A stunning piece from your collection.',
          type: 'simple',
          sku: '',
          manage_stock: false,
          stock_quantity: null,
          weight: '',
          dimensions: { length: '', width: '', height: '' },
          featured: false,
          sold_individually: false,
          hidden: false,
          // gallery for your editor (empty by default)
          gallery: [{ url: '' }, { url: '' }],
          extra_images_enabled: false
        });

        progressCallback?.({ current: i+1, total: files.length, filename: file.name, status: 'complete', imageType: res.type });
      } catch (error) {
        console.error(`❌ Failed to process ${file.name}:`, error);
        progressCallback?.({ current: i+1, total: files.length, filename: file.name, status: 'error', error: error.message });
      }
    }
    return out;
  },

  validateImage(file) {
    const config = window.RapidWoo.Config.IMAGE;
    const errors = [];
    if (!config.ALLOWED_TYPES.includes(file.type)) errors.push(`Invalid file type: ${file.type}`);
    if (file.size > config.MAX_SIZE) errors.push(`File too large: ${(file.size/1048576).toFixed(2)}MB (max ${(config.MAX_SIZE/1048576)}MB)`);
    return { valid: errors.length === 0, errors };
  },

  slugify(text) {
    return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  },

  getImageDimensions(dataURL) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = dataURL;
    });
  },

  async urlToBase64(url) {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
};

console.log('✅ RapidWoo ImageHandler loaded (Server Upload Mode)');
