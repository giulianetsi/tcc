import React, { useState } from 'react';
import axios from 'axios';

const Login = () => {
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [message, setMessage] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post('http://localhost:5000/api/users/login', { login, senha }, { withCredentials: true });
      setMessage(response.data.message);
      if (response.data.message === 'Login bem-sucedido') {
        window.location.href = '/';
      }
    } catch (error) {
      if (error.response) {
        setMessage(error.response.data.message);
      } else {
        setMessage('Erro no servidor');
      }
    }
  };

  return (
    <div className="container centered-form">
      <div className="row justify-content-center">
        <div className="col-md-4">
          <h1 className="text-center my-4">Login</h1>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="username">Usuário</label>
              <input 
                type="text" 
                id="username" 
                name="login" 
                className="form-control" 
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                required 
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Senha</label>
              <input 
                type="password" 
                id="password" 
                name="senha" 
                className="form-control" 
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required 
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block">Entrar</button>
          </form>
          {message && <p className="mt-3 text-center">{message}</p>}
        </div>
      </div>
    </div>
  );
};

export default Login;
