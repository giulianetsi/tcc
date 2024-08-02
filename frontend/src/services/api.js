import axios from 'axios';
const API_URL = 'http://localhost:5000';

export const fetchUsers = async () => {
  const response = await fetch(`${API_URL}/users`);
  return await response.json();
};

export const fetchAlertas = async () => {
  const response = await fetch(`${API_URL}/alertas`);
  return await response.json();
};

const api = axios.create({
  baseURL: 'http://localhost:5000/api', 
});

export default api;
