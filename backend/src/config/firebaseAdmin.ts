'use strict';

const admin = require('firebase-admin');

let initialized = false;

function initializeFirebaseAdmin() {
  if (initialized) return;

  try {
    if (admin.apps.length > 0) {
      initialized = true;
      return;
    }

    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (serviceAccountJson) {
      const credential = admin.credential.cert(JSON.parse(serviceAccountJson));
      admin.initializeApp({ credential });
      initialized = true;
      return;
    }

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp();
      initialized = true;
      return;
    }

    // Mock-safe mode when no credentials are configured.
    console.warn('[fcm] Firebase Admin not initialized (no credentials). Notifications will be logged only.');
  } catch (error) {
    console.error('[fcm] Failed to initialize Firebase Admin:', error.message);
  }
}

function isFirebaseAdminReady() {
  initializeFirebaseAdmin();
  return admin.apps.length > 0;
}

/**
 * Firebase error codes that indicate a dead/invalid token and should be removed.
 * Covers both canonical and shorthand forms seen in different SDK versions.
 * @param {unknown} error
 */
function isUnregisteredTokenError(error) {
  const code = String(
    error?.errorInfo?.code || error?.code || ''
  ).toLowerCase();

  return (
    code === 'messaging/registration-token-not-registered' ||
    code === 'registration-token-not-registered' ||
    code === 'messaging/invalid-registration-token' ||
    code === 'invalid-registration-token'
  );
}

function buildNotificationTag(payload) {
  const data = payload.data || {};
  return (
    payload.tag ||
    data.notification_key ||
    data.attendance_log_id ||
    [
      data.type || 'syno',
      data.student_code || data.student_id || '',
      data.log_type || data.check_type || '',
      data.check_time || data.scanned_at || '',
    ]
      .filter(Boolean)
      .join(':')
  );
}

/**
 * @param {{ token: string, title: string, body: string, data?: Record<string, string>, tag?: string }} payload
 */
async function sendPushNotification(payload) {
  initializeFirebaseAdmin();

  if (!admin.apps.length) {
    console.log('[fcm] Mock send', payload);
    return { mocked: true };
  }

  const message = {
    token: payload.token,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: payload.data || {},
    android: {
      priority: 'high',
      notification: {
        channelId: 'syno_channel',
        sound: 'default',
        tag: buildNotificationTag(payload),
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
        },
      },
    },
  };

  const response = await admin.messaging().send(message);
  return { mocked: false, messageId: response };
}

module.exports = {
  initializeFirebaseAdmin,
  isFirebaseAdminReady,
  isUnregisteredTokenError,
  sendPushNotification,
};
