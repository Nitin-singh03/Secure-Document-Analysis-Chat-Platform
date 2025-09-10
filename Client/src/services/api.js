import axios from 'axios';

let accessToken = null;

export const setApiAccessToken = (token) => {
    accessToken = token;
};

const api = axios.create({
    baseURL: `${import.meta.env.VITE_SERVER_URI}/api`,
    withCredentials: true,
});

let logoutUser = () => {};
export const setLogoutUserCallback = (callback) => {
    logoutUser = callback;
};

api.interceptors.request.use(
    (config) => {
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && error.response.data.error === 'TOKEN_EXPIRED' && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const { data } = await api.post('/auth/refresh');
                setApiAccessToken(data.accessToken);
                originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                console.error('Token refresh failed. Logging out.', refreshError);
                logoutUser();
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export const authService = {
    register: (credentials) => api.post('/auth/register', credentials),
    login: (credentials) => api.post('/auth/login', credentials),
    logout: () => api.post('/auth/logout'),
    refreshAccessToken: () => api.post('/auth/refresh'),
    sendVerifyOtp: () => api.post('/auth/send-verify-otp'),
    verifyAccount: (data) => api.post('/auth/verify-account', data),
    sendResetOtp: (email) => api.post('/auth/send-reset-otp', { email }),
    resetPassword: (data) => api.post('/auth/reset-password', data),
};

export const userService = {
    getProfile: () => api.get('/user/me'),
};

export const documentService = {
    upload: (formData) => api.post('/documents/upload', formData),
    query: (question, documentId) => api.post('/documents/query', { question, documentId }),
    getDocuments: () => api.get('/documents/documents'),
    getChatHistory: (documentId) => api.get(`/documents/chat/${documentId}`),
    deleteDocument: (documentId) => api.delete(`/documents/${documentId}`),
};

export const getGoogleLoginUrl = () => `${import.meta.env.VITE_SERVER_URI}/api/auth/google`;
export const getGithubLoginUrl = () => `${import.meta.env.VITE_SERVER_URI}/api/auth/github`;