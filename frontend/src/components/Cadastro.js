import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from './ui/Button';
import api from '../services/api';

const Cadastro = () => {
  const [formData, setFormData] = useState({
    nome: '',
    sobrenome: '',
    email: '',
    telefone: '',
    dataNascimento: '',
    senha: '',
    cpf: '',
    tipo: '',
    matricula: '',
    turma: '',
    cursos: '',
    parentesco: '',
    cpfAluno: ''
  });

  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [grupos, setGrupos] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState([]); // for professor (multiple)
  const [selectedCourse, setSelectedCourse] = useState(''); // for student (single)

  const handleCourseToggle = (courseId) => {
    setSelectedCourses(prev => prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]);
  };

  const handleCourseSelect = (courseId) => {
    setSelectedCourse(courseId || '');
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      // Prepare payload: include selectedGroups and course selections
      const payload = { ...formData, selectedGroups };
      if (formData.tipo === 'professor') {
        payload.selectedCourses = selectedCourses;
        // send courses as comma-separated list of selected course ids if cursos string is empty
        payload.cursos = formData.cursos && formData.cursos.trim() ? formData.cursos : selectedCourses.join(',');
      }
      if (formData.tipo === 'aluno') {
        payload.selectedCourse = selectedCourse || null;
      }

      // Use axios instance (sends cookies withCredentials) instead of fetch so auth token cookie is included
  const resp = await api.post('/users/register-user', payload);

  // axios throws on non-2xx, so if we are here the request succeeded
      setSuccessMessage('Usuário registrado com sucesso');
      setErrorMessage('');
        // Limpar o formulário após o sucesso
        setFormData({
          nome: '',
          sobrenome: '',
          email: '',
          telefone: '',
          dataNascimento: '',
          senha: '',
          cpf: '',
          tipo: '',
          matricula: '',
          turma: '',
          cursos: '',
          parentesco: '',
          cpfAluno: ''
        });
        setSelectedGroups([]);
        setSelectedCourses([]);
        setSelectedCourse('');
    } catch (error) {
      console.error('Erro ao registrar usuário:', error);
      setSuccessMessage('');
      setErrorMessage('Erro ao registrar usuário. Verifique o console para detalhes.');
    }
  };

  // Load groups (to allow selecting turmas for professors)
  useEffect(() => {
    const carregarGrupos = async () => {
      try {
        const res = await api.get('/groups');
        // backend may return { data: [...] } or [...] directly
        const list = res.data?.data || res.data || [];
        setGrupos(list);
      } catch (err) {
        console.error('Erro ao carregar grupos:', err);
      }
    };

    carregarGrupos();
  }, []);

  const handleGrupoToggle = (grupoId) => {
    setSelectedGroups(prev => prev.includes(grupoId) ? prev.filter(id => id !== grupoId) : [...prev, grupoId]);
  };

  const navigate = useNavigate();

  return (
    <div className="cadastro-evento-container">
      <div className="cadastro-evento-page-header">
        <h1 className="fw-bold text-dark mb-1">Registrar Usuário</h1>
      </div>
      <div className="row justify-content-start">
        <div className="col-md-6">
          <div className="cadastro-evento-card card">
            <div className="card-body p-4">
              <form onSubmit={handleSubmit}>
            {/* Formulário aqui */}
              <div className="form-group">
              <label htmlFor="nome">Nome</label>
              <input type="text" id="nome" name="nome" className="form-control cadastro-evento-input" value={formData.nome} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="sobrenome">Sobrenome</label>
              <input type="text" id="sobrenome" name="sobrenome" className="form-control cadastro-evento-input" value={formData.sobrenome} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input type="email" id="email" name="email" className="form-control cadastro-evento-input" value={formData.email} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="telefone">Telefone</label>
              <input type="tel" id="telefone" name="telefone" className="form-control cadastro-evento-input" value={formData.telefone} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label htmlFor="dataNascimento">Data de Nascimento</label>
              <input type="date" id="dataNascimento" name="dataNascimento" className="form-control cadastro-evento-input" value={formData.dataNascimento} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label htmlFor="senha">Senha</label>
              <input type="password" id="senha" name="senha" className="form-control cadastro-evento-input" value={formData.senha} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="cpf">CPF</label>
              <input type="text" id="cpf" name="cpf" className="form-control cadastro-evento-input" value={formData.cpf} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="tipo">Tipo</label>
              <select id="tipo" name="tipo" className="form-control cadastro-evento-input" value={formData.tipo} onChange={handleChange} required>
                <option value="">Selecione</option>
                <option value="aluno">Aluno</option>
                <option value="professor">Professor</option>
                <option value="responsavel">Responsável</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            {formData.tipo === 'aluno' && (
              <div id="alunoFields">
                <div className="form-group">
                  <label htmlFor="matricula">Matrícula</label>
                  <input type="text" id="matricula" name="matricula" className="form-control cadastro-evento-input" value={formData.matricula} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label htmlFor="cursoAluno">Curso</label>
                  <select id="cursoAluno" className="form-select cadastro-evento-input mb-2" value={selectedCourse} onChange={(e) => handleCourseSelect(e.target.value)}>
                    <option value="">Selecione um curso</option>
                    {grupos.filter(g => ((g.group_type || g.type || '').toLowerCase() === 'curso')).map(c => (
                      <option key={`curso-${c.id}`} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <label className="form-label fw-semibold text-dark mb-1">Turmas</label>
                  <small className="text-muted d-block mb-2">
                    <i className="fas fa-info-circle me-1"></i>
                    Selecione as turmas ligadas ao curso escolhido
                  </small>
                  <div className="cadastro-evento-checkbox-group">
                    <div className="row">
                      {grupos.filter(g => ((g.group_type || g.type || '').toLowerCase() === 'turma') && (selectedCourse ? String(g.parent_course_id) === String(selectedCourse) : true)).map(grupo => (
                        <div key={`aluno-grupo-${grupo.id}`} className="col-sm-6 col-md-4 mb-2">
                          <div className="form-check cadastro-evento-checkbox" onClick={() => handleGrupoToggle(grupo.id)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); handleGrupoToggle(grupo.id); } }}>
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id={`aluno-grupo-${grupo.id}`}
                              checked={selectedGroups.includes(grupo.id)}
                              onChange={() => handleGrupoToggle(grupo.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <label className="form-check-label" htmlFor={`aluno-grupo-${grupo.id}`}>
                              <i className={`fas ${grupo.group_type === 'turma' ? 'fa-users' : 'fa-layer-group'} me-2`}></i>
                              {grupo.name}
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {formData.tipo === 'professor' && (
              <div id="professorFields">
                <div className="form-group">
                  <label htmlFor="cursosProfessor">Cursos</label>
                  <small className="text-muted d-block mb-2">Selecione um ou mais cursos para filtrar as turmas abaixo</small>
                  <div className="cadastro-evento-checkbox-group mb-2">
                    <div className="row">
                      {grupos.filter(g => ((g.group_type || g.type || '').toLowerCase() === 'curso')).map(c => (
                        <div key={`curso-opt-${c.id}`} className="col-sm-6 col-md-4 mb-2">
                          <div className="form-check cadastro-evento-checkbox" onClick={() => handleCourseToggle(c.id)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); handleCourseToggle(c.id); } }}>
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id={`curso-opt-${c.id}`}
                              checked={selectedCourses.includes(c.id)}
                              onChange={() => handleCourseToggle(c.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <label className="form-check-label" htmlFor={`curso-opt-${c.id}`}>
                              <i className={`fas fa-book-open me-2`}></i>
                              {c.name}
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <small className="text-muted d-block mb-2">
                    <i className="fas fa-info-circle me-1"></i>
                    Selecione as turmas (grupos do tipo <strong>turma</strong>) às quais este professor pertence
                  </small>
                  <div className="cadastro-evento-checkbox-group">
                    <div className="row">
                      {grupos.filter(g => (g.group_type || g.type || '').toLowerCase() === 'turma' && (selectedCourses.length ? selectedCourses.includes(g.parent_course_id) : true)).map(grupo => (
                        <div key={grupo.id} className="col-sm-6 col-md-4 mb-2">
                          <div className="form-check cadastro-evento-checkbox" onClick={() => handleGrupoToggle(grupo.id)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); handleGrupoToggle(grupo.id); } }}>
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id={`prof-grupo-${grupo.id}`}
                              checked={selectedGroups.includes(grupo.id)}
                              onChange={() => handleGrupoToggle(grupo.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <label className="form-check-label" htmlFor={`prof-grupo-${grupo.id}`}>
                              <i className={`fas ${grupo.group_type === 'turma' ? 'fa-users' : 'fa-layer-group'} me-2`}></i>
                              {grupo.name}
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {formData.tipo === 'responsavel' && (
              <div id="responsavelFields">
                <div className="form-group">
                  <label htmlFor="parentesco">Parentesco</label>
                  <input type="text" id="parentesco" name="parentesco" className="form-control cadastro-evento-input" value={formData.parentesco} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label htmlFor="cpfAluno">CPF do Aluno</label>
                  <input type="text" id="cpfAluno" name="cpfAluno" className="form-control cadastro-evento-input" value={formData.cpfAluno} onChange={handleChange} />
                </div>
              </div>
            )}
            <div className="row mt-4 buttons-row">
              <div className="col-6 d-flex justify-content-start">
                <Button as="button" variant="secondary" size="md" className="app-btn--fixed" onClick={() => navigate('/')}>Voltar</Button>
              </div>
              <div className="col-6 d-flex justify-content-end">
                <Button type="submit" variant="primary" size="md" className="app-btn--fixed">Registrar</Button>
              </div>
            </div>
              </form>
              {successMessage && <p className="text-success mt-3">{successMessage}</p>}
              {errorMessage && <p className="text-danger mt-3">{errorMessage}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cadastro;
