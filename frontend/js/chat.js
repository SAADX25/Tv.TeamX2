const chat = {
  currentChannel: null,
  messages: [],
  typingUsers: new Set(),
  typingTimeout: null,
  replyingTo: null,

  init() {
    this.setupMessageInput();
    this.setupEmojiPicker();
    this.setupContextMenu();
    this.setupReactions();
    this.setupVoiceNotes();
    this.setupMobileMenu();
    this.setupChannelManagement();
    this.loadChannels();
    
    const clearBtn = document.getElementById('clearMessagesBtn');
    if (clearBtn) {
        clearBtn.onclick = () => this.clearMessages();
    }

    if (window.socketModule && socketModule.socket) {
        socketModule.socket.on('voice-user-joined', (data) => this.handleVoiceUserJoined(data));
        socketModule.socket.on('voice-user-left', (data) => this.handleVoiceUserLeft(data));
        socketModule.socket.on('channel-created', () => this.loadChannels());
        socketModule.socket.on('channel-updated', () => this.loadChannels());
        socketModule.socket.on('channel-deleted', () => this.loadChannels());
        
        socketModule.socket.on('all-messages-deleted-in-channel', ({ channelId }) => {
            if (this.currentChannel === channelId) {
                const container = document.getElementById('chatMessages');
                if (container) {
                  const msgs = container.querySelectorAll('.message');
                  msgs.forEach(m => m.remove());
                  const welcome = container.querySelector('.welcome-message');
                  if(welcome) welcome.style.display = 'block';
                }
                this.messages = [];
                utils.showToast('تم مسح جميع رسائل هذه القناة من قبل المسؤول', 'info');
            }
        });

        socketModule.socket.on('all-messages-deleted', () => {
            const container = document.getElementById('chatMessages');
            if (container) {
              const msgs = container.querySelectorAll('.message');
              msgs.forEach(m => m.remove());
              const welcome = container.querySelector('.welcome-message');
              if(welcome) welcome.style.display = 'block';
            }
            this.messages = [];
            utils.showToast('تم مسح جميع الرسائل من قبل المسؤول', 'info');
        });

        socketModule.socket.on('message-deleted', ({ messageId }) => {
            const el = document.querySelector(`.message[data-message-id="${messageId}"]`);
            if (el) el.remove();
        });
        
        socketModule.socket.on('new-message', ({ message }) => {
            this.receiveMessage(message);
        });

        socketModule.socket.on('message-reaction', ({ messageId, reactions }) => {
            this.updateReactions(messageId, reactions);
        });
    }
  },

  setupReactions() {
    const container = document.getElementById('chatMessages');
    if (!container) return;

    container.addEventListener('click', async (e) => {
      const reaction = e.target.closest('.reaction');
      if (reaction) {
        const messageEl = reaction.closest('.message');
        const messageId = messageEl?.dataset.messageId;
        const emoji = reaction.dataset.emoji;
        if (messageId && emoji) {
          await this.toggleReaction(messageId, emoji);
        }
      }

      const addReactionBtn = e.target.closest('.add-reaction-btn');
      if (addReactionBtn) {
        const messageEl = addReactionBtn.closest('.message');
        this.showReactionPicker(messageEl);
      }
    });
  },

  async toggleReaction(messageId, emoji) {
    try {
      await fetch(`${API_URL}/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: auth.getAuthHeader(),
        body: JSON.stringify({ emoji })
      });
    } catch (error) {
      console.error('Reaction error:', error);
    }
  },

  updateReactions(messageId, reactions) {
    const messageEl = document.querySelector(`.message[data-message-id="${messageId}"]`);
    if (!messageEl) return;
    
    const container = messageEl.querySelector('.message-reactions');
    if (!container) return;

    container.innerHTML = reactions.map(r => 
      `<span class="reaction ${r.users.includes(auth.user?.id) ? 'active' : ''}" data-emoji="${r.emoji}">
        ${r.emoji} <span class="reaction-count">${r.users.length}</span>
      </span>`
    ).join('') + '<button class="add-reaction-btn" title="Add Reaction">+</button>';
  },

  showReactionPicker(messageEl) {
    const quickEmojis = ['👍', '❤️', '😂', '😮', '😢', '😡', '🔥', '✨'];
    const messageId = messageEl?.dataset.messageId;
    
    const existing = document.querySelector('.reaction-picker');
    if (existing) existing.remove();

    const picker = document.createElement('div');
    picker.className = 'reaction-picker';
    picker.innerHTML = quickEmojis.map(e => `<span class="reaction-option" data-emoji="${e}">${e}</span>`).join('');
    picker.style.cssText = 'position:absolute;background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:8px;padding:8px;display:flex;gap:4px;z-index:100;';
    
    messageEl.style.position = 'relative';
    messageEl.appendChild(picker);

    picker.addEventListener('click', async (e) => {
      const opt = e.target.closest('.reaction-option');
      if (opt && messageId) {
        await this.toggleReaction(messageId, opt.dataset.emoji);
        picker.remove();
      }
    });

    setTimeout(() => {
      document.addEventListener('click', function handler(e) {
        if (!picker.contains(e.target)) {
          picker.remove();
          document.removeEventListener('click', handler);
        }
      });
    }, 100);
  },

  setReplyTo(messageId) {
    const msg = this.messages.find(m => (m._id || m.id) === messageId);
    if (!msg) return;

    this.replyingTo = msg;
    
    let preview = document.querySelector('.reply-preview');
    if (!preview) {
      preview = document.createElement('div');
      preview.className = 'reply-preview';
      const inputContainer = document.querySelector('.message-input-container');
      inputContainer?.parentNode.insertBefore(preview, inputContainer);
    }

    preview.innerHTML = `
      <i class="fas fa-reply"></i>
      <span class="reply-author">${msg.author?.username || 'User'}</span>
      <span class="reply-content">${msg.content?.substring(0, 50) || ''}${msg.content?.length > 50 ? '...' : ''}</span>
      <button class="close-reply"><i class="fas fa-times"></i></button>
    `;

    preview.querySelector('.close-reply').onclick = () => this.cancelReply();
    document.getElementById('messageInput')?.focus();
  },

  cancelReply() {
    this.replyingTo = null;
    document.querySelector('.reply-preview')?.remove();
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
            if (el) {
                e.preventDefault();
                menu.style.display = 'block';
                menu.style.left = `${e.pageX}px`;
                menu.style.top = `${e.pageY}px`;
                menu.dataset.targetId = el.dataset.messageId;
                
                const isOwn = el.querySelector('.message-author')?.textContent === auth.user?.username;
                const deleteItem = menu.querySelector('[data-action="delete"]');
                const editItem = menu.querySelector('[data-action="edit"]');
                if (deleteItem) deleteItem.style.display = isOwn ? 'flex' : 'none';
                if (editItem) editItem.style.display = isOwn ? 'flex' : 'none';
            }
        });
    }

    const deleteBtn = menu ? menu.querySelector('[data-action="delete"]') : null;
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            this.deleteMessage(menu.dataset.targetId);
        });
    }

    const replyBtn = menu ? menu.querySelector('[data-action="reply"]') : null;
    if (replyBtn) {
        replyBtn.addEventListener('click', () => {
            this.setReplyTo(menu.dataset.targetId);
            menu.style.display = 'none';
        });
    }

    const copyBtn = menu ? menu.querySelector('[data-action="copy"]') : null;
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const msg = this.messages.find(m => (m._id || m.id) === menu.dataset.targetId);
            if (msg?.content) {
                navigator.clipboard.writeText(msg.content);
                utils.showToast('تم النسخ', 'success');
            }
            menu.style.display = 'none';
        });
    }
  },

  async loadChannels() {
    try {
      // ✅ جلب أول سيرفر متاح للمستخدم بدلاً من المعرف الثابت
      let serverId = localStorage.getItem('currentServerId');
      
      if (!serverId) {
        const serverRes = await fetch(`${API_URL}/servers`, { headers: auth.getAuthHeader() });
        const servers = await serverRes.json();
        if (servers && servers.length > 0) {
          serverId = servers[0]._id || servers[0].id;
          localStorage.setItem('currentServerId', serverId);
        }
      }

      if (!serverId) return;

      const res = await fetch(`${API_URL}/channels/server/${serverId}`, { headers: auth.getAuthHeader() });
      const data = await res.json();
      const channels = data.channels || [];
      this.renderChannels(channels);
      
      // Load first text channel by default if none selected
      if (!this.currentChannel && channels.length > 0) {
        const firstText = channels.find(c => c.type === 'text');
        if (firstText) this.loadChannel(firstText._id);
      }
    } catch (error) {
      console.error('Load channels error:', error);
    }
  },

  renderChannels(channels) {
    const textList = document.getElementById('textChannelsList');
    const voiceList = document.getElementById('voiceChannelsList');
    if (!textList || !voiceList) return;

    textList.innerHTML = '';
    voiceList.innerHTML = '';

    channels.forEach(ch => {
      const div = document.createElement('div');
      div.className = `channel ${this.currentChannel === ch._id ? 'active' : ''}`;
      div.dataset.channelId = ch._id;
      div.dataset.type = ch.type;
      
      const icon = ch.type === 'voice' ? 'fa-volume-up' : 'fa-hashtag';
      div.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${ch.name}</span>
        <button class="channel-settings-btn" title="إعدادات القناة">
          <i class="fas fa-cog"></i>
        </button>
      `;

      if (ch.type === 'voice') {
        const usersDiv = document.createElement('div');
        usersDiv.className = 'voice-users';
        usersDiv.id = `voice-users-${ch._id}`;
        voiceList.appendChild(div);
        voiceList.appendChild(usersDiv);
      } else {
        textList.appendChild(div);
      }

      div.onclick = (e) => {
        if (e.target.closest('.channel-settings-btn')) return;
        if (ch.type === 'voice') {
          socketModule.socket.emit('join-voice', { channelId: ch._id });
        } else {
          this.loadChannel(ch._id);
          document.querySelectorAll('.channel').forEach(c => c.classList.remove('active'));
          div.classList.add('active');
        }
      };

      div.querySelector('.channel-settings-btn').onclick = (e) => {
        e.stopPropagation();
        this.showChannelModal(ch);
      };
    });
  },

  setupChannelManagement() {
    const modal = document.getElementById('channelModal');
    const form = document.getElementById('channelForm');
    const closeBtn = document.getElementById('closeChannelModal');
    const addBtns = document.querySelectorAll('.add-channel-btn');
    const deleteBtn = document.getElementById('deleteChannelBtn');

    addBtns.forEach(btn => {
      btn.onclick = () => {
        this.showChannelModal({ type: btn.dataset.type });
      };
    });

    if(closeBtn) closeBtn.onclick = () => modal.classList.remove('active');
    
    if(form) form.onsubmit = async (e) => {
      e.preventDefault();
      const id = document.getElementById('channelIdInput').value;
      const name = document.getElementById('channelNameInput').value;
      const type = document.getElementById('channelTypeInput').value;
      const serverId = localStorage.getItem('currentServerId');

      try {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_URL}/channels/${id}` : `${API_URL}/channels`;
        await fetch(url, {
          method,
          headers: auth.getAuthHeader(),
          body: JSON.stringify({ name, type, serverId })
        });
        modal.classList.remove('active');
        // ✅ تحديث القائمة فوراً بعد الإنشاء أو التعديل
        this.loadChannels();
      } catch (error) {
        utils.showToast('خطأ في العملية', 'error');
      }
    };

    if(deleteBtn) deleteBtn.onclick = async () => {
      const id = document.getElementById('channelIdInput').value;
      if (!confirm('هل أنت متأكد من حذف هذه القناة؟')) return;
      try {
        await fetch(`${API_URL}/channels/${id}`, {
          method: 'DELETE',
          headers: auth.getAuthHeader()
        });
        modal.classList.remove('active');
      } catch (error) {
        utils.showToast('خطأ في الحذف', 'error');
      }
    };
  },

  showChannelModal(ch = {}) {
    const modal = document.getElementById('channelModal');
    const title = document.getElementById('channelModalTitle');
    const nameInput = document.getElementById('channelNameInput');
    const idInput = document.getElementById('channelIdInput');
    const typeInput = document.getElementById('channelTypeInput');
    const submitBtn = document.getElementById('channelSubmitBtn');
    const deleteBtn = document.getElementById('deleteChannelBtn');

    if(!modal) return;

    idInput.value = ch._id || '';
    nameInput.value = ch.name || '';
    typeInput.value = ch.type || 'text';
    
    title.textContent = ch._id ? 'تعديل القناة' : `إنشاء قناة ${ch.type === 'voice' ? 'صوتية' : 'نصية'} جديدة`;
    submitBtn.innerHTML = ch._id ? '<i class="fas fa-save"></i> حفظ التغييرات' : '<i class="fas fa-plus-circle"></i> إنشاء القناة';
    deleteBtn.style.display = ch._id ? 'block' : 'none';

    modal.classList.add('active');
    nameInput.focus();
  },

  handleVoiceUserJoined({ channelId, user }) {
    const container = document.getElementById(`voice-users-${channelId}`);
    if (!container) return;
    
    const existing = container.querySelector(`[data-user-id="${user.id}"]`);
    if (existing) existing.remove();

    const div = document.createElement('div');
    div.className = 'voice-user';
    div.dataset.userId = user.id;
    div.innerHTML = `
      <img src="${utils.getAvatarUrl(user.avatar)}" onerror="this.src='assets/default-avatar.svg'">
      <span>${user.username}</span>
    `;
    container.appendChild(div);
  },

  handleVoiceUserLeft({ channelId, userId }) {
    const container = document.getElementById(`voice-users-${channelId}`);
    if (!container) return;
    const el = container.querySelector(`[data-user-id="${userId}"]`);
    if (el) el.remove();
  },

  async deleteMessage(id) {
    if(!confirm('حذف؟')) return;
    await fetch(`${API_URL}/messages/${id}`, { method: 'DELETE', headers: auth.getAuthHeader() });
  },

  setupEmojiPicker() {
    const btn = document.getElementById('emojiBtn');
    const picker = document.getElementById('emojiPicker');
    const input = document.getElementById('messageInput');
    const grid = document.getElementById('emojiGrid');
    const searchInput = document.getElementById('emojiSearch');
    const tabs = document.querySelectorAll('.emoji-tab');

    if (!btn || !picker || !grid) return;

    const emojiData = {
      smileys: ["😀","😂","😍","🤣","😊","😇","🙂","😉","😌","🥰","😘","😗","😙","😚","😋","😛","😝","😜","🤪","🤨","🧐","🤓","😎","🤩","🥳","😏","😒","😞","😔","😟","😕","🙁","☹️","😣","😖","😫","😩","🥺","😢","😭","😤","😠","😡","🤬","🤯","😳","🥵","🥶","😱","😨","😰","😥","😓","🤗","🤔","🤭","🤫","🤥","😶","😐","😑","😬","🙄","😯","😦","😧","😮","😲","🥱","😴","🤤","😪","😵","🤐","🥴","🤢","🤮","🤧"],
      animals: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐽","🐸","🐵","🙈","🙉","🙊","🐒","🐔","🐧","🐦","🐤","🐣","🐥","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝","🐛","🦋","🐌","🐞","🐜","🦟","🦗","🕷","🕸","🦂","🐢","🐍","🦎","🦖","🦕","🐙","🦑","🦐","🦞","🦀","🐡","🐠","🐟","🐬","🐳","🐋","🦈","🐊","🐅","🐆","🦓","🦍","🐘","🦏","🦛","🐪","🐫","🦒","🦘","🐃","🐂","🐄","🐎","🐖","🐏","🐑","🦙","🐐","🦌","🐕","🐩","🐈","🐓","🦃","🦚","🦜","🦢","🕊","🐇","🦝","🦡","🦦","🦥","🐿","🐀","🐁","🐾","🐉","🐲","🌵","🎄","🌲","🌳","🌴","🌱","🌿","☘️","🍀","🎍","🎋","🍃","🍂","🍁","🍄","🐚","🌾","💐","🌷","🌹","🥀","🌺","🌸","🌼","🌻","🌞","🌝","🌛","🌜","🌚","🌕","🌖","🌗","🌘","🌑","🌒","🌓","🌔","🌙","🌎","🌍","🌏","🪐","💫","⭐️","🌟","✨","⚡️","☄️","💥","🔥","🌪","🌈","☀️","🌤","⛅️","🌥","☁️","🌦","🌧","⛈","🌩","🌨","❄️","☃️","⛄️","🌬","💨","💧","💦","☔️","☂️","🌊","🌫"],
      food: ["🍏","🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🍈","🍒","🍑","🥭","🍍","🥥","🥝","🍅","🍆","🥑","🥦","🥬","🥒","🌶","🌽","🥕","🧄","🧅","🥔","🍠","🥐","🥯","🍞","🥖","🥨","🧀","🥚","🍳","🧈","🥞","🧇","🥓","🥩","🍗","🍖","🦴","🌭","🍔","🍟","🍕","🥪","🥙","🧆"," taco","🌯"," salad","🥘"," spaghetti","🍝"," ramen","🍜"," stew","🍲"," curry","🍣"," bento"," dumpling"," oyster"," shrimp"," rice ball"," rice"," cracker"," fish cake"," fortune cookie"," mooncake"," oden"," dango"," shaved ice"," ice cream"," dessert"," pie"," cupcake"," cake"," birthday cake"," custard"," lollipop"," candy"," chocolate"," popcorn"," donut"," cookie"," chestnut"," peanuts"," honey"," milk"," coffee"," tea"," sake"," beverage"," juice"," cocktail"," wine"," whiskey"," beer"," cheers"," ice"," chopsticks"," plate"," fork"," spoon","🏺"],
      activities: ["⚽️","🏀","🏈","⚾️","🥎"," tennis","🎾"," volleyball","🏐"," rugby","🏉"," billiards","🎱"," table tennis","🏓"," badminton","🏸"," goal"," hockey"," hockey"," cricket"," golf"," archery"," fishing"," boxing","🥋"," running"," skate"," curling"," sled"," skateboard"," ski"," skier"," snowboarder"," weightlifter"," weightlifter"," wrestler"," wrestler"," gymnast"," gymnast"," basketballer"," basketballer"," fencer"," handballer"," handballer"," golfer"," golfer"," jockey"," yogi"," yogi"," surfer"," surfer"," swimmer"," swimmer"," water polo"," water polo"," rower"," rower"," climber"," climber"," mountain biker"," mountain biker"," cyclist"," cyclist"," trophy","🥇","🥈","🥉"," medal"," medal"," rosette","🎫"," ticket"," mask"," artist palette"," frame"," thread"," yarn","🎼"," note"," notes"," mic"," fader"," knob"," microphone"," headphones","📻"," saxophone"," guitar"," keyboard"," trumpet"," violin"," drum"," mobile"," mobile"," laptop"," keyboard"," mouse"," trackball"," joystick"," video game"," alien monster","🎯"," slot machine","🎲"," puzzle"," teddy bear"," spade"," mahjong"," hanafuda"," mask"],
      objects: ["⌚️","📱","📲","💻","⌨️","🖱","🖲","🕹","💽","💾","💿","📀","📼","📷","📸","📹","🎥","📽","🎞","📞","☎️","📟","📠","📺","📻","🎙","🎚","🎛","🧭","⏱","⏲","⏰","🕰","⌛️","⏳","📡","🔋","🔌","💡","🔦","🕯","🪔","🧯","🛢","💸","💵","💴","💶","💷","💰","💳","💎","⚖️","🧰","🔧","🔨","⚒","🛠","⛏","🔩","⚙️","🧱","⛓","🧲","🔫","💣","🧨"," knife"," dagger"," swords"," shield"," smoking"," coffin"," funeral urn","🏺"," crystal ball"," prayer beads","🧿"," barber pole"," alembic"," telescope"," microscope"," hole"," pill"," syringe"," drop of blood"," dna"," microbe"," thermometer"," broom"," basket"," roll of paper"," soap"," sponge"," lotion"," bell"," key"," old key"," door"," chair"," couch"," bed"," sleeping"," teddy bear"," frame"," shopping bags"," cart"," gift"," balloon"," carp streamer"," ribbon"," confetti ball"," party popper"," dolls"," paper lantern"," wind chime"," envelope"," letter"," incoming envelope"," e-mail"," love letter"," inbox"," outbox"," package"," label"," mailbox"," closed mailbox"," mailbox"," open mailbox"," postbox"," postal horn"," scroll"," page"," page"," bookmark tabs"," bar chart"," chart up"," chart down"," notepad"," spiral calendar"," tear-off calendar"," calendar"," wastebasket"," card index"," card index box"," ballot box"," file cabinet"," clipboard"," file folder"," open file folder"," index dividers"," newspaper"," newspaper"," notebook"," notebook"," ledger"," closed book"," green book"," blue book"," orange book"," books"," open book"," bookmark"," safety pin"," link"," paperclip"," paperclips"," ruler"," straight ruler"," pushpin"," round pushpin"," round pushpin"," scissors"," pen"," fountain pen"," pen"," paintbrush"," crayon"," memo"," pencil"," magnifying glass"," magnifying glass"," locked"," locked with pen"," lock"," unlock"]
    };

    const allEmojis = Object.values(emojiData).flat();

    const renderEmojis = (list) => {
      grid.innerHTML = '';
      list.forEach(e => {
        const span = document.createElement('span');
        span.textContent = e;
        span.style.cursor = 'pointer';
        grid.appendChild(span);
      });
    };

    // Initial render
    renderEmojis(allEmojis);

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      picker.style.display = picker.style.display === 'none' ? 'flex' : 'none';
      if (picker.style.display === 'flex') {
        searchInput.focus();
      }
    });

    grid.addEventListener('click', (e) => {
      if (e.target.tagName === 'SPAN') {
        input.value += e.target.textContent;
        input.focus();
      }
    });

    searchInput.addEventListener('input', (e) => {
      const term = e.target.value;
      if (!term) {
        const activeTab = document.querySelector('.emoji-tab.active');
        const cat = activeTab.dataset.category;
        renderEmojis(cat === 'all' ? allEmojis : emojiData[cat]);
        return;
      }
      const filtered = allEmojis.filter(emoji => emoji.includes(term));
      renderEmojis(filtered.length > 0 ? filtered : allEmojis);
    });

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const cat = tab.dataset.category;
        renderEmojis(cat === 'all' ? allEmojis : emojiData[cat]);
        searchInput.value = '';
      });
    });

    document.addEventListener('click', (e) => {
      if (!picker.contains(e.target) && e.target !== btn) {
        picker.style.display = 'none';
      }
    });
  },

  async loadChannel(channelId) {
    this.currentChannel = channelId;
    if (window.socketModule) socketModule.joinChannel(channelId);
    
    // Update channel name in header
    const channelEl = document.querySelector(`.channel[data-channel-id="${channelId}"]`);
    if (channelEl) {
      const headerTitle = document.querySelector('.chat-header h2') || document.querySelector('.chat-header span');
      if (headerTitle) {
        const name = channelEl.querySelector('span')?.textContent || 'قناة';
        headerTitle.innerHTML = `<i class="fas fa-hashtag"></i> ${name}`;
      }
    }

    try {
        const res = await fetch(`${API_URL}/messages/channel/${channelId}`, { headers: auth.getAuthHeader() });
        const data = await res.json();
        this.messages = data.messages || [];
        this.renderMessages();
    } catch(e) { console.error(e); }
  },

  renderMessages() {
    const container = document.getElementById('chatMessages');
    if(!container) return;
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

  parseMarkdown(text) {
    if (!text) return '';
    
    let parsed = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // @Mentions highlighting
    parsed = parsed.replace(/@(\w+)/g, '<span class="mention">@$1</span>');
    
    parsed = parsed.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      const language = lang || 'javascript';
      const highlighted = window.Prism ? Prism.highlight(code.trim(), Prism.languages[language] || Prism.languages.javascript, language) : code;
      return `<pre class="code-block"><code class="language-${language}">${highlighted}</code></pre>`;
    });
    
    parsed = parsed.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
    parsed = parsed.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    parsed = parsed.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    parsed = parsed.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    parsed = parsed.replace(/^&gt;\s*(.+)$/gm, '<blockquote>$1</blockquote>');
    parsed = parsed.replace(/\n/g, '<br>');
    
    return parsed;
  },

  setupMobileMenu() {
    const menuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.querySelector('.channels-sidebar');
    if (menuBtn && sidebar) {
      menuBtn.onclick = () => sidebar.classList.toggle('mobile-active');
    }
  },

  setupVoiceNotes() {
    const voiceBtn = document.getElementById('voiceBtn');
    if (!voiceBtn) return;

    let mediaRecorder;
    let audioChunks = [];

    voiceBtn.onclick = async () => {
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaRecorder = new MediaRecorder(stream);
          audioChunks = [];

          mediaRecorder.ondataavailable = (event) => audioChunks.push(event.data);
          mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const formData = new FormData();
            formData.append('file', audioBlob, 'voice-note.webm');

            const res = await fetch(`${API_URL}/upload`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${auth.token}` },
              body: formData
            });
            const data = await res.json();
            if (data.url) {
              socketModule.sendMessage('', [data.url]);
            }
            stream.getTracks().forEach(track => track.stop());
          };

          mediaRecorder.start();
          voiceBtn.classList.add('recording');
          utils.showToast('جاري التسجيل...', 'info');
        } catch (err) {
          console.error('Voice record error:', err);
          utils.showToast('فشل الوصول للميكروفون', 'error');
        }
      } else {
        mediaRecorder.stop();
        voiceBtn.classList.remove('recording');
        utils.showToast('تم إرسال الرسالة الصوتية', 'success');
      }
    };
  },

  createMessageElement(msg) {
    const div = document.createElement('div');
    div.className = 'message';
    div.dataset.messageId = msg._id || msg.id;
    
    const username = msg.author?.username || 'User';
    const role = msg.author?.role || 'member';
    const colorKey = msg.author?.nameColor || 'default';
    const nameClass = `message-author name-col-${colorKey}`;
    
    const roleBadges = {
      owner: '<span class="role-badge owner" title="Owner">👑</span>',
      admin: '<span class="role-badge admin" title="Admin">🛡️</span>',
      vip: '<span class="role-badge vip" title="VIP">💎</span>',
      member: ''
    };
    const badge = roleBadges[role] || '';

    let attachmentsHtml = '';
    if (msg.attachments && msg.attachments.length > 0) {
        msg.attachments.forEach(file => {
            const url = file.url || file;
            if (/\.(jpg|jpeg|png|gif)$/i.test(url)) {
                attachmentsHtml += `<div class="message-attachment"><img src="${url}" onload="window.chat.scrollToBottom()" onclick="window.open('${url}')"></div>`;
            } else if (/\.(mp4|webm|mov)$/i.test(url)) {
                attachmentsHtml += `<div class="message-attachment"><video src="${url}" controls onloadeddata="window.chat.scrollToBottom()"></video></div>`;
            } else {
                attachmentsHtml += `<div class="message-attachment file-link"><a href="${url}" target="_blank">📄 ملف</a></div>`;
            }
        });
    }

    const parsedContent = this.parseMarkdown(msg.content);
    
    // Extract links for preview
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = msg.content.match(urlRegex);
    let linkPreviewsHtml = '<div class="link-previews-container"></div>';

    const statusDot = `<span class="status-dot ${msg.author?.status || 'offline'}"></span>`;
    
    let replyHtml = '';
    if (msg.replyTo) {
      const replyAuthor = msg.replyTo.author?.username || 'User';
      const replyText = msg.replyTo.content || '...';
      replyHtml = `
        <div class="message-reference" onclick="window.chat.scrollToMessage('${msg.replyTo._id || msg.replyTo.id}')">
          <i class="fas fa-reply"></i>
          <span class="ref-author">${replyAuthor}</span>
          <span class="ref-text">${replyText}</span>
        </div>
      `;
    }

    let avatarSrc = utils.getAvatarUrl(msg.author?.avatar);

    div.innerHTML = `
      <div class="avatar-container">
        <img src="${avatarSrc}" class="message-avatar" onerror="this.src='assets/default-avatar.svg'">
        ${statusDot}
      </div>
      <div class="message-content">
        ${replyHtml}
        <div class="message-header">
          ${badge}<span class="${nameClass}">${username}</span> <span class="message-timestamp">${new Date(msg.createdAt).toLocaleTimeString()}</span>
        </div>
        <div class="message-text">${parsedContent}</div>
        ${attachmentsHtml}
        ${linkPreviewsHtml}
        <div class="message-reactions" data-message-id="${msg._id || msg.id}">
          <button class="add-reaction-btn" title="Add Reaction">+</button>
        </div>
      </div>
    `;

    if (urls) {
      this.fetchLinkPreviews(div, urls);
    }
    
    this.renderReactions(div, msg.reactions || []);
    
    return div;
  },

  scrollToMessage(messageId) {
    const el = document.querySelector(`.message[data-message-id="${messageId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('highlight');
      setTimeout(() => el.classList.remove('highlight'), 2000);
    }
  },

  renderReactions(messageEl, reactions) {
    const container = messageEl.querySelector('.message-reactions');
    if (!container) return;
    
    const reactionsHtml = reactions.map(r => 
      `<span class="reaction ${r.users.includes(auth.user?.id) ? 'active' : ''}" data-emoji="${r.emoji}">
        ${r.emoji} <span class="reaction-count">${r.users.length}</span>
      </span>`
    ).join('');
    
    container.innerHTML = reactionsHtml + '<button class="add-reaction-btn" title="Add Reaction">+</button>';
  },

  async sendMessage() {
    const input = document.getElementById('messageInput');
    const content = input.value.trim();
    if (!content) return;
    
    if (this.replyingTo) {
      try {
        await fetch(`${API_URL}/messages/reply`, {
          method: 'POST',
          headers: auth.getAuthHeader(),
          body: JSON.stringify({
            content,
            channelId: this.currentChannel,
            replyToId: this.replyingTo._id || this.replyingTo.id
          })
        });
        this.cancelReply();
      } catch (error) {
        console.error('Reply error:', error);
      }
    } else if (window.socketModule) {
      socketModule.sendMessage(content);
    }
    
    input.value = '';
    input.style.height = 'auto';
  },

  async fetchLinkPreviews(messageEl, urls) {
    const container = messageEl.querySelector('.link-previews-container');
    if (!container) return;

    for (const url of urls.slice(0, 3)) { // Limit to 3 previews
      try {
        const res = await fetch(`${API_URL}/messages/link-preview`, {
          method: 'POST',
          headers: auth.getAuthHeader(),
          body: JSON.stringify({ url })
        });
        const data = await res.json();
        if (data.title) {
          const preview = document.createElement('div');
          preview.className = 'link-preview-card';
          preview.innerHTML = `
            ${data.image ? `<img src="${data.image}" class="link-preview-image">` : ''}
            <div class="link-preview-content">
              <a href="${data.url}" target="_blank" class="link-preview-title">${data.title}</a>
              ${data.description ? `<p class="link-preview-desc">${data.description}</p>` : ''}
            </div>
          `;
          container.appendChild(preview);
          this.scrollToBottom();
        }
      } catch (err) {
        console.error('Link preview error:', err);
      }
    }
  },

  receiveMessage(msg) {
    if (msg.channel === this.currentChannel) {
        // Prevent double messages by checking if message already exists
        const existing = document.querySelector(`.message[data-message-id="${msg._id || msg.id}"]`);
        if (existing) return;

        this.messages.push(msg);
        const container = document.getElementById('chatMessages');
        if(!container) return;
        const welcome = container.querySelector('.welcome-message');
        if(welcome) welcome.style.display = 'none';
        
        container.appendChild(this.createMessageElement(msg));
        this.scrollToBottom();
    }
  },

  scrollToBottom() {
      const c = document.getElementById('chatMessages');
      if(c) setTimeout(() => c.scrollTop = c.scrollHeight, 50);
  },

  showTyping(data) {
    const { userId, username, isTyping } = data;
    const indicator = document.getElementById('typingIndicator');
    const typingText = indicator?.querySelector('.typing-text');
    
    if (!indicator || !typingText) return;
    
    if (isTyping) {
      this.typingUsers.add(username);
    } else {
      this.typingUsers.delete(username);
    }
    
    if (this.typingUsers.size > 0) {
      const users = Array.from(this.typingUsers);
      let text = '';
      if (users.length === 1) {
        text = `${users[0]} يكتب...`;
      } else if (users.length === 2) {
        text = `${users[0]} و ${users[1]} يكتبان...`;
      } else {
        text = `${users.length} أشخاص يكتبون...`;
      }
      typingText.textContent = text;
      indicator.style.display = 'flex';
    } else {
      indicator.style.display = 'none';
    }
  },

  clearTypingUser(username) {
    this.typingUsers.delete(username);
    this.showTyping({ username, isTyping: false });
  },

  async clearMessages() {
    if (auth.user?.role !== 'owner' && auth.user?.role !== 'admin') {
      // Local clear only for members
      if (!confirm('هل تريد مسح الرسائل من الشاشة؟ (سيتم مسحها عندك فقط)')) return;
      const container = document.getElementById('chatMessages');
      if (container) {
        const msgs = container.querySelectorAll('.message');
        msgs.forEach(m => m.remove());
        const welcome = container.querySelector('.welcome-message');
        if(welcome) welcome.style.display = 'block';
      }
      this.messages = [];
      utils.showToast('تم مسح الشاشة محلياً', 'info');
    } else {
      // Permanent clear for owner/admin
      if (!confirm('⚠️ تحذير: هل تريد حذف جميع رسائل هذه القناة نهائياً من قاعدة البيانات؟ لا يمكن التراجع عن هذا الإجراء.')) return;
      try {
        const res = await fetch(`${API_URL}/messages/channel/${this.currentChannel}`, {
          method: 'DELETE',
          headers: auth.getAuthHeader()
        });
        const data = await res.json();
        if (data.success) {
          utils.showToast('تم حذف جميع رسائل القناة بنجاح', 'success');
        } else {
          utils.showToast(data.error || 'فشل حذف الرسائل', 'error');
        }
      } catch (error) {
        console.error('Clear messages error:', error);
        utils.showToast('حدث خطأ أثناء محاولة حذف الرسائل', 'error');
      }
    }
  }
};

window.chat = chat;
