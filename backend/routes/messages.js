const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Message = require('../models/Message');
const auth = require('../middleware/auth');

// جلب رسائل قناة معينة
router.get('/channel/:channelId', auth, async (req, res) => {
  try {
    const { channelId } = req.params;

    // ✅ إصلاح 1: التحقق من أن معرف القناة صالح لتجنب توقف السيرفر
    if (!mongoose.Types.ObjectId.isValid(channelId)) {
      // إذا كان المعرف غير صالح (مثل كلمة "general") نرجع قائمة فارغة بدلاً من الخطأ
      return res.json({ messages: [] });
    }

    const messages = await Message.find({ channel: channelId })
      .sort({ createdAt: -1 }) // الأحدث أولاً
      .limit(50)
      .populate('author', 'username avatar status');

    res.json({ messages: messages.reverse() }); // نعكسها للعرض الصحيح
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'خطأ في جلب الرسائل' });
  }
});

// إرسال رسالة جديدة
router.post('/', auth, async (req, res) => {
  try {
    const { content, channelId, attachments } = req.body;

    // ✅ إصلاح 2: التأكد من هوية المستخدم
    const userId = req.user.userId;

    if (!channelId) {
      return res.status(400).json({ error: 'خطأ: لم يتم تحديد القناة' });
    }

    // منع الرسائل الفارغة تماماً
    if (!content && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ error: 'لا يمكن إرسال رسالة فارغة' });
    }

    const message = new Message({
      content: content || '',
      author: userId,
      channel: channelId,
      attachments: attachments || []
    });

    await message.save();
    
    // جلب بيانات المرسل (الصورة والاسم) لإظهارها فوراً
    await message.populate('author', 'username avatar status');

    res.status(201).json({ message });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'فشل إرسال الرسالة' });
  }
});

// حذف رسالة
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const message = await Message.findById(id);

    if (!message) return res.status(404).json({ error: 'الرسالة غير موجودة' });

    // التحقق من الملكية
    if (message.author.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'ليست لديك صلاحية الحذف' });
    }

    await message.deleteOne();
    res.json({ message: 'تم الحذف' });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في الحذف' });
  }
});

module.exports = router;