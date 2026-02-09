import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import keycloak from './configs/auth.config.ts'

const root = createRoot(document.getElementById('root')!);

// Add detailed logging
// console.log('Keycloak Config:', {
//   url: import.meta.env.VITE_KEYCLOAK_URL,
//   realm: import.meta.env.VITE_KEYCLOAK_REALM,
//   clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
// });

let initAttempts = 0;
const MAX_INIT_ATTEMPTS = 3;

function initKeycloak() {
  if (initAttempts >= MAX_INIT_ATTEMPTS) {
    console.error('Max Keycloak init attempts reached');
    root.render(
      <div className="p-4 text-red-600">
        <h1>Authentication Error</h1>
        <p>Unable to connect to authentication server after {MAX_INIT_ATTEMPTS} attempts.</p>
        <p>Please check your network connection and try again.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
        >
          Retry
        </button>
      </div>
    );
    return;
  }

  initAttempts++;
  console.log(`Keycloak init attempt ${initAttempts}/${MAX_INIT_ATTEMPTS}`);

  keycloak.init({
    onLoad: 'check-sso',
    pkceMethod: 'S256',
    checkLoginIframe: false,
    // enableLogging: true, // Disable Keycloak debug logs
    silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
  }).then((authenticated) => {
    if (authenticated) {
      console.log('✅ Authenticated with Keycloak');
    } else {
      console.warn('⚠️ Not authenticated, proceeding as Guest...');
    }

    // Always render the app. Protected routes will enforce login.
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  }).catch((error) => {
    console.error('❌ Keycloak init failed:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });

    // Prevent infinite loop - show error instead of retrying
    root.render(
      <div className="p-4 text-red-600">
        <h1>Authentication Configuration Error</h1>
        <p className="mt-2">Failed to initialize authentication (attempt {initAttempts}/{MAX_INIT_ATTEMPTS})</p>
        <details className="mt-4">
          <summary className="cursor-pointer font-semibold">Error Details</summary>
          <pre className="mt-2 p-2 bg-gray-100 text-sm overflow-auto">{JSON.stringify({
            error: error.message,
            config: {
              url: import.meta.env.VITE_KEYCLOAK_URL,
              realm: import.meta.env.VITE_KEYCLOAK_REALM,
              clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
            }
          }, null, 2)}</pre>
        </details>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
        >
          Retry
        </button>
      </div>
    );
  });
}

initKeycloak();
