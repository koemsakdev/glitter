/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Check,
  Clock,
  MapPin,
  Minus,
  ShoppingBag,
  TimerOff,
  Pencil,
  Plus,
  QrCode,
  Sparkles,
  Store,
  Trash2,
  Truck,
  Loader2,
} from "lucide-react";
import {
  fileUrl,
  formatPrice,
  validateVoucher,
  type VoucherValidation,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { MapPicker } from "@/components/ui/map-picker";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { BackLink } from "@/components/ui/back-link";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { AddressForm } from "@/components/checkout/address-form";
import { pick, tr, type Lang } from "@/lib/locale";
import type {
  DeliveryMethod,
  PaymentOptionType,
  StoreDelivery,
} from "@/lib/store-config";
import type { Address, Branch } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

// Persist an in-progress KHQR session so a page refresh doesn't lose the QR.
const KHQR_STORE_KEY = "glitter_aba_khqr";

// ABA's checkout.prod.js (loaded in the root layout) defines `AbaPayway` as a
// top-level `const`, so it lives in the global lexical scope — NOT on `window`.
// Reference it as a bare global, guarded by `typeof` so it can't throw before
// the script has loaded.
declare const AbaPayway: { checkout: () => void } | undefined;

function getAbaPayway(): { checkout: () => void } | undefined {
  return typeof AbaPayway === "undefined" ? undefined : AbaPayway;
}

/** Resolve once ABA's bridge is ready (script may still be loading), or false. */
function waitForAba(timeoutMs = 8000): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    if (getAbaPayway()?.checkout) return resolve(true);
    let waited = 0;
    const step = 100;
    const t = setInterval(() => {
      if (getAbaPayway()?.checkout) {
        clearInterval(t);
        resolve(true);
      } else if ((waited += step) >= timeoutMs) {
        clearInterval(t);
        resolve(false);
      }
    }, step);
  });
}

/**
 * Build the signed hidden <form id="aba_merchant_request" target="aba_webservice">
 * and call `AbaPayway.checkout()`, which finds that form and opens ABA's own
 * checkout modal/iframe. Returns false if the bridge isn't available.
 */
function openAbaCheckout(
  actionUrl: string,
  fields: Record<string, string>,
): boolean {
  const aba = getAbaPayway();
  if (!aba?.checkout) return false;

  document.getElementById("aba_merchant_request")?.remove();
  const form = document.createElement("form");
  form.id = "aba_merchant_request";
  form.method = "POST";
  form.action = actionUrl;
  form.target = "aba_webservice";
  form.style.display = "none";
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value ?? "";
    form.appendChild(input);
  }
  document.body.appendChild(form);
  aba.checkout();
  return true;
}

export function CheckoutForm({
  branches,
  lang,
  delivery,
}: {
  branches: Branch[];
  lang: Lang;
  delivery: StoreDelivery;
}) {
  const { items, hydrated, subtotal, clear, updateQty, removeItem } = useCart();
  const { user, authFetch } = useAuth();

  const regions = delivery.regions ?? [];
  const methods = delivery.methods ?? [];
  const payments = delivery.payments ?? [];

  const [region, setRegion] = useState<string>(regions[0]?.id ?? "");
  const [methodId, setMethodId] = useState<string>(() => {
    const firstRegion = regions[0]?.id;
    return (
      methods.find((m) => m.enabled && m.regionId === firstRegion)?.id ?? ""
    );
  });
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  // Which payment method the customer picked ('khqr' | 'cod').
  const [payMethodId, setPayMethodId] = useState<string>("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [note, setNote] = useState("");

  // Selected delivery method + fee (needed by voucher validation below).
  const method = methods.find((m) => m.id === methodId);
  const fee = method?.fee ?? 0;

  // Voucher / promo
  const [voucherInput, setVoucherInput] = useState("");
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [discount, setDiscount] = useState(0);
  const [voucherName, setVoucherName] = useState<string | null>(null);
  const [voucherAuto, setVoucherAuto] = useState(false);
  const [voucherAppliesTo, setVoucherAppliesTo] = useState<
    "order" | "delivery"
  >("order");
  const [voucherMsg, setVoucherMsg] = useState("");
  const [voucherLoading, setVoucherLoading] = useState(false);

  function reasonMsg(r: VoucherValidation): string {
    switch (r.reason) {
      case "min_spend":
        return tr(lang, "voucherMinSpend").replace(
          "{amount}",
          formatPrice(r.minSpend ?? 0),
        );
      case "expired":
        return tr(lang, "voucherExpired");
      case "not_started":
        return tr(lang, "voucherNotStarted");
      case "used_up":
        return tr(lang, "voucherUsedUp");
      case "login_required":
        return tr(lang, "voucherLoginRequired");
      case "new_customer":
        return tr(lang, "voucherNewOnly");
      default:
        return tr(lang, "voucherInvalid");
    }
  }

  // Logged-in customers validate through the account endpoint so customer
  // restrictions (new customers) are evaluated; guests use the public one.
  async function runValidate(code?: string): Promise<VoucherValidation> {
    if (user) {
      try {
        const res = await authFetch("/api/account/vouchers/validate", {
          method: "POST",
          body: JSON.stringify({
            subtotal,
            code: code || undefined,
            shippingFee: fee,
          }),
        });
        if (!res.ok) return { valid: false };
        const json = (await res.json()) as { data: VoucherValidation };
        return json.data;
      } catch {
        return { valid: false };
      }
    }
    return validateVoucher(subtotal, code, fee);
  }

  // Keep the discount in sync with the subtotal: re-validate an applied code
  // (it may drop below min spend) or fetch the best automatic promo.
  useEffect(() => {
    let cancelled = false;
    async function sync() {
      if (subtotal <= 0) {
        setDiscount(0);
        setVoucherName(null);
        setVoucherAuto(false);
        return;
      }
      const result = await runValidate(appliedCode ?? undefined);
      if (cancelled) return;
      if (result.valid) {
        setDiscount(result.discount ?? 0);
        setVoucherAppliesTo(result.appliesTo ?? "order");
        setVoucherName(
          pick(lang, result.nameEn ?? "", result.nameKm ?? "") || null,
        );
        setVoucherAuto(!appliedCode);
      } else {
        if (appliedCode) {
          setAppliedCode(null);
          setVoucherMsg(reasonMsg(result));
        }
        setDiscount(0);
        setVoucherName(null);
        setVoucherAuto(false);
      }
    }
    void sync();
    return () => {
      cancelled = true;
    };
    // reasonMsg is stable enough for our purposes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal, appliedCode, lang, fee]);

  async function applyVoucher() {
    const code = voucherInput.trim();
    if (!code) return;
    setVoucherLoading(true);
    setVoucherMsg("");
    const result = await runValidate(code);
    setVoucherLoading(false);
    if (result.valid) {
      setAppliedCode(code.toUpperCase());
      setDiscount(result.discount ?? 0);
      setVoucherAppliesTo(result.appliesTo ?? "order");
      setVoucherName(
        pick(lang, result.nameEn ?? "", result.nameKm ?? "") || null,
      );
      setVoucherAuto(false);
    } else {
      setVoucherMsg(reasonMsg(result));
    }
  }

  function removeVoucher() {
    setAppliedCode(null);
    setVoucherInput("");
    setVoucherMsg("");
  }

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [addressModal, setAddressModal] = useState<{
    editing: Address | null;
  } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [placed, setPlaced] = useState<string | null>(null);

  // ABA PayWay — while ABA's own checkout modal is open, poll for payment.
  const [abaPay, setAbaPay] = useState<
    | { mode: "ecommerce"; tranId: string; orderNumber: string }
    | {
        mode: "qr";
        tranId: string;
        orderNumber: string;
        qrImage: string;
        deeplink: string;
        amount: string;
        currency: string;
        merchantName: string;
        expiresAt: string;
      }
    | null
  >(null);
  // Cancel-confirmation step inside the locked KHQR modal.
  const [cancelConfirm, setCancelConfirm] = useState(false);
  // Inline confirm for clearing the whole cart.
  const [clearConfirm, setClearConfirm] = useState(false);
  // Payment bottom sheet (opened by the single Checkout button).
  const [paySheet, setPaySheet] = useState(false);
  // Portal the fixed bottom bar to <body> so a transformed ancestor (the page
  // transition) can't trap its `position: fixed`. Client-only.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // KHQR countdown — once it hits 0 we stop polling ABA (bounded load).
  const [khqrLeft, setKhqrLeft] = useState(0); // seconds remaining
  const khqrExpired = abaPay?.mode === "qr" && khqrLeft <= 0;
  // Verified receipt shown on the success screen.
  const [receipt, setReceipt] = useState<{
    tranId: string;
    apv: string;
    amount: string;
    currency: string;
    date: string;
    payer: string;
  } | null>(null);

  const loadAddresses = useCallback(
    async (selectId?: string) => {
      try {
        const r = await authFetch("/api/account/addresses");
        if (!r.ok) return;
        const d = (await r.json()) as { data?: Address[] };
        const list = d.data ?? [];
        setAddresses(list);
        const pickId =
          selectId ?? (list.find((a) => a.isDefaultShipping) ?? list[0])?.id;
        if (pickId) {
          const found = list.find((a) => a.id === pickId);
          if (found) applyAddress(found);
        }
      } catch {
        // ignore
      }
    },
    [authFetch],
  );

  useEffect(() => {
    if (!user) return;
    setName((n) => n || user.fullName || "");
    setPhone((p) => p || user.phoneNumber || "");
    void loadAddresses();
  }, [user, loadAddresses]);

  // Poll ABA for payment confirmation while the modal is open. We STOP once a
  // KHQR has expired (so an abandoned popup can't inquire ABA forever) and we
  // skip while the tab is hidden (no point polling a backgrounded checkout).
  useEffect(() => {
    if (!abaPay) return;
    if (abaPay.mode === "qr" && khqrExpired) return;
    const id = setInterval(async () => {
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "hidden"
      )
        return;
      try {
        const r = await fetch(
          `${API_URL}/api/payments/aba/status/${abaPay.tranId}`,
        );
        const d = (await r.json()) as {
          paid?: boolean;
          detail?: {
            tranId: string;
            apv: string;
            amount: string;
            currency: string;
            date: string;
            payer: string;
          };
        };
        if (d.paid) {
          clearInterval(id);
          clear();
          if (d.detail) setReceipt(d.detail);
          setAbaPay(null);
          setPlaced(abaPay.orderNumber);
        }
      } catch {
        // keep polling
      }
    }, 4000);
    return () => clearInterval(id);
  }, [abaPay, khqrExpired, clear]);

  // KHQR countdown — ticks the seconds remaining and drives expiry.
  useEffect(() => {
    if (abaPay?.mode !== "qr") return;
    const end = new Date(abaPay.expiresAt).getTime();
    const tick = () =>
      setKhqrLeft(Math.max(0, Math.round((end - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [abaPay]);

  // On mobile, ABA KHQR should try to open ABA Mobile via the deeplink first;
  // the QR popup stays behind as the fallback if no app handles it. Only once
  // per transaction — never re-open the app on a page refresh/restore.
  const deeplinkedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!abaPay || abaPay.mode !== "qr" || !abaPay.deeplink) return;
    if (deeplinkedRef.current === abaPay.tranId) return;
    deeplinkedRef.current = abaPay.tranId;
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) window.location.href = abaPay.deeplink;
  }, [abaPay]);

  // Restore a still-valid KHQR session on mount so a refresh doesn't lose it.
  const skipPersistRef = useRef(true);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KHQR_STORE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        mode?: string;
        tranId?: string;
        expiresAt?: string;
      } & Record<string, unknown>;
      const secs = saved?.expiresAt
        ? Math.round((new Date(saved.expiresAt).getTime() - Date.now()) / 1000)
        : 0;
      if (saved?.mode === "qr" && saved.tranId && secs > 0) {
        // Don't auto-fire the deeplink for a restored session.
        deeplinkedRef.current = saved.tranId;
        setKhqrLeft(secs);
        setAbaPay(saved as unknown as typeof abaPay);
      } else {
        localStorage.removeItem(KHQR_STORE_KEY);
      }
    } catch {
      localStorage.removeItem(KHQR_STORE_KEY);
    }
  }, []);

  // Persist the live KHQR session (skip the first run so we don't clobber the
  // value we just restored on mount).
  useEffect(() => {
    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }
    try {
      if (abaPay?.mode === "qr") {
        localStorage.setItem(KHQR_STORE_KEY, JSON.stringify(abaPay));
      } else {
        localStorage.removeItem(KHQR_STORE_KEY);
      }
    } catch {
      // ignore storage quota / privacy-mode errors
    }
  }, [abaPay]);

  async function deleteAddress(id: string) {
    try {
      await authFetch(`/api/account/addresses/${id}`, {
        method: "DELETE",
      });
    } catch {
      // ignore
    }
    if (selectedAddressId === id) setSelectedAddressId("");
    void loadAddresses();
  }

  // ---- derived config ----
  const available = methods.filter((m) => m.enabled && m.regionId === region);
  // Keep `methodId` valid when the region changes.
  useEffect(() => {
    if (!available.some((m) => m.id === methodId)) {
      setMethodId(available[0]?.id ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region]);

  const isPickup = method?.type === "pickup";
  const needsAddress = method?.type === "delivery";
  const rule = method?.payment ?? "prepay";
  // Discount reduces whichever part it targets, so it always comes off the
  // combined total (order promos ≤ subtotal, delivery promos ≤ fee).
  const grandTotal = Math.max(0, subtotal + fee - discount);

  // The delivery method's payment rule decides what's shown:
  //   on_pickup → pay on delivery (no payment picker at all)
  //   prepay    → must pay online now (KHQR options)
  //   either    → choose an online option OR pay on delivery
  const payOnDeliveryOnly = rule === "on_pickup";
  const allowsNow = rule === "prepay" || rule === "either";
  const allowsCash = rule === "either";

  // Enabled payment options from the admin's list. aba_khqr + aba_ecommerce
  // both pay online via ABA; cod is pay-on-receipt.
  const onlineOptions = payments.filter(
    (p) => p.enabled && (p.type === "aba_khqr" || p.type === "aba_ecommerce"),
  );
  const cashOption = payments.find((p) => p.enabled && p.type === "cod");

  const payMethods: {
    id: string;
    now: boolean;
    payType: PaymentOptionType;
    title: string;
    desc: string;
    color: string;
    Icon: typeof QrCode;
    iconUrl: string | null;
  }[] = [];
  if (allowsNow) {
    for (const o of onlineOptions) {
      payMethods.push({
        id: o.id,
        now: true,
        payType: o.type,
        title: pick(lang, o.nameEn, o.nameKm) || tr(lang, "payKhqrTitle"),
        desc: pick(lang, o.descEn, o.descKm) || tr(lang, "payKhqrDesc"),
        color: o.color || "#00529C",
        Icon: QrCode,
        iconUrl: fileUrl(o.iconUrl),
      });
    }
  }
  if (allowsCash && cashOption) {
    payMethods.push({
      id: cashOption.id,
      now: false,
      payType: "cod",
      title:
        pick(lang, cashOption.nameEn, cashOption.nameKm) ||
        tr(lang, "payOnDelivery"),
      desc:
        pick(lang, cashOption.descEn, cashOption.descKm) ||
        (isPickup ? tr(lang, "payAtStoreHelp") : tr(lang, "payOnDeliveryHelp")),
      color: cashOption.color || "#16a34a",
      Icon: Banknote,
      iconUrl: fileUrl(cashOption.iconUrl),
    });
  }
  const selectedPay =
    payMethods.find((p) => p.id === payMethodId) ?? payMethods[0];
  const payNow = selectedPay?.now === true;
  const usesKhqr = payNow;

  // Payment options UI — reused inline on desktop and inside the mobile sheet.
  const payMethodsUI = payOnDeliveryOnly ? (
    <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
      <Banknote className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
      <p className="text-sm text-zinc-700 dark:text-zinc-200">
        {isPickup ? tr(lang, "payAtStoreHelp") : tr(lang, "payOnDeliveryHelp")}
      </p>
    </div>
  ) : payMethods.length === 0 ? (
    <p className="rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:bg-zinc-900/60 dark:text-zinc-300">
      {tr(lang, "noPayMethod")}
    </p>
  ) : (
    <div className="space-y-2.5">
      {payMethods.map((pm) => {
        const active = selectedPay?.id === pm.id;
        return (
          <button
            key={pm.id}
            type="button"
            onClick={() => setPayMethodId(pm.id)}
            style={{
              borderColor: active ? pm.color : `${pm.color}59`,
              backgroundColor: active ? `${pm.color}12` : undefined,
              boxShadow: active ? `0 0 0 1px ${pm.color}` : undefined,
            }}
            className="relative flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all hover:opacity-95"
          >
            <span
              style={pm.iconUrl ? undefined : { backgroundColor: pm.color }}
              className={`flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl ${
                pm.iconUrl ? "" : "text-white"
              }`}
            >
              <PayIcon iconUrl={pm.iconUrl} Icon={pm.Icon} />
            </span>
            <span className="flex flex-1 flex-col">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {pm.title}
              </span>
              <span className="mt-0.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                {pm.desc}
              </span>
            </span>
            <span
              style={
                active
                  ? { backgroundColor: pm.color, borderColor: pm.color }
                  : undefined
              }
              className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
                active ? "" : "border-zinc-300 dark:border-zinc-600"
              }`}
            >
              {active && <Check className="size-3.5 text-white" />}
            </span>
          </button>
        );
      })}
    </div>
  );

  if (!hydrated) {
    return <div className="mx-auto max-w-5xl px-4 py-16" />;
  }

  if (placed !== null) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15">
          <Check className="size-8" />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {tr(lang, "orderPlaced")}
        </h1>
        {placed && (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {tr(lang, "orderNumber")}:{" "}
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              {placed}
            </span>
          </p>
        )}
        <p className="mx-auto mt-3 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
          {tr(lang, "orderPlacedHelp")}
        </p>
        {receipt && (
          <div className="mx-auto mt-6 max-w-sm overflow-hidden rounded-2xl border border-emerald-200 text-left dark:border-emerald-500/25">
            <div className="flex items-center gap-2 bg-emerald-50 px-5 py-3 dark:bg-emerald-500/10">
              <Check className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                {tr(lang, "paymentReceived")}
              </span>
              <span className="ml-auto rounded-full bg-[#00529C] px-2 py-0.5 text-[10px] font-bold text-white">
                ABA KHQR
              </span>
            </div>
            <dl className="divide-y divide-zinc-100 px-5 dark:divide-zinc-800">
              {(
                [
                  [
                    tr(lang, "receiptAmount"),
                    receipt.amount
                      ? `${receipt.currency === "KHR" ? "៛" : "$"}${receipt.amount}`
                      : formatPrice(grandTotal),
                  ],
                  [tr(lang, "receiptTxn"), receipt.tranId],
                  [tr(lang, "receiptApproval"), receipt.apv],
                  [tr(lang, "receiptPayer"), receipt.payer],
                  [tr(lang, "receiptDate"), receipt.date],
                ] as [string, string][]
              )
                .filter(([, v]) => v)
                .map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-4 py-2.5 text-sm"
                  >
                    <dt className="text-zinc-500 dark:text-zinc-400">
                      {label}
                    </dt>
                    <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                      {value}
                    </dd>
                  </div>
                ))}
            </dl>
          </div>
        )}
        <div className="mt-7 flex justify-center gap-3">
          <Link
            href="/products"
            className="rounded-full bg-(--brand) px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
          >
            {tr(lang, "continueShopping")}
          </Link>
          {user && (
            <Link
              href="/account"
              className="rounded-full border border-zinc-200 px-6 py-3 text-sm font-semibold text-zinc-700 hover:border-(--brand) dark:border-zinc-700 dark:text-zinc-200"
            >
              {tr(lang, "myOrders")}
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="relative flex min-h-screen flex-col">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-zinc-50 via-zinc-100/50 to-zinc-50 dark:from-zinc-950 dark:via-zinc-900/50 dark:to-zinc-950" />
        <div className="px-4 pt-4 max-md:pt-[calc(env(safe-area-inset-top)+0.85rem)]">
          <BackLink lang={lang} fallbackHref="/products" />
        </div>
        <div className="flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
          {/* layered icon */}
          <div className="relative flex size-28 items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-(--brand)/10" />
            <span className="absolute inset-[0.6rem] rounded-full bg-(--brand)/10" />
            <ShoppingBag
              className="relative size-11 text-(--brand)"
              strokeWidth={1.5}
            />
          </div>
          <h1 className="mt-7 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {tr(lang, "cartEmpty")}
          </h1>
          <p className="mt-2 max-w-[15rem] text-sm text-zinc-500 dark:text-zinc-400">
            {tr(lang, "cartEmptyHelp")}
          </p>
          <Link
            href="/products"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-(--brand) px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-(--brand)/25 transition-all hover:opacity-90 active:scale-95"
          >
            <ShoppingBag className="size-4" />
            {tr(lang, "continueShopping")}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    );
  }

  function applyAddress(a: Address) {
    setSelectedAddressId(a.id);
    setName(a.recipientName);
    setPhone(a.recipientPhone);
    setAddress([a.streetAddress, a.landmark].filter(Boolean).join(" — "));
    setLat(a.latitude ? Number(a.latitude) : null);
    setLng(a.longitude ? Number(a.longitude) : null);
  }

  function validateCheckout(): string | null {
    if (!name.trim()) return tr(lang, "nameRequired");
    if (!phone.trim()) return tr(lang, "phoneRequired");
    if (needsAddress && !address.trim()) return tr(lang, "addressRequired");
    if (isPickup && !branchId) return tr(lang, "branchRequired");
    if (!payOnDeliveryOnly && payMethods.length === 0)
      return tr(lang, "noPayMethod");
    return null;
  }

  // Mobile: validate, then open the payment bottom sheet.
  function handleCheckout(e?: React.FormEvent) {
    e?.preventDefault();
    setError("");
    const err = validateCheckout();
    if (err) return setError(err);
    setPaySheet(true);
  }

  // Desktop: payment is chosen inline, so place the order directly.
  function handleDesktopPay() {
    setError("");
    const err = validateCheckout();
    if (err) return setError(err);
    void placeOrder();
  }

  // Create the order and kick off the chosen payment. Called from the sheet.
  async function placeOrder() {
    setError("");
    const useLiveKhqr = usesKhqr;
    setSubmitting(true);
    try {
      const regionObj = regions.find((r) => r.id === region);
      const body = JSON.stringify({
        deliveryRegion: region,
        deliveryRegionName: regionObj?.nameEn ?? region,
        deliveryMethod: methodId,
        deliveryMethodName: method?.nameEn ?? method?.nameKm ?? methodId,
        branchId: isPickup ? branchId : undefined,
        customerName: name.trim(),
        customerPhone: phone.trim(),
        deliveryAddress: needsAddress ? address.trim() : undefined,
        deliveryLat: needsAddress && lat != null ? lat : undefined,
        deliveryLng: needsAddress && lng != null ? lng : undefined,
        paymentMethod: usesKhqr ? "khqr" : isPickup ? "on_pickup" : "cod",
        paymentMethodName: usesKhqr
          ? "ABA KHQR"
          : isPickup
            ? tr(lang, "payAtStore")
            : tr(lang, "payOnDelivery"),
        voucherCode: appliedCode ?? undefined,
        note: note.trim() || undefined,
        items: items.map((i) => ({
          productVariantId: i.variantId,
          quantity: i.quantity,
        })),
      });

      const res = user
        ? await authFetch("/api/account/orders", {
            method: "POST",
            body,
          })
        : await fetch(`${API_URL}/api/orders/online`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
          });
      if (!res.ok) throw new Error("failed");
      const json: { data?: { orderNumber?: string; id?: string } } =
        await res.json();
      const orderId = json.data?.id ?? "";
      const orderNumber = json.data?.orderNumber ?? orderId;

      // Online ABA payment. Two modes:
      //   aba_ecommerce → ABA's hosted checkout modal (checkout2-0.js).
      //   aba_khqr      → our KHQR popup (QR image + ABA Mobile deeplink).
      if (useLiveKhqr && orderId) {
        if (selectedPay?.payType === "aba_ecommerce") {
          const qr = await fetch(`${API_URL}/api/payments/aba/checkout`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId }),
          });
          if (qr.ok) {
            const qd = (await qr.json()) as {
              data?: {
                actionUrl: string;
                fields: Record<string, string>;
              };
            };
            if (qd.data?.actionUrl && qd.data.fields?.tran_id) {
              await waitForAba();
              const opened = openAbaCheckout(qd.data.actionUrl, qd.data.fields);
              if (opened) {
                setPaySheet(false);
                setAbaPay({
                  mode: "ecommerce",
                  tranId: qd.data.fields.tran_id,
                  orderNumber,
                });
                return;
              }
            }
          }
        } else {
          // aba_khqr — generate a dynamic KHQR (image + deeplink).
          const qr = await fetch(`${API_URL}/api/payments/aba/khqr`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId }),
          });
          if (qr.ok) {
            const qd = (await qr.json()) as {
              data?: {
                tranId: string;
                qrImage?: string;
                deeplink?: string;
                amount?: string;
                currency?: string;
                merchantName?: string;
                expiresAt?: string;
                lifetimeMinutes?: number;
              };
            };
            if (qd.data?.tranId && qd.data.qrImage) {
              const expiresAt =
                qd.data.expiresAt ??
                new Date(Date.now() + 5 * 60_000).toISOString();
              setCancelConfirm(false);
              setPaySheet(false);
              setKhqrLeft(
                Math.max(
                  1,
                  Math.round(
                    (new Date(expiresAt).getTime() - Date.now()) / 1000,
                  ),
                ),
              );
              setAbaPay({
                mode: "qr",
                tranId: qd.data.tranId,
                orderNumber,
                qrImage: qd.data.qrImage,
                deeplink: qd.data.deeplink ?? "",
                amount: qd.data.amount ?? "",
                currency: qd.data.currency ?? "USD",
                merchantName: qd.data.merchantName ?? "",
                expiresAt,
              });
              return;
            }
          }
        }
        // Payment couldn't be started — this is a pay-first order, so it
        // is NOT placed. Keep the cart, show an error, and let the unpaid
        // order auto-expire and release its reserved stock.
        setError(tr(lang, "abaPayFailed"));
        return;
      }

      setPaySheet(false);
      clear();
      setPlaced(orderNumber);
    } catch {
      setError(tr(lang, "orderFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none transition-colors focus:border-(--brand) dark:border-zinc-700 dark:bg-zinc-900";

  return (
    <div className="relative min-h-screen">
      {/* Subtle premium background gradient */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-br from-zinc-50 via-zinc-100/50 to-zinc-50 dark:from-zinc-950 dark:via-zinc-900/50 dark:to-zinc-950" />

      <div className="mx-auto max-w-5xl px-4 pb-28 pt-0 md:pb-12 md:pt-8">
        {/* App-style header bar: back (left) · title (centre) · clear-all
                (right). Sticks to the top on mobile so it stays in view. */}
        <div className="relative mb-6 flex items-center justify-between gap-2 max-md:sticky max-md:top-0 max-md:z-30 max-md:-mx-4 max-md:border-b max-md:border-zinc-200/60 max-md:bg-white/85 max-md:px-4 max-md:pb-3 max-md:pt-[calc(env(safe-area-inset-top)+0.85rem)] max-md:backdrop-blur-lg dark:max-md:border-zinc-800/60 dark:max-md:bg-zinc-950/85">
          <BackLink lang={lang} fallbackHref="/products" />
          {/* Dead-centre title, like a native app bar */}
          <h1 className="pointer-events-none absolute left-1/2 max-w-[46%] -translate-x-1/2 truncate text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100 block md:hidden">
            {tr(lang, "checkout")}
          </h1>
          {/* Language + theme — mobile only (desktop uses the store header) */}
          <div className="flex items-center gap-1.5 md:hidden">
            <LanguageToggle lang={lang} />
            <ThemeToggle />
          </div>
        </div>

        <form
          id="checkoutForm"
          onSubmit={(e) => e.preventDefault()}
          className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_300px] lg:grid-cols-[minmax(0,1fr)_340px]"
        >
          <div className="min-w-0 space-y-6">
            {/* 1 — Your order (editable cart) */}
            <Section
              step={1}
              title={tr(lang, "yourOrder")}
              action={
                clearConfirm ? (
                  <span className="flex items-center gap-2 text-xs">
                    <span className="hidden font-medium text-zinc-500 sm:inline dark:text-zinc-400">
                      {tr(lang, "clearAllConfirm")}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        clear();
                        setClearConfirm(false);
                      }}
                      className="font-semibold text-red-600 hover:underline dark:text-red-400"
                    >
                      {tr(lang, "remove")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setClearConfirm(false)}
                      className="font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    >
                      {tr(lang, "cancel")}
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setClearConfirm(true)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-400 transition-colors hover:text-red-600 dark:hover:text-red-400"
                  >
                    <Trash2 className="size-3.5" />
                    {tr(lang, "clearAll")}
                  </button>
                )
              }
            >
              <ul className="space-y-2.5">
                {items.map((item) => {
                  const img = fileUrl(item.image);
                  const name = pick(lang, item.nameEn, item.nameKm);
                  return (
                    <li
                      key={item.variantId}
                      className="flex items-center gap-3 rounded-2xl border border-zinc-100 bg-white p-2.5 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
                    >
                      <Link
                        href={`/products/${item.slug}`}
                        className="size-16 shrink-0 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800"
                      >
                        {img && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={img}
                            alt={name}
                            className="size-full object-cover transition-transform hover:scale-105"
                          />
                        )}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/products/${item.slug}`}
                          className="line-clamp-1 text-sm font-semibold text-zinc-900 transition-colors hover:text-(--brand) dark:text-zinc-100"
                        >
                          {name}
                        </Link>
                        {item.variantLabel && (
                          <p className="truncate text-xs text-zinc-400">
                            {item.variantLabel}
                          </p>
                        )}
                        <p className="mt-1 text-sm font-extrabold text-zinc-900 dark:text-zinc-100">
                          {formatPrice(item.unitPrice * item.quantity)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <button
                          type="button"
                          onClick={() => removeItem(item.variantId)}
                          aria-label={tr(lang, "remove")}
                          className="rounded-lg p-1.5 text-zinc-300 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                        >
                          <Trash2 className="size-4" />
                        </button>
                        <div className="flex items-center rounded-full border border-zinc-200 dark:border-zinc-700">
                          <button
                            type="button"
                            aria-label="-"
                            onClick={() =>
                              updateQty(item.variantId, item.quantity - 1)
                            }
                            className="flex size-7 items-center justify-center text-zinc-500 hover:text-(--brand) dark:text-zinc-300"
                          >
                            <Minus className="size-3.5" />
                          </button>
                          <span className="w-6 text-center text-sm font-semibold tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            aria-label="+"
                            onClick={() =>
                              updateQty(item.variantId, item.quantity + 1)
                            }
                            className="flex size-7 items-center justify-center text-zinc-500 hover:text-(--brand) dark:text-zinc-300"
                          >
                            <Plus className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <Link
                href="/products"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 transition-colors hover:text-(--brand) dark:text-zinc-400"
              >
                <Plus className="size-3.5" />
                {tr(lang, "continueShopping")}
              </Link>
            </Section>

            {/* 2 — Region */}
            <Section step={2} title={tr(lang, "shippingRegion")}>
              <div className="grid grid-cols-2 gap-3">
                {regions.map((r) => {
                  const icon = fileUrl(r.iconUrl);
                  const active = region === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRegion(r.id)}
                      className={`group relative flex flex-col items-center gap-2.5 overflow-hidden rounded-2xl border-2 p-4 text-center transition-all active:scale-[0.98] ${
                        active
                          ? "border-(--brand) bg-(--brand)/5 shadow-md shadow-(--brand)/10"
                          : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600"
                      }`}
                    >
                      {active && (
                        <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-(--brand) text-white shadow-sm">
                          <Check className="size-3" strokeWidth={3} />
                        </span>
                      )}
                      <span
                        className={`flex size-14 items-center justify-center overflow-hidden rounded-full transition-colors ${
                          active
                            ? "bg-(--brand)/10"
                            : "bg-zinc-100 dark:bg-zinc-800"
                        }`}
                      >
                        {icon ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={icon}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : (
                          <MapPin
                            className={`size-6 ${active ? "text-(--brand)" : "text-zinc-400"}`}
                          />
                        )}
                      </span>
                      <span
                        className={`text-sm font-bold ${
                          active
                            ? "text-(--brand)"
                            : "text-zinc-700 dark:text-zinc-200"
                        }`}
                      >
                        {pick(lang, r.nameEn, r.nameKm)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* 3 — Delivery method */}
            <Section step={3} title={tr(lang, "deliveryMethod")}>
              <div className="space-y-2.5">
                {available.map((m) => (
                  <MethodCard
                    key={m.id}
                    method={m}
                    lang={lang}
                    active={methodId === m.id}
                    onSelect={() => setMethodId(m.id)}
                  />
                ))}
                {available.length === 0 && (
                  <p className="rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-500 dark:bg-zinc-900/60">
                    {tr(lang, "noMethodsForRegion")}
                  </p>
                )}
              </div>

              {isPickup && (
                <div className="mt-4">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    {tr(lang, "pickupBranch")}
                  </label>
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">{tr(lang, "selectBranch")}</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {pick(lang, b.branchNameEn, b.branchNameKm)} —{" "}
                        {b.streetAddress}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </Section>

            {/* 4 — Customer info / address */}
            <Section step={4} title={tr(lang, "yourInfo")}>
              {user && needsAddress ? (
                <div className="space-y-2">
                  {addresses.map((a) => (
                    <div
                      key={a.id}
                      className={`flex items-start gap-2 rounded-xl border p-3 transition-colors ${
                        selectedAddressId === a.id
                          ? "border-(--brand) bg-(--brand)/5"
                          : "border-zinc-200 dark:border-zinc-700"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => applyAddress(a)}
                        className="flex min-w-0 flex-1 items-start gap-3 text-left"
                      >
                        <MapPin className="mt-0.5 size-4 shrink-0 text-(--brand)" />
                        <span className="min-w-0 text-sm">
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {a.label ? `${a.label} · ` : ""}
                            {a.recipientName} · {a.recipientPhone}
                          </span>
                          <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                            {[a.streetAddress, a.landmark]
                              .filter(Boolean)
                              .join(" — ")}
                          </span>
                        </span>
                      </button>
                      <div className="flex shrink-0 gap-0.5">
                        <button
                          type="button"
                          onClick={() =>
                            setAddressModal({
                              editing: a,
                            })
                          }
                          aria-label={tr(lang, "edit")}
                          className="rounded-lg p-1.5 text-zinc-400 hover:text-(--brand)"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteAddress(a.id)}
                          aria-label={tr(lang, "delete")}
                          className="rounded-lg p-1.5 text-zinc-400 hover:text-red-600"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAddressModal({ editing: null })}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-300 p-2.5 text-sm font-medium text-zinc-500 transition-colors hover:border-(--brand) hover:text-(--brand) dark:border-zinc-600"
                  >
                    <Plus className="size-4" />
                    {tr(lang, "addAddress")}
                  </button>
                  {addresses.length === 0 && (
                    <p className="text-center text-xs text-zinc-400">
                      {tr(lang, "noAddressYet")}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        {tr(lang, "fullName")}
                      </label>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        {tr(lang, "phone")}
                      </label>
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  {needsAddress && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        {tr(lang, "deliveryAddress")}
                      </label>
                      <textarea
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        rows={2}
                        placeholder={tr(lang, "addressPlaceholder")}
                        className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-(--brand) dark:border-zinc-700 dark:bg-zinc-900"
                      />
                      <button
                        type="button"
                        onClick={() => setShowMap((v) => !v)}
                        className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-(--brand)"
                      >
                        <MapPin className="size-3.5" />
                        {lat != null
                          ? tr(lang, "pinSet")
                          : tr(lang, "pinOnMap")}
                      </button>
                      {showMap && (
                        <div className="mt-2">
                          <MapPicker
                            latitude={lat}
                            longitude={lng}
                            onChange={(la, ln, addr) => {
                              setLat(la);
                              setLng(ln);
                              if (addr) setAddress(addr);
                            }}
                            currentLocationText={tr(lang, "useMyLocation")}
                            searchPlaceholder={tr(lang, "searchPlace")}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-3">
                <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  {tr(lang, "orderNote")}
                </label>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={tr(lang, "notePlaceholder")}
                  className={inputClass}
                />
              </div>
            </Section>
          </div>

          {/* Summary */}
          <div className="min-w-0 md:sticky md:top-24 md:h-fit">
            <div className="rounded-3xl border border-white/60 bg-white/70 p-6 shadow-xl backdrop-blur-xl dark:border-zinc-700/50 dark:bg-zinc-900/70">
              <h2 className="flex items-center justify-between text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                {tr(lang, "orderSummary")}
                <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                  {items.reduce((n, i) => n + i.quantity, 0)}
                </span>
              </h2>
              {/* Payment — inline on desktop (mobile chooses it in the sheet) */}
              <div className="mt-4 hidden md:block">
                <p className="mb-2.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {tr(lang, "payment")}
                </p>
                {payMethodsUI}
              </div>
              {/* Voucher / promo code */}
              <div className="mt-4">
                {appliedCode ? (
                  <div className="flex items-center justify-between gap-2 rounded-lg bg-emerald-50 px-3 py-2 dark:bg-emerald-500/10">
                    <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                      <Check className="size-4 shrink-0" />
                      <span className="font-mono">{appliedCode}</span>
                      {voucherName && (
                        <span className="truncate text-emerald-600/80 dark:text-emerald-300/70">
                          · {voucherName}
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={removeVoucher}
                      className="shrink-0 text-xs font-medium text-emerald-700 underline dark:text-emerald-300"
                    >
                      {tr(lang, "remove")}
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={voucherInput}
                      onChange={(e) => setVoucherInput(e.target.value)}
                      placeholder={tr(lang, "promoCode")}
                      className="h-10 w-full min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-3 text-sm uppercase outline-none transition-colors focus:border-(--brand) dark:border-zinc-700 dark:bg-zinc-900"
                    />
                    <button
                      type="button"
                      onClick={applyVoucher}
                      disabled={voucherLoading || !voucherInput.trim()}
                      className="rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
                    >
                      {tr(lang, "apply")}
                    </button>
                  </div>
                )}
                {voucherAuto && discount > 0 && !appliedCode && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <Sparkles className="size-3" />
                    {voucherName ?? tr(lang, "promoAuto")}
                  </p>
                )}
                {voucherMsg && (
                  <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                    {voucherMsg}
                  </p>
                )}
              </div>

              <div className="mt-4 space-y-2 border-t border-zinc-100 pt-4 text-sm dark:border-zinc-800">
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {tr(lang, "subtotal")}
                  </span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {formatPrice(subtotal)}
                  </span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {voucherAppliesTo === "delivery"
                        ? tr(lang, "deliveryDiscount")
                        : tr(lang, "discount")}
                    </span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                      −{formatPrice(discount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {tr(lang, "deliveryFee")}
                  </span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {fee > 0 ? formatPrice(fee) : tr(lang, "free")}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {tr(lang, "total")}
                </span>
                <span className="text-lg font-extrabold text-(--brand)">
                  {formatPrice(grandTotal)}
                </span>
              </div>

              {error && (
                <p className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">
                  {error}
                </p>
              )}

              {/* Desktop CTA — payment is inline above, so place the
                            order directly (mobile uses the sheet via the dock). */}
              <button
                type="button"
                onClick={handleDesktopPay}
                disabled={submitting}
                className="mt-5 hidden w-full items-center justify-center gap-2 rounded-full bg-(--brand) px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-(--brand)/25 transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-60 md:flex"
              >
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ShoppingBag className="size-4" />
                )}
                {submitting ? tr(lang, "placingOrder") : tr(lang, "placeOrder")}
              </button>
            </div>
          </div>
        </form>

        {/* Mobile app-style floating dock — portaled to <body> so the page
                transition transform can't break its fixed position. */}
        {mounted &&
          createPortal(
            <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+0.6rem)] pt-2 md:hidden">
              {error && (
                <div className="mx-auto mb-2 max-w-md rounded-xl bg-red-50 px-3 py-2 text-center text-xs font-semibold text-red-600 shadow-sm dark:bg-red-950/70 dark:text-red-400">
                  {error}
                </div>
              )}
              <div className="mx-auto flex max-w-md items-center gap-3 rounded-[1.4rem] border border-zinc-200/70 bg-white/95 p-2 pl-4 shadow-[0_10px_40px_-8px_rgba(0,0,0,0.25)] backdrop-blur-xl dark:border-zinc-700/60 dark:bg-zinc-900/95">
                <div className="min-w-0 shrink-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                    {tr(lang, "total")}
                  </p>
                  <p className="text-lg font-extrabold leading-tight tracking-tight text-zinc-900 dark:text-zinc-100">
                    {formatPrice(grandTotal)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCheckout()}
                  className="ml-auto flex items-center gap-2 rounded-2xl bg-(--brand) px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-(--brand)/35 transition-all hover:opacity-90 active:scale-95"
                >
                  <ShoppingBag className="size-4" strokeWidth={2.5} />
                  {tr(lang, "checkout")}
                </button>
              </div>
            </div>,
            document.body,
          )}

        {addressModal && (
          <AddressForm
            lang={lang}
            defaultName={user?.fullName ?? ""}
            defaultPhone={user?.phoneNumber ?? ""}
            initial={addressModal.editing ?? undefined}
            onClose={() => setAddressModal(null)}
            onSaved={(saved) => {
              setAddressModal(null);
              void loadAddresses(saved.id);
            }}
          />
        )}

        {/* Payment bottom sheet — opened by the single Checkout button. */}
        {paySheet && (
          <ResponsiveModal
            open
            onOpenChange={(o) => !o && !submitting && setPaySheet(false)}
            title={tr(lang, "choosePayment")}
            className="sm:max-w-md"
          >
            <div className="flex max-h-[85vh] flex-col">
              <div className="px-5 pb-3 pt-4">
                <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {tr(lang, "choosePayment")}
                </h2>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
                {payMethodsUI}
              </div>

              <div className="border-t border-zinc-100 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900">
                {error && (
                  <p className="mb-2 text-sm font-medium text-red-600 dark:text-red-400">
                    {error}
                  </p>
                )}
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    {tr(lang, "total")}
                  </span>
                  <span className="text-xl font-extrabold text-(--brand)">
                    {formatPrice(grandTotal)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={placeOrder}
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-(--brand) px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-(--brand)/30 transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-60"
                >
                  {submitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ShoppingBag className="size-4" />
                  )}
                  {submitting ? tr(lang, "placingOrder") : tr(lang, "pay")}
                </button>
              </div>
            </div>
          </ResponsiveModal>
        )}

        {/* ABA E-Commerce renders its own hosted checkout modal (JS bridge).
                We only show a small, non-blocking waiting pill. */}
        {abaPay?.mode === "ecommerce" && (
          <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
            <div className="flex items-center gap-3 rounded-full border border-zinc-200 bg-white/95 px-4 py-2 text-sm shadow-lg backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95">
              <Loader2 className="size-4 animate-spin text-[#015f7a]" />
              <span className="text-zinc-600 dark:text-zinc-300">
                {tr(lang, "abaWaiting")}
              </span>
              <button
                type="button"
                onClick={() => setAbaPay(null)}
                className="text-xs font-medium text-zinc-400 underline-offset-2 hover:text-zinc-600 hover:underline dark:hover:text-zinc-300"
              >
                {tr(lang, "cancel")}
              </button>
            </div>
          </div>
        )}

        {/* ABA KHQR — locked modal: only closable via Cancel → confirm. */}
        {abaPay?.mode === "qr" && (
          <ResponsiveModal
            open
            onOpenChange={() => {}}
            dismissible={false}
            title="ABA KHQR"
            className="sm:max-w-sm"
          >
            {/* KHQR payment step (confirmation is a separate modal on top) */}
            <div className="w-full">
              {khqrExpired ? (
                /* Expired — the QR can no longer be scanned. */
                <div className="flex flex-col items-center px-6 pb-2 pt-8 text-center">
                  <div className="flex size-16 items-center justify-center rounded-full bg-red-50 text-red-500 dark:bg-red-500/15 dark:text-red-400">
                    <TimerOff className="size-8" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    {tr(lang, "khqrExpiredTitle")}
                  </h3>
                  <p className="mt-1.5 max-w-68 text-sm text-zinc-500 dark:text-zinc-400">
                    {tr(lang, "khqrExpiredBody")}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center px-6 pt-5 text-center">
                  {/* Merchant name */}
                  <h2 className="max-w-full truncate text-xl font-bold text-zinc-900 dark:text-zinc-100">
                    {abaPay.merchantName || "ABA KHQR"}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    {tr(lang, "scanHere")}
                  </p>

                  {/* QR with scanner corner-brackets */}
                  <div className="relative mt-5 p-4">
                    <span className="absolute left-0 top-0 size-8 rounded-tl-xl border-l-[3px] border-t-[3px] border-[#1fc3c3]" />
                    <span className="absolute right-0 top-0 size-8 rounded-tr-xl border-r-[3px] border-t-[3px] border-[#1fc3c3]" />
                    <span className="absolute bottom-0 left-0 size-8 rounded-bl-xl border-b-[3px] border-l-[3px] border-[#1fc3c3]" />
                    <span className="absolute bottom-0 right-0 size-8 rounded-br-xl border-b-[3px] border-r-[3px] border-[#1fc3c3]" />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={abaPay.qrImage}
                      alt="KHQR"
                      className="size-52 object-contain"
                    />
                  </div>

                  {/* Amount — large */}
                  <p className="mt-6 flex items-start justify-center text-zinc-900 dark:text-zinc-100">
                    <span className="mt-1.5 text-2xl font-bold">
                      {abaPay.currency === "KHR" ? "៛" : "$"}
                    </span>
                    <span className="text-5xl font-bold tracking-tight">
                      {abaPay.amount || grandTotal.toFixed(2)}
                    </span>
                  </p>

                  {/* Expiration countdown */}
                  <div className="mt-2 flex items-center gap-1.5 text-sm font-medium text-zinc-400">
                    <Clock className="size-4" />
                    <span className="tabular-nums">
                      {Math.floor(khqrLeft / 60)}:
                      {String(khqrLeft % 60).padStart(2, "0")}
                    </span>
                  </div>

                  {/* Waiting indicator */}
                  <div className="mt-4 flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                    <span className="relative flex size-2">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                    </span>
                    {tr(lang, "abaWaiting")}
                  </div>
                </div>
              )}

              <div className="px-6 pb-6 pt-4">
                {khqrExpired ? (
                  /* Expired: no confirm needed — just close & retry. */
                  <button
                    type="button"
                    onClick={() => setAbaPay(null)}
                    className="w-full rounded-xl bg-[#015f7a] py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    {tr(lang, "khqrMakeAnother")}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCancelConfirm(true)}
                    className="w-full rounded-xl border border-zinc-200 py-2.5 text-sm font-semibold text-zinc-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-red-500/30 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                  >
                    {tr(lang, "khqrCancelBtn")}
                  </button>
                )}
              </div>
            </div>
          </ResponsiveModal>
        )}

        {/* Cancel confirmation — a sheet stacked ABOVE the KHQR sheet.
                Kept mounted so it animates in AND out. */}
        {abaPay?.mode === "qr" && (
          <ResponsiveModal
            open={cancelConfirm}
            onOpenChange={(o) => !o && setCancelConfirm(false)}
            title={tr(lang, "khqrCancelTitle")}
            className="sm:max-w-sm"
          >
            <div className="flex flex-col items-center px-6 py-8 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400">
                <AlertTriangle className="size-7" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {tr(lang, "khqrCancelTitle")}
              </h3>
              <p className="mt-1.5 max-w-[16rem] text-sm text-zinc-500 dark:text-zinc-400">
                {tr(lang, "khqrCancelBody")}
              </p>
              <div className="mt-6 grid w-full grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setCancelConfirm(false)}
                  className="rounded-xl bg-[#015f7a] py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  {tr(lang, "khqrKeepPaying")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCancelConfirm(false);
                    setAbaPay(null);
                  }}
                  className="rounded-xl border border-red-200 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
                >
                  {tr(lang, "khqrConfirmCancel")}
                </button>
              </div>
            </div>
          </ResponsiveModal>
        )}
      </div>
    </div>
  );
}

/** Payment-method icon: the uploaded logo, falling back to a default icon if
 *  the image is missing or fails to load. */
function PayIcon({
  iconUrl,
  Icon,
}: {
  iconUrl: string | null;
  Icon: typeof QrCode;
}) {
  const [failed, setFailed] = useState(false);
  if (iconUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={iconUrl}
        alt=""
        className="size-full object-contain rounded-lg"
        onError={() => setFailed(true)}
      />
    );
  }
  return <Icon className="size-6" />;
}

function MethodCard({
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

function Section({
  step,
  title,
  action,
  children,
}: {
  step: number;
  title: string;
  /** Optional control shown at the right of the section header. */
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/60 bg-white/60 p-6 shadow-sm backdrop-blur-md dark:border-zinc-800/60 dark:bg-zinc-900/50">
      <h2 className="mb-5 flex items-center gap-3 text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
        <span className="flex size-7 items-center justify-center rounded-full bg-(--brand) text-sm font-bold text-white shadow-sm shadow-(--brand)/30">
          {step}
        </span>
        {title}
        {action && <span className="ml-auto">{action}</span>}
      </h2>
      {children}
    </div>
  );
}
