import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import Cadastro from './components/Cadastro';
import CadastroAlerta from './components/CadastroAlerta';
import Dashboard from './components/Dashboard';
import './App.css';

/* permitir acessar notificacoes do usuario
da para fazer uma função para enviar notificação ao clicar em um botão

window.Notification.requestPermission(permission => {
  if (permission === 'granted'){
    new window.Notification('TITULO', {
      body: 'texto',
    }
    )
  }
})


!!! problema da implementação acima: É uma notificação local => Não da para fazer Scheduling (programar notificação) / Não da para enviar com o App fechado
!!! Usar api do google que estava sendo testada em 2023 e vai ser possivel programar, mas não será possivel enviar com o app fechado, por isso vou utilizar service worker.
*/

//registrando service worker
//navigator.serviceWorker.register('service-worker.js')

/* Verifique se o navegador suporta Service Workers
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('Service Worker registrado com sucesso:', registration);
      })
      .catch(error => {
        console.log('Falha ao registrar o Service Worker:', error);
      });
  });
}
*/

function App() {
  
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

// Helper function to convert the VAPID key
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