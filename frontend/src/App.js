import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import Cadastro from './components/Cadastro';
import CadastroAlerta from './components/CadastroAlerta';
import Dashboard from './components/Dashboard';
import './App.css';

const publicVapidKey = "BIDByJJTac6ThaHCPJVS1pszWZVVqvCyCfbL68BEogxfT9MO8Swu5ouZtambPZDgo-cEOMejCAvoViWn6zpX8ig";

async function subscribeUser() {
  if ('serviceWorker' in navigator) {
    try {
      const register = await navigator.serviceWorker.ready; // Use navigator.serviceWorker.ready para garantir que o service worker esteja pronto
      const subscription = await register.pushManager.getSubscription() || await register.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
      });

      // ver se a inscrição já está no servidor
      await fetch('/api/subscribe', {
        method: 'POST',
        body: JSON.stringify(subscription),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('Subscription enviada ao servidor com sucesso');
    } catch (error) {
      console.error('Erro:', error);
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
            console.log('Service Worker registered with scope:', registration.scope);
            subscribeUser();
          }).catch(error => {
            console.error('Service Worker registration failed:', error);
          });
        } catch (error) {
          console.error('Error during Service Worker registration:', error);
        }
      });
    }
  }, []);

  const alertas = [
    { id: 1, titulo: 'Alerta 1', texto: 'Texto do alerta 1', data: '2024-07-16', hora: '14:00', local: 'Sala 1', cor: 'red', icone: 'aviso' },
    { id: 2, titulo: 'Alerta 2', texto: 'Texto do alerta 2', data: '2024-07-17', hora: '10:00', local: 'Sala 2', cor: 'blue', icone: 'evento' },
    { id: 3, titulo: 'Alerta 3', texto: 'Texto do alerta 3', data: '2024-07-18', hora: '08:00', local: 'Sala 3', cor: 'green', icone: 'reuniao' },
  ];
  
  const username = 'João Silva';
  const isAdmin = true;

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register-user" element={<Cadastro />} />
          <Route path="/add-alerta" element={<CadastroAlerta />} />
          <Route path="/" element={<Dashboard username={username} alertas={alertas} isAdmin={isAdmin} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
