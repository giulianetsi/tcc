import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import '../App.css';
import { FaEdit, FaTrashAlt, FaPlus } from 'react-icons/fa';
import { Alerta } from './Alerta';

const customStyles = {
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
    borderRadius: '15px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
    maxWidth: '600px',
    width: '80%'
  },
};

const Dashboard = ({ username, alertas, isAdmin }) => {
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [selectedAlerta, setSelectedAlerta] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [alertsPerPage, setAlertsPerPage] = useState(16);

  const openModal = (alerta) => {
    setSelectedAlerta(alerta);
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
    setSelectedAlerta(null);
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  // Calcular a quantidade de alertas por página com base no tamanho da tela
  const updateAlertsPerPage = () => {
    const width = window.innerWidth;
    const height = window.innerHeight - 160; // Ajustar o tamanho considerando a navbar e os espaçamentos
    const alertsPerRow = Math.floor(width / 288);
    const alertsPerColumn = Math.floor(height / 132);
    setAlertsPerPage(alertsPerRow * alertsPerColumn);
  };

  useEffect(() => {
    updateAlertsPerPage();
    window.addEventListener('resize', updateAlertsPerPage);
    return () => window.removeEventListener('resize', updateAlertsPerPage);
  }, []);

  const totalPages = Math.ceil(alertas.length / alertsPerPage);

  const currentAlertas = alertas.slice(
    (currentPage - 1) * alertsPerPage,
    currentPage * alertsPerPage
  );

  // adicionar blocos cinzas se houver espaço sobrando na página atual ?? talvez remover
  while (currentAlertas.length < alertsPerPage) {
    currentAlertas.push({
      id: `placeholder-${currentAlertas.length}`,
      titulo: 'Placeholder',
      texto: '',
      data: '',
      hora: '',
      local: '',
      tipo: 'default',
      icone: ''
    });
  }

  return (
    <div>
      <nav className="navbar">
        <span>Dashboard</span>
        <span className="menu-icon" onClick={toggleMenu}>&#9776;</span>
        <div className={`navbar-links ${menuOpen ? 'active' : ''}`}>
          <a href="/add-alerta">Adicionar Alerta</a>
          <a href="/register-user">Registrar Usuário</a>
          <a href="/logout">Sair</a>
        </div>
      </nav>
      
      <div className="container">
        <h1 className="text-center mb-4">Bem-vindo, {username}</h1>

        <div className="alert-grid">
          {isAdmin && (
            <div
              className="alert-card alert-card-add"
              onClick={() => window.location.href = '/add-alerta'}
            >
              <FaPlus />
            </div>
          )}
          {currentAlertas.map((alerta) => (
            <Alerta alerta={alerta} isAdmin={isAdmin} openModal={openModal}/>
          ))}
        </div>

        <div className="pagination">
          <button 
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Anterior
          </button>
          <button 
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Próxima
          </button>
        </div>

        <Modal
          isOpen={modalIsOpen}
          onRequestClose={closeModal}
          style={customStyles}
          contentLabel="Detalhes do Alerta"
        >
          {selectedAlerta && (
            <>
              <h2>{selectedAlerta.titulo}</h2>
              <p>{selectedAlerta.texto}</p>
              <p>{selectedAlerta.data} - {selectedAlerta.hora}</p>
              <p>{selectedAlerta.local}</p>
              <button onClick={closeModal} className="btn btn-secondary">Fechar</button>
            </>
          )}
        </Modal>
      </div>
    </div>
  );
};

export default Dashboard;
