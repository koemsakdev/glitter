'use client';

import { create } from 'zustand';

/** A record whose audit trail is shown. `entity` = API record type. */
export interface AuditTarget {
    entity: string;
    id: string;
    label?: string | null;
}

interface AuditTrailState {
    target: AuditTarget | null;
    open: boolean;
    show: (target: AuditTarget) => void;
    setOpen: (open: boolean) => void;
}

/** Open the (single, global) Audit trail drawer from any table row. */
export const useAuditTrail = create<AuditTrailState>((set) => ({
    target: null,
    open: false,
    show: (target) => set({ target, open: true }),
    setOpen: (open) => set({ open }),
}));
