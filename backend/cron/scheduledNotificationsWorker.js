const cron = require('node-cron');
const db = require('../db');
const webpush = require('web-push');

// Verifica a tabela scheduled_notifications a cada minuto e envia as
// notificações cujo horário já venceu.
function startScheduledNotificationsWorker() {
  if (process.env.NODE_ENV !== 'production') {
    console.log('scheduledNotificationsWorker: pulando execução quando NODE_ENV != production');
    return;
  }

  cron.schedule('* * * * *', async () => {
    try {
      console.log('[scheduledNotificationsWorker] Checking for due scheduled notifications...');
      const [rows] = await db.execute(`SELECT id, event_id, payload, scheduled_at FROM scheduled_notifications WHERE sent = 0 AND scheduled_at <= NOW() LIMIT 50`);
      if (!rows || rows.length === 0) return;

      // load subscriptions
      const [subscriptions] = await db.execute("SELECT * FROM subscriptions WHERE endpoint NOT LIKE 'decision:%'");

      for (const notif of rows) {
        const rawPayload = notif.payload;
  // Garantir que o payload seja string ou Buffer, conforme exigido pelo web-push
        let payload;
        try {
          payload = (typeof rawPayload === 'string' || Buffer.isBuffer(rawPayload)) ? rawPayload : JSON.stringify(rawPayload);
        } catch (e) {
          console.warn('[scheduledNotificationsWorker] could not stringify payload for notif', notif.id, e && e.message);
          payload = String(rawPayload);
        }
        console.log('[scheduledNotificationsWorker] payload type for notif', notif.id, '=>', typeof payload, 'len=', (payload && payload.length) ? payload.length : 0);
        let successCount = 0;
        let failureCount = 0;
        for (const sub of subscriptions) {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth }
          };
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
        // Marcar como enviado apenas se ao menos uma entrega tiver sucesso
        try {
          if (successCount > 0) {
            await db.execute('UPDATE scheduled_notifications SET sent = 1 WHERE id = ?', [notif.id]);
            console.log(`[scheduledNotificationsWorker] marked notification ${notif.id} as sent (successes=${successCount}, failures=${failureCount})`);
          } else {
            console.warn(`[scheduledNotificationsWorker] no successful deliveries for notification ${notif.id} (successes=0, failures=${failureCount}); leaving as pending`);
          }
        } catch (e) {
          console.error('[scheduledNotificationsWorker] error updating scheduled_notifications status', e && e.message ? e.message : e);
        }
      }
    } catch (err) {
      console.error('[scheduledNotificationsWorker] worker error', err);
    }
  });
}

module.exports = { startScheduledNotificationsWorker };
