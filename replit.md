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
- **Security**: Helmet, express-rate-limit, xss-clean
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

- **Clear Messages**: Local "Clear Screen" button to empty the chat view (eraser icon)

## API Endpoints
### Messages
- `POST /api/messages/:id/reactions` - Toggle emoji reaction on message
- `POST /api/messages/reply` - Reply to a message with quoted context

## Security Features
- **Helmet**: HTTP security headers protection
- **Rate Limiting**: 20 requests/15min for auth, 100 requests/min for API
- **XSS Protection**: Automatic input sanitization
- **Hidden Credentials**: MongoDB URI and secrets not logged
- **Request Limits**: 400MB max body/file size
- **Password Hashing**: bcrypt with salt

## Recent Changes
- January 19, 2026: Upload & Image Viewer Improvements
  - Added 10-minute timeout for large file uploads (up to 400MB)
  - Added better error handling with user-friendly toast messages
  - Added in-app Lightbox for viewing images (no more new tabs)
  - ESC key closes the image lightbox
  - Images now have hover effect and cursor pointer
- January 18, 2026: Security Improvements
  - Added Helmet for HTTP security headers
  - Added Rate Limiting to prevent brute-force attacks
  - Added XSS sanitization for all inputs
  - Hidden MongoDB credentials from server logs
  - Fixed emoji picker data corruption (text strings replaced with actual emojis)
  - Fixed avatar URL double-prefix bug in profile settings
- January 18, 2026: Channel Management Improvements
  - Added proper response validation before closing channel modals
  - Added success/error toast messages for create, edit, and delete operations
  - Added client-side validation for channel name and server ID
  - Improved error handling with detailed console logging
- January 18, 2026: Layout Streamlining
  - Removed the global servers sidebar (Home/T/+ icons) to simplify navigation
  - Adjusted grid layout to focus on channel-based communication
- January 18, 2026: Enhanced User Experience
  - Added "Clear Screen" local button (eraser icon) in the chat header
  - Implemented circular avatar styling with high-quality rendering
  - Enhanced Settings with real-time profile picture previews (URL & Upload)
  - Fixed avatar path resolution and added robust error fallbacks
- January 18, 2026: Production-Grade Upgrade
  - Redesigned Login/Register with Deep Space Theme (animated stars & gradient)
  - Applied app-wide Glassmorphism (blurred semi-transparent UI)
  - Implemented Voice Notes using MediaRecorder API
  - Added real File Upload for profile pictures in Settings
  - Implemented rich Link Previews using Open Graph metadata
  - Added @Mentions highlighting for users
  - Added Admin Tool (Delete All Messages) for owners
  - Enhanced Mobile Responsiveness with a Hamburger Menu
  - Fixed User Presence updates and Double Messages bugs
- January 18, 2026: Enhanced chat features
  - Added typing indicators, Markdown, reactions, replies, and role badges
- January 18, 2026: Initial Replit setup
  - Configured server on port 5000 and established MongoDB connection
