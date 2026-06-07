'use client';

import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n';
import type { BranchStatus } from '@/types/branch';

const STYLES: Record<BranchStatus, { bg: string; dot: string }> = {
    active: {
        bg: 'bg-pink-100 text-pink-700 hover:bg-pink-100 dark:bg-pink-500/15 dark:text-pink-300 dark:hover:bg-pink-500/15',
        dot: 'bg-pink-500 dark:bg-pink-400',
    },
    inactive: {
        bg: 'bg-slate-100 text-slate-700 hover:bg-slate-100 dark:bg-slate-500/15 dark:text-slate-300 dark:hover:bg-slate-500/15',
        dot: 'bg-slate-500 dark:bg-slate-400',
    },
    closed: {
        bg: 'bg-zinc-100 text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-500/15 dark:text-zinc-400 dark:hover:bg-zinc-500/15',
        dot: 'bg-zinc-500 dark:bg-zinc-400',
    },
};

export function BranchStatusBadge({ status }: { status: BranchStatus }) {
    const { t } = useI18n();
    const style = STYLES[status];

    const labels: Record<BranchStatus, string> = {
        active: t('branch.status.active'),
        inactive: t('branch.status.inactive'),
        closed: t('branch.status.closed'),
    };

    return (
        <Badge className={style.bg}>
      <span
          className={`mr-1 inline-block size-1.5 rounded-full ${style.dot}`}
      />
            {labels[status]}
        </Badge>
    );
}