// frontend/src/services/api.js
const API_URL = 'http://localhost:300/api';

export const fetchUsers = async () => {
  const response = await fetch(`${API_URL}/users`);
  return await response.json();
};

export const fetchAlertas = async () => {
  const response = await fetch(`${API_URL}/alertas`);
  return await response.json();
};

// Adicione outras funções para chamadas de API conforme necessário
