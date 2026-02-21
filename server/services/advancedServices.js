import { db } from '../firebaseAdmin.js';

/*  ═══════════════════════════════════════════════
    1. SMART COUNTER ALLOCATION AI
    ═══════════════════════════════════════════════ */

const BRANCH_COUNTERS = {
  branch1: [
    { id: 'C1', name: 'Counter 1', services: ['consultation', 'checkup'], x: 120, y: 50 },
    { id: 'C2', name: 'Counter 2', services: ['consultation', 'processing'], x: 280, y: 50 },
    { id: 'C3', name: 'Counter 3', services: ['payment', 'registration'], x: 440, y: 50 },
    { id: 'C4', name: 'Counter 4', services: ['checkup', 'payment'], x: 600, y: 50 },
  ],
  branch2: [
    { id: 'C1', name: 'Counter 1', services: ['consultation', 'checkup'], x: 120, y: 50 },
    { id: 'C2', name: 'Counter 2', services: ['processing', 'payment'], x: 280, y: 50 },
    { id: 'C3', name: 'Counter 3', services: ['registration', 'consultation'], x: 440, y: 50 },
  ],
};

const DEFAULT_COUNTERS = [
  { id: 'C1', name: 'Counter 1', services: ['consultation', 'checkup', 'processing', 'payment', 'registration'], x: 200, y: 50 },
  { id: 'C2', name: 'Counter 2', services: ['consultation', 'checkup', 'processing', 'payment', 'registration'], x: 400, y: 50 },
];

export function getCountersForBranch(branchId) {
  return BRANCH_COUNTERS[branchId] || DEFAULT_COUNTERS;
}

export async function allocateCounter(branchId, serviceType) {
  const counters = getCountersForBranch(branchId);
  const eligible = counters.filter(c => c.services.includes(serviceType));
  if (eligible.length === 0) return counters[0];

  const servingSnap = await db.collection('Tokens')
    .where('branchId', '==', branchId)
    .where('status', '==', 'serving')
    .get();

  const load = {};
  eligible.forEach(c => { load[c.id] = 0; });
  servingSnap.docs.forEach(d => {
    const ac = d.data().assignedCounter;
    if (ac && load[ac] !== undefined) load[ac]++;
  });

  let best = eligible[0], minLoad = Infinity;
  for (const c of eligible) {
    if ((load[c.id] || 0) < minLoad) { minLoad = load[c.id] || 0; best = c; }
  }
  return best;
}

/*  ═══════════════════════════════════════════════
    9. DEMAND FORECAST PREDICTION
    ═══════════════════════════════════════════════ */

export async function getDemandForecast(branchId) {
  const now = new Date();
  const currentHour = now.getHours();
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

  const snap = await db.collection('Tokens').where('branchId', '==', branchId).get();
  const allTokens = snap.docs.map(d => d.data());
  const todayTokens = allTokens.filter(t => {
    const c = t.createdAtISO ? new Date(t.createdAtISO) : null;
    return c && c >= todayStart;
  });

  const hourlyCounts = {};
  for (let h = 8; h <= 18; h++) hourlyCounts[h] = 0;
  todayTokens.forEach(t => {
    const h = new Date(t.createdAtISO).getHours();
    if (hourlyCounts[h] !== undefined) hourlyCounts[h]++;
  });

  const base = { 8: 3, 9: 5, 10: 8, 11: 10, 12: 7, 13: 6, 14: 9, 15: 8, 16: 6, 17: 4, 18: 2 };
  const forecast = [];
  for (let h = 8; h <= 18; h++) {
    const actual = hourlyCounts[h] || 0;
    const predicted = h <= currentHour ? actual : Math.round((base[h] || 5) * (1 + (Math.random() * 0.4 - 0.2)));
    forecast.push({
      hour: h, label: `${h}:00`,
      actual: h <= currentHour ? actual : null,
      predicted,
      confidence: h <= currentHour ? 100 : Math.max(50, 95 - (h - currentHour) * 8),
    });
  }

  const future = forecast.filter(f => f.hour > currentHour);
  const peakPrediction = future.length > 0
    ? future.reduce((max, f) => f.predicted > max.predicted ? f : max, future[0])
    : forecast[0];

  return { forecast, peakPrediction, currentHour };
}

/*  ═══════════════════════════════════════════════
    10. WAITING AREA SEAT AVAILABILITY
    ═══════════════════════════════════════════════ */

const BRANCH_SEATS = {};

function initSeats(branchId, total = 20) {
  if (!BRANCH_SEATS[branchId]) {
    BRANCH_SEATS[branchId] = {
      total,
      seats: Array.from({ length: total }, (_, i) => ({
        id: `S${i + 1}`, row: Math.floor(i / 5), col: i % 5, occupied: false, tokenId: null,
      })),
    };
  }
  return BRANCH_SEATS[branchId];
}

export function getSeatAvailability(branchId) {
  const d = initSeats(branchId);
  const occ = d.seats.filter(s => s.occupied).length;
  return { total: d.total, occupied: occ, available: d.total - occ, seats: d.seats, occupancyPercent: Math.round((occ / d.total) * 100) };
}

export function assignSeat(branchId, tokenId) {
  const d = initSeats(branchId);
  const seat = d.seats.find(s => !s.occupied);
  if (seat) { seat.occupied = true; seat.tokenId = tokenId; return seat; }
  return null;
}

export function releaseSeat(branchId, tokenId) {
  const d = initSeats(branchId);
  const seat = d.seats.find(s => s.tokenId === tokenId);
  if (seat) { seat.occupied = false; seat.tokenId = null; return true; }
  return false;
}

/*  ═══════════════════════════════════════════════
    8 + 19. ADMIN PERFORMANCE LEADERBOARD & SCORE
    ═══════════════════════════════════════════════ */

export async function getPerformanceLeaderboard(branchId) {
  const histSnap = await db.collection('QueueHistory').where('branchId', '==', branchId).get();
  const completed = histSnap.docs.map(d => d.data());

  const staff = [
    { id: 'staff1', name: 'Dr. Priya Sharma', role: 'Doctor', avatar: '👩‍⚕️' },
    { id: 'staff2', name: 'Nurse Anita', role: 'Nurse', avatar: '👨‍⚕️' },
    { id: 'staff3', name: 'Raj Kumar', role: 'Admin', avatar: '🧑‍💼' },
    { id: 'staff4', name: 'Meera Patel', role: 'Receptionist', avatar: '👩‍💻' },
  ];

  const board = staff.map((s, idx) => {
    const mine = completed.filter((_, i) => i % staff.length === idx);
    const served = mine.length;
    let avgTime = 0;
    if (served > 0) {
      const total = mine.reduce((sum, t) => {
        const st = t.serviceStartTimeISO ? new Date(t.serviceStartTimeISO) : null;
        const et = t.serviceEndTimeISO ? new Date(t.serviceEndTimeISO) : null;
        return st && et ? sum + (et - st) / 60000 : sum + 5;
      }, 0);
      avgTime = Math.round(total / served);
    }
    const speed = avgTime > 0 ? Math.max(0, 100 - avgTime * 5) : 50;
    const vol = Math.min(100, served * 15);
    const score = Math.min(100, Math.max(0, Math.round(speed * 0.6 + vol * 0.4)));

    return {
      ...s, tokensServed: served, avgServiceTime: avgTime || 'N/A',
      performanceScore: score,
      rating: score >= 80 ? '⭐⭐⭐⭐⭐' : score >= 60 ? '⭐⭐⭐⭐' : score >= 40 ? '⭐⭐⭐' : '⭐⭐',
    };
  });
  return board.sort((a, b) => b.performanceScore - a.performanceScore);
}

/*  ═══════════════════════════════════════════════
    20. WEATHER / PEAK IMPACT PREDICTION
    ═══════════════════════════════════════════════ */

export function getWeatherImpact() {
  const conds = [
    { type: 'sunny', icon: '☀️', label: 'Sunny', impactPercent: 0, msg: 'Normal traffic expected' },
    { type: 'cloudy', icon: '⛅', label: 'Partly Cloudy', impactPercent: -5, msg: 'Slight decrease in foot traffic' },
    { type: 'rainy', icon: '🌧️', label: 'Rainy', impactPercent: -25, msg: 'Significant decrease — many may postpone visits' },
    { type: 'hot', icon: '🌡️', label: 'Heat Wave', impactPercent: -15, msg: 'Reduced outdoor movement expected' },
    { type: 'pleasant', icon: '🌤️', label: 'Pleasant', impactPercent: 10, msg: 'Higher traffic — good weather brings more visitors' },
  ];
  const weather = conds[new Date().getHours() % conds.length];
  const peakBlocks = [
    { start: 9, end: 11, label: 'Morning Rush', multiplier: 1.3 },
    { start: 11, end: 14, label: 'Lunch Peak', multiplier: 1.5 },
    { start: 16, end: 18, label: 'Evening Rush', multiplier: 1.2 },
  ];
  const h = new Date().getHours();
  const peak = peakBlocks.find(p => h >= p.start && h < p.end) || { label: 'Off-Peak', multiplier: 1.0 };

  return {
    weather, currentPeak: peak,
    adjustedCapacity: Math.round(100 + weather.impactPercent),
    recommendation: weather.impactPercent < -10
      ? 'Consider reducing counter staff during low-traffic periods'
      : weather.impactPercent > 5
        ? 'Consider adding extra counters to handle increased traffic'
        : 'Normal staffing levels should be sufficient',
  };
}

/*  ═══════════════════════════════════════════════
    17. ENHANCED AI WAIT PREDICTION (counter-aware)
    ═══════════════════════════════════════════════ */

export async function enhancedWaitPrediction(branchId, serviceType) {
  const counters = getCountersForBranch(branchId);
  const active = counters.filter(c => c.services.includes(serviceType)).length;

  const waitSnap = await db.collection('Tokens')
    .where('branchId', '==', branchId).where('status', '==', 'waiting').get();
  const waiting = waitSnap.docs.map(d => d.data()).filter(t => t.serviceType === serviceType).length;

  const histSnap = await db.collection('QueueHistory')
    .where('branchId', '==', branchId).where('status', '==', 'completed').get();
  const done = histSnap.docs.map(d => d.data()).filter(t => t.serviceType === serviceType);

  let avgTime = 8;
  if (done.length > 0) {
    const tot = done.reduce((s, t) => {
      const a = t.serviceStartTimeISO ? new Date(t.serviceStartTimeISO) : null;
      const b = t.serviceEndTimeISO ? new Date(t.serviceEndTimeISO) : null;
      return a && b ? s + (b - a) / 60000 : s + 8;
    }, 0);
    avgTime = Math.round(tot / done.length);
  }

  const eff = Math.max(1, active);
  const base = Math.round((waiting * avgTime) / eff);
  const w = getWeatherImpact();
  const final = Math.round(base * (1 + w.weather.impactPercent / 200) * (w.currentPeak.multiplier > 1 ? 1.1 : 1));

  return {
    estimatedMinutes: final, activeCounters: eff, waitingCount: waiting, avgServiceTime: avgTime,
    factors: { weather: w.weather.label, weatherImpact: w.weather.impactPercent, peakStatus: w.currentPeak.label, peakMultiplier: w.currentPeak.multiplier },
    confidence: done.length > 5 ? 'HIGH' : done.length > 0 ? 'MEDIUM' : 'LOW',
  };
}

/*  ═══════════════════════════════════════════════
    6. TIME SLOT HELPERS
    ═══════════════════════════════════════════════ */

export function getAvailableTimeSlots(branchId) {
  const now = new Date();
  const slots = [];
  for (let h = 8; h <= 17; h++) {
    for (const m of [0, 30]) {
      const st = new Date(now); st.setHours(h, m, 0, 0);
      if (st > now) {
        slots.push({
          id: `${h}:${String(m).padStart(2, '0')}`,
          time: `${h}:${String(m).padStart(2, '0')}`,
          label: `${h > 12 ? h - 12 : h}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`,
          available: Math.floor(Math.random() * 5) + 1,
        });
      }
    }
  }
  return slots;
}

export default {
  allocateCounter, getCountersForBranch, getDemandForecast,
  getSeatAvailability, assignSeat, releaseSeat,
  getPerformanceLeaderboard, getWeatherImpact,
  enhancedWaitPrediction, getAvailableTimeSlots,
};
