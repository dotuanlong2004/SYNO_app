'use strict';

const IORedis = require('ioredis');
require('dotenv').config();

let shared;

/**
 * Single shared IORedis connection for BullMQ, debounce keys, and rate helpers.
 * @returns {import('ioredis').default}
 */
function getRedis() {
  if (!shared) {
    if (process.env.REDIS_URL) {
      shared = new IORedis(process.env.REDIS_URL, {
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
      });
    } else {
      shared = new IORedis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: Number(process.env.REDIS_PORT || 6379),
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
      });
    }

    shared.on('error', (err) => {
      console.error('Redis connection error', err);
    });
  }
  return shared;
}

/**
 * Graceful shutdown helper (call from process signal handlers in later steps).
 * @returns {Promise<void>}
 */
async function quitRedis() {
  if (shared) {
    await shared.quit();
    shared = undefined;
  }
}

/**
 * New dedicated IORedis connection for BullMQ Queue/Worker (do not share one client).
 * @returns {import('ioredis').default}
 */
function createBullConnection() {
  const opts = {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  };
  if (process.env.REDIS_URL) {
    return new IORedis(process.env.REDIS_URL, opts);
  }
  return new IORedis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    ...opts,
  });
}

module.exports = { getRedis, quitRedis, createBullConnection };
