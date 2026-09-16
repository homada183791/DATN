import { io, type Socket, type ManagerOptions, type SocketOptions } from 'socket.io-client';

/**
 * Resolves the Socket.io server URL.
 * 1. Uses VITE_SOCKET_URL if defined in .env
 * 2. In local development (localhost on Vite dev ports e.g. 5173, 5174), defaults to http://localhost:3000
 * 3. Otherwise falls back to window.location.origin
 */
export function getSocketUrl(): string {
  const envUrl = (import.meta.env.VITE_SOCKET_URL as string | undefined)?.trim();
  if (envUrl) {
    return envUrl;
  }

  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' && window.location.port !== '3000') {
      return 'http://localhost:3000';
    }
    return window.location.origin;
  }

  return 'http://localhost:3000';
}

/**
 * Creates a Socket.io client instance with recommended defaults
 * (websocket + polling fallback, 10s connection timeout).
 */
export function createSocket(opts?: Partial<ManagerOptions & SocketOptions>): Socket {
  const url = getSocketUrl();
  return io(url, {
    transports: ['websocket', 'polling'],
    timeout: 10000,
    ...opts,
  });
}
