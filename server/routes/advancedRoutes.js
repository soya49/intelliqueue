import express from 'express';
import {
  getCounters, groupBook, getForecast, getSeats, releaseTokenSeat,
  getLeaderboard, getWeather, getPrediction, getTimeSlots,
  submitFeedback, getFeedbackStats, getTrafficLight, getNotifications, selfCheckIn,
} from '../controllers/advancedController.js';

const router = express.Router();

// Smart counter allocation
router.get('/counters/:branchId', getCounters);

// Group booking (family tokens)
router.post('/group-book', groupBook);

// Demand forecast
router.get('/forecast/:branchId', getForecast);

// Seat availability
router.get('/seats/:branchId', getSeats);
router.post('/seats/release', releaseTokenSeat);

// Performance leaderboard
router.get('/leaderboard/:branchId', getLeaderboard);

// Weather impact
router.get('/weather', getWeather);

// Enhanced AI wait prediction
router.get('/prediction/:branchId/:serviceType', getPrediction);

// Time slot booking
router.get('/timeslots/:branchId', getTimeSlots);

// Customer feedback
router.post('/feedback', submitFeedback);
router.get('/feedback/:branchId', getFeedbackStats);

// Traffic light display
router.get('/traffic-light/:branchId', getTrafficLight);

// Notification log
router.get('/notifications', getNotifications);

// Self check-in (QR Kiosk)
router.post('/checkin', selfCheckIn);

export default router;
