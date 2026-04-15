// services/api.js
import axios from 'axios';
import { AppConfig } from '../constants/config';
import { supabase } from './supabase';

const api = axios.create({
  baseURL: AppConfig.api.baseUrl,
  timeout: AppConfig.api.timeout,
  headers: { 'Content-Type': 'application/json' },
});

// Inject Supabase access token on every request
api.interceptors.request.use(async (config) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch (err) {
    console.warn('Could not attach auth token:', err);
  }
  return config;
});

// Normalise error shape
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      'Something went wrong';

    const statusCode = error.response?.status || 0;

    return Promise.reject({ message, statusCode, raw: error });
  }
);

export default api;
