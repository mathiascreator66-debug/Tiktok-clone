"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  Loader2,
  Sparkles,
  Ban,
} from "lucide-react";
import { formatEuros } from "@/lib/wallet-shared";

type ProState = {
  isPro: boolean;
  proUntil: string | null;
  proTrialUsed: boolean;
  balanceCents: number;
  costCents: number;
  trialDays: number;
};

export default function ProClient({ username }: { username: string }) {
  const [state, setState] = useState<ProState | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pro", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur");
        return;
      }
      setState(data);
    } catch {
      setError("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function activate(useTrial: boolean) {
    setActing(true);
    setError("");
    setOkMsg("");
    try {
      const res = await fetch("/api/pro", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ useTrial }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur");
        return;
      }
      setOkMsg(
        useTrial
          ? "Essai Pro activé 7 jours (démo)"
          : "ClipTok Pro activé 7 jours (démo — crédits virtuels)"
      );
      await load();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="min-h-[100dvh] pt-2 md:pt-16 pb-24 max-w-lg mx-auto px-3">
      <header className="flex items-center gap-2 h-12 mb-4">
        <Link
          href={`/profil/${username}`}
          className="p-2 -ml-1 rounded-full hover:bg-white/10"
          aria-label="Retour"
        >
          <ArrowLeft size={22} />
        </Link>
        <h1 className="font-bold text-lg flex-1">ClipTok Pro</h1>
        <Link href="/solde" className="text-xs font-semibold text-white/60">
          Solde
        </Link>
      </header>

      <div className="rounded-2xl bg-gradient-to-br from-amber-500/25 via-[#fe2c55]/20 to-[#25f4ee]/25 border border-white/10 p-5 mb-5">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="text-amber-300" size={22} />
          <h2 className="text-xl font-bold">ClipTok Pro</h2>
        </div>
        {loading && !state ? (
          <div className="flex items-center gap-2 text-white/60">
            <Loader2 size={16} className="animate-spin" /> Chargement…
          </div>
        ) : state?.isPro ? (
          <p className="text-sm text-emerald-300">
            Actif jusqu’au{" "}
            {state.proUntil
              ? new Date(state.proUntil).toLocaleString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—"}
          </p>
        ) : (
          <p className="text-sm text-white/70">
            Passez Pro pour le badge et les avantages démo.
          </p>
        )}
        <p className="mt-3 text-[11px] text-amber-200/80 bg-black/20 rounded-lg px-2 py-1.5">
          Démo — crédits virtuels. Pas d’abonnement réel ni de Stripe pour
          l’instant.
        </p>
      </div>

      <ul className="space-y-3 mb-6">
        <Benefit
          icon={<BadgeCheck size={20} className="text-amber-300" />}
          title="Badge Pro"
          desc="Affiché sur votre profil et avatar"
        />
        <Benefit
          icon={<Ban size={20} className="text-white/70" />}
          title="Sans pubs (bientôt)"
          desc="Placeholder — pas de pubs aujourd’hui"
        />
        <Benefit
          icon={<BarChart3 size={20} className="text-[#25f4ee]" />}
          title="Analytics (aperçu)"
          desc="Teaser statistiques créateur — à venir"
        />
      </ul>

      {state && (
        <p className="text-xs text-white/45 mb-3 text-center">
          Solde actuel : {formatEuros(state.balanceCents)}
        </p>
      )}

      <div className="space-y-2">
        <button
          type="button"
          disabled={acting || !state || state.proTrialUsed}
          onClick={() => activate(true)}
          className="w-full py-3 rounded-xl font-semibold bg-white/10 border border-white/15 disabled:opacity-40"
        >
          {state?.proTrialUsed
            ? "Essai gratuit déjà utilisé"
            : "Essai gratuit 7 jours (une fois)"}
        </button>
        <button
          type="button"
          disabled={acting || !state}
          onClick={() => activate(false)}
          className="w-full py-3 rounded-xl font-semibold bg-[#fe2c55] disabled:opacity-40"
        >
          Passer Pro (démo 7 jours) —{" "}
          {formatEuros(state?.costCents ?? 300)}
        </button>
      </div>

      {error && (
        <p className="text-[#fe2c55] text-sm mt-3 text-center">{error}</p>
      )}
      {okMsg && (
        <p className="text-emerald-400 text-sm mt-3 text-center">{okMsg}</p>
      )}

      <section
        id="promouvoir"
        className="mt-10 scroll-mt-20 rounded-xl border border-white/10 bg-white/[0.04] p-4"
      >
        <h2 className="font-semibold text-sm mb-2">Promouvoir une vidéo</h2>
        <p className="text-xs text-white/55 leading-relaxed mb-3">
          Sur une de vos vidéos, ouvrez le menu propriétaire (⋮) et choisissez{" "}
          <strong>Booster (2 € démo)</strong>. La vidéo monte en tête du fil « Pour
          toi » pendant 24 h. Démo — crédits virtuels uniquement.
        </p>
        <Link
          href={`/profil/${username}`}
          className="text-xs font-semibold text-[#25f4ee]"
        >
          Voir mon profil →
        </Link>
      </section>
    </div>
  );
}

function Benefit({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <li className="flex gap-3 items-start rounded-xl bg-white/[0.05] border border-white/10 px-4 py-3">
      <span className="mt-0.5">{icon}</span>
      <div>
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-xs text-white/45">{desc}</p>
      </div>
    </li>
  );
}
