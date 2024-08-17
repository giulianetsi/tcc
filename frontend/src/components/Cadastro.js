import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Cadastro = () => {
  const [formData, setFormData] = useState({
    nome: '',
    sobrenome: '',
    email: '',
    telefone: '',
    dataNascimento: '',
    senha: '',
    cpf: '',
    tipo: '',
    matricula: '',
    turma: '',
    cursos: '',
    parentesco: '',
    cpfAluno: ''
  });

  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const response = await fetch('http://localhost:5000/api/users/register-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (!response.ok) {
        setSuccessMessage('');
        setErrorMessage(result.message || 'Erro desconhecido');
      } else {
        setSuccessMessage('Usuário registrado com sucesso');
        setErrorMessage('');
        // Limpar o formulário após o sucesso
        setFormData({
          nome: '',
          sobrenome: '',
          email: '',
          telefone: '',
          dataNascimento: '',
          senha: '',
          cpf: '',
          tipo: '',
          matricula: '',
          turma: '',
          cursos: '',
          parentesco: '',
          cpfAluno: ''
        });
      }
    } catch (error) {
      console.error('Erro ao registrar usuário:', error);
      setSuccessMessage('');
      setErrorMessage('Erro ao registrar usuário. Verifique o console para detalhes.');
    }
  };

  return (
    <div className="container centered-form">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <h1 className="text-center my-4">Registrar Usuário</h1>
          <form onSubmit={handleSubmit}>
            {/* Formulário aqui */}
            <div className="form-group">
              <label htmlFor="nome">Nome</label>
              <input type="text" id="nome" name="nome" className="form-control" value={formData.nome} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="sobrenome">Sobrenome</label>
              <input type="text" id="sobrenome" name="sobrenome" className="form-control" value={formData.sobrenome} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input type="email" id="email" name="email" className="form-control" value={formData.email} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="telefone">Telefone</label>
              <input type="tel" id="telefone" name="telefone" className="form-control" value={formData.telefone} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label htmlFor="dataNascimento">Data de Nascimento</label>
              <input type="date" id="dataNascimento" name="dataNascimento" className="form-control" value={formData.dataNascimento} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label htmlFor="senha">Senha</label>
              <input type="password" id="senha" name="senha" className="form-control" value={formData.senha} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="cpf">CPF</label>
              <input type="text" id="cpf" name="cpf" className="form-control" value={formData.cpf} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="tipo">Tipo</label>
              <select id="tipo" name="tipo" className="form-control" value={formData.tipo} onChange={handleChange} required>
                <option value="">Selecione</option>
                <option value="aluno">Aluno</option>
                <option value="professor">Professor</option>
                <option value="responsavel">Responsável</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            {formData.tipo === 'aluno' && (
              <div id="alunoFields">
                <div className="form-group">
                  <label htmlFor="matricula">Matrícula</label>
                  <input type="text" id="matricula" name="matricula" className="form-control" value={formData.matricula} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label htmlFor="turma">Turma</label>
                  <input type="text" id="turma" name="turma" className="form-control" value={formData.turma} onChange={handleChange} />
                </div>
              </div>
            )}
            {formData.tipo === 'professor' && (
              <div id="professorFields">
                <div className="form-group">
                  <label htmlFor="cursos">Cursos</label>
                  <input type="text" id="cursos" name="cursos" className="form-control" value={formData.cursos} onChange={handleChange} />
                </div>
              </div>
            )}
            {formData.tipo === 'responsavel' && (
              <div id="responsavelFields">
                <div className="form-group">
                  <label htmlFor="parentesco">Parentesco</label>
                  <input type="text" id="parentesco" name="parentesco" className="form-control" value={formData.parentesco} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label htmlFor="cpfAluno">CPF do Aluno</label>
                  <input type="text" id="cpfAluno" name="cpfAluno" className="form-control" value={formData.cpfAluno} onChange={handleChange} />
                </div>
              </div>
            )}
            <button type="submit" className="btn btn-primary btn-block">Registrar</button>
          </form>
          {successMessage && <p className="text-success mt-3">{successMessage}</p>}
          {errorMessage && <p className="text-danger mt-3">{errorMessage}</p>}
          <Link to="/dashboard" className="btn btn-secondary btn-block mt-4">Voltar</Link>
        </div>
      </div>
    </div>
  );
};

export default Cadastro;
