import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { LanguageProvider } from './i18n/index.js';
import { ErrorBoundary } from './components/common/ErrorBoundary.jsx';
import './styles/global.css';

// Register Service Worker for offline PWA support via vite-plugin-pwa
if ('serviceWorker' in navigator) {
  import('virtual:pwa-register')
    .then(({ registerSW }) => {
      const updateSW = registerSW({
        onNeedRefresh() {
          console.log('[PWA] New content available; please refresh.');
        },
        onOfflineReady() {
          console.log('[PWA] Content cached for offline use.');
        }
      });
    })
    .catch((err) => {
      // In dev mode without pwa injection, catch smoothly
      console.debug('[PWA] virtual:pwa-register not loaded in non-PWA context', err);
    });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
