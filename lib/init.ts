// lib/init.ts
/**
 * Application initialization
 * Starts background jobs and schedulers
 */

import { startScheduler } from './journeys/scheduler';

// Only run in server environment, not during build
const isServer = typeof window === 'undefined';
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

if (isServer && (isDevelopment || isProduction)) {
  console.log('🚀 [Init] Initializing background services...');
  
  // Start journey processor
  startScheduler();
  
  console.log('✅ [Init] Background services started');
}

export {};