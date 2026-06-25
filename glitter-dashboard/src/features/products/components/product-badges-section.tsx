'use client';

import {Settings2, X} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import {useI18n} from '@/lib/i18n';
import {badgeTintStyle, hexToRgba, type BadgeType} from '@/types/product-badge';
import {useBadges} from '@/features/badges/use-badges';
import type {Badge} from '@/types/badge';
import type {BadgeEditorState, BadgeSlot} from '@/types/product';

const MAX_BADGES = 2;

interface ProductBadgesSectionProps {
    state: BadgeEditorState;
    onChange: (state: BadgeEditorState) => void;
}

export function ProductBadgesSection({
                                         state,
                                         onChange,
                                     }: ProductBadgesSectionProps) {
    const {t, language} = useI18n();
    const {data: badges = []} = useBadges();

    const cfg = (slug: BadgeType): Badge | undefined =>
        badges.find((b) => b.slug === slug);

    const selectedTypes = new Set(state.slots.map((s) => s.badgeType));
    const availableTypes = badges
        .filter((b) => b.active && !selectedTypes.has(b.slug))
        .map((b) => b.slug);
    const atLimit = state.slots.length >= MAX_BADGES;

    function handleAdd(type: BadgeType) {
        if (atLimit) return;
        const newSlot: BadgeSlot = {
            id: `new-${type}`,
            isExisting: false,
            badgeType: type,
        };
        onChange({...state, slots: [...state.slots, newSlot]});
    }

    function handleRemove(slot: BadgeSlot) {
        const slots = state.slots.filter((s) => s.id !== slot.id);
        const deletedIds = slot.isExisting
            ? [...state.deletedIds, slot.id]
            : state.deletedIds;
        onChange({slots, deletedIds});
    }

    function colorOf(slug: BadgeType): string {
        return cfg(slug)?.color ?? '#64748b';
    }

    function getLabel(slug: BadgeType): string {
        const c = cfg(slug);
        if (!c) return slug;
        return (language === 'km' ? c.nameKm : c.nameEn) || c.slug;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                    {t('product.badges.help').replace('{max}', String(MAX_BADGES))}
                </p>
                <Link
                    href="/dashboard/badges"
                    className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-pink-600 hover:underline dark:text-pink-400"
                >
                    <Settings2 className="size-3.5" />
                    {t('badge.manage')}
                </Link>
            </div>

            {/* Selected badges */}
            {state.slots.length > 0 && (
                <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                        {t('product.badges.selected')} ({state.slots.length}/{MAX_BADGES})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {state.slots.map((slot) => {
                            const color = colorOf(slot.badgeType);
                            return (
                                <button
                                    key={slot.id}
                                    type="button"
                                    onClick={() => handleRemove(slot)}
                                    className="group flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-all hover:shadow-sm"
                                    style={badgeTintStyle(color)}
                                    title={t('product.badges.removeTitle')}
                                >
                                    <span>{getLabel(slot.badgeType)}</span>
                                    <X className="size-3 opacity-80 group-hover:opacity-100"/>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Available badges */}
            <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                    {t('product.badges.available')}
                </p>
                {availableTypes.length === 0 ? (
                    <p className="text-xs italic text-muted-foreground">
                        {t('product.badges.allSelected')}
                    </p>
                ) : (
                    <div className="flex flex-wrap gap-1.5">
                        {availableTypes.map((type) => {
                            const color = colorOf(type);
                            return (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => handleAdd(type)}
                                    disabled={atLimit}
                                    className="rounded-full border px-2.5 py-1 text-xs font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40"
                                    style={{
                                        color: color,
                                        borderColor: color,
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!atLimit) {
                                            e.currentTarget.style.backgroundColor =
                                                hexToRgba(color, 0.15);
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                >
                                    {getLabel(type)}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {atLimit && availableTypes.length > 0 && (
                <p className="text-xs italic text-amber-600 dark:text-amber-400">
                    {t('product.badges.maxReached').replace('{max}', String(MAX_BADGES))}
                </p>
            )}
        </div>
    );
}