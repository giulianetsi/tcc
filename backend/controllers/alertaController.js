const db = require('../db');

const addAlerta = async (req, res) => {
  const { titulo, descricao, tipo, usuario_id, publico, data_horario_evento, local_evento } = req.body;

  try {
    await db.execute('INSERT INTO notificacoes (titulo, descricao, tipo, usuario_id, publico, data_horario_evento, local_evento) VALUES (?, ?, ?, ?, ?, ?, ?)', 
      [titulo, descricao, tipo, usuario_id, publico, data_horario_evento, local_evento]);
    res.status(201).json({ message: 'Alerta criado com sucesso' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar alerta', error });
  }
};

const getAlertas = async (req, res) => {
  try {
    const [alertas] = await db.execute('SELECT * FROM notificacoes');
    res.status(200).json(alertas);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar alertas', error });
  }
};

module.exports = {
  addAlerta,
  getAlertas
};
