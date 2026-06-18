'use client';

import {
    ChoiceField,
    SettingsCard,
    SettingsPage,
} from '@/features/settings/components/settings-shared';
import {
    FONT_FAMILY_OPTIONS,
    type StoreAppearance,
} from '@/features/settings/store-config';

export default function AppearanceSettingsPage() {
    return (
        <SettingsPage
            title="Appearance"
            subtitle="Font, spacing, corners and product grid on the storefront"
        >
            {({ config, setConfig }) => {
                const a = config.appearance;
                const setA = (patch: Partial<StoreAppearance>) =>
                    setConfig((prev) => ({
                        ...prev,
                        appearance: { ...prev.appearance, ...patch },
                    }));
                return (
                    <SettingsCard title="Appearance">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <ChoiceField
                                label="Font size"
                                value={a.fontScale}
                                onChange={(v) =>
                                    setA({
                                        fontScale:
                                            v as StoreAppearance['fontScale'],
                                    })
                                }
                                options={[
                                    ['sm', 'Small'],
                                    ['md', 'Medium'],
                                    ['lg', 'Large'],
                                ]}
                            />
                            <ChoiceField
                                label="Font family"
                                value={a.fontFamily}
                                onChange={(v) => setA({ fontFamily: v })}
                                options={FONT_FAMILY_OPTIONS.map((o) => [
                                    o.value,
                                    o.label,
                                ])}
                            />
                            <ChoiceField
                                label="Corner radius"
                                value={a.radius}
                                onChange={(v) =>
                                    setA({
                                        radius: v as StoreAppearance['radius'],
                                    })
                                }
                                options={[
                                    ['none', 'None'],
                                    ['sm', 'Small'],
                                    ['md', 'Medium'],
                                    ['lg', 'Large'],
                                    ['xl', 'Extra large'],
                                ]}
                            />
                            <ChoiceField
                                label="Layout density"
                                value={a.density}
                                onChange={(v) =>
                                    setA({
                                        density:
                                            v as StoreAppearance['density'],
                                    })
                                }
                                options={[
                                    ['comfortable', 'Comfortable'],
                                    ['compact', 'Compact'],
                                ]}
                            />
                        </div>
                        <p className="mt-3 text-xs text-muted-foreground">
                            Applies to the customer storefront — reload the store
                            to see changes.
                        </p>
                    </SettingsCard>
                );
            }}
        </SettingsPage>
    );
}
