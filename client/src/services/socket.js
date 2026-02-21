import io from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export const initializeSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('Connected to Socket.io server:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from Socket.io server');
    });

    socket.on('error', (error) => {
      console.error('Socket.io error:', error);
    });
  }
  return socket;
};

export const getSocket = () => {
  if (!socket) {
    return initializeSocket();
  }
  return socket;
};

/**
 * Join a branch room to receive real-time updates
 */
export const joinBranch = (branchId) => {
  const socket = getSocket();
  socket.emit('joinBranch', branchId);
};

/**
 * Leave a branch room
 */
export const leaveBranch = (branchId) => {
  const socket = getSocket();
  socket.emit('leaveBranch', branchId);
};

/**
 * Listen for queue updates
 */
export const onQueueUpdated = (callback) => {
  const socket = getSocket();
  socket.on('queueUpdated', callback);
};

/**
 * Remove queue update listener
 */
export const offQueueUpdated = (callback) => {
  const socket = getSocket();
  socket.off('queueUpdated', callback);
};

export default {
  initializeSocket,
  getSocket,
  joinBranch,
  leaveBranch,
  onQueueUpdated,
  offQueueUpdated,
};
