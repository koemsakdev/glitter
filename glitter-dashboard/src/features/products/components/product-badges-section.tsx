'use client';

import {X} from 'lucide-react';
import * as React from 'react';
import {useI18n} from '@/lib/i18n';
import {
    ALL_BADGE_TYPES,
    BADGE_DEFAULTS,
    type BadgeType,
} from '@/types/product-badge';
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

    const selectedTypes = new Set(state.slots.map((s) => s.badgeType));
    const availableTypes = ALL_BADGE_TYPES.filter(
        (type) => !selectedTypes.has(type),
    );
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

    function getLabel(type: BadgeType): string {
        const defaults = BADGE_DEFAULTS[type];
        return language === 'km' ? defaults.labelKm : defaults.labelEn;
    }

    return (
        <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
                {t('product.badges.help').replace('{max}', String(MAX_BADGES))}
            </p>

            {/* Selected badges */}
            {state.slots.length > 0 && (
                <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                        {t('product.badges.selected')} ({state.slots.length}/{MAX_BADGES})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {state.slots.map((slot) => {
                            const color = BADGE_DEFAULTS[slot.badgeType].color;
                            return (
                                <button
                                    key={slot.id}
                                    type="button"
                                    onClick={() => handleRemove(slot)}
                                    className="group flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium text-white shadow-sm transition-all hover:shadow-md"
                                    style={{backgroundColor: color, borderColor: color}}
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
                            const color = BADGE_DEFAULTS[type].color;
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
                                            e.currentTarget.style.backgroundColor = color;
                                            e.currentTarget.style.color = '#fff';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                        e.currentTarget.style.color = color;
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