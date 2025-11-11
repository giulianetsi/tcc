import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const GerenciarGrupos = () => {
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [membrosModalIsOpen, setMembrosModalIsOpen] = useState(false);
  const [editModalIsOpen, setEditModalIsOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [membros, setMembros] = useState([]);
  const [usuariosDisponiveis, setUsuariosDisponiveis] = useState([]);
  
  // Estados do formulário
  const [novoGrupo, setNovoGrupo] = useState({
    name: '',
    description: '',
    group_type: 'custom'
  });
  
  const navigate = useNavigate();

  // Tipos de grupo disponíveis
  const tiposGrupo = [
    { value: 'turma', label: 'Turma' },
    { value: 'turno', label: 'Turno' },
    { value: 'area_ensino', label: 'Área de Ensino' },
    { value: 'curso', label: 'Curso' },
    { value: 'custom', label: 'Personalizado' }
  ];

  useEffect(() => {
    carregarGrupos();
  }, []);

  const carregarGrupos = async () => {
    try {
      setLoading(true);
      const response = await api.get('/groups');

      setGrupos(response.data);
    } catch (error) {
      console.error('Erro ao carregar grupos:', error);
      if (error.response?.status === 401) {
        navigate('/login');
      } else if (error.response?.status === 403) {
        setMessage('❌ Sem permissão para ver grupos');
      } else {
        setMessage('❌ Erro ao carregar grupos');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!novoGrupo.name.trim()) {
      setMessage('❌ Nome do grupo é obrigatório');
      return;
    }

    try {
      await api.post('/groups', novoGrupo);

      setMessage('✅ Grupo criado com sucesso!');
      setModalIsOpen(false);
      setNovoGrupo({ name: '', description: '', group_type: 'custom' });
      carregarGrupos();
    } catch (error) {
      console.error('Erro ao criar grupo:', error);
      setMessage(`❌ ${error.response?.data?.message || 'Erro ao criar grupo'}`);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    
    try {
      await api.put(`/groups/${selectedGroup.id}`, selectedGroup);

      setMessage('✅ Grupo atualizado com sucesso!');
      setEditModalIsOpen(false);
      carregarGrupos();
    } catch (error) {
      console.error('Erro ao atualizar grupo:', error);
      setMessage(`❌ ${error.response?.data?.message || 'Erro ao atualizar grupo'}`);
    }
  };

  const handleDelete = async (groupId) => {
    if (!window.confirm('Tem certeza que deseja deletar este grupo?')) {
      return;
    }

    try {
      await api.delete(`/groups/${groupId}`);

      setMessage('✅ Grupo deletado com sucesso!');
      carregarGrupos();
    } catch (error) {
      console.error('Erro ao deletar grupo:', error);
      setMessage(`❌ ${error.response?.data?.message || 'Erro ao deletar grupo'}`);
    }
  };

  const verMembros = async (group) => {
    try {
      const [membrosResponse, disponiveisResponse] = await Promise.all([
        api.get(`/groups/${group.id}/members`),
        api.get(`/groups/${group.id}/available-users`)
      ]);

      setMembros(membrosResponse.data);
      setUsuariosDisponiveis(disponiveisResponse.data);
      setSelectedGroup(group);
      setMembrosModalIsOpen(true);
    } catch (error) {
      console.error('Erro ao carregar membros:', error);
      setMessage(`❌ ${error.response?.data?.message || 'Erro ao carregar membros'}`);
    }
  };

  const adicionarMembro = async (userId) => {
    try {
      await api.post('/groups/add-member', {
        groupId: selectedGroup.id,
        userId: userId
      });

      // Recarregar membros
      verMembros(selectedGroup);
      setMessage('✅ Usuário adicionado ao grupo!');
    } catch (error) {
      console.error('Erro ao adicionar membro:', error);
      setMessage(`❌ ${error.response?.data?.message || 'Erro ao adicionar membro'}`);
    }
  };

  const removerMembro = async (userId) => {
    if (!window.confirm('Tem certeza que deseja remover este usuário do grupo?')) {
      return;
    }

    try {
      await api.delete(`/groups/${selectedGroup.id}/members/${userId}`);

      // Recarregar membros
      verMembros(selectedGroup);
      setMessage('✅ Usuário removido do grupo!');
    } catch (error) {
      console.error('Erro ao remover membro:', error);
      setMessage(`❌ ${error.response?.data?.message || 'Erro ao remover membro'}`);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getTipoLabel = (tipo) => {
    const tipoObj = tiposGrupo.find(t => t.value === tipo);
    return tipoObj ? tipoObj.label : tipo;
  };

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
          <p className="mt-2">Carregando grupos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">
            <i className="fas fa-users me-2 text-primary"></i>
            Gerenciar Grupos
          </h2>
          <p className="text-muted">Organize usuários em grupos para controle de acesso a eventos</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setModalIsOpen(true)}
        >
          <i className="fas fa-plus me-2"></i>
          Novo Grupo
        </button>
      </div>

      {/* Mensagem */}
      {message && (
        <div className={`alert border-0 ${message.includes('✅') ? 'alert-success' : 'alert-danger'}`} role="alert">
          {message}
        </div>
      )}

      {/* Lista de Grupos */}
      {grupos.length === 0 ? (
        <div className="text-center py-5">
          <i className="fas fa-users fa-3x text-muted mb-3"></i>
          <h4 className="text-muted">Nenhum grupo cadastrado</h4>
          <p className="text-muted">Clique em "Novo Grupo" para começar</p>
        </div>
      ) : (
        <div className="row">
          {grupos.map(grupo => (
            <div key={grupo.id} className="col-md-6 col-lg-4 mb-4">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <h5 className="card-title mb-0">{grupo.name}</h5>
                    <span className={`badge bg-${grupo.group_type === 'turma' ? 'primary' : grupo.group_type === 'turno' ? 'success' : 'secondary'}`}>
                      {getTipoLabel(grupo.group_type)}
                    </span>
                  </div>
                  
                  {grupo.description && (
                    <p className="card-text text-muted small">{grupo.description}</p>
                  )}
                  
                  <div className="mb-3">
                    <small className="text-muted">
                      <i className="fas fa-user me-1"></i>
                      {grupo.member_count} membro(s)
                    </small>
                    <br />
                    <small className="text-muted">
                      <i className="fas fa-calendar me-1"></i>
                      Criado em {formatDate(grupo.created_at)}
                    </small>
                    {grupo.created_by_name && (
                      <>
                        <br />
                        <small className="text-muted">
                          <i className="fas fa-user-plus me-1"></i>
                          Por {grupo.created_by_name} {grupo.created_by_lastname}
                        </small>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="card-footer bg-transparent">
                  <div className="btn-group w-100" role="group">
                    <button 
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => verMembros(grupo)}
                    >
                      <i className="fas fa-users"></i> Membros
                    </button>
                    <button 
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => {
                        setSelectedGroup(grupo);
                        setEditModalIsOpen(true);
                      }}
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    <button 
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => handleDelete(grupo.id)}
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Criar Grupo - Bootstrap Nativo */}
      <div 
        className={`modal fade ${modalIsOpen ? 'show d-block' : ''}`} 
        style={{ 
          backgroundColor: modalIsOpen ? 'rgba(0,0,0,0.5)' : 'transparent',
          display: modalIsOpen ? 'block' : 'none'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setModalIsOpen(false);
          }
        }}
      >
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                <i className="fas fa-plus-circle me-2"></i>
                Criar Novo Grupo
              </h5>
              <button 
                type="button" 
                className="btn-close" 
                onClick={() => setModalIsOpen(false)}
              ></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Nome do Grupo *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={novoGrupo.name}
                    onChange={(e) => setNovoGrupo({...novoGrupo, name: e.target.value})}
                    placeholder="Ex: 3º Ano A, Turno Manhã..."
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Tipo de Grupo</label>
                  <select
                    className="form-select"
                    value={novoGrupo.group_type}
                    onChange={(e) => setNovoGrupo({...novoGrupo, group_type: e.target.value})}
                  >
                    {tiposGrupo.map(tipo => (
                      <option key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Descrição</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={novoGrupo.description}
                    onChange={(e) => setNovoGrupo({...novoGrupo, description: e.target.value})}
                    placeholder="Descrição opcional do grupo..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setModalIsOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  <i className="fas fa-save me-2"></i>
                  Criar Grupo
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Modal Editar Grupo - Bootstrap Nativo */}
      <div 
        className={`modal fade ${editModalIsOpen ? 'show d-block' : ''}`} 
        style={{ 
          backgroundColor: editModalIsOpen ? 'rgba(0,0,0,0.5)' : 'transparent',
          display: editModalIsOpen ? 'block' : 'none'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setEditModalIsOpen(false);
          }
        }}
      >
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                <i className="fas fa-edit me-2"></i>
                Editar Grupo
              </h5>
              <button 
                type="button" 
                className="btn-close" 
                onClick={() => setEditModalIsOpen(false)}
              ></button>
            </div>
            <form onSubmit={handleEdit}>
              <div className="modal-body">
                {selectedGroup && (
                  <>
                    <div className="mb-3">
                      <label className="form-label">Nome do Grupo *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={selectedGroup.name}
                        onChange={(e) => setSelectedGroup({...selectedGroup, name: e.target.value})}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Tipo de Grupo</label>
                      <select
                        className="form-select"
                        value={selectedGroup.group_type}
                        onChange={(e) => setSelectedGroup({...selectedGroup, group_type: e.target.value})}
                      >
                        {tiposGrupo.map(tipo => (
                          <option key={tipo.value} value={tipo.value}>
                            {tipo.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Descrição</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        value={selectedGroup.description || ''}
                        onChange={(e) => setSelectedGroup({...selectedGroup, description: e.target.value})}
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setEditModalIsOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  <i className="fas fa-save me-2"></i>
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Modal Membros */}
      <Modal
        isOpen={membrosModalIsOpen}
        onRequestClose={() => setMembrosModalIsOpen(false)}
        className="modal-dialog modal-lg modal-dialog-centered"
        overlayClassName="modal fade show d-block"
        style={{ overlay: { backgroundColor: 'rgba(0,0,0,0.5)' } }}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="fas fa-users me-2"></i>
              Membros do Grupo: {selectedGroup?.name}
            </h5>
            <button 
              type="button" 
              className="btn-close" 
              onClick={() => setMembrosModalIsOpen(false)}
            ></button>
          </div>
          <div className="modal-body">
            {/* Membros Atuais */}
            <div className="mb-4">
              <h6 className="mb-3">
                <i className="fas fa-user-check me-2 text-success"></i>
                Membros Atuais ({membros.length})
              </h6>
              {membros.length === 0 ? (
                <p className="text-muted">Nenhum membro no grupo</p>
              ) : (
                <div className="list-group">
                  {membros.map(membro => (
                    <div key={membro.id} className="list-group-item d-flex justify-content-between align-items-center">
                      <div>
                        <strong>{membro.first_name} {membro.last_name}</strong>
                        <br />
                        <small className="text-muted">{membro.email} | {getTipoLabel(membro.user_type)}</small>
                        <br />
                        <small className="text-muted">Entrou em: {formatDate(membro.joined_at)}</small>
                      </div>
                      <button 
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => removerMembro(membro.id)}
                      >
                        <i className="fas fa-times"></i> Remover
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Usuários Disponíveis */}
            <div>
              <h6 className="mb-3">
                <i className="fas fa-user-plus me-2 text-primary"></i>
                Adicionar Membros ({usuariosDisponiveis.length} disponíveis)
              </h6>
              {usuariosDisponiveis.length === 0 ? (
                <p className="text-muted">Todos os usuários já estão no grupo</p>
              ) : (
                <div className="list-group" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {usuariosDisponiveis.map(usuario => (
                    <div key={usuario.id} className="list-group-item d-flex justify-content-between align-items-center">
                      <div>
                        <strong>{usuario.first_name} {usuario.last_name}</strong>
                        <br />
                        <small className="text-muted">{usuario.email} | {getTipoLabel(usuario.user_type)}</small>
                      </div>
                      <button 
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => adicionarMembro(usuario.id)}
                      >
                        <i className="fas fa-plus"></i> Adicionar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={() => setMembrosModalIsOpen(false)}
            >
              Fechar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default GerenciarGrupos;
