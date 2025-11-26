const cron = require('node-cron');
const db = require('../db');
const webpush = require('web-push');
const notificationModel = require('../models/notificationModel');

// Verifica a tabela scheduled_notifications a cada minuto e envia as
// notificações cujo horário já venceu.
function startScheduledNotificationsWorker() {
  if (process.env.NODE_ENV !== 'production') {
    console.log('scheduledNotificationsWorker: pulando execução quando NODE_ENV != production');
    return;
  }

  cron.schedule('* * * * *', async () => {
    try {
      await processDue();
    } catch (err) {
      console.error('[scheduledNotificationsWorker] worker error', err);
    }
  });
}

async function processDue() {
  try {
    console.log('[scheduledNotificationsWorker] Checking for due scheduled notifications...');
    const [updateRes] = await db.execute("UPDATE scheduled_notifications SET sent = 2 WHERE sent = 0 AND scheduled_at <= UTC_TIMESTAMP() LIMIT 50");
    const affectedRows = updateRes && (updateRes.affectedRows || updateRes.affectedRows === 0 ? updateRes.affectedRows : 0);
    console.log('[scheduledNotificationsWorker] reserve affectedRows:', affectedRows);
    const [rows] = await db.execute(`SELECT id, event_id, payload, scheduled_at, attempts FROM scheduled_notifications WHERE sent = 2 AND scheduled_at <= UTC_TIMESTAMP() LIMIT 50`);
    if (!rows || rows.length === 0) {
      console.log('[scheduledNotificationsWorker] no reserved rows to process');
      return { reserved: 0 };
    }

    // Carregar todas as subscriptions com informações do usuário (tipo e grupos) e checar can_receive_notifications
  
    for (const notif of rows) {
      const rawPayload = notif.payload;
      let payload;
      try {
        payload = (typeof rawPayload === 'string' || Buffer.isBuffer(rawPayload)) ? rawPayload : JSON.stringify(rawPayload);
      } catch (e) {
        console.warn('[scheduledNotificationsWorker] could not stringify payload for notif', notif.id, e && e.message);
        payload = String(rawPayload);
      }
      console.log('[scheduledNotificationsWorker] payload type for notif', notif.id, '=>', typeof payload, 'len=', (payload && payload.length) ? payload.length : 0);
      // Obter subscriptions elegíveis através do model (DB interaction encapsulada)
      let uniqueSubscriptions = [];
      try {
        uniqueSubscriptions = await notificationModel.getEligibleSubscriptionsForEvent(notif.event_id);
      } catch (e) {
        console.warn('[scheduledNotificationsWorker] failed to get eligible subscriptions from model for event', notif.event_id, e && e.message);
        uniqueSubscriptions = [];
      }
      console.log('[scheduledNotificationsWorker] eligible unique subscriptions count for notif', notif.id, ':', uniqueSubscriptions.length);

      let successCount = 0;
      let failureCount = 0;
      for (const sub of uniqueSubscriptions) {
        const pushSubscription = { endpoint: sub.endpoint, keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth } };
        try {
          await webpush.sendNotification(pushSubscription, payload);
          successCount++;
          console.log('[scheduledNotificationsWorker] push sent to', sub.endpoint.slice(0,80));
        } catch (err) {
          failureCount++;
          console.error('[scheduledNotificationsWorker] error sending push to', sub.endpoint.slice(0,80), err && err.message ? err.message : err);
          if (err && err.statusCode === 410) {
            try { await db.execute('DELETE FROM subscriptions WHERE endpoint = ?', [sub.endpoint]); console.log('[scheduledNotificationsWorker] deleted expired subscription', sub.endpoint.slice(0,80)); } catch(e){ console.warn('[scheduledNotificationsWorker] failed deleting subscription', e && e.message); }
          }
        }
      }
      try {
        const nowSql = 'UTC_TIMESTAMP()';
        if (successCount > 0) {
          await db.execute('UPDATE scheduled_notifications SET sent = 1, attempts = COALESCE(attempts,0) + 1, last_attempt_at = ' + nowSql + ' WHERE id = ?', [notif.id]);
          console.log(`[scheduledNotificationsWorker] marked notification ${notif.id} as sent (successes=${successCount}, failures=${failureCount})`);
        } else {
          await db.execute('UPDATE scheduled_notifications SET sent = 0, attempts = COALESCE(attempts,0) + 1, last_attempt_at = ' + nowSql + ' WHERE id = ?', [notif.id]);
          console.warn(`[scheduledNotificationsWorker] no successful deliveries for notification ${notif.id} (successes=0, failures=${failureCount}); reset to pending for retry`);
        }
      } catch (e) {
        console.error('[scheduledNotificationsWorker] error updating scheduled_notifications status', e && e.message ? e.message : e);
      }
    }
    return { reserved: rows.length };
  } catch (err) {
    console.error('[scheduledNotificationsWorker] worker error', err);
    throw err;
  }
}

module.exports = { startScheduledNotificationsWorker, processDue };
