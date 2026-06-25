'use client';

import { useI18n } from '@/lib/i18n';
import {
    badgeTintStyle,
    resolveBadgeDisplay,
    type ProductBadge,
} from '@/types/product-badge';
import { useBadges } from '@/features/badges/use-badges';

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
    const { data: catalog } = useBadges();

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
                const { label, color } = resolveBadgeDisplay(
                    badge,
                    language,
                    catalog,
                );
                return (
                    <span
                        key={badge.id}
                        className={`inline-flex items-center rounded-full border font-semibold uppercase tracking-wider ${sizeClasses}`}
                        style={badgeTintStyle(color)}
                    >
            {label}
          </span>
                );
            })}
        </div>
    );
}