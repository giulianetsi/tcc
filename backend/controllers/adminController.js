const db = require('../db');

// Listar permissões por tipo de usuário
const listPermissions = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT ut.id as user_type_id, ut.name as user_type, p.can_create_event, p.can_view_all_events, p.can_receive_notifications, p.can_create_user
      FROM user_types ut
      LEFT JOIN permissions p ON ut.id = p.user_type_id
      ORDER BY ut.id
    `);
    res.status(200).json(rows);
  } catch (error) {
    // Log de erro e resposta 500
    console.error('Erro listPermissions:', error.message);
    res.status(500).json({ message: 'Erro ao listar permissões' });
  }
};

// Atualizar (ou inserir) permissões para um dado user_type_id
// Recebe flags no body como canCreateEvent, canViewAllEvents, canReceiveNotifications, canCreateUser
const updatePermissions = async (req, res) => {
  const { user_type_id } = req.params;
  const { canCreateEvent, canViewAllEvents, canReceiveNotifications, canCreateUser } = req.body;

  try {
    const [existing] = await db.execute('SELECT * FROM permissions WHERE user_type_id = ?', [user_type_id]);
    const newValues = {
      can_create_event: canCreateEvent ? 1 : 0,
      can_view_all_events: canViewAllEvents ? 1 : 0,
      can_receive_notifications: canReceiveNotifications ? 1 : 0,
      can_create_user: canCreateUser ? 1 : 0
    };

    if (existing.length > 0) {
      const before = existing[0];
      const changes = {};
      for (const k of Object.keys(newValues)) {
        if (before[k] !== newValues[k]) changes[k] = { before: before[k], after: newValues[k] };
      }

      await db.execute(
        `UPDATE permissions SET can_create_event = ?, can_view_all_events = ?, can_receive_notifications = ?, can_create_user = ? WHERE user_type_id = ?`,
        [newValues.can_create_event, newValues.can_view_all_events, newValues.can_receive_notifications, newValues.can_create_user, user_type_id]
      );

      // Logar mudanças para auditoria simples
      if (Object.keys(changes).length > 0) {
        console.log('Permissions changed for user_type_id', user_type_id, changes);
      }
    } else {
      await db.execute(
        `INSERT INTO permissions (user_type_id, can_create_event, can_view_all_events, can_receive_notifications, can_create_user) VALUES (?, ?, ?, ?, ?)` ,
        [user_type_id, newValues.can_create_event, newValues.can_view_all_events, newValues.can_receive_notifications, newValues.can_create_user]
      );
    }

    // Retornar sucesso ao cliente
    res.status(200).json({ message: 'Permissões atualizadas' });
  } catch (error) {
    // Retornar rro ao atualizar permissões
    console.error('Erro updatePermissions:', error.message);
    res.status(500).json({ message: 'Erro ao atualizar permissões' });
  }
};

// Listar notificações agendadas pendentes (não enviadas)
// Útil para debug (mostra payload e horário agendado)
const listScheduledNotifications = async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, event_id, payload, scheduled_at, sent FROM scheduled_notifications WHERE sent = 0 ORDER BY scheduled_at ASC LIMIT 200'
    );
    res.status(200).json(rows);
  } catch (error) {
    // Log e resposta de erro
    console.error('Erro listScheduledNotifications:', error && error.message);
    res.status(500).json({ message: 'Erro ao listar agendamentos' });
  }
};


module.exports = {
  listPermissions,
  updatePermissions
  , listScheduledNotifications
};
