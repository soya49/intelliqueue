import { db } from '../firebaseAdmin.js';
import admin from '../firebaseAdmin.js';
import { io } from '../server.js';
import {
  allocateCounter, getCountersForBranch, getDemandForecast,
  getSeatAvailability, assignSeat, releaseSeat,
  getPerformanceLeaderboard, getWeatherImpact,
  enhancedWaitPrediction, getAvailableTimeSlots,
} from '../services/advancedServices.js';
import { sendBookingConfirmation, sendSMS, getNotificationLog } from '../services/notificationService.js';
import { calculateEstimatedWaitTime } from '../services/queueLogic.js';

/* ─── Counter allocation info ─── */
export async function getCounters(req, res) {
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
}

/* ─── Group booking (family tokens) ─── */
export async function groupBook(req, res) {
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
}

/* ─── Demand forecast ─── */
export async function getForecast(req, res) {
  try {
    const data = await getDemandForecast(req.params.branchId);
    return res.json({ success: true, ...data });
  } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
}

/* ─── Seat availability ─── */
export async function getSeats(req, res) {
  try { return res.json({ success: true, ...getSeatAvailability(req.params.branchId) }); }
  catch (e) { return res.status(500).json({ success: false, message: e.message }); }
}
export async function releaseTokenSeat(req, res) {
  try { releaseSeat(req.body.branchId, req.body.tokenId); return res.json({ success: true, message: 'Seat released' }); }
  catch (e) { return res.status(500).json({ success: false, message: e.message }); }
}

/* ─── Leaderboard ─── */
export async function getLeaderboard(req, res) {
  try {
    const board = await getPerformanceLeaderboard(req.params.branchId);
    return res.json({ success: true, leaderboard: board });
  } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
}

/* ─── Weather impact ─── */
export function getWeather(req, res) {
  try { return res.json({ success: true, ...getWeatherImpact() }); }
  catch (e) { return res.status(500).json({ success: false, message: e.message }); }
}

/* ─── Enhanced AI wait prediction ─── */
export async function getPrediction(req, res) {
  try {
    const pred = await enhancedWaitPrediction(req.params.branchId, req.params.serviceType);
    return res.json({ success: true, ...pred });
  } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
}

/* ─── Time slots ─── */
export function getTimeSlots(req, res) {
  try { return res.json({ success: true, slots: getAvailableTimeSlots(req.params.branchId) }); }
  catch (e) { return res.status(500).json({ success: false, message: e.message }); }
}

/* ─── Customer feedback ─── */
export async function submitFeedback(req, res) {
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
}

export async function getFeedbackStats(req, res) {
  try {
    const snap = await db.collection('Feedback').where('branchId', '==', req.params.branchId).get();
    const all = snap.docs.map(d => d.data());
    const avg = all.length > 0 ? (all.reduce((s, f) => s + f.rating, 0) / all.length).toFixed(1) : 0;
    const dist = [1, 2, 3, 4, 5].map(r => ({ rating: r, count: all.filter(f => f.rating === r).length }));
    return res.json({ success: true, totalFeedbacks: all.length, averageRating: parseFloat(avg), distribution: dist, recent: all.slice(-5).reverse() });
  } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
}

/* ─── Traffic light queue display ─── */
export async function getTrafficLight(req, res) {
  try {
    const svcs = ['consultation', 'checkup', 'processing', 'payment', 'registration'];
    const lights = await Promise.all(svcs.map(async svc => {
      const wait = await calculateEstimatedWaitTime(req.params.branchId, svc);
      const color = wait > 15 ? 'red' : wait > 5 ? 'yellow' : 'green';
      return { service: svc, waitTime: wait, color, label: `${wait} min` };
    }));
    return res.json({ success: true, lights });
  } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
}

/* ─── Notification log ─── */
export function getNotifications(req, res) {
  try { return res.json({ success: true, notifications: getNotificationLog() }); }
  catch (e) { return res.status(500).json({ success: false, message: e.message }); }
}

/* ─── QR Self Check-in (Kiosk) ─── */
export async function selfCheckIn(req, res) {
  try {
    const { tokenId } = req.body;
    if (!tokenId) return res.status(400).json({ success: false, message: 'tokenId required' });
    const ref = db.collection('Tokens').doc(tokenId);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ success: false, message: 'Token not found' });
    const token = doc.data();
    if (token.status !== 'waiting') return res.status(400).json({ success: false, message: `Token is already ${token.status}` });
    await ref.update({ status: 'arrived', arrivedAt: admin.firestore.FieldValue.serverTimestamp(), arrivedAtISO: new Date().toISOString() });
    sendSMS(token.userPhone, `✅ Checked in! Token #${token.queueNumber}. Please wait for your turn.`);
    io.to(`branch-${token.branchId}`).emit('queueUpdated', { action: 'tokenCheckedIn', tokenId, message: `Token #${token.queueNumber} checked in` });
    return res.json({ success: true, message: `Welcome ${token.userName}! You're checked in.`, token: { ...token, status: 'arrived' } });
  } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
}

export default {
  getCounters, groupBook, getForecast, getSeats, releaseTokenSeat,
  getLeaderboard, getWeather, getPrediction, getTimeSlots,
  submitFeedback, getFeedbackStats, getTrafficLight, getNotifications, selfCheckIn,
};
