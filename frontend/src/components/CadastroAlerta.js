import React, { useState } from 'react';
import axios from 'axios';

const CadastroAlerta = () => {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState('');
  const [publico, setPublico] = useState('');
  const [dataHorarioEvento, setDataHorarioEvento] = useState('');
  const [localEvento, setLocalEvento] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post('http://localhost:5000/add-alerta', {
        titulo,
        descricao,
        tipo,
        publico,
        data_horario_evento: dataHorarioEvento,
        local_evento: localEvento,
      });

      setMessage(response.data.message);
      // Limpar o formulário após o sucesso
      setTitulo('');
      setDescricao('');
      setTipo('');
      setPublico('');
      setDataHorarioEvento('');
      setLocalEvento('');
    } catch (error) {
      setMessage('Erro ao adicionar alerta');
    }
  };

  return (
    <div className="container">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <h1 className="text-center my-4">Adicionar Alerta</h1>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="titulo">Título</label>
              <input
                type="text"
                id="titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="form-control"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="descricao">Descrição</label>
              <input
                type="text"
                id="descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="form-control"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="tipo">Tipo</label>
              <input
                type="text"
                id="tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="form-control"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="publico">Público</label>
              <input
                type="text"
                id="publico"
                value={publico}
                onChange={(e) => setPublico(e.target.value)}
                className="form-control"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="dataHorarioEvento">Data e Horário do Evento</label>
              <input
                type="datetime-local"
                id="dataHorarioEvento"
                value={dataHorarioEvento}
                onChange={(e) => setDataHorarioEvento(e.target.value)}
                className="form-control"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="localEvento">Local do Evento</label>
              <input
                type="text"
                id="localEvento"
                value={localEvento}
                onChange={(e) => setLocalEvento(e.target.value)}
                className="form-control"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block">Adicionar Alerta</button>
          </form>
          {message && <p className="mt-3 text-center">{message}</p>}
        </div>
      </div>
    </div>
  );
};

export default CadastroAlerta;
