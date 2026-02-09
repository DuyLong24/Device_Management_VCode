import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import keycloak from './configs/auth.config.ts'

const root = createRoot(document.getElementById('root')!);

keycloak.init({
  onLoad: 'check-sso',
  pkceMethod: 'S256',
  checkLoginIframe: false,
  silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
}).then((authenticated) => {
  if (authenticated) {
    console.log('Authenticated with Keycloak');
    // localStorage.setItem('accessToken', keycloak.token || '');
  } else {
    console.warn('Authentication failed');
  }

  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}).catch((error) => {
  console.error('Keycloak init failed', error);
  root.render(
    <div className="p-4 text-red-600">
      <h1>Authentication Configuration Error</h1>
      <pre>{JSON.stringify(error, null, 2)}</pre>
    </div>
  );
});
