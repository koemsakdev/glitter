'use client';

import { Check, ChevronDown, Globe2, MapPin, Plus } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useActiveBranches } from '@/features/branches/use-branches';
import { useI18n } from '@/lib/i18n';
import {
    ALL_BRANCHES,
    useBranchContext,
} from '@/stores/use-branch-context';
import type { Branch } from '@/types/branch';

export function BranchSwitcher() {
    const { t, language } = useI18n();

    const {
        selectedBranchId,
        selectedBranchSnapshot,
        setSelectedBranch,
        setAllBranches,
        rehydrateSnapshot,
    } = useBranchContext();

    const { data: branches, isLoading } = useActiveBranches();

    const isAllBranches = selectedBranchId === ALL_BRANCHES;

    /**
     * Rehydrate the cached snapshot after page reload.
     * Also: if the persisted ID points to a deleted branch, fall back to 'all'.
     */
    React.useEffect(() => {
        if (!branches) return;
        if (isAllBranches) return;
        if (selectedBranchSnapshot?.id === selectedBranchId) return;

        const found = branches.find((b) => b.id === selectedBranchId);
        if (found) {
            rehydrateSnapshot(found);
        } else {
            // Persisted branch was deleted — fall back to 'all'
            setAllBranches();
        }
    }, [
        branches,
        isAllBranches,
        selectedBranchId,
        selectedBranchSnapshot,
        rehydrateSnapshot,
        setAllBranches,
    ]);

    // Empty state — no branches at all
    if (!isLoading && branches && branches.length === 0) {
        return (
            <Link
                href="/dashboard/branches/new"
                className="flex items-center gap-1.5 rounded-full border border-pink-300 bg-pink-50 px-3 py-1.5 text-sm font-medium text-pink-700 transition-colors hover:bg-pink-100 dark:border-pink-700 dark:bg-pink-500/10 dark:text-pink-300 dark:hover:bg-pink-500/15"
            >
                <Plus className="size-3.5" />
                <span className="hidden sm:inline">{t('branchSwitcher.addFirst')}</span>
                <span className="sm:hidden">{t('branchSwitcher.addShort')}</span>
            </Link>
        );
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-neutral-200 bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground dark:border-neutral-800">
                <span className="size-2 animate-pulse rounded-full bg-muted-foreground/40" />
                <span className="font-mono text-xs">...</span>
            </div>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <button
                        type="button"
                        className={`group flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1.5 text-sm font-semibold transition-colors ${
                            isAllBranches
                                ? 'border-neutral-300 bg-neutral-50 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-500/10 dark:text-neutral-300 dark:hover:bg-neutral-500/15'
                                : 'border-pink-300 bg-pink-50 text-pink-700 hover:bg-pink-100 dark:border-pink-700 dark:bg-pink-500/10 dark:text-pink-300 dark:hover:bg-pink-500/15'
                        }`}
                        aria-label={t('branchSwitcher.label')}
                    >
                        {isAllBranches ? (
                            <Globe2 className="size-3.5 shrink-0" />
                        ) : (
                            <span className="relative flex size-2 shrink-0">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-pink-400 opacity-75 dark:bg-pink-500" />
                <span className="relative inline-flex size-2 rounded-full bg-pink-500 dark:bg-pink-400" />
              </span>
                        )}

                        <span className="whitespace-nowrap font-mono text-xs">
              {isAllBranches
                  ? t('branchSwitcher.allShort')
                  : selectedBranchSnapshot?.branchCode ?? '...'}
            </span>

                        <ChevronDown className="size-3.5 shrink-0 opacity-70 transition-transform group-data-popup-open:rotate-180" />
                    </button>
                }
            />

            <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="min-w-64"
            >
                <DropdownMenuGroup>
                    <DropdownMenuLabel>{t('branchSwitcher.viewMode')}</DropdownMenuLabel>

                    {/* All branches option */}
                    <DropdownMenuItem
                        onClick={setAllBranches}
                        className="cursor-pointer"
                    >
                        <Globe2 className="size-4 shrink-0" />
                        <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm">
                {t('branchSwitcher.allBranches')}
              </span>
                            <span className="truncate text-xs text-muted-foreground">
                {t('branchSwitcher.allBranchesHelp')}
              </span>
                        </div>
                        {isAllBranches && (
                            <Check className="size-4 shrink-0 text-pink-500 dark:text-pink-300" />
                        )}
                    </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                {/* Individual branches */}
                <DropdownMenuGroup>
                    <DropdownMenuLabel>{t('branchSwitcher.branches')}</DropdownMenuLabel>

                    {branches?.map((branch) => (
                        <BranchMenuItem
                            key={branch.id}
                            branch={branch}
                            language={language}
                            isSelected={branch.id === selectedBranchId}
                            onSelect={() => setSelectedBranch(branch)}
                        />
                    ))}
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                {/* Add a new branch CTA */}
                <DropdownMenuItem
                    render={
                        <Link href="/dashboard/branches/new" className="cursor-pointer" />
                    }
                >
                    <Plus className="size-4 shrink-0" />
                    <span>{t('branchSwitcher.addNew')}</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function BranchMenuItem({
                            branch,
                            language,
                            isSelected,
                            onSelect,
                        }: {
    branch: Branch;
    language: 'en' | 'km';
    isSelected: boolean;
    onSelect: () => void;
}) {
    const name = language === 'km' ? branch.branchNameKm : branch.branchNameEn;

    return (
        <DropdownMenuItem onClick={onSelect} className="cursor-pointer">
            <MapPin className="size-4 shrink-0" />
            <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm">{name}</span>
                <span className="truncate font-mono text-[10px] text-muted-foreground">
          {branch.branchCode}
        </span>
            </div>
            {isSelected && (
                <Check className="size-4 shrink-0 text-pink-500 dark:text-pink-300" />
            )}
        </DropdownMenuItem>
    );
}