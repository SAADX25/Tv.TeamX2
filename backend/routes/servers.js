// backend/routes/servers.js
const express = require('express');
const router = express.Router();
const Server = require('../models/Server');
const auth = require('../middleware/auth'); // استيراد ملف التحقق الذي أنشأناه قبل قليل

// جلب جميع السيرفرات الخاصة بالمستخدم
router.get('/', auth, async (req, res) => {
  try {
    const servers = await Server.find({
      $or: [
        { owner: req.user.userId },
        { members: req.user.userId }
      ]
    }).select('name icon'); // نختار فقط الاسم والأيقونة للعرض في القائمة
    
    res.json(servers);
  } catch (error) {
    console.error('Error fetching servers:', error);
    res.status(500).json({ error: 'فشل جلب السيرفرات' });
  }
});

// إنشاء سيرفر جديد
router.post('/', auth, async (req, res) => {
  try {
    const { name, icon } = req.body;
    
    const server = new Server({
      name,
      icon,
      owner: req.user.userId,
      members: [req.user.userId] // المالك هو أول عضو
    });

    await server.save();
    res.status(201).json(server);
  } catch (error) {
    console.error('Create server error:', error);
    res.status(500).json({ error: 'فشل إنشاء السيرفر' });
  }
});

module.exports = router;