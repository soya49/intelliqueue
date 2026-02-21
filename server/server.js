import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import tokenRoutes from './routes/tokenRoutes.js';
import advancedRoutes from './routes/advancedRoutes.js';
import { startNoShowDetection } from './services/queueLogic.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Create HTTP server with Socket.io
const server = http.createServer(app);
export const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Join a branch room for real-time updates
  socket.on('joinBranch', (branchId) => {
    socket.join(`branch-${branchId}`);
    console.log(`Socket ${socket.id} joined branch: ${branchId}`);
  });

  // Leave branch room
  socket.on('leaveBranch', (branchId) => {
    socket.leave(`branch-${branchId}`);
    console.log(`Socket ${socket.id} left branch: ${branchId}`);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// API Routes
app.use('/api/token', tokenRoutes);
app.use('/api/advanced', advancedRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'IntelliQueue Server is running!' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
server.listen(port, () => {
  console.log(`🚀 IntelliQueue Server running on port ${port}`);
  // Start background no-show detection scheduler
  startNoShowDetection(io);
});

export default app;
