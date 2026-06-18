import { apiClient } from '@/lib/api-client';

export type SettingValueType = 'string' | 'number' | 'boolean' | 'json';

export interface AppSetting {
    id: string;
    settingGroup: string;
    settingKey: string;
    settingValue: string;
    valueType: SettingValueType;
    description: string | null;
    isPublic: boolean;
    updatedAt: string;
}

export interface AppSettingInput {
    settingGroup: string;
    settingKey: string;
    settingValue: string;
    valueType: SettingValueType;
    description?: string;
    isPublic: boolean;
}

export const settingsApi = {
    async list(): Promise<AppSetting[]> {
        const { data } = await apiClient.get<AppSetting[]>('/api/app-settings');
        return data;
    },

    async create(input: AppSettingInput): Promise<AppSetting> {
        const { data } = await apiClient.post<AppSetting>(
            '/api/app-settings',
            input,
        );
        return data;
    },

    async update(id: string, input: AppSettingInput): Promise<AppSetting> {
        const { data } = await apiClient.put<AppSetting>(
            `/api/app-settings/${id}`,
            input,
        );
        return data;
    },
};
