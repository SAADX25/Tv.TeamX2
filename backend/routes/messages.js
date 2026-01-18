const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const auth = require('../middleware/auth');

// Get messages for a channel
router.get('/channel/:channelId', auth, async (req, res) => {
  try {
    const { channelId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;

    const messages = await Message.find({ channel: channelId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .populate('author', 'username avatar status')
      .populate('replyTo', 'content author');

    res.json({ messages: messages.reverse() });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'خطأ في جلب الرسائل' });
  }
});

// Send a message
router.post('/', auth, async (req, res) => {
  try {
    const { content, channelId, attachments, replyTo } = req.body;

    // التحقق من وجود channelId
    if (!channelId) {
      return res.status(400).json({ error: 'معرف القناة مطلوب' });
    }

    if (!content && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ error: 'الرسالة فارغة' });
    }

    const message = new Message({
      content: content || '',
      author: req.userId,
      channel: channelId,
      attachments: attachments || [],
      replyTo: replyTo || null
    });

    await message.save();
    await message.populate('author', 'username avatar status');

    res.status(201).json({ message });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'خطأ في إرسال الرسالة' });
  }
});

// Delete a message
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({ error: 'الرسالة غير موجودة' });
    }

    if (message.author.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'غير مصرح بحذف هذه الرسالة' });
    }

    await message.deleteOne();
    res.json({ message: 'تم حذف الرسالة' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'خطأ في حذف الرسالة' });
  }
});

module.exports = router;
