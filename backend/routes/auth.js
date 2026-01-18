const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

// Register
router.post('/register', async (req, res) => {
  try {
    console.log('📝 طلب تسجيل جديد...');
    const { username, email, password } = req.body;

    // طباعة البيانات المستلمة (بدون كلمة المرور الفعلية) - فقط في التطوير
    if (process.env.NODE_ENV !== 'production') {
      console.log('📝 البيانات المستلمة:', {
        username: username || 'غير موجود',
        email: email || 'غير موجود',
        hasPassword: !!password
      });
    }

    // Validation - التحقق من الحقول المطلوبة
    const missingFields = [];
    if (!username) missingFields.push('username');
    if (!email) missingFields.push('email');
    if (!password) missingFields.push('password');

    if (missingFields.length > 0) {
      console.log('❌ حقول مفقودة:', missingFields);
      return res.status(400).json({ 
        error: 'جميع الحقول مطلوبة',
        details: {
          type: 'MISSING_FIELDS',
          message: 'بعض الحقول المطلوبة مفقودة',
          missingFields: missingFields
        }
      });
    }

    console.log('✅ جميع الحقول المطلوبة موجودة');

    // التحقق من طول كلمة المرور
    if (password.length < 6) {
      console.log('❌ كلمة المرور قصيرة جداً:', password.length);
      return res.status(400).json({ 
        error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
        details: {
          type: 'PASSWORD_TOO_SHORT',
          message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
          currentLength: password.length,
          minimumLength: 6
        }
      });
    }

    console.log('✅ طول كلمة المرور مناسب');

    // التحقق من حالة اتصال MongoDB
    const dbState = mongoose.connection.readyState;
    console.log('🔍 حالة اتصال قاعدة البيانات:', dbState);
    
    if (dbState !== 1) {
      console.error('❌ قاعدة البيانات غير متصلة. الحالة:', dbState);
      return res.status(503).json({ 
        error: 'قاعدة البيانات غير متصلة',
        details: {
          type: 'DATABASE_NOT_CONNECTED',
          message: 'قاعدة البيانات غير متصلة حالياً',
          dbState: dbState,
          stateDescription: dbState === 0 ? 'disconnected' : 
                           dbState === 2 ? 'connecting' : 
                           dbState === 3 ? 'disconnecting' : 'unknown'
        }
      });
    }

    console.log('✅ قاعدة البيانات متصلة');

    // Check if user exists
    console.log('🔍 البحث عن مستخدم موجود...');
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    
    if (existingUser) {
      console.log('❌ المستخدم موجود مسبقاً');
      const duplicateField = existingUser.email === email ? 'email' : 'username';
      console.log('❌ الحقل المكرر:', duplicateField);
      
      return res.status(400).json({ 
        error: 'المستخدم موجود مسبقاً',
        details: {
          type: 'DUPLICATE_USER',
          message: duplicateField === 'email' ? 'البريد الإلكتروني مستخدم بالفعل' : 'اسم المستخدم مستخدم بالفعل',
          field: duplicateField
        }
      });
    }

    console.log('✅ لا يوجد مستخدم بنفس البيانات');

    // Create user
    console.log('📝 إنشاء المستخدم الجديد...');
    const user = new User({ username, email, password });
    
    console.log('💾 حفظ المستخدم في قاعدة البيانات...');
    await user.save();
    console.log('✅ تم حفظ المستخدم بنجاح. ID:', user._id);

    // Generate token
    console.log('🔑 إنشاء التوكن...');
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });
    console.log('✅ تم إنشاء التوكن بنجاح');

    console.log('✅ تم التسجيل بنجاح:', username);

    res.status(201).json({
      message: 'تم التسجيل بنجاح',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        status: user.status
      }
    });
  } catch (error) {
    console.error('❌ خطأ في التسجيل:', error.message);
    console.error('❌ نوع الخطأ:', error.name);
    
    // تحليل أنواع الأخطاء المختلفة
    let errorResponse = {
      error: 'خطأ في السيرفر',
      details: {
        type: 'UNKNOWN_ERROR',
        message: error.message
      }
    };

    // ValidationError من Mongoose
    if (error.name === 'ValidationError') {
      console.error('❌ خطأ في التحقق من البيانات:', error.errors);
      errorResponse = {
        error: 'بيانات غير صحيحة',
        details: {
          type: 'VALIDATION_ERROR',
          message: 'فشل التحقق من صحة البيانات',
          validationErrors: Object.keys(error.errors).map(key => ({
            field: key,
            message: error.errors[key].message
          }))
        }
      };
    }
    
    // MongoServerError - خطأ duplicate key (11000)
    else if (error.name === 'MongoServerError' || error.name === 'MongoError') {
      if (error.code === 11000 && error.keyValue) {
        console.error('❌ خطأ مفتاح مكرر (11000):', error.keyValue);
        const duplicateField = Object.keys(error.keyValue)[0];
        errorResponse = {
          error: 'المستخدم موجود مسبقاً',
          details: {
            type: 'DUPLICATE_KEY',
            message: duplicateField === 'email' ? 'البريد الإلكتروني مستخدم بالفعل' : 'اسم المستخدم مستخدم بالفعل',
            field: duplicateField
          }
        };
      } else {
        console.error('❌ خطأ MongoDB:', error.code, error.message);
        errorResponse = {
          error: 'خطأ في قاعدة البيانات',
          details: {
            type: 'MONGODB_ERROR',
            message: error.message,
            code: error.code
          }
        };
      }
    }
    
    // خطأ في الاتصال بقاعدة البيانات
    else if (error.name === 'MongoNetworkError' || error.message.includes('connect')) {
      console.error('❌ خطأ في الاتصال بقاعدة البيانات');
      errorResponse = {
        error: 'خطأ في الاتصال بقاعدة البيانات',
        details: {
          type: 'CONNECTION_ERROR',
          message: 'تعذر الاتصال بقاعدة البيانات'
        }
      };
    }

    console.error('❌ تفاصيل الخطأ الكاملة:', errorResponse);
    res.status(500).json(errorResponse);
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    console.log('📝 طلب تسجيل دخول جديد...');
    const { email, password } = req.body;

    // طباعة البيانات المستلمة (بدون كلمة المرور الفعلية) - فقط في التطوير
    if (process.env.NODE_ENV !== 'production') {
      console.log('📝 البيانات المستلمة:', {
        email: email || 'غير موجود',
        hasPassword: !!password
      });
    }

    // Validation
    if (!email || !password) {
      console.log('❌ حقول مفقودة');
      return res.status(400).json({ 
        error: 'البريد الإلكتروني وكلمة المرور مطلوبان',
        details: {
          type: 'MISSING_FIELDS',
          message: 'البريد الإلكتروني وكلمة المرور مطلوبان',
          missingFields: [!email && 'email', !password && 'password'].filter(Boolean)
        }
      });
    }

    console.log('✅ جميع الحقول موجودة');

    // التحقق من حالة اتصال MongoDB
    const dbState = mongoose.connection.readyState;
    console.log('🔍 حالة اتصال قاعدة البيانات:', dbState);
    
    if (dbState !== 1) {
      console.error('❌ قاعدة البيانات غير متصلة');
      return res.status(503).json({ 
        error: 'قاعدة البيانات غير متصلة',
        details: {
          type: 'DATABASE_NOT_CONNECTED',
          message: 'قاعدة البيانات غير متصلة حالياً'
        }
      });
    }

    console.log('✅ قاعدة البيانات متصلة');

    // Find user
    console.log('🔍 البحث عن المستخدم...');
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log('❌ المستخدم غير موجود');
      return res.status(401).json({ 
        error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
        details: {
          type: 'INVALID_CREDENTIALS',
          message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
        }
      });
    }

    console.log('✅ تم العثور على المستخدم:', user.username);

    // Check password
    console.log('🔍 التحقق من كلمة المرور...');
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      console.log('❌ كلمة المرور غير صحيحة');
      return res.status(401).json({ 
        error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
        details: {
          type: 'INVALID_CREDENTIALS',
          message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
        }
      });
    }

    console.log('✅ كلمة المرور صحيحة');

    // Generate token
    console.log('🔑 إنشاء التوكن...');
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });
    console.log('✅ تم إنشاء التوكن بنجاح');

    // Update status to online
    console.log('📝 تحديث حالة المستخدم إلى متصل...');
    user.status = 'online';
    await user.save();
    console.log('✅ تم تحديث الحالة');

    console.log('✅ تم تسجيل الدخول بنجاح:', user.username);

    res.json({
      message: 'تم تسجيل الدخول بنجاح',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        status: user.status,
        customStatus: user.customStatus
      }
    });
  } catch (error) {
    console.error('❌ خطأ في تسجيل الدخول:', error.message);
    console.error('❌ نوع الخطأ:', error.name);
    
    // تحليل أنواع الأخطاء
    let errorResponse = {
      error: 'خطأ في السيرفر',
      details: {
        type: 'UNKNOWN_ERROR',
        message: error.message
      }
    };

    // خطأ في الاتصال بقاعدة البيانات
    if (error.name === 'MongoNetworkError' || error.message.includes('connect')) {
      console.error('❌ خطأ في الاتصال بقاعدة البيانات');
      errorResponse = {
        error: 'خطأ في الاتصال بقاعدة البيانات',
        details: {
          type: 'CONNECTION_ERROR',
          message: 'تعذر الاتصال بقاعدة البيانات'
        }
      };
    }

    console.error('❌ تفاصيل الخطأ الكاملة:', errorResponse);
    res.status(500).json(errorResponse);
  }
});

module.exports = router;
