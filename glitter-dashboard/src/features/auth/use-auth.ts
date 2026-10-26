'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi, type LoginDto } from '@/features/auth/auth-api';
import { authCookie } from '@/lib/auth-cookie';
import { tokenStorage } from '@/lib/token-storage';
import { useAuthStore } from '@/stores/auth-store';
import { useBranchContext } from '@/stores/use-branch-context';

export function useLogin() {
    const setUser = useAuthStore((s) => s.setUser);
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (dto: LoginDto) => authApi.login(dto),
        onSuccess: (data) => {
            tokenStorage.setTokens(
                data.tokens.accessToken,
                data.tokens.refreshToken,
            );
            authCookie.set();
            // Every sign-in starts on "All branches" (admins switch from there;
            // managers/cashiers are locked to their own branch anyway).
            useBranchContext.getState().setAllBranches();
            // Start from an empty cache: nothing loaded for whoever used this
            // browser before (their notifications, orders…) may show here.
            queryClient.clear();
            setUser(data.user);
        },
    });
}

export function useLogout() {
    const clear = useAuthStore((s) => s.clear);
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            try {
                await authApi.logout();
            } catch {
                // Ignore backend errors — clear state regardless
            }
        },
        onSettled: () => {
            tokenStorage.clearTokens();
            authCookie.clear();
            // Don't carry this person's branch choice over to the next sign-in.
            useBranchContext.getState().setAllBranches();
            clear();
            // Drop this person's cached data so the next sign-in can't see it.
            queryClient.clear();
        },
    });
}
