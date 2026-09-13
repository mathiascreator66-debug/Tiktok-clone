"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";

export default function VoixDuJourPage() {
  const [data, setData] = useState<{
    date: string;
    prompt: string;
    hashtag: string;
    badge: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/voix-du-jour")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-[100dvh] pt-2 md:pt-16 pb-28 max-w-lg mx-auto px-3">
      <header className="flex items-center gap-2 h-12 mb-6">
        <Link href="/" className="p-2 -ml-1 rounded-full hover:bg-white/10" aria-label="Retour">
          <ArrowLeft size={22} />
        </Link>
        <h1 className="font-bold text-lg flex items-center gap-2">
          <Sparkles size={18} className="text-amber-300" /> Voix du jour
        </h1>
      </header>
      {!data ? (
        <p className="text-white/40 text-sm">Chargement…</p>
      ) : (
        <div className="rounded-3xl bg-gradient-to-br from-amber-500/20 to-[#fe2c55]/20 border border-amber-400/30 p-6 text-center">
          <p className="text-[11px] uppercase tracking-widest text-amber-200/80 mb-3">
            {data.badge} · {data.date}
          </p>
          <p className="text-xl font-bold leading-snug mb-4">{data.prompt}</p>
          <p className="text-sm text-[#25f4ee] font-semibold mb-6">#{data.hashtag}</p>
          <Link
            href={`/telecharger?caption=${encodeURIComponent("#" + data.hashtag + " " + data.prompt)}`}
            className="inline-block px-6 py-3 rounded-full bg-[#fe2c55] font-semibold text-sm"
          >
            Relever le défi
          </Link>
        </div>
      )}
      <p className="text-xs text-white/40 mt-6 text-center">
        Challenge quotidien AfriVoix — publiez avec le hashtag pour gagner le
        badge communautaire.
      </p>
    </div>
  );
}
