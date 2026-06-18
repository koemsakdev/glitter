'use client';

import { Input } from '@/components/ui/input';
import {
    BilingualField,
    SettingsCard,
    SettingsPage,
    TextField,
    inputClass,
} from '@/features/settings/components/settings-shared';

export default function GeneralSettingsPage() {
    return (
        <SettingsPage title="General" subtitle="Brand, colour and contact details">
            {({ config, set }) => (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <SettingsCard title="Branding">
                        <BilingualField
                            label="Shop name"
                            en={config.brandNameEn}
                            km={config.brandNameKm}
                            onEn={(v) => set('brandNameEn', v)}
                            onKm={(v) => set('brandNameKm', v)}
                        />
                        <BilingualField
                            label="Tagline"
                            en={config.taglineEn}
                            km={config.taglineKm}
                            onEn={(v) => set('taglineEn', v)}
                            onKm={(v) => set('taglineKm', v)}
                        />
                    </SettingsCard>

                    <SettingsCard title="Theme">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">
                                Brand color
                            </label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    value={config.themeColor}
                                    onChange={(e) =>
                                        set('themeColor', e.target.value)
                                    }
                                    className="size-11 cursor-pointer rounded-lg border border-input"
                                />
                                <Input
                                    value={config.themeColor}
                                    onChange={(e) =>
                                        set('themeColor', e.target.value)
                                    }
                                    className={`${inputClass} w-32 font-mono`}
                                />
                            </div>
                        </div>
                    </SettingsCard>

                    <SettingsCard title="Contact">
                        <TextField
                            label="Phone"
                            value={config.contactPhone}
                            onChange={(v) => set('contactPhone', v)}
                        />
                        <TextField
                            label="Email"
                            value={config.contactEmail}
                            onChange={(v) => set('contactEmail', v)}
                        />
                        <BilingualField
                            label="Address"
                            en={config.contactAddressEn}
                            km={config.contactAddressKm}
                            onEn={(v) => set('contactAddressEn', v)}
                            onKm={(v) => set('contactAddressKm', v)}
                            textarea
                        />
                    </SettingsCard>

                    <SettingsCard title="Social links">
                        <TextField
                            label="Facebook URL"
                            value={config.facebookUrl}
                            onChange={(v) => set('facebookUrl', v)}
                        />
                        <TextField
                            label="Instagram URL"
                            value={config.instagramUrl}
                            onChange={(v) => set('instagramUrl', v)}
                        />
                        <TextField
                            label="Telegram URL"
                            value={config.telegramUrl}
                            onChange={(v) => set('telegramUrl', v)}
                        />
                    </SettingsCard>
                </div>
            )}
        </SettingsPage>
    );
}
