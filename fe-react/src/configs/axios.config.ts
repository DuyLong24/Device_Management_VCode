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
        // Update token if it's about to expire (within 30 seconds)
        try {
            if (keycloak.isTokenExpired(30)) {
                // console.log('🔄 Token expiring soon, refreshing...');
                await keycloak.updateToken(30);
                // console.log('✅ Token refreshed');
            }
        } catch (error) {
            // console.error('❌ Failed to update token', error);
            // If token refresh fails, try to login again
            keycloak.login();
        }

        const token = keycloak.token;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            // console.log('🔑 Request with token:', config.url, token.substring(0, 20) + '...');
        } else {
            // console.warn('⚠️ No token available for request:', config.url);
            // console.warn('Keycloak authenticated:', keycloak.authenticated);
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
            console.error('🔒 401 Unauthorized - Token invalid or expired');

            try {
                // Try to refresh token first
                await keycloak.updateToken(-1); // Force refresh
                const newToken = keycloak.token;

                if (newToken) {
                    // console.log('✅ Token refreshed after 401, retrying request...');
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                    return axiosInstance(originalRequest);
                } else {
                    // console.error('❌ No token after refresh, redirecting to login...');
                    await keycloak.login();
                }
            } catch (refreshError) {
                // console.error('❌ Token refresh failed, redirecting to login...', refreshError);
                await keycloak.login();
            }
        }
        return Promise.reject(error);
    }
);