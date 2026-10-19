import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { auditApi, type AuditQuery } from './audit-api';

export function useAuditLogs(query: AuditQuery) {
    return useQuery({
        queryKey: ['audit-logs', query],
        queryFn: () => auditApi.list(query),
        placeholderData: keepPreviousData,
        // Fresh-ish: new actions show up while the page is open.
        refetchInterval: 30_000,
    });
}
