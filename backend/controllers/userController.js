const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const webpush = require('web-push');

const publicVapidKey = "BIDByJJTac6ThaHCPJVS1pszWZVVqvCyCfbL68BEogxfT9MO8Swu5ouZtambPZDgo-cEOMejCAvoViWn6zpX8ig";
const privateVapidKey = "EsSOzOUAX0JjKed_8hP7P43S7MmGa1Nv4TSA7YzO8YA";

webpush.setVapidDetails('mailto:giulianerodrigues.ch297@academico.ifsul.edu.br', publicVapidKey, privateVapidKey);

const subscribe = async (req, res) => {
  const { endpoint, keys, usuario_id } = req.body;
  const { p256dh, auth } = keys;

  try {
    await db.execute('INSERT INTO subscriptions (endpoint, keys_p256dh, keys_auth, usuario_id) VALUES (?, ?, ?, ?)', [endpoint, p256dh, auth, usuario_id]);
    res.status(201).json({ message: 'Subscribed successfully' });
  } catch (error) {
    console.error('Error saving subscription:', error.message);
    res.status(500).json({ message: 'Failed to subscribe', error: error.message });
  }
};

const sendPushNotification = async (subscription, payload) => {
  try {
    const response = await webpush.sendNotification(subscription, payload);
    console.log('Notificação push enviada com sucesso:', response);
  } catch (error) {
    console.error('Erro ao enviar notificação push:', error);
    if (error.statusCode === 410) {
      await removeInvalidSubscription(subscription);
    }
  }
};

const removeInvalidSubscription = async (subscription) => {
  try {
    const [subscriptions] = await db.execute('SELECT * FROM subscriptions');
    for (const sub of subscriptions) {
      const subscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys_p256dh,
          auth: sub.keys_auth
        }
      };

      try {
        await webpush.sendNotification(subscription, 'Teste');
      } catch (error) {
        if (error.statusCode === 410) {
          await db.execute('DELETE FROM subscriptions WHERE endpoint = ?', [sub.endpoint]);
          console.log('Subscriptions inválidas removidas');
        }
      }
    }
  } catch (error) {
    console.error('Erro ao remover subscriptions erradas:', error.message);
  }
};

const registerUser = async (req, res) => {
  const { nome, sobrenome, email, telefone, dataNascimento, senha, cpf, tipo, matricula, turma, cursos, parentesco, cpfAluno } = req.body;
  
  const hashedPassword = await bcrypt.hash(senha, 10);
  const baseLogin = `${nome.toLowerCase()}.${sobrenome.toLowerCase()}`;
  let login = baseLogin;

  try {
    // Ver se email, cpf ou matricula já existem
    let [existingUsers] = await db.execute('SELECT * FROM usuarios WHERE email = ? OR cpf = ?', [email, cpf]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'Email ou CPF já cadastrado(s)' });
    }
    if (tipo === 'aluno') {
      let [existingAluno] = await db.execute('SELECT * FROM alunos WHERE matricula = ?', [matricula]);
      if (existingAluno.length > 0) {
        return res.status(400).json({ message: 'Matricula já cadastrada' });
      }
    }

    // Ver se login já existe
    let [rows] = await db.execute('SELECT login FROM usuarios WHERE login LIKE ?', [`${baseLogin}%`]);
    if (rows.length > 0) {
      const logins = rows.map(row => row.login);
      let count = 1;
      while (logins.includes(login)) {
        login = `${baseLogin}.${count}`;
        count++;
      }
    }

    let query = 'INSERT INTO usuarios (nome, sobrenome, email, telefone, dataNascimento, login, senha, cpf, tipo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
    let params = [nome, sobrenome, email, telefone, dataNascimento, login, hashedPassword, cpf, tipo];

    const [result] = await db.execute(query, params);
    const userId = result.insertId;

    if (tipo === 'aluno') {
      await db.execute('INSERT INTO alunos (aluno_id, turma, matricula) VALUES (?, ?, ?)', [userId, turma, matricula]);
    } else if (tipo === 'professor') {
      await db.execute('INSERT INTO professores (professor_id, cursos) VALUES (?, ?)', [userId, cursos]);
    } else if (tipo === 'responsavel') {
      const [aluno] = await db.execute('SELECT id FROM usuarios WHERE cpf = ?', [cpfAluno]);
      if (aluno.length > 0) {
        const alunoId = aluno[0].id;
        await db.execute('INSERT INTO responsaveis (responsavel_id, parentesco, aluno_resp_id) VALUES (?, ?, ?)', [userId, parentesco, alunoId]);
      } else {
        return res.status(400).json({ message: 'Aluno não encontrado' });
      }
    }

    // Enviar notificação push para todos os inscritos
    const [subscriptions] = await db.execute('SELECT * FROM subscriptions');
    const payload = JSON.stringify({ title: 'Novo usuário cadastrado', body: `O usuário ${nome} foi cadastrado` });

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

    res.status(201).json({ message: 'Usuário registrado com sucesso', login });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao registrar usuário', error });
  }
};

const loginUser = async (req, res) => {
  const { login, senha } = req.body;

  try {
    const [user] = await db.execute('SELECT * FROM usuarios WHERE login = ? OR cpf = ?', [login, login]);

    if (user.length === 0) {
      return res.status(401).json({ message: 'Usuário não encontrado' });
    }

    const isPasswordValid = await bcrypt.compare(senha, user[0].senha);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Senha inválida' });
    }

    const token = jwt.sign({ userId: user[0].id }, 'your_jwt_secret', { expiresIn: '1h' });

    res.cookie('token', token, { httpOnly: true, secure: false });

    res.status(200).json({
      message: 'Login bem-sucedido',
      usuario_id: user[0].id  
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao fazer login', error });
  }
};

module.exports = {
  registerUser,
  loginUser,
  subscribe
};
