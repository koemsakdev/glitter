'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Branch } from '@/types/branch';

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

/** Selector — returns the selected branch ID, or null if 'all' is selected */
export function useSelectedBranchId(): string | null {
    const id = useBranchContext((s) => s.selectedBranchId);
    return id === ALL_BRANCHES ? null : id;
}

/** Selector — true when the user wants a global view */
export function useIsAllBranches(): boolean {
    return useBranchContext((s) => s.selectedBranchId === ALL_BRANCHES);
}