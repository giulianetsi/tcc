import React, { useState } from 'react';
import axios from 'axios';

const publicVapidKey = 'BIDByJJTac6ThaHCPJVS1pszWZVVqvCyCfbL68BEogxfT9MO8Swu5ouZtambPZDgo-cEOMejCAvoViWn6zpX8ig';

const Login = () => {
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [message, setMessage] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      // Enviar dados de login para o backend
      const response = await axios.post('http://localhost:5000/api/users/login', { login, senha }, { withCredentials: true });
      console.log('Login:', response.data);

      // Verificar se o token de autenticação foi retornado
      const { token, usuario_id } = response.data;
      if (!token || !usuario_id) {
        throw new Error('Token ou Usuário ID não disponível');
      }

      // Armazenar o token no localStorage ou cookie
      localStorage.setItem('authToken', token);
      localStorage.setItem('usuario_id', usuario_id);

      // Registrar o service worker e inscrever o usuário para notificações push
      if ('serviceWorker' in navigator) {
        const register = await navigator.serviceWorker.ready;
        const subscription = await register.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
        });

        const p256dh = subscription.getKey('p256dh') ? btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('p256dh')))) : null;
        const auth = subscription.getKey('auth') ? btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('auth')))) : null;

        if (p256dh && auth) {
          await axios.post('http://localhost:5000/api/users/subscribe', {
            endpoint: subscription.endpoint,
            keys: {
              p256dh,
              auth
            },
            usuario_id
          }, {
            headers: {
              'Content-Type': 'application/json'
            }
          });
        } else {
          throw new Error('Propriedades de chave da inscrição não encontradas');
        }
      }

      // Redirecionar para a página inicial após login
      window.location.href = '/';
    } catch (error) {
      console.error('Erro no login ou subscription:', error);
      if (error.response) {
        setMessage(error.response.data.message);
      } else {
        setMessage('Erro no servidor');
      }
    }
  };

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
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
