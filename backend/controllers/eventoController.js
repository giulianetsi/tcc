const db = require('../db');
const webpush = require('web-push');

// Criar um novo evento
// - Recebe campos (título, descrição, data/hora, grupos, flags de notificação)
// - Insere o evento na tabela `events` e associa grupos em `event_groups`
// - Se solicitado, envia notificações imediatamente ou cria registro em `scheduled_notifications`
const addEvento = async (req, res) => {
  console.log('[addEvento] Valor de req.body.sendNotification:', req.body.sendNotification, typeof req.body.sendNotification);
  const { titulo: title, descricao: description, tipo: type, publico: is_public, target_user_types, data_horario_evento: event_datetime, local_evento: event_location, selectedGroups, isGroupsCombined } = req.body;
  
  const data_period_start = req.body.data_period_start || req.body.dataPeriodStart || null;
  const data_period_end = req.body.data_period_end || req.body.dataPeriodEnd || null;
  const mostrar_data = typeof req.body.mostrar_data !== 'undefined' ? req.body.mostrar_data : (typeof req.body.mostrarData !== 'undefined' ? req.body.mostrarData : undefined);
  const mostrar_apenas_na_data = typeof req.body.mostrar_apenas_na_data !== 'undefined' ? req.body.mostrar_apenas_na_data : (typeof req.body.mostrarApenasNaData !== 'undefined' ? req.body.mostrarApenasNaData : undefined);
  
  const user_id = req.user?.userId || req.body.user_id;
  // LOGS
  console.log('Payload recebido:', {
    title,
    description,
    type,
    user_id,
    is_public,
    target_user_types,
  });

  // Obter conexão do pool para executar múltiplas queries em transação
  let connection;
  try {
    connection = await db.getConnection();
    // Montar colunas e valores dinamicamente
    const columns = [];
    const placeholders = [];
    const values = [];
    if (title) { columns.push('title'); placeholders.push('?'); values.push(title); }
    if (description) { columns.push('description'); placeholders.push('?'); values.push(description); }
    if (type) { columns.push('type'); placeholders.push('?'); values.push(type); }
    if (user_id) { columns.push('user_id'); placeholders.push('?'); values.push(user_id); }
    // Converter is_public para inteiro (1=público, 0=privado)
    let isPublicValue = null;
    if (typeof is_public === 'string') {
      if (is_public.toLowerCase() === 'publico') isPublicValue = 1;
      else if (is_public.toLowerCase() === 'privado') isPublicValue = 0;
    } else if (typeof is_public === 'number') {
      isPublicValue = is_public;
    }
    if (isPublicValue !== null) {
      columns.push('is_public'); placeholders.push('?'); values.push(isPublicValue);
    }
  if (event_datetime) { columns.push('event_datetime'); placeholders.push('?'); values.push(event_datetime); }
  if (data_period_start) { columns.push('data_period_start'); placeholders.push('?'); values.push(data_period_start); }
  if (data_period_end) { columns.push('data_period_end'); placeholders.push('?'); values.push(data_period_end); }
  if (typeof mostrar_data !== 'undefined') { columns.push('mostrar_data'); placeholders.push('?'); values.push(mostrar_data ? 1 : 0); }
  if (typeof mostrar_apenas_na_data !== 'undefined') { columns.push('mostrar_apenas_na_data'); placeholders.push('?'); values.push(mostrar_apenas_na_data ? 1 : 0); }
  if (event_location) { columns.push('event_location'); placeholders.push('?'); values.push(event_location); }

  // Montar e executar SQL de inserção dinamicamente com colunas/valores presentes
  const insertSql = `INSERT INTO events (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;
  const [result] = await connection.execute(insertSql, values);
    const eventoId = result.insertId;

    // Atualizar target_user_types se fornecido
    if (target_user_types && Array.isArray(target_user_types)) {
      try {
        await connection.execute(
          'UPDATE events SET target_user_types = ? WHERE id = ?',
          [JSON.stringify(target_user_types), eventoId]
        );
      } catch (updateError) {
        console.log('Aviso: Coluna target_user_types não existe ainda:', updateError.message);
      }
    }

    // Associar grupos ao evento, se houver
    if (selectedGroups && Array.isArray(selectedGroups) && selectedGroups.length > 0) {
      for (const groupId of selectedGroups) {
        await connection.execute(
          'INSERT INTO event_groups (event_id, group_id) VALUES (?, ?)',
          [eventoId, groupId]
        );
      }
    }

    await connection.commit();

    // --- Lógica de envio / agendamento de notificações ---
    // A flag sendNotification (vinda do frontend) controla se vai enviar/agendar push
    const sendNotification = req.body.sendNotification === true || req.body.sendNotification === 'true' || req.body.sendNotification === 1 || req.body.sendNotification === '1';
    const sendNotificationMode = req.body.sendNotificationMode || req.body.send_notification_mode || 'scheduled';
    const scheduledNotificationDatetime = req.body.scheduledNotificationDatetime || req.body.scheduled_notification_datetime;
    if (sendNotification) {
      try {
        // Payload padrão para a notificação
        const payload = JSON.stringify({
          title: 'Novo evento',
          body: `Um novo evento foi criado: ${req.body.titulo}`,
          data: { eventoId }
        });

        const containsTime = (s) => {
          if (!s) return false;
          return /T|\s+\d{2}:\d{2}|:\d{2}/.test(String(s));
        };

        const DEFAULT_NOTIFICATION_TIME = process.env.DEFAULT_EVENT_NOTIFICATION_TIME || '09:00:00';

        if (String(sendNotificationMode).toLowerCase() === 'immediate' || String(sendNotificationMode).toLowerCase() === 'now') {
          // Enviar imediatamente: buscar todas as subscriptions e chamar web-push
          try {
            const [subscriptions] = await db.execute("SELECT * FROM subscriptions WHERE endpoint NOT LIKE 'decision:%'");
            console.log(`[addEvento] Enviando push imediato para ${subscriptions.length} subscriptions`);
            for (const sub of subscriptions) {
              const pushSubscription = {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth }
              };
              try {
                await webpush.sendNotification(pushSubscription, payload);
                console.log('[addEvento] Push enviado com sucesso para:', sub.endpoint);
              } catch (err) {
                // Tratar erros e remover subscriptions inválidas (410)
                console.error('[addEvento] Erro ao enviar push para', sub.endpoint, err.message || err);
                if (err.statusCode === 410) {
                  try { await db.execute('DELETE FROM subscriptions WHERE endpoint = ?', [sub.endpoint]); } catch (delErr) { console.warn('Erro ao deletar subscription inválida', delErr.message); }
                }
              }
            }
          } catch (subErr) {
            console.error('[addEvento] Erro ao buscar/iterar subscriptions:', subErr.message || subErr);
          }
        } else {
          // Modo agendado: decidir scheduled_at com base em vários campos (front, event_datetime, period start, default time)
          let scheduledAt = null;
          if (scheduledNotificationDatetime) {
            scheduledAt = String(scheduledNotificationDatetime).replace('T', ' ');
          } else if (event_datetime && containsTime(event_datetime)) {
            scheduledAt = event_datetime.replace('T', ' ');
          } else if (data_period_start && containsTime(data_period_start)) {
            scheduledAt = data_period_start.replace('T', ' ');
          } else if (event_datetime) {
            scheduledAt = `${event_datetime} ${DEFAULT_NOTIFICATION_TIME}`;
          } else if (data_period_start) {
            scheduledAt = `${data_period_start} ${DEFAULT_NOTIFICATION_TIME}`;
          } else {
            scheduledAt = new Date().toISOString().slice(0,19).replace('T',' ');
          }

          try {
            // Inserir registro na fila de agendamento (scheduled_notifications)
            await connection.execute(
              'INSERT INTO scheduled_notifications (event_id, payload, scheduled_at) VALUES (?, ?, ?)',
              [eventoId, payload, scheduledAt]
            );
            console.log('[addEvento] Notificação agendada para', scheduledAt);
          } catch (schedErr) {
            console.error('[addEvento] Erro ao inserir scheduled_notifications:', schedErr.message);
          }
        }
      } catch (pushErr) {
        console.error('[addEvento] Erro ao processar envio/agendamento de notifications:', pushErr.message);
      }
    } else {
      console.log('[addEvento] Envio de notificação NÃO solicitado.');
    }
    if (connection) {
      try { connection.release(); } catch (e) {}
    }
    // Responder sucesso
    return res.status(201).json({ message: 'Evento criado', id: eventoId });
  } catch (err) {
    // Em caso de erro, tentar rollback e liberar conexão
    try { if (connection) await connection.rollback(); } catch (rbErr) { console.warn('Rollback falhou:', rbErr.message); }
    try { if (connection) connection.release(); } catch (relErr) { /* ignore */ }
    console.error('addEvento error', err);
    return res.status(500).json({ message: 'Erro ao criar evento', error: err.message });
  }
};

// Buscar eventos visíveis ao usuário autenticado
// Filtragem complexa baseada em permissões, tipo de usuário e associação por grupos
const getEventos = async (req, res) => {
  try {
    const userId = req.user?.userId;
    
    // Buscar informações do usuário
    const [userInfo] = await db.execute(`
      SELECT ut.name as user_type, p.can_view_all_events
      FROM users u 
      JOIN user_types ut ON u.user_type_id = ut.id
      JOIN permissions p ON ut.id = p.user_type_id
      WHERE u.id = ?
    `, [userId]);

    if (!userInfo.length) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    const userType = userInfo[0].user_type;
    const canViewAll = userInfo[0].can_view_all_events;

  // Para usuários do tipo 'responsavel', tentar usar o estudante vinculado
  // como 'effective user' para fins de filtragem de eventos (assim ele vê os mesmos eventos do aluno).
    let effectiveUserId = userId;
    let effectiveUserType = userType;
    try {
      if (String(userType).toLowerCase() === 'responsavel' || String(userType).toLowerCase() === 'guardian') {
        const [guardRows] = await db.execute('SELECT student_id FROM guardians WHERE guardian_id = ?', [userId]);
        if (guardRows && guardRows.length > 0) {
          effectiveUserId = guardRows[0].student_id;
          // obter o tipo do usuário estudante vinculado
          const [stuRows] = await db.execute('SELECT ut.name as user_type FROM users u JOIN user_types ut ON u.user_type_id = ut.id WHERE u.id = ?', [effectiveUserId]);
          if (stuRows && stuRows.length > 0) effectiveUserType = stuRows[0].user_type;
          console.log(`Responsável detectado: usando estudante ${effectiveUserId} (tipo ${effectiveUserType}) para filtragem de eventos`);
        }
      }
    } catch (guardErr) {
      console.warn('Erro ao buscar estudante vinculado ao responsável:', guardErr.message);
      // manter effectiveUserId/userType como o usuário atual
    }

  // Montar query principal dependendo se o usuário tem permissão para ver todos os eventos
  let query;
  let params = [];
    
    // Se o usuário pode ver todos os eventos (admin/professor), mostrar todos
  if (canViewAll) {
      query = `
        SELECT DISTINCT e.*, 
               CONCAT(u.first_name, ' ', u.last_name) as created_by,
               ut.name as creator_type,
               GROUP_CONCAT(DISTINCT g.name) as grupos,
               e.target_user_types
        FROM events e
        LEFT JOIN users u ON e.user_id = u.id
        LEFT JOIN user_types ut ON u.user_type_id = ut.id
        LEFT JOIN event_groups eg ON e.id = eg.event_id
        LEFT JOIN \`groups\` g ON eg.group_id = g.id
        GROUP BY e.id
        ORDER BY e.event_datetime ASC
      `;
  } else {
      // Para outros usuários: filtrar por tipo de usuário e grupos
      // Mapeamento entre nomes em PT (no DB) e tokens em EN (front)
      const typeMap = {
        'aluno': ['aluno','student'],
        'professor': ['professor','teacher'],
        'responsavel': ['responsavel','guardian'],
        'admin': ['admin']
      };

  const variants = typeMap[effectiveUserType] || [effectiveUserType];
  // preparar parâmetros: cada variante terá dois checks: JSON_CONTAINS(...) e LIKE '%variant%'
  const jsonCandidates = variants.map(v => JSON.stringify(v));
  const likeCandidates = variants.map(v => `%${v}%`);

  // montar cláusula para checar qualquer uma das variantes (JSON_CONTAINS OR LIKE)
  const containsClauses = variants.map(() => '(JSON_CONTAINS(e.target_user_types, ?) OR e.target_user_types LIKE ?)').join(' OR ');

      query = `
        SELECT DISTINCT e.*, 
               CONCAT(u.first_name, ' ', u.last_name) as created_by,
               ut.name as creator_type,
               GROUP_CONCAT(DISTINCT g.name) as grupos,
               e.target_user_types
        FROM events e
        LEFT JOIN users u ON e.user_id = u.id
        LEFT JOIN user_types ut ON u.user_type_id = ut.id
        LEFT JOIN event_groups eg ON e.id = eg.event_id
        LEFT JOIN \`groups\` g ON eg.group_id = g.id
        WHERE (
          -- 1. Verificar se o tipo do usuário está no público alvo do evento
          (e.target_user_types IS NULL OR (${containsClauses}))
          AND (
            -- 2b. Eventos com grupos não combinados (OR): usuário em pelo menos 1 grupo
            (e.groups_combined = 0 
             AND (
               -- se o evento não tem grupos associados, considerar como sem restrição por grupos
               NOT EXISTS (
                 SELECT 1 FROM event_groups eg0 WHERE eg0.event_id = e.id
               )
               OR e.id IN (
                 SELECT DISTINCT eg2.event_id 
                 FROM event_groups eg2
                 JOIN user_groups ug ON eg2.group_id = ug.group_id
                 WHERE ug.user_id = ?
               )
             ))
            OR
            -- 2c. Eventos com grupos combinados (AND): usuário em TODOS os grupos
            (e.groups_combined = 1
             AND e.id IN (
               SELECT eg3.event_id
               FROM event_groups eg3
               WHERE eg3.event_id NOT IN (
                 SELECT DISTINCT eg4.event_id
                 FROM event_groups eg4
                 WHERE eg4.group_id NOT IN (
                   SELECT ug2.group_id
                   FROM user_groups ug2
                   WHERE ug2.user_id = ?
                 )
               )
             ))
          )
        )
        GROUP BY e.id
        ORDER BY e.event_datetime ASC
      `;

      // intercalar parâmetros: [json1, like1, json2, like2, ..., effectiveUserId, effectiveUserId]
      const interleaved = [];
      for (let i = 0; i < jsonCandidates.length; i++) {
        interleaved.push(jsonCandidates[i], likeCandidates[i]);
      }
      params = [...interleaved, effectiveUserId, effectiveUserId];
    }
    
  let events;
    try {
      // DEBUG: imprimir informações sobre a query e parâmetros 
      try {
        console.log('getEventos: canViewAll=', canViewAll, 'userType=', userType);
        if (params && params.length) {
          console.log('getEventos: params length=', params.length, 'params=', params);
        }
        // Mostrar trecho inicial da query
        if (typeof query === 'string') {
          console.log('getEventos: query preview ->', query.replace(/\s+/g, ' ').slice(0, 500));
        }
      } catch (dbgErr) {
        console.warn('getEventos: erro ao gerar debug logs', dbgErr);
      }

      const result = await db.execute(query, params);
      events = result[0];
    } catch (queryErr) {
      // Se a coluna target_user_types não existir no banco, montar uma query alternativa sem essa coluna
      if (queryErr && queryErr.code === 'ER_BAD_FIELD_ERROR' && /target_user_types/.test(queryErr.message)) {
        console.warn('Coluna target_user_types não encontrada — usando query alternativa sem essa coluna');
        // Recriar queries sem referenciar e.target_user_types / JSON_CONTAINS
        if (canViewAll) {
          query = `
            SELECT DISTINCT e.*, 
                   CONCAT(u.first_name, ' ', u.last_name) as created_by,
                   ut.name as creator_type,
                   GROUP_CONCAT(DISTINCT g.name) as grupos
            FROM events e
            LEFT JOIN users u ON e.user_id = u.id
            LEFT JOIN user_types ut ON u.user_type_id = ut.id
            LEFT JOIN event_groups eg ON e.id = eg.event_id
            LEFT JOIN \`groups\` g ON eg.group_id = g.id
            GROUP BY e.id
            ORDER BY e.event_datetime ASC
          `;
          params = [];
        } else {
          query = `
            SELECT DISTINCT e.*, 
                   CONCAT(u.first_name, ' ', u.last_name) as created_by,
                   ut.name as creator_type,
                   GROUP_CONCAT(DISTINCT g.name) as grupos
            FROM events e
            LEFT JOIN users u ON e.user_id = u.id
            LEFT JOIN user_types ut ON u.user_type_id = ut.id
            LEFT JOIN event_groups eg ON e.id = eg.event_id
            LEFT JOIN \`groups\` g ON eg.group_id = g.id
            WHERE (
              -- 1. Sem coluna target_user_types, apenas verificar grupos
              (
                -- 2b. Eventos com grupos não combinados (OR): usuário em pelo menos 1 grupo
                (e.groups_combined = 0 
                 AND (
                   NOT EXISTS (
                     SELECT 1 FROM event_groups eg0 WHERE eg0.event_id = e.id
                   )
                   OR e.id IN (
                     SELECT DISTINCT eg2.event_id 
                     FROM event_groups eg2
                     JOIN user_groups ug ON eg2.group_id = ug.group_id
                     WHERE ug.user_id = ?
                   )
                 ))
                OR
                -- 2c. Eventos com grupos combinados (AND): usuário em TODOS os grupos
                (e.groups_combined = 1
                 AND e.id IN (
                   SELECT eg3.event_id
                   FROM event_groups eg3
                   WHERE eg3.event_id NOT IN (
                     SELECT DISTINCT eg4.event_id
                     FROM event_groups eg4
                     WHERE eg4.group_id NOT IN (
                       SELECT ug2.group_id
                       FROM user_groups ug2
                       WHERE ug2.user_id = ?
                     )
                   )
                 ))
              )
            )
            GROUP BY e.id
            ORDER BY e.event_datetime ASC
          `;
          params = [userId, userId];
        }

        const resultAlt = await db.execute(query, params);
        events = resultAlt[0];
      } else {
        throw queryErr;
      }
    }
    
  // Formatar eventos para o frontend (transformações de data/horário e mapeamento de campos)
    const formattedEvents = events.map(event => ({
      id: event.id,
      titulo: event.title,
      texto: event.description,
      data: event.event_datetime ? new Date(event.event_datetime).toLocaleDateString('pt-BR') : '',
      hora: event.event_datetime ? new Date(event.event_datetime).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'}) : '',
      // Raw ISO datetime suitable for <input type="datetime-local"> (YYYY-MM-DDTHH:MM)
      event_datetime_raw: event.event_datetime ? new Date(event.event_datetime).toISOString().slice(0,16) : '',
      // Period fields (may be null)
      data_period_start: event.data_period_start ? (typeof event.data_period_start === 'string' ? event.data_period_start : (new Date(event.data_period_start).toISOString().slice(0,10))) : '',
      data_period_end: event.data_period_end ? (typeof event.data_period_end === 'string' ? event.data_period_end : (new Date(event.data_period_end).toISOString().slice(0,10))) : '',
      mostrar_data: typeof event.mostrar_data !== 'undefined' ? Boolean(event.mostrar_data) : true,
      mostrar_apenas_na_data: Boolean(event.mostrar_apenas_na_data),
      local: event.event_location || '',
      tipo: event.type || 'default',
      publico: event.is_public ? 'publico' : 'privado',
      criado_por: event.created_by || 'Desconhecido',
      criado_por_id: event.user_id || null,
      tipo_criador: event.creator_type || 'N/A',
      grupos: event.grupos ? event.grupos.split(',') : [],
      grupos_combinados: event.groups_combined ? true : false,
      icone: getEventIcon(event.type)
    }));
    
    // Se estiver sendo usado um effectiveUser diferente (responsável vendo como aluno), incluir info
    const responsePayload = {
      events: formattedEvents
    };
    if (typeof effectiveUserId !== 'undefined' && Number(effectiveUserId) !== Number(userId)) {
      try {
        const [stu] = await db.execute('SELECT first_name, last_name, id FROM users WHERE id = ?', [effectiveUserId]);
        if (stu && stu.length > 0) {
          responsePayload.viewingAs = { id: stu[0].id, first_name: stu[0].first_name, last_name: stu[0].last_name };
        }
      } catch (viewErr) {
        console.warn('Erro ao obter dados do estudante para viewingAs:', viewErr.message);
      }
    }

    // Retornar payload final para o frontend
    res.status(200).json(responsePayload);
  } catch (error) {
    console.error('Erro ao buscar eventos:', error);
    res.status(500).json({ message: 'Erro ao buscar eventos', error: error.message });
  }
};

// Função auxiliar para determinar ícone do evento
const getEventIcon = (type) => {
  switch(type?.toLowerCase()) {
    case 'evento':
    case 'tipo2':
      return 'evento';
    case 'reuniao':
    case 'reunião':
    case 'tipo3':
      return 'reuniao';
    case 'aviso':
    case 'alerta':
    case 'tipo1':
      return 'aviso';
    default:
      return 'evento';
  }
};

// Atualizar evento (apenas criador ou admin)
const updateEvento = async (req, res) => {
  const eventId = req.params.id;
  const userId = req.user?.userId;
  const { titulo: title, descricao: description, tipo: type, publico: is_public, target_user_types, data_horario_evento: event_datetime, local_evento: event_location, selectedGroups, isGroupsCombined } = req.body;
  // safe aliases for optional/alternate keys
  const data_period_start = req.body.data_period_start || req.body.dataPeriodStart || null;
  const data_period_end = req.body.data_period_end || req.body.dataPeriodEnd || null;
  const mostrar_data = typeof req.body.mostrar_data !== 'undefined' ? req.body.mostrar_data : (typeof req.body.mostrarData !== 'undefined' ? req.body.mostrarData : undefined);
  const mostrar_apenas_na_data = typeof req.body.mostrar_apenas_na_data !== 'undefined' ? req.body.mostrar_apenas_na_data : (typeof req.body.mostrarApenasNaData !== 'undefined' ? req.body.mostrarApenasNaData : undefined);

  try {
    // Verificar proprietário
    const [rows] = await db.execute('SELECT user_id FROM events WHERE id = ?', [eventId]);
    if (!rows.length) return res.status(404).json({ message: 'Evento não encontrado' });
    const ownerId = rows[0].user_id;
  // Preferir flags explícitas de permissão no token; caso não existam, usar fallback
  // por tipo numérico/textual.
  const isAdmin = Boolean(req.user?.permissions && (req.user.permissions.canViewAllEvents || req.user.permissions.can_create_user || req.user.permissions.canCreateUser)) ||
                  req.user?.userTypeId === 1 || String(req.user?.userType).toLowerCase() === 'admin';
    if (Number(ownerId) !== Number(userId) && !isAdmin) {
      return res.status(403).json({ message: 'Apenas o criador ou administrador pode editar este evento' });
    }

    // Atualizar campos básicos
    await db.execute(
      `UPDATE events SET title = ?, description = ?, type = ?, is_public = ?, event_datetime = ?, data_period_start = ?, data_period_end = ?, mostrar_data = ?, mostrar_apenas_na_data = ?, event_location = ?, groups_combined = ? WHERE id = ?`,
      [title || null, description || null, type || null, is_public === 'publico' ? 1 : 0, event_datetime || null, data_period_start || null, data_period_end || null, typeof mostrar_data !== 'undefined' ? (mostrar_data ? 1 : 0) : 1, typeof mostrar_apenas_na_data !== 'undefined' ? (mostrar_apenas_na_data ? 1 : 0) : 0, event_location || null, isGroupsCombined ? 1 : 0, eventId]
    );

    // Atualizar target_user_types se fornecido
    if (target_user_types && Array.isArray(target_user_types)) {
      try {
        await db.execute('UPDATE events SET target_user_types = ? WHERE id = ?', [JSON.stringify(target_user_types), eventId]);
      } catch (err) {
        console.warn('updateEvento: coluna target_user_types não existe');
      }
    }

    // Atualizar associações de grupos: simples approach - deletar e reinserir
    if (Array.isArray(selectedGroups)) {
      await db.execute('DELETE FROM event_groups WHERE event_id = ?', [eventId]);
      for (const gid of selectedGroups) {
        await db.execute('INSERT INTO event_groups (event_id, group_id) VALUES (?, ?)', [eventId, gid]);
      }
    }
    // Se foi solicitada notificação no update, processar envio/agendamento
    const sendNotification = req.body.sendNotification === true || req.body.sendNotification === 'true' || req.body.sendNotification === 1 || req.body.sendNotification === '1';
    const sendNotificationMode = req.body.sendNotificationMode || req.body.send_notification_mode || 'scheduled';
    const scheduledNotificationDatetime = req.body.scheduledNotificationDatetime || req.body.scheduled_notification_datetime;
    if (sendNotification) {
      const payload = JSON.stringify({ title: 'Evento atualizado', body: `Evento atualizado: ${title || 'Sem título'}`, data: { eventoId: eventId } });
      try {
        if (String(sendNotificationMode).toLowerCase() === 'immediate' || String(sendNotificationMode).toLowerCase() === 'now') {
          const [subscriptions] = await db.execute("SELECT * FROM subscriptions WHERE endpoint NOT LIKE 'decision:%'");
          for (const sub of subscriptions) {
            const pushSubscription = { endpoint: sub.endpoint, keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth } };
            try {
              await webpush.sendNotification(pushSubscription, payload);
            } catch (err) {
              console.error('[updateEvento] Erro ao enviar push para', sub.endpoint, err.message || err);
              if (err.statusCode === 410) {
                try { await db.execute('DELETE FROM subscriptions WHERE endpoint = ?', [sub.endpoint]); } catch (delErr) { console.warn('Erro ao deletar subscription inválida', delErr.message); }
              }
            }
          }
        } else {
          // agendar
          const DEFAULT_NOTIFICATION_TIME = process.env.DEFAULT_EVENT_NOTIFICATION_TIME || '09:00:00';
          const containsTime = (s) => { if (!s) return false; return /T|\s+\d{2}:\d{2}|:\d{2}/.test(String(s)); };
          let scheduledAt = null;
          if (scheduledNotificationDatetime) scheduledAt = String(scheduledNotificationDatetime).replace('T',' ');
          else if (event_datetime && containsTime(event_datetime)) scheduledAt = event_datetime.replace('T',' ');
          else scheduledAt = new Date().toISOString().slice(0,19).replace('T',' ');
          try {
            await db.execute('INSERT INTO scheduled_notifications (event_id, payload, scheduled_at) VALUES (?, ?, ?)', [eventId, payload, scheduledAt]);
          } catch (err) { console.error('[updateEvento] Erro ao agendar notificação:', err.message); }
        }
      } catch (err) {
        console.error('[updateEvento] Erro ao processar notificações:', err.message || err);
      }
    }

    res.json({ message: 'Evento atualizado com sucesso' });
  } catch (err) {
    console.error('updateEvento error', err);
    res.status(500).json({ message: 'Erro ao atualizar evento', error: err.message });
  }
};

// Deletar evento (apenas criador ou admin)
const deleteEvento = async (req, res) => {
  const eventId = req.params.id;
  const userId = req.user?.userId;
  try {
    const [rows] = await db.execute('SELECT user_id FROM events WHERE id = ?', [eventId]);
    if (!rows.length) return res.status(404).json({ message: 'Evento não encontrado' });
    const ownerId = rows[0].user_id;
  const isAdmin = Boolean(req.user?.permissions && (req.user.permissions.canViewAllEvents || req.user.permissions.can_create_user || req.user.permissions.canCreateUser)) ||
                  req.user?.userTypeId === 1 || String(req.user?.userType).toLowerCase() === 'admin';
    if (Number(ownerId) !== Number(userId) && !isAdmin) {
      return res.status(403).json({ message: 'Apenas o criador ou administrador pode deletar este evento' });
    }

    await db.execute('DELETE FROM event_groups WHERE event_id = ?', [eventId]);
    await db.execute('DELETE FROM events WHERE id = ?', [eventId]);
    res.json({ message: 'Evento removido' });
  } catch (err) {
    console.error('deleteEvento error', err);
    res.status(500).json({ message: 'Erro ao deletar evento', error: err.message });
  }
};
module.exports = {
  addEvento,
  getEventos,
  updateEvento,
  deleteEvento
};
