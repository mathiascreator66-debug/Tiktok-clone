"use client";

import Link from "next/link";
import {
  ArrowLeft,
  User,
  QrCode,
  Clapperboard,
  ChevronRight,
  Activity,
  Download,
  History,
  Wallet,
  Sparkles,
  Rocket,
  Info,
  HelpCircle,
  FileText,
  BarChart3,
  UserX,
  CreditCard,
} from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import DataSaverToggle from "@/components/DataSaverToggle";
import ThemeToggle from "@/components/ThemeToggle";
import { useI18n } from "@/lib/i18n";

export default function ParametresClient({
  username,
}: {
  username: string;
}) {
  const { t } = useI18n();

  return (
    <div className="min-h-[100dvh] pt-2 md:pt-16 pb-24 max-w-lg mx-auto">
      <header className="flex items-center gap-2 px-3 h-12 mb-2">
        <Link
          href={`/profil/${username}`}
          className="p-2 -ml-1 rounded-full hover:bg-white/10"
          aria-label="Retour"
        >
          <ArrowLeft size={22} />
        </Link>
        <h1 className="font-bold text-lg">{t("settings")}</h1>
      </header>

      <Section title={t("activity")}>
        <LinkItem href="/activite" icon={<Activity size={20} />} label="Centre des activités" />
        <LinkItem href="/historique" icon={<History size={20} />} label="Historique de visionnage" />
        <LinkItem href="/studio" icon={<BarChart3 size={20} />} label="Statistiques" />
        <LinkItem href="/studio" icon={<Clapperboard size={20} />} label="AfriVoix Studio" />
        <LinkItem href="/telecharger?tab=story" icon={<Download size={20} />} label="Ajouter une story" />
      </Section>
      <Section title={t("appearance")}>
        <ThemeToggle />
      </Section>
      <Section title={t("data")}>
        <div className="px-3 mb-2">
          <DataSaverToggle />
        </div>
      </Section>

      <Section title={t("monetization")}>
        <LinkItem href="/solde" icon={<Wallet size={20} />} label={t("balance")} />
        <LinkItem href="/parametres/paiements" icon={<CreditCard size={20} />} label="Moyens de paiement" />
        <LinkItem href="/pro" icon={<Sparkles size={20} />} label="AfriVoix Pro" />
        <LinkItem href="/pro#promouvoir" icon={<Rocket size={20} />} label="Promouvoir une vidéo" />
      </Section>
      <Section title={t("account")}>
        <LinkItem href="/parametres/compte" icon={<User size={20} />} label={t("account")} />
        <LinkItem href="/parametres/qr" icon={<QrCode size={20} />} label="Partager le profil (QR)" />
      </Section>

      <Section title={t("helpLegal")}>
        <LinkItem href="/a-propos" icon={<Info size={20} />} label={t("about")} />
        <LinkItem href="/parametres/bloques" icon={<UserX size={20} />} label="Comptes bloqués" />
        <LinkItem href="/aide" icon={<HelpCircle size={20} />} label={t("help")} />
        <LinkItem href="/cgu" icon={<FileText size={20} />} label={t("terms")} />
        <LinkItem href="/confidentialite" icon={<FileText size={20} />} label={t("privacy")} />
      </Section>

      <Section title={t("language")}>
        <div className="px-4 py-3">
          <LanguageSwitcher />
        </div>
      </Section>
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
    <div className="px-3 mb-5">
      <p className="text-xs font-medium text-white/40 uppercase tracking-wide px-1 mb-2">
        {title}
      </p>
      <div className="rounded-xl bg-white/[0.06] border border-white/10 overflow-hidden divide-y divide-white/5">
        {children}
      </div>
    </div>
  );
}

function LinkItem({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/5"
    >
      <span className="text-white/70">{icon}</span>
      <span className="flex-1 font-medium text-[15px]">{label}</span>
      <ChevronRight size={18} className="text-white/30" />
    </Link>
  );
}
