"use client";

import Link from "next/link";
import { useEffect } from "react";
import {
  X,
  Activity,
  Download,
  QrCode,
  Clapperboard,
  Settings,
  ChevronRight,
  Database,
  History,
  Wallet,
  Rocket,
  Sparkles,
} from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function SettingsDrawer({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label="Fermer"
        onClick={onClose}
      />
      <aside className="absolute top-0 right-0 h-full w-[85%] max-w-sm bg-[#121212] border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right">
        <div className="flex items-center justify-between px-4 h-14 border-b border-white/10">
          <h2 className="font-bold text-base">Menu</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10"
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-3">
          <Section title="Outils personnels">
            <LinkItem
              href="/activite"
              onClick={onClose}
              icon={<Activity size={20} />}
              label="Centre des activités"
            />
            <LinkItem
              href="/historique"
              onClick={onClose}
              icon={<History size={20} />}
              label="Historique de visionnage"
            />
            <LinkItem
              href="/parametres/qr"
              onClick={onClose}
              icon={<QrCode size={20} />}
              label="Ton code QR"
            />
            <LinkItem
              href="/api/me/export"
              onClick={onClose}
              icon={<Database size={20} />}
              label="Télécharger tes données"
            />
          </Section>


          <Section title="Monétisation">
            <LinkItem
              href="/solde"
              onClick={onClose}
              icon={<Wallet size={20} />}
              label="Solde"
            />
            <LinkItem
              href="/pro"
              onClick={onClose}
              icon={<Sparkles size={20} />}
              label="ClipTok Pro"
            />
            <LinkItem
              href="/pro#promouvoir"
              onClick={onClose}
              icon={<Rocket size={20} />}
              label="Promouvoir"
            />
          </Section>
          <Section title="Création">
            <LinkItem
              href="/telecharger"
              onClick={onClose}
              icon={<Clapperboard size={20} />}
              label="ClipTok Studio"
            />
            <LinkItem
              href="/telecharger?tab=story"
              onClick={onClose}
              icon={<Download size={20} />}
              label="Ajouter une story"
            />
          </Section>

          <div className="mt-2 border-t border-white/10 pt-2">
            <Link
              href="/parametres"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-3.5 rounded-lg hover:bg-white/5"
            >
              <Settings size={20} className="text-white/80" />
              <span className="flex-1 font-semibold text-[15px]">
                Paramètres et confidentialité
              </span>
              <ChevronRight size={18} className="text-white/30" />
            </Link>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <p className="px-3 py-1.5 text-[11px] uppercase tracking-wide text-white/40 font-medium">
        {title}
      </p>
      <div>{children}</div>
    </div>
  );
}

function LinkItem({
  href,
  icon,
  label,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-3.5 rounded-lg hover:bg-white/5"
    >
      <span className="text-white/80">{icon}</span>
      <span className="flex-1 font-medium text-[15px]">{label}</span>
      <ChevronRight size={18} className="text-white/30" />
    </Link>
  );
}
