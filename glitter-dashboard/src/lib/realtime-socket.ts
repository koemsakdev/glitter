import { io, type Socket } from 'socket.io-client';
import { tokenStorage } from './token-storage';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

let socket: Socket | null = null;

/**
 * The tab's single live connection to the API (`/realtime` namespace).
 * The access token is read on every (re)connect, so a refreshed or new
 * session is picked up without creating another socket.
 */
export function getRealtimeSocket(): Socket {
    if (!socket) {
        socket = io(`${API_URL}/realtime`, {
            transports: ['websocket', 'polling'],
            auth: (cb) => cb({ token: tokenStorage.getAccessToken() ?? '' }),
            reconnectionDelay: 1000,
            reconnectionDelayMax: 8000,
        });
    }
    return socket;
}
