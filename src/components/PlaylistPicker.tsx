"use client";

import { useEffect, useState } from "react";
import { FolderPlus, ListMusic, X } from "lucide-react";

type Playlist = {
  id: string;
  title: string;
  itemCount: number;
};

export default function PlaylistPicker({
  open,
  onClose,
  videoId,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  videoId: string;
  onDone?: (msg: string) => void;
}) {
  const [list, setList] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setCreating(false);
    setTitle("");
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/playlists?mine=1", { credentials: "include" });
        if (res.status === 401) {
          window.location.href = "/connexion";
          return;
        }
        const data = await res.json();
        setList(data.playlists || []);
      } catch {
        setError("Impossible de charger les playlists.");
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  if (!open) return null;

  async function addTo(playlistId: string) {
    setError("");
    const res = await fetch(`/api/playlists/${playlistId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ videoId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Erreur");
      return;
    }
    onDone?.("Ajouté à la playlist");
    onClose();
  }

  async function createAndAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setError("");
    const res = await fetch("/api/playlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ title: title.trim(), videoId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Erreur");
      return;
    }
    onDone?.("Playlist créée");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/55"
        aria-label="Fermer"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-[#1a1a1a] rounded-t-2xl border-t border-white/10 pb-[max(1rem,env(safe-area-inset-bottom))] max-h-[70dvh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <p className="font-semibold text-sm flex items-center gap-2">
            <ListMusic size={16} /> Ajouter à une playlist
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

        {loading && (
          <p className="text-center text-white/40 text-sm py-8">Chargement…</p>
        )}
        {error && <p className="px-4 text-xs text-[#fe2c55] mb-2">{error}</p>}

        {!loading && (
          <ul className="px-2 pb-2 space-y-1">
            {list.map((pl) => (
              <li key={pl.id}>
                <button
                  type="button"
                  onClick={() => addTo(pl.id)}
                  className="w-full text-left px-3 py-3 rounded-xl hover:bg-white/10 flex items-center justify-between"
                >
                  <span className="font-medium text-sm truncate">{pl.title}</span>
                  <span className="text-[11px] text-white/40">
                    {pl.itemCount} vidéo{pl.itemCount === 1 ? "" : "s"}
                  </span>
                </button>
              </li>
            ))}
            {list.length === 0 && (
              <p className="text-center text-white/40 text-sm py-4">
                Aucune playlist pour l’instant.
              </p>
            )}
          </ul>
        )}

        {!creating ? (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="mx-4 mb-4 w-[calc(100%-2rem)] flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-black text-sm font-semibold"
          >
            <FolderPlus size={16} /> Nouvelle playlist
          </button>
        ) : (
          <form onSubmit={createAndAdd} className="px-4 pb-4 space-y-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nom de la playlist"
              maxLength={80}
              autoFocus
              className="w-full bg-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-[#fe2c55]"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="flex-1 py-2.5 text-sm text-white/60"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={!title.trim()}
                className="flex-1 py-2.5 rounded-full bg-[#fe2c55] text-sm font-semibold disabled:opacity-40"
              >
                Créer
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
