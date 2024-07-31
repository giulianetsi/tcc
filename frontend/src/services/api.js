const API_URL = 'http://localhost:5000';

export const fetchUsers = async () => {
  const response = await fetch(`${API_URL}/users`);
  return await response.json();
};

export const fetchAlertas = async () => {
  const response = await fetch(`${API_URL}/alertas`);
  return await response.json();
};

