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

    if (server.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'غير مصرح بإنشاء قنوات في هذا السيرفر' });
    }

    const channel = new Channel({
      name,
      type: type || 'text',
      server: serverId,
      category: category || 'general',
      members: [req.userId]
    });

    await channel.save();
    res.status(201).json({ channel });
  } catch (error) {
    console.error('Create channel error:', error);
    res.status(500).json({ error: 'خطأ في إنشاء القناة' });
  }
});

module.exports = router;
