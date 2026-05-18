'use client';

import { ChevronDown, Key, LogOut, User as UserIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLogout } from '@/features/auth/use-auth';
import { useI18n } from '@/lib/i18n';
import { useAuthStore } from '@/stores/auth-store';

function getInitials(fullName: string | null | undefined): string {
    if (!fullName) return 'U';
    return (
        fullName
            .split(' ')
            .map((part) => part[0])
            .filter(Boolean)
            .slice(0, 2)
            .join('')
            .toUpperCase() || 'U'
    );
}

export function UserMenu() {
    const router = useRouter();
    const user = useAuthStore((s) => s.user);
    const logout = useLogout();
    const { t } = useI18n();

    if (!user) return null;

    const fullName = user.fullName ?? user.email ?? 'User';
    const initials = getInitials(user.fullName);
    const role = (user.role ?? 'user').replace('_', ' ');

    async function handleLogout() {
        await logout.mutateAsync();
        router.replace('/login');
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button
                        variant="ghost"
                        className="flex h-10 items-center gap-2 px-2"
                    >
                        <Avatar className="size-8">
                            {user.profileImageUrl && (
                                <AvatarImage src={user.profileImageUrl} alt={fullName} />
                            )}
                            <AvatarFallback className="bg-pink-400 text-xs text-white dark:bg-pink-300 dark:text-pink-950">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        <div className="hidden flex-col items-start leading-tight sm:flex">
                            <span className="text-sm font-medium">{fullName}</span>
                            <span className="text-xs capitalize text-muted-foreground">
                                {role}
                            </span>
                        </div>
                        <ChevronDown className="size-4 text-muted-foreground" />
                    </Button>
                }
            />
            <DropdownMenuContent align="end" className="w-56">
                <div className="flex flex-col gap-0.5 px-2 py-1.5">
                    <span className="text-sm font-medium">{fullName}</span>
                    <span className="truncate text-xs text-muted-foreground">
                        {user.email ?? '—'}
                    </span>
                </div>

                <DropdownMenuSeparator />

                <DropdownMenuItem className="cursor-pointer" onClick={() => router.push('/dashboard/profile')}>
                    <UserIcon className="mr-2 size-4" />
                    <span>{t('user.profile')}</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => router.push('/dashboard/change-password')}
                >
                    <Key className="mr-2 size-4" />
                    <span>{t('user.changePassword')}</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-destructive focus:text-destructive cursor-pointer"
                >
                    <LogOut className="mr-2 size-4 text-destructive" />
                    <span className="text-destructive">{t('user.logout')}</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}