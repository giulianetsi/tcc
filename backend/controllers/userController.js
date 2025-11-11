const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const webpush = require('web-push');

// Registrar subscription do navegador (salvar endpoint + chaves no DB)
const subscribe = async (req, res) => {
  const { endpoint, keys, user_id } = req.body;
  const { p256dh, auth } = keys;

  try {
    await db.execute('INSERT INTO subscriptions (endpoint, keys_p256dh, keys_auth, user_id) VALUES (?, ?, ?, ?)', [endpoint, p256dh, auth, user_id]);
    res.status(201).json({ message: 'Subscribed successfully' });
  } catch (error) {
    // Log de erro e resposta ao cliente
    console.error('Error saving subscription:', error.message);
    res.status(500).json({ message: 'Failed to subscribe', error: error.message });
  }
};

// Remover subscription pelo endpoint (usado no logout ou quando o cliente cancela)
const unsubscribe = async (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) return res.status(400).json({ message: 'endpoint requerido' });

  try {
    const [result] = await db.execute('DELETE FROM subscriptions WHERE endpoint = ?', [endpoint]);
    return res.status(200).json({ message: 'Unsubscribed successfully' });
  } catch (error) {
    console.error('Erro ao remover subscription:', error.message);
    return res.status(500).json({ message: 'Failed to unsubscribe', error: error.message });
  }
};

// Envio seguro de push para uma subscription (tratamento de erros comum)
// Recebe um objeto `subscription` no formato { endpoint, keys: { p256dh, auth } }
// e um payload (string) já serializado.
const sendPushNotification = async (subscription, payload) => {
  try {
    const response = await webpush.sendNotification(subscription, payload);
    console.log('Notificação push enviada com sucesso:', response);
  } catch (error) {
    console.error('Erro ao enviar notificação push:', error);
    // Se endpoint expirou (410), remover do DB
    if (error.statusCode === 410) {
      await removeInvalidSubscription(subscription);
    }
  }
};

// Percorre subscriptions e tenta enviar uma mensagem de teste; remove as inválidas (410).
// Observação: percorre TODAS as subscriptions e pode ser custoso — rodar em manutenção/cron.
const removeInvalidSubscription = async (subscription) => {
  try {
    const [subscriptions] = await db.execute('SELECT * FROM subscriptions');
    for (const sub of subscriptions) {
      const subSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys_p256dh,
          auth: sub.keys_auth
        }
      };

      try {
        await webpush.sendNotification(subSubscription, 'Teste');
      } catch (error) {
        if (error.statusCode === 410) {
          await db.execute('DELETE FROM subscriptions WHERE endpoint = ?', [sub.endpoint]);
          console.log('Subscription inválida removida:', sub.endpoint);
        }
      }
    }
  } catch (error) {
    console.error('Erro ao remover subscriptions erradas:', error.message);
  }
};

// Versão similar com filtro por endpoint HTTP; utilizada como health-check/limpeza periódica
const removeInvalidSubscriptions = async () => {
  try {
    const [subscriptions] = await db.execute("SELECT * FROM subscriptions WHERE endpoint LIKE 'http%'");
    for (const sub of subscriptions) {
      const subSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys_p256dh,
          auth: sub.keys_auth
        }
      };

      try {
        await webpush.sendNotification(subSubscription, 'health-check');
      } catch (error) {
        if (error.statusCode === 410) {
          await db.execute('DELETE FROM subscriptions WHERE endpoint = ?', [sub.endpoint]);
          console.log('Subscription inválida removida:', sub.endpoint);
        }
      }
    }
  } catch (error) {
    console.error('Erro ao remover subscriptions inválidas:', error.message);
  }
};

module.exports.removeInvalidSubscriptions = removeInvalidSubscriptions;

// Obter perfil do usuário autenticado
const getProfile = async (req, res) => {
  try {
    const userId = req.user && req.user.userId;
    if (!userId) return res.status(401).json({ message: 'Usuário não autenticado' });
    const [rows] = await db.execute('SELECT id, first_name, last_name, email, phone FROM users WHERE id = ?', [userId]);
    if (!rows || rows.length === 0) return res.status(404).json({ message: 'Perfil não encontrado' });
    return res.status(200).json(rows[0]);
  } catch (err) {
    console.error('Erro em getProfile:', err && err.message);
    return res.status(500).json({ message: 'Erro ao buscar perfil', error: err && err.message });
  }
};

// Atualizar perfil do usuário autenticado
const updateProfile = async (req, res) => {
  try {
    const userId = req.user && req.user.userId;
    if (!userId) return res.status(401).json({ message: 'Usuário não autenticado' });
    const { first_name, last_name, email, phone } = req.body;
    await db.execute('UPDATE users SET first_name = ?, last_name = ?, email = ?, phone = ? WHERE id = ?', [first_name, last_name, email, phone, userId]);
    const [rows] = await db.execute('SELECT id, first_name, last_name, email, phone FROM users WHERE id = ?', [userId]);
    return res.status(200).json(rows[0]);
  } catch (err) {
    console.error('Erro em updateProfile:', err && err.message);
    return res.status(500).json({ message: 'Erro ao atualizar perfil', error: err && err.message });
  }
};

// Alterar senha do usuário autenticado
const changePassword = async (req, res) => {
  try {
    const userId = req.user && req.user.userId;
    if (!userId) return res.status(401).json({ message: 'Usuário não autenticado' });
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Senha atual e nova senha são obrigatórias' });
    const [rows] = await db.execute('SELECT password FROM users WHERE id = ?', [userId]);
    if (!rows || rows.length === 0) return res.status(404).json({ message: 'Usuário não encontrado' });
    const valid = await bcrypt.compare(currentPassword, rows[0].password);
    if (!valid) return res.status(403).json({ message: 'Senha atual incorreta' });
    const hashed = await bcrypt.hash(newPassword, 10);
    await db.execute('UPDATE users SET password = ? WHERE id = ?', [hashed, userId]);
    return res.status(200).json({ message: 'Senha atualizada' });
  } catch (err) {
    console.error('Erro em changePassword:', err && err.message);
    return res.status(500).json({ message: 'Erro ao alterar senha', error: err && err.message });
  }
};

module.exports.getProfile = getProfile;
module.exports.updateProfile = updateProfile;
module.exports.changePassword = changePassword;

const registerUser = async (req, res) => {
  const { nome: first_name, sobrenome: last_name, email, telefone: phone, dataNascimento: birth_date, senha: password, cpf, tipo: userType, matricula: registration_number, turma: className, cursos: courses, parentesco: relationship, cpfAluno: student_cpf, selectedGroups } = req.body;
  
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    // Ver se email, cpf ou matricula já existem
    let [existingUsers] = await db.execute('SELECT * FROM users WHERE email = ? OR cpf = ?', [email, cpf]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'Email ou CPF já cadastrado(s)' });
    }
    
    if (userType === 'aluno') {
      let [existingStudent] = await db.execute('SELECT * FROM students WHERE registration_number = ?', [registration_number]);
      if (existingStudent.length > 0) {
        return res.status(400).json({ message: 'Matricula já cadastrada' });
      }
    }

    // Determinar user_type_id: preferir lookup no DB (tolerante a nomes em PT/EN), com fallback a um mapa conhecido
    let user_type_id = null;
    try {
      const normalized = (userType || '').toString().toLowerCase();
      // Tentar buscar pelo nome exato na tabela user_types
      const [rows] = await db.execute('SELECT id FROM user_types WHERE LOWER(name) = ? LIMIT 1', [normalized]);
      if (rows && rows.length > 0) {
        user_type_id = rows[0].id;
      }
    } catch (err) {
      console.warn('Erro ao buscar user_type no banco:', err && err.message);
    }

    // Fallback para nomes comuns / mapeamento legacy (se a tabela user_types não estiver populada)
    if (!user_type_id) {
      const fallbackMap = {
        'aluno': 3, 
        'student': 3,
        'professor': 2,
        'teacher': 2,
        'responsavel': 4,
        'guardian': 4,
        'admin': 1
      };
      const key = (userType || '').toString().toLowerCase();
      user_type_id = fallbackMap[key];
    }

    if (!user_type_id) {
      return res.status(400).json({ message: 'Tipo de usuário inválido' });
    }

    let query = 'INSERT INTO users (first_name, last_name, email, phone, birth_date, password, cpf, user_type_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    let params = [first_name, last_name, email, phone, birth_date, hashedPassword, cpf, user_type_id];

    const [result] = await db.execute(query, params);
    const userId = result.insertId;

    // Se o criador (admin) enviou selectedGroups, associar o usuário aos grupos
    if (selectedGroups && Array.isArray(selectedGroups) && selectedGroups.length > 0) {
      try {
        for (const gid of selectedGroups) {
          await db.execute('INSERT INTO user_groups (user_id, group_id) VALUES (?, ?)', [userId, gid]);
        }
      } catch (err) {
        console.warn('Erro ao inserir user_groups (não crítico):', err.message);
      }
    }

    if (userType === 'aluno') {
      await db.execute('INSERT INTO students (student_id, class, registration_number) VALUES (?, ?, ?)', [userId, className, registration_number]);
    } else if (userType === 'professor') {
      await db.execute('INSERT INTO teachers (teacher_id, courses) VALUES (?, ?)', [userId, courses]);
    } else if (userType === 'responsavel') {
      const [student] = await db.execute('SELECT id FROM users WHERE cpf = ?', [student_cpf]);
      if (student.length > 0) {
        const studentId = student[0].id;
        await db.execute('INSERT INTO guardians (guardian_id, relationship, student_id) VALUES (?, ?, ?)', [userId, relationship, studentId]);
      } else {
        return res.status(400).json({ message: 'Aluno não encontrado' });
      }
    }

  // Enviar notificação push para todos os inscritos (endpoints válidos que começam com http)
  const [subscriptions] = await db.execute("SELECT * FROM subscriptions WHERE endpoint LIKE 'http%'");
    const payload = JSON.stringify({ title: 'Novo usuário cadastrado', body: `O usuário ${first_name} foi cadastrado` });

    subscriptions.forEach(async (sub) => {
      const subscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys_p256dh,
          auth: sub.keys_auth
        }
      };
      await sendPushNotification(subscription, payload);
    });

    res.status(201).json({ message: 'Usuário registrado com sucesso' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao registrar usuário', error });
  }
};

const loginUser = async (req, res) => {
  const { login, senha } = req.body;

  if (!senha) {
    return res.status(400).json({ message: 'Senha não fornecida' });
  }

  try {
    // Buscar usuário por CPF ou email
    const [user] = await db.execute(`
      SELECT u.id, u.first_name, u.last_name, u.password, ut.id as user_type_id, ut.name as user_type, p.can_create_event, p.can_view_all_events, p.can_receive_notifications, p.can_create_user 
      FROM users u 
      JOIN user_types ut ON u.user_type_id = ut.id
      JOIN permissions p ON ut.id = p.user_type_id
      WHERE u.cpf = ? OR u.email = ?
    `, [login, login]);

    if (user.length === 0) {
      return res.status(401).json({ message: 'Usuário não encontrado' });
    }

    // Validar senha
    const isPasswordValid = await bcrypt.compare(senha, user[0].password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Senha inválida' });
    }

    // Normalize permissions to booleans
  const canCreateEvent = Boolean(user[0].can_create_event);
  const canViewAllEvents = Boolean(user[0].can_view_all_events);
  const canReceiveNotifications = Boolean(user[0].can_receive_notifications);
  const canCreateUser = Boolean(user[0].can_create_user);

    const tokenPayload = {
      userId: user[0].id,
      userTypeId: user[0].user_type_id,
      userType: user[0].user_type,
      permissions: {
        canCreateEvent,
        canViewAllEvents,
        canReceiveNotifications,
        canCreateUser
      }
    };

    // Usar variável de ambiente JWT_SECRET em produção
    const jwtSecret = process.env.JWT_SECRET || 'your_jwt_secret';
    const token = jwt.sign(tokenPayload, jwtSecret, { expiresIn: '1h' });

    // Definir cookie com opções seguras; manter token no corpo da resposta por compatibilidade retroativa
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 1000 // 1 hour
    };

    res.cookie('token', token, cookieOptions);
    res.status(200).json({
      message: 'Login bem-sucedido',
      user_id: user[0].id,
      user_type_id: user[0].user_type_id,
      user_type: user[0].user_type,
      user_first_name: user[0].first_name,
      user_last_name: user[0].last_name,
      permissions: {
        canCreateEvent,
        canViewAllEvents,
        canReceiveNotifications,
        canCreateUser
      },
      token // Mantido por compatibilidade; recomenda-se usar cookie httpOnly em produção
    });
  } catch (error) {
    console.error('Erro ao fazer login:', error); // Adiciona log detalhado do erro
    res.status(500).json({ message: 'Erro ao fazer login', error: error.message });
  }
};

const logoutUser = (req, res) => {
  res.clearCookie('token');
  res.status(200).json({ message: 'Logout bem-sucedido' });
};
// Registrar decisão do usuário sobre notificações (granted/denied/default)
const notificationDecision = async (req, res) => {
  const { user_id, decision } = req.body; // decision: 'granted' | 'denied' | 'default'

  if (!user_id || !decision) return res.status(400).json({ message: 'user_id e decision requeridos' });

  try {
    // Inserir ou atualizar um registro especial na tabela subscriptions para guardar a decisão
    const decisionKey = `decision:${user_id}`;

    // Verificar se já existe
    const [existing] = await db.execute('SELECT * FROM subscriptions WHERE endpoint = ?', [decisionKey]);
    if (existing.length > 0) {
      await db.execute('UPDATE subscriptions SET keys_p256dh = ?, keys_auth = ? WHERE endpoint = ?', [decision, decision, decisionKey]);
    } else {
      // Inserir placeholders para campos obrigatórios
      await db.execute('INSERT INTO subscriptions (endpoint, keys_p256dh, keys_auth, user_id) VALUES (?, ?, ?, ?)', [decisionKey, decision, decision, user_id]);
    }

    res.status(200).json({ message: 'Decisão de notificação registrada' });
  } catch (error) {
    console.error('Erro ao registrar decisão:', error.message);
    res.status(500).json({ message: 'Erro ao registrar decisão', error: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  subscribe,
  unsubscribe,
  getProfile,
  updateProfile,
  changePassword,
  notificationDecision,
  removeInvalidSubscriptions
};