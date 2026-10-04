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

      // If on GitHub Pages or if URL is an /api call
      if (urlString.includes('/api/')) {
        // If hosted statically on GitHub Pages, handle immediately via mock engine
        if (window.location.hostname.includes('github.io')) {
          const mockRes = await handleMockRequest(urlString, init);
          if (mockRes) return mockRes;
        }

        // Otherwise attempt network fetch, and if it fails (e.g. server down / CORS / 404), fallback to mock backend
        try {
          const res = await originalFetch(input, init);
          if (res.status === 404 || res.status === 502 || res.status === 503) {
            const mockRes = await handleMockRequest(urlString, init);
            if (mockRes) return mockRes;
          }
          return res;
        } catch (networkError) {
          console.warn(
            '[GestiónDoc] Backend no alcanzable. Usando motor cliente en memoria/demo.',
            networkError
          );
          const mockRes = await handleMockRequest(urlString, init);
          if (mockRes) return mockRes;
          throw networkError;
        }
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
