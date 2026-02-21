import admin from '../firebaseAdmin.js';
import { db } from '../firebaseAdmin.js';
import { io } from '../server.js';
import {
  calculateEstimatedWaitTime,
  calculateCrowdDensity,
  getUserQueuePosition,
} from '../services/queueLogic.js';
import { allocateCounter, assignSeat, releaseSeat } from '../services/advancedServices.js';
import { sendBookingConfirmation, sendTurnNotification } from '../services/notificationService.js';

/**
 * Book a new token
 * POST /api/token/book
 */
export async function bookToken(req, res) {
  try {
    const { branchId, serviceType, userName, userPhone, priority } = req.body;

    if (!branchId || !serviceType || !userName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: branchId, serviceType, userName',
      });
    }

    // Validate priority
    const validPriorities = ['normal', 'senior', 'emergency'];
    const tokenPriority = validPriorities.includes(priority) ? priority : 'normal';

    // Get next queue number — use set with merge so branch doc is created if missing
    const branchRef = db.collection('Branches').doc(branchId);
    const branchDoc = await branchRef.get();

    let nextQueueNumber = 1;
    if (branchDoc.exists && branchDoc.data().lastQueueNumber) {
      nextQueueNumber = branchDoc.data().lastQueueNumber + 1;
    }

    // Create token document
    const tokenRef = db.collection('Tokens').doc();
    const now = new Date();

    // Smart Counter Allocation AI + Seat Assignment
    const assignedCounter = await allocateCounter(branchId, serviceType);
    const assignedSeat = assignSeat(branchId, tokenRef.id);

    const tokenData = {
      tokenId: tokenRef.id,
      queueNumber: nextQueueNumber,
      branchId,
      serviceType,
      userName,
      userPhone: userPhone || 'N/A',
      priority: tokenPriority,
      status: 'waiting',
      assignedCounter: assignedCounter.id,
      assignedCounterName: assignedCounter.name,
      assignedSeat: assignedSeat ? assignedSeat.id : null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAtISO: now.toISOString(),
      serviceStartTime: null,
      serviceEndTime: null,
      qrCodeValue: tokenRef.id,
    };

    await tokenRef.set(tokenData);

    // Use set with merge so branch doc is auto-created or updated
    await branchRef.set(
      {
        lastQueueNumber: nextQueueNumber,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Emit real-time update to all connected clients in this branch
    io.to(`branch-${branchId}`).emit('queueUpdated', {
      action: 'tokenBooked',
      token: { ...tokenData, createdAt: now.toISOString() },
      message: `New token #${nextQueueNumber} created`,
    });

    // Send SMS/WhatsApp booking confirmation (simulated)
    sendBookingConfirmation({ ...tokenData, estimatedWait: '~' });

    return res.status(201).json({
      success: true,
      message: 'Token booked successfully',
      token: { ...tokenData, createdAt: now.toISOString() },
    });
  } catch (error) {
    console.error('Error booking token:', error);
    return res.status(500).json({
      success: false,
      message: 'Error booking token',
      error: error.message,
    });
  }
}

/**
 * Get queue status for a branch — also returns active token list for admin
 * GET /api/token/queue/:branchId
 */
export async function getQueueStatus(req, res) {
  try {
    const { branchId } = req.params;
    const { serviceType } = req.query;

    if (!branchId) {
      return res.status(400).json({ success: false, message: 'branchId is required' });
    }

    // Build base query for waiting tokens
    let waitingQuery = db
      .collection('Tokens')
      .where('branchId', '==', branchId)
      .where('status', '==', 'waiting');
    if (serviceType) waitingQuery = waitingQuery.where('serviceType', '==', serviceType);

    const waitingSnapshot = await waitingQuery.get();
    const waitingTokens = waitingSnapshot.docs.map((doc) => doc.data());

    // Get currently serving tokens
    let servingQuery = db
      .collection('Tokens')
      .where('branchId', '==', branchId)
      .where('status', '==', 'serving');
    if (serviceType) servingQuery = servingQuery.where('serviceType', '==', serviceType);

    const servingSnapshot = await servingQuery.get();
    const servingTokens = servingSnapshot.docs.map((doc) => doc.data());

    const currentlyServing = servingTokens.length > 0 ? servingTokens[0] : null;

    // Combine all active tokens sorted by priority weight then queue number
    const getPW = (p) => (p === 'emergency' ? 0 : p === 'senior' ? 1 : 2);
    const allActiveTokens = [...waitingTokens, ...servingTokens].sort((a, b) => {
      const pw = getPW(a.priority) - getPW(b.priority);
      return pw !== 0 ? pw : a.queueNumber - b.queueNumber;
    });

    // Calculate estimated wait time
    const estimatedWaitTime = serviceType
      ? await calculateEstimatedWaitTime(branchId, serviceType)
      : await calculateEstimatedWaitTime(branchId, 'consultation');

    // Get crowd density
    const crowdDensity = await calculateCrowdDensity(branchId);

    return res.status(200).json({
      success: true,
      data: {
        branchId,
        waitingCount: waitingTokens.length,
        currentlyServing,
        estimatedWaitTime,
        crowdDensity,
        tokens: allActiveTokens,
      },
    });
  } catch (error) {
    console.error('Error fetching queue status:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching queue status',
      error: error.message,
    });
  }
}

/**
 * Get specific token details
 * GET /api/token/:tokenId
 */
export async function getTokenDetails(req, res) {
  try {
    const { tokenId } = req.params;

    const tokenDoc = await db.collection('Tokens').doc(tokenId).get();

    if (!tokenDoc.exists) {
      return res.status(404).json({ success: false, message: 'Token not found' });
    }

    const token = tokenDoc.data();
    const { branchId, serviceType } = token;

    // Get estimated wait time
    const estimatedWaitTime = await calculateEstimatedWaitTime(branchId, serviceType);

    // Get user's position (priority-aware)
    const position = await getUserQueuePosition(branchId, serviceType, tokenId);

    // Get crowd density for live display
    const crowdDensity = await calculateCrowdDensity(branchId);

    return res.status(200).json({
      success: true,
      token,
      estimatedWaitTime,
      position: position.position,
      positionMessage: position.message,
      totalInQueue: position.totalInQueue,
      crowdDensity,
    });
  } catch (error) {
    console.error('Error fetching token details:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching token details',
      error: error.message,
    });
  }
}

/**
 * Update token status
 * POST /api/token/update-status
 */
export async function updateTokenStatus(req, res) {
  try {
    const { tokenId, status, branchId } = req.body;

    if (!tokenId || !status) {
      return res.status(400).json({
        success: false,
        message: 'tokenId and status are required',
      });
    }

    const validStatuses = ['arrived', 'serving', 'completed', 'cancelled', 'no-show'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${validStatuses.join(', ')}`,
      });
    }

    const tokenRef = db.collection('Tokens').doc(tokenId);
    const tokenDoc = await tokenRef.get();

    if (!tokenDoc.exists) {
      return res.status(404).json({ success: false, message: 'Token not found' });
    }

    const token = tokenDoc.data();
    const now = new Date();
    const updateData = { status };

    // Add timestamps based on status
    if (status === 'arrived') {
      updateData.arrivedAt = admin.firestore.FieldValue.serverTimestamp();
      updateData.arrivedAtISO = now.toISOString();
    } else if (status === 'serving') {
      updateData.serviceStartTime = admin.firestore.FieldValue.serverTimestamp();
      updateData.serviceStartTimeISO = now.toISOString();
      // Send turn notification
      sendTurnNotification(token);
    } else if (status === 'completed') {
      updateData.serviceEndTime = admin.firestore.FieldValue.serverTimestamp();
      updateData.serviceEndTimeISO = now.toISOString();
      // Release assigned seat
      releaseSeat(token.branchId, tokenId);
    }

    // Release seat on cancellation or no-show
    if (status === 'cancelled' || status === 'no-show') {
      releaseSeat(token.branchId, tokenId);
    }

    await tokenRef.update(updateData);

    // If completed, save to QueueHistory for analytics
    if (status === 'completed') {
      const updatedTokenDoc = await tokenRef.get();
      const updatedToken = updatedTokenDoc.data();
      const historyRef = db.collection('QueueHistory').doc();
      await historyRef.set({
        ...updatedToken,
        status: 'completed',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAtISO: now.toISOString(),
      });
    }

    // Emit real-time update
    const finalBranchId = token.branchId || branchId;
    io.to(`branch-${finalBranchId}`).emit('queueUpdated', {
      action: 'tokenStatusUpdated',
      tokenId,
      status,
      token: { ...token, ...updateData },
      message: `Token #${token.queueNumber} status: ${status}`,
    });

    return res.status(200).json({
      success: true,
      message: `Token status updated to ${status}`,
      token: { ...token, ...updateData },
    });
  } catch (error) {
    console.error('Error updating token status:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating token status',
      error: error.message,
    });
  }
}

/**
 * Cancel a token
 * POST /api/token/cancel
 */
export async function cancelToken(req, res) {
  try {
    const { tokenId } = req.body;

    if (!tokenId) {
      return res.status(400).json({ success: false, message: 'tokenId is required' });
    }

    const tokenRef = db.collection('Tokens').doc(tokenId);
    const tokenDoc = await tokenRef.get();

    if (!tokenDoc.exists) {
      return res.status(404).json({ success: false, message: 'Token not found' });
    }

    const token = tokenDoc.data();
    await tokenRef.update({
      status: 'cancelled',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Emit real-time update
    io.to(`branch-${token.branchId}`).emit('queueUpdated', {
      action: 'tokenCancelled',
      tokenId,
      message: `Token #${token.queueNumber} cancelled`,
    });

    return res.status(200).json({ success: true, message: 'Token cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling token:', error);
    return res.status(500).json({
      success: false,
      message: 'Error cancelling token',
      error: error.message,
    });
  }
}

/**
 * Get analytics for a branch
 * GET /api/token/analytics/:branchId
 * Simplified to avoid composite index requirements
 */
export async function getAnalytics(req, res) {
  try {
    const { branchId } = req.params;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Fetch ALL tokens for branch — filter in code to avoid composite indexes
    const allTokensSnapshot = await db
      .collection('Tokens')
      .where('branchId', '==', branchId)
      .get();

    const allTokens = allTokensSnapshot.docs.map((doc) => doc.data());

    // Filter today's tokens in code
    const todayTokens = allTokens.filter((t) => {
      const created = t.createdAtISO ? new Date(t.createdAtISO) : t.createdAt?.toDate?.();
      return created && created >= todayStart;
    });

    const cancelledTokens = todayTokens.filter((t) => t.status === 'cancelled');

    // Fetch completed tokens for average service time calculation
    const historySnapshot = await db
      .collection('QueueHistory')
      .where('branchId', '==', branchId)
      .get();

    const completedTokens = historySnapshot.docs.map((doc) => doc.data());

    // Filter today's completed tokens in code
    const todayCompleted = completedTokens.filter((t) => {
      const updated = t.updatedAtISO ? new Date(t.updatedAtISO) : t.updatedAt?.toDate?.();
      return updated && updated >= todayStart;
    });

    // Calculate metrics
    let totalServiceTime = 0;
    const peakHourMap = {};

    todayCompleted.forEach((token) => {
      const startTime = token.serviceStartTimeISO
        ? new Date(token.serviceStartTimeISO)
        : token.serviceStartTime?.toDate?.()
          ? token.serviceStartTime.toDate()
          : null;
      const endTime = token.serviceEndTimeISO
        ? new Date(token.serviceEndTimeISO)
        : token.serviceEndTime?.toDate?.()
          ? token.serviceEndTime.toDate()
          : null;

      if (startTime && endTime) {
        const diffMinutes = Math.round((endTime - startTime) / 1000 / 60);
        totalServiceTime += Math.max(1, diffMinutes);

        const hour = startTime.getHours();
        peakHourMap[hour] = (peakHourMap[hour] || 0) + 1;
      }
    });

    const avgServiceTime =
      todayCompleted.length > 0 ? Math.round(totalServiceTime / todayCompleted.length) : 0;

    // Find peak hour
    let peakHourValue = 0;
    let peakHourCount = 0;
    Object.entries(peakHourMap).forEach(([hour, count]) => {
      if (count > peakHourCount) {
        peakHourCount = count;
        peakHourValue = parseInt(hour);
      }
    });

    const noShowRate =
      todayTokens.length > 0
        ? parseFloat(((cancelledTokens.length / todayTokens.length) * 100).toFixed(2))
        : 0;

    // Generate hourly data for chart (show all hours 8AM-6PM)
    const hourlyData = [];
    for (let h = 8; h <= 18; h++) {
      hourlyData.push({
        hour: `${h}:00`,
        tokens: peakHourMap[h] || 0,
      });
    }

    // --- Advanced analytics: avg wait per service type ---
    const serviceTypes = ['consultation', 'checkup', 'processing', 'payment', 'registration'];
    const avgWaitPerService = serviceTypes.map((svc) => {
      const svcCompleted = todayCompleted.filter((t) => t.serviceType === svc);
      let avgWait = 0;
      if (svcCompleted.length > 0) {
        const totalWait = svcCompleted.reduce((sum, t) => {
          const start = t.serviceStartTimeISO ? new Date(t.serviceStartTimeISO) : null;
          const end = t.serviceEndTimeISO ? new Date(t.serviceEndTimeISO) : null;
          if (start && end) return sum + Math.max(1, Math.round((end - start) / 1000 / 60));
          return sum;
        }, 0);
        avgWait = Math.round(totalWait / svcCompleted.length);
      }
      return { service: svc, avgWaitTime: avgWait, count: svcCompleted.length };
    });

    // --- No-show stats ---
    const noShowTokens = todayTokens.filter((t) => t.status === 'no-show');
    const noShowPercentage = todayTokens.length > 0
      ? parseFloat(((noShowTokens.length / todayTokens.length) * 100).toFixed(2))
      : 0;

    // --- Wait time trend (hourly avg service time) ---
    const waitTimeTrend = [];
    for (let h = 8; h <= 18; h++) {
      const hourCompleted = todayCompleted.filter((t) => {
        const start = t.serviceStartTimeISO ? new Date(t.serviceStartTimeISO) : null;
        return start && start.getHours() === h;
      });
      let avgWait = 0;
      if (hourCompleted.length > 0) {
        const tw = hourCompleted.reduce((sum, t) => {
          const s = t.serviceStartTimeISO ? new Date(t.serviceStartTimeISO) : null;
          const e = t.serviceEndTimeISO ? new Date(t.serviceEndTimeISO) : null;
          if (s && e) return sum + Math.max(1, Math.round((e - s) / 1000 / 60));
          return sum;
        }, 0);
        avgWait = Math.round(tw / hourCompleted.length);
      }
      waitTimeTrend.push({ hour: `${h}:00`, avgWaitTime: avgWait, tokens: peakHourMap[h] || 0 });
    }

    return res.status(200).json({
      success: true,
      analytics: {
        totalTokensToday: todayTokens.length,
        completedTokens: todayCompleted.length,
        servedToday: todayCompleted.length,
        cancelledTokens: cancelledTokens.length,
        averageServiceTime: avgServiceTime,
        peakHour: {
          hour: peakHourValue,
          count: peakHourCount,
          formattedHour:
            peakHourCount > 0 ? `${peakHourValue}:00 - ${peakHourValue + 1}:00` : 'N/A',
        },
        noShowRate,
        noShowCount: noShowTokens.length,
        noShowPercentage,
        avgWaitPerService,
        waitTimeTrend,
        hourlyData,
      },
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching analytics',
      error: error.message,
    });
  }
}

/**
 * Get crowd density heat map data broken down by service zone & hourly
 * GET /api/token/heatmap/:branchId
 */
export async function getHeatMap(req, res) {
  try {
    const { branchId } = req.params;

    // Define zones (service types) and their display names
    const zones = [
      { id: 'consultation', label: 'Consultation', icon: '🩺' },
      { id: 'checkup', label: 'Medical Checkup', icon: '🔬' },
      { id: 'processing', label: 'Document Processing', icon: '📄' },
      { id: 'payment', label: 'Payment & Billing', icon: '💳' },
    ];

    // Fetch all active tokens for this branch
    const allTokensSnapshot = await db
      .collection('Tokens')
      .where('branchId', '==', branchId)
      .get();

    const allTokens = allTokensSnapshot.docs.map((doc) => doc.data());
    const activeTokens = allTokens.filter(
      (t) => t.status === 'waiting' || t.status === 'serving'
    );

    // --- Per-zone density ---
    const zoneDensity = zones.map((zone) => {
      const waiting = activeTokens.filter(
        (t) => t.serviceType === zone.id && t.status === 'waiting'
      ).length;
      const serving = activeTokens.filter(
        (t) => t.serviceType === zone.id && t.status === 'serving'
      ).length;
      const total = waiting + serving;

      let level = 'LOW';
      let color = '#22c55e'; // green-500
      if (total >= 5) {
        level = 'HIGH';
        color = '#ef4444'; // red-500
      } else if (total >= 2) {
        level = 'MEDIUM';
        color = '#eab308'; // yellow-500
      }

      return {
        ...zone,
        waiting,
        serving,
        total,
        level,
        color,
      };
    });

    // --- Hourly heat map grid (rows = zones, cols = hours 8-18) ---
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayTokens = allTokens.filter((t) => {
      const created = t.createdAtISO
        ? new Date(t.createdAtISO)
        : t.createdAt instanceof Date
          ? t.createdAt
          : null;
      return created && created >= todayStart;
    });

    const hours = [];
    for (let h = 8; h <= 18; h++) hours.push(h);

    const hourlyGrid = zones.map((zone) => {
      const cells = hours.map((h) => {
        const count = todayTokens.filter((t) => {
          if (t.serviceType !== zone.id) return false;
          const created = t.createdAtISO
            ? new Date(t.createdAtISO)
            : t.createdAt instanceof Date
              ? t.createdAt
              : null;
          return created && created.getHours() === h;
        }).length;

        let level = 'LOW';
        let color = '#22c55e';
        if (count >= 5) {
          level = 'HIGH';
          color = '#ef4444';
        } else if (count >= 2) {
          level = 'MEDIUM';
          color = '#eab308';
        }

        return { hour: h, count, level, color };
      });
      return { zone: zone.id, label: zone.label, icon: zone.icon, cells };
    });

    // --- Overall density ---
    const totalActive = activeTokens.length;
    let overallLevel = 'LOW';
    let overallColor = '#22c55e';
    if (totalActive >= 15) {
      overallLevel = 'HIGH';
      overallColor = '#ef4444';
    } else if (totalActive >= 6) {
      overallLevel = 'MEDIUM';
      overallColor = '#eab308';
    }

    return res.status(200).json({
      success: true,
      heatMap: {
        overall: { total: totalActive, level: overallLevel, color: overallColor },
        zones: zoneDensity,
        hourlyGrid,
        hours,
      },
    });
  } catch (error) {
    console.error('Error fetching heat map:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching heat map data',
      error: error.message,
    });
  }
}

export default {
  bookToken,
  getQueueStatus,
  getTokenDetails,
  updateTokenStatus,
  cancelToken,
  getAnalytics,
  getHeatMap,
};
