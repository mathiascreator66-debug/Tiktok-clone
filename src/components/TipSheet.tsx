"use client";

import { useEffect, useState } from "react";
import { Gift, X, Loader2 } from "lucide-react";
import { formatEuros, TIP_AMOUNTS_CENTS } from "@/lib/wallet-shared";

type Props = {
  open: boolean;
  onClose: () => void;
  toUsername: string;
  videoId?: string;
  isLoggedIn: boolean;
  onTipped?: (balanceCents: number) => void;
};

export default function TipSheet({
  open,
  onClose,
  toUsername,
  videoId,
  isLoggedIn,
  onTipped,
}: Props) {
  const [balanceCents, setBalanceCents] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    if (!open || !isLoggedIn) return;
    setError("");
    setOk("");
    fetch("/api/wallet", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.balanceCents === "number") setBalanceCents(d.balanceCents);
      })
      .catch(() => {});
  }, [open, isLoggedIn]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function tip(amountCents: number) {
    if (!isLoggedIn) {
      window.location.href = "/connexion";
      return;
    }
    setSending(true);
    setError("");
    setOk("");
    try {
      const res = await fetch("/api/tips", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents, toUsername, videoId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur");
        return;
      }
      setBalanceCents(data.balanceCents);
      setOk(`Pourboire de ${formatEuros(amountCents)} envoyé (démo)`);
      onTipped?.(data.balanceCents);
    } catch {
      setError("Erreur réseau.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/55"
        aria-label="Fermer"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-[#1a1a1a] rounded-t-2xl border-t border-white/10 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <p className="font-semibold text-sm flex items-center gap-2">
            <Gift size={16} className="text-[#fe2c55]" />
            Offrir à @{toUsername}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        <p className="px-4 text-[11px] text-amber-200/70 mb-3">
          Pourboire (montant libre) — distinct des cadeaux vidéo (catalogue emoji).
          Démo — crédits virtuels. Frais plateforme 10 %.
        </p>

        {balanceCents !== null && (
          <p className="px-4 text-xs text-white/45 mb-3">
            Solde : {formatEuros(balanceCents)}
          </p>
        )}

        <div className="flex gap-2 px-4 pb-3">
          {TIP_AMOUNTS_CENTS.map((cents) => {
            const enough =
              balanceCents === null ? true : balanceCents >= cents;
            return (
              <button
                key={cents}
                type="button"
                disabled={sending || !enough}
                onClick={() => tip(cents)}
                className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/15 font-semibold text-sm disabled:opacity-35"
              >
                {formatEuros(cents)}
              </button>
            );
          })}
        </div>

        {sending && (
          <p className="px-4 pb-2 text-xs text-white/50 flex items-center gap-1">
            <Loader2 size={12} className="animate-spin" /> Envoi…
          </p>
        )}
        {error && (
          <p className="px-4 pb-2 text-xs text-[#fe2c55]">{error}</p>
        )}
        {ok && (
          <p className="px-4 pb-2 text-xs text-emerald-400">{ok}</p>
        )}

        <a
          href="/solde"
          className="block text-center text-xs text-[#25f4ee] py-2 mb-1"
        >
          Gérer mon solde
        </a>
      </div>
    </div>
  );
}
