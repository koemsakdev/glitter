'use client';

import { useRef } from 'react';
import { Check, Download, Loader2, ScanLine, Upload, X } from 'lucide-react';
import { SafeImg } from '@/components/ui/safe-img';
import { fileUrl, formatPrice } from '@/lib/api';
import { tr, type Lang } from '@/lib/locale';

/**
 * Manual bank QR payment (no API): the customer scans the shop's KHQR with
 * any banking app, pays the total, then uploads the receipt and types its
 * transaction ID. Staff check both in the dashboard and mark the order paid.
 */
export function ManualQrPanel({
    lang,
    option,
    amount,
    proofUrl,
    uploading,
    onUpload,
    onClearProof,
    txRef,
    onTxRef,
}: {
    lang: Lang;
    option: {
        title: string;
        color: string;
        qrImageUrl?: string | null;
        accountName?: string;
        accountNumber?: string;
    };
    amount: number;
    proofUrl: string;
    uploading: boolean;
    onUpload: (file: File) => void;
    onClearProof: () => void;
    txRef: string;
    onTxRef: (v: string) => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const proof = fileUrl(proofUrl);
    const step =
        'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white';

    return (
        <div
            className="overflow-hidden rounded-2xl border bg-white dark:bg-zinc-900"
            style={{ borderColor: `${option.color}55` }}
        >
            {/* 1 — scan & pay */}
            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                <div className="mx-auto shrink-0 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-black/5 sm:mx-0">
                    {option.qrImageUrl ? (
                        <SafeImg
                            src={option.qrImageUrl}
                            alt="KHQR"
                            className="size-44 object-contain"
                        />
                    ) : (
                        <div className="flex size-44 items-center justify-center text-zinc-300">
                            <ScanLine className="size-10" />
                        </div>
                    )}
                </div>
                <div className="min-w-0 flex-1 space-y-3 text-center sm:text-left">
                    <div className="flex items-center justify-center gap-2 sm:justify-start">
                        <span
                            className={step}
                            style={{ backgroundColor: option.color }}
                        >
                            1
                        </span>
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            {tr(lang, 'mqScan')}
                        </p>
                    </div>
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                            {tr(lang, 'mqAmount')}
                        </p>
                        <p
                            className="text-2xl font-extrabold"
                            style={{ color: option.color }}
                        >
                            {formatPrice(amount)}
                        </p>
                    </div>
                    {(option.accountName || option.accountNumber) && (
                        <p className="text-sm text-zinc-600 dark:text-zinc-300">
                            {option.accountName}
                            {option.accountNumber && (
                                <span className="ml-1.5 font-mono text-zinc-500">
                                    {option.accountNumber}
                                </span>
                            )}
                        </p>
                    )}
                    {option.qrImageUrl && (
                        <a
                            href={option.qrImageUrl}
                            download
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold hover:underline"
                            style={{ color: option.color }}
                        >
                            <Download className="size-3.5" />
                            {tr(lang, 'mqSaveQr')}
                        </a>
                    )}
                </div>
            </div>

            {/* 2 — receipt + transaction id */}
            <div className="space-y-3 border-t border-zinc-100 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                <div className="flex items-center gap-2">
                    <span
                        className={step}
                        style={{ backgroundColor: option.color }}
                    >
                        2
                    </span>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {tr(lang, 'mqProof')}
                    </p>
                </div>

                {proof ? (
                    <div className="flex items-center gap-3 rounded-xl bg-white p-2 ring-1 ring-black/5 dark:bg-zinc-900 dark:ring-white/10">
                        <SafeImg
                            src={proof}
                            alt=""
                            className="size-14 shrink-0 rounded-lg object-cover"
                        />
                        <p className="flex flex-1 items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                            <Check className="size-4" />
                            {tr(lang, 'mqUploaded')}
                        </p>
                        <button
                            type="button"
                            onClick={onClearProof}
                            aria-label={tr(lang, 'remove')}
                            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
                        >
                            <X className="size-4" />
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        disabled={uploading}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 bg-white px-4 py-4 text-sm font-semibold text-zinc-600 transition-colors hover:border-zinc-400 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                    >
                        {uploading ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            <Upload className="size-4" />
                        )}
                        {uploading
                            ? tr(lang, 'mqUploading')
                            : tr(lang, 'mqUpload')}
                    </button>
                )}
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = '';
                        if (f) onUpload(f);
                    }}
                />

                <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                        {tr(lang, 'mqTxId')}
                    </span>
                    <input
                        value={txRef}
                        onChange={(e) => onTxRef(e.target.value)}
                        maxLength={100}
                        placeholder={tr(lang, 'mqTxPlaceholder')}
                        className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3.5 font-mono text-sm outline-none transition-all placeholder:font-sans placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900"
                    />
                </label>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {tr(lang, 'mqNote')}
                </p>
            </div>
        </div>
    );
}
