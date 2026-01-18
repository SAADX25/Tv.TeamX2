const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Message = require('../models/Message');
const auth = require('../middleware/auth');

// جلب رسائل قناة معينة
router.get('/channel/:channelId', auth, async (req, res) => {
  try {
    const { channelId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(channelId)) {
      return res.json({ messages: [] });
    }

    const messages = await Message.find({ channel: channelId })
      .sort({ createdAt: -1 })
      .limit(50)
      // ✅ التعديل الضروري هنا: أضفنا nameColor
      .populate('author', 'username avatar status nameColor');

    res.json({ messages: messages.reverse() });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'خطأ في جلب الرسائل' });
  }
});

// إرسال رسالة جديدة
router.post('/', auth, async (req, res) => {
  try {
    const { content, channelId, attachments } = req.body;
    const userId = req.user.userId;

    if (!channelId) {
      return res.status(400).json({ error: 'خطأ: لم يتم تحديد القناة' });
    }

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
    
    // ✅ التعديل الضروري هنا أيضاً: أضفنا nameColor ليظهر اللون فوراً
    await message.populate('author', 'username avatar status nameColor');

    // إرسال عبر السوكت
    const io = req.app.get('io');
    if (io) {
        io.to(`channel-${channelId}`).emit('new-message', {
            message: message.toObject()
        });
    }

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

    if (message.author.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'ليست لديك صلاحية الحذف' });
    }

    const channelId = message.channel;
    await message.deleteOne();

    // إبلاغ الجميع بالحذف
    const io = req.app.get('io');
    if (io) {
        io.to(`channel-${channelId}`).emit('message-deleted', { messageId: id });
    }

    res.json({ message: 'تم الحذف' });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في الحذف' });
  }
});

module.exports = router;