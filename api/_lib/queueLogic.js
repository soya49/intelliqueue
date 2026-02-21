import { db } from './inMemoryDb.js';

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
 */
async function calculateWeightedMovingAverage(branchId, serviceType) {
  try {
    const completedTokensSnapshot = await db
      .collection('QueueHistory')
      .where('branchId', '==', branchId)
      .where('status', '==', 'completed')
      .get();

    if (completedTokensSnapshot.empty) return 8;

    const tokens = completedTokensSnapshot.docs
      .map((doc) => doc.data())
      .filter((t) => t.serviceType === serviceType)
      .sort((a, b) => {
        const aTime = a.serviceEndTimeISO ? new Date(a.serviceEndTimeISO) : new Date(0);
        const bTime = b.serviceEndTimeISO ? new Date(b.serviceEndTimeISO) : new Date(0);
        return bTime - aTime;
      })
      .slice(0, 10);

    if (tokens.length === 0) return 8;

    const serviceTimes = tokens.map((token) => {
      const serviceStart = token.serviceStartTimeISO
        ? new Date(token.serviceStartTimeISO) : new Date();
      const serviceEnd = token.serviceEndTimeISO
        ? new Date(token.serviceEndTimeISO) : new Date();
      const diffMs = serviceEnd - serviceStart;
      return Math.max(1, Math.round(diffMs / 1000 / 60));
    });

    const weights = Array.from({ length: serviceTimes.length }, (_, i) =>
      serviceTimes.length - i
    );
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const wma = serviceTimes.reduce((sum, time, i) => sum + time * weights[i], 0) / totalWeight;

    return Math.round(wma);
  } catch (error) {
    console.error('Error calculating WMA:', error);
    return 8;
  }
}

/**
 * Calculate estimated wait time based on queue position and average service time
 */
export async function calculateEstimatedWaitTime(branchId, serviceType) {
  try {
    const waitingTokensSnapshot = await db
      .collection('Tokens')
      .where('branchId', '==', branchId)
      .where('status', '==', 'waiting')
      .get();

    const waitingCount = waitingTokensSnapshot.docs.filter(
      (doc) => doc.data().serviceType === serviceType
    ).length;

    const avgServiceTime = await calculateWeightedMovingAverage(branchId, serviceType);

    let estimatedTime = waitingCount * avgServiceTime;

    const currentHour = new Date().getHours();
    if (currentHour >= 11 && currentHour < 14) {
      estimatedTime *= 1.25;
    }

    return Math.round(estimatedTime);
  } catch (error) {
    console.error('Error calculating estimated wait time:', error);
    return 8;
  }
}

/**
 * Calculate crowd density indicator — LOW, MEDIUM, HIGH
 */
export async function calculateCrowdDensity(branchId) {
  try {
    const waitingTokensSnapshot = await db
      .collection('Tokens')
      .where('branchId', '==', branchId)
      .where('status', '==', 'waiting')
      .get();

    const waitingTokens = waitingTokensSnapshot.size;

    const servingSnapshot = await db
      .collection('Tokens')
      .where('branchId', '==', branchId)
      .where('status', '==', 'serving')
      .get();

    const activeCounters = Math.max(1, servingSnapshot.size);
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
 * Get user's position in queue (priority-aware)
 */
export async function getUserQueuePosition(branchId, serviceType, tokenId) {
  try {
    const userTokenDoc = await db.collection('Tokens').doc(tokenId).get();

    if (!userTokenDoc.exists) {
      return { position: -1, message: 'Token not found' };
    }

    const userToken = userTokenDoc.data();

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

export default {
  calculateEstimatedWaitTime,
  calculateCrowdDensity,
  getUserQueuePosition,
  calculateWeightedMovingAverage,
  getPriorityWeight,
};
