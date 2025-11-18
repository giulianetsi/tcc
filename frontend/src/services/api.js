import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const fetchUsers = async () => {
  const response = await axios.get(`${API_URL}/users`);
  return response.data;
};

export const fetchAlertas = async () => {
  const response = await axios.get(`${API_URL}/alertas`);
  return response.data;
};

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, //  cookies enviados com as requisições
});

export default api;
