/**
 * Notification Service — Simulated SMS / WhatsApp for hackathon demo
 */

const notificationLog = [];

export function sendSMS(phone, message) {
  const entry = { id: `sms_${Date.now()}_${Math.random().toString(36).substr(2,4)}`, type: 'SMS', to: phone, message, timestamp: new Date().toISOString(), status: 'delivered' };
  notificationLog.push(entry);
  console.log(`📱 [SMS → ${phone}] ${message}`);
  return entry;
}

export function sendWhatsApp(phone, message) {
  const entry = { id: `wa_${Date.now()}_${Math.random().toString(36).substr(2,4)}`, type: 'WhatsApp', to: phone, message, timestamp: new Date().toISOString(), status: 'delivered' };
  notificationLog.push(entry);
  console.log(`💬 [WhatsApp → ${phone}] ${message}`);
  return entry;
}

export function getNotificationLog(limit = 50) {
  return notificationLog.slice(-limit).reverse();
}

export function sendTurnNotification(token) {
  const msg = `🔔 Dear ${token.userName}, your turn is approaching for ${token.serviceType}! Token #${token.queueNumber}. Please proceed to the counter.`;
  sendSMS(token.userPhone, msg);
  sendWhatsApp(token.userPhone, msg);
  return msg;
}

export function sendBookingConfirmation(token) {
  const msg = `✅ Token #${token.queueNumber} booked for ${token.serviceType}. Estimated wait: ~${token.estimatedWait || '?'} min. Track ID: ${token.tokenId}`;
  sendSMS(token.userPhone, msg);
  return msg;
}

export default { sendSMS, sendWhatsApp, getNotificationLog, sendTurnNotification, sendBookingConfirmation };
