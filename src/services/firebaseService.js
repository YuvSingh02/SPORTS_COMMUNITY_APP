// backend/src/services/firebaseService.js

const admin  = require('firebase-admin');
const config = require('../config/env');
const logger = require('../utils/logger');

let firebaseApp = null;

const getFirebaseApp = () => {
  if (firebaseApp) return firebaseApp;

  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   config.firebase.projectId,
      privateKey:  config.firebase.privateKey,
      clientEmail: config.firebase.clientEmail,
    }),
  });

  logger.info('Firebase Admin SDK initialised');
  return firebaseApp;
};

/**
 * Send a push notification to a single device.
 *
 * @param {string} fcmToken
 * @param {{ title: string, body: string, data?: Object }} payload
 */
const sendNotification = async (fcmToken, { title, body, data = {} }) => {
  try {
    const app = getFirebaseApp();

    await app.messaging().send({
      token: fcmToken,
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
      android: {
        notification: {
          sound:       'default',
          channelId:   'pitchstock_default',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        },
        priority: 'high',
      },
      apns: {
        payload: {
          aps: { sound: 'default', badge: 1 },
        },
      },
    });
  } catch (err) {
    // Don't throw — stale tokens are expected; just log
    logger.warn(`[Firebase] sendNotification failed for token ...${fcmToken.slice(-6)}: ${err.message}`);
  }
};

/**
 * Send to multiple devices (max 500 per batch per FCM rules).
 */
const sendBulkNotification = async (fcmTokens, payload) => {
  const BATCH_SIZE = 500;
  const app = getFirebaseApp();

  for (let i = 0; i < fcmTokens.length; i += BATCH_SIZE) {
    const batch = fcmTokens.slice(i, i + BATCH_SIZE);

    try {
      const messages = batch.map((token) => ({
        token,
        notification: { title: payload.title, body: payload.body },
        data: payload.data
          ? Object.fromEntries(Object.entries(payload.data).map(([k, v]) => [k, String(v)]))
          : {},
      }));

      const response = await app.messaging().sendEach(messages);
      logger.info(`[Firebase] Bulk send: ${response.successCount} sent, ${response.failureCount} failed`);
    } catch (err) {
      logger.error('[Firebase] Bulk notification batch failed:', err.message);
    }
  }
};

/**
 * Save FCM token to DB for a user.
 */
const saveFcmToken = async (supabase, userId, fcmToken) => {
  const { error } = await supabase
    .from('users')
    .update({ fcm_token: fcmToken })
    .eq('id', userId);

  if (error) logger.error('[Firebase] saveFcmToken failed:', error.message);
};

module.exports = {
  sendNotification,
  sendBulkNotification,
  saveFcmToken,
};
