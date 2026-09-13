"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Flame, Music2 } from "lucide-react";

const COUNTRIES = [
  { code: "BJ", label: "Bénin" },
  { code: "CI", label: "Côte d’Ivoire" },
  { code: "SN", label: "Sénégal" },
  { code: "CM", label: "Cameroun" },
  { code: "NG", label: "Nigeria" },
  { code: "TG", label: "Togo" },
];

export default function AfriPulsePage() {
  const [country, setCountry] = useState("BJ");
  const [data, setData] = useState<{
    hashtags: { name: string; score: number }[];
    sounds: { name: string; score: number; soundUrl: string | null }[];
    label: string;
    note: string;
  } | null>(null);

  useEffect(() => {
    fetch(`/api/afripulse?country=${country}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, [country]);

  return (
    <div className="min-h-[100dvh] pt-2 md:pt-16 pb-28 max-w-lg mx-auto px-3">
      <header className="flex items-center gap-2 h-12 mb-4">
        <Link href="/" className="p-2 -ml-1 rounded-full hover:bg-white/10" aria-label="Retour">
          <ArrowLeft size={22} />
        </Link>
        <h1 className="font-bold text-lg flex items-center gap-2">
          <Flame size={18} className="text-orange-400" /> AfriPulse
        </h1>
      </header>
      <p className="text-sm text-white/50 mb-4">
        Tendances locales — hashtags & sons qui chauffent près de chez vous.
      </p>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-5">
        {COUNTRIES.map((c) => (
          <button
            key={c.code}
            type="button"
            onClick={() => setCountry(c.code)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border ${
              country === c.code
                ? "bg-white text-black border-white"
                : "border-white/20 text-white/60"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
      {!data && <p className="text-white/40 text-sm">Chargement…</p>}
      {data && (
        <>
          <h2 className="text-sm font-semibold text-white/50 mb-2">
            Hashtags · {data.label}
          </h2>
          <div className="flex flex-wrap gap-2 mb-6">
            {data.hashtags.map((h) => (
              <Link
                key={h.name}
                href={`/recherche?q=${encodeURIComponent("#" + h.name)}`}
                className="px-3 py-1.5 rounded-full bg-orange-400/15 text-orange-200 text-sm font-semibold"
              >
                #{h.name}
              </Link>
            ))}
          </div>
          <h2 className="text-sm font-semibold text-white/50 mb-2 flex items-center gap-1.5">
            <Music2 size={14} /> Sons chauds
          </h2>
          <ul className="space-y-2">
            {data.sounds.length === 0 && (
              <p className="text-sm text-white/40">Pas encore assez de données sons.</p>
            )}
            {data.sounds.map((s) => (
              <li
                key={s.name}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.05] border border-white/10"
              >
                <Music2 size={16} className="text-[#25f4ee]" />
                <span className="text-sm truncate flex-1">{s.name}</span>
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-white/30 mt-4">{data.note}</p>
        </>
      )}
    </div>
  );
}
