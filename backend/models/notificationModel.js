const db = require('../db');

/**
 * Retorna subscriptions elegíveis para receber notificações de um dado evento.
 * Aplica filtros:
 * - subscription.endpoint NOT LIKE 'decision:%'
 * - usuário associado tem can_receive_notifications = 1 (ou true)
 * - se o evento define target_user_types, filtra por tipo de usuário
 * - se o evento tem grupos, filtra por grupos (respeitando groups_combined)
 * Retorna um array de objetos { endpoint, keys_p256dh, keys_auth, user_id }
 */
async function getEligibleSubscriptionsForEvent(eventId) {
  // Carregar público do evento
  let targetUserTypes = null;
  let eventGroupIds = [];
  let groupsCombined = 0;
  try {
    const [evtRows] = await db.execute('SELECT target_user_types, groups_combined FROM events WHERE id = ? LIMIT 1', [eventId]);
    if (evtRows && evtRows.length > 0) {
      try { targetUserTypes = evtRows[0].target_user_types ? JSON.parse(evtRows[0].target_user_types) : null; } catch (e) { targetUserTypes = evtRows[0].target_user_types; }
      groupsCombined = evtRows[0].groups_combined || 0;
      const [egs] = await db.execute('SELECT group_id FROM event_groups WHERE event_id = ?', [eventId]);
      if (egs && egs.length) eventGroupIds = egs.map(r => Number(r.group_id));
    }
  } catch (e) {
    console.warn('[notificationModel] could not load event audience info for event', eventId, e && e.message);
  }

  // Carregar subscriptions com info do usuário e grupos
  const [subscriptions] = await db.execute(`
    SELECT s.endpoint, s.keys_p256dh, s.keys_auth, s.user_id,
           ut.id AS user_type_id, ut.name AS user_type, p.can_receive_notifications, GROUP_CONCAT(ug.group_id) AS user_group_ids
    FROM subscriptions s
    LEFT JOIN users u ON s.user_id = u.id
    LEFT JOIN user_types ut ON u.user_type_id = ut.id
    LEFT JOIN permissions p ON ut.id = p.user_type_id
    LEFT JOIN user_groups ug ON ug.user_id = u.id
    WHERE s.endpoint NOT LIKE 'decision:%'
    GROUP BY s.endpoint, s.keys_p256dh, s.keys_auth, s.user_id, ut.id, ut.name, p.can_receive_notifications
  `);

  const eligible = [];
  if (subscriptions && subscriptions.length) {
    for (const s of subscriptions) {
      try {
        // Interpretar can_receive_notifications:
        // - Se o valor for NULL/undefined (por exemplo quando não existe row em permissions), tratar como permitido
        // - Caso contrário aceitar explicitamente: 1, '1', true, 'true'
        const canRecv = s.can_receive_notifications;
        let allowed;
        if (canRecv === null || typeof canRecv === 'undefined') {
          allowed = true; // fallback permissivo: quando permissions não existir, permitir
        } else {
          allowed = (canRecv === 1 || canRecv === '1' || canRecv === true || canRecv === 'true');
        }
        if (!allowed) continue;

        // Normalizar targetUserTypes: podem ser ids (números/strings numéricas) ou nomes
        if (targetUserTypes && Array.isArray(targetUserTypes) && targetUserTypes.length > 0) {
          const numericIds = new Set();
          const nameSet = new Set();
          for (const t of targetUserTypes) {
            if (t === null || typeof t === 'undefined') continue;
            const asNum = Number(t);
            if (!Number.isNaN(asNum) && String(t).trim() !== '') numericIds.add(asNum);
            else nameSet.add(String(t).toLowerCase());
          }

          let matchesType = false;
          // verificar id
          if (numericIds.size > 0 && s.user_type_id) {
            if (numericIds.has(Number(s.user_type_id))) matchesType = true;
          }
          // verificar por nome (caso frontend use nomes como 'student')
          if (!matchesType && nameSet.size > 0) {
            const stype = (s.user_type || '').toString().toLowerCase();
            if (nameSet.has(stype)) matchesType = true;
          }

          if (!matchesType) continue;
        }

        if (eventGroupIds && eventGroupIds.length > 0) {
          const userGroupIds = s.user_group_ids ? (s.user_group_ids.split(',').map(x => Number(x))) : [];
          if (groupsCombined) {
            const hasAll = eventGroupIds.every(gid => userGroupIds.includes(gid));
            if (!hasAll) continue;
          } else {
            const hasAny = eventGroupIds.some(gid => userGroupIds.includes(gid));
            if (!hasAny) continue;
          }
        }

        eligible.push({ endpoint: s.endpoint, keys_p256dh: s.keys_p256dh, keys_auth: s.keys_auth, user_id: s.user_id });
      } catch (e) {
        // ignorar subscription com erro
      }
    }
  }

  // dedupe por endpoint
  const unique = new Map();
  for (const e of eligible) if (!unique.has(e.endpoint)) unique.set(e.endpoint, e);
  return Array.from(unique.values());
}

module.exports = { getEligibleSubscriptionsForEvent };
