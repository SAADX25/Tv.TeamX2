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
      .populate('author', 'username avatar status nameColor role')
      .populate('replyTo', 'content author')
      .populate({ path: 'replyTo', populate: { path: 'author', select: 'username' } });

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
    
    await message.populate('author', 'username avatar status nameColor role');

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

const ogs = require('open-graph-scraper');

// Get link preview
router.post('/link-preview', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    const options = { url };
    const { result } = await ogs(options);
    
    if (result.success) {
      res.json({
        title: result.ogTitle || result.twitterTitle || '',
        description: result.ogDescription || result.twitterDescription || '',
        image: result.ogImage?.url || result.ogImage?.[0]?.url || '',
        url: result.ogUrl || url
      });
    } else {
      res.status(404).json({ error: 'No metadata found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch metadata' });
  }
});

// إضافة/إزالة reaction
router.post('/:id/reactions', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { emoji } = req.body;
    const userId = req.user.userId;

    if (!emoji || typeof emoji !== 'string') {
      return res.status(400).json({ error: 'الإيموجي مطلوب' });
    }

    const message = await Message.findById(id);
    if (!message) return res.status(404).json({ error: 'الرسالة غير موجودة' });

    const existingReaction = message.reactions.find(r => r.emoji === emoji);
    
    if (existingReaction) {
      const userIndex = existingReaction.users.findIndex(u => u.toString() === userId);
      if (userIndex > -1) {
        existingReaction.users.splice(userIndex, 1);
        if (existingReaction.users.length === 0) {
          message.reactions = message.reactions.filter(r => r.emoji !== emoji);
        }
      } else {
        existingReaction.users.push(userId);
      }
    } else {
      message.reactions.push({ emoji, users: [userId] });
    }

    await message.save();
    
    const io = req.app.get('io');
    if (io) {
      io.to(`channel-${message.channel}`).emit('message-reaction', {
        messageId: id,
        reactions: message.reactions
      });
    }

    res.json({ reactions: message.reactions });
  } catch (error) {
    console.error('Reaction error:', error);
    res.status(500).json({ error: 'خطأ في التفاعل' });
  }
});

// حذف جميع الرسائل (للمالك فقط)
router.delete('/all', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (user.role !== 'owner') {
      return res.status(403).json({ error: 'غير مصرح لك بهذا الإجراء' });
    }

    await Message.deleteMany({});
    
    const io = req.app.get('io');
    if (io) {
      io.emit('all-messages-deleted');
    }

    res.json({ message: 'تم حذف جميع الرسائل بنجاح' });
  } catch (error) {
    console.error('Delete all messages error:', error);
    res.status(500).json({ error: 'خطأ في حذف الرسائل' });
  }
});

// الرد على رسالة
router.post('/reply', auth, async (req, res) => {
  try {
    const { content, channelId, replyToId, attachments } = req.body;
    const userId = req.user.userId;

    if (!channelId || !replyToId) {
      return res.status(400).json({ error: 'بيانات ناقصة' });
    }

    const message = new Message({
      content: content || '',
      author: userId,
      channel: channelId,
      replyTo: replyToId,
      attachments: attachments || []
    });

    await message.save();
    await message.populate('author', 'username avatar status nameColor role');
    await message.populate('replyTo', 'content author');
    await message.populate({ path: 'replyTo', populate: { path: 'author', select: 'username' } });

    const io = req.app.get('io');
    if (io) {
      io.to(`channel-${channelId}`).emit('new-message', {
        message: message.toObject()
      });
    }

    res.status(201).json({ message });
  } catch (error) {
    console.error('Reply error:', error);
    res.status(500).json({ error: 'خطأ في الرد' });
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