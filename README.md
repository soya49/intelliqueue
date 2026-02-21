# IntelliQueue - Smart Queue & Wait Time Prediction System

A production-ready hackathon project for hospitals, banks, and government offices to manage queues efficiently with AI-based wait time predictions.

## 🚀 Features

- **QR-Based Token Check-in**: Generate unique QR codes for contactless token verification
- **AI Wait Time Prediction**: Weighted Moving Average algorithm based on historical data
- **Crowd Density Indicator**: Real-time crowd level assessment (LOW, MEDIUM, HIGH)
- **Real-time Sync**: Socket.io integration for instant queue updates
- **Admin Dashboard**: Manage queue and view analytics
- **Responsive Design**: Mobile-first UI with Tailwind CSS

## 📋 Tech Stack

### Backend
- Node.js & Express
- Socket.io for real-time updates
- Firebase Firestore for database
- Firebase Admin SDK

### Frontend
- React 18 with Vite
- Tailwind CSS for styling
- Recharts for analytics visualization
- Lucide Icons
- Axios for API calls
- Socket.io Client

## 📁 Project Structure

```
intelliqueue/
├── server/
│   ├── controllers/
│   │   └── tokenController.js
│   ├── services/
│   │   └── queueLogic.js
│   ├── routes/
│   │   └── tokenRoutes.js
│   ├── firebaseAdmin.js
│   ├── server.js
│   ├── package.json
│   └── .env.example
└── client/
    ├── src/
    │   ├── components/
    │   │   ├── Toast.jsx
    │   │   └── LoadingSpinner.jsx
    │   ├── pages/
    │   │   ├── Home.jsx
    │   │   ├── LiveQueue.jsx
    │   │   └── AdminDashboard.jsx
    │   ├── services/
    │   │   ├── api.js
    │   │   └── socket.js
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── .env.example
```

## 🔐 Firestore Collections

### Users
```
userId
name
phone
email
createdAt
```

### Branches
```
branchId
name
location
lastQueueNumber
totalCounters
activeCounters
createdAt
updatedAt
```

### Services
```
serviceId
branchId
serviceName
avgServiceTime
description
createdAt
```

### Counters
```
counterId
branchId
counterNumber
status (idle, serving)
currentTokenId
createdAt
updatedAt
```

### Tokens
```
tokenId
queueNumber
branchId
serviceType
userName
userPhone
status (waiting, arrived, serving, completed, cancelled)
createdAt
serviceStartTime
serviceEndTime
qrCodeValue
```

### QueueHistory
```
*all Token fields*
updatedAt (completion timestamp)
```

## 🛠️ Setup Instructions

### Backend Setup

1. **Clone and navigate to server directory**
   ```bash
   cd server
   npm install
   ```

2. **Setup Firebase**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
   - Create a Firestore database
   - Generate service account key (JSON)
   - Copy credentials to `.env` file

3. **Configure .env**
   ```bash
   cp .env.example .env
   # Fill in your Firebase credentials
   ```

4. **Start server**
   ```bash
   npm run dev        # Development with nodemon
   npm start          # Production
   ```

Server runs on `http://localhost:5000`

### Frontend Setup

1. **Navigate to client directory**
   ```bash
   cd client
   npm install
   ```

2. **Configure .env**
   ```bash
   cp .env.example .env
   # Update API_URL and SOCKET_URL if needed
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

Frontend runs on `http://localhost:5173`

## 📚 API Endpoints

### Token Management
- `POST /api/token/book` - Book a token
- `GET /api/token/queue/:branchId` - Get queue status
- `GET /api/token/:tokenId` - Get token details
- `POST /api/token/update-status` - Update token status (admin)
- `POST /api/token/cancel` - Cancel token
- `GET /api/token/analytics/:branchId` - Get branch analytics

## 🔔 Socket.io Events

### Client to Server
- `joinBranch` - Join a branch room for real-time updates
- `leaveBranch` - Leave a branch room

### Server to Client
- `queueUpdated` - Emitted when a token is booked, status updated, or cancelled

## 🎯 Features in Detail

### 1. Wait Time Prediction Algorithm
Weighted Moving Average (WMA) of last 10 completed tokens:
- Recent tokens have higher weight
- Default 8 minutes if no history
- Peak hour multiplier: 25% increase during 11 AM - 2 PM

### 2. Crowd Density Calculation
```
densityRatio = waitingTokens / activeCounters
- LOW: < 2
- MEDIUM: 2-5
- HIGH: > 5
```

### 3. QR Code Generation
- Uses `qrcode.react` library
- Contains tokenId for verification
- Downloadable and printable

### 4. Real-time Updates
- Socket.io for instant queue synchronization
- Auto-refresh every 5-10 seconds
- Handles connection/reconnection gracefully

## 🚦 Status Workflow

```
waiting → serving → completed
   ↓
 cancelled
```

## 📊 Admin Dashboard Features

- View active queue
- Start/Complete/Cancel tokens
- Real-time crowd density
- Hourly analytics graph
- Peak hour detection
- No-show rate calculation
- Average service time

## 🔒 Production Checklist

- [ ] Set `NODE_ENV=production` in server
- [ ] Enable HTTPS in production
- [ ] Implement authentication for admin routes
- [ ] Set up proper CORS origins
- [ ] Use environment variables for all secrets
- [ ] Enable Firestore security rules
- [ ] Set up monitoring and logging
- [ ] Rate limiting on API endpoints
- [ ] Database backups configured
- [ ] Error tracking (Sentry, DataDog, etc.)

## 🐛 Debugging

### Server Logs
Check console for connection info and errors

### Firebase Issues
- Verify service account has Firestore access
- Check security rules aren't blocking access
- Ensure private key is properly escaped in .env

### Socket.io Connection Issues
- Verify CLIENT_URL in server .env
- Check CORS settings
- Ensure port 5000 is not in use

## 🎓 Learning Resources

- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Socket.io Documentation](https://socket.io/docs/)
- [Express.js Guide](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)

## 📝 License

MIT License - Feel free to use this project for learning and development!

## 🤝 Support

For issues or questions, please create an issue in the repository.

---

**Built with ❤️ for the hackathon | 2026**
