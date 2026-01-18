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

## Recent Changes
- January 18, 2026: Initial Replit setup
  - Configured server to run on port 5000 with 0.0.0.0 binding
  - Updated API_URL to use dynamic origin for Replit compatibility
  - Set up environment variables for JWT_SECRET and MONGODB_URI
