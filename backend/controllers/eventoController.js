const db = require('../db');

const addEvento = async (req, res) => {
  const { titulo, descricao, tipo, usuario_id, publico, data_horario_evento, local_evento } = req.body;

  // LOGS
  console.log('Payload recebido:', {
    titulo,
    descricao,
    tipo,
    usuario_id,
    publico,
    data_horario_evento,
    local_evento
  });

  if (!usuario_id) {
    return res.status(400).json({ message: 'Usuário não autenticado ou ID do usuário não fornecido' });
  }

  const evento = {
    titulo: titulo || null,
    descricao: descricao || null,
    tipo: tipo || null,
    usuario_id: usuario_id,
    publico: publico || null,
    data_horario_evento: data_horario_evento || null,
    local_evento: local_evento || null
  };

  try {
    await db.execute(
      'INSERT INTO eventos (titulo, descricao, tipo, usuario_id, publico, data_horario_evento, local_evento) VALUES (?, ?, ?, ?, ?, ?, ?)', 
      [evento.titulo, evento.descricao, evento.tipo, evento.usuario_id, evento.publico, evento.data_horario_evento, evento.local_evento]
    );
    res.status(201).json({ message: 'Alerta criado com sucesso' });
  } catch (error) {
    console.error('Erro ao executar SQL:', error);
    res.status(500).json({ message: 'Erro ao criar alerta', error });
  }
};

const getEventos = async (req, res) => {
  try {
    const [alertas] = await db.execute('SELECT * FROM eventos');
    res.status(200).json(alertas);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar eventos', error });
  }
};

module.exports = {
  addEvento,
  getEventos
};
