const db = require('../db');

/**
 * Retorna subscriptions elegíveis para receber notificações de um evento.
 * Filtra por: permissões, tipo de usuário e grupos.
 */
async function getEligibleSubscriptionsForEvent(eventId) {
  // Carregar configuração do evento
  const [evtRows] = await db.execute(
    'SELECT target_user_types, groups_combined FROM events WHERE id = ?',
    [eventId]
  );
  if (!evtRows?.length) return [];

  let targetUserTypes = null;
  try {
    targetUserTypes = evtRows[0].target_user_types ? JSON.parse(evtRows[0].target_user_types) : null;
  } catch (e) {
    targetUserTypes = evtRows[0].target_user_types;
  }

  const groupsCombined = evtRows[0].groups_combined || 0;
  const [egs] = await db.execute('SELECT group_id FROM event_groups WHERE event_id = ?', [eventId]);
  const eventGroupIds = egs.map(r => Number(r.group_id));

  // Carregar subscrições com info de usuário
  const [subscriptions] = await db.execute(`
    SELECT s.endpoint, s.keys_p256dh, s.keys_auth, s.user_id,
           ut.id AS user_type_id, p.can_receive_notifications,
           GROUP_CONCAT(ug.group_id) AS user_group_ids
    FROM subscriptions s
    LEFT JOIN users u ON s.user_id = u.id
    LEFT JOIN user_types ut ON u.user_type_id = ut.id
    LEFT JOIN permissions p ON ut.id = p.user_type_id
    LEFT JOIN user_groups ug ON ug.user_id = u.id
    GROUP BY s.endpoint, s.keys_p256dh, s.keys_auth, s.user_id, ut.id, p.can_receive_notifications
  `);

  if (!subscriptions?.length) return [];

  // Converter tipos de usuário para IDs (target_user_types armazena nomes como strings)
  let allowedTypeIds = new Set();
  const hasTypeFilter = targetUserTypes?.length > 0;

  if (hasTypeFilter) {
    const namePlaceholders = targetUserTypes.map(() => '?').join(',');
    const [typeRows] = await db.execute(
      `SELECT id FROM user_types WHERE LOWER(name) IN (${namePlaceholders})`,
      targetUserTypes.map(t => String(t).toLowerCase())
    );
    typeRows.forEach(r => allowedTypeIds.add(Number(r.id)));
  }

  const hasGroupFilter = eventGroupIds.length > 0;

  // Filtrar elegíveis
  const eligible = [];

  for (const sub of subscriptions) {
    // 1. Verificar permissão geral (se pode receber, continua; senão, pula)
    if (!sub.can_receive_notifications) continue;

    // 2. Sem filtros = aceita todos
    if (!hasTypeFilter && !hasGroupFilter) {
      eligible.push({ endpoint: sub.endpoint, keys_p256dh: sub.keys_p256dh, keys_auth: sub.keys_auth, user_id: sub.user_id });
      continue;
    }

    // 3. Filtro de tipo
    if (hasTypeFilter && !allowedTypeIds.has(Number(sub.user_type_id))) {
      continue;
    }

    // 4. Filtro de grupos
    if (hasGroupFilter) {
      const userGroups = sub.user_group_ids ? sub.user_group_ids.split(',').map(Number) : [];
      const matches = groupsCombined
        ? eventGroupIds.every(gid => userGroups.includes(gid))
        : eventGroupIds.some(gid => userGroups.includes(gid));
      
      if (!matches) continue;
    }

    // Passou em todos os filtros
    eligible.push({ endpoint: sub.endpoint, keys_p256dh: sub.keys_p256dh, keys_auth: sub.keys_auth, user_id: sub.user_id });
  }

  return eligible;
}

module.exports = { getEligibleSubscriptionsForEvent };
