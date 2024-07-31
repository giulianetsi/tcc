const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcrypt');
const pool = require('./db'); 

const app = express();
const port = 5000;

app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(bodyParser.json());

app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }, 
}));

// Rota de login
app.post('/login', async (req, res) => {
  const { login, senha } = req.body;

  try {
    const [rows] = await pool.query('SELECT * FROM usuarios WHERE login = ?', [login]);
    if (rows.length > 0) {
      const user = rows[0];
      const isMatch = await bcrypt.compare(senha, user.senha);
      if (isMatch) {
        req.session.userId = user.id;
        res.json({ message: 'Login bem-sucedido' });
      } else {
        res.status(401).json({ message: 'Senha incorreta' });
      }
    } else {
      res.status(404).json({ message: 'Usuário não encontrado' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

//Rota de incluir alerta
app.post('/add-alerta', async (req, res) => {
  const { titulo, descricao, tipo, publico, data_horario_evento, local_evento } = req.body;

  // Obtém a data e hora atuais
  const dataCriacao = new Date().toISOString().slice(0, 19).replace('T', ' ');

  try {
    const [result] = await pool.execute(
      `INSERT INTO alertas (titulo, descricao, tipo, publico, data_criacao, data_horario_evento, local_evento) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [titulo, descricao, tipo, publico, dataCriacao, data_horario_evento, local_evento]
    );
    res.json({ message: 'Alerta adicionado com sucesso!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao adicionar alerta' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
