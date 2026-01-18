// backend/server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');

// فحص المتغيرات البيئية
if (!process.env.JWT_SECRET || !process.env.MONGODB_URI) {
  console.error('❌ خطأ: تأكد من وجود JWT_SECRET و MONGODB_URI في ملف .env');
  process.exit(1);
}

// استيراد المسارات (Routes)
const authRoutes = require('./routes/auth');
const messagesRoutes = require('./routes/messages');
const channelsRoutes = require('./routes/channels');
const serversRoutes = require('./routes/servers'); // ✅ إضافة مسار السيرفرات

const User = require('./models/User');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// إعداد رفع الملفات
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads')),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip|rar/;
    if (allowedTypes.test(path.extname(file.originalname).toLowerCase()) && allowedTypes.test(file.mimetype)) {
      return cb(null, true);
    }
    cb(new Error('نوع الملف غير مدعوم'));
  }
});

// ✅ تفعيل المسارات (Routes)
app.use('/api/auth', authRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/channels', channelsRoutes);
app.use('/api/servers', serversRoutes); // ✅ ربط مسار السيرفرات الجديد

// نقطة رفع الملفات
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'لم يتم رفع ملف' });
  res.json({
    filename: req.file.filename,
    originalName: req.file.originalname,
    url: `/uploads/${req.file.filename}`
  });
});

// خدمة ملفات الواجهة الأمامية (Frontend)
app.use(express.static(path.join(__dirname, '../frontend')));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
  } else {
    res.status(404).json({ error: 'المسار غير موجود' });
  }
});

// الاتصال بقاعدة البيانات
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ متصل بقاعدة البيانات MongoDB'))
  .catch(err => console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err));

// إعدادات Socket.IO
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('🔌 مستخدم متصل:', socket.id);

  socket.on('user-join', async ({ token }) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      if (user) {
        connectedUsers.set(socket.id, { userId: user._id, username: user.username });
        user.status = 'online';
        await user.save();
        io.emit('user-status', { userId: user._id, status: 'online' });
      }
    } catch (e) { console.error('Auth error in socket', e); }
  });

  socket.on('join-channel', ({ channelId }) => socket.join(`channel-${channelId}`));

  socket.on('send-message', async (data) => {
    try {
      const { content, channelId, attachments, token } = data;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const message = new Message({ content, author: decoded.userId, channel: channelId, attachments: attachments || [] });
      await message.save();
      await message.populate('author', 'username avatar status');
      io.to(`channel-${channelId}`).emit('new-message', { message: message.toObject() });
    } catch (e) { socket.emit('message-error', { error: 'فشل الإرسال' }); }
  });

  socket.on('disconnect', async () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      const dbUser = await User.findById(user.userId);
      if (dbUser) {
        dbUser.status = 'offline';
        await dbUser.save();
        io.emit('user-status', { userId: user.userId, status: 'offline' });
      }
      connectedUsers.delete(socket.id);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 السيرفر يعمل على المنفذ ${PORT}`));