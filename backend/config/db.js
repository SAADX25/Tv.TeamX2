const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/teamx2-chat');
    console.log('✅ متصل بقاعدة البيانات MongoDB');

    // ✅ التأكد من وجود سيرفر افتراضي
    const Server = require('../models/Server');
    const Channel = require('../models/Channel');

    try {
      const serverCount = await Server.countDocuments();
      if (serverCount === 0) {
        // إنشاء سيرفر "عام"
        const defaultServer = new Server({
          name: 'TeamX2 Community',
          owner: new mongoose.Types.ObjectId(), // معرف مؤقت
          members: []
        });
        await defaultServer.save();

        // إنشاء قنوات افتراضية
        const generalChannel = new Channel({
          name: 'عام',
          type: 'text',
          server: defaultServer._id,
          category: 'general'
        });
        await generalChannel.save();

        const voiceChannel = new Channel({
          name: 'صالة الصوت',
          type: 'voice',
          server: defaultServer._id,
          category: 'voice'
        });
        await voiceChannel.save();

        console.log('✅ تم إنشاء السيرفر والقنوات الافتراضية بنجاح');
      }
    } catch (err) {
      console.error('❌ خطأ في تهيئة السيرفر الافتراضي:', err);
    }
  } catch (err) {
    console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err);
    process.exit(1);
  }
};

module.exports = connectDB;
