require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const xss = require('xss-clean');
const connectDB = require('./config/db');
const socketHandler = require('./sockets/index');

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

// Connect to Database
connectDB();

// استيراد المسارات
const authRoutes = require('./routes/auth');
const messagesRoutes = require('./routes/messages');
const channelsRoutes = require('./routes/channels');
const serversRoutes = require('./routes/servers');

const app = express();
app.set('trust proxy', 1);
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

// Initialize Socket.IO Logic
socketHandler(io);

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

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 السيرفر يعمل على المنفذ ${PORT}`);
});
