// lib/queue/config.ts
import { ConnectionOptions } from 'bullmq';

export const redisConnection: ConnectionOptions = {
  host: process.env.REDIS_HOST!,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  ...(process.env.REDIS_TLS === 'true' && { 
    tls: { rejectUnauthorized: false }
  })
};