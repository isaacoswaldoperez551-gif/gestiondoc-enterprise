import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { handleMockRequest } from './utils/mockBackend';

// Intercept fetch safely to provide smooth fallback if server is unreachable
if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
  try {
    const originalFetch = window.fetch.bind(window);
    const customFetch = async function (
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> {
      const urlString =
        typeof input === 'string'
          ? input
          : input instanceof Request
          ? input.url
          : input.toString();

      // Handle all /api/ calls via the live Firestore-synchronized client engine
      if (urlString.includes('/api/')) {
        try {
          const mockRes = await handleMockRequest(urlString, init);
          if (mockRes) return mockRes;
        } catch (mockError) {
          console.warn('[GestiónDoc] Error en motor Firestore /api:', mockError);
        }

        // Fallback to original network fetch if not handled
        return originalFetch(input, init);
      }

      return originalFetch(input, init);
    };

    // Safely assign fetch avoiding getter-only property errors
    try {
      window.fetch = customFetch;
    } catch {
      Object.defineProperty(window, 'fetch', {
        value: customFetch,
        writable: true,
        configurable: true,
      });
    }
  } catch (err) {
    console.warn('[GestiónDoc] No se pudo interceptar fetch global:', err);
  }
}

createRoot(document.getElementById('root')!).render(<App />);
