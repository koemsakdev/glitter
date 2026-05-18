'use client';

import {zodResolver} from '@hookform/resolvers/zod';
import {Eye, EyeOff, Loader2} from 'lucide-react';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {z} from 'zod';
import {LanguageToggle} from '@/components/language-toggle';
import {ThemeToggle} from '@/components/theme-toggle';
import {Button} from '@/components/ui/button';
import {Card, CardContent} from '@/components/ui/card';
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import {Input} from '@/components/ui/input';
import {useLogin} from '@/features/auth/use-auth';
import {getErrorMessage} from '@/lib/api-client';
import {useI18n} from '@/lib/i18n';
import Image from 'next/image';
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
    email: z.string().email('login.email.invalid'),
    password: z.string().min(1, 'login.password.required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
    const router = useRouter();
    const login = useLogin();
    const {t} = useI18n();
    const [showPassword, setShowPassword] = useState(false);
    const { toast } = useToast();

    const form = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {email: 'admin.glitter@gmail.com', password: 'Gltter@dm1n'},
    });

    async function onSubmit(values: LoginFormValues) {
        try {
            const result = await login.mutateAsync(values);

            if (result.user.role === 'customer') {
                toast({
                    title: t('common.toast.success'),
                    description: t('login.staffOnly'),
                    variant: 'success',
                });
                return;
            }

            toast({
                title: t('common.toast.success'),
                description: `${t('login.welcome')}, ${result.user.fullName}`,
                variant: 'success',
            });
            router.push('/dashboard');
        } catch (error) {
            toast({
                title: t('common.toast.error'),
                description: getErrorMessage(error),
                variant: 'destructive',
            });
        }
    }

    return (
        <Card className="relative w-full max-w-md overflow-hidden border-border/50 shadow-2xl">
            <div className="absolute right-3 top-3 z-10 flex items-center gap-1">
                <ThemeToggle/>
                <LanguageToggle/>
            </div>

            <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-pink-300 via-accent to-pink-300 dark:from-pink-800 dark:via-accent dark:to-pink-800"/>

            <CardContent className="px-8 pb-8 pt-12">
                <div className="mb-8 flex flex-col items-center gap-3 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full shadow-lg shadow-primary/20">
                        <Image
                            src="/logo.png"
                            alt="Glitter Logo"
                            width={100}
                            height={100}
                            className="rounded-full bg-primary/10 p-1"
                        />
                    </div>
                    <div>
                        <h1
                            className={`text-2xl font-bold tracking-tight text-foreground`}
                        >
                            {t('login.title')}
                        </h1>
                        <p
                            className={`mt-1 text-sm text-muted-foreground`}
                        >
                            {t('login.subtitle')}
                        </p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <FieldGroup>
                        <Controller
                            name="email"
                            control={form.control}
                            render={({field, fieldState}) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="login-email">
                                        {t('login.email')}
                                    </FieldLabel>
                                    <Input
                                        {...field}
                                        id="login-email"
                                        type="email"
                                        placeholder={t('login.email.placeholder')}
                                        autoComplete="off"
                                        aria-invalid={fieldState.invalid}
                                        className="h-11 shadow-none focus:shadow-none focus-visible:shadow-none focus:outline-0 focus-visible:outline-none focus:ring-0 focus-visible:ring-0 rounded-lg focus-visible:border-pink-500 dark:focus-visible:border-pink-800"
                                        aria-autocomplete={"none"}
                                    />
                                    {fieldState.invalid && fieldState.error && (
                                        <FieldError
                                            errors={[
                                                {
                                                    ...fieldState.error,
                                                    message: t(
                                                        (fieldState.error.message ??
                                                            'login.email.invalid') as never,
                                                    ),
                                                },
                                            ]}
                                        />
                                    )}
                                </Field>
                            )}
                        />

                        <Controller
                            name="password"
                            control={form.control}
                            render={({field, fieldState}) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="login-password">
                                        {t('login.password')}
                                    </FieldLabel>
                                    <div className="relative">
                                        <Input
                                            {...field}
                                            id="login-password"
                                            type={showPassword ? 'text' : 'password'}
                                            autoComplete="current-password"
                                            placeholder={t('login.password.placeholder')}
                                            aria-invalid={fieldState.invalid}
                                            className="h-11 pr-10 w-full shadow-none focus:shadow-none focus-visible:shadow-none focus:outline-0 focus-visible:outline-none focus:ring-0 focus-visible:ring-0 rounded-lg focus-visible:border-pink-500 dark:focus-visible:border-pink-800"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((s) => !s)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                                            aria-label={
                                                showPassword
                                                    ? t('login.password.hide')
                                                    : t('login.password.show')
                                            }
                                            tabIndex={-1}
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-4 w-4"/>
                                            ) : (
                                                <Eye className="h-4 w-4"/>
                                            )}
                                        </button>
                                    </div>
                                    {fieldState.invalid && fieldState.error && (
                                        <FieldError
                                            errors={[
                                                {
                                                    ...fieldState.error,
                                                    message: t(
                                                        (fieldState.error.message ??
                                                            'login.password.required') as never,
                                                    ),
                                                },
                                            ]}
                                        />
                                    )}
                                </Field>
                            )}
                        />

                        <Button
                            type="submit"
                            className={`h-11 w-full bg-pink-400 text-base font-semibold text-white shadow-pink-400/30 transition-all hover:bg-pink-500 hover:shadow-lg hover:shadow-pink-800/40 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800 rounded-lg`}
                            disabled={login.isPending}
                        >
                            {login.isPending && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                            )}
                            {t('login.submit')}
                        </Button>
                    </FieldGroup>
                </form>
            </CardContent>
        </Card>
    );
}