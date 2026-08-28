import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// --- MATAR SERVICE WORKER VIEJO DEFINITIVAMENTE ---
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => reg.unregister());
  });
}
if (window.caches) {
  caches.keys().then((keys) => {
    keys.forEach((k) => caches.delete(k));
  });
}
localStorage.removeItem('sw-killed'); // limpieza
// --- FIN ---

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

