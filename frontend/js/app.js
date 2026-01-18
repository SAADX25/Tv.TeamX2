// frontend/js/app.js
const app = {
  init() {
    console.log('🚀 Initializing TeamX2 Chat...');
    auth.init();
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
    this.loadServers(); // ✅ سيتم استدعاء الدالة المحدثة
  },

  setupChannels() {
    const channels = document.querySelectorAll('.channel');
    channels.forEach(channel => {
      channel.addEventListener('click', () => {
        const channelId = channel.dataset.channelId;
        if (channel.dataset.type === 'voice') {
          socketModule.joinVoice(channelId);
        } else {
          chat.loadChannel(channelId);
        }
      });
    });
  },

  setupUserControls() {
    // ... (نفس الكود السابق لأزرار الميكروفون والسماعة) ...
    const muteBtn = document.getElementById('muteBtn');
    const deafenBtn = document.getElementById('deafenBtn');
    const settingsBtn = document.getElementById('settingsBtn');

    if (muteBtn) {
        muteBtn.addEventListener('click', () => {
        muteBtn.classList.toggle('active');
        const icon = muteBtn.querySelector('i');
        icon.className = muteBtn.classList.contains('active') ? 'fas fa-microphone-slash' : 'fas fa-microphone';
        });
    }
    
    if (deafenBtn) {
        deafenBtn.addEventListener('click', () => {
        deafenBtn.classList.toggle('active');
        const icon = deafenBtn.querySelector('i');
        icon.className = deafenBtn.classList.contains('active') ? 'fas fa-headphones-slash' : 'fas fa-headphones';
        });
    }

    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
        if (confirm('هل تريد تسجيل الخروج؟')) auth.logout();
        });
    }
  },

  setupMembersToggle() {
    const btn = document.getElementById('toggleMembersBtn');
    const sidebar = document.getElementById('membersSidebar');
    if (btn && sidebar) {
      btn.addEventListener('click', () => sidebar.classList.toggle('active'));
    }
  },

  // ✅ الدالة المحدثة لجلب السيرفرات من الـ API
  async loadServers() {
    try {
      console.log('🔄 جاري تحميل السيرفرات...');
      const response = await fetch(`${API_URL}/servers`, {
        headers: auth.getAuthHeader()
      });

      if (!response.ok) throw new Error('فشل تحميل السيرفرات');

      const servers = await response.json();
      this.renderServers(servers);
      this.updateMembersList();

    } catch (error) {
      console.error('Server load error:', error);
      // utils.showToast('لم نتمكن من تحميل قائمة السيرفرات', 'error');
    }
  },

  // ✅ دالة جديدة لعرض السيرفرات في الشريط الجانبي
  renderServers(servers) {
    const serversList = document.getElementById('serversList');
    if (!serversList) return;
    
    serversList.innerHTML = ''; // مسح القائمة الحالية

    servers.forEach(server => {
      const serverEl = document.createElement('div');
      serverEl.className = 'server-icon';
      serverEl.title = server.name;
      serverEl.dataset.serverId = server._id;

      // إذا كان هناك صورة للسيرفر نعرضها، وإلا نعرض أول حرف
      if (server.icon) {
        serverEl.style.backgroundImage = `url(${server.icon})`;
        serverEl.style.backgroundSize = 'cover';
        serverEl.style.backgroundPosition = 'center';
      } else {
        serverEl.textContent = server.name.charAt(0).toUpperCase();
        serverEl.style.display = 'flex';
        serverEl.style.alignItems = 'center';
        serverEl.style.justifyContent = 'center';
        serverEl.style.fontWeight = 'bold';
      }

      // تفعيل السيرفر عند الضغط عليه
      serverEl.addEventListener('click', () => {
        document.querySelectorAll('.server-icon').forEach(s => s.classList.remove('active'));
        serverEl.classList.add('active');
        console.log('Selected server:', server.name);
        // هنا يمكنك إضافة منطق لجلب قنوات هذا السيرفر مستقبلاً
      });

      serversList.appendChild(serverEl);
    });
  },

  updateMembersList() {
    const currentUserMember = document.getElementById('currentUserMember');
    if (currentUserMember && auth.user) {
      const avatar = currentUserMember.querySelector('.member-avatar');
      const name = currentUserMember.querySelector('.member-name');
      avatar.src = auth.user.avatar || 'assets/default-avatar.svg';
      name.textContent = auth.user.username;
    }
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}

window.app = app;