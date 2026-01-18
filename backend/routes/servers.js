// backend/routes/servers.js
const express = require('express');
const router = express.Router();
const Server = require('../models/Server');
const auth = require('../middleware/auth'); // استيراد ملف التحقق الذي أنشأناه قبل قليل

// جلب جميع السيرفرات الخاصة بالمستخدم
router.get('/', auth, async (req, res) => {
  try {
    console.log(`📡 Fetching servers for user: ${req.user.userId}`);
    let servers = await Server.find({
      $or: [
        { owner: req.user.userId },
        { members: req.user.userId }
      ]
    }).select('name icon');
    
    // ✅ إذا لم يكن للمستخدم أي سيرفر، نحاول إضافته للسيرفر الرئيسي أو إنشاؤه
    if (servers.length === 0) {
      console.log(`🔍 User ${req.user.userId} has no servers, looking for any server in DB...`);
      let mainServer = await Server.findOne(); 
      
      if (!mainServer) {
        console.log('✨ No servers found in DB at all. Creating default...');
        mainServer = new Server({
          name: 'TeamX2 Community',
          owner: req.user.userId,
          members: [req.user.userId]
        });
        await mainServer.save();
        
        const Channel = require('../models/Channel');
        const general = new Channel({ name: 'عام', type: 'text', server: mainServer._id, category: 'general' });
        const voice = new Channel({ name: 'صالة الصوت', type: 'voice', server: mainServer._id, category: 'voice' });
        await Promise.all([general.save(), voice.save()]);
      } else {
        console.log(`🤝 Found a server: ${mainServer.name} (${mainServer._id}). Ensuring user is member...`);
        await Server.updateOne(
          { _id: mainServer._id },
          { $addToSet: { members: req.user.userId } }
        );
        
        const Channel = require('../models/Channel');
        const channelCount = await Channel.countDocuments({ server: mainServer._id });
        if (channelCount === 0) {
          console.log('📢 No channels found for existing server. Creating defaults...');
          const general = new Channel({ name: 'عام', type: 'text', server: mainServer._id, category: 'general' });
          const voice = new Channel({ name: 'صالة الصوت', type: 'voice', server: mainServer._id, category: 'voice' });
          await Promise.all([general.save(), voice.save()]);
        }
        
        servers = [{ _id: mainServer._id, name: mainServer.name, icon: mainServer.icon }];
      }
    }
    
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