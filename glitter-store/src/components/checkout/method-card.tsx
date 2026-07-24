import { Check, Store, Truck } from "lucide-react";
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
  const Fallback = method.type === "pickup" ? Store : Truck;
  const free = method.fee <= 0;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group flex w-full items-center gap-3.5 rounded-2xl border p-3.5 text-left transition-all ${
        active
          ? "border-(--brand) bg-(--brand)/5 ring-1 ring-(--brand)/30"
          : "border-zinc-200 hover:border-(--brand)/40 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800/50"
      }`}
    >
      <span
        className={`flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border transition-colors ${
          icon
            ? "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
            : active
              ? "border-transparent bg-(--brand)/10 text-(--brand)"
              : "border-transparent bg-zinc-100 text-zinc-400 dark:bg-zinc-800"
        }`}
      >
        {icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={icon} alt="" className="size-full object-contain" />
        ) : (
          <Fallback className="size-6" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {pick(lang, method.nameEn, method.nameKm)}
        </span>
        <span
          className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${
            free
              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
              : "bg-(--brand)/10 text-(--brand)"
          }`}
        >
          {free ? tr(lang, "free") : formatPrice(method.fee)}
        </span>
      </span>
      <span
        className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          active
            ? "border-(--brand) bg-(--brand)"
            : "border-zinc-300 dark:border-zinc-600"
        }`}
      >
        {active && <Check className="size-3 text-white" />}
      </span>
    </button>
  );
}
