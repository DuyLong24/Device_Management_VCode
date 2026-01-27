import { useState, useEffect, useCallback } from 'react';
import keycloak from '../configs/auth.config';

export interface UserProfile {
    id: string;
    username: string;
    email: string;
    name: string;
    roles: string[];
}

export const useAuth = () => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!keycloak.authenticated);
    const [token, setToken] = useState<string | undefined>(keycloak.token);
    const [user, setUser] = useState<UserProfile | null>(null);

    const loadUserProfile = useCallback(() => {
        if (keycloak.tokenParsed) {
            const parsed = keycloak.tokenParsed;
            setUser({
                id: parsed.sub || '',
                username: parsed.preferred_username || '',
                email: parsed.email || '',
                name: parsed.name || parsed.preferred_username || '',
                roles: keycloak.realmAccess?.roles || []
            });
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

    return {
        isAuthenticated,
        token,
        user,
        login,
        logout,
        hasRole: (role: string) => user?.roles.some(r => r.toLowerCase() === role.toLowerCase()) || false
    };
};
