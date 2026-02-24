import Keycloak from 'keycloak-js';

const keycloakConfig = {
    url: import.meta.env.VITE_KEYCLOAK_URL || 'https://keycloak.glorin.vn',
    realm: import.meta.env.VITE_KEYCLOAK_REALM || 'WMS',
    clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'device-management',
};

const keycloak = new Keycloak(keycloakConfig);

export default keycloak;
