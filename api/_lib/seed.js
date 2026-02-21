/**
 * Auto-seed demo data for serverless cold starts.
 * Seeds 2 branches, 3 services, 10 tokens with mixed priorities and statuses.
 */

import admin, { db } from './inMemoryDb.js';
import { allocateCounter, assignSeat } from './advancedServices.js';

const branches = ['branch1', 'branch2'];
const services = ['consultation', 'checkup', 'processing'];
const priorities = ['normal', 'normal', 'normal', 'senior', 'emergency', 'normal', 'senior', 'normal', 'normal', 'emergency'];
const names = [
  'Alice Johnson', 'Bob Smith', 'Charlie Brown', 'Diana Prince', 'Eve Williams',
  'Frank Miller', 'Grace Lee', 'Henry Davis', 'Ivy Chen', 'Jack Wilson',
];

let seeded = false;

export async function seedDemoData() {
  if (seeded) return;
  seeded = true;

  console.log('[Seed] Seeding demo data for IntelliQueue serverless...');

  const tokens = [];

  for (let i = 0; i < 10; i++) {
    const branchId = branches[i % branches.length];
    const serviceType = services[i % services.length];
    const priority = priorities[i];
    const userName = names[i];

    const tokenRef = db.collection('Tokens').doc();
    const now = new Date(Date.now() - (10 - i) * 60000); // Stagger creation times

    const counter = await allocateCounter(branchId, serviceType);
    const seat = assignSeat(branchId, tokenRef.id);

    // Get/create branch queue number
    const branchRef = db.collection('Branches').doc(branchId);
    const branchDoc = await branchRef.get();
    let nextQ = 1;
    if (branchDoc.exists && branchDoc.data().lastQueueNumber) {
      nextQ = branchDoc.data().lastQueueNumber + 1;
    }

    const tokenData = {
      tokenId: tokenRef.id,
      queueNumber: nextQ,
      branchId,
      serviceType,
      userName,
      userPhone: `555-${String(i).padStart(4, '0')}`,
      priority,
      status: 'waiting',
      assignedCounter: counter.id,
      assignedCounterName: counter.name,
      assignedSeat: seat ? seat.id : null,
      createdAt: now,
      createdAtISO: now.toISOString(),
      serviceStartTime: null,
      serviceEndTime: null,
      qrCodeValue: tokenRef.id,
    };

    await tokenRef.set(tokenData);
    await branchRef.set(
      { lastQueueNumber: nextQ, updatedAt: new Date() },
      { merge: true }
    );

    tokens.push(tokenData);
  }

  // Mark first 2 as "serving"
  for (let i = 0; i < Math.min(2, tokens.length); i++) {
    const ref = db.collection('Tokens').doc(tokens[i].tokenId);
    const now = new Date(Date.now() - 5 * 60000);
    await ref.update({
      status: 'serving',
      serviceStartTime: now,
      serviceStartTimeISO: now.toISOString(),
    });
  }

  // Mark next 2 as "completed" (for analytics)
  for (let i = 2; i < Math.min(4, tokens.length); i++) {
    const startTime = new Date(Date.now() - 8 * 60000);
    const endTime = new Date(Date.now() - 2 * 60000);
    const ref = db.collection('Tokens').doc(tokens[i].tokenId);

    await ref.update({
      status: 'completed',
      serviceStartTime: startTime,
      serviceStartTimeISO: startTime.toISOString(),
      serviceEndTime: endTime,
      serviceEndTimeISO: endTime.toISOString(),
    });

    // Copy to QueueHistory for analytics
    const tokenDoc = await ref.get();
    const histRef = db.collection('QueueHistory').doc();
    await histRef.set({
      ...tokenDoc.data(),
      updatedAt: endTime,
      updatedAtISO: endTime.toISOString(),
    });
  }

  // Seed some feedback
  const feedbacks = [
    { rating: 5, comment: 'Excellent service!', userName: 'Alice Johnson' },
    { rating: 4, comment: 'Good experience', userName: 'Bob Smith' },
    { rating: 3, comment: 'Average wait time', userName: 'Charlie Brown' },
  ];
  for (const fb of feedbacks) {
    const ref = db.collection('Feedback').doc();
    await ref.set({
      id: ref.id,
      branchId: 'branch1',
      rating: fb.rating,
      comment: fb.comment,
      userName: fb.userName,
      createdAt: new Date(),
      createdAtISO: new Date().toISOString(),
    });
  }

  console.log(`[Seed] Done: ${tokens.length} tokens, 2 serving, 2 completed, ${feedbacks.length} feedbacks`);
}

export default { seedDemoData };
