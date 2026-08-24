import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { swManager } from './services/serviceWorkerRegistration';

// Initialize Service Worker for background caching and cross-client synchronization
swManager.register().catch(() => {
  // Graceful fallback in environments without SW support
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

