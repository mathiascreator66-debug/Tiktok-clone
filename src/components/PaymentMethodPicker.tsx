"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { providerLabel, type PaymentProvider } from "@/lib/payments";

export type MethodOption = {
  provider: PaymentProvider | "WALLET";
  label: string;
  currency?: string;
};

type Props = {
  /** Inclure l'option Solde AfriVoix */
  includeWallet?: boolean;
  walletLabel?: string;
  value: string;
  onChange: (provider: string) => void;
  className?: string;
};

export default function PaymentMethodPicker({
  includeWallet = true,
  walletLabel = "Solde AfriVoix",
  value,
  onChange,
  className = "",
}: Props) {
  const [methods, setMethods] = useState<MethodOption[]>([]);
  const [country, setCountry] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/payments/methods", { credentials: "include" });
        const data = await res.json();
        if (!res.ok || cancelled) return;
        setCountry(data.countryCode || null);
        const opts: MethodOption[] = (data.methods || []).map(
          (m: { provider: PaymentProvider; label: string; currency: string }) => ({
            provider: m.provider,
            label: m.label,
            currency: m.currency,
          })
        );
        setMethods(opts);
        if (!value) {
          if (includeWallet) onChange("WALLET");
          else if (opts[0]) onChange(opts[0].provider);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <p className={`text-xs text-white/45 flex items-center gap-1 ${className}`}>
        <Loader2 size={12} className="animate-spin" /> Moyens de paiement…
      </p>
    );
  }

  const all: MethodOption[] = [
    ...(includeWallet
      ? [{ provider: "WALLET" as const, label: walletLabel }]
      : []),
    ...methods,
  ];

  return (
    <div className={className}>
      <p className="text-[11px] text-white/40 mb-1.5">
        Paiement {country ? `(pays : ${country})` : "(international)"} — démo
      </p>
      <div className="grid grid-cols-2 gap-2">
        {all.map((m) => {
          const selected = value === m.provider;
          return (
            <button
              key={m.provider}
              type="button"
              onClick={() => onChange(m.provider)}
              className={`text-left rounded-xl border px-3 py-2.5 text-xs transition ${
                selected
                  ? "border-[#25f4ee] bg-[#25f4ee]/15"
                  : "border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <span className="font-semibold block">
                {m.label || providerLabel(m.provider)}
              </span>
              {m.currency && (
                <span className="text-white/40">{m.currency}</span>
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] text-amber-200/70">
        Mode démo — aucun argent réel. Les clés API (MTN, Orange, Wave, PayPal,
        crypto) seront branchées plus tard.
      </p>
    </div>
  );
}
