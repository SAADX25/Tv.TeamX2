// Main App Module
const app = {
  init() {
    console.log('🚀 Initializing TeamX2 Chat...');

    // Initialize modules
    auth.init();
    
    // Only initialize other modules if user is logged in
    if (auth.token) {
      this.initializeApp();
    }
  },

  initializeApp() {
    chat.init();
    fileUpload.init();
    
    this.setupChannels();
    this.setupUserControls();
    this.setupMembersToggle();
    this.loadServers();
  },

  setupChannels() {
    const channels = document.querySelectorAll('.channel');
    
    channels.forEach(channel => {
      channel.addEventListener('click', () => {
        const channelId = channel.dataset.channelId;
        const channelType = channel.dataset.type;
        
        if (channelType === 'voice') {
          // Join voice channel
          socketModule.joinVoice(channelId);
        } else {
          // Load text channel
          chat.loadChannel(channelId);
        }
      });
    });
  },

  setupUserControls() {
    const muteBtn = document.getElementById('muteBtn');
    const deafenBtn = document.getElementById('deafenBtn');
    const settingsBtn = document.getElementById('settingsBtn');

    // Mute microphone
    muteBtn.addEventListener('click', () => {
      muteBtn.classList.toggle('active');
      const icon = muteBtn.querySelector('i');
      
      if (muteBtn.classList.contains('active')) {
        icon.className = 'fas fa-microphone-slash';
        utils.showToast('تم كتم الميكروفون', 'warning');
      } else {
        icon.className = 'fas fa-microphone';
        utils.showToast('تم تشغيل الميكروفون', 'success');
      }
    });

    // Deafen headphones
    deafenBtn.addEventListener('click', () => {
      deafenBtn.classList.toggle('active');
      const icon = deafenBtn.querySelector('i');
      
      if (deafenBtn.classList.contains('active')) {
        icon.className = 'fas fa-headphones-slash';
        utils.showToast('تم كتم السماعات', 'warning');
        // Also mute microphone
        muteBtn.classList.add('active');
        muteBtn.querySelector('i').className = 'fas fa-microphone-slash';
      } else {
        icon.className = 'fas fa-headphones';
        utils.showToast('تم تشغيل السماعات', 'success');
      }
    });

    // Settings (logout for now)
    settingsBtn.addEventListener('click', () => {
      if (confirm('هل تريد تسجيل الخروج؟')) {
        auth.logout();
      }
    });
  },

  setupMembersToggle() {
    const toggleMembersBtn = document.getElementById('toggleMembersBtn');
    const membersSidebar = document.getElementById('membersSidebar');

    toggleMembersBtn.addEventListener('click', () => {
      membersSidebar.classList.toggle('active');
    });

    // Close on outside click (mobile)
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 1024) {
        if (!membersSidebar.contains(e.target) && e.target !== toggleMembersBtn && !toggleMembersBtn.contains(e.target)) {
          membersSidebar.classList.remove('active');
        }
      }
    });
  },

  async loadServers() {
    // For now, we'll use dummy data since we don't have a servers endpoint yet
    // In a real app, this would fetch from the API
    console.log('Loading servers...');
    
    // Update current user in members list
    this.updateMembersList();
  },

  updateMembersList() {
    const currentUserMember = document.getElementById('currentUserMember');
    if (currentUserMember && auth.user) {
      const avatar = currentUserMember.querySelector('.member-avatar');
      const name = currentUserMember.querySelector('.member-name');
      
      avatar.src = `assets/${auth.user.avatar}`;
      name.textContent = auth.user.username;
    }
  }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    app.init();
  });
} else {
  app.init();
}

// Export
window.app = app;
