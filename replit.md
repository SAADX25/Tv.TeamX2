# TeamX2 Chat Application

## Overview
A Discord-like chat application with real-time messaging, file uploads, and user authentication. Built with Node.js/Express backend and vanilla JavaScript frontend.

## Project Structure
```
├── backend/
│   ├── server.js          # Main Express server with Socket.IO
│   ├── models/            # MongoDB models (User, Message, Channel, Server)
│   ├── routes/            # API routes (auth, messages, channels, servers)
│   ├── middleware/        # Authentication middleware
│   └── uploads/           # Uploaded files storage
├── frontend/
│   ├── index.html         # Main HTML page
│   ├── css/               # Stylesheets
│   ├── js/                # JavaScript modules
│   └── assets/            # Images and icons
```

## Technologies
- **Backend**: Node.js, Express.js, Socket.IO, Mongoose
- **Database**: MongoDB (via MongoDB Atlas)
- **Authentication**: JWT with bcrypt password hashing
- **File Upload**: Multer
- **Frontend**: Vanilla JavaScript, HTML5, CSS3

## Running the Application
The application runs as a single Node.js server that serves both the API and static frontend files.

**Workflow**: `Start application`
- Command: `cd backend && node server.js`
- Port: 5000

## Environment Variables
- `MONGODB_URI`: MongoDB connection string (secret)
- `JWT_SECRET`: Secret key for JWT tokens
- `PORT`: Server port (default: 5000)

## API Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/messages/channel/:channelId` - Get channel messages
- `POST /api/messages` - Send message
- `GET /api/channels/server/:serverId` - Get server channels
- `POST /api/upload` - File upload

## Socket.IO Events
- `user-join` - User connects
- `join-channel` - Join a chat channel
- `send-message` - Send a message
- `new-message` - Receive new message
- `typing` - Typing indicator
- `user-status` - Online/offline status

## Features
- **Real-time Typing Indicators**: Shows "[User] is typing..." with support for multiple users
- **Markdown Support**: Bold, italic, code, blockquotes rendered in messages
- **Code Syntax Highlighting**: Prism.js for JavaScript, Python, CSS, HTML, Bash, JSON
- **Message Reactions**: Emoji picker with toggle functionality (click to add/remove)
- **Reply System**: Quote and reply to specific messages with context navigation
- **Role/Badge System**: Visual badges for Owner (👑), Admin (🛡️), VIP (💎)
- **Online/Offline Status**: Color-coded dots (green=online, gray=offline, yellow=away)
- **Animated Usernames**: RGB effects (rainbow, gold, red glow, blue neon, matrix green)
- **RTL Arabic Interface**: Full right-to-left layout support

## API Endpoints
### Messages
- `POST /api/messages/:id/reactions` - Toggle emoji reaction on message
- `POST /api/messages/reply` - Reply to a message with quoted context

## Recent Changes
- January 18, 2026: Enhanced chat features
  - Added typing indicators with real-time Socket.IO broadcasting
  - Implemented Markdown parsing with Prism.js syntax highlighting
  - Built message reactions system with emoji picker and toggle
  - Added reply system with quoted context and navigation
  - Implemented role badges (Owner, Admin, VIP) on user profiles
  - Added online/offline status dots with real-time updates
  - Fixed reaction toggle ObjectId vs string comparison bug
  - Added autocomplete attributes to form inputs for accessibility
- January 18, 2026: Initial Replit setup
  - Configured server to run on port 5000 with 0.0.0.0 binding
  - Updated API_URL to use dynamic origin for Replit compatibility
  - Set up environment variables for JWT_SECRET and MONGODB_URI
