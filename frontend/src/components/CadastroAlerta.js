// src/components/CadastroAlerta.js
import React from 'react';

const CadastroAlerta = () => {
  return (
    <div className="container">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <h1 className="text-center my-4">Adicionar Alerta</h1>
          <form action="/add-alerta" method="post">
            <div className="form-group">
              <label htmlFor="message">Mensagem</label>
              <input type="text" id="message" name="message" className="form-control" required />
            </div>
            <div className="form-group">
              <label htmlFor="type">Tipo</label>
              <input type="text" id="type" name="type" className="form-control" required />
            </div>
            <button type="submit" className="btn btn-primary btn-block">Adicionar Alerta</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CadastroAlerta;
