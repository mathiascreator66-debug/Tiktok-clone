"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Avatar from "@/components/Avatar";

type Row = {
  id: string;
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
};

export default function ComptesBloquesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/blocks", { credentials: "include" });
      if (res.status === 401) {
        window.location.href = "/connexion?next=/parametres/bloques";
        return;
      }
      const data = await res.json();
      setRows(data.blocks || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function unblock(username: string) {
    await fetch(`/api/blocks/${encodeURIComponent(username)}`, {
      method: "DELETE",
      credentials: "include",
    });
    setRows((r) => r.filter((x) => x.user.username !== username));
  }

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
        <h1 className="font-bold text-lg">Comptes bloqués</h1>
      </header>
      {loading && (
        <p className="text-center text-white/40 text-sm py-10">Chargement…</p>
      )}
      {!loading && rows.length === 0 && (
        <p className="text-center text-white/40 text-sm py-10">
          Aucun compte bloqué.
        </p>
      )}
      <ul className="space-y-2">
        {rows.map((r) => (
          <li
            key={r.id}
            className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.05] border border-white/10"
          >
            <Avatar
              username={r.user.username}
              avatarUrl={r.user.avatarUrl}
              size={44}
            />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate">
                {r.user.displayName || r.user.username}
              </p>
              <p className="text-xs text-white/40">@{r.user.username}</p>
            </div>
            <button
              type="button"
              onClick={() => unblock(r.user.username)}
              className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/10"
            >
              Débloquer
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
