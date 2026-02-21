# IntelliQueue - Deployment Guide

## 📦 Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] Firebase security rules implemented
- [ ] Error logging set up (Sentry, LogRocket, etc.)
- [ ] Database backups configured
- [ ] CORS origins whitelisted
- [ ] API rate limiting enabled
- [ ] HTTPS/SSL certificates ready
- [ ] Database migrations tested
- [ ] Frontend build tested
- [ ] Performance monitoring enabled

---

## 🚀 Deployment Options

### Option 1: Vercel (Frontend) + Heroku (Backend)

#### Frontend to Vercel

1. **Push code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git push -u origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import project from GitHub
   - Set environment variables in dashboard
   - Deploy

3. **Configure Environment Variables in Vercel:**
   ```
   VITE_API_URL=https://your-backend.herokuapp.com/api
   VITE_SOCKET_URL=https://your-backend.herokuapp.com
   ```

#### Backend to Heroku

1. **Create Heroku app**
   ```bash
   heroku create intelliqueue-server
   ```

2. **Set environment variables**
   ```bash
   heroku config:set PORT=5000
   heroku config:set FIREBASE_PROJECT_ID=your-project-id
   heroku config:set FIREBASE_CLIENT_EMAIL=your-email
   heroku config:set FIREBASE_PRIVATE_KEY='your-key'
   # ... other variables
   ```

3. **Deploy**
   ```bash
   git push heroku main
   ```

4. **Check logs**
   ```bash
   heroku logs --tail
   ```

---

### Option 2: Docker + Cloud Run (Google Cloud)

#### Build and Push Docker Image

```bash
# Build image
docker build -t gcr.io/your-project/intelliqueue-backend ./server
docker build -t gcr.io/your-project/intelliqueue-frontend ./client

# Push to Google Container Registry
docker push gcr.io/your-project/intelliqueue-backend
docker push gcr.io/your-project/intelliqueue-frontend
```

#### Deploy to Cloud Run

```bash
# Deploy backend
gcloud run deploy intelliqueue-backend \
  --image gcr.io/your-project/intelliqueue-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars FIREBASE_PROJECT_ID=your-id,FIREBASE_CLIENT_EMAIL=your-email

# Deploy frontend
gcloud run deploy intelliqueue-frontend \
  --image gcr.io/your-project/intelliqueue-frontend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

---

### Option 3: Docker + Docker Compose (VPS / Self-Hosted)

#### Prerequisites
- VPS or server with Ubuntu/Debian
- Docker and Docker Compose installed
- Domain name (optional, for SSL)

#### Steps

1. **SSH into your server**
   ```bash
   ssh root@your-server-ip
   ```

2. **Clone repository**
   ```bash
   git clone https://github.com/your-username/intelliqueue.git
   cd intelliqueue
   ```

3. **Configure environment**
   ```bash
   cp server/.env.example server/.env
   cp client/.env.example client/.env
   # Edit files with your credentials
   ```

4. **Start with Docker Compose**
   ```bash
   docker-compose up -d
   ```

5. **Setup Nginx Reverse Proxy (optional)**
   ```bash
   # Install Nginx
   sudo apt update && sudo apt install nginx

   # Configure proxy
   sudo nano /etc/nginx/sites-available/default
   ```

   Add this config:
   ```nginx
   server {
       listen 80 default_server;
       server_name your-domain.com;

       # Frontend
       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }

       # API
       location /api {
           proxy_pass http://localhost:5000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

6. **Setup SSL with Certbot**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

7. **Monitor logs**
   ```bash
   docker-compose logs -f
   ```

---

### Option 4: AWS (EC2 + RDS)

#### Setup EC2 Instance

1. **Launch EC2 instance** (Ubuntu 22.04)
   - t3.small or larger
   - Security group: Allow ports 80, 443, 5000

2. **Connect and setup**
   ```bash
   ssh -i your-key.pem ubuntu@your-instance-ip
   
   # Install Node.js
   curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2 (process manager)
   npm install -g pm2
   
   # Install Nginx
   sudo apt update && sudo apt install nginx
   ```

3. **Deploy application**
   ```bash
   git clone https://github.com/your-username/intelliqueue.git
   cd intelliqueue/server
   npm install
   
   # Start with PM2
   pm2 start server.js --name "intelliqueue"
   pm2 save
   pm2 startup
   ```

4. **Configure Nginx**
   Similar to VPS section above

5. **Setup CloudFront** (optional)
   - Distribute static assets
   - Cache optimization
   - DDoS protection

---

## 📈 Performance Optimization

### Frontend Optimization
```bash
# In client/vite.config.js
export default defineConfig({
  build: {
    minify: 'terser',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'utils': ['axios', 'socket.io-client']
        }
      }
    }
  }
});
```

### Backend Optimization
- Enable gzip compression
- Implement caching
- Database indexing
- Connection pooling

### Database Optimization
```javascript
// In firebaseAdmin.js
const settings = {
  ignoreUndefinedProperties: true
};
db.settings(settings);
```

---

## 🔒 Security Best Practices

1. **Environment Variables**
   - Never commit `.env` files
   - Use secrets management (AWS Secrets Manager, Google Secret Manager)
   - Rotate credentials periodically

2. **CORS Configuration**
   ```javascript
   if (process.env.NODE_ENV === 'production') {
     app.use(cors({
       origin: process.env.CLIENT_URL,
       credentials: true
     }));
   }
   ```

3. **Rate Limiting**
   ```bash
   npm install express-rate-limit
   ```

   ```javascript
   import rateLimit from 'express-rate-limit';

   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100 // limit each IP to 100 requests per windowMs
   });

   app.use('/api/', limiter);
   ```

4. **Helmet.js** (Security headers)
   ```bash
   npm install helmet
   ```

   ```javascript
   import helmet from 'helmet';
   app.use(helmet());
   ```

5. **Input Validation**
   ```bash
   npm install joi
   ```

6. **SQL/NoSQL Injection Prevention**
   - Always use parameterized queries
   - Validate and sanitize inputs
   - Use Firebase Security Rules

---

## 📊 Monitoring & Logging

### Logging Service (Sentry)

```bash
npm install @sentry/node
```

```javascript
import * as Sentry from "@sentry/node";

Sentry.init({ dsn: 'your-sentry-dsn' });

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

### Performance Monitoring
- Google Analytics for frontend
- Firebase Performance Monitoring
- New Relic or DataDog for backend
- Grafana for custom metrics

### Database Monitoring
- Firebase Console dashboard
- Query performance analysis
- Storage usage alerts
- Backup status monitoring

---

## 🔄 CI/CD Pipeline

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v2

    - name: Build and deploy frontend
      run: |
        cd client
        npm install
        npm run build

    - name: Deploy to Vercel
      env:
        VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
      run: vercel --prod --confirm

    - name: Deploy backend to Heroku
      env:
        HEROKU_API_KEY: ${{ secrets.HEROKU_API_KEY }}
      run: |
        git remote add heroku https://git.heroku.com/intelliqueue-server.git
        git push heroku main
```

---

## 📝 Maintenance

### Regular Tasks
- [ ] Monitor logs for errors
- [ ] Update dependencies monthly
- [ ] Review security advisories
- [ ] Optimize database (cleanup old records)
- [ ] Backup data regularly
- [ ] Performance testing
- [ ] Load testing before peak times

### Scaling
- **Horizontal**: Add more server instances
- **Vertical**: Increase instance size
- **Database**: Firestore scales automatically
- **CDN**: Use Cloud Flare or AWS CloudFront

### Zero-Downtime Deployment
```bash
# Use blue-green deployment
# OR
# Use rolling deployment with load balancer
```

---

## 🆘 Troubleshooting

### High Latency
- Check database query performance
- Implement caching
- Use CDN for static assets
- Optimize Socket.io connections

### Memory Leaks
- Use Node.js heap snapshots
- Profile with clinic.js
- Check for circular references

### Database Quota Exceeded
- Check read/write operations
- Add indexing for common queries
- Implement caching layer
- Consider database cleanup

---

## 📞 Support & Resources

- [Firebase Deployment Guide](https://firebase.google.com/docs/hosting)
- [Vercel Documentation](https://vercel.com/docs)
- [Heroku Documentation](https://devcenter.heroku.com/)
- [AWS Documentation](https://docs.aws.amazon.com/)
- [Node.js Production Best Practices](https://nodejs.org/en/docs/guides/nodejs-web-app/)

---

**Last Updated**: February 2026
