import axios from 'axios';
import API_BASE_URL from './config';

const API_URL = `${API_BASE_URL}/questions/`;

export const fetchQuestions = () => axios.get(API_URL);
export const createQuestion = (data) => axios.post(API_URL, data);
export const updateQuestion = (id, data) => axios.put(`${API_URL}${id}`, data);
export const deleteQuestion = (id) => axios.delete(`${API_URL}${id}`);
export const reviewQuestion = (id, grade) => axios.post(`${API_URL}${id}/review`, { grade });
