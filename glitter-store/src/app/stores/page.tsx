import { MapPin, Phone, Mail, Clock, Navigation } from 'lucide-react';
import { getActiveBranches } from '@/lib/api';
import { getLang } from '@/lib/lang';
import { pick, tr } from '@/lib/locale';
import type { Branch } from '@/lib/types';

export const metadata = { title: 'Our stores' };

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

function hasCoords(b: Branch): b is Branch & { latitude: number; longitude: number } {
    return typeof b.latitude === 'number' && typeof b.longitude === 'number';
}

export default async function StoresPage() {
    const [lang, branches] = await Promise.all([
        getLang(),
        getActiveBranches().catch(() => []),
    ]);

    return (
        <div className="mx-auto max-w-6xl px-4 py-8">
            {/* Header */}
            <div className="text-center">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-(--brand)/10 px-3 py-1 text-xs font-semibold text-(--brand)">
                    <MapPin className="size-3.5" />
                    {tr(lang, 'storesTitle')}
                </span>
                <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                    {tr(lang, 'storesTitle')}
                </h1>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                    {tr(lang, 'storesSubtitle')}
                </p>
            </div>

            {branches.length === 0 ? (
                <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 py-20 text-center dark:border-zinc-700">
                    <MapPin className="size-10 text-zinc-300 dark:text-zinc-600" />
                    <p className="mt-3 font-semibold text-zinc-700 dark:text-zinc-200">
                        {tr(lang, 'storesEmpty')}
                    </p>
                </div>
            ) : (
                <div className="mt-8 grid gap-6 lg:grid-cols-2">
                    {branches.map((b) => {
                        const name = pick(lang, b.branchNameEn, b.branchNameKm);
                        const coords = hasCoords(b);
                        const q = coords ? `${b.latitude},${b.longitude}` : '';
                        return (
                            <div
                                key={b.id}
                                className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                            >
                                {/* Map */}
                                {coords && (
                                    <iframe
                                        title={name}
                                        src={`https://maps.google.com/maps?q=${q}&z=15&output=embed`}
                                        className="h-48 w-full border-0"
                                        loading="lazy"
                                        referrerPolicy="no-referrer-when-downgrade"
                                    />
                                )}

                                <div className="p-5">
                                    <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                                        {name}
                                    </h2>

                                    <ul className="mt-3 space-y-2.5 text-sm text-zinc-600 dark:text-zinc-300">
                                        <li className="flex items-start gap-2.5">
                                            <MapPin className="mt-0.5 size-4 shrink-0 text-(--brand)" />
                                            <span>
                                                {b.streetAddress}
                                                {b.city ? `, ${b.city}` : ''}
                                            </span>
                                        </li>
                                        {b.phoneNumber && (
                                            <li className="flex items-center gap-2.5">
                                                <Phone className="size-4 shrink-0 text-(--brand)" />
                                                <a
                                                    href={`tel:${b.phoneNumber}`}
                                                    className="hover:text-(--brand)"
                                                >
                                                    {b.phoneNumber}
                                                </a>
                                            </li>
                                        )}
                                        {b.email && (
                                            <li className="flex items-center gap-2.5">
                                                <Mail className="size-4 shrink-0 text-(--brand)" />
                                                <a
                                                    href={`mailto:${b.email}`}
                                                    className="hover:text-(--brand)"
                                                >
                                                    {b.email}
                                                </a>
                                            </li>
                                        )}
                                        {b.openingHours && (
                                            <li className="flex items-start gap-2.5">
                                                <Clock className="mt-0.5 size-4 shrink-0 text-(--brand)" />
                                                <span className="whitespace-pre-line">
                                                    {b.openingHours}
                                                </span>
                                            </li>
                                        )}
                                    </ul>

                                    {coords && (
                                        <a
                                            href={`https://www.google.com/maps/dir/?api=1&destination=${q}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-(--brand) px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                                        >
                                            <Navigation className="size-4" />
                                            {tr(lang, 'getDirections')}
                                        </a>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
