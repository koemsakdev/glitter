'use client';

import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/features/auth/auth-api';
import { profileApi, type ProfileUpdateValues } from './profile-api';
import { useAuthStore } from '@/stores/auth-store';

export function useUpdateProfile() {
    const setUser = useAuthStore((s) => s.setUser);
    return useMutation({
        mutationFn: ({
            id,
            payload,
        }: {
            id: string;
            payload: ProfileUpdateValues;
        }) => profileApi.update(id, payload),
        onSuccess: (user) => setUser(user),
    });
}

export function useUploadAvatar() {
    const setUser = useAuthStore((s) => s.setUser);
    return useMutation({
        mutationFn: ({ id, file }: { id: string; file: File }) =>
            profileApi.uploadAvatar(id, file),
        onSuccess: (user) => setUser(user),
    });
}

export function useRemoveAvatar() {
    const setUser = useAuthStore((s) => s.setUser);
    return useMutation({
        mutationFn: (id: string) => profileApi.removeAvatar(id),
        onSuccess: (user) => setUser(user),
    });
}

export function useChangePassword() {
    return useMutation({
        mutationFn: ({
            currentPassword,
            newPassword,
        }: {
            currentPassword: string;
            newPassword: string;
        }) => authApi.changePassword(currentPassword, newPassword),
    });
}
