import axios from 'axios';
import API_BASE_URL from './config';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: { Authorization: `Bearer ${token}` }
  };
};

export const fetchGoals = () => axios.get(`${API_BASE_URL}/goals/`, getAuthHeaders());
export const createGoal = (data) => axios.post(`${API_BASE_URL}/goals/`, data, getAuthHeaders());
export const updateGoal = (id, data) => axios.put(`${API_BASE_URL}/goals/${id}`, data, getAuthHeaders());
export const deleteGoal = (id) => axios.delete(`${API_BASE_URL}/goals/${id}`, getAuthHeaders());
