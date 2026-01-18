const chat = {
  currentChannel: null,
  messages: [],
  typingUsers: new Set(),
  typingTimeout: null,

  init() {
    this.setupMessageInput();
    this.setupEmojiPicker();
    this.setupContextMenu();
    this.loadChannel('696c89cd48e7684bf3ddb21f');

    if (window.socketModule && socketModule.socket) {
        socketModule.socket.on('message-deleted', ({ messageId }) => {
            const el = document.querySelector(`.message[data-message-id="${messageId}"]`);
            if (el) el.remove();
        });
        
        // استقبال الرسائل الجديدة
        socketModule.socket.on('new-message', ({ message }) => {
            this.receiveMessage(message);
        });
    }
  },

  setupMessageInput() {
    const messageInput = document.getElementById('messageInput');
    if (!messageInput) return;
    
    messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
        messageInput.style.height = 'auto'; 
      }
    });

    messageInput.addEventListener('input', () => {
      messageInput.style.height = 'auto';
      messageInput.style.height = messageInput.scrollHeight + 'px';
      
      if (messageInput.value.trim() && window.socketModule) {
        socketModule.sendTyping(true);
        if (this.typingTimeout) clearTimeout(this.typingTimeout);
        this.typingTimeout = setTimeout(() => socketModule.sendTyping(false), 1000);
      }
    });
  },

  setupContextMenu() {
    const menu = document.getElementById('contextMenu');
    document.addEventListener('click', () => { if(menu) menu.style.display = 'none'; });

    const container = document.getElementById('chatMessages');
    if (container) {
        container.addEventListener('contextmenu', (e) => {
            const el = e.target.closest('.message');
            if (el && auth.user && el.querySelector('.message-author').textContent === auth.user.username) {
                e.preventDefault();
                menu.style.display = 'block';
                menu.style.left = `${e.pageX}px`;
                menu.style.top = `${e.pageY}px`;
                menu.dataset.targetId = el.dataset.messageId;
            }
        });
    }

    const deleteBtn = menu ? menu.querySelector('[data-action="delete"]') : null;
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            this.deleteMessage(menu.dataset.targetId);
        });
    }
  },

  async deleteMessage(id) {
      if(!confirm('حذف؟')) return;
      await fetch(`${API_URL}/messages/${id}`, { method: 'DELETE', headers: auth.getAuthHeader() });
  },

  setupEmojiPicker() {
    const btn = document.getElementById('emojiBtn');
    const picker = document.getElementById('emojiPicker');
    const input = document.getElementById('messageInput');
    const grid = document.querySelector('.emoji-grid');

    if (!btn || !picker) return;

    const emojis = ["😀","😂","😍","🔥","👍","❤️","✨","😎","😭","😡"];
    grid.innerHTML = '';
    emojis.forEach(e => {
        const span = document.createElement('span');
        span.textContent = e;
        span.style.cursor = 'pointer';
        grid.appendChild(span);
    });

    btn.addEventListener('click', (e) => { e.stopPropagation(); picker.style.display = picker.style.display === 'none' ? 'block' : 'none'; });
    picker.addEventListener('click', (e) => {
        if(e.target.tagName === 'SPAN') {
            input.value += e.target.textContent;
            input.focus();
        }
    });
    document.addEventListener('click', (e) => { if (!picker.contains(e.target) && e.target !== btn) picker.style.display = 'none'; });
  },

  async loadChannel(channelId) {
    this.currentChannel = channelId;
    if (window.socketModule) socketModule.joinChannel(channelId);
    
    try {
        const res = await fetch(`${API_URL}/messages/channel/${channelId}`, { headers: auth.getAuthHeader() });
        const data = await res.json();
        this.messages = data.messages || [];
        this.renderMessages();
    } catch(e) { console.error(e); }
  },

  renderMessages() {
    const container = document.getElementById('chatMessages');
    const msgs = container.querySelectorAll('.message');
    msgs.forEach(m => m.remove());

    const welcome = container.querySelector('.welcome-message');
    if (this.messages.length > 0) {
        if(welcome) welcome.style.display = 'none';
    } else {
        if(welcome) welcome.style.display = 'block';
    }

    this.messages.forEach(msg => {
      container.appendChild(this.createMessageElement(msg));
    });
    this.scrollToBottom();
  },

  createMessageElement(msg) {
    const div = document.createElement('div');
    div.className = 'message';
    div.dataset.messageId = msg._id || msg.id;
    
    const username = msg.author?.username || 'User';
    
    // ✅ تطبيق اللون بناءً على القيمة القادمة من السيرفر
    // إذا اختار المستخدم "blue"، سيتم تطبيق كلاس .name-col-blue
    const colorKey = msg.author?.nameColor || 'default';
    const nameClass = `message-author name-col-${colorKey}`;

    // حماية النص
    const escapeHtml = (text) => {
        if (!text) return '';
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    };

    // عرض المرفقات
    let attachmentsHtml = '';
    if (msg.attachments && msg.attachments.length > 0) {
        msg.attachments.forEach(file => {
            const url = file.url || file;
            if (/\.(jpg|jpeg|png|gif)$/i.test(url)) {
                attachmentsHtml += `<div class="message-attachment"><img src="${url}" onload="window.chat.scrollToBottom()" onclick="window.open('${url}')"></div>`;
            } else {
                attachmentsHtml += `<div class="message-attachment file-link"><a href="${url}" target="_blank">📄 ملف</a></div>`;
            }
        });
    }

    div.innerHTML = `
      <img src="${msg.author?.avatar || 'assets/default-avatar.svg'}" class="message-avatar">
      <div class="message-content">
        <div class="message-header">
          <span class="${nameClass}">${username}</span> <span class="message-timestamp">${new Date(msg.createdAt).toLocaleTimeString()}</span>
        </div>
        <div class="message-text">${escapeHtml(msg.content)}</div>
        ${attachmentsHtml}
      </div>
    `;
    return div;
  },

  sendMessage() {
    const input = document.getElementById('messageInput');
    const content = input.value.trim();
    if (!content) return;
    if (window.socketModule) {
        socketModule.sendMessage(content);
        input.value = '';
        input.style.height = 'auto';
    }
  },

  receiveMessage(msg) {
    if (msg.channel === this.currentChannel) {
        this.messages.push(msg);
        const container = document.getElementById('chatMessages');
        const welcome = container.querySelector('.welcome-message');
        if(welcome) welcome.style.display = 'none';
        
        container.appendChild(this.createMessageElement(msg));
        this.scrollToBottom();
    }
  },

  scrollToBottom() {
      const c = document.getElementById('chatMessages');
      if(c) setTimeout(() => c.scrollTop = c.scrollHeight, 50);
  }
};

window.chat = chat;