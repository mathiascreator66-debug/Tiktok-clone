"use client";

import { useEffect, useState } from "react";
import { Gift, X, Loader2 } from "lucide-react";
import { formatEuros } from "@/lib/wallet-shared";
import type { GiftCatalogItem } from "@/lib/gifts";
import PaymentMethodPicker from "./PaymentMethodPicker";
import Link from "next/link";

type Props = {
  open: boolean;
  onClose: () => void;
  videoId: string;
  toUsername: string;
  isLoggedIn: boolean;
  onGifted?: (gift: GiftCatalogItem) => void;
};

export default function GiftSheet({
  open,
  onClose,
  videoId,
  toUsername,
  isLoggedIn,
  onGifted,
}: Props) {
  const [gifts, setGifts] = useState<GiftCatalogItem[]>([]);
  const [balanceCents, setBalanceCents] = useState<number | null>(null);
  const [provider, setProvider] = useState("WALLET");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [flyEmoji, setFlyEmoji] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError("");
    setOk("");
    fetch("/api/gifts")
      .then((r) => r.json())
      .then((d) => setGifts(d.gifts || []))
      .catch(() => {});
    if (isLoggedIn) {
      fetch("/api/wallet", { credentials: "include" })
        .then((r) => r.json())
        .then((d) => {
          if (typeof d.balanceCents === "number") setBalanceCents(d.balanceCents);
        })
        .catch(() => {});
    }
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

  async function send(gift: GiftCatalogItem) {
    if (!isLoggedIn) {
      window.location.href = "/connexion";
      return;
    }
    setSending(true);
    setError("");
    setOk("");
    try {
      const res = await fetch("/api/gifts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          giftId: gift.id,
          videoId,
          provider,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur");
        return;
      }
      setBalanceCents(data.balanceCents);
      setOk(`${gift.emoji} ${gift.label} envoyé (démo — pas d'argent réel)`);
      setFlyEmoji(gift.emoji);
      setTimeout(() => setFlyEmoji(null), 1200);
      onGifted?.(gift);
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
      {flyEmoji && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center z-[96] text-7xl"
          style={{ animation: "afrivoix-gift-pop 1.1s ease-out forwards" }}
        >
          {flyEmoji}
        </div>
      )}
      <div className="relative w-full max-w-lg bg-[#1a1a1a] rounded-t-2xl border-t border-white/10 pb-[max(1rem,env(safe-area-inset-bottom))] max-h-[85dvh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 pt-3 pb-2 sticky top-0 bg-[#1a1a1a] z-10">
          <p className="font-semibold text-sm flex items-center gap-2">
            <Gift size={16} className="text-[#fe2c55]" />
            Cadeaux pour @{toUsername}
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

        <p className="px-4 text-[11px] text-amber-200/70 mb-1">
          Cadeaux vidéo (catalogue) — distinct des pourboires (montants libres sur
          le profil). Démo — crédits virtuels.
        </p>
        {balanceCents !== null && (
          <p className="px-4 text-xs text-white/45 mb-3">
            Solde : {formatEuros(balanceCents)} ·{" "}
            <Link href="/solde" className="text-[#25f4ee]">
              Recharger
            </Link>
          </p>
        )}

        <div className="px-4 mb-4">
          <PaymentMethodPicker value={provider} onChange={setProvider} />
        </div>

        <div className="grid grid-cols-3 gap-2 px-4 pb-4">
          {gifts.map((g) => (
            <button
              key={g.id}
              type="button"
              disabled={sending}
              onClick={() => send(g)}
              className="rounded-xl bg-white/8 border border-white/10 py-3 px-2 hover:bg-white/12 disabled:opacity-40"
            >
              <span className="text-2xl block mb-1">{g.emoji}</span>
              <span className="text-xs font-medium block">{g.label}</span>
              <span className="text-[11px] text-white/45">
                {formatEuros(g.priceCents)}
              </span>
            </button>
          ))}
        </div>

        {sending && (
          <p className="px-4 pb-2 text-xs text-white/50 flex items-center gap-1">
            <Loader2 size={12} className="animate-spin" /> Envoi…
          </p>
        )}
        {error && <p className="px-4 pb-2 text-xs text-[#fe2c55]">{error}</p>}
        {ok && <p className="px-4 pb-2 text-xs text-emerald-400">{ok}</p>}

        <Link
          href={`/profil/${toUsername}`}
          className="block text-center text-[11px] text-white/40 py-2 mb-1"
        >
          Pour un pourboire libre → profil
        </Link>
      </div>
      <style
        dangerouslySetInnerHTML={{
          __html: `@keyframes afrivoix-gift-pop{0%{transform:scale(.2) translateY(40px);opacity:0}30%{transform:scale(1.2) translateY(0);opacity:1}100%{transform:scale(1.6) translateY(-80px);opacity:0}}`,
        }}
      />
    </div>
  );
}
