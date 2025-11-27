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

  // Depuração: logging detalhado opcional controlado pela variável de ambiente
  const debug = process.env.DEBUG_NOTIFICATION_MODEL === 'true';
  if (debug) {
    console.log('[notificationModel] debug: eventId=', eventId, 'targetUserTypes=', targetUserTypes, 'eventGroupIds=', eventGroupIds, 'groupsCombined=', groupsCombined);
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
  // Observação: decisões (opt-in/opt-out) são armazenadas como subscriptions com endpoint 'decision:<user_id>'
  // Iremos buscar essas decisões por usuário ao avaliar cada subscription abaixo (para priorizar decisão explícita do usuário)

  const eligible = [];
  if (subscriptions && subscriptions.length) {
    if (debug) console.log('[notificationModel] debug: subscriptions fetched count=', subscriptions.length);
    for (const s of subscriptions) {
      if (debug) console.log('[notificationModel] debug: subscription sample ->', { endpointPrefix: (s.endpoint||'').slice(0,80), user_id: s.user_id, user_type: s.user_type, can_receive_notifications: s.can_receive_notifications, user_group_ids: s.user_group_ids });
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

        // Verificar decisão explícita do usuário sobre notificações (armazenada como subscription com endpoint 'decision:<user_id>')
        // Se o usuário explicitamente 'denied' (negou), pular. Se 'granted' (concedeu), sobrescrever e permitir.
        try {
          const decisionKey = `decision:${s.user_id}`;
          const [decRows] = await db.execute('SELECT keys_p256dh FROM subscriptions WHERE endpoint = ? LIMIT 1', [decisionKey]);
          const decisionVal = decRows && decRows[0] ? decRows[0].keys_p256dh : null;
          if (decisionVal) {
            const dv = String(decisionVal).toLowerCase();
            if (dv === 'denied') {
              if (debug) console.log('[notificationModel] debug: user decision denied -> skipping', s.user_id);
              continue;
            }
            if (dv === 'granted') {
              allowed = true;
            }
          }
        } catch (e) {
          if (debug) console.warn('[notificationModel] debug: failed to read decision for user', s.user_id, e && e.message);
        }

        if (!allowed) {
          if (debug) console.log('[notificationModel] debug: rejecting subscription (not allowed)', { user_id: s.user_id, can_receive_notifications: s.can_receive_notifications });
          continue;
        }

        // Nota: o caso 'sem público definido' (nenhum target_user_types e nenhum grupo)
        // será tratado abaixo. Aqui calculamos matchesType e matchesGroup.

        let matchesType = null; // null = não aplicado
        let matchesGroup = null;
        let isAllSelected = false;

        if (targetUserTypes && Array.isArray(targetUserTypes) && targetUserTypes.length > 0) {
          const numericIds = new Set();
          const nameCandidates = [];
          const norm = (x) => (x ? String(x).toLowerCase().normalize('NFD').replace(/[\u0000-\u036f]/g, '') : '');
          const aliasMap = { student: ['aluno', 'student'], teacher: ['professor', 'teacher'], guardian: ['responsavel', 'guardian', 'responsible'], admin: ['admin'] };

          for (const t of targetUserTypes) {
            if (t === null || typeof t === 'undefined') continue;
            const asNum = Number(t);
            if (!Number.isNaN(asNum) && String(t).trim() !== '') numericIds.add(asNum);
            else {
              const key = norm(t);
              if (aliasMap[key]) for (const a of aliasMap[key]) nameCandidates.push(norm(a)); else nameCandidates.push(key);
            }
          }

          if (nameCandidates.length > 0) {
            try {
              const uniqNames = Array.from(new Set(nameCandidates.map(x => String(x).toLowerCase())));
              const placeholders = uniqNames.map(() => '?').join(',');
              const [typeRows] = await db.execute(`SELECT id, name FROM user_types WHERE LOWER(name) IN (${placeholders})`, uniqNames);
              if (typeRows && typeRows.length) for (const tr of typeRows) numericIds.add(Number(tr.id));
            } catch (e) { if (debug) console.warn('[notificationModel] debug: failed to resolve user_type ids from names', nameCandidates, e && e.message); }
          }

          const nameSet = new Set((nameCandidates || []).map(x => String(x).toLowerCase()).filter(Boolean));

          try {
            const [cntRows] = await db.execute('SELECT COUNT(*) as cnt FROM user_types');
            const totalTypes = cntRows && cntRows[0] ? Number(cntRows[0].cnt) : 0;
            if (totalTypes > 0 && numericIds.size > 0 && numericIds.size === totalTypes) isAllSelected = true;
          } catch (e) { if (debug) console.warn('[notificationModel] debug: failed to fetch user_types count', e && e.message); }

          if (isAllSelected) matchesType = true; else {
            let mt = false;
            if (numericIds.size > 0 && s.user_type_id) mt = numericIds.has(Number(s.user_type_id));
            if (!mt && nameSet.size > 0) {
              const stype = norm(s.user_type || '');
              if (nameSet.has(stype)) mt = true;
            }
            matchesType = mt;
          }
          if (debug) console.log('[notificationModel] debug: type matching result', { user_id: s.user_id, matchesType, numericIds: Array.from(numericIds), nameSet: Array.from(nameSet), isAllSelected });
        }

        if (eventGroupIds && eventGroupIds.length > 0) {
          const userGroupIds = s.user_group_ids ? (s.user_group_ids.split(',').map(x => Number(x))) : [];
          if (groupsCombined) matchesGroup = eventGroupIds.every(gid => userGroupIds.includes(gid)); else matchesGroup = eventGroupIds.some(gid => userGroupIds.includes(gid));
          if (debug) console.log('[notificationModel] debug: group matching result', { user_id: s.user_id, matchesGroup, userGroupIds });
        }

        // Determinar condição final de audiência
        const noAudienceFinal = (!targetUserTypes || (Array.isArray(targetUserTypes) && targetUserTypes.length === 0)) && (!eventGroupIds || eventGroupIds.length === 0);

        if (isAllSelected && (!eventGroupIds || eventGroupIds.length === 0)) {
          if (debug) console.log('[notificationModel] debug: frontend selected ALL user types -> accepting subscription', s.user_id);
          eligible.push({ endpoint: s.endpoint, keys_p256dh: s.keys_p256dh, keys_auth: s.keys_auth, user_id: s.user_id });
          continue;
        }

        if (noAudienceFinal) {
          if (debug) console.log('[notificationModel] debug: no audience defined -> accepting subscription', (s.endpoint||'').slice(0,120));
          eligible.push({ endpoint: s.endpoint, keys_p256dh: s.keys_p256dh, keys_auth: s.keys_auth, user_id: s.user_id });
          continue;
        }

        if (matchesType === false) { if (debug) console.log('[notificationModel] debug: reject by type', s.user_id); continue; }
        if (matchesGroup === false) { if (debug) console.log('[notificationModel] debug: reject by group', s.user_id); continue; }

        if (debug) console.log('[notificationModel] debug: accepting subscription', { user_id: s.user_id, endpointPrefix: (s.endpoint||'').slice(0,80) });
        eligible.push({ endpoint: s.endpoint, keys_p256dh: s.keys_p256dh, keys_auth: s.keys_auth, user_id: s.user_id });
      } catch (e) {
        // ignorar subscription com erro
        if (debug) console.warn('[notificationModel] debug: ignoring subscription due to processing error', e && e.message);
      }
    }
  }

  // dedupe por endpoint
  const unique = new Map();
  for (const e of eligible) if (!unique.has(e.endpoint)) unique.set(e.endpoint, e);
  return Array.from(unique.values());
}

module.exports = { getEligibleSubscriptionsForEvent };
