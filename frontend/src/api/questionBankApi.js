import axios from 'axios';
import API_BASE_URL from './config';

const API_URL = `${API_BASE_URL}/questions/`;

export const fetchQuestions = (topic = '', dueOnly = false) => {
  let query = '?';
  if (topic) query += `topic=${encodeURIComponent(topic)}&`;
  if (dueOnly) query += `due_only=true&`;
  return axios.get(`${API_URL}${query}`);
};
export const createQuestion = (data) => axios.post(API_URL, data);
export const bulkCreateQuestions = (data) => axios.post(`${API_URL}bulk`, data);
export const updateQuestion = (id, data) => axios.put(`${API_URL}${id}`, data);
export const deleteQuestion = (id) => axios.delete(`${API_URL}${id}`);
export const reviewQuestion = (id, grade) => axios.post(`${API_URL}${id}/review`, { grade });
