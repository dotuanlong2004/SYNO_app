'use strict';

const { Queue } = require('bullmq');
const { createBullConnection } = require('../config/redis');

const QUEUE_NAME = 'attendance';

const connection = createBullConnection();

const attendanceQueue = new Queue(QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    removeOnComplete: { count: 5000 },
    removeOnFail: { count: 10_000 },
    attempts: 3,
    backoff: { type: 'exponential', delay: 500 },
  },
});

module.exports = { attendanceQueue, QUEUE_NAME, queueConnection: connection };
