/**
 * Service Worker Registration & Real-time Update Manager for SuperMillonario Destiny Lottery.
 *
 * Handles:
 * - Registering /sw.js with immediate activation
 * - Listening for SW updates and controller changes without breaking active user sessions or cards
 * - Communication relay between React app and Service Worker
 * - Periodic background update checks
 */

type ServiceWorkerCallback = (event: { type: string; payload?: any }) => void;

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private listeners: Set<ServiceWorkerCallback> = new Set();
  private isRegistered = false;

  public async register(): Promise<void> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.log('[SW] Service Workers not supported in this environment');
      return;
    }

    try {
      const reg = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      this.registration = reg;
      this.isRegistered = true;

      // Handle when a new service worker is installing
      reg.addEventListener('updatefound', () => {
        const installingWorker = reg.installing;
        if (!installingWorker) return;

        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              console.log('[SW] New version detected and ready. Activating immediately.');
              installingWorker.postMessage({ type: 'SKIP_WAITING' });
              this.notifyListeners({ type: 'SW_UPDATED' });
            } else {
              console.log('[SW] Service Worker installed for the first time.');
              this.notifyListeners({ type: 'SW_INSTALLED' });
            }
          }
        });
      });

      // Handle controllerchange: new SW has taken control
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        console.log('[SW] Active controller changed. Real-time updates active.');
        this.notifyListeners({ type: 'SW_CONTROLLER_CHANGED' });
      });

      // Listen for incoming messages from Service Worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (!event.data) return;
        this.notifyListeners(event.data);
      });

      // Periodically check for SW updates every 15 minutes in background
      setInterval(() => {
        this.checkForUpdates();
      }, 15 * 60 * 1000);

      // Check on window focus
      window.addEventListener('focus', () => {
        this.checkForUpdates();
      });

      console.log('[SW] Registered successfully with scope:', reg.scope);
    } catch (error) {
      console.warn('[SW] Registration failed (safe in sandbox or non-https):', error);
    }
  }

  public async checkForUpdates(): Promise<void> {
    if (!this.registration) return;
    try {
      await this.registration.update();
    } catch (e) {
      // Ignored if offline
    }
  }

  public postMessage(type: string, payload?: any): void {
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({ type, payload });
    }
  }

  public addListener(callback: ServiceWorkerCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(data: { type: string; payload?: any }): void {
    this.listeners.forEach((cb) => {
      try {
        cb(data);
      } catch (e) {
        console.error('[SW Listener Error]:', e);
      }
    });
  }
}

export const swManager = new ServiceWorkerManager();
