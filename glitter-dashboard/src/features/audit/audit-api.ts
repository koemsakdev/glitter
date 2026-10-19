import { apiClient } from '@/lib/api-client';

export type AuditAction =
    | 'create'
    | 'update'
    | 'delete'
    | 'status'
    | 'stock'
    | 'login'
    | 'logout'
    | 'login_failed'
    | 'password'
    | 'other';

export interface AuditLog {
    id: string;
    createdAt: string;
    actorId: string | null;
    actorName: string;
    actorUsername: string | null;
    actorRole: string;
    actorBranchId: string | null;
    action: AuditAction;
    entity: string;
    entityId: string | null;
    label: string | null;
    details: Record<string, unknown> | null;
    method: string;
    path: string;
}

export interface AuditQuery {
    page?: number;
    limit?: number;
    actorId?: string;
    entity?: string;
    action?: string;
    search?: string;
}

export const auditApi = {
    async list(query: AuditQuery) {
        const { data } = await apiClient.get<{
            data: AuditLog[];
            total: number;
            page: number;
            limit: number;
        }>('/api/audit-logs', { params: query });
        return data;
    },
};

export interface LoginAttempt {
    id: string;
    createdAt: string;
    success: boolean;
    failureReason: string | null;
    usernameTried: string;
    userId: string | null;
    userName: string | null;
    userRole: string | null;
    ip: string;
    forwardedFor: string | null;
    country: string | null;
    countryCode: string | null;
    region: string | null;
    city: string | null;
    latitude: number | null;
    longitude: number | null;
    isp: string | null;
    ipTimezone: string | null;
    userAgent: string | null;
    browser: string | null;
    os: string | null;
    deviceType: string | null;
    clientInfo: Record<string, unknown> | null;
}

export interface LoginSummary {
    last24h: { successful: number; failed: number; failedIps: number };
    topFailingIps: {
        ip: string;
        attempts: number;
        country: string | null;
        city: string | null;
        last: string;
        usernames: string;
    }[];
    newCountrySignIns: {
        userName: string;
        country: string;
        city: string | null;
        at: string;
    }[];
}

export const loginApi = {
    async list(q: {
        page?: number;
        limit?: number;
        success?: 'true' | 'false';
        search?: string;
        ip?: string;
    }) {
        const { data } = await apiClient.get<{
            data: LoginAttempt[];
            total: number;
        }>('/api/audit-logs/logins', { params: q });
        return data;
    },
    async summary() {
        const { data } = await apiClient.get<{ data: LoginSummary }>(
            '/api/audit-logs/logins/summary',
        );
        return data.data;
    },
};
