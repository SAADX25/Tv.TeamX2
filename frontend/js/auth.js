// Authentication Module
const auth = {
  token: null,
  user: null,

  init() {
    // Load token from localStorage
    this.token = utils.getStorage('token');
    this.user = utils.getStorage('user');

    // Set up form listeners
    this.setupForms();

    // Check if user is already logged in
    if (this.token) {
      this.showApp();
    }
  },

  setupForms() {
    // Auth tabs
    const authTabs = document.querySelectorAll('.auth-tab');
    authTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        this.switchTab(tabName);
      });
    });

    // Login form
    const loginForm = document.getElementById('loginFormElement');
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.login();
    });

    // Register form
    const registerForm = document.getElementById('registerFormElement');
    registerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.register();
    });
  },

  switchTab(tabName) {
    // Update active tab
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update active form
    document.querySelectorAll('.auth-form').forEach(form => {
      form.classList.toggle('active', form.id === `${tabName}Form`);
    });
  },

  async register() {
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    // طباعة البيانات قبل الإرسال (بدون كلمة المرور الفعلية)
    console.log('📝 محاولة التسجيل...');
    console.log('📝 البيانات:', {
      username: username,
      email: email,
      passwordLength: password.length
    });

    try {
      const apiUrl = `${API_URL}/auth/register`;
      console.log('📝 URL الكامل للـ API:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, email, password })
      });

      console.log('📝 Response Status:', response.status);
      
      const data = await response.json();
      console.log('📝 Response Data:', data);

      if (!response.ok) {
        console.error('❌ فشل التسجيل:', data.error);
        if (data.details) {
          console.error('❌ تفاصيل الخطأ:', data.details);
        }
        throw new Error(data.error || 'فشل التسجيل');
      }

      console.log('✅ تم التسجيل بنجاح');

      // Save token and user data
      this.token = data.token;
      this.user = data.user;
      utils.setStorage('token', this.token);
      utils.setStorage('user', this.user);

      utils.showToast('تم التسجيل بنجاح!', 'success');
      this.showApp();
    } catch (error) {
      console.error('❌ خطأ في التسجيل:', error);
      
      // رسالة خطأ محسّنة للمستخدم
      let errorMessage = error.message;
      
      // إذا كان خطأ شبكة (Failed to fetch)
      if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
        console.error('❌ خطأ في الاتصال بالسيرفر');
        console.error('⚠️  تأكد من:');
        console.error('   1. السيرفر يعمل على http://localhost:3000');
        console.error('   2. API_URL في utils.js صحيح');
        console.error('   3. لا توجد مشاكل في CORS');
        
        errorMessage = 'فشل الاتصال بالسيرفر. تأكد من أن السيرفر يعمل على http://localhost:3000';
      }
      
      utils.showToast(errorMessage, 'error');
    }
  },

  async login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    // طباعة البيانات قبل الإرسال (بدون كلمة المرور الفعلية)
    console.log('📝 محاولة تسجيل الدخول...');
    console.log('📝 البيانات:', {
      email: email,
      hasPassword: !!password
    });

    try {
      const apiUrl = `${API_URL}/auth/login`;
      console.log('📝 URL الكامل للـ API:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      console.log('📝 Response Status:', response.status);
      
      const data = await response.json();
      console.log('📝 Response Data:', data);

      if (!response.ok) {
        console.error('❌ فشل تسجيل الدخول:', data.error);
        if (data.details) {
          console.error('❌ تفاصيل الخطأ:', data.details);
        }
        throw new Error(data.error || 'فشل تسجيل الدخول');
      }

      console.log('✅ تم تسجيل الدخول بنجاح');

      // Save token and user data
      this.token = data.token;
      this.user = data.user;
      utils.setStorage('token', this.token);
      utils.setStorage('user', this.user);

      utils.showToast('مرحباً بعودتك!', 'success');
      this.showApp();
    } catch (error) {
      console.error('❌ خطأ في تسجيل الدخول:', error);
      
      // رسالة خطأ محسّنة للمستخدم
      let errorMessage = error.message;
      
      // إذا كان خطأ شبكة (Failed to fetch)
      if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
        console.error('❌ خطأ في الاتصال بالسيرفر');
        console.error('⚠️  تأكد من:');
        console.error('   1. السيرفر يعمل على http://localhost:3000');
        console.error('   2. API_URL في utils.js صحيح');
        console.error('   3. لا توجد مشاكل في CORS');
        
        errorMessage = 'فشل الاتصال بالسيرفر. تأكد من أن السيرفر يعمل على http://localhost:3000';
      }
      
      utils.showToast(errorMessage, 'error');
    }
  },

  logout() {
    this.token = null;
    this.user = null;
    utils.removeStorage('token');
    utils.removeStorage('user');
    
    // Disconnect socket
    if (window.socket) {
      window.socket.disconnect();
    }

    // Hide app and show auth modal
    document.getElementById('app').style.display = 'none';
    document.getElementById('authModal').classList.add('active');
    
    utils.showToast('تم تسجيل الخروج', 'success');
  },

  showApp() {
    document.getElementById('authModal').classList.remove('active');
    document.getElementById('app').style.display = 'grid';

    // Update user info
    document.getElementById('currentUsername').textContent = this.user.username;
    document.getElementById('userAvatar').src = `assets/${this.user.avatar}`;

    // Initialize socket connection
    if (window.socketModule) {
      window.socketModule.connect();
    }

    // Load initial data
    if (window.app) {
      window.app.loadServers();
    }
  },

  getAuthHeader() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }
};

// Export
window.auth = auth;
