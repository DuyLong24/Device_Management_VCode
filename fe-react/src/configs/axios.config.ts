import axios from 'axios';

import keycloak from './auth.config';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const axiosInstance = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

axiosInstance.interceptors.request.use(
    async (config) => {
        // Update token if it's about to expire (within 5 seconds)
        try {
            if (keycloak.isTokenExpired(30)) {
                await keycloak.updateToken(30);
                // localStorage.setItem('accessToken', keycloak.token || '');
            }
        } catch (error) {
            console.error('Failed to update token', error);
        }

        const token = keycloak.token;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                // Try to login again
                await keycloak.login();
            } catch (loginError) {
                console.error('Re-login failed', loginError);
            }
        }
        return Promise.reject(error);
    }
);