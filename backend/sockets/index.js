const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');

const connectedUsers = new Map();

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('🔌 مستخدم متصل:', socket.id);

    // User join
    socket.on('user-join', async (data) => {
      try {
        const { token } = data;
        if (!token) return;

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (user) {
          connectedUsers.set(socket.id, {
            userId: user._id,
            username: user.username,
            avatar: user.avatar
          });

          user.status = 'online';
          await user.save();

          // Broadcast to everyone
          io.emit('user-status', {
            userId: user._id,
            status: 'online',
            username: user.username,
            avatar: user.avatar,
            role: user.role,
            nameColor: user.nameColor
          });

          console.log('✅ انضم المستخدم:', user.username);
        }
      } catch (error) {
        console.error('خطأ في user-join:', error.message);
      }
    });

    // Join channel
    socket.on('join-channel', (data) => {
      const { channelId } = data;
      if (channelId) {
          socket.join(`channel-${channelId}`);
          console.log(`📢 انضم إلى القناة: ${channelId}`);
      }
    });

    // Send message (عبر السوكت المباشر)
    socket.on('send-message', async (data) => {
      try {
        const { content, channelId, attachments, token } = data;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const message = new Message({
          content,
          author: decoded.userId,
          channel: channelId,
          attachments: attachments || []
        });

        await message.save();
        await message.populate('author', 'username avatar status');

        io.to(`channel-${channelId}`).emit('new-message', {
          message: message.toObject()
        });

        console.log('💬 رسالة جديدة (Socket):', channelId);
      } catch (error) {
        console.error('خطأ في send-message:', error);
        socket.emit('message-error', { error: 'فشل إرسال الرسالة' });
      }
    });

    // Typing indicator
    socket.on('typing', (data) => {
      const { channelId, isTyping } = data;
      const user = connectedUsers.get(socket.id);

      if (user && channelId) {
        socket.to(`channel-${channelId}`).emit('user-typing', {
          userId: user.userId,
          username: user.username,
          isTyping
        });
      }
    });

    // Join voice channel
    socket.on('join-voice', (data) => {
      const { channelId } = data;
      const user = connectedUsers.get(socket.id);

      if (user && channelId) {
        // Leave previous voice rooms
        socket.rooms.forEach(room => {
          if (room.startsWith('voice-')) {
            socket.leave(room);
            const oldChanId = room.replace('voice-', '');
            io.emit('voice-user-left', { channelId: oldChanId, userId: user.userId });
          }
        });

        socket.join(`voice-${channelId}`);
        io.emit('voice-user-joined', {
          channelId,
          user: {
            id: user.userId,
            username: user.username,
            avatar: user.avatar
          }
        });

        console.log(`🎤 ${user.username} انضم للقناة الصوتية: ${channelId}`);
      }
    });

    // Leave voice channel explicitly
    socket.on('leave-voice', (data) => {
      const { channelId } = data;
      const user = connectedUsers.get(socket.id);
      if (user && channelId) {
        socket.leave(`voice-${channelId}`);
        io.emit('voice-user-left', { channelId, userId: user.userId });
      }
    });

    // Disconnect
    socket.on('disconnect', async () => {
      const user = connectedUsers.get(socket.id);

      if (user) {
        try {
          const dbUser = await User.findById(user.userId);
          if (dbUser) {
            dbUser.status = 'offline';
            await dbUser.save();

            io.emit('user-status', {
              userId: user.userId,
              status: 'offline'
            });
          }
        } catch (error) {
          console.error('خطأ في disconnect:', error);
        }

        connectedUsers.delete(socket.id);
        console.log('🔌 مستخدم غير متصل:', user.username);
      }
    });
  });
};
