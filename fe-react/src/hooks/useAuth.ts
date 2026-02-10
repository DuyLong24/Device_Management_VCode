import { useState, useEffect, useCallback } from 'react';
import keycloak from '../configs/auth.config';
import { axiosInstance } from '../configs/axios.config';

export interface UserProfile {
    id: string;
    username: string;
    email: string;
    name: string;
    roles: string[];
    permissions?: string[];
}

export const useAuth = () => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!keycloak.authenticated);
    const [token, setToken] = useState<string | undefined>(keycloak.token);
    const [user, setUser] = useState<UserProfile | null>(null);

    const loadUserProfile = useCallback(async () => {
        if (keycloak.tokenParsed) {
            const parsed = keycloak.tokenParsed;
            const roles = keycloak.realmAccess?.roles || [];

            const initialUser = {
                id: parsed.sub || '',
                username: parsed.preferred_username || '',
                email: parsed.email || '',
                name: parsed.name || parsed.preferred_username || '',
                roles: roles,
                permissions: []
            };

            try {
                // Lấy permission từ BE
                const response = await axiosInstance.get('/users/permissions/me');
                initialUser.permissions = response.data.permissions || [];
            } catch (error) {
                console.error("Failed to fetch permissions", error);
            }

            setUser(initialUser);
        } else {
            setUser(null);
        }
    }, []);

    useEffect(() => {
        // Initial load
        if (keycloak.authenticated) {
            setIsAuthenticated(true);
            setToken(keycloak.token);
            loadUserProfile();
        }
    }, [loadUserProfile]);

    const login = () => {
        keycloak.login();
    };

    const logout = () => {
        // Clear local storage
        localStorage.removeItem('accessToken');
        // Keycloak logout
        keycloak.logout({
            redirectUri: window.location.origin
        });
    };

    const hasPermission = (permission: string) => {
        if (!user || !user.permissions) return false;
        if (user.permissions.includes('*')) return true;
        return user.permissions.includes(permission);
    }

    return {
        isAuthenticated,
        token,
        user,
        login,
        logout,
        hasRole: (role: string) => user?.roles.some(r => r.toLowerCase() === role.toLowerCase()) || false,
        hasPermission
    };
};
