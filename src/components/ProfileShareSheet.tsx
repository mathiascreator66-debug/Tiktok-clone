"use client";

import { useEffect, useState } from "react";
import { Copy, QrCode, Share2, X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  username: string;
  displayName?: string | null;
};

export default function ProfileShareSheet({
  open,
  onClose,
  username,
  displayName,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (!open) return;
    setCopied(false);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    setUrl(`${origin}/profil/${username}`);
  }, [open, username]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const label = displayName || username;
  const shareText = `Regarde le profil de ${label} sur AfriVoix : ${url}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      setCopied(true);
    }
  }

  async function nativeShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${label} sur AfriVoix`,
          text: shareText,
          url,
        });
        onClose();
        return;
      } catch {
        /* cancelled */
      }
    }
    await copyLink();
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/55"
        aria-label="Fermer"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-[#1a1a1a] rounded-t-2xl border-t border-white/10 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <p className="font-semibold text-sm">Partager le profil</p>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>
        <p className="px-4 text-xs text-white/40 truncate mb-3">@{username}</p>

        <div className="grid grid-cols-4 gap-3 px-4 py-2">
          <Action
            icon={<Copy size={22} />}
            label={copied ? "Copié !" : "Copier le lien"}
            onClick={copyLink}
          />
          <Action
            icon={<Share2 size={22} />}
            label="Partager"
            onClick={nativeShare}
          />
          <a
            href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-2"
          >
            <span className="w-12 h-12 rounded-full bg-[#25D366]/20 text-[#25D366] flex items-center justify-center text-lg font-bold">
              WA
            </span>
            <span className="text-[11px] text-white/70">WhatsApp</span>
          </a>
          <a
            href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-2"
          >
            <span className="w-12 h-12 rounded-full bg-[#2AABEE]/20 text-[#2AABEE] flex items-center justify-center text-lg font-bold">
              TG
            </span>
            <span className="text-[11px] text-white/70">Telegram</span>
          </a>
        </div>

        <div className="px-4 py-3 space-y-2">
          <a
            href={`sms:?body=${encodeURIComponent(shareText)}`}
            className="block w-full text-center py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm"
          >
            SMS
          </a>
          <a
            href={`mailto:?subject=${encodeURIComponent(`Profil ${label} — AfriVoix`)}&body=${encodeURIComponent(shareText)}`}
            className="block w-full text-center py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm"
          >
            E-mail
          </a>
          <a
            href="/parametres/qr"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white text-black text-sm font-semibold"
          >
            <QrCode size={16} /> Code QR
          </a>
        </div>
      </div>
    </div>
  );
}

function Action({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2"
    >
      <span className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
        {icon}
      </span>
      <span className="text-[11px] text-white/70 text-center leading-tight">
        {label}
      </span>
    </button>
  );
}
