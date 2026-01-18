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
    this.loadServers();
    this.updateUserBar();
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
    const muteBtn = document.getElementById('muteBtn');
    const deafenBtn = document.getElementById('deafenBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsBtn = document.getElementById('closeSettingsModal');
    const settingsForm = document.getElementById('settingsForm');
    const logoutBtn = document.getElementById('logoutBtn');

    // أزرار الصوت
    if (muteBtn) {
        muteBtn.addEventListener('click', () => {
            muteBtn.classList.toggle('active');
            muteBtn.querySelector('i').className = muteBtn.classList.contains('active') ? 'fas fa-microphone-slash' : 'fas fa-microphone';
        });
    }
    if (deafenBtn) {
        deafenBtn.addEventListener('click', () => {
            deafenBtn.classList.toggle('active');
            deafenBtn.querySelector('i').className = deafenBtn.classList.contains('active') ? 'fas fa-headphones-slash' : 'fas fa-headphones';
        });
    }

    // فتح الإعدادات وتعبئة البيانات
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            if(auth.user) {
                document.getElementById('settingsUsername').value = auth.user.username;
                document.getElementById('settingsAvatar').value = auth.user.avatar || '';
                
                // ✅ تحديث صورة المعاينة عند فتح الإعدادات
                const previewAvatar = document.querySelector('#settingsModal .member-avatar');
                if (previewAvatar) previewAvatar.src = utils.getAvatarUrl(auth.user.avatar);

                // ✅ تعبئة اللون الحالي في القائمة
                const colorSelect = document.getElementById('settingsNameColor');
                if (colorSelect) colorSelect.value = auth.user.nameColor || 'default';
                
                settingsModal.classList.add('active');
            }
        });
    }

    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', () => settingsModal.classList.remove('active'));
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('هل أنت متأكد من الخروج؟')) auth.logout();
        });
    }

    if (settingsForm) {
        // Avatar upload
        const uploadAvatarBtn = document.getElementById('uploadAvatarBtn');
        const avatarInput = document.getElementById('avatarFileInput');
        const avatarUrlInput = document.getElementById('settingsAvatar');
        
        if (uploadAvatarBtn && avatarInput) {
            uploadAvatarBtn.onclick = () => avatarInput.click();
            avatarUrlInput.onchange = () => {
                const previewAvatar = document.querySelector('#settingsModal .member-avatar');
                if (previewAvatar) previewAvatar.src = utils.getAvatarUrl(avatarUrlInput.value);
            };
            
            avatarInput.onchange = async () => {
                if (avatarInput.files.length > 0) {
                    const formData = new FormData();
                    formData.append('file', avatarInput.files[0]);
                    utils.showToast('جاري الرفع...', 'info');
                    try {
                        const res = await fetch(`${API_URL}/upload`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${auth.token}` },
                            body: formData
                        });
                        const data = await res.json();
                        if (data.url) {
                            avatarUrlInput.value = data.url;
                            // Update preview immediately if possible
                            const previewAvatar = document.querySelector('#settingsModal .member-avatar');
                            if (previewAvatar) previewAvatar.src = utils.getAvatarUrl(data.url);
                            utils.showToast('تم رفع الصورة بنجاح', 'success');
                        }
                    } catch (err) {
                        console.error(err);
                        utils.showToast('فشل رفع الصورة', 'error');
                    }
                }
            };
        }

        // Admin tool: Delete all messages
        const deleteAllBtn = document.getElementById('deleteAllMsgsBtn');
        if (deleteAllBtn) {
            deleteAllBtn.onclick = async () => {
                if (confirm('هل أنت متأكد من حذف جميع الرسائل؟ لا يمكن التراجع!')) {
                    try {
                        await fetch(`${API_URL}/messages/all`, {
                            method: 'DELETE',
                            headers: auth.getAuthHeader()
                        });
                        utils.showToast('تم مسح جميع الرسائل', 'success');
                    } catch (err) {
                        console.error(err);
                        utils.showToast('فشل حذف الرسائل', 'error');
                    }
                }
            };
        }

        // Show admin tools if owner
        if (auth.user?.role === 'owner') {
            const adminTools = document.getElementById('adminTools');
            if (adminTools) adminTools.style.display = 'block';
        }

        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('settingsUsername').value;
            const avatar = document.getElementById('settingsAvatar').value;
            const nameColor = document.getElementById('settingsNameColor').value; // ✅ أخذ القيمة من القائمة

            try {
                const response = await fetch(`${API_URL}/auth/profile`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        ...auth.getAuthHeader()
                    },
                    body: JSON.stringify({ username, avatar, nameColor }) // ✅ إرسال nameColor
                });

                const data = await response.json();
                if (!response.ok) throw new Error(data.error);

                // تحديث البيانات محلياً
                auth.user = { ...auth.user, ...data.user };
                localStorage.setItem('user', JSON.stringify(auth.user));
                
                this.updateMembersList();
                settingsModal.classList.remove('active');
                alert('تم حفظ التغييرات بنجاح!');
                
                // تحديث الصفحة لرؤية التغيير فوراً
                location.reload(); 
                
            } catch (error) {
                alert(error.message);
            }
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

  async loadServers() {
    try {
      const response = await fetch(`${API_URL}/servers`, { headers: auth.getAuthHeader() });
      if (!response.ok) throw new Error('فشل التحميل');
      const servers = await response.json();
      this.renderServers(servers);
      this.updateMembersList();
    } catch (error) {
      console.error('Server load error:', error);
    }
  },

  renderServers(servers) {
    const serversList = document.getElementById('serversList');
    if (!serversList) return;
    serversList.innerHTML = '';
    servers.forEach(server => {
      const serverEl = document.createElement('div');
      serverEl.className = 'server-icon';
      serverEl.textContent = server.name.charAt(0).toUpperCase();
      serversList.appendChild(serverEl);
    });
  },

  updateMembersList() {
    const member = document.getElementById('currentUserMember');
    if (member && auth.user) {
      member.querySelector('.member-avatar').src = utils.getAvatarUrl(auth.user.avatar);
      member.querySelector('.member-avatar').onerror = function() { this.src = 'assets/default-avatar.svg'; };
      const nameEl = member.querySelector('.member-name');
      nameEl.textContent = auth.user.username;
      
      // ✅ تطبيق اللون في القائمة الجانبية
      nameEl.className = 'member-name'; 
      if (auth.user.nameColor && auth.user.nameColor !== 'default') {
          nameEl.classList.add(`name-col-${auth.user.nameColor}`);
      }
    }
  },

  loadMembers() {
    this.updateMembersList();
  },

  updateUserBar() {
    const avatar = document.getElementById('userAvatar');
    const username = document.getElementById('currentUsername');
    if (auth.user) {
      if (avatar) {
        avatar.src = utils.getAvatarUrl(auth.user.avatar);
        avatar.onerror = function() { this.src = 'assets/default-avatar.svg'; };
      }
      if (username) {
        username.textContent = auth.user.username;
        username.className = 'username';
        if (auth.user.nameColor && auth.user.nameColor !== 'default') {
          username.classList.add(`name-col-${auth.user.nameColor}`);
        }
      }
    }
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}
window.app = app;