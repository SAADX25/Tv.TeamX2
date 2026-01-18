require('dotenv').config();
const mongoose = require('mongoose');
const Server = require('./models/Server');
const Channel = require('./models/Channel');
const User = require('./models/User');

async function seed() {
  try {
    // الاتصال بقاعدة البيانات
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ متصل بقاعدة البيانات');

    // البحث عن أول مستخدم (أنت)
    const user = await User.findOne();
    if (!user) {
      console.error('❌ لا يوجد مستخدمين!  سجّل دخول أولاً');
      process.exit(1);
    }

    console.log('✅ المستخدم:', user.username);

    // حذف البيانات القديمة (اختياري)
    await Server.deleteMany({});
    await Channel.deleteMany({});
    console.log('🗑️  تم حذف البيانات القديمة');

    // إنشاء Server
    const server = new Server({
      name: 'TeamX2 Chat',
      icon: 'default-server. svg',
      owner: user._id,
      members: [user._id],
      inviteCode: 'teamx2-' + Math.random().toString(36).substring(7)
    });
    await server.save();
    console.log('✅ تم إنشاء Server:', server.name);

    // إنشاء قنوات نصية
    const generalChannel = new Channel({
      name: 'عام',
      type: 'text',
      server: server._id,
      category: 'نصية',
      members: [user._id]
    });
    await generalChannel.save();
    console.log('✅ تم إنشاء قناة:', generalChannel.name);

    const randomChannel = new Channel({
      name: 'عشوائي',
      type: 'text',
      server: server._id,
      category: 'نصية',
      members: [user._id]
    });
    await randomChannel.save();
    console.log('✅ تم إنشاء قناة:', randomChannel.name);

    // إنشاء قنوات صوتية
    const voice1Channel = new Channel({
      name: 'صوتي 1',
      type: 'voice',
      server: server._id,
      category: 'صوتية',
      members: [user._id]
    });
    await voice1Channel.save();
    console.log('✅ تم إنشاء قناة:', voice1Channel.name);

    const voice2Channel = new Channel({
      name: 'صوتي 2',
      type: 'voice',
      server: server._id,
      category: 'صوتية',
      members: [user._id]
    });
    await voice2Channel.save();
    console.log('✅ تم إنشاء قناة:', voice2Channel.name);

    console.log('\n🎉 تم إنشاء البيانات بنجاح!');
    console.log('\nمعلومات مهمة:');
    console.log('Server ID:', server._id);
    console.log('General Channel ID:', generalChannel._id);
    console.log('Random Channel ID:', randomChannel._id);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ خطأ:', error);
    process.exit(1);
  }
}

seed();