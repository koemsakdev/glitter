'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';
const ACCESS_KEY = 'glitter_access';
const REFRESH_KEY = 'glitter_refresh';

export type AuthProvider = 'email' | 'google' | 'facebook' | 'telegram';

export interface AuthUser {
    id: string;
    email: string | null;
    fullName: string | null;
    phoneNumber: string | null;
    profileImageUrl: string | null;
    role: string;
    emailVerifiedAt: string | null;
    phoneVerifiedAt: string | null;
    /** Providers linked to this account (from /api/auth/me). */
    linkedProviders?: AuthProvider[];
    createdAt?: string;
}

export interface RegisterValues {
    fullName: string;
    email: string;
    password: string;
    phoneNumber?: string;
}

export interface TelegramAuthData {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    auth_date: number;
    hash: string;
}

interface AuthContextValue {
    user: AuthUser | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    loginWithGoogle: (idToken: string) => Promise<void>;
    loginWithTelegram: (payload: TelegramAuthData) => Promise<void>;
    /** Link an OAuth provider to the CURRENT account (Connect flow). */
    linkProvider: (
        provider: 'google' | 'telegram',
        body: Record<string, unknown>,
    ) => Promise<void>;
    register: (values: RegisterValues) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    /** Fetch with bearer token + automatic refresh on 401. */
    authFetch: (path: string, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function saveTokens(tokens: {
    accessToken?: string | null;
    refreshToken?: string | null;
}) {
    if (tokens.accessToken) localStorage.setItem(ACCESS_KEY, tokens.accessToken);
    if (tokens.refreshToken)
        localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
}
function clearTokens() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    const tryRefresh = useCallback(async (): Promise<boolean> => {
        const rt =
            typeof window !== 'undefined'
                ? localStorage.getItem(REFRESH_KEY)
                : null;
        if (!rt) return false;
        try {
            const res = await fetch(`${API_URL}/api/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: rt }),
            });
            if (!res.ok) return false;
            const data = (await res.json()) as {
                tokens: { accessToken: string; refreshToken: string };
            };
            saveTokens(data.tokens);
            return true;
        } catch {
            return false;
        }
    }, []);

    const authFetch = useCallback(
        async (path: string, init: RequestInit = {}): Promise<Response> => {
            const run = (token: string | null) => {
                const headers = new Headers(init.headers);
                if (token) headers.set('Authorization', `Bearer ${token}`);
                // Let the browser set the multipart boundary for FormData;
                // only default to JSON for plain bodies.
                if (
                    init.body &&
                    !(init.body instanceof FormData) &&
                    !headers.has('Content-Type')
                )
                    headers.set('Content-Type', 'application/json');
                return fetch(`${API_URL}${path}`, { ...init, headers });
            };
            let token = localStorage.getItem(ACCESS_KEY);
            let res = await run(token);
            if (res.status === 401 && (await tryRefresh())) {
                token = localStorage.getItem(ACCESS_KEY);
                res = await run(token);
            }
            return res;
        },
        [tryRefresh],
    );

    const refreshUser = useCallback(async () => {
        const res = await authFetch('/api/auth/me');
        if (res.ok) {
            const data = (await res.json()) as { data: AuthUser };
            setUser(data.data);
        } else {
            clearTokens();
            setUser(null);
        }
    }, [authFetch]);

    useEffect(() => {
        if (!localStorage.getItem(ACCESS_KEY)) {
            setLoading(false);
            return;
        }
        refreshUser().finally(() => setLoading(false));
    }, [refreshUser]);

    const login = useCallback(
        async (email: string, password: string) => {
            const res = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            if (!res.ok) {
                const e = (await res.json().catch(() => ({}))) as {
                    message?: string;
                };
                throw new Error(e.message || 'Login failed');
            }
            const data = (await res.json()) as {
                user: AuthUser;
                tokens: { accessToken: string; refreshToken: string };
            };
            saveTokens(data.tokens);
            setUser(data.user);
        },
        [],
    );

    const loginWithGoogle = useCallback(async (idToken: string) => {
        const res = await fetch(`${API_URL}/api/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
        });
        if (!res.ok) {
            const e = (await res.json().catch(() => ({}))) as {
                message?: string;
            };
            throw new Error(e.message || 'Google sign-in failed');
        }
        const data = (await res.json()) as {
            user: AuthUser;
            tokens: { accessToken: string; refreshToken: string };
        };
        saveTokens(data.tokens);
        setUser(data.user);
    }, []);

    const loginWithTelegram = useCallback(
        async (payload: TelegramAuthData) => {
            const res = await fetch(`${API_URL}/api/auth/telegram`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const e = (await res.json().catch(() => ({}))) as {
                    message?: string;
                };
                throw new Error(e.message || 'Telegram sign-in failed');
            }
            const data = (await res.json()) as {
                user: AuthUser;
                tokens: { accessToken: string; refreshToken: string };
            };
            saveTokens(data.tokens);
            setUser(data.user);
        },
        [],
    );

    const register = useCallback(async (values: RegisterValues) => {
        const res = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(values),
        });
        if (!res.ok) {
            const e = (await res.json().catch(() => ({}))) as {
                message?: string | string[];
            };
            const msg = Array.isArray(e.message) ? e.message[0] : e.message;
            throw new Error(msg || 'Registration failed');
        }
        const data = (await res.json()) as {
            user: AuthUser;
            tokens: { accessToken: string; refreshToken: string };
        };
        saveTokens(data.tokens);
        setUser(data.user);
    }, []);

    const linkProvider = useCallback(
        async (
            provider: 'google' | 'telegram',
            body: Record<string, unknown>,
        ) => {
            const res = await authFetch(`/api/auth/${provider}/link`, {
                method: 'POST',
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const e = (await res.json().catch(() => ({}))) as {
                    message?: string;
                };
                throw new Error(e.message || 'Could not connect account');
            }
            await refreshUser();
        },
        [authFetch, refreshUser],
    );

    const logout = useCallback(async () => {
        try {
            await authFetch('/api/auth/logout', { method: 'POST' });
        } catch {
            // ignore — clear locally regardless
        }
        clearTokens();
        setUser(null);
    }, [authFetch]);

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                login,
                loginWithGoogle,
                loginWithTelegram,
                linkProvider,
                register,
                logout,
                refreshUser,
                authFetch,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
