'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Branch } from '@/types/branch';
import { useAuthStore } from '@/stores/auth-store';

/** Sentinel value meaning "show data across all branches" */
export const ALL_BRANCHES = 'all' as const;

/** Either a branch UUID or the ALL_BRANCHES sentinel */
export type BranchSelection = string | typeof ALL_BRANCHES;

interface BranchContextState {
    /** Currently selected branch ID, or 'all' for global view */
    selectedBranchId: BranchSelection;
    /** Cached snapshot for display when a real branch is selected (null when 'all') */
    selectedBranchSnapshot: Branch | null;
    /** Pick a real branch (sets snapshot, persists) */
    setSelectedBranch: (branch: Branch) => void;
    /** Switch to the global "all branches" view */
    setAllBranches: () => void;
    /** Rehydrate snapshot after page reload */
    rehydrateSnapshot: (branch: Branch) => void;
}

export const useBranchContext = create<BranchContextState>()(
    persist(
        (set) => ({
            // Default: 'all' (Option C — default to All, remember last choice)
            selectedBranchId: ALL_BRANCHES,
            selectedBranchSnapshot: null,
            setSelectedBranch: (branch) =>
                set({
                    selectedBranchId: branch.id,
                    selectedBranchSnapshot: branch,
                }),
            setAllBranches: () =>
                set({
                    selectedBranchId: ALL_BRANCHES,
                    selectedBranchSnapshot: null,
                }),
            rehydrateSnapshot: (branch) =>
                set({ selectedBranchSnapshot: branch }),
        }),
        {
            name: 'glitter-branch-context',
            // Only persist the id; snapshot rehydrates from the server on the next load
            partialize: (state) => ({
                selectedBranchId: state.selectedBranchId,
            }),
        },
    ),
);

/**
 * The branch a manager/cashier is locked to (their assigned branch), or null
 * for admins, who can switch freely. The API enforces the same rule.
 */
export function useLockedBranchId(): string | null {
    return useAuthStore((s) =>
        s.user && s.user.role !== 'admin'
            ? (s.user.branchId ?? NO_BRANCH)
            : null,
    );
}

/**
 * Lock value for a manager/cashier with no branch assigned yet: they match no
 * branch, so they see no branch data (the API refuses them too) instead of
 * falling back to the admin's "all branches" view.
 */
export const NO_BRANCH = '__no-branch__';

/**
 * Selector — the branch the dashboard is showing, or null for "all".
 * Managers/cashiers always get their own branch.
 */
export function useSelectedBranchId(): string | null {
    const locked = useLockedBranchId();
    const id = useBranchContext((s) => s.selectedBranchId);
    if (locked) return locked;
    return id === ALL_BRANCHES ? null : id;
}

/** Selector — true when the user wants a global view */
export function useIsAllBranches(): boolean {
    return useBranchContext((s) => s.selectedBranchId === ALL_BRANCHES);
}
