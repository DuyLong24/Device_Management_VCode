import axios from 'axios';

import keycloak from './auth.config';

const BASE_URL = import.meta.env.VITE_API_URL;

export const axiosInstance = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

axiosInstance.interceptors.request.use(
    async (config) => {
        try {
            if (keycloak.isTokenExpired(70)) {
                await keycloak.updateToken(70);
            }
        } catch (error) {
            console.error('Failed to update token', error);
            await keycloak.login();
            return Promise.reject(error);
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

        if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                if (keycloak.isTokenExpired(0)) {
                    await keycloak.updateToken(0);
                    originalRequest.headers.Authorization = `Bearer ${keycloak.token}`;
                    return axiosInstance(originalRequest);
                } else {
                    if (error.response?.status === 403) {
                        return Promise.reject(error);
                    }
                }

                await keycloak.login();
            } catch (loginError) {
                console.error('Re-login / Token update failed', loginError);
                await keycloak.login();
            }
        }
        return Promise.reject(error);
    }
);