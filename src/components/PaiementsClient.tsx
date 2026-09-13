"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import {
  PAYMENT_PROVIDERS,
  PROVIDER_HINTS,
  PROVIDER_LABELS,
  fieldsForProvider,
  type PaymentProvider,
} from "@/lib/payments";

type Method = {
  id: string;
  provider: string;
  label: string;
  phoneE164: string | null;
  email: string | null;
  walletAddress: string | null;
  isDefault: boolean;
};

export default function PaiementsClient({ username }: { username: string }) {
  const [methods, setMethods] = useState<Method[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [provider, setProvider] = useState<PaymentProvider>("MTN");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [wallet, setWallet] = useState("");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/payments/user-methods", {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur");
        return;
      }
      setMethods(data.methods || []);
    } catch {
      setError("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function addMethod(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/payments/user-methods", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          phoneE164: phone,
          email,
          walletAddress: wallet,
          label: label || undefined,
          isDefault: methods.length === 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur");
        return;
      }
      setPhone("");
      setEmail("");
      setWallet("");
      setLabel("");
      await load();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Supprimer ce moyen de paiement ?")) return;
    const res = await fetch("/api/payments/user-methods", {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) await load();
  }

  const fields = fieldsForProvider(provider);

  return (
    <div className="min-h-[100dvh] pt-2 md:pt-16 pb-24 max-w-lg mx-auto px-3">
      <header className="flex items-center gap-2 h-12 mb-4">
        <Link
          href="/parametres"
          className="p-2 -ml-1 rounded-full hover:bg-white/10"
          aria-label="Retour"
        >
          <ArrowLeft size={22} />
        </Link>
        <h1 className="font-bold text-lg flex-1">Moyens de paiement</h1>
        <Link href="/solde" className="text-xs font-semibold text-[#25f4ee]">
          Solde
        </Link>
      </header>

      <p className="text-[11px] text-amber-200/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mb-4">
        Enregistrez un numéro MoMo, un e-mail PayPal ou une adresse crypto pour
        les recharges / payouts. Aujourd&apos;hui : démo uniquement — aucun
        transfert réel.
      </p>

      {loading ? (
        <p className="text-white/40 text-sm flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" /> Chargement…
        </p>
      ) : methods.length === 0 ? (
        <p className="text-white/40 text-sm mb-4">Aucun moyen enregistré.</p>
      ) : (
        <ul className="rounded-xl border border-white/10 divide-y divide-white/5 mb-6 bg-white/[0.03]">
          {methods.map((m) => (
            <li key={m.id} className="px-4 py-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">
                  {m.label ||
                    PROVIDER_LABELS[m.provider as PaymentProvider] ||
                    m.provider}
                  {m.isDefault && (
                    <span className="ml-2 text-[10px] text-[#25f4ee]">
                      défaut
                    </span>
                  )}
                </p>
                <p className="text-xs text-white/45 truncate">
                  {m.phoneE164 || m.email || m.walletAddress}
                </p>
              </div>
              <button
                type="button"
                onClick={() => remove(m.id)}
                className="p-2 text-[#fe2c55] hover:bg-white/5 rounded-full"
                aria-label="Supprimer"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={addMethod}
        className="rounded-xl border border-white/10 bg-white/[0.04] p-4 space-y-3"
      >
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <Plus size={16} /> Ajouter
        </h2>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value as PaymentProvider)}
          className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-sm"
        >
          {PAYMENT_PROVIDERS.map((p) => (
            <option key={p} value={p}>
              {PROVIDER_LABELS[p]}
            </option>
          ))}
        </select>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Libellé (optionnel)"
          className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-sm"
        />
        {fields.phone && (
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={PROVIDER_HINTS[provider] + " (+229…)"}
            className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-sm"
            required
          />
        )}
        {fields.email && (
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={PROVIDER_HINTS[provider]}
            className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-sm"
            required
          />
        )}
        {fields.wallet && (
          <input
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            placeholder={PROVIDER_HINTS[provider]}
            className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-sm"
            required
          />
        )}
        {error && <p className="text-[#fe2c55] text-sm">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-[#fe2c55] font-semibold py-2.5 rounded-xl disabled:opacity-50"
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </form>

      <p className="text-[11px] text-white/35 mt-4 text-center">
        Compte : @{username}
      </p>
    </div>
  );
}
