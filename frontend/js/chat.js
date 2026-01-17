// Chat Module
const chat = {
  currentChannel: 'general',
  messages: [],
  typingUsers: new Set(),
  typingTimeout: null,

  init() {
    this.setupMessageInput();
    this.setupEmojiPicker();
    this.setupContextMenu();
    this.loadChannel('general');
  },

  setupMessageInput() {
    const messageInput = document.getElementById('messageInput');
    
    // Send message on Enter
    messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Typing indicator
    const debouncedTyping = utils.debounce(() => {
      socketModule.sendTyping(false);
    }, 1000);

    messageInput.addEventListener('input', () => {
      if (messageInput.value.trim()) {
        socketModule.sendTyping(true);
        debouncedTyping();
      }
    });
  },

  setupEmojiPicker() {
    const emojiBtn = document.getElementById('emojiBtn');
    const emojiPicker = document.getElementById('emojiPicker');
    const messageInput = document.getElementById('messageInput');

    emojiBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      emojiPicker.style.display = emojiPicker.style.display === 'none' ? 'block' : 'none';
    });

    // Select emoji
    emojiPicker.addEventListener('click', (e) => {
      if (e.target.matches('.emoji-grid span') || e.target.textContent.match(/[\u{1F600}-\u{1F64F}]/u)) {
        const emoji = e.target.textContent.trim();
        if (emoji) {
          messageInput.value += emoji;
          messageInput.focus();
        }
      }
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!emojiPicker.contains(e.target) && e.target !== emojiBtn) {
        emojiPicker.style.display = 'none';
      }
    });
  },

  setupContextMenu() {
    const contextMenu = document.getElementById('contextMenu');
    const chatMessages = document.getElementById('chatMessages');

    // Show context menu on right click
    chatMessages.addEventListener('contextmenu', (e) => {
      const message = e.target.closest('.message');
      if (!message) return;

      e.preventDefault();
      contextMenu.style.display = 'block';
      contextMenu.style.left = e.pageX + 'px';
      contextMenu.style.top = e.pageY + 'px';
      contextMenu.dataset.messageId = message.dataset.messageId;
    });

    // Handle context menu actions
    contextMenu.addEventListener('click', (e) => {
      const action = e.target.closest('.context-item')?.dataset.action;
      const messageId = contextMenu.dataset.messageId;

      if (action) {
        this.handleContextAction(action, messageId);
        contextMenu.style.display = 'none';
      }
    });

    // Close on outside click
    document.addEventListener('click', () => {
      contextMenu.style.display = 'none';
    });
  },

  async loadChannel(channelId) {
    this.currentChannel = channelId;
    
    // Update UI
    const channel = document.querySelector(`.channel[data-channel-id="${channelId}"]`);
    document.querySelectorAll('.channel').forEach(ch => ch.classList.remove('active'));
    if (channel) {
      channel.classList.add('active');
      const channelName = channel.querySelector('span').textContent;
      document.getElementById('currentChannelName').textContent = channelName;
      document.getElementById('welcomeChannelName').textContent = channelName;
      document.getElementById('welcomeChannelName2').textContent = channelName;
      document.getElementById('messageInput').placeholder = `أرسل رسالة إلى #${channelName}`;
    }

    // Join channel via socket
    socketModule.joinChannel(channelId);

    // Load messages
    await this.loadMessages(channelId);
  },

  async loadMessages(channelId) {
    try {
      const response = await fetch(`${API_URL}/messages/channel/${channelId}`, {
        headers: auth.getAuthHeader()
      });

      if (!response.ok) {
        throw new Error('فشل تحميل الرسائل');
      }

      const data = await response.json();
      this.messages = data.messages;
      this.renderMessages();
    } catch (error) {
      console.error('Load messages error:', error);
      // Show welcome message instead
      this.messages = [];
      this.renderMessages();
    }
  },

  renderMessages() {
    const chatMessages = document.getElementById('chatMessages');
    const welcomeMessage = chatMessages.querySelector('.welcome-message');

    if (this.messages.length === 0) {
      if (welcomeMessage) {
        welcomeMessage.style.display = 'block';
      }
      // Clear any existing messages except welcome
      const existingMessages = chatMessages.querySelectorAll('.message');
      existingMessages.forEach(msg => msg.remove());
      return;
    }

    if (welcomeMessage) {
      welcomeMessage.style.display = 'none';
    }

    // Clear existing messages
    const existingMessages = chatMessages.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());

    // Render messages
    this.messages.forEach(message => {
      const messageEl = this.createMessageElement(message);
      chatMessages.appendChild(messageEl);
    });

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
  },

  createMessageElement(message) {
    const messageEl = document.createElement('div');
    messageEl.className = 'message';
    messageEl.dataset.messageId = message._id || message.id;

    const avatar = message.author?.avatar || 'default-avatar.svg';
    const username = message.author?.username || 'مستخدم';
    const content = utils.escapeHtml(message.content);
    const timestamp = utils.formatTime(message.createdAt);

    messageEl.innerHTML = `
      <img src="assets/${avatar}" alt="${username}" class="message-avatar">
      <div class="message-content">
        <div class="message-header">
          <span class="message-author">${username}</span>
          <span class="message-timestamp">${timestamp}</span>
        </div>
        <div class="message-text">${utils.parseLinks(content)}</div>
        ${this.renderAttachments(message.attachments)}
      </div>
    `;

    return messageEl;
  },

  renderAttachments(attachments) {
    if (!attachments || attachments.length === 0) return '';

    return attachments.map(attachment => {
      if (utils.isImage(attachment.mimetype)) {
        return `
          <div class="message-attachment">
            <img src="${API_URL.replace('/api', '')}${attachment.url}" alt="${attachment.originalName}">
          </div>
        `;
      } else {
        const icon = utils.getFileIcon(attachment.mimetype);
        return `
          <div class="message-attachment">
            <a href="${API_URL.replace('/api', '')}${attachment.url}" target="_blank" class="attachment-file">
              <i class="fas ${icon} attachment-icon"></i>
              <div class="attachment-info">
                <span class="attachment-name">${attachment.originalName}</span>
                <span class="attachment-size">${utils.formatFileSize(attachment.size)}</span>
              </div>
            </a>
          </div>
        `;
      }
    }).join('');
  },

  sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const content = messageInput.value.trim();

    if (!content) return;

    // Send via socket
    socketModule.sendMessage(content);

    // Clear input
    messageInput.value = '';
    socketModule.sendTyping(false);
  },

  receiveMessage(message) {
    // Only add if it's for the current channel
    if (message.channel === this.currentChannel) {
      this.messages.push(message);
      
      const chatMessages = document.getElementById('chatMessages');
      const welcomeMessage = chatMessages.querySelector('.welcome-message');
      if (welcomeMessage) {
        welcomeMessage.style.display = 'none';
      }

      const messageEl = this.createMessageElement(message);
      chatMessages.appendChild(messageEl);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  },

  showTyping(data) {
    if (data.isTyping) {
      this.typingUsers.add(data.username);
    } else {
      this.typingUsers.delete(data.username);
    }

    const typingIndicator = document.getElementById('typingIndicator');
    const typingText = typingIndicator.querySelector('.typing-text');

    if (this.typingUsers.size > 0) {
      const users = Array.from(this.typingUsers).join('، ');
      typingText.textContent = `${users} يكتب...`;
      typingIndicator.style.display = 'flex';
    } else {
      typingIndicator.style.display = 'none';
    }
  },

  async handleContextAction(action, messageId) {
    switch (action) {
      case 'reply':
        console.log('Reply to:', messageId);
        utils.showToast('ميزة الرد قريباً', 'warning');
        break;
      case 'edit':
        console.log('Edit:', messageId);
        utils.showToast('ميزة التعديل قريباً', 'warning');
        break;
      case 'copy':
        const message = this.messages.find(m => m._id === messageId || m.id === messageId);
        if (message) {
          navigator.clipboard.writeText(message.content);
          utils.showToast('تم النسخ', 'success');
        }
        break;
      case 'delete':
        await this.deleteMessage(messageId);
        break;
    }
  },

  async deleteMessage(messageId) {
    try {
      const response = await fetch(`${API_URL}/messages/${messageId}`, {
        method: 'DELETE',
        headers: auth.getAuthHeader()
      });

      if (!response.ok) {
        throw new Error('فشل حذف الرسالة');
      }

      // Remove from UI
      this.messages = this.messages.filter(m => m._id !== messageId && m.id !== messageId);
      this.renderMessages();
      utils.showToast('تم حذف الرسالة', 'success');
    } catch (error) {
      console.error('Delete message error:', error);
      utils.showToast(error.message, 'error');
    }
  }
};

// Export
window.chat = chat;
