/**
 * Offline Queue Mode — stores pending requests in localStorage
 * and syncs them when connectivity is restored.
 */

const QUEUE_KEY = 'intelliqueue_offline_pending';

export function isOnline() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

export function queueRequest(request) {
  const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  queue.push({ ...request, queuedAt: new Date().toISOString() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  console.log(`📴 [Offline] Queued request: ${request.url} — ${queue.length} pending`);
  return queue.length;
}

export function getPendingRequests() {
  return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
}

export async function syncPendingRequests(apiClient) {
  const queue = getPendingRequests();
  if (queue.length === 0) return { synced: 0, remaining: 0 };

  let synced = 0;
  const remaining = [];

  for (const req of queue) {
    try {
      if (req.method === 'POST') {
        await apiClient.post(req.url, req.body);
      } else {
        await apiClient.get(req.url);
      }
      synced++;
      console.log(`✅ [Sync] Synced: ${req.url}`);
    } catch {
      remaining.push(req);
    }
  }

  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  return { synced, remaining: remaining.length };
}

export function clearQueue() {
  localStorage.removeItem(QUEUE_KEY);
}

export function onConnectivityChange(callback) {
  if (typeof window === 'undefined') return;
  window.addEventListener('online', () => callback(true));
  window.addEventListener('offline', () => callback(false));
  return () => {
    window.removeEventListener('online', () => callback(true));
    window.removeEventListener('offline', () => callback(false));
  };
}

export default {
  isOnline, queueRequest, getPendingRequests,
  syncPendingRequests, clearQueue, onConnectivityChange,
};
