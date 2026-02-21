/**
 * IntelliQueue — Vercel Serverless Express Handler
 *
 * Single Express app handling ALL /api/* routes.
 * Uses in-memory DB with auto-seeding on cold start.
 * Socket.io is replaced with a no-op emitter (serverless has no persistent WS).
 */

import express from 'express';
import cors from 'cors';
import admin, { db } from './_lib/inMemoryDb.js';
import {
  calculateEstimatedWaitTime,
  calculateCrowdDensity,
  getUserQueuePosition,
  getPriorityWeight,
} from './_lib/queueLogic.js';
import {
  allocateCounter, getCountersForBranch, getDemandForecast,
  getSeatAvailability, assignSeat, releaseSeat,
  getPerformanceLeaderboard, getWeatherImpact,
  enhancedWaitPrediction, getAvailableTimeSlots,
} from './_lib/advancedServices.js';
import {
  sendBookingConfirmation, sendTurnNotification,
  sendSMS, getNotificationLog,
} from './_lib/notificationService.js';
import { seedDemoData } from './_lib/seed.js';

// ─── No-op Socket.io replacement for serverless ───
const io = {
  to: () => ({ emit: (...args) => console.log('[WS no-op]', ...args) }),
  emit: (...args) => console.log('[WS no-op]', ...args),
};

// ─── Express App ───
const app = express();
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));
app.use(express.json());

// Auto-seed demo data on cold start
let seeded = false;
app.use(async (req, res, next) => {
  if (!seeded) {
    try { await seedDemoData(); } catch (e) { console.error('[Seed Error]', e); }
    seeded = true;
  }
  next();
});

// ════════════════════════════════════════════════════
//  HEALTH CHECK
// ════════════════════════════════════════════════════

app.get('/api/health', (req, res) => {
  res.json({ status: 'IntelliQueue Serverless is running!', timestamp: new Date().toISOString() });
});

// ════════════════════════════════════════════════════
//  TOKEN ROUTES — /api/token/*
// ════════════════════════════════════════════════════

/**
 * POST /api/token/book — Book a new token
 */
app.post('/api/token/book', async (req, res) => {
  try {
    const { branchId, serviceType, userName, userPhone, priority } = req.body;

    if (!branchId || !serviceType || !userName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: branchId, serviceType, userName',
      });
    }

    const validPriorities = ['normal', 'senior', 'emergency'];
    const tokenPriority = validPriorities.includes(priority) ? priority : 'normal';

    const branchRef = db.collection('Branches').doc(branchId);
    const branchDoc = await branchRef.get();

    let nextQueueNumber = 1;
    if (branchDoc.exists && branchDoc.data().lastQueueNumber) {
      nextQueueNumber = branchDoc.data().lastQueueNumber + 1;
    }

    const tokenRef = db.collection('Tokens').doc();
    const now = new Date();

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
    await branchRef.set(
      { lastQueueNumber: nextQueueNumber, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );

    io.to(`branch-${branchId}`).emit('queueUpdated', {
      action: 'tokenBooked',
      token: { ...tokenData, createdAt: now.toISOString() },
      message: `New token #${nextQueueNumber} created`,
    });

    sendBookingConfirmation({ ...tokenData, estimatedWait: '~' });

    return res.status(201).json({
      success: true,
      message: 'Token booked successfully',
      token: { ...tokenData, createdAt: now.toISOString() },
    });
  } catch (error) {
    console.error('Error booking token:', error);
    return res.status(500).json({ success: false, message: 'Error booking token', error: error.message });
  }
});

/**
 * GET /api/token/queue/:branchId — Get queue status
 */
app.get('/api/token/queue/:branchId', async (req, res) => {
  try {
    const { branchId } = req.params;
    const { serviceType } = req.query;

    if (!branchId) {
      return res.status(400).json({ success: false, message: 'branchId is required' });
    }

    let waitingQuery = db.collection('Tokens')
      .where('branchId', '==', branchId)
      .where('status', '==', 'waiting');
    if (serviceType) waitingQuery = waitingQuery.where('serviceType', '==', serviceType);

    const waitingSnapshot = await waitingQuery.get();
    const waitingTokens = waitingSnapshot.docs.map((doc) => doc.data());

    let servingQuery = db.collection('Tokens')
      .where('branchId', '==', branchId)
      .where('status', '==', 'serving');
    if (serviceType) servingQuery = servingQuery.where('serviceType', '==', serviceType);

    const servingSnapshot = await servingQuery.get();
    const servingTokens = servingSnapshot.docs.map((doc) => doc.data());

    const currentlyServing = servingTokens.length > 0 ? servingTokens[0] : null;

    const getPW = (p) => (p === 'emergency' ? 0 : p === 'senior' ? 1 : 2);
    const allActiveTokens = [...waitingTokens, ...servingTokens].sort((a, b) => {
      const pw = getPW(a.priority) - getPW(b.priority);
      return pw !== 0 ? pw : a.queueNumber - b.queueNumber;
    });

    const estimatedWaitTime = serviceType
      ? await calculateEstimatedWaitTime(branchId, serviceType)
      : await calculateEstimatedWaitTime(branchId, 'consultation');

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
    return res.status(500).json({ success: false, message: 'Error fetching queue status', error: error.message });
  }
});

/**
 * GET /api/token/:tokenId — Get token details
 */
app.get('/api/token/:tokenId', async (req, res) => {
  try {
    const { tokenId } = req.params;
    const tokenDoc = await db.collection('Tokens').doc(tokenId).get();

    if (!tokenDoc.exists) {
      return res.status(404).json({ success: false, message: 'Token not found' });
    }

    const token = tokenDoc.data();
    const { branchId, serviceType } = token;

    const estimatedWaitTime = await calculateEstimatedWaitTime(branchId, serviceType);
    const position = await getUserQueuePosition(branchId, serviceType, tokenId);
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
    return res.status(500).json({ success: false, message: 'Error fetching token details', error: error.message });
  }
});

/**
 * POST /api/token/update-status — Update token status
 */
app.post('/api/token/update-status', async (req, res) => {
  try {
    const { tokenId, status, branchId } = req.body;

    if (!tokenId || !status) {
      return res.status(400).json({ success: false, message: 'tokenId and status are required' });
    }

    const validStatuses = ['arrived', 'serving', 'completed', 'cancelled', 'no-show'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Allowed: ${validStatuses.join(', ')}` });
    }

    const tokenRef = db.collection('Tokens').doc(tokenId);
    const tokenDoc = await tokenRef.get();

    if (!tokenDoc.exists) {
      return res.status(404).json({ success: false, message: 'Token not found' });
    }

    const token = tokenDoc.data();
    const now = new Date();
    const updateData = { status };

    if (status === 'arrived') {
      updateData.arrivedAt = admin.firestore.FieldValue.serverTimestamp();
      updateData.arrivedAtISO = now.toISOString();
    } else if (status === 'serving') {
      updateData.serviceStartTime = admin.firestore.FieldValue.serverTimestamp();
      updateData.serviceStartTimeISO = now.toISOString();
      sendTurnNotification(token);
    } else if (status === 'completed') {
      updateData.serviceEndTime = admin.firestore.FieldValue.serverTimestamp();
      updateData.serviceEndTimeISO = now.toISOString();
      releaseSeat(token.branchId, tokenId);
    }

    if (status === 'cancelled' || status === 'no-show') {
      releaseSeat(token.branchId, tokenId);
    }

    await tokenRef.update(updateData);

    // Save to QueueHistory for analytics
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

    const finalBranchId = token.branchId || branchId;
    io.to(`branch-${finalBranchId}`).emit('queueUpdated', {
      action: 'tokenStatusUpdated',
      tokenId, status,
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
    return res.status(500).json({ success: false, message: 'Error updating token status', error: error.message });
  }
});

/**
 * POST /api/token/cancel — Cancel a token
 */
app.post('/api/token/cancel', async (req, res) => {
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

    io.to(`branch-${token.branchId}`).emit('queueUpdated', {
      action: 'tokenCancelled', tokenId,
      message: `Token #${token.queueNumber} cancelled`,
    });

    return res.status(200).json({ success: true, message: 'Token cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling token:', error);
    return res.status(500).json({ success: false, message: 'Error cancelling token', error: error.message });
  }
});

/**
 * GET /api/token/analytics/:branchId — Get analytics
 */
app.get('/api/token/analytics/:branchId', async (req, res) => {
  try {
    const { branchId } = req.params;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const allTokensSnapshot = await db.collection('Tokens')
      .where('branchId', '==', branchId).get();
    const allTokens = allTokensSnapshot.docs.map((doc) => doc.data());

    const todayTokens = allTokens.filter((t) => {
      const created = t.createdAtISO ? new Date(t.createdAtISO) : t.createdAt instanceof Date ? t.createdAt : null;
      return created && created >= todayStart;
    });

    const cancelledTokens = todayTokens.filter((t) => t.status === 'cancelled');

    const historySnapshot = await db.collection('QueueHistory')
      .where('branchId', '==', branchId).get();
    const completedTokens = historySnapshot.docs.map((doc) => doc.data());

    const todayCompleted = completedTokens.filter((t) => {
      const updated = t.updatedAtISO ? new Date(t.updatedAtISO) : t.updatedAt instanceof Date ? t.updatedAt : null;
      return updated && updated >= todayStart;
    });

    let totalServiceTime = 0;
    const peakHourMap = {};

    todayCompleted.forEach((token) => {
      const startTime = token.serviceStartTimeISO ? new Date(token.serviceStartTimeISO) : null;
      const endTime = token.serviceEndTimeISO ? new Date(token.serviceEndTimeISO) : null;

      if (startTime && endTime) {
        const diffMinutes = Math.round((endTime - startTime) / 1000 / 60);
        totalServiceTime += Math.max(1, diffMinutes);
        const hour = startTime.getHours();
        peakHourMap[hour] = (peakHourMap[hour] || 0) + 1;
      }
    });

    const avgServiceTime = todayCompleted.length > 0 ? Math.round(totalServiceTime / todayCompleted.length) : 0;

    let peakHourValue = 0, peakHourCount = 0;
    Object.entries(peakHourMap).forEach(([hour, count]) => {
      if (count > peakHourCount) { peakHourCount = count; peakHourValue = parseInt(hour); }
    });

    const noShowTokens = todayTokens.filter((t) => t.status === 'no-show');
    const noShowRate = todayTokens.length > 0 ? parseFloat(((cancelledTokens.length / todayTokens.length) * 100).toFixed(2)) : 0;
    const noShowPercentage = todayTokens.length > 0 ? parseFloat(((noShowTokens.length / todayTokens.length) * 100).toFixed(2)) : 0;

    const hourlyData = [];
    for (let h = 8; h <= 18; h++) {
      hourlyData.push({ hour: `${h}:00`, tokens: peakHourMap[h] || 0 });
    }

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
          formattedHour: peakHourCount > 0 ? `${peakHourValue}:00 - ${peakHourValue + 1}:00` : 'N/A',
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
    return res.status(500).json({ success: false, message: 'Error fetching analytics', error: error.message });
  }
});

/**
 * GET /api/token/heatmap/:branchId — Crowd density heat map
 */
app.get('/api/token/heatmap/:branchId', async (req, res) => {
  try {
    const { branchId } = req.params;

    const zones = [
      { id: 'consultation', label: 'Consultation', icon: '🩺' },
      { id: 'checkup', label: 'Medical Checkup', icon: '🔬' },
      { id: 'processing', label: 'Document Processing', icon: '📄' },
      { id: 'payment', label: 'Payment & Billing', icon: '💳' },
    ];

    const allTokensSnapshot = await db.collection('Tokens')
      .where('branchId', '==', branchId).get();
    const allTokens = allTokensSnapshot.docs.map((doc) => doc.data());
    const activeTokens = allTokens.filter((t) => t.status === 'waiting' || t.status === 'serving');

    const zoneDensity = zones.map((zone) => {
      const waiting = activeTokens.filter((t) => t.serviceType === zone.id && t.status === 'waiting').length;
      const serving = activeTokens.filter((t) => t.serviceType === zone.id && t.status === 'serving').length;
      const total = waiting + serving;
      let level = 'LOW', color = '#22c55e';
      if (total >= 5) { level = 'HIGH'; color = '#ef4444'; }
      else if (total >= 2) { level = 'MEDIUM'; color = '#eab308'; }
      return { ...zone, waiting, serving, total, level, color };
    });

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayTokens = allTokens.filter((t) => {
      const created = t.createdAtISO ? new Date(t.createdAtISO) : t.createdAt instanceof Date ? t.createdAt : null;
      return created && created >= todayStart;
    });

    const hours = [];
    for (let h = 8; h <= 18; h++) hours.push(h);

    const hourlyGrid = zones.map((zone) => {
      const cells = hours.map((h) => {
        const count = todayTokens.filter((t) => {
          if (t.serviceType !== zone.id) return false;
          const created = t.createdAtISO ? new Date(t.createdAtISO) : t.createdAt instanceof Date ? t.createdAt : null;
          return created && created.getHours() === h;
        }).length;
        let level = 'LOW', color = '#22c55e';
        if (count >= 5) { level = 'HIGH'; color = '#ef4444'; }
        else if (count >= 2) { level = 'MEDIUM'; color = '#eab308'; }
        return { hour: h, count, level, color };
      });
      return { zone: zone.id, label: zone.label, icon: zone.icon, cells };
    });

    const totalActive = activeTokens.length;
    let overallLevel = 'LOW', overallColor = '#22c55e';
    if (totalActive >= 15) { overallLevel = 'HIGH'; overallColor = '#ef4444'; }
    else if (totalActive >= 6) { overallLevel = 'MEDIUM'; overallColor = '#eab308'; }

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
    return res.status(500).json({ success: false, message: 'Error fetching heat map data', error: error.message });
  }
});

// ════════════════════════════════════════════════════
//  ADVANCED ROUTES — /api/advanced/*
// ════════════════════════════════════════════════════

/** GET /api/advanced/counters/:branchId */
app.get('/api/advanced/counters/:branchId', async (req, res) => {
  try {
    const { branchId } = req.params;
    const counters = getCountersForBranch(branchId);
    const snap = await db.collection('Tokens').where('branchId', '==', branchId).where('status', '==', 'serving').get();
    const status = counters.map(c => {
      const serving = snap.docs.filter(d => d.data().assignedCounter === c.id).length;
      return { ...c, currentlyServing: serving, status: serving > 0 ? 'busy' : 'available' };
    });
    return res.json({ success: true, counters: status });
  } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
});

/** POST /api/advanced/group-book */
app.post('/api/advanced/group-book', async (req, res) => {
  try {
    const { branchId, serviceType, members, priority } = req.body;
    if (!branchId || !serviceType || !members || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ success: false, message: 'branchId, serviceType, and members[] required' });
    }

    const groupId = `GRP_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const branchRef = db.collection('Branches').doc(branchId);
    const branchDoc = await branchRef.get();
    let nextQ = 1;
    if (branchDoc.exists && branchDoc.data().lastQueueNumber) nextQ = branchDoc.data().lastQueueNumber + 1;

    const tokens = [];
    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      const tokenRef = db.collection('Tokens').doc();
      const now = new Date();
      const counter = await allocateCounter(branchId, serviceType);
      const seat = assignSeat(branchId, tokenRef.id);
      const data = {
        tokenId: tokenRef.id, queueNumber: nextQ + i, branchId, serviceType,
        userName: m.name, userPhone: m.phone || 'N/A',
        priority: priority || 'normal', status: 'waiting',
        groupId, groupIndex: i + 1, groupSize: members.length,
        assignedCounter: counter.id, assignedSeat: seat ? seat.id : null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAtISO: now.toISOString(),
        serviceStartTime: null, serviceEndTime: null, qrCodeValue: tokenRef.id,
      };
      await tokenRef.set(data);
      tokens.push({ ...data, createdAt: now.toISOString() });
    }

    await branchRef.set({ lastQueueNumber: nextQ + members.length - 1, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    io.to(`branch-${branchId}`).emit('queueUpdated', { action: 'groupBooked', groupId, count: members.length });

    return res.status(201).json({ success: true, groupId, tokens, message: `Group of ${members.length} booked` });
  } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
});

/** GET /api/advanced/forecast/:branchId */
app.get('/api/advanced/forecast/:branchId', async (req, res) => {
  try {
    const data = await getDemandForecast(req.params.branchId);
    return res.json({ success: true, ...data });
  } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
});

/** GET /api/advanced/seats/:branchId */
app.get('/api/advanced/seats/:branchId', (req, res) => {
  try { return res.json({ success: true, ...getSeatAvailability(req.params.branchId) }); }
  catch (e) { return res.status(500).json({ success: false, message: e.message }); }
});

/** POST /api/advanced/seats/release */
app.post('/api/advanced/seats/release', (req, res) => {
  try { releaseSeat(req.body.branchId, req.body.tokenId); return res.json({ success: true, message: 'Seat released' }); }
  catch (e) { return res.status(500).json({ success: false, message: e.message }); }
});

/** GET /api/advanced/leaderboard/:branchId */
app.get('/api/advanced/leaderboard/:branchId', async (req, res) => {
  try {
    const board = await getPerformanceLeaderboard(req.params.branchId);
    return res.json({ success: true, leaderboard: board });
  } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
});

/** GET /api/advanced/weather */
app.get('/api/advanced/weather', (req, res) => {
  try { return res.json({ success: true, ...getWeatherImpact() }); }
  catch (e) { return res.status(500).json({ success: false, message: e.message }); }
});

/** GET /api/advanced/prediction/:branchId/:serviceType */
app.get('/api/advanced/prediction/:branchId/:serviceType', async (req, res) => {
  try {
    const pred = await enhancedWaitPrediction(req.params.branchId, req.params.serviceType);
    return res.json({ success: true, ...pred });
  } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
});

/** GET /api/advanced/timeslots/:branchId */
app.get('/api/advanced/timeslots/:branchId', (req, res) => {
  try { return res.json({ success: true, slots: getAvailableTimeSlots(req.params.branchId) }); }
  catch (e) { return res.status(500).json({ success: false, message: e.message }); }
});

/** POST /api/advanced/feedback */
app.post('/api/advanced/feedback', async (req, res) => {
  try {
    const { branchId, tokenId, rating, comment, userName } = req.body;
    if (!branchId || !rating) return res.status(400).json({ success: false, message: 'branchId and rating required' });
    const ref = db.collection('Feedback').doc();
    await ref.set({
      id: ref.id, branchId, tokenId: tokenId || null,
      rating: Math.min(5, Math.max(1, rating)),
      comment: comment || '', userName: userName || 'Anonymous',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAtISO: new Date().toISOString(),
    });
    return res.status(201).json({ success: true, message: 'Thank you for your feedback!' });
  } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
});

/** GET /api/advanced/feedback/:branchId */
app.get('/api/advanced/feedback/:branchId', async (req, res) => {
  try {
    const snap = await db.collection('Feedback').where('branchId', '==', req.params.branchId).get();
    const all = snap.docs.map(d => d.data());
    const avg = all.length > 0 ? (all.reduce((s, f) => s + f.rating, 0) / all.length).toFixed(1) : 0;
    const dist = [1, 2, 3, 4, 5].map(r => ({ rating: r, count: all.filter(f => f.rating === r).length }));
    return res.json({ success: true, totalFeedbacks: all.length, averageRating: parseFloat(avg), distribution: dist, recent: all.slice(-5).reverse() });
  } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
});

/** GET /api/advanced/traffic-light/:branchId */
app.get('/api/advanced/traffic-light/:branchId', async (req, res) => {
  try {
    const svcs = ['consultation', 'checkup', 'processing', 'payment', 'registration'];
    const lights = await Promise.all(svcs.map(async svc => {
      const wait = await calculateEstimatedWaitTime(req.params.branchId, svc);
      const color = wait > 15 ? 'red' : wait > 5 ? 'yellow' : 'green';
      return { service: svc, waitTime: wait, color, label: `${wait} min` };
    }));
    return res.json({ success: true, lights });
  } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
});

/** GET /api/advanced/notifications */
app.get('/api/advanced/notifications', (req, res) => {
  try { return res.json({ success: true, notifications: getNotificationLog() }); }
  catch (e) { return res.status(500).json({ success: false, message: e.message }); }
});

/** POST /api/advanced/checkin — QR Self Check-in */
app.post('/api/advanced/checkin', async (req, res) => {
  try {
    const { tokenId } = req.body;
    if (!tokenId) return res.status(400).json({ success: false, message: 'tokenId required' });
    const ref = db.collection('Tokens').doc(tokenId);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ success: false, message: 'Token not found' });
    const token = doc.data();
    if (token.status !== 'waiting') return res.status(400).json({ success: false, message: `Token is already ${token.status}` });
    await ref.update({ status: 'arrived', arrivedAt: admin.firestore.FieldValue.serverTimestamp(), arrivedAtISO: new Date().toISOString() });
    sendSMS(token.userPhone, `Checked in! Token #${token.queueNumber}. Please wait for your turn.`);
    io.to(`branch-${token.branchId}`).emit('queueUpdated', { action: 'tokenCheckedIn', tokenId, message: `Token #${token.queueNumber} checked in` });
    return res.json({ success: true, message: `Welcome ${token.userName}! You're checked in.`, token: { ...token, status: 'arrived' } });
  } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
});

// ════════════════════════════════════════════════════
//  ERROR HANDLING
// ════════════════════════════════════════════════════

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
});

export default app;
