import { io, type Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5001';
const ACCESS_KEY = 'glitter_access';

let socket: Socket | null = null;

/**
 * The tab's single live connection to the API (`/realtime` namespace) —
 * shared by every component, so the store never holds more than one. The
 * access token is read on each (re)connect; signed-in shoppers join their
 * own room and receive their notifications instantly.
 */
export function getLiveSocket(): Socket {
    if (!socket) {
        socket = io(`${API_URL}/realtime`, {
            transports: ['websocket', 'polling'],
            auth: (cb) => {
                let token = '';
                try {
                    token = localStorage.getItem(ACCESS_KEY) ?? '';
                } catch {
                    // storage blocked — connect as a guest
                }
                cb({ token });
            },
            reconnectionDelay: 1000,
            reconnectionDelayMax: 8000,
        });
    }
    return socket;
}

/** Re-handshake (after sign-in / sign-out) so the server updates our rooms. */
export function reconnectLive(): void {
    getLiveSocket().disconnect().connect();
}

/**
 * Run `handler` whenever one of `entities` changes in the API. Returns an
 * unsubscribe function for useEffect cleanup.
 */
export function onLiveChange(
    entities: string[],
    handler: (entity: string) => void,
): () => void {
    const s = getLiveSocket();
    const wanted = new Set(entities);
    const listener = (event: { entity?: string }) => {
        if (event.entity && wanted.has(event.entity)) handler(event.entity);
    };
    s.on('change', listener);
    return () => {
        s.off('change', listener);
    };
}
