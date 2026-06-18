'use client';

import { Checkbox } from '@/components/ui/checkbox';
import {
    BilingualField,
    SettingsCard,
    SettingsPage,
    TextField,
} from '@/features/settings/components/settings-shared';

export default function HomeSettingsPage() {
    return (
        <SettingsPage title="Home" subtitle="Hero banner and announcement bar">
            {({ config, set }) => (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <SettingsCard title="Hero banner">
                        <BilingualField
                            label="Title"
                            en={config.heroTitleEn}
                            km={config.heroTitleKm}
                            onEn={(v) => set('heroTitleEn', v)}
                            onKm={(v) => set('heroTitleKm', v)}
                        />
                        <BilingualField
                            label="Subtitle"
                            en={config.heroSubtitleEn}
                            km={config.heroSubtitleKm}
                            onEn={(v) => set('heroSubtitleEn', v)}
                            onKm={(v) => set('heroSubtitleKm', v)}
                            textarea
                        />
                        <BilingualField
                            label="Button label"
                            en={config.heroCtaEn}
                            km={config.heroCtaKm}
                            onEn={(v) => set('heroCtaEn', v)}
                            onKm={(v) => set('heroCtaKm', v)}
                        />
                        <TextField
                            label="Button link"
                            value={config.heroCtaHref}
                            onChange={(v) => set('heroCtaHref', v)}
                            placeholder="/products"
                        />
                    </SettingsCard>

                    <SettingsCard title="Announcement bar">
                        <label className="flex cursor-pointer items-center gap-2">
                            <Checkbox
                                checked={config.announcementEnabled}
                                onCheckedChange={(v) =>
                                    set('announcementEnabled', Boolean(v))
                                }
                            />
                            <span className="text-sm font-medium">
                                Show announcement bar
                            </span>
                        </label>
                        <BilingualField
                            label="Announcement text"
                            en={config.announcementEn}
                            km={config.announcementKm}
                            onEn={(v) => set('announcementEn', v)}
                            onKm={(v) => set('announcementKm', v)}
                            textarea
                        />
                    </SettingsCard>
                </div>
            )}
        </SettingsPage>
    );
}
