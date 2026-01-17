// File Upload Module
const fileUpload = {
  selectedFile: null,
  maxFileSize: 10 * 1024 * 1024, // 10MB

  init() {
    this.setupAttachButton();
    this.setupUploadModal();
    this.setupDragAndDrop();
    this.setupPasteSupport();
  },

  setupAttachButton() {
    const attachBtn = document.getElementById('attachBtn');
    attachBtn.addEventListener('click', () => {
      this.openUploadModal();
    });
  },

  setupUploadModal() {
    const uploadModal = document.getElementById('uploadModal');
    const closeBtn = document.getElementById('closeUploadModal');
    const selectFileBtn = document.getElementById('selectFileBtn');
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadFileBtn');
    const removeBtn = document.getElementById('removeFileBtn');

    // Open file selector
    selectFileBtn.addEventListener('click', () => {
      fileInput.click();
    });

    // File selected
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.handleFileSelect(file);
      }
    });

    // Upload file
    uploadBtn.addEventListener('click', () => {
      this.uploadFile();
    });

    // Remove file
    removeBtn.addEventListener('click', () => {
      this.clearFile();
    });

    // Close modal
    closeBtn.addEventListener('click', () => {
      this.closeUploadModal();
    });

    // Close on outside click
    uploadModal.addEventListener('click', (e) => {
      if (e.target === uploadModal) {
        this.closeUploadModal();
      }
    });
  },

  setupDragAndDrop() {
    const uploadArea = document.getElementById('uploadArea');
    const chatMessages = document.getElementById('chatMessages');

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      uploadArea.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
      
      chatMessages.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });

    // Highlight drop area
    ['dragenter', 'dragover'].forEach(eventName => {
      uploadArea.addEventListener(eventName, () => {
        uploadArea.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      uploadArea.addEventListener(eventName, () => {
        uploadArea.classList.remove('dragover');
      });
    });

    // Handle dropped files
    uploadArea.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        this.handleFileSelect(files[0]);
      }
    });

    // Also allow dropping on chat area
    chatMessages.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        this.openUploadModal();
        setTimeout(() => {
          this.handleFileSelect(files[0]);
        }, 100);
      }
    });
  },

  setupPasteSupport() {
    document.addEventListener('paste', (e) => {
      const items = e.clipboardData.items;
      
      for (let item of items) {
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          this.openUploadModal();
          setTimeout(() => {
            this.handleFileSelect(blob);
          }, 100);
          break;
        }
      }
    });
  },

  openUploadModal() {
    const uploadModal = document.getElementById('uploadModal');
    uploadModal.classList.add('active');
    this.clearFile();
  },

  closeUploadModal() {
    const uploadModal = document.getElementById('uploadModal');
    uploadModal.classList.remove('active');
    this.clearFile();
  },

  handleFileSelect(file) {
    // Validate file size
    if (file.size > this.maxFileSize) {
      utils.showToast('حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت', 'error');
      return;
    }

    this.selectedFile = file;
    this.showFilePreview(file);
  },

  showFilePreview(file) {
    const uploadArea = document.getElementById('uploadArea');
    const filePreview = document.getElementById('filePreview');
    const fileIcon = filePreview.querySelector('.file-icon');
    const fileName = filePreview.querySelector('.file-name');
    const fileSize = filePreview.querySelector('.file-size');

    // Hide upload area, show preview
    uploadArea.style.display = 'none';
    filePreview.style.display = 'block';

    // Set file info
    const icon = utils.getFileIcon(file.type);
    fileIcon.className = `fas ${icon} file-icon`;
    fileName.textContent = file.name;
    fileSize.textContent = utils.formatFileSize(file.size);

    // Show preview for images
    if (utils.isImage(file.type)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        fileIcon.style.backgroundImage = `url(${e.target.result})`;
        fileIcon.style.backgroundSize = 'cover';
        fileIcon.classList.add('image-preview');
      };
      reader.readAsDataURL(file);
    }
  },

  clearFile() {
    this.selectedFile = null;
    const uploadArea = document.getElementById('uploadArea');
    const filePreview = document.getElementById('filePreview');
    const fileInput = document.getElementById('fileInput');
    const uploadProgress = document.getElementById('uploadProgress');

    uploadArea.style.display = 'block';
    filePreview.style.display = 'none';
    uploadProgress.style.display = 'none';
    fileInput.value = '';
  },

  async uploadFile() {
    if (!this.selectedFile) return;

    const uploadProgress = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const uploadBtn = document.getElementById('uploadFileBtn');

    uploadProgress.style.display = 'block';
    uploadBtn.disabled = true;

    try {
      const formData = new FormData();
      formData.append('file', this.selectedFile);

      // Upload file with progress
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          progressFill.style.width = percentComplete + '%';
          progressText.textContent = Math.round(percentComplete) + '%';
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          
          // Send message with attachment
          this.sendFileMessage(response);
          
          utils.showToast('تم رفع الملف بنجاح', 'success');
          this.closeUploadModal();
        } else {
          throw new Error('فشل رفع الملف');
        }
      });

      xhr.addEventListener('error', () => {
        throw new Error('فشل رفع الملف');
      });

      xhr.open('POST', `${API_URL.replace('/api', '')}/api/upload`);
      xhr.setRequestHeader('Authorization', `Bearer ${auth.token}`);
      xhr.send(formData);

    } catch (error) {
      console.error('Upload error:', error);
      utils.showToast(error.message, 'error');
      uploadBtn.disabled = false;
      uploadProgress.style.display = 'none';
    }
  },

  sendFileMessage(fileData) {
    const messageInput = document.getElementById('messageInput');
    const content = messageInput.value.trim() || 'ملف';

    // Send message with attachment via socket
    socketModule.sendMessage(content, [fileData]);

    // Clear input
    messageInput.value = '';
  }
};

// Export
window.fileUpload = fileUpload;
