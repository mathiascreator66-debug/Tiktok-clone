"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";

type Config = {
  id: string;
  countryCode: string;
  provider: string;
  label: string;
  enabled: boolean;
  currency: string;
};

export default function AdminPaiementsClient() {
  const [configs, setConfigs] = useState<Config[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/payments", { credentials: "include" });
      const data = await res.json();
      if (res.ok) setConfigs(data.configs || []);
      else setMsg(data.error || "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(c: Config) {
    setMsg("");
    const res = await fetch("/api/admin/payments", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: c.id, enabled: !c.enabled }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Erreur");
      return;
    }
    setMsg(`${c.label} (${c.countryCode}) → ${!c.enabled ? "activé" : "désactivé"}`);
    await load();
  }

  return (
    <div className="min-h-[100dvh] pt-2 md:pt-16 pb-24 max-w-2xl mx-auto px-3">
      <header className="flex items-center gap-2 h-12 mb-4">
        <Link href="/admin" className="p-2 -ml-1 rounded-full hover:bg-white/10">
          <ArrowLeft size={22} />
        </Link>
        <h1 className="font-bold text-lg">Paiements par pays</h1>
      </header>
      <p className="text-[11px] text-amber-200/80 mb-4">
        Activez / désactivez MTN, Moov, Orange, Wave, PayPal, Crypto par pays.
        Mode démo — pas de vrais appels API.
      </p>
      {msg && <p className="text-sm text-[#25f4ee] mb-3">{msg}</p>}
      {loading ? (
        <p className="text-white/40 flex items-center gap-2 text-sm">
          <Loader2 size={14} className="animate-spin" /> Chargement…
        </p>
      ) : (
        <ul className="rounded-xl border border-white/10 divide-y divide-white/5 bg-white/[0.03]">
          {configs.map((c) => (
            <li
              key={c.id}
              className="px-4 py-3 flex items-center gap-3 text-sm"
            >
              <div className="flex-1">
                <p className="font-medium">
                  {c.label}{" "}
                  <span className="text-white/40">· {c.countryCode}</span>
                </p>
                <p className="text-[11px] text-white/40">{c.currency}</p>
              </div>
              <button
                type="button"
                onClick={() => toggle(c)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  c.enabled
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-white/10 text-white/50"
                }`}
              >
                {c.enabled ? "Activé" : "Désactivé"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
