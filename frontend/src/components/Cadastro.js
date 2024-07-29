import React, { useState } from 'react';

const Cadastro = () => {
  const [tipo, setTipo] = useState('');

  const handleTipoChange = (event) => {
    setTipo(event.target.value);
  };

  return (
    <div className="container">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <h1 className="text-center my-4">Registrar Usuário</h1>
          <form action="/register-user" method="post">
            <div className="form-group">
              <label htmlFor="nome">Nome</label>
              <input type="text" id="nome" name="nome" className="form-control" required />
            </div>
            <div className="form-group">
              <label htmlFor="sobrenome">Sobrenome</label>
              <input type="text" id="sobrenome" name="sobrenome" className="form-control" required />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input type="email" id="email" name="email" className="form-control" required />
            </div>
            <div className="form-group">
              <label htmlFor="telefone">Telefone</label>
              <input type="tel" id="telefone" name="telefone" className="form-control" />
            </div>
            <div className="form-group">
              <label htmlFor="dataNascimento">Data de Nascimento</label>
              <input type="date" id="dataNascimento" name="dataNascimento" className="form-control" />
            </div>
            <div className="form-group">
              <label htmlFor="senha">Senha</label>
              <input type="password" id="senha" name="senha" className="form-control" required />
            </div>
            <div className="form-group">
              <label htmlFor="cpf">CPF</label>
              <input type="text" id="cpf" name="cpf" className="form-control" required />
            </div>
            <div className="form-group">
              <label htmlFor="tipo">Tipo</label>
              <select id="tipo" name="tipo" className="form-control" required onChange={handleTipoChange}>
                <option value="">Selecione</option>
                <option value="aluno">Aluno</option>
                <option value="professor">Professor</option>
                <option value="responsavel">Responsável</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            {tipo === 'aluno' && (
              <div id="alunoFields">
                <div className="form-group">
                  <label htmlFor="matricula">Matrícula</label>
                  <input type="text" id="matricula" name="matricula" className="form-control" />
                </div>
                <div className="form-group">
                  <label htmlFor="turma">Turma</label>
                  <input type="text" id="turma" name="turma" className="form-control" />
                </div>
              </div>
            )}
            {tipo === 'professor' && (
              <div id="professorFields">
                <div className="form-group">
                  <label htmlFor="cursos">Cursos</label>
                  <input type="text" id="cursos" name="cursos" className="form-control" />
                </div>
              </div>
            )}
            {tipo === 'responsavel' && (
              <div id="responsavelFields">
                <div className="form-group">
                  <label htmlFor="parentesco">Parentesco</label>
                  <input type="text" id="parentesco" name="parentesco" className="form-control" />
                </div>
                <div className="form-group">
                  <label htmlFor="cpfAluno">CPF do Aluno</label>
                  <input type="text" id="cpfAluno" name="cpfAluno" className="form-control" />
                </div>
              </div>
            )}
            <button type="submit" className="btn btn-primary btn-block mt-4">Registrar Usuário</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Cadastro;
