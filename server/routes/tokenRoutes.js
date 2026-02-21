import express from 'express';
import {
  bookToken,
  getQueueStatus,
  getTokenDetails,
  updateTokenStatus,
  cancelToken,
  getAnalytics,
  getHeatMap,
} from '../controllers/tokenController.js';

const router = express.Router();

// Token booking
router.post('/book', bookToken);

// Get queue status
router.get('/queue/:branchId', getQueueStatus);

// Get token details
router.get('/:tokenId', getTokenDetails);

// Update token status
router.post('/update-status', updateTokenStatus);

// Cancel token
router.post('/cancel', cancelToken);

// Get analytics
router.get('/analytics/:branchId', getAnalytics);

// Get crowd density heat map
router.get('/heatmap/:branchId', getHeatMap);

export default router;
