// Socket.IO Module
const socketModule = {
  socket: null,
  currentChannel: null,

  connect() {
    if (!auth.token) {
      console.error('No token available for socket connection');
      return;
    }

    // Connect to socket server
    this.socket = io('http://localhost:3000', {
      auth: {
        token: auth.token
      }
    });

    // Set up event listeners
    this.setupListeners();

    // Join with user info
    this.socket.emit('user-join', { token: auth.token });
  },

  setupListeners() {
    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ متصل بالسيرفر');
      utils.showToast('متصل', 'success');
    });

    this.socket.on('disconnect', () => {
      console.log('❌ غير متصل');
      utils.showToast('انقطع الاتصال', 'warning');
    });

    // Message events
    this.socket.on('new-message', (data) => {
      if (window.chat) {
        window.chat.receiveMessage(data.message);
      }
    });

    // Typing events
    this.socket.on('user-typing', (data) => {
      if (window.chat) {
        window.chat.showTyping(data);
      }
    });

    // User status events
    this.socket.on('user-status', (data) => {
      console.log('User status changed:', data);
      // Update user status in UI
      this.updateUserStatus(data.userId, data.status);
    });

    // Voice channel events
    this.socket.on('user-joined-voice', (data) => {
      utils.showToast(`${data.username} انضم للقناة الصوتية`, 'success');
    });

    // Error events
    this.socket.on('message-error', (data) => {
      utils.showToast(data.error, 'error');
    });
  },

  joinChannel(channelId) {
    if (!this.socket) return;
    
    this.currentChannel = channelId;
    this.socket.emit('join-channel', { channelId });
  },

  sendMessage(content, attachments = []) {
    if (!this.socket || !this.currentChannel) return;

    this.socket.emit('send-message', {
      content,
      channelId: this.currentChannel,
      attachments,
      token: auth.token
    });
  },

  sendTyping(isTyping) {
    if (!this.socket || !this.currentChannel) return;

    this.socket.emit('typing', {
      channelId: this.currentChannel,
      isTyping
    });
  },

  joinVoice(channelId) {
    if (!this.socket) return;

    this.socket.emit('join-voice', { channelId });
    utils.showToast('انضممت للقناة الصوتية', 'success');
  },

  updateUserStatus(userId, status) {
    // Update status in members list
    const members = document.querySelectorAll('.member');
    members.forEach(member => {
      const memberUserId = member.dataset.userId;
      if (memberUserId === userId) {
        const statusEl = member.querySelector('.member-status');
        if (statusEl) {
          statusEl.textContent = status === 'online' ? 'متصل' : 'غير متصل';
          statusEl.className = `member-status ${status}`;
        }
      }
    });
  },

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
};

// Export
window.socketModule = socketModule;
window.socket = socketModule.socket;
