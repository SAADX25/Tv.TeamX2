// Configuration
// ⚠️ تغيير API_URL حسب البيئة:
// - محلي (Local): 'http://localhost:3000/api'
// - Codespaces: 'https://YOUR-CODESPACE-URL.app.github.dev/api'
// - إنتاج (Production): 'https://your-domain.com/api'
const API_URL = 'https://shiny-broccoli-4jgrwjpqwv63jjrg-3000.app.github.dev/api';


// Utility Functions
const utils = {
  // Format time
  formatTime(date) {
    const now = new Date();
    const messageDate = new Date(date);
    const diff = now - messageDate;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return messageDate.toLocaleDateString('ar-SA', { 
        month: 'short', 
        day: 'numeric' 
      });
    } else if (hours > 0) {
      return `قبل ${hours} ساعة`;
    } else if (minutes > 0) {
      return `قبل ${minutes} دقيقة`;
    } else {
      return 'الآن';
    }
  },

  // Format file size
  formatFileSize(bytes) {
    if (bytes === 0) return '0 بايت';
    const k = 1024;
    const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  },

  // Escape HTML
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  // Parse links in text
  parseLinks(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  },

  // Debounce function
  debounce(func, wait) {
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

  // Throttle function
  throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  // Show toast notification
  showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? 'fa-check-circle' : 
                 type === 'error' ? 'fa-exclamation-circle' : 
                 'fa-info-circle';
    
    toast.innerHTML = `
      <i class="fas ${icon}"></i>
      <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  // LocalStorage helpers
  setStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Error saving to localStorage:', e);
    }
  },

  getStorage(key) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      console.error('Error reading from localStorage:', e);
      return null;
    }
  },

  removeStorage(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error('Error removing from localStorage:', e);
    }
  },

  // Get file icon based on type
  getFileIcon(mimetype) {
    if (mimetype.startsWith('image/')) return 'fa-file-image';
    if (mimetype.startsWith('video/')) return 'fa-file-video';
    if (mimetype.startsWith('audio/')) return 'fa-file-audio';
    if (mimetype.includes('pdf')) return 'fa-file-pdf';
    if (mimetype.includes('word')) return 'fa-file-word';
    if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return 'fa-file-excel';
    if (mimetype.includes('zip') || mimetype.includes('rar')) return 'fa-file-archive';
    return 'fa-file';
  },

  // Check if file is an image
  isImage(mimetype) {
    return mimetype.startsWith('image/');
  }
};

// Export for use in other modules
window.utils = utils;
window.API_URL = API_URL;
