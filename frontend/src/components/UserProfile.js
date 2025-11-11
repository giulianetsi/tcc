import React, { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import Button from './ui/Button';

const UserProfile = () => {
  const [loading, setLoading] = useState(true);
  // email and phone are editable by default; name fields are read-only
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info'); // 'info' | 'warning' | 'danger'
  const [profile, setProfile] = useState({ first_name: '', last_name: '', email: '', phone: '' });
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'password'
  const navigate = useNavigate();
  const navRef = useRef(null);
  const [underline, setUnderline] = useState({ left: 0, width: 0, visible: false });

  const localKeys = {
    first_name: 'user_first_name',
    last_name: 'user_last_name',
    email: 'user_email',
    phone: 'user_phone'
  };

  const loadFromLocal = () => {
    const p = {
      first_name: localStorage.getItem(localKeys.first_name) || '',
      last_name: localStorage.getItem(localKeys.last_name) || '',
      email: localStorage.getItem(localKeys.email) || '',
      phone: localStorage.getItem(localKeys.phone) || ''
    };
    setProfile(p);
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
  const resp = await api.get('/users/profile');
      if (resp && resp.data) {
        setProfile({
          first_name: resp.data.first_name || '',
          last_name: resp.data.last_name || '',
          email: resp.data.email || '',
          phone: resp.data.phone || ''
        });
      } else {
        loadFromLocal();
      }
    } catch (err) {
      // if backend returns 404, fallback to localStorage
      const status = err && err.response ? err.response.status : null;
      console.warn('Erro ao carregar perfil (endpoint /user/profile). Status:', status);
      if (status === 404) {
        loadFromLocal();
        setMessage('Perfil não encontrado no servidor. Carregado do armazenamento local.');
        setMessageType('warning');
      } else {
        setMessage('Não foi possível carregar o perfil. Verifique a conexão.');
        setMessageType('danger');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  // update sliding underline position when activeTab changes or on resize
  useEffect(() => {
    const update = () => {
      try {
        const nav = navRef.current;
        if (!nav) return setUnderline(u => ({ ...u, visible: false }));
        const activeEl = nav.querySelector('.nav-link.active');
        if (!activeEl) return setUnderline(u => ({ ...u, visible: false }));
        const navRect = nav.getBoundingClientRect();
        const activeRect = activeEl.getBoundingClientRect();
        // account for horizontal scroll inside nav (mobile overflow-x)
        const left = activeRect.left - navRect.left + (nav.scrollLeft || 0);
        const width = activeRect.width;
        setUnderline({ left, width, visible: true });
      } catch (e) {
        // ignore measurement errors
        setUnderline(u => ({ ...u, visible: false }));
      }
    };
    // run on next tick to ensure layout is ready
    setTimeout(update, 0);
    window.addEventListener('resize', update);
    // update on scroll so underline follows when user scrolls tabs horizontally
    const navEl = navRef.current;
    if (navEl) navEl.addEventListener('scroll', update, { passive: true });
    return () => {
      window.removeEventListener('resize', update);
      if (navEl) navEl.removeEventListener('scroll', update);
    };
  }, [activeTab]);

  // When switching tabs, clear any existing messages so errors/warnings don't persist across tabs
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setMessage('');
    setMessageType('info');
  };

  const saveProfile = async () => {
    try {
      setMessage('');
  const resp = await api.put('/users/profile', profile);
      setMessage('Perfil atualizado.');
      setMessageType('success');
      if (resp && resp.data) {
        setProfile(resp.data);
        // persist in localStorage for sync with other UI
        try {
          localStorage.setItem('user_first_name', resp.data.first_name || '');
          localStorage.setItem('user_last_name', resp.data.last_name || '');
          localStorage.setItem('user_email', resp.data.email || '');
          localStorage.setItem('user_phone', resp.data.phone || '');
          // notify other parts of the app (TopNav, Dashboard)
          window.dispatchEvent(new CustomEvent('profileUpdated', { detail: resp.data }));
        } catch (e) { /* ignore storage errors */ }
      }
    } catch (err) {
      const status = err && err.response ? err.response.status : null;
      console.error('Erro ao salvar perfil:', err);
      if (status === 404) {
        // backend not available; save to localStorage as fallback
        Object.keys(localKeys).forEach(k => localStorage.setItem(localKeys[k], profile[k] || ''));
        setMessage('Servidor indisponível. Perfil salvo localmente.');
        setMessageType('warning');
  // keep UI editable; data saved to localStorage as fallback
      } else {
        setMessage('Erro ao salvar perfil.');
        setMessageType('danger');
      }
    }
  };

  const changePassword = async () => {
    if (!pwd.currentPassword || !pwd.newPassword) return setMessage('Preencha todas as senhas.');
    if (pwd.newPassword !== pwd.confirmPassword) return setMessage('A nova senha e a confirmação não coincidem.');
    try {
      setMessage('');
      await api.post('/users/change-password', {
        currentPassword: pwd.currentPassword,
        newPassword: pwd.newPassword
      });
      setMessage('Senha alterada com sucesso.');
      setPwd({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      console.error('Erro ao alterar senha:', err);
      if (err && err.response && err.response.data && err.response.data.message) setMessage(err.response.data.message);
      else setMessage('Erro ao alterar senha.');
    }
  };

  if (loading) return <div className="container mt-4 user-profile">Carregando perfil...</div>;

  return (
    <div className="container mt-4 user-profile">
      <div className="mb-3">
        <div className="user-tabs nav nav-tabs" ref={navRef}>
          <button className={`nav-link ${activeTab === 'info' ? 'active' : ''}`} onClick={() => handleTabChange('info')}>Informações do perfil</button>
          <button className={`nav-link ${activeTab === 'password' ? 'active' : ''}`} onClick={() => handleTabChange('password')}>Alterar senha</button>
          {/* sliding underline (positioned via inline style) */}
          <div
            className="user-tabs-underline"
            style={{
              left: `${underline.left}px`,
              width: `${underline.width}px`,
              opacity: underline.visible ? 1 : 0
            }}
          />
        </div>
      </div>

      {message && (
        <div className={`alert ${messageType === 'info' ? 'alert-info' : messageType === 'warning' ? 'alert-warning' : messageType === 'success' ? 'alert-success' : 'alert-danger'} d-flex align-items-center`} role="alert">
          <div>{message}</div>
        </div>
      )}

      <div>
        {activeTab === 'info' ? (
          <div className="card">
            <div className="card-body">
              {/* aviso removido conforme solicitado */}

              <div className="row gy-2">
                <div className="col-12 col-md-6">
                  <label className="form-label">Nome</label>
                  <input className="form-control" value={profile.first_name} onChange={e => setProfile(p => ({ ...p, first_name: e.target.value }))} />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Sobrenome</label>
                  <input className="form-control" value={profile.last_name} onChange={e => setProfile(p => ({ ...p, last_name: e.target.value }))} />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Email</label>
                  <input className="form-control" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} readOnly />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Telefone</label>
                  <input className="form-control" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
                </div>
              </div>

              <div className="mt-3">
                <Button type="button" variant="primary" size="md" className="app-btn--fixed me-2" onClick={saveProfile}>Salvar</Button>
                <Button as="button" variant="secondary" size="md" className="app-btn--fixed" onClick={() => navigate('/')}>Voltar</Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="card-body">
              <div className="mb-2">
                <label className="form-label">Senha atual</label>
                <input type="password" className="form-control" value={pwd.currentPassword} onChange={e => setPwd(p => ({ ...p, currentPassword: e.target.value }))} />
              </div>
              <div className="mb-2">
                <label className="form-label">Nova senha</label>
                <input type="password" className="form-control" value={pwd.newPassword} onChange={e => setPwd(p => ({ ...p, newPassword: e.target.value }))} />
              </div>
              <div className="mb-2">
                <label className="form-label">Confirmar nova senha</label>
                <input type="password" className="form-control" value={pwd.confirmPassword} onChange={e => setPwd(p => ({ ...p, confirmPassword: e.target.value }))} />
              </div>
              <div className="mt-3 d-flex gap-2 flex-wrap">
                <Button type="button" variant="primary" size="md" className="app-btn--fixed me-2" onClick={changePassword}>Alterar senha</Button>
                <Button as="button" variant="secondary" size="md" className="app-btn--fixed" onClick={() => setPwd({ currentPassword: '', newPassword: '', confirmPassword: '' })}>Limpar</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
