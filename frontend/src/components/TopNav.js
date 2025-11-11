import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ReactComponent as IfsulLogoWhite } from '../assets/ifsul-logo-white.svg';
import { FaCalendarPlus, FaUserPlus, FaUsers, FaUserShield, FaSignOutAlt, FaHome, FaUser } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import '../App.css';
import { useEffect } from 'react';

const TopNav = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => {
    if (!path) return false;
    // match root exactly or startsWith for nested paths
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };
  const { logout } = useAuth();
  const [displayName, setDisplayName] = React.useState(() => {
    const fn = localStorage.getItem('user_first_name') || '';
    const ln = localStorage.getItem('user_last_name') || '';
    return fn ? `${fn}${ln ? ` ${ln}` : ''}` : '';
  });

  useEffect(() => {
    const onUpdate = (e) => {
      const d = e && e.detail ? e.detail : null;
      if (d) {
        const name = `${d.first_name || ''}${d.last_name ? ` ${d.last_name}` : ''}`.trim();
        setDisplayName(name);
      } else {
        const fn = localStorage.getItem('user_first_name') || '';
        const ln = localStorage.getItem('user_last_name') || '';
        setDisplayName(fn ? `${fn}${ln ? ` ${ln}` : ''}` : '');
      }
    };
    window.addEventListener('profileUpdated', onUpdate);
    return () => window.removeEventListener('profileUpdated', onUpdate);
  }, []);

  const toggleMenu = () => setMenuOpen(v => !v);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (e) {
      try { await logout(); } catch {};
      navigate('/login', { replace: true });
    }
  };

  return (
    <nav className="navbar">
      <span className="menu-icon" onClick={toggleMenu} aria-label="Abrir menu">&#9776;</span>
      <IfsulLogoWhite className="navbar-logo" role="img" aria-label="IFSUL" />

      <div className={`navbar-links desktop`}>
        {/* desktop links without separator */}
        {/* 'Início' */}
  <button onClick={() => navigate('/')} className={isActive('/') ? 'topnav-btn active' : 'topnav-btn'} style={{ background: 'none', border: 'none', color: 'white', textDecoration: 'none', cursor: 'pointer', fontSize: 'inherit', fontFamily: 'inherit', margin: '0 10px' }}>Início</button>
  <button onClick={() => navigate('/profile')} className={isActive('/profile') ? 'topnav-btn active' : 'topnav-btn'} style={{ background: 'none', border: 'none', color: 'white', textDecoration: 'none', cursor: 'pointer', fontSize: 'inherit', fontFamily: 'inherit', margin: '0 10px' }}>Perfil</button>

        {(() => {
          try {
            const permsStr = localStorage.getItem('permissions');
            if (permsStr) {
              const perms = JSON.parse(permsStr);
              if (perms.canCreateEvent) {
                return (
                  <button onClick={() => navigate('/add-evento')} className={isActive('/add-evento') ? 'topnav-btn active' : 'topnav-btn'} style={{ background: 'none', border: 'none', color: 'white', textDecoration: 'none', cursor: 'pointer', fontSize: 'inherit', fontFamily: 'inherit', margin: '0 10px' }}>
                    Adicionar Evento
                  </button>
                );
              }
            }
          } catch (e) { console.log('Erro ao verificar permissões para Add Evento:', e); }
          return null;
        })()}

        {(() => {
          const userTypeId = localStorage.getItem('user_type_id');
          const userType = localStorage.getItem('user_type');
          let canCreateUser = false;
          try { const permsStr = localStorage.getItem('permissions'); if (permsStr) { const perms = JSON.parse(permsStr); canCreateUser = Boolean(perms.canCreateUser || perms.can_create_user); } } catch (e) { console.warn('Erro ao ler permissões do localStorage:', e); }
          const isAdminUser = (userTypeId && Number(userTypeId) === 1) || userType === 'admin';
            if (isAdminUser) {
            return (
              <>
                <button onClick={() => navigate('/register-user')} className={isActive('/register-user') ? 'topnav-btn active' : 'topnav-btn'} style={{ background: 'none', border: 'none', color: 'white', textDecoration: 'none', cursor: 'pointer', fontSize: 'inherit', fontFamily: 'inherit', margin: '0 10px' }}>Registrar Usuário</button>
                <button onClick={() => navigate('/gerenciar-grupos')} className={isActive('/gerenciar-grupos') ? 'topnav-btn active' : 'topnav-btn'} style={{ background: 'none', border: 'none', color: 'white', textDecoration: 'none', cursor: 'pointer', fontSize: 'inherit', fontFamily: 'inherit', margin: '0 10px' }}>Gerenciar Grupos</button>
                <button onClick={() => navigate('/manage-permissions')} className={isActive('/manage-permissions') ? 'topnav-btn active' : 'topnav-btn'} style={{ background: 'none', border: 'none', color: 'white', textDecoration: 'none', cursor: 'pointer', fontSize: 'inherit', fontFamily: 'inherit', margin: '0 10px' }}>Gerenciar Permissões</button>
              </>
            );
          }
          if (canCreateUser) {
            return (<button onClick={() => navigate('/register-user')} className={isActive('/register-user') ? 'topnav-btn active' : 'topnav-btn'} style={{ background: 'none', border: 'none', color: 'white', textDecoration: 'none', cursor: 'pointer', fontSize: 'inherit', fontFamily: 'inherit', margin: '0 10px' }}>Registrar Usuário</button>);
          }
          return null;
        })()}

        <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'white', textDecoration: 'none', cursor: 'pointer', fontSize: 'inherit', fontFamily: 'inherit', margin: '0 10px' }}>Sair</button>
      </div>

  {/* (username removed from topbar per request) */}

      <div className={`drawer ${menuOpen ? 'open' : ''}`} role="dialog" aria-hidden={!menuOpen} aria-label="Menu">
        <div className="drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <IfsulLogoWhite className="drawer-logo" />
          </div>
          <button className="drawer-close" onClick={toggleMenu} aria-label="Fechar menu">×</button>
        </div>
        <div className="drawer-content">
          {/* Drawer items (no separator) */}
          <button className={isActive('/') ? 'nav-item active' : 'nav-item'} onClick={() => { navigate('/'); setMenuOpen(false); }}>
            <FaHome className="nav-icon" />
            <span>Início</span>
          </button>
          <button className={isActive('/profile') ? 'nav-item active' : 'nav-item'} onClick={() => { navigate('/profile'); setMenuOpen(false); }}>
            <FaUser className="nav-icon" />
            <span>Perfil</span>
          </button>
          {(() => {
            try {
              const permsStr = localStorage.getItem('permissions');
              if (permsStr) {
                const perms = JSON.parse(permsStr);
                if (perms.canCreateEvent) {
                  return (
                    <button className={isActive('/add-evento') ? 'nav-item active' : 'nav-item'} onClick={() => { navigate('/add-evento'); setMenuOpen(false); }}>
                      <FaCalendarPlus className="nav-icon" />
                      <span>Adicionar Evento</span>
                    </button>
                  );
                }
              }
            } catch (e) { console.log('Erro ao verificar permissões para Add Evento:', e); }
            return null;
          })()}

          {(() => {
            const userTypeId = localStorage.getItem('user_type_id');
            const userType = localStorage.getItem('user_type');
            let canCreateUser = false;
            try { const permsStr = localStorage.getItem('permissions'); if (permsStr) { const perms = JSON.parse(permsStr); canCreateUser = Boolean(perms.canCreateUser || perms.can_create_user); } } catch {}
            const isAdminUser = (userTypeId && Number(userTypeId) === 1) || userType === 'admin';
            if (isAdminUser) {
              return (
                <>
                  <button className={isActive('/register-user') ? 'nav-item active' : 'nav-item'} onClick={() => { navigate('/register-user'); setMenuOpen(false); }}>
                    <FaUserPlus className="nav-icon" />
                    <span>Registrar Usuário</span>
                  </button>
                  <button className={isActive('/gerenciar-grupos') ? 'nav-item active' : 'nav-item'} onClick={() => { navigate('/gerenciar-grupos'); setMenuOpen(false); }}>
                    <FaUsers className="nav-icon" />
                    <span>Gerenciar Grupos</span>
                  </button>
                  <button className={isActive('/manage-permissions') ? 'nav-item active' : 'nav-item'} onClick={() => { navigate('/manage-permissions'); setMenuOpen(false); }}>
                    <FaUserShield className="nav-icon" />
                    <span>Gerenciar Permissões</span>
                  </button>
                </>
              );
            }
            if (canCreateUser) {
              return (<button className={isActive('/register-user') ? 'nav-item active' : 'nav-item'} onClick={() => { navigate('/register-user'); setMenuOpen(false); }}><FaUserPlus className="nav-icon" /><span>Registrar Usuário</span></button>);
            }
            return null;
          })()}

          <button className="nav-item" onClick={() => { handleLogout(); setMenuOpen(false); }}>
            <FaSignOutAlt className="nav-icon" />
            <span>Sair</span>
          </button>
        </div>
      </div>
      {menuOpen && <div className="drawer-backdrop" onClick={toggleMenu} />}
    </nav>
  );
};

export default TopNav;
