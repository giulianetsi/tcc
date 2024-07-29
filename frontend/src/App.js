import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import Cadastro from './components/Cadastro';
import CadastroAlerta from './components/CadastroAlerta';
import Dashboard from './components/Dashboard';
import './App.css';

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
          <Route path="/dashboard" element={<Dashboard username={username} alertas={alertas} isAdmin={isAdmin} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
