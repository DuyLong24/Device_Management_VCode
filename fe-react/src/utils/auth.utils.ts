
import keycloak from '../configs/auth.config';

export const getCurrentUser = () => {
    // 1. Ưu tiên lấy từ Keycloak Instance (đã parse sẵn)
    if (keycloak.tokenParsed) {
        return {
            id: keycloak.tokenParsed.sub,
            username: keycloak.tokenParsed.preferred_username,
            email: keycloak.tokenParsed.email,
            name: keycloak.tokenParsed.name || keycloak.tokenParsed.preferred_username,
            roles: keycloak.realmAccess?.roles || []
        };
    }

    // 2. Fallback: Nếu không có instance (lúc mới f5 chưa init xong), thử đọc localStorage
    try {
        const token = localStorage.getItem('accessToken');
        if (!token) return null;

        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        const decoded = JSON.parse(jsonPayload);
        return {
            id: decoded.sub,
            username: decoded.preferred_username,
            email: decoded.email,
            name: decoded.name || decoded.preferred_username,
            roles: decoded.realm_access?.roles || []
        };
    } catch (e) {
        console.error("Error decoding token:", e);
        return null;
    }
};
