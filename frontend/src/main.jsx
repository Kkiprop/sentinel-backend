import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './style.css';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { initOfflineSync } from './lib/offline.js';

const renderApp = () => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
};

if (typeof window !== 'undefined') {
  initOfflineSync()
    .catch((error) => {
      console.warn('Offline initialization failed:', error);
    })
    .finally(renderApp);
} else {
  renderApp();
}
