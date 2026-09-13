"use client";

import { useEffect, useRef, useState } from "react";
import { MoreVertical, Pencil, Pin, PinOff, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

type Props = {
  videoId: string;
  caption: string;
  pinned?: boolean;
  onCaptionUpdated?: (caption: string) => void;
  onPinned?: (pinned: boolean) => void;
  onDeleted?: () => void;
  /** Compact icon for feed */
  variant?: "feed" | "grid";
};

export default function VideoOwnerMenu({
  videoId,
  caption,
  pinned = false,
  onCaptionUpdated,
  onPinned,
  onDeleted,
  variant = "feed",
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(caption);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isPinned, setIsPinned] = useState(pinned);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function saveCaption(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/videos/${videoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption: draft }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur");
        return;
      }
      onCaptionUpdated?.(data.video.caption);
      setEditing(false);
      setOpen(false);
      router.refresh();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteVideo() {
    if (!confirm("Supprimer cette vidéo définitivement ?")) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/videos/${videoId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur");
        return;
      }
      setOpen(false);
      onDeleted?.();
      router.refresh();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }

  async function togglePin() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/videos/${videoId}/pin`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur");
        return;
      }
      setIsPinned(data.pinned);
      onPinned?.(data.pinned);
      setOpen(false);
      router.refresh();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
          setEditing(false);
          setDraft(caption);
          setError("");
        }}
        className={
          variant === "feed"
            ? "w-12 h-12 rounded-full bg-white/10 backdrop-blur flex items-center justify-center"
            : "p-1.5 rounded-full bg-black/60 text-white"
        }
        aria-label="Options de la vidéo"
      >
        <MoreVertical size={variant === "feed" ? 22 : 16} />
      </button>

      {open && (
        <div
          className={`absolute z-50 bg-[#1a1a1a] border border-white/15 rounded-xl shadow-xl overflow-hidden min-w-[180px] ${
            variant === "feed" ? "right-14 bottom-0" : "right-0 top-8"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {!editing ? (
            <>
              <button
                type="button"
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-white/10 text-left"
                onClick={() => setEditing(true)}
              >
                <Pencil size={16} /> Modifier la légende
              </button>
              <button
                type="button"
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-white/10 text-left"
                onClick={togglePin}
                disabled={loading}
              >
                {isPinned ? <PinOff size={16} /> : <Pin size={16} />}
                {isPinned ? "Désépingler" : "Épingler"}
              </button>
              {error && !editing && (
                <p className="px-3 py-1.5 text-[11px] text-[#fe2c55]">{error}</p>
              )}
              <button
                type="button"
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-white/10 text-[#fe2c55] text-left"
                onClick={deleteVideo}
                disabled={loading}
              >
                <Trash2 size={16} /> Supprimer
              </button>
            </>
          ) : (
            <form onSubmit={saveCaption} className="p-3 space-y-2 w-64">
              <p className="text-xs text-white/50">Modifier la légende</p>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                maxLength={300}
                className="w-full bg-white/10 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-[#fe2c55] resize-none"
                autoFocus
              />
              {error && <p className="text-[#fe2c55] text-xs">{error}</p>}
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  className="text-xs px-2 py-1 text-white/60"
                  onClick={() => setEditing(false)}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading || !draft.trim()}
                  className="text-xs px-3 py-1.5 bg-[#fe2c55] rounded-full font-semibold disabled:opacity-40"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
