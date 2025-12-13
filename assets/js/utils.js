// ============================================
// UTILITIES
// Helper functions, UI components, and tools
// ============================================

window.RapidWoo = window.RapidWoo || {};

window.RapidWoo.Utils = {

  // ============================================
  // DOM HELPERS
  // ============================================

  q(selector, context = document) {
    return context.querySelector(selector);
  },

  qa(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
  },

  // ============================================
  // TOAST NOTIFICATIONS
  // ============================================

  showToast(message, type = 'success', title = '') {
    const container = this.getToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    
    const titles = {
      success: title || 'Success',
      error: title || 'Error',
      warning: title || 'Warning',
      info: title || 'Info'
    };
    
    toast.innerHTML = `
      <div class='toast-icon'>${icons[type]}</div>
      <div class='toast-content'>
        <div class='toast-title'>${titles[type]}</div>
        <div class='toast-message'>${message}</div>
      </div>
      <button class='toast-close' aria-label='Close'>×</button>
    `;
    
    container.appendChild(toast);
    
    toast.querySelector('.toast-close').addEventListener('click', () => {
      this.removeToast(toast);
    });
    
    setTimeout(() => {
      this.removeToast(toast);
    }, 4000);
  },

  removeToast(toast) {
    toast.classList.add('removing');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  },

  getToastContainer() {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  },

  // ============================================
  // CONFIRM DIALOG
  // ============================================

  showConfirm(message, title = 'Confirm Action') {
    return new Promise((resolve) => {
      const overlay = this.getConfirmOverlay();
      this.q('#confirm-title', overlay).textContent = title;
      this.q('#confirm-message', overlay).textContent = message;
      
      overlay.classList.add('show');
      
      const handleOk = () => {
        overlay.classList.remove('show');
        cleanup();
        resolve(true);
      };
      
      const handleCancel = () => {
        overlay.classList.remove('show');
        cleanup();
        resolve(false);
      };
      
      const cleanup = () => {
        this.q('#confirm-ok', overlay).removeEventListener('click', handleOk);
        this.q('#confirm-cancel', overlay).removeEventListener('click', handleCancel);
        overlay.removeEventListener('click', handleOverlayClick);
      };
      
      const handleOverlayClick = (e) => {
        if (e.target.id === 'confirm-overlay') {
          handleCancel();
        }
      };
      
      this.q('#confirm-ok', overlay).addEventListener('click', handleOk);
      this.q('#confirm-cancel', overlay).addEventListener('click', handleCancel);
      overlay.addEventListener('click', handleOverlayClick);
    });
  },

  getConfirmOverlay() {
    let overlay = document.getElementById('confirm-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'confirm-overlay';
      overlay.className = 'confirm-overlay';
      overlay.innerHTML = `
        <div class='confirm-dialog'>
          <div class='confirm-header'>
            <h3 id='confirm-title'>Confirm Action</h3>
          </div>
          <div class='confirm-body' id='confirm-message'>
            Are you sure you want to proceed?
          </div>
          <div class='confirm-footer'>
            <button class='button' id='confirm-cancel'>Cancel</button>
            <button class='button button-danger' id='confirm-ok'>Confirm</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
    }
    return overlay;
  },

  // ============================================
  // FORMATTING
  // ============================================

  formatPrice(price) {
    return price ? `${Number(price).toFixed(2)}` : '$0.00';
  },

  formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  },

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  },

  slugify(text) {
    return (text || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  },

  // ============================================
  // VALIDATION
  // ============================================

  validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },

  validateUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  validatePrice(price) {
    const num = Number(price);
    return !isNaN(num) && num >= 0;
  },

  // ============================================
  // MOBILE MENU
  // ============================================

  initMobileMenu() {
    const toggle = document.getElementById('mobile-menu-toggle');
    const menu = document.getElementById('mobile-menu');
    const overlay = document.getElementById('mobile-menu-overlay');
    const close = document.getElementById('mobile-menu-close');
    const mobileLinks = this.qa('.mobile-nav-link');
    
    if (!toggle || !menu) return;
    
    const openMenu = () => {
      toggle.classList.add('active');
      menu.classList.add('active');
      if (overlay) overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    };
    
    const closeMenu = () => {
      toggle.classList.remove('active');
      menu.classList.remove('active');
      if (overlay) overlay.classList.remove('active');
      document.body.style.overflow = '';
    };
    
    toggle.addEventListener('click', openMenu);
    if (close) close.addEventListener('click', closeMenu);
    if (overlay) overlay.addEventListener('click', closeMenu);
    
    mobileLinks.forEach(link => {
      link.addEventListener('click', closeMenu);
    });
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.classList.contains('active')) {
        closeMenu();
      }
    });
  },

  // ============================================
  // LIGHTBOX
  // ============================================

  openLightbox(imageSrc) {
    let overlay = document.getElementById('lightbox-overlay');
    
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'lightbox-overlay';
      overlay.className = 'lightbox-overlay';
      overlay.innerHTML = `
        <button class='lightbox-close' aria-label='Close'>✕</button>
        <img class='lightbox-image' src='' alt='Product image'>
      `;
      document.body.appendChild(overlay);
      
      const closeBtn = this.q('.lightbox-close', overlay);
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeLightbox();
      });
      
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.closeLightbox();
        }
      });
      
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.classList.contains('show')) {
          this.closeLightbox();
        }
      });
    }
    
    const img = this.q('.lightbox-image', overlay);
    img.src = imageSrc;
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
  },

  closeLightbox() {
    const overlay = document.getElementById('lightbox-overlay');
    if (overlay) {
      overlay.classList.remove('show');
      document.body.style.overflow = '';
    }
  },

  // ============================================
  // COPY TO CLIPBOARD
  // ============================================

  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.showToast('Copied to clipboard', 'success');
      return true;
    } catch (error) {
      console.error('❌ Copy failed:', error);
      this.showToast('Failed to copy', 'error');
      return false;
    }
  },

  // ============================================
  // DEBOUNCE
  // ============================================

  debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // ============================================
  // ESCAPE HTML
  // ============================================

  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  },

  // ============================================
  // STRIP HTML TAGS
  // ============================================

  stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  },

  // ============================================
  // TRUNCATE TEXT
  // ============================================

  truncate(text, maxLength, suffix = '...') {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - suffix.length) + suffix;
  },

  // ============================================
  // GENERATE RANDOM ID
  // ============================================

  generateId() {
    return Date.now() + Math.random().toString(36).substr(2, 9);
  },

  // ============================================
  // SMOOTH SCROLL
  // ============================================

  smoothScroll(target) {
    const element = typeof target === 'string' ? this.q(target) : target;
    if (!element) return;
    
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  },

  // ============================================
  // CHECK IF MOBILE
  // ============================================

  isMobile() {
    return window.innerWidth < 768;
  },

  // ============================================
  // WAIT FOR ELEMENT
  // ============================================

  waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const element = this.q(selector);
      if (element) {
        resolve(element);
        return;
      }
      
      const observer = new MutationObserver(() => {
        const element = this.q(selector);
        if (element) {
          observer.disconnect();
          resolve(element);
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      }, timeout);
    });
  }
};

console.log('✅ RapidWoo Utils loaded')