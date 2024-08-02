const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const registerUser = async (req, res) => {
    const { nome, sobrenome, email, telefone, dataNascimento, senha, cpf, tipo, matricula, turma, cursos, parentesco, cpfAluno } = req.body;
  
    const hashedPassword = await bcrypt.hash(senha, 10);
    const baseLogin = `${nome.toLowerCase()}.${sobrenome.toLowerCase()}`;
    let login = baseLogin;
  
    try {
      // Ver se email, cpf ou matricula ja existem
      let [existingUsers] = await db.execute('SELECT * FROM usuarios WHERE email = ? OR cpf = ?', [email, cpf]);
      if (existingUsers.length > 0) {
        return res.status(400).json({ message: 'Email ou CPF já cadastrado(s)' });
      }
      if(tipo == 'aluno'){
        let [existingAluno] = await db.execute('SELECT * FROM alunos WHERE matricula = ?', [matricula]);
        if (existingAluno.length > 0) {
            return res.status(400).json({ message: 'Matricula já cadastrada' });
          }
        }
  
      // Ver se login ja existe
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

    res.status(200).json({ message: 'Login bem-sucedido' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao fazer login', error });
  }
};

const getDashboard = async (req, res) => {
  try {
    const [alertas] = await db.execute('SELECT * FROM notificacoes');
    res.status(200).json(alertas);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar alertas', error });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getDashboard
};
