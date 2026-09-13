"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Radio } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import { formatCount } from "@/lib/format";
import { Suspense } from "react";

type Item = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  memberCount: number;
  owner: { username: string; displayName: string | null; avatarUrl: string | null };
};

function CommunautesInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const [list, setList] = useState<Item[]>([]);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(sp.get("creer") === "1");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/communities")
      .then((r) => r.json())
      .then((d) => setList(d.communities || []))
      .catch(() => {});
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/communities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.slug) {
          router.push(`/communaute/${data.slug}`);
          return;
        }
        setError(data.error || "Erreur");
        return;
      }
      router.push(`/communaute/${data.community.slug}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] pt-2 md:pt-16 pb-28 max-w-lg mx-auto px-3">
      <header className="flex items-center gap-2 h-12 mb-4">
        <Link href="/" className="p-2 -ml-1 rounded-full hover:bg-white/10" aria-label="Retour">
          <ArrowLeft size={22} />
        </Link>
        <h1 className="font-bold text-lg flex items-center gap-2">
          <Radio size={18} className="text-[#25f4ee]" /> Panneaux
        </h1>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="ml-auto text-sm font-semibold text-[#25f4ee]"
        >
          {creating ? "Annuler" : "Créer"}
        </button>
      </header>

      {creating && (
        <form onSubmit={create} className="mb-6 rounded-2xl bg-white/[0.06] border border-white/10 p-4 space-y-3">
          <p className="text-sm font-semibold">Créer mon panneau</p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom du panneau"
            maxLength={60}
            className="w-full bg-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#fe2c55]"
          />
          {error && <p className="text-xs text-[#fe2c55]">{error}</p>}
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full py-2.5 rounded-full bg-[#fe2c55] text-sm font-semibold disabled:opacity-40"
          >
            Créer
          </button>
        </form>
      )}

      <ul className="space-y-2">
        {list.map((c) => (
          <li key={c.id}>
            <Link
              href={`/communaute/${c.slug}`}
              className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.05] border border-white/10 hover:bg-white/[0.08]"
            >
              <Avatar
                username={c.owner.username}
                avatarUrl={c.owner.avatarUrl}
                size={44}
              />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate">{c.name}</p>
                <p className="text-[11px] text-white/45 truncate">
                  par @{c.owner.username} · {formatCount(c.memberCount)} membres
                </p>
              </div>
            </Link>
          </li>
        ))}
        {list.length === 0 && (
          <p className="text-center text-white/40 text-sm py-12">
            Aucun panneau public pour l’instant.
          </p>
        )}
      </ul>
    </div>
  );
}

export default function CommunautesPage() {
  return (
    <Suspense fallback={<p className="text-center text-white/40 py-20">Chargement…</p>}>
      <CommunautesInner />
    </Suspense>
  );
}
