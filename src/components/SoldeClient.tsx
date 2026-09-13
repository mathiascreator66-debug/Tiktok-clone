"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Coins, Loader2, Sparkles, CreditCard } from "lucide-react";
import { formatEuros } from "@/lib/wallet-shared";
import { DEMO_TOPUP_AMOUNTS_CENTS } from "@/lib/payments";
import PaymentMethodPicker from "./PaymentMethodPicker";

type Tx = {
  id: string;
  type: string;
  amountCents: number;
  provider?: string | null;
  status?: string;
  meta: Record<string, unknown> | null;
  createdAt: string;
};

const TYPE_LABELS: Record<string, string> = {
  credit: "Crédit",
  debit: "Débit",
  tip_sent: "Pourboire envoyé",
  tip_received: "Pourboire reçu",
  gift_sent: "Cadeau envoyé",
  gift_received: "Cadeau reçu",
  boost: "Boost vidéo",
  subscription: "AfriVoix Pro",
  creator_sub: "Abonnement Premium créateur",
};

export default function SoldeClient({ username }: { username: string }) {
  const [balanceCents, setBalanceCents] = useState<number | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [crediting, setCrediting] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [amountCents, setAmountCents] = useState<number>(DEMO_TOPUP_AMOUNTS_CENTS[0]);
  const [provider, setProvider] = useState("MTN");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/wallet", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur");
        return;
      }
      setBalanceCents(data.balanceCents);
      setTxs(data.transactions || []);
    } catch {
      setError("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function payDemo() {
    setCrediting(true);
    setError("");
    setToast("");
    try {
      const res = await fetch("/api/payments/demo-checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountCents,
          provider,
          purpose: "topup",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur");
        return;
      }
      setBalanceCents(data.balanceCents);
      setToast(
        `${formatEuros(amountCents)} crédités via ${provider} (DÉMO — aucun argent réel)`
      );
      await load();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setCrediting(false);
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
        <h1 className="font-bold text-lg flex-1">Solde</h1>
        <Link
          href="/parametres/paiements"
          className="text-xs font-semibold text-white/60 flex items-center gap-1"
        >
          <CreditCard size={14} /> Moyens
        </Link>
        <Link
          href="/pro"
          className="text-xs font-semibold text-[#25f4ee] flex items-center gap-1"
        >
          <Sparkles size={14} /> Pro
        </Link>
      </header>

      <div className="rounded-2xl bg-gradient-to-br from-[#fe2c55]/30 to-[#25f4ee]/20 border border-white/10 p-5 mb-4">
        <p className="text-xs text-white/50 uppercase tracking-wide mb-1">
          Portefeuille
        </p>
        {loading && balanceCents === null ? (
          <div className="flex items-center gap-2 text-white/60 py-2">
            <Loader2 size={18} className="animate-spin" /> Chargement…
          </div>
        ) : (
          <p className="text-3xl font-bold tabular-nums">
            {formatEuros(balanceCents ?? 0)}
          </p>
        )}
        <p className="mt-2 text-[11px] text-amber-200/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1.5 inline-block">
          Démo — crédits virtuels. Aucun paiement réel tant que les clés API ne
          sont pas configurées.
        </p>
      </div>

      <section className="rounded-xl border border-white/10 bg-white/[0.04] p-4 mb-4 space-y-3">
        <h2 className="font-semibold text-sm">Recharger (démo)</h2>
        <div className="flex flex-wrap gap-2">
          {DEMO_TOPUP_AMOUNTS_CENTS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setAmountCents(c)}
              className={`px-3 py-2 rounded-lg text-sm font-semibold border ${
                amountCents === c
                  ? "border-[#25f4ee] bg-[#25f4ee]/15"
                  : "border-white/10 bg-white/5"
              }`}
            >
              {formatEuros(c)}
            </button>
          ))}
        </div>
        <PaymentMethodPicker
          includeWallet={false}
          value={provider}
          onChange={setProvider}
        />
        <button
          type="button"
          onClick={payDemo}
          disabled={crediting || !provider}
          className="w-full flex items-center justify-center gap-2 bg-white text-black font-semibold py-3 rounded-xl disabled:opacity-50"
        >
          <Coins size={18} />
          {crediting ? "Paiement démo…" : `Payer (démo) — ${formatEuros(amountCents)}`}
        </button>
      </section>

      {error && (
        <p className="text-[#fe2c55] text-sm mb-3 text-center">{error}</p>
      )}
      {toast && (
        <p className="text-[#25f4ee] text-sm mb-3 text-center">{toast}</p>
      )}

      <h2 className="font-semibold text-sm text-white/70 mb-2">Historique</h2>
      {loading && txs.length === 0 ? (
        <p className="text-white/40 text-sm">Chargement…</p>
      ) : txs.length === 0 ? (
        <p className="text-white/40 text-sm">Aucune transaction pour l’instant.</p>
      ) : (
        <ul className="rounded-xl border border-white/10 divide-y divide-white/5 overflow-hidden bg-white/[0.03]">
          {txs.map((t) => {
            const note =
              t.meta && typeof t.meta.note === "string" ? t.meta.note : null;
            const positive = t.amountCents > 0;
            return (
              <li key={t.id} className="px-4 py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {TYPE_LABELS[t.type] || t.type}
                    {t.provider ? (
                      <span className="text-white/40 font-normal">
                        {" "}
                        · {t.provider}
                      </span>
                    ) : null}
                  </p>
                  {note && (
                    <p className="text-[11px] text-white/40 truncate">{note}</p>
                  )}
                  <p className="text-[11px] text-white/30 mt-0.5">
                    {new Date(t.createdAt).toLocaleString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {t.status && t.status !== "COMPLETED"
                      ? ` · ${t.status}`
                      : ""}
                  </p>
                </div>
                <span
                  className={`text-sm font-semibold tabular-nums ${
                    positive
                      ? "text-emerald-400"
                      : t.amountCents < 0
                        ? "text-[#fe2c55]"
                        : "text-white/50"
                  }`}
                >
                  {positive ? "+" : ""}
                  {formatEuros(t.amountCents)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
