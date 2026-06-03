'use client';

import { useI18n } from '@/lib/i18n';
import { resolveBadgeDisplay, type ProductBadge } from '@/types/product-badge';

interface ProductBadgeDisplayProps {
    badges: ProductBadge[];
    /** Show only currently active badges (default: true). Set false to show all (admin). */
    activeOnly?: boolean;
    size?: 'sm' | 'md';
}

export function ProductBadgeDisplay({
                                        badges,
                                        activeOnly = true,
                                        size = 'md',
                                    }: ProductBadgeDisplayProps) {
    const { language } = useI18n();

    const displayed = activeOnly
        ? badges.filter((b) => b.isActive)
        : badges;

    if (displayed.length === 0) return null;

    const sizeClasses =
        size === 'sm'
            ? 'px-2 py-0.5 text-[10px]'
            : 'px-2.5 py-1 text-xs';

    return (
        <div className="flex flex-wrap gap-1.5">
            {displayed.map((badge) => {
                const { label, color } = resolveBadgeDisplay(badge, language);
                return (
                    <span
                        key={badge.id}
                        className={`inline-flex items-center rounded-full font-semibold uppercase tracking-wider text-white shadow-sm ${sizeClasses}`}
                        style={{ backgroundColor: color }}
                    >
            {label}
          </span>
                );
            })}
        </div>
    );
}