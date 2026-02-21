# IntelliQueue - Quick Start Guide

## Prerequisites
- Node.js 16+ installed
- npm or yarn package manager
- Firebase account and project

## 🚀 Quick Start (5 minutes)

### Step 1: Run Setup Script

**For macOS/Linux:**
```bash
chmod +x setup.sh
./setup.sh
```

**For Windows:**
```bash
setup.bat
```

This will:
- Create `.env` files from templates
- Install all dependencies for backend and frontend

### Step 2: Configure Firebase

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Create a Firestore database (select Production mode initially)
3. Go to Project Settings → Service Accounts → Generate New Private Key (JSON)
4. Copy the JSON certificate and fill in `server/.env` with:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY` (with escaped newlines: `\n`)
   - `FIREBASE_CLIENT_ID`
   - `FIREBASE_PRIVATE_KEY_ID`

### Step 3: Firebase Security Rules (Optional for development)

In Firebase Console, go to Firestore → Rules and use:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow all reads and writes for development
    match /{document=**} {
      allow read, write;
    }
  }
}
```

For production, implement proper authentication!

### Step 4: Start Development Servers

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```
Output: `🚀 IntelliQueue Server running on port 5000`

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```
Output: `➜ Local: http://localhost:5173/`

### Step 5: Test the Application

1. Open browser to `http://localhost:5173`
2. Click "Book Token"
3. Fill in the form and submit
4. View your QR code and real-time queue status
5. Click "Admin Panel" button to try admin features

## 📊 Creating Test Data (Firestore)

### Option 1: Manual Creation via Firebase Console

1. Go to Firebase Console
2. Create collections:
   - `Branches` - Add a document with ID `branch1`:
     ```json
     {
       "name": "Main Hospital - Cardiology",
       "location": "Downtown",
       "lastQueueNumber": 0,
       "createdAt": "2026-02-20T00:00:00Z"
     }
     ```
   - `Counters` - Add documents for active counters:
     ```json
     {
       "branchId": "branch1",
       "counterNumber": 1,
       "status": "idle",
       "createdAt": "2026-02-20T00:00:00Z"
     }
     ```

### Option 2: Via API Calls

Use Postman or curl:

```bash
# Book a token
curl -X POST http://localhost:5000/api/token/book \
  -H "Content-Type: application/json" \
  -d '{
    "branchId": "branch1",
    "serviceType": "consultation",
    "userName": "John Doe",
    "userPhone": "+1234567890"
  }'
```

## 🔧 Troubleshooting

### Firebase Connection Error
```
Error: Failed to initialize Firebase Admin SDK
```
**Solution:**
- Verify all Firebase credentials in `server/.env` are correct
- Check that `FIREBASE_PRIVATE_KEY` has `\n` for newlines (not actual line breaks)
- Ensure Firestore database is enabled in Firebase Console

### Socket.io Connection Issues
```
WebSocket connection failed
```
**Solution:**
- Verify backend is running on port 5000
- Check that `CLIENT_URL` in `server/.env` matches your frontend URL
- Clear browser cache and refresh

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::5000
```
**Solution:**
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9  # macOS/Linux
netstat -ano | findstr :5000   # Windows
```

### Dependencies Installation Issues
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📁 Project Structure Overview

```
intelliqueue/
├── server/                 # Express backend
│   ├── controllers/        # Route handlers
│   ├── services/           # Business logic (WMA, density)
│   ├── routes/             # API routes
│   ├── server.js           # Entry point
│   ├── firebaseAdmin.js    # Firebase setup
│   └── package.json
│
├── client/                 # React frontend
│   ├── src/
│   │   ├── pages/          # Home, LiveQueue, AdminDashboard
│   │   ├── components/     # Toast, LoadingSpinner
│   │   ├── services/       # API calls, Socket.io
│   │   ├── App.jsx
│   │   └── index.css
│   ├── index.html
│   └── package.json
│
└── README.md               # Full documentation
```

## 🎯 Key Concepts

### Weighted Moving Average (WMA)
- Calculates average service time from last 10 completed tokens
- Recent tokens have higher weight
- Returns 8 minutes if no history
- Used for wait time estimation

### Crowd Density
- Ratio of waiting tokens to active counters
- LOW (<2), MEDIUM (2-5), HIGH (>5)
- Real-time metric updated with each token change

### Socket.io Real-time Updates
- Clients join branch rooms
- Server emits `queueUpdated` when tokens change
- Automatic reconnection if connection drops

### QR Code Flow
1. Token booked → QR code generated
2. QR value = tokenId
3. Admin scans or enters tokenId to update status
4. User shows QR at counter for verification

## 🚀 Next Steps

1. **Customize Data**: Modify mock branches and services in [Home.jsx](client/src/pages/Home.jsx)
2. **Add Authentication**: Implement user login/authentication layer
3. **Database Rules**: Set up Firestore security rules for production
4. **Styling**: Customize Tailwind colors in [tailwind.config.js](client/tailwind.config.js)
5. **Notifications**: Add push notifications or SMS alerts
6. **Analytics**: Integrate Google Analytics or Mixpanel
7. **Deployment**: Deploy to Vercel (frontend) and Cloud Run/Heroku (backend)

## 📚 Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [React Documentation](https://react.dev)
- [Socket.io Guide](https://socket.io/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Express.js](https://expressjs.com/)

## 🎓 Learning Tips

- Start with Home.jsx to understand the flow
- Check socketservice.js to see real-time implementation
- Review queueLogic.js for the WMA algorithm
- Look at AdminDashboard.jsx for advanced features

## 💡 Ideas for Enhancement

- SMS/Email notifications
- Mobile app with push notifications
- Multi-language support
- Advanced analytics dashboard
- Machine learning predictions for peak hours
- Integration with payment systems
- Video call for remote consultations
- Appointment scheduling system

---

**Need Help?** Check the full [README.md](README.md) for more details!
