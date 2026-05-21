'use strict';

require('dotenv').config();

const configuredBaseUrl = process.env.BACKEND_BASE_URL;
let baseUrl = configuredBaseUrl ? configuredBaseUrl.replace(/\/$/, '') : null;
let testServer = null;

function formatBody(body) {
  try {
    return JSON.stringify(body);
  } catch (error) {
    return String(body);
  }
}

async function requestJson(check) {
  const response = await fetch(`${baseUrl}${check.path}`, {
    method: check.method || 'GET',
    headers: {
      'content-type': 'application/json',
      ...(check.headers || {}),
    },
    body: check.body === undefined ? undefined : JSON.stringify(check.body),
  });

  let body = null;
  const text = await response.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch (error) {
      throw new Error(`${check.name}: expected JSON response, got: ${text.slice(0, 200)}`);
    }
  }

  return { status: response.status, body };
}

function assertStatusContract(check, status, body) {
  const expected = Array.isArray(check.expectedStatus)
    ? check.expectedStatus
    : [check.expectedStatus];

  if (!expected.includes(status)) {
    throw new Error(
      `${check.name}: expected HTTP ${expected.join(' or ')}, got ${status}. Body: ${formatBody(body)}`
    );
  }

  if (!body || typeof body !== 'object') {
    throw new Error(`${check.name}: expected object JSON body`);
  }

  if (status >= 400) {
    if (body.ok !== false) {
      throw new Error(`${check.name}: HTTP ${status} must return ok:false. Body: ${formatBody(body)}`);
    }
    if (!body.error && !body.message) {
      throw new Error(`${check.name}: HTTP ${status} must include error or message. Body: ${formatBody(body)}`);
    }
  }

  if (status < 400 && body.ok === false) {
    throw new Error(`${check.name}: body ok:false cannot be returned with HTTP ${status}. Body: ${formatBody(body)}`);
  }
}

async function main() {
  if (!baseUrl) {
    const { createApp } = require('../src/app');
    const app = createApp();
    await new Promise<void>((resolve) => {
      testServer = app.listen(0, '127.0.0.1', () => {
        const address = testServer.address();
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  }

  const hardwareHeaders = process.env.HARDWARE_API_KEY
    ? { 'x-hardware-api-key': process.env.HARDWARE_API_KEY }
    : {};

  const checks = [
    {
      name: 'health returns 200 only when dependencies are healthy',
      path: '/health',
      expectedStatus: 200,
    },
    {
      name: 'login rejects missing credentials as 400',
      method: 'POST',
      path: '/api/v1/auth/login',
      body: {},
      expectedStatus: 400,
    },
    {
      name: 'login rejects invalid credentials as 401',
      method: 'POST',
      path: '/api/v1/auth/login',
      body: { email: 'teacher1@school.edu', password: 'wrong-password' },
      expectedStatus: 401,
    },
    {
      name: 'mobile attendance logs require bearer token',
      path: '/api/v1/mobile/attendance/logs',
      expectedStatus: 401,
    },
    {
      name: 'hardware scan rejects missing attendance code as 400',
      method: 'POST',
      path: '/api/v1/hardware/scan',
      headers: hardwareHeaders,
      body: {},
      expectedStatus: 400,
    },
    {
      name: 'hardware scan rejects invalid timestamp as 400',
      method: 'POST',
      path: '/api/v1/hardware/scan',
      headers: hardwareHeaders,
      body: { student_code: 'HS0085', timestamp: 'not-a-date', school_id: '1' },
      expectedStatus: 400,
    },
    {
      name: 'hardware scan reports unmapped attendance code as 404',
      method: 'POST',
      path: '/api/v1/hardware/scan',
      headers: hardwareHeaders,
      body: { ma_cham_cong: '__not_mapped__', school_id: '1' },
      expectedStatus: 404,
    },
  ];

  for (const check of checks) {
    const { status, body } = await requestJson(check);
    assertStatusContract(check, status, body);
    console.log(`[status-ok] ${check.name}: HTTP ${status}`);
  }
}

main()
  .catch((error) => {
    console.error(`[status-fail] ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (testServer) {
      await new Promise((resolve) => testServer.close(resolve));
    }
  });
