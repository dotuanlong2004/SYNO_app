// @ts-nocheck
'use strict';

const path = require('path');
const { Service } = require('node-windows');

const scriptPath = path.join(__dirname, 'agent.ts');

const svc = new Service({
  name: 'ZKAttendanceAgent',
  description:
    'Ronald Jack AI-X1 (ZKTeco) to cloud middleware with local SQLite buffering.',
  script: scriptPath,
  wait: 2,
  grow: 0.5,
  maxRetries: 40,
});

svc.on('install', () => {
  console.log('Service installed successfully.');
  svc.start();
});

svc.on('alreadyinstalled', () => {
  console.log('Service is already installed.');
});

svc.on('start', () => {
  console.log('Service started.');
});

svc.on('error', (error) => {
  console.error('Service error:', error);
});

svc.install();
