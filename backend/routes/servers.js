const express = require('express');
const router = express.Router();
const Server = require('../models/Server');
const auth = require('../middleware/auth');

// GET /api/servers - جلب كل السيرفرات للمستخدم
router.get('/', auth, async (req, res) => {
  try {
    console. log('🖥️ جلب السيرفرات للمستخدم:', req.user.userId);
    
    const servers = await Server.find({
      members: req.user.userId
    }).sort({ createdAt: -1 });
    
    console.log(`✅ تم جلب ${servers.length} سيرفر`);
    res.json(servers);
  } catch (error) {
    console.error('❌ خطأ في جلب السيرفرات:', error);
    res.status(500).json({ error: 'فشل تحميل السيرفرات' });
  }
});

// GET /api/servers/:serverId/channels - جلب قنوات سيرفر معين
router.get('/: serverId/channels', auth, async (req, res) => {
  try {
    const { serverId } = req.params;
    console.log('📋 جلب قنوات السيرفر:', serverId);
    
    const Channel = require('../models/Channel');
    const channels = await Channel.find({
      server: serverId,
      members: req.user.userId
    }).sort({ category: 1, name: 1 });
    
    console.log(`✅ تم جلب ${channels.length} قناة`);
    res.json(channels);
  } catch (error) {
    console.error('❌ خطأ في جلب القنوات:', error);
    res.status(500).json({ error: 'فشل تحميل القنوات' });
  }
});

module.exports = router;