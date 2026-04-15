import axios from 'axios';

const API_URL = 'http://localhost:3000/api/auth'; // Update if needed

export const signup = async (userData) => {
  return axios.post(`${API_URL}/signup`, userData);
};

export const login = async (userData) => {
  return axios.post(`${API_URL}/login`, userData);
};

export const logout = () => {
  localStorage.removeItem('token');
};

export const getToken = () => {
  return localStorage.getItem('token');
};
