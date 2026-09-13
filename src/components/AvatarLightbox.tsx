"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  avatarUrl?: string | null;
  username: string;
  displayName?: string | null;
};

/** Fullscreen profile photo viewer (TikTok/IG-like). */
export default function AvatarLightbox({
  open,
  onClose,
  avatarUrl,
  username,
  displayName,
}: Props) {
  const [scale, setScale] = useState(1);
  const startY = useRef<number | null>(null);

  useEffect(() => {
    if (!open) {
      setScale(1);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const initial = username.charAt(0).toUpperCase();
  const label = displayName || username;

  return (
    <div
      className="force-dark fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-label={`Photo de profil de ${label}`}
      onClick={onClose}
      onTouchStart={(e) => {
        startY.current = e.touches[0]?.clientY ?? null;
      }}
      onTouchEnd={(e) => {
        if (startY.current == null) return;
        const dy = (e.changedTouches[0]?.clientY ?? 0) - startY.current;
        if (dy > 80) onClose();
        startY.current = null;
      }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-3 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20"
        aria-label="Fermer"
      >
        <X size={22} />
      </button>

      <p className="absolute top-[max(1rem,env(safe-area-inset-top))] left-4 right-16 text-sm font-semibold truncate pointer-events-none">
        {label}
      </p>

      <div
        className="relative max-w-[min(92vw,520px)] max-h-[min(78vh,520px)] w-full aspect-square flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={() => setScale((s) => (s > 1 ? 1 : 1.8))}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={`@${username}`}
            className="w-full h-full object-contain rounded-lg select-none"
            style={{ transform: `scale(${scale})`, transition: "transform 0.2s ease" }}
            draggable={false}
          />
        ) : (
          <div
            className="w-full h-full rounded-full bg-gradient-to-br from-[#fe2c55] to-[#25f4ee] flex items-center justify-center font-bold text-white text-7xl"
            aria-hidden
          >
            {initial}
          </div>
        )}
      </div>

      <p className="mt-4 text-[11px] text-white/40">
        Appuyez pour fermer · double-tap pour zoomer
      </p>
    </div>
  );
}
