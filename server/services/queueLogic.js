import { db } from '../firebaseAdmin.js';

/**
 * Priority weight mapping: emergency(0) > senior(1) > normal(2)
 */
export function getPriorityWeight(priority) {
  switch (priority) {
    case 'emergency': return 0;
    case 'senior': return 1;
    default: return 2;
  }
}

/**
 * Calculate Weighted Moving Average (WMA) of service times
 * Recent tokens have higher weight
 * Simplified to avoid composite index requirements
 */
async function calculateWeightedMovingAverage(branchId, serviceType) {
  try {
    // Fetch completed tokens for this branch (filter serviceType in code)
    const completedTokensSnapshot = await db
      .collection('QueueHistory')
      .where('branchId', '==', branchId)
      .where('status', '==', 'completed')
      .get();

    if (completedTokensSnapshot.empty) {
      return 8; // Default 8 minutes if no history
    }

    // Filter by serviceType and sort in code to avoid composite index
    const tokens = completedTokensSnapshot.docs
      .map((doc) => doc.data())
      .filter((t) => t.serviceType === serviceType)
      .sort((a, b) => {
        const aTime = a.serviceEndTimeISO ? new Date(a.serviceEndTimeISO) : a.serviceEndTime?.toDate?.() || new Date(0);
        const bTime = b.serviceEndTimeISO ? new Date(b.serviceEndTimeISO) : b.serviceEndTime?.toDate?.() || new Date(0);
        return bTime - aTime; // desc
      })
      .slice(0, 10);

    if (tokens.length === 0) return 8;

    // Calculate service time for each token
    const serviceTimes = tokens.map((token) => {
      const serviceStart = token.serviceStartTimeISO
        ? new Date(token.serviceStartTimeISO)
        : token.serviceStartTime?.toDate?.() || new Date(token.serviceStartTime);
      const serviceEnd = token.serviceEndTimeISO
        ? new Date(token.serviceEndTimeISO)
        : token.serviceEndTime?.toDate?.() || new Date(token.serviceEndTime);
      const diffMs = serviceEnd - serviceStart;
      return Math.max(1, Math.round(diffMs / 1000 / 60)); // Convert to minutes, minimum 1
    });

    // Calculate WMA with weights: most recent = N, oldest = 1
    const weights = Array.from({ length: serviceTimes.length }, (_, i) =>
      serviceTimes.length - i
    );
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const wma = serviceTimes.reduce((sum, time, i) => sum + time * weights[i], 0) / totalWeight;

    return Math.round(wma);
  } catch (error) {
    console.error('Error calculating WMA:', error);
    return 8; // Default fallback
  }
}

/**
 * Calculate estimated wait time based on queue position and average service time
 */
export async function calculateEstimatedWaitTime(branchId, serviceType) {
  try {
    // Get count of waiting tokens
    const waitingTokensSnapshot = await db
      .collection('Tokens')
      .where('branchId', '==', branchId)
      .where('status', '==', 'waiting')
      .get();

    // Filter by serviceType in code
    const waitingCount = waitingTokensSnapshot.docs.filter(
      (doc) => doc.data().serviceType === serviceType
    ).length;

    // Get average service time using WMA
    const avgServiceTime = await calculateWeightedMovingAverage(branchId, serviceType);

    // Calculate base estimated time
    let estimatedTime = waitingCount * avgServiceTime;

    // Apply peak hour multiplier (11 AM - 2 PM)
    const currentHour = new Date().getHours();
    if (currentHour >= 11 && currentHour < 14) {
      estimatedTime *= 1.25; // 25% increase during peak hours
    }

    return Math.round(estimatedTime);
  } catch (error) {
    console.error('Error calculating estimated wait time:', error);
    return 8; // Default fallback
  }
}

/**
 * Calculate crowd density indicator
 * Returns: LOW, MEDIUM, HIGH
 * Uses only waiting token count (no separate Counters collection needed)
 */
export async function calculateCrowdDensity(branchId) {
  try {
    // Count waiting tokens
    const waitingTokensSnapshot = await db
      .collection('Tokens')
      .where('branchId', '==', branchId)
      .where('status', '==', 'waiting')
      .get();

    const waitingTokens = waitingTokensSnapshot.size;

    // Count currently serving tokens as proxy for active counters
    const servingSnapshot = await db
      .collection('Tokens')
      .where('branchId', '==', branchId)
      .where('status', '==', 'serving')
      .get();

    const activeCounters = Math.max(1, servingSnapshot.size);

    // Calculate density ratio
    const densityRatio = waitingTokens / activeCounters;

    if (densityRatio < 2) {
      return { level: 'LOW', ratio: densityRatio.toFixed(2), color: 'green' };
    } else if (densityRatio <= 5) {
      return { level: 'MEDIUM', ratio: densityRatio.toFixed(2), color: 'yellow' };
    } else {
      return { level: 'HIGH', ratio: densityRatio.toFixed(2), color: 'red' };
    }
  } catch (error) {
    console.error('Error calculating crowd density:', error);
    return { level: 'LOW', ratio: '0.00', color: 'green' };
  }
}

/**
 * Get user's position in queue
 * Simplified to avoid composite index on createdAt range query
 */
export async function getUserQueuePosition(branchId, serviceType, tokenId) {
  try {
    const userTokenDoc = await db.collection('Tokens').doc(tokenId).get();

    if (!userTokenDoc.exists) {
      return { position: -1, message: 'Token not found' };
    }

    const userToken = userTokenDoc.data();

    // Get all waiting tokens for this branch/service, sort by queueNumber in code
    const waitingSnapshot = await db
      .collection('Tokens')
      .where('branchId', '==', branchId)
      .where('status', '==', 'waiting')
      .get();

    const waitingTokens = waitingSnapshot.docs
      .map((doc) => doc.data())
      .filter((t) => t.serviceType === serviceType)
      .sort((a, b) => {
        const pw = getPriorityWeight(a.priority) - getPriorityWeight(b.priority);
        return pw !== 0 ? pw : a.queueNumber - b.queueNumber;
      });

    const totalInQueue = waitingTokens.length;
    const position = waitingTokens.findIndex((t) => t.tokenId === tokenId) + 1;

    if (position === 0) {
      if (userToken.status === 'serving') {
        return { position: 0, message: 'You are being served!', totalInQueue };
      }
      return { position: -1, message: 'Token not in queue', totalInQueue };
    }

    return { position, message: `You are #${position} in queue`, totalInQueue };
  } catch (error) {
    console.error('Error calculating queue position:', error);
    return { position: -1, message: 'Error calculating position', totalInQueue: 0 };
  }
}

/**
 * Background scheduler: auto no-show detection
 * Tokens waiting > 30 minutes without arriving are marked as no-show.
 * Runs every 60 seconds.
 */
export function startNoShowDetection(io) {
  const NO_SHOW_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
  const CHECK_INTERVAL_MS = 60 * 1000; // 1 minute

  setInterval(async () => {
    try {
      const now = Date.now();

      // Get all waiting tokens
      const waitingSnapshot = await db
        .collection('Tokens')
        .where('status', '==', 'waiting')
        .get();

      for (const doc of waitingSnapshot.docs) {
        const token = doc.data();
        const createdAt = token.createdAtISO
          ? new Date(token.createdAtISO).getTime()
          : token.createdAt instanceof Date
            ? token.createdAt.getTime()
            : null;

        if (createdAt && now - createdAt > NO_SHOW_TIMEOUT_MS) {
          // Mark as no-show
          const tokenRef = db.collection('Tokens').doc(doc.id);
          await tokenRef.update({
            status: 'no-show',
            noShowAt: new Date(),
            noShowAtISO: new Date().toISOString(),
          });

          console.log(`⏰ Auto no-show: Token #${token.queueNumber} (${token.userName})`);

          // Emit socket event so dashboards refresh
          if (io) {
            io.to(`branch-${token.branchId}`).emit('queueUpdated', {
              action: 'tokenNoShow',
              tokenId: token.tokenId,
              message: `Token #${token.queueNumber} marked as no-show (30min timeout)`,
            });
          }
        }
      }
    } catch (error) {
      console.error('No-show detection error:', error);
    }
  }, CHECK_INTERVAL_MS);

  console.log('⏰ No-show detection scheduler started (30min timeout, 60s checks)');
}

export default {
  calculateEstimatedWaitTime,
  calculateCrowdDensity,
  getUserQueuePosition,
  calculateWeightedMovingAverage,
  getPriorityWeight,
  startNoShowDetection,
};
