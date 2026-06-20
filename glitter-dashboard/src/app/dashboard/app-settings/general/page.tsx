'use client';

import {
    BilingualField,
    SettingsCard,
    SettingsPage,
} from '@/features/settings/components/settings-shared';

export default function GeneralSettingsPage() {
    return (
        <SettingsPage title="General" subtitle="Shop name, tagline and footer text">
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
                        <p className="text-xs text-muted-foreground">
                            Shown in the storefront header, browser title and
                            footer.
                        </p>
                    </SettingsCard>

                    <SettingsCard title="Footer description">
                        <BilingualField
                            label="Short description"
                            en={config.footerDescriptionEn}
                            km={config.footerDescriptionKm}
                            onEn={(v) => set('footerDescriptionEn', v)}
                            onKm={(v) => set('footerDescriptionKm', v)}
                            textarea
                        />
                        <p className="text-xs text-muted-foreground">
                            A short blurb shown in the storefront footer.
                        </p>
                    </SettingsCard>
                </div>
            )}
        </SettingsPage>
    );
}
