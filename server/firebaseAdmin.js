/**
 * Firebase Admin Wrapper
 * Uses in-memory DB to avoid Firebase auth issues (system clock / credentials)
 * For production, switch back to real Firebase Admin SDK
 */
import admin, { db } from './inMemoryDb.js';

export { db };
export default admin;

