import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import '../App.css';
import { FaEdit, FaTrashAlt, FaPlus } from 'react-icons/fa';
import { Evento } from './Evento';

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
    width: '80%',
  },
};

const Dashboard = ({ username, eventos, isAdmin }) => {
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [selectedEvento, setSelectedEvento] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [eventsPerPage, setEventsPerPage] = useState(16);

  const openModal = (evento) => {
    setSelectedEvento(evento);
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
    setSelectedEvento(null);
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const updateEventsPerPage = () => {
    const width = window.innerWidth;
    const height = window.innerHeight - 160;
    const eventsPerRow = Math.floor(width / 288);
    const eventsPerColumn = Math.floor(height / 132);
    setEventsPerPage(eventsPerRow * eventsPerColumn);
  };

  useEffect(() => {
    updateEventsPerPage();
    window.addEventListener('resize', updateEventsPerPage);
    return () => window.removeEventListener('resize', updateEventsPerPage);
  }, []);

  const totalPages = Math.ceil(eventos.length / eventsPerPage);

  const currentEventos = eventos.slice(
    (currentPage - 1) * eventsPerPage,
    currentPage * eventsPerPage
  );

  while (currentEventos.length < eventsPerPage) {
    currentEventos.push({
      id: `placeholder-${currentEventos.length}`,
      titulo: 'Placeholder',
      texto: '',
      data: '',
      hora: '',
      local: '',
      tipo: 'default',
      icone: '',
    });
  }

  return (
    <div>
      <nav className="navbar">
        <span>IFSUL</span>
        <span className="menu-icon" onClick={toggleMenu}>
          &#9776;
        </span>
        <div className={`navbar-links ${menuOpen ? 'active' : ''}`}>
          <a href="/add-evento">Adicionar Evento</a>
          <a href="/register-user">Registrar Usuário</a>
          <a href="/logout">Sair</a>
        </div>
      </nav>

      <div className="container">
        <h1 className="text-center mb-4">Bem-vindo, {username}</h1>

        <div className="event-grid">
          {isAdmin && (
            <div
              className="event-card event-card-add"
              onClick={() => (window.location.href = '/add-evento')}
            >
              <FaPlus />
            </div>
          )}
          {currentEventos.map((evento) => (
            <Evento evento={evento} isAdmin={isAdmin} openModal={openModal} />
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
          contentLabel="Detalhes do Evento"
        >
          {selectedEvento && (
            <>
              <h2>{selectedEvento.titulo}</h2>
              <p>{selectedEvento.texto}</p>
              <p>
                {selectedEvento.data} - {selectedEvento.hora}
              </p>
              <p>{selectedEvento.local}</p>
              <button onClick={closeModal} className="btn btn-secondary">
                Fechar
              </button>
            </>
          )}
        </Modal>
      </div>
    </div>
  );
};

export default Dashboard;
