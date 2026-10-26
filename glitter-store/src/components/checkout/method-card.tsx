import { SafeImg } from '@/components/ui/safe-img';
import { Store, Truck } from "lucide-react";
import { fileUrl, formatPrice } from "@/lib/api";
import { pick, tr, type Lang } from "@/lib/locale";
import type { DeliveryMethod } from "@/lib/store-config";

/** Selectable delivery-method card (radio-style) in the checkout flow. */
export function MethodCard({
  method,
  lang,
  active,
  onSelect,
}: {
  method: DeliveryMethod;
  lang: Lang;
  active: boolean;
  onSelect: () => void;
}) {
  const icon = fileUrl(method.iconUrl);
  const isPickup = method.type === "pickup";
  const TypeIcon = isPickup ? Store : Truck;
  const free = method.fee <= 0;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onSelect}
      className={`group relative flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
        active
          ? "border-(--brand) bg-(--brand)/[0.04] ring-1 ring-(--brand)"
          : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/50"
      }`}
    >
      <span
        className={`flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl transition-colors ${
          icon
            ? "bg-white ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-700"
            : active
              ? "bg-(--brand) text-white"
              : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
        }`}
      >
        {icon ? (
          <SafeImg src={icon} alt="" className="size-full object-contain p-1" />
        ) : (
          <TypeIcon className="size-5" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {pick(lang, method.nameEn, method.nameKm)}
        </span>
        <span className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-zinc-500 dark:text-zinc-400">
          <TypeIcon className="size-3 shrink-0" />
          {tr(lang, isPickup ? "coTypePickup" : "coTypeDelivery")}
        </span>
      </span>
      <span
        className={`shrink-0 text-sm font-bold ${
          free
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-zinc-900 dark:text-zinc-100"
        }`}
      >
        {free ? tr(lang, "free") : formatPrice(method.fee)}
      </span>
    </button>
  );
}
