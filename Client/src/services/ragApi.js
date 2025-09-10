import axios from 'axios';

const RAG_API_BASE = 'http://localhost:8002';

const ragApi = axios.create({
  baseURL: RAG_API_BASE,
});

ragApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const uploadDocuments = async (files) => {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('files', file);
  });
  
  return ragApi.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const queryDocuments = async (question) => {
  return ragApi.post('/query', { question });
};

export const getUserDocuments = async () => {
  return ragApi.get('/documents');
};

export default ragApi;