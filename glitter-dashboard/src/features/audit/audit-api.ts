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
    | 'blocked_request'
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
    ip: string | null;
    module: string;
    status: 'success' | 'failed' | 'blocked';
    responseStatus: number | null;
    changes: {
        old_value: Record<string, unknown> | null;
        new_value: Record<string, unknown> | null;
    } | null;
    isSuspicious: boolean;
    suspiciousReason: string | null;
    threatType: string | null;
    payload: string | null;
}

export interface AuditQuery {
    page?: number;
    limit?: number;
    actorId?: string;
    entity?: string;
    action?: string;
    search?: string;
    status?: string;
    suspicious?: 'true';
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
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
    eventType: 'login_attempt' | 'login_success' | 'logout';
    status: 'success' | 'failed' | 'blocked';
    failedAttemptCount: number;
    isVpnOrProxy: boolean | null;
    isHosting: boolean | null;
    sessionId: string | null;
    logoutAt: string | null;
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
        status?: 'success' | 'failed' | 'blocked';
        search?: string;
        ip?: string;
        sortBy?: string;
        sortOrder?: 'ASC' | 'DESC';
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

export interface SecurityAlert {
    id: string;
    createdAt: string;
    alertType: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    userId: string | null;
    userName: string | null;
    ipAddress: string | null;
    details: string;
    actionTaken: string;
    isResolved: boolean;
    resolvedByName: string | null;
    resolvedAt: string | null;
}

export interface IpBlock {
    id: string;
    createdAt: string;
    ip: string;
    blockedUntil: string;
    reason: string;
}

export const securityApi = {
    async alerts(q: {
        resolved?: 'true' | 'false';
        severity?: string;
        page?: number;
        limit?: number;
    }) {
        const { data } = await apiClient.get<{
            data: SecurityAlert[];
            total: number;
            open: number;
        }>('/api/audit-logs/alerts', { params: q });
        return data;
    },
    async resolve(id: string) {
        await apiClient.patch(`/api/audit-logs/alerts/${id}/resolve`);
    },
    async blocks() {
        const { data } = await apiClient.get<{ data: IpBlock[] }>(
            '/api/audit-logs/blocks',
        );
        return data.data;
    },
    async lift(ip: string) {
        await apiClient.patch(
            `/api/audit-logs/blocks/${encodeURIComponent(ip)}/lift`,
        );
    },
};

export interface TrailEntry extends AuditLog {
    /** Filled from the record's own dates — happened before audit logging. */
    synthetic?: boolean;
    location: {
        country: string | null;
        countryCode: string | null;
        region: string | null;
        city: string | null;
        isp: string | null;
        isVpnOrProxy: boolean | null;
    } | null;
    device: {
        browser: string | null;
        os: string | null;
        deviceType: string | null;
    } | null;
}

interface TrailActor {
    name: string | null;
    username: string | null;
    role: string | null;
    at: string;
}

export interface RecordTrail {
    entity: string;
    id: string;
    /** Names of records referenced in the changes, by id. */
    refs?: Record<string, string>;
    label: string | null;
    status: 'active' | 'deleted' | 'unknown' | 'not_found';
    summary: {
        created: TrailActor | null;
        lastModified: TrailActor | null;
        deleted: TrailActor | null;
        updatedAt: string | null;
        totalActions: number;
        /** The record existed before audit logging was switched on. */
        untrackedBefore?: boolean;
    };
    entries: TrailEntry[];
}

export interface DeletedRecord {
    entity: string;
    id: string;
    label: string | null;
    deletedAt: string;
    deletedBy: { name: string; username: string | null; at: string } | null;
}

export const recordsApi = {
    async trail(entity: string, id: string) {
        const { data } = await apiClient.get<{ data: RecordTrail }>(
            `/api/records/${entity}/${id}/trail`,
        );
        return data.data;
    },
    async deleted(q: { entity?: string; page?: number; limit?: number }) {
        const { data } = await apiClient.get<{
            data: DeletedRecord[];
            total: number;
            /** Days before the bin deletes a record automatically. */
            retentionDays?: number;
        }>('/api/records/deleted', { params: q });
        return data;
    },

    async restore(entity: string, id: string) {
        await apiClient.patch(`/api/records/${entity}/${id}/restore`);
    },
};
