import { useState, useEffect, useCallback } from 'react';
import keycloak from '../configs/auth.config';
import { userService } from '../services/user.service';
import type { User } from '../types/user.type';

export const useAuth = () => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!keycloak.authenticated);
    const [token, setToken] = useState<string | undefined>(keycloak.token);
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(!!keycloak.authenticated); // Start loading if authenticated

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
                permissions: [] as string[]
            };

            try {
                // Lấy permission từ BE
                const data = await userService.getMyPermissions();
                initialUser.permissions = data.permissions || [];
            } catch (error) {
                console.error("Failed to fetch permissions", error);
            } finally {
                setUser(initialUser);
                setIsLoading(false);
            }

        } else {
            setUser(null);
            setIsLoading(false);
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
        hasRole: (role: string) => user?.roles?.some(r => r.toLowerCase() === role.toLowerCase()) || false,
        hasPermission,
        isLoading
    };
};
