const express = require('express');
const router = express.Router();
const Channel = require('../models/Channel');
const Server = require('../models/Server');
const auth = require('../middleware/auth');

// Get channels for a server
router.get('/server/:serverId', auth, async (req, res) => {
  try {
    const { serverId } = req.params;
    
    const server = await Server.findById(serverId);
    if (!server) {
      return res.status(404).json({ error: 'السيرفر غير موجود' });
    }

    const channels = await Channel.find({ server: serverId })
      .sort({ category: 1, name: 1 });

    res.json({ channels });
  } catch (error) {
    console.error('Get channels error:', error);
    res.status(500).json({ error: 'خطأ في جلب القنوات' });
  }
});

// Create a channel
router.post('/', auth, async (req, res) => {
  try {
    const { name, type, serverId, category } = req.body;

    if (!name || !serverId) {
      return res.status(400).json({ error: 'الاسم ومعرف السيرفر مطلوبان' });
    }

    const server = await Server.findById(serverId);
    if (!server) {
      return res.status(404).json({ error: 'السيرفر غير موجود' });
    }

    const channel = new Channel({
      name,
      type: type || 'text',
      server: serverId,
      category: category || (type === 'voice' ? 'voice' : 'general'),
      members: [req.userId]
    });

    await channel.save();
    
    const io = req.app.get('io');
    io.emit('channel-created', channel);

    res.status(201).json({ channel });
  } catch (error) {
    console.error('Create channel error:', error);
    res.status(500).json({ error: 'خطأ في إنشاء القناة' });
  }
});

// Rename a channel
router.put('/:id', auth, async (req, res) => {
  try {
    const { name } = req.body;
    const channel = await Channel.findByIdAndUpdate(req.params.id, { name }, { new: true });
    if (!channel) return res.status(404).json({ error: 'القناة غير موجودة' });
    
    const io = req.app.get('io');
    io.emit('channel-updated', channel);
    
    res.json({ channel });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في تعديل القناة' });
  }
});

// Delete a channel
router.delete('/:id', auth, async (req, res) => {
  try {
    const channel = await Channel.findByIdAndDelete(req.params.id);
    if (!channel) return res.status(404).json({ error: 'القناة غير موجودة' });
    
    const io = req.app.get('io');
    io.emit('channel-deleted', { channelId: req.params.id });
    
    res.json({ message: 'تم حذف القناة' });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في حذف القناة' });
  }
});

module.exports = router;
