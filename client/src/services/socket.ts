import { io, Socket } from 'socket.io-client';
import {
  ClientToServerEvents,
  ServerToClientEvents,
} from '../types/shared';

export function getServerUrl(): string {
  if (import.meta.env.VITE_SERVER_URL) {
    return (import.meta.env.VITE_SERVER_URL as string).replace(/\/$/, '');
  }
  if (typeof window === 'undefined') return 'http://localhost:4000';
  const hostname = window.location.hostname || 'localhost';
  return `http://${hostname}:4000`;
}

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export const socket: AppSocket = io(getServerUrl(), {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 10000,
  transports: ['websocket', 'polling'],
});
