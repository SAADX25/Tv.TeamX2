const chat = {
  currentChannel: null,
  messages: [],
  typingUsers: new Set(),

  init() {
    this.setupMessageInput();
    this.setupEmojiPicker();
    this.setupContextMenu();
    
    // استخدام معرف القناة الموجود في ملف HTML الخاص بك
    this.loadChannel('696c89cd48e7684bf3ddb21f');
  },

  setupMessageInput() {
    const messageInput = document.getElementById('messageInput');
    if (!messageInput) return;
    
    // إرسال عند ضغط Enter
    messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // مؤشر الكتابة
    messageInput.addEventListener('input', () => {
      if (messageInput.value.trim() && window.socketModule) {
        socketModule.sendTyping(true);
        setTimeout(() => socketModule.sendTyping(false), 1000);
      }
    });
  },

  setupEmojiPicker() {
    const emojiBtn = document.getElementById('emojiBtn');
    const emojiPicker = document.getElementById('emojiPicker');
    const messageInput = document.getElementById('messageInput');
    const emojiGrid = document.querySelector('.emoji-grid');

    if (!emojiBtn || !emojiPicker || !emojiGrid) return;

    // قائمة الإيموجي
    const emojis = [
      "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇",
      "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚",
      "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩",
      "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣",
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔",
      "👍", "👎", "👊", "✊", "🤛", "🤜", "🤞", "✌️", "🤟", "🤘",
      "🔥", "✨", "🌟", "💫", "💥", "💢", "💦", "💧", "💤", "💨"
    ];

    // مسح النص القديم وإضافة الإيموجي كعناصر
    emojiGrid.innerHTML = '';
    emojis.forEach(emoji => {
      const span = document.createElement('span');
      span.textContent = emoji;
      span.style.cursor = 'pointer';
      emojiGrid.appendChild(span);
    });

    // فتح/إغلاق القائمة
    emojiBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      emojiPicker.style.display = emojiPicker.style.display === 'none' ? 'block' : 'none';
    });

    // عند الضغط على إيموجي
    emojiPicker.addEventListener('click', (e) => {
      if (e.target.tagName === 'SPAN') { 
        const emoji = e.target.textContent;
        messageInput.value += emoji;
        messageInput.focus();
      }
    });

    document.addEventListener('click', (e) => {
      if (!emojiPicker.contains(e.target) && e.target !== emojiBtn) {
        emojiPicker.style.display = 'none';
      }
    });
  },

  setupContextMenu() {
    // كود القائمة المنبثقة
  },

  async loadChannel(channelId) {
    if (!channelId) return;
    this.currentChannel = channelId;
    
    document.querySelectorAll('.channel').forEach(ch => ch.classList.remove('active'));
    const activeChannel = document.querySelector(`.channel[data-channel-id="${channelId}"]`);
    
    if (activeChannel) {
      activeChannel.classList.add('active');
      const name = activeChannel.querySelector('span').textContent;
      const channelNameEl = document.getElementById('currentChannelName');
      if (channelNameEl) channelNameEl.textContent = name;
      const inputEl = document.getElementById('messageInput');
      if (inputEl) inputEl.placeholder = `أرسل رسالة إلى #${name}`;
    }

    if (window.socketModule) {
        socketModule.joinChannel(channelId);
    }

    await this.loadMessages(channelId);
  },

  async loadMessages(channelId) {
    try {
      const response = await fetch(`${API_URL}/messages/channel/${channelId}`, {
        headers: auth.getAuthHeader()
      });

      if (!response.ok) throw new Error('فشل التحميل');

      const data = await response.json();
      this.messages = data.messages || [];
      this.renderMessages();
    } catch (error) {
      console.error(error);
      this.messages = [];
      this.renderMessages();
    }
  },

  renderMessages() {
    const container = document.getElementById('chatMessages');
    if (!container) return;

    const msgs = container.querySelectorAll('.message');
    msgs.forEach(m => m.remove());

    const welcome = container.querySelector('.welcome-message');
    // إخفاء الترحيب إذا كانت هناك رسائل
    if (this.messages.length > 0) {
        if(welcome) welcome.style.display = 'none';
    } else {
        if(welcome) welcome.style.display = 'block';
    }

    this.messages.forEach(msg => {
      const el = this.createMessageElement(msg);
      container.appendChild(el);
    });
    
    container.scrollTop = container.scrollHeight;
  },

  createMessageElement(message) {
    const div = document.createElement('div');
    div.className = 'message';
    
    const avatar = message.author?.avatar || 'default-avatar.svg';
    const username = message.author?.username || 'مستخدم';
    const date = new Date(message.createdAt);
    const time = date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    div.innerHTML = `
      <img src="assets/${avatar}" class="message-avatar">
      <div class="message-content">
        <div class="message-header">
          <span class="message-author">${username}</span>
          <span class="message-timestamp">${time}</span>
        </div>
        <div class="message-text">${message.content}</div>
      </div>
    `;
    return div;
  },

  sendMessage() {
    const input = document.getElementById('messageInput');
    const content = input.value.trim();
    
    if (!content) return;

    // ✅ التعديل الحاسم هنا:
    // نستخدم Socket للإرسال بدلاً من fetch
    // السوكت سيقوم بالحفظ في قاعدة البيانات + إظهار الرسالة فوراً
    if (window.socketModule) {
        socketModule.sendMessage(content);
        input.value = ''; // مسح الخانة فوراً
    } else {
        console.error("Socket not connected");
    }
  },

  // هذه الدالة يتم استدعاؤها تلقائياً عند وصول رسالة جديدة من السوكت
  receiveMessage(message) {
    if (message.channel === this.currentChannel) {
      this.messages.push(message);
      const el = this.createMessageElement(message);
      const container = document.getElementById('chatMessages');
      
      const welcome = container.querySelector('.welcome-message');
      if (welcome) welcome.style.display = 'none';

      container.appendChild(el);
      container.scrollTop = container.scrollHeight;
    }
  },
  
  showTyping(data) {
     // كود الكتابة...
  }
};

window.chat = chat;