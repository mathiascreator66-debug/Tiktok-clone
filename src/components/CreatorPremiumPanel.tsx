"use client";

import { useCallback, useEffect, useState } from "react";
import { Crown, Loader2 } from "lucide-react";
import { formatEuros } from "@/lib/wallet-shared";
import PaymentMethodPicker from "./PaymentMethodPicker";

type Plan = {
  id: string;
  priceCents: number;
  perks: string | null;
  active: boolean;
};

type Props = {
  username: string;
  isMe: boolean;
  isLoggedIn: boolean;
};

/**
 * Abonnement Premium fan → créateur.
 * ≠ badge certifié (isVerified) ≠ AfriVoix Pro (plateforme).
 */
export default function CreatorPremiumPanel({
  username,
  isMe,
  isLoggedIn,
}: Props) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [subActive, setSubActive] = useState(false);
  const [subUntil, setSubUntil] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [priceCents, setPriceCents] = useState(500);
  const [perks, setPerks] = useState("Vidéos exclusives, badge Abonné sur mes commentaires");
  const [provider, setProvider] = useState("WALLET");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/creator-premium?username=${encodeURIComponent(username)}`,
        { credentials: "include" }
      );
      const data = await res.json();
      if (!res.ok) return;
      setPlan(data.plan);
      if (data.plan) {
        setPriceCents(data.plan.priceCents);
        setPerks(data.plan.perks || "");
      }
      setSubActive(Boolean(data.subscription?.active));
      setSubUntil(data.subscription?.until || null);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    void load();
  }, [load]);

  async function savePlan() {
    setActing(true);
    setError("");
    setOk("");
    try {
      const res = await fetch("/api/creator-premium", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upsert_plan",
          priceCents,
          perks,
          active: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur");
        return;
      }
      setOk("Offre Premium créateur enregistrée (≠ badge certifié ≠ AfriVoix Pro)");
      await load();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setActing(false);
    }
  }

  async function subscribe() {
    if (!isLoggedIn) {
      window.location.href = "/connexion";
      return;
    }
    setActing(true);
    setError("");
    setOk("");
    try {
      const res = await fetch("/api/creator-premium", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "subscribe",
          username,
          provider,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur");
        return;
      }
      setOk("Abonnement Premium activé 30 jours (démo — pas d'argent réel)");
      await load();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <div className="mb-0 text-xs text-white/40 flex items-center gap-1">
        <Loader2 size={12} className="animate-spin" /> Premium…
      </div>
    );
  }

  if (isMe) {
    return (
      <div className="mb-0 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 space-y-2">
        <p className="text-sm font-semibold flex items-center gap-1.5">
          <Crown size={16} className="text-amber-300" /> Premium créateur
        </p>
        <p className="text-[11px] text-white/55 leading-relaxed">
          Abonnement mensuel fan → vous. Ce n&apos;est{" "}
          <strong>pas</strong> le badge certifié, ni AfriVoix Pro (plateforme).
        </p>
        <label className="block text-xs text-white/50">
          Prix / mois (démo)
          <input
            type="number"
            min={1}
            step={0.5}
            value={(priceCents / 100).toFixed(2)}
            onChange={(e) =>
              setPriceCents(Math.round(parseFloat(e.target.value || "0") * 100))
            }
            className="mt-1 w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="block text-xs text-white/50">
          Avantages
          <textarea
            value={perks}
            onChange={(e) => setPerks(e.target.value)}
            rows={2}
            className="mt-1 w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-sm text-white"
          />
        </label>
        <button
          type="button"
          disabled={acting}
          onClick={savePlan}
          className="w-full py-2 rounded-lg bg-amber-400 text-black text-sm font-semibold disabled:opacity-50"
        >
          {plan?.active ? "Mettre à jour l'offre" : "Activer Premium créateur"}
        </button>
        {error && <p className="text-xs text-[#fe2c55]">{error}</p>}
        {ok && <p className="text-xs text-emerald-400">{ok}</p>}
      </div>
    );
  }

  if (!plan?.active) return null;

  return (
    <div className="mb-0 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 space-y-2">
      <p className="text-sm font-semibold flex items-center gap-1.5">
        <Crown size={16} className="text-amber-300" /> Premium · @{username}
      </p>
      <p className="text-xs text-white/60">{plan.perks}</p>
      <p className="text-sm font-bold">{formatEuros(plan.priceCents)} / mois</p>
      <p className="text-[10px] text-white/40">
        ≠ badge certifié ≠ AfriVoix Pro — démo crédits virtuels
      </p>
      {subActive ? (
        <p className="text-xs text-emerald-300">
          Abonné jusqu&apos;au{" "}
          {subUntil
            ? new Date(subUntil).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
              })
            : "—"}
        </p>
      ) : (
        <>
          <PaymentMethodPicker value={provider} onChange={setProvider} />
          <button
            type="button"
            disabled={acting}
            onClick={subscribe}
            className="w-full py-2 rounded-lg bg-[#fe2c55] text-sm font-semibold disabled:opacity-50"
          >
            {acting ? "…" : "S'abonner (démo)"}
          </button>
        </>
      )}
      {error && <p className="text-xs text-[#fe2c55]">{error}</p>}
      {ok && <p className="text-xs text-emerald-400">{ok}</p>}
    </div>
  );
}
