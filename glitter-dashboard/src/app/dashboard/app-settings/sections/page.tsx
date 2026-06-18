'use client';

import { ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    SettingsCard,
    SettingsPage,
    inputClass,
} from '@/features/settings/components/settings-shared';
import type { StoreConfig } from '@/features/settings/store-config';

export default function SectionsSettingsPage() {
    return (
        <SettingsPage
            title="Home sections"
            subtitle="Rename, show/hide, or reorder the storefront home sections"
        >
            {({ config, setConfig }) => {
                const setSection = (
                    id: string,
                    patch: Partial<StoreConfig['sections'][number]>,
                ) =>
                    setConfig((prev) => ({
                        ...prev,
                        sections: prev.sections.map((s) =>
                            s.id === id ? { ...s, ...patch } : s,
                        ),
                    }));
                const move = (index: number, dir: -1 | 1) =>
                    setConfig((prev) => {
                        const next = [...prev.sections];
                        const target = index + dir;
                        if (target < 0 || target >= next.length) return prev;
                        [next[index], next[target]] = [
                            next[target],
                            next[index],
                        ];
                        return { ...prev, sections: next };
                    });

                return (
                    <SettingsCard title="Home sections">
                        <div className="space-y-3">
                            {config.sections.map((section, i) => (
                                <div
                                    key={section.id}
                                    className="rounded-lg border border-border/60 bg-muted/20 p-3"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="rounded bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                                            {section.type}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="size-8"
                                                disabled={i === 0}
                                                onClick={() => move(i, -1)}
                                            >
                                                <ChevronUp className="size-4" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="size-8"
                                                disabled={
                                                    i ===
                                                    config.sections.length - 1
                                                }
                                                onClick={() => move(i, 1)}
                                            >
                                                <ChevronDown className="size-4" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="size-8"
                                                onClick={() =>
                                                    setSection(section.id, {
                                                        enabled:
                                                            !section.enabled,
                                                    })
                                                }
                                                title={
                                                    section.enabled
                                                        ? 'Hide'
                                                        : 'Show'
                                                }
                                            >
                                                {section.enabled ? (
                                                    <Eye className="size-4" />
                                                ) : (
                                                    <EyeOff className="size-4 text-muted-foreground" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                        <Input
                                            value={section.titleEn}
                                            onChange={(e) =>
                                                setSection(section.id, {
                                                    titleEn: e.target.value,
                                                })
                                            }
                                            placeholder="Title (English)"
                                            className={inputClass}
                                        />
                                        <Input
                                            value={section.titleKm}
                                            onChange={(e) =>
                                                setSection(section.id, {
                                                    titleKm: e.target.value,
                                                })
                                            }
                                            placeholder="ចំណងជើង (ខ្មែរ)"
                                            className={inputClass}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </SettingsCard>
                );
            }}
        </SettingsPage>
    );
}
