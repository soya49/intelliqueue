/**
 * Demo Data Seeder for IntelliQueue
 * Usage: node seedDemo.js
 *
 * Seeds 2 branches, 3 services, 2 counters, 10 sample tokens
 * including a mix of priorities and statuses.
 */

const API_BASE = process.env.API_URL || 'http://localhost:5000/api';

const branches = ['branch1', 'branch2'];
const services = ['consultation', 'checkup', 'processing'];
const priorities = ['normal', 'normal', 'normal', 'senior', 'emergency', 'normal', 'senior', 'normal', 'normal', 'emergency'];

const names = [
  'Alice Johnson',
  'Bob Smith',
  'Charlie Brown',
  'Diana Prince',
  'Eve Williams',
  'Frank Miller',
  'Grace Lee',
  'Henry Davis',
  'Ivy Chen',
  'Jack Wilson',
];

async function seed() {
  console.log('🌱 Seeding demo data for IntelliQueue...\n');

  const tokens = [];

  // Book 10 tokens across 2 branches, 3 services, mixed priorities
  for (let i = 0; i < 10; i++) {
    const branchId = branches[i % branches.length];
    const serviceType = services[i % services.length];
    const priority = priorities[i];
    const userName = names[i];

    try {
      const resp = await fetch(`${API_BASE}/token/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId,
          serviceType,
          userName,
          userPhone: `555-${String(i).padStart(4, '0')}`,
          priority,
        }),
      });
      const data = await resp.json();
      if (data.success) {
        tokens.push(data.token);
        console.log(
          `  ✅ #${data.token.queueNumber} ${userName} [${priority}] (${branchId} / ${serviceType})`
        );
      } else {
        console.log(`  ❌ Failed: ${data.message}`);
      }
    } catch (err) {
      console.log(`  ❌ Error: ${err.message}`);
    }
  }

  // Mark first 2 tokens as "serving" (simulates 2 active counters)
  console.log('\n🔄 Setting up serving counters...');
  for (let i = 0; i < Math.min(2, tokens.length); i++) {
    try {
      await fetch(`${API_BASE}/token/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenId: tokens[i].tokenId,
          status: 'serving',
          branchId: tokens[i].branchId,
        }),
      });
      console.log(`  🟢 Serving: #${tokens[i].queueNumber} ${tokens[i].userName}`);
    } catch (err) {
      console.log(`  ❌ Error: ${err.message}`);
    }
  }

  // Mark next 2 as "completed" (for analytics data)
  console.log('\n✅ Completing tokens for analytics...');
  for (let i = 2; i < Math.min(4, tokens.length); i++) {
    try {
      // First mark as serving
      await fetch(`${API_BASE}/token/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenId: tokens[i].tokenId,
          status: 'serving',
          branchId: tokens[i].branchId,
        }),
      });
      // Brief delay for realistic service time
      await new Promise((r) => setTimeout(r, 500));
      // Then complete
      await fetch(`${API_BASE}/token/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenId: tokens[i].tokenId,
          status: 'completed',
          branchId: tokens[i].branchId,
        }),
      });
      console.log(`  ✅ Completed: #${tokens[i].queueNumber} ${tokens[i].userName}`);
    } catch (err) {
      console.log(`  ❌ Error: ${err.message}`);
    }
  }

  console.log('\n🎉 Demo data seeded successfully!');
  console.log('━'.repeat(45));
  console.log(`   Branches : ${branches.join(', ')}`);
  console.log(`   Services : ${services.join(', ')}`);
  console.log(`   Tokens   : ${tokens.length} total`);
  console.log(`   Serving  : 2 (active counters)`);
  console.log(`   Completed: 2 (for analytics)`);
  console.log(`   Waiting  : ${Math.max(0, tokens.length - 4)}`);
  console.log('━'.repeat(45));
}

seed();
