import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';
import { settingsApi } from './settings-api';
import {
    DEFAULT_STORE_CONFIG,
    mergeStoreConfig,
    STORE_CONFIG_GROUP,
    STORE_CONFIG_KEY,
    type StoreConfig,
} from './store-config';

const SETTINGS_KEY = ['app-settings'] as const;
// One toast slot for every settings save: "Saving…" is replaced in place by
// "Saved" (or dismissed on error — callers show their own error toast).
const SAVE_TOAST_ID = 'settings-save';

/** Reads the single JSON storefront config (merged with defaults). */
export function useStoreConfig() {
    return useQuery({
        queryKey: [...SETTINGS_KEY, 'store-config'],
        queryFn: async () => {
            const all = await settingsApi.list();
            const row = all.find(
                (s) =>
                    s.settingGroup === STORE_CONFIG_GROUP &&
                    s.settingKey === STORE_CONFIG_KEY,
            );
            let config: StoreConfig = DEFAULT_STORE_CONFIG;
            if (row) {
                try {
                    config = mergeStoreConfig(JSON.parse(row.settingValue));
                } catch {
                    config = DEFAULT_STORE_CONFIG;
                }
            }
            return { config, settingId: row?.id ?? null };
        },
    });
}

/** Upserts the storefront config as one public JSON setting. */
export function useSaveStoreConfig() {
    const queryClient = useQueryClient();
    const { t } = useI18n();
    const { toast, dismiss } = useToast();
    return useMutation({
        mutationFn: async (params: {
            config: StoreConfig;
            settingId: string | null;
        }) => {
            const input = {
                settingGroup: STORE_CONFIG_GROUP,
                settingKey: STORE_CONFIG_KEY,
                settingValue: JSON.stringify(params.config),
                valueType: 'json' as const,
                description: 'Storefront homepage configuration',
                isPublic: true,
            };
            return params.settingId
                ? settingsApi.update(params.settingId, input)
                : settingsApi.create(input);
        },
        // Sync the cache straight from the saved row (deterministic) instead of
        // refetching — a refetch can race a rapid follow-up edit and briefly
        // revert it. Fall back to invalidation only if the row can't be parsed.
        onMutate: () => {
            toast({
                id: SAVE_TOAST_ID,
                variant: 'loading',
                title: t('common.saving'),
            });
        },
        onError: () => dismiss(SAVE_TOAST_ID),
        onSuccess: (row) => {
            toast({
                id: SAVE_TOAST_ID,
                variant: 'success',
                title: t('settings.saved'),
                duration: 2500,
            });
            try {
                queryClient.setQueryData([...SETTINGS_KEY, 'store-config'], {
                    config: mergeStoreConfig(JSON.parse(row.settingValue)),
                    settingId: row.id,
                });
            } catch {
                void queryClient.invalidateQueries({ queryKey: SETTINGS_KEY });
            }
        },
    });
}
