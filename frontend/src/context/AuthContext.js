import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar se o usuário já está autenticado ao carregar a página
    const token = localStorage.getItem('authToken');
    const userId = localStorage.getItem('user_id');
    
    if (token && userId) {
      console.log('Usuário já autenticado encontrado no localStorage');
      setIsAuthenticated(true);
    } else {
      console.log('Nenhuma autenticação encontrada no localStorage');
      setIsAuthenticated(false);
    }
    
    setLoading(false);
  }, []);

  const login = () => {
    console.log('Usuário autenticado');
    setIsAuthenticated(true);
    console.log('Estado de autenticação atualizado:', true);
  };

  const logout = () => {
    console.log('Usuário deslogado - limpando todos os dados de sessão');
    
    // Obter user_id antes de limpar para limpar decisão de notificação específica
    const userId = localStorage.getItem('user_id');
    
    // Limpar TODOS os dados do localStorage relacionados ao usuário
    localStorage.removeItem('authToken');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_type');
    localStorage.removeItem('user_first_name');
    localStorage.removeItem('user_last_name');
    localStorage.removeItem('permissions');
    
    // Limpar decisão de notificação específica do usuário
    if (userId) {
      localStorage.removeItem(`notificationDecision_${userId}`);
    }
    
    // Limpar também a decisão geral antiga (compatibilidade)
    localStorage.removeItem('notificationDecision');
    
    console.log('localStorage completamente limpo por segurança');
    
    setIsAuthenticated(false);
    console.log('Estado de autenticação atualizado:', false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);