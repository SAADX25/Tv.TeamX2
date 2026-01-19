require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const xss = require('xss-clean');

// ✅ فحص المتغيرات البيئية الضرورية
console.log('📝 فحص المتغيرات البيئية...');

if (!process.env.JWT_SECRET) {
  console.error('❌ خطأ: JWT_SECRET غير موجود في ملف .env');
  console.error('⚠️  يرجى إضافة JWT_SECRET إلى ملف .env');
  process.exit(1);
}

if (!process.env.MONGODB_URI) {
  console.error('❌ خطأ: MONGODB_URI غير موجود في ملف .env');
  console.error('⚠️  يرجى إضافة MONGODB_URI إلى ملف .env');
  process.exit(1);
}

console.log('✅ JWT_SECRET موجود');
console.log('✅ MONGODB_URI موجود');
console.log('✅ جميع المتغيرات البيئية متوفرة');

// استيراد المسارات
const authRoutes = require('./routes/auth');
const messagesRoutes = require('./routes/messages');
const channelsRoutes = require('./routes/channels');
const serversRoutes = require('./routes/servers'); // ✅ إضافة مسار السيرفرات الجديد

const User = require('./models/User');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// ✅ هذا السطر هو الحل لمشكلة ظهور الرسائل!
// يجعل السوكت متاحاً لملفات الـ API لكي ترسل تنبيهات عند وصول رسالة HTTP
app.set('io', io);

// 🛡️ Security Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// 🚫 Rate Limiting - الحماية من هجمات brute-force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'كثرة المحاولات، حاول مرة أخرى بعد 15 دقيقة' },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: { error: 'طلبات كثيرة جداً، انتظر دقيقة' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '400mb' }));
app.use(express.urlencoded({ extended: true, limit: '400mb' }));
app.use(xss());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 400 * 1024 * 1024 }, // 400MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|svg|pdf|doc|docx|txt|zip|rar/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('نوع الملف غير مدعوم'));
  }
});

// Routes with Rate Limiting
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/messages', generalLimiter, messagesRoutes);
app.use('/api/channels', generalLimiter, channelsRoutes);
app.use('/api/servers', generalLimiter, serversRoutes);

// File upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'لم يتم رفع ملف' });
    }

    res.json({
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: `/uploads/${req.file.filename}`
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'خطأ في رفع الملف' });
  }
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve index.html for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Handle SPA routing
app.get('*', (req, res, next) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
  } else {
    res.status(404).json({ error: 'المسار غير موجود' });
  }
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/teamx2-chat')
  .then(async () => {
    console.log('✅ متصل بقاعدة البيانات MongoDB');
    
    // ✅ التأكد من وجود سيرفر افتراضي
    const Server = require('./models/Server');
    const User = require('./models/User');
    
    try {
      const serverCount = await Server.countDocuments();
      if (serverCount === 0) {
        const User = require('./models/User');
        const Channel = require('./models/Channel');
        
        // إنشاء سيرفر "عام"
        const defaultServer = new Server({
          name: 'TeamX2 Community',
          owner: new mongoose.Types.ObjectId(), // معرف مؤقت
          members: []
        });
        await defaultServer.save();
        
        // إنشاء قنوات افتراضية
        const generalChannel = new Channel({
          name: 'عام',
          type: 'text',
          server: defaultServer._id,
          category: 'general'
        });
        await generalChannel.save();

        const voiceChannel = new Channel({
          name: 'صالة الصوت',
          type: 'voice',
          server: defaultServer._id,
          category: 'voice'
        });
        await voiceChannel.save();

        console.log('✅ تم إنشاء السيرفر والقنوات الافتراضية بنجاح');
      }
    } catch (err) {
      console.error('❌ خطأ في تهيئة السيرفر الافتراضي:', err);
    }
  })
  .catch(err => console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err));

// Socket.IO connection
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('🔌 مستخدم متصل:', socket.id);

  // User join
  socket.on('user-join', async (data) => {
    try {
      const { token } = data;
      if (!token) return;

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (user) {
        connectedUsers.set(socket.id, {
          userId: user._id,
          username: user.username,
          avatar: user.avatar
        });
        
        user.status = 'online';
        await user.save();
        
        // Broadcast to everyone
        io.emit('user-status', {
          userId: user._id,
          status: 'online',
          username: user.username,
          avatar: user.avatar,
          role: user.role,
          nameColor: user.nameColor
        });
        
        console.log('✅ انضم المستخدم:', user.username);
      }
    } catch (error) {
      console.error('خطأ في user-join:', error.message);
    }
  });

  // Join channel
  socket.on('join-channel', (data) => {
    const { channelId } = data;
    if (channelId) {
        socket.join(`channel-${channelId}`);
        console.log(`📢 انضم إلى القناة: ${channelId}`);
    }
  });

  // Send message (عبر السوكت المباشر)
  socket.on('send-message', async (data) => {
    try {
      const { content, channelId, attachments, token } = data;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const message = new Message({
        content,
        author: decoded.userId,
        channel: channelId,
        attachments: attachments || []
      });
      
      await message.save();
      await message.populate('author', 'username avatar status');
      
      io.to(`channel-${channelId}`).emit('new-message', {
        message: message.toObject()
      });
      
      console.log('💬 رسالة جديدة (Socket):', channelId);
    } catch (error) {
      console.error('خطأ في send-message:', error);
      socket.emit('message-error', { error: 'فشل إرسال الرسالة' });
    }
  });

  // Typing indicator
  socket.on('typing', (data) => {
    const { channelId, isTyping } = data;
    const user = connectedUsers.get(socket.id);
    
    if (user && channelId) {
      socket.to(`channel-${channelId}`).emit('user-typing', {
        userId: user.userId,
        username: user.username,
        isTyping
      });
    }
  });

  // Join voice channel
  socket.on('join-voice', (data) => {
    const { channelId } = data;
    const user = connectedUsers.get(socket.id);
    
    if (user && channelId) {
      // Leave previous voice rooms
      socket.rooms.forEach(room => {
        if (room.startsWith('voice-')) {
          socket.leave(room);
          const oldChanId = room.replace('voice-', '');
          io.emit('voice-user-left', { channelId: oldChanId, userId: user.userId });
        }
      });

      socket.join(`voice-${channelId}`);
      io.emit('voice-user-joined', { 
        channelId, 
        user: { 
          id: user.userId, 
          username: user.username, 
          avatar: user.avatar 
        } 
      });
      
      console.log(`🎤 ${user.username} انضم للقناة الصوتية: ${channelId}`);
    }
  });

  // Leave voice channel explicitly
  socket.on('leave-voice', (data) => {
    const { channelId } = data;
    const user = connectedUsers.get(socket.id);
    if (user && channelId) {
      socket.leave(`voice-${channelId}`);
      io.emit('voice-user-left', { channelId, userId: user.userId });
    }
  });

  // Disconnect
  socket.on('disconnect', async () => {
    const user = connectedUsers.get(socket.id);
    
    if (user) {
      try {
        const dbUser = await User.findById(user.userId);
        if (dbUser) {
          dbUser.status = 'offline';
          await dbUser.save();
          
          io.emit('user-status', {
            userId: user.userId,
            status: 'offline'
          });
        }
      } catch (error) {
        console.error('خطأ في disconnect:', error);
      }
      
      connectedUsers.delete(socket.id);
      console.log('🔌 مستخدم غير متصل:', user.username);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 السيرفر يعمل على المنفذ ${PORT}`);
});