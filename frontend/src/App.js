// App.js
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import Cadastro from './components/Cadastro';
import CadastroEvento from './components/CadastroEvento';
import Dashboard from './components/Dashboard';
import './App.css';
import PrivateRoute from './components/PrivateRoute';
import { AuthProvider } from './context/AuthContext';

const publicVapidKey = "BIDByJJTac6ThaHCPJVS1pszWZVVqvCyCfbL68BEogxfT9MO8Swu5ouZtambPZDgo-cEOMejCAvoViWn6zpX8ig";

async function subscribeUser() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription() || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
      });

      await fetch('http://localhost:5000/api/subscribe', {
        method: 'POST',
        body: JSON.stringify(subscription),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('Subscription enviada ao servidor com sucesso');
    } catch (error) {
      console.error('Erro ao se inscrever:', error);
    }
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function App() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        try {
          navigator.serviceWorker.register('/service-worker.js').then((registration) => {
            console.log('Service Worker registrado com sucesso com o escopo:', registration.scope);
            subscribeUser();
          }).catch(error => {
            console.error('Falha ao registrar o Service Worker:', error);
          });
        } catch (error) {
          console.error('Erro ao registrar o Service Worker:', error);
        }
      });
    }
  }, []);

  const eventos = [
    { id: 1, titulo: 'Alerta 1', texto: 'Texto do alerta 1', data: '2024-07-16', hora: '14:00', local: 'Sala 1', tipo: 'Tipo1', icone: 'aviso' },
    { id: 2, titulo: 'Alerta 2', texto: 'Texto do alerta 2', data: '2024-07-17', hora: '10:00', local: 'Sala 2', tipo: 'Tipo2', icone: 'evento' },
    { id: 3, titulo: 'Alerta 3', texto: 'Texto do alerta 3', data: '2024-07-18', hora: '08:00', local: 'Sala 3', tipo: 'Tipo3', icone: 'reuniao' },
  ];
  
  const username = 'João Silva';
  const isAdmin = true;

  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route 
              path="/register-user" 
              element={<PrivateRoute element={<Cadastro />} />} 
            />
            <Route 
              path="/add-evento" 
              element={<PrivateRoute element={<CadastroEvento />} />} 
            />
            <Route 
              path="/" 
              element={<PrivateRoute element={<Dashboard username={username} eventos={eventos} isAdmin={isAdmin} />} />} 
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
