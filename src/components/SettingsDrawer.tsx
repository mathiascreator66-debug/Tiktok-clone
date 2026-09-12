"use client";

import Link from "next/link";
import { useEffect } from "react";
import {
  X,
  Wallet,
  Activity,
  Download,
  QrCode,
  Briefcase,
  Clapperboard,
  Flame,
  Settings,
  ChevronRight,
} from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
};

const stub = "bientôt";

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
          <Section title="Ressources">
            <StubItem icon={<Wallet size={20} />} label="Solde" hint={stub} />
          </Section>

          <Section title="Outils personnels">
            <StubItem icon={<Activity size={20} />} label="Centre des activités" hint={stub} />
            <StubItem icon={<Download size={20} />} label="Vidéos hors ligne" hint={stub} />
            <StubItem icon={<QrCode size={20} />} label="Ton code QR" hint={stub} />
          </Section>

          <Section title="Création & pro">
            <StubItem icon={<Briefcase size={20} />} label="Ensemble entreprise" hint={stub} />
            <StubItem icon={<Clapperboard size={20} />} label="ClipTok Studio" hint={stub} />
            <StubItem icon={<Flame size={20} />} label="Promouvoir" hint={stub} />
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

function StubItem({
  icon,
  label,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-3.5 rounded-lg opacity-55 cursor-not-allowed">
      <span className="text-white/70">{icon}</span>
      <span className="flex-1 font-medium text-[15px]">{label}</span>
      <span className="text-xs text-white/35">{hint}</span>
    </div>
  );
}
