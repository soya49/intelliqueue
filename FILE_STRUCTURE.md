# IntelliQueue - Complete File Structure & Navigation Guide

## 📋 File Directory

### 🔧 Root Configuration Files
```
intelliqueue/
├── .gitignore                 # Git ignore for entire project
├── .editorconfig             # Code style configuration
├── docker-compose.yml        # Docker multi-container setup
├── setup.sh                  # Linux/Mac automatic setup
├── setup.bat                 # Windows automatic setup
```

### 📚 Documentation Files
```
intelliqueue/
├── README.md                      # Main project documentation (START HERE)
├── QUICKSTART.md                 # 5-minute quick start guide
├── PROJECT_SUMMARY.md            # Complete project overview
├── API_DOCUMENTATION.md          # Complete API reference
├── DEPLOYMENT.md                 # Deployment strategies & guide
├── SAMPLE_DATA.md                # Sample Firestore database structure
└── FILE_STRUCTURE.md             # This file
```

---

## 🖥️ BACKEND FILES

### Core Backend Files
```
server/
├── server.js                 # ⭐ Main Express server with Socket.io
├── firebaseAdmin.js          # Firebase initialization
├── package.json              # Backend dependencies
├── .env.example              # Firebase credentials template
├── Dockerfile                # Docker configuration
├── .gitignore               # Git ignore for backend
└── firestore.rules          # Firestore security rules
```

### Controllers (API Handlers)
```
server/controllers/
└── tokenController.js        # ⭐ All API endpoint handlers
   - bookToken()             # Create new token
   - getQueueStatus()        # Get queue info
   - getTokenDetails()       # Get token by ID
   - updateTokenStatus()     # Admin update status
   - cancelToken()           # Cancel token
   - getAnalytics()          # Get analytics data
```

### Services (Business Logic)
```
server/services/
└── queueLogic.js            # ⭐ Core algorithms
   - calculateWeightedMovingAverage()  # WMA calculation
   - calculateEstimatedWaitTime()      # Wait time prediction
   - calculateCrowdDensity()           # Crowd indicator
   - getUserQueuePosition()            # Queue position
```

### Routes (API Routing)
```
server/routes/
└── tokenRoutes.js           # ⭐ Route definitions
   - POST /book
   - GET /queue/:branchId
   - GET /:tokenId
   - POST /update-status
   - POST /cancel
   - GET /analytics/:branchId
```

---

## 💻 FRONTEND FILES

### Core Application Files
```
client/
├── index.html               # HTML template
├── vite.config.js          # Vite bundler configuration
├── tailwind.config.js      # Tailwind CSS customization
├── postcss.config.js       # PostCSS configuration
├── nginx.conf              # Nginx reverse proxy config
├── Dockerfile              # Docker configuration
├── package.json            # Frontend dependencies
├── .env.example            # API & Socket URL template
├── .gitignore             # Git ignore for frontend
```

### Source Code
```
client/src/
├── App.jsx                 # ⭐ Main app component
├── main.jsx                # React entry point
├── index.css               # Global Tailwind styles
```

### Pages (Full-Page Components)
```
client/src/pages/
├── Home.jsx                # ⭐ Token booking page
│  - Branch selection
│  - Service selection
│  - User info input
│  - Token booking
│  - Success feedback
│
├── LiveQueue.jsx           # ⭐ Queue status display
│  - QR code display
│  - Token number
│  - Real-time position
│  - Estimated wait time
│  - Progress bar
│  - Socket.io updates
│
└── AdminDashboard.jsx      # ⭐ Admin control panel
   - Queue management list
   - Token status controls
   - Analytics with charts
   - Crowd density indicator
   - Service filtering
```

### Components (Reusable UI)
```
client/src/components/
├── Toast.jsx               # Notification toast component
│  - Success/error/warning messages
│  - Auto-dismiss
│  - Icons
│
└── LoadingSpinner.jsx      # Loading indicator component
   - Animated spinner
   - Custom messages
   - Size variations
```

### Services (API & Real-time)
```
client/src/services/
├── api.js                  # ⭐ Axios API client
│  - bookToken()
│  - getQueueStatus()
│  - getTokenDetails()
│  - updateTokenStatus()
│  - cancelToken()
│  - getAnalytics()
│
└── socket.js               # ⭐ Socket.io client
   - initializeSocket()
   - getSocket()
   - joinBranch()
   - leaveBranch()
   - onQueueUpdated()
   - offQueueUpdated()
```

---

## 🚀 GETTING STARTED

### Step 1: Initial Setup
```bash
# Windows
setup.bat

# macOS/Linux
chmod +x setup.sh
./setup.sh
```

### Step 2: Configure Firebase
Edit `server/.env` with your Firebase credentials

### Step 3: Start Development
```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm run dev
```

---

## 📖 DOCUMENTATION GUIDE

### For First-Time Users: Read in Order
1. **[README.md](README.md)** - Overview & features
2. **[QUICKSTART.md](QUICKSTART.md)** - Quick 5-minute setup
3. **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** - Complete overview

### For API Development
1. **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)** - All endpoints
2. **[server/controllers/tokenController.js](server/controllers/tokenController.js)** - Implementation

### For Deployment
1. **[DEPLOYMENT.md](DEPLOYMENT.md)** - Step-by-step guides
2. **[docker-compose.yml](docker-compose.yml)** - Docker multi-container

### For Database
1. **[SAMPLE_DATA.md](SAMPLE_DATA.md)** - Collection structure
2. **[server/firestore.rules](server/firestore.rules)** - Security rules

---

## 🔑 KEY ALGORITHMS

### Located in: `server/services/queueLogic.js`

#### Weighted Moving Average (WMA)
- Calculates average service time from last 10 completed tokens
- Recent tokens weighted higher
- Returns 8 minutes default if no history

#### Crowd Density Calculation
- Ratio of waiting tokens to active counters
- Returns LOW/MEDIUM/HIGH
- Real-time metric

#### Wait Time Prediction
- Multiplies queue position × average service time
- Applies 25% peak hour multiplier (11 AM - 2 PM)
- Displays estimated minutes

---

## 🎯 FEATURE LOCATIONS

### QR Code Feature
- **Generation**: [Home.jsx → bookToken()](client/src/pages/Home.jsx)
- **Display**: [LiveQueue.jsx → QRCode component](client/src/pages/LiveQueue.jsx)
- **Backend**: [tokenController.js → bookToken()](server/controllers/tokenController.js)

### Real-Time Updates
- **Client Setup**: [socket.js](client/src/services/socket.js)
- **Server Setup**: [server.js → io.on('connection')](server/server.js)
- **Front-end Usage**: [LiveQueue.jsx → onQueueUpdated()](client/src/pages/LiveQueue.jsx)

### Admin Dashboard
- **Page**: [AdminDashboard.jsx](client/src/pages/AdminDashboard.jsx)
- **Analytics API**: [tokenController.js → getAnalytics()](server/controllers/tokenController.js)
- **Queue Management**: Token status update buttons in dashboard

### Wait Time Prediction
- **Algorithm**: [queueLogic.js → calculateEstimatedWaitTime()](server/services/queueLogic.js)
- **API**: [tokenController.js → getQueueStatus()](server/controllers/tokenController.js)
- **Display**: [LiveQueue.jsx → estimatedWaitTime](client/src/pages/LiveQueue.jsx)

---

## 🧪 TESTING EACH FEATURE

### Test Token Booking
1. Open `http://localhost:5173`
2. Fill form and click "Book Token"
3. Check `server/logs` for token creation

### Test Real-Time Updates
1. Book token in browser 1
2. Open admin panel in browser 2
3. Change status in browser 2
4. Observe update in browser 1 instantly

### Test Analytics
1. Complete several tokens
2. Go to Admin Dashboard
3. View hourly distribution chart
4. Check peak hour detection

### Test QR Code
1. Open LiveQueue page
2. Scan QR code with phone
3. Base64 encoded tokenId decoded

---

## 📊 API ENDPOINT QUICK REFERENCE

```
POST   /api/token/book                → Create token
GET    /api/token/queue/:branchId     → Queue status
GET    /api/token/:tokenId            → Token details
POST   /api/token/update-status       → Update status (admin)
POST   /api/token/cancel              → Cancel token
GET    /api/token/analytics/:branchId → Analytics data
GET    /health                        → Health check
```

See [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for full details.

---

## 🐳 DOCKER DEPLOYMENT

### Single Command Deployment
```bash
docker-compose up -d
```

### Files Involved
- [docker-compose.yml](docker-compose.yml) - Orchestration
- [server/Dockerfile](server/Dockerfile) - Backend image
- [client/Dockerfile](client/Dockerfile) - Frontend image
- [client/nginx.conf](client/nginx.conf) - Web server config

---

## 🔐 SECURITY

### Configuration Files
- [server/.env.example](server/.env.example) - Firebase credentials
- [server/firestore.rules](server/firestore.rules) - Database rules

### Security Practices Implemented
- Environment variables for secrets
- Firebase Admin SDK validation
- CORS configuration
- Input validation in controllers

---

## 📦 UNDERSTANDING DEPENDENCIES

### Backend (See server/package.json)
- **express** - Web framework
- **socket.io** - Real-time communication
- **firebase-admin** - Database
- **cors** - Cross-origin requests
- **dotenv** - Environment variables

### Frontend (See client/package.json)
- **react** - UI library
- **vite** - Build tool
- **tailwindcss** - Styling
- **socket.io-client** - Real-time client
- **axios** - HTTP client
- **recharts** - Charts
- **qrcode.react** - QR code generation
- **lucide-react** - Icons

---

## 🆘 TROUBLESHOOTING

### Firebase Connection Issues
→ Check [QUICKSTART.md - Troubleshooting](QUICKSTART.md#troubleshooting)

### Port Conflicts
→ Check [QUICKSTART.md - Port Already in Use](QUICKSTART.md#port-already-in-use)

### Setup Errors
→ Check [QUICKSTART.md - Dependencies Installation Issues](QUICKSTART.md#dependencies-installation-issues)

---

## 🚀 DEPLOYMENT PATHS

### For Hackathon Demo
→ Follow [QUICKSTART.md](QUICKSTART.md)

### For Production on Vercel + Heroku
→ See [DEPLOYMENT.md - Option 1](DEPLOYMENT.md#option-1-vercel-frontend--heroku-backend)

### For Self-Hosted Docker
→ See [DEPLOYMENT.md - Option 3](DEPLOYMENT.md#option-3-docker--docker-compose-vps--self-hosted)

### For AWS
→ See [DEPLOYMENT.md - Option 4](DEPLOYMENT.md#option-4-aws-ec2--rds)

---

## 📝 FILE NAMING CONVENTIONS

- **Pages**: PascalCase with .jsx → `Home.jsx`
- **Components**: PascalCase with .jsx → `Toast.jsx`
- **Services/Utils**: camelCase with .js → `api.js`
- **Controllers**: camelCase with .js → `tokenController.js`
- **Configs**: lowercase with dots → `tailwind.config.js`

---

## 🎓 LEARNING PATH

### Beginner (Frontend)
1. Read [README.md](README.md)
2. Look at [Home.jsx](client/src/pages/Home.jsx)
3. Check form state management
4. Review [api.js](client/src/services/api.js) calls

### Intermediate (Full-Stack)
1. Understand API flow in [tokenController.js](server/controllers/tokenController.js)
2. Review [LiveQueue.jsx](client/src/pages/LiveQueue.jsx) and [socket.js](client/src/services/socket.js)
3. Check real-time sync in [server.js](server/server.js)

### Advanced (Architecture)
1. Study [queueLogic.js](server/services/queueLogic.js) algorithms
2. Review error handling patterns
3. Examine database queries in controllers
4. Check Socket.io room architecture

---

## 🎯 QUICK FILE CHECKLIST

### Must Edit (Before First Run)
- [ ] `server/.env` - Add Firebase credentials

### Should Understand (Core Logic)
- [ ] `server/controllers/tokenController.js` - API handlers
- [ ] `server/services/queueLogic.js` - Algorithms
- [ ] `client/src/pages/LiveQueue.jsx` - Real-time UI
- [ ] `client/src/services/socket.js` - Socket client

### Can Customize (For Your Usecase)
- [ ] Mock data in [Home.jsx](client/src/pages/Home.jsx)
- [ ] Colors in [tailwind.config.js](client/tailwind.config.js)
- [ ] API endpoints in [api.js](client/src/services/api.js)

---

## 📞 SUPPORT RESOURCES

**Quick Questions**: Check [QUICKSTART.md](QUICKSTART.md)
**API Usage**: See [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
**Deployment Help**: Read [DEPLOYMENT.md](DEPLOYMENT.md)
**General Info**: Review [README.md](README.md)
**Project Overview**: Check [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)

---

**Last Updated**: February 2026
**Status**: ✅ COMPLETE & PRODUCTION-READY
