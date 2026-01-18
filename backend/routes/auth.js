const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const auth = require('../middleware/auth'); // تأكد من وجود هذا الملف

// تسجيل حساب جديد
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // التحقق من البيانات
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'كلمة المرور قصيرة جداً' });
    }

    // التحقق من وجود المستخدم
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: 'المستخدم موجود مسبقاً' });
    }

    // إنشاء المستخدم
    const user = new User({ username, email, password });
    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

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
    console.error('Register Error:', error);
    res.status(500).json({ error: 'خطأ في السيرفر' });
  }
});

// تسجيل الدخول
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'البيانات ناقصة' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'البيانات غير صحيحة' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'البيانات غير صحيحة' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    user.status = 'online';
    await user.save();

    res.json({
      message: 'تم تسجيل الدخول',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        status: user.status,
        nameColor: user.nameColor // ✅ إرسال اللون عند الدخول
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'خطأ في السيرفر' });
  }
});

// ✅ مسار تحديث الملف الشخصي (الاسم، الصورة، اللون) - هذا ما كان ينقصك
router.put('/profile', auth, async (req, res) => {
  try {
    const { username, avatar, nameColor } = req.body;
    const userId = req.user.userId;

    // التأكد من أن الاسم غير مكرر (إذا تم تغييره)
    if (username) {
        const existingUser = await User.findOne({ username, _id: { $ne: userId } });
        if (existingUser) {
            return res.status(400).json({ error: 'الاسم مستخدم بالفعل' });
        }
    }

    const updates = {};
    if (username) updates.username = username;
    if (avatar) updates.avatar = avatar;
    if (nameColor) updates.nameColor = nameColor; // ✅ حفظ اللون في القاعدة

    const user = await User.findByIdAndUpdate(userId, updates, { new: true }).select('-password');

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        nameColor: user.nameColor, // ✅ إرجاع اللون الجديد للواجهة
        status: user.status
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'فشل التحديث' });
  }
});

module.exports = router;