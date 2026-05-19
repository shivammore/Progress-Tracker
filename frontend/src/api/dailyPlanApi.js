import axios from 'axios';
import API_BASE_URL from './config';

const API_URL = `${API_BASE_URL}/dailyplan/`;

export const fetchDailyPlans = () => axios.get(API_URL);
export const createDailyPlan = (data) => axios.post(API_URL, data);
export const updateDailyPlan = (id, data) => axios.put(`${API_URL}${id}`, data);
export const deleteDailyPlan = (id) => axios.delete(`${API_URL}${id}`);
export const bulkCreateDailyPlans = (data) => axios.post(`${API_URL}bulk`, data);
