import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token endpoints
export const tokenAPI = {
  // Book a new token
  bookToken: async (branchId, serviceType, userName, userPhone, priority) => {
    try {
      const response = await apiClient.post('/token/book', {
        branchId,
        serviceType,
        userName,
        userPhone,
        priority: priority || 'normal',
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get queue status
  getQueueStatus: async (branchId, serviceType) => {
    try {
      const response = await apiClient.get(`/token/queue/${branchId}`, {
        params: { serviceType },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get token details
  getTokenDetails: async (tokenId) => {
    try {
      const response = await apiClient.get(`/token/${tokenId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Update token status
  updateTokenStatus: async (tokenId, status, branchId) => {
    try {
      const response = await apiClient.post('/token/update-status', {
        tokenId,
        status,
        branchId,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Cancel token
  cancelToken: async (tokenId) => {
    try {
      const response = await apiClient.post('/token/cancel', { tokenId });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get analytics
  getAnalytics: async (branchId) => {
    try {
      const response = await apiClient.get(`/token/analytics/${branchId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get crowd density heat map
  getHeatMap: async (branchId) => {
    try {
      const response = await apiClient.get(`/token/heatmap/${branchId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // ====== ADVANCED ULTRA FEATURES ======

  // Smart Counter Allocation — get counter info for a branch
  getCounters: async (branchId) => {
    const response = await apiClient.get(`/advanced/counters/${branchId}`);
    return response.data;
  },

  // Group Booking — book multiple tokens as a family/group
  groupBook: async (branchId, serviceType, members, priority) => {
    const response = await apiClient.post('/advanced/group-book', {
      branchId, serviceType, members, priority,
    });
    return response.data;
  },

  // Demand Forecast — hourly prediction
  getForecast: async (branchId) => {
    const response = await apiClient.get(`/advanced/forecast/${branchId}`);
    return response.data;
  },

  // Seat Availability
  getSeats: async (branchId) => {
    const response = await apiClient.get(`/advanced/seats/${branchId}`);
    return response.data;
  },

  // Performance Leaderboard
  getLeaderboard: async (branchId) => {
    const response = await apiClient.get(`/advanced/leaderboard/${branchId}`);
    return response.data;
  },

  // Weather Impact
  getWeather: async () => {
    const response = await apiClient.get('/advanced/weather');
    return response.data;
  },

  // Enhanced AI Wait Prediction (counter-aware)
  getPrediction: async (branchId, serviceType) => {
    const response = await apiClient.get(`/advanced/prediction/${branchId}/${serviceType}`);
    return response.data;
  },

  // Time Slots
  getTimeSlots: async (branchId) => {
    const response = await apiClient.get(`/advanced/timeslots/${branchId}`);
    return response.data;
  },

  // Customer Feedback — submit
  submitFeedback: async (data) => {
    const response = await apiClient.post('/advanced/feedback', data);
    return response.data;
  },

  // Customer Feedback — get stats
  getFeedbackStats: async (branchId) => {
    const response = await apiClient.get(`/advanced/feedback/${branchId}`);
    return response.data;
  },

  // Traffic Light Queue Display
  getTrafficLight: async (branchId) => {
    const response = await apiClient.get(`/advanced/traffic-light/${branchId}`);
    return response.data;
  },

  // Notification Log
  getNotifications: async () => {
    const response = await apiClient.get('/advanced/notifications');
    return response.data;
  },

  // QR Self Check-in (Kiosk)
  selfCheckIn: async (tokenId) => {
    const response = await apiClient.post('/advanced/checkin', { tokenId });
    return response.data;
  },
};

export default apiClient;
