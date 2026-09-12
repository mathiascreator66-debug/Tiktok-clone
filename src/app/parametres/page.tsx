import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Shield,
  BarChart3,
  Share2,
  Bell,
  Clapperboard,
  Tv,
  Hourglass,
  Home,
  ChevronRight,
  Layers,
} from "lucide-react";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ParametresPage() {
  const session = await getSession();
  if (!session) redirect("/connexion");

  return (
    <div className="min-h-[100dvh] pt-2 md:pt-16 pb-24 max-w-lg mx-auto">
      <header className="flex items-center gap-2 px-3 h-12 mb-2">
        <Link
          href={`/profil/${session.username}`}
          className="p-2 -ml-1 rounded-full hover:bg-white/10"
          aria-label="Retour"
        >
          <ArrowLeft size={22} />
        </Link>
        <h1 className="font-bold text-lg">Paramètres et confidentialité</h1>
      </header>

      <Section title="Activité">
        <StubItem icon={<Layers size={20} />} label="Gérer les publications" />
        <StubItem icon={<Clapperboard size={20} />} label="Préférences de contenu" />
        <StubItem icon={<Tv size={20} />} label="LIVE" />
        <StubItem icon={<Bell size={20} />} label="Notifications" />
        <StubItem icon={<Hourglass size={20} />} label="Temps d'écran et bien-être" />
        <StubItem icon={<Home size={20} />} label="Connexion Famille" />
      </Section>

      <Section title="Compte">
        <LinkItem
          href="/parametres/compte"
          icon={<User size={20} />}
          label="Compte"
        />
        <StubItem icon={<Shield size={20} />} label="Sécurité et autorisations" />
        <StubItem icon={<BarChart3 size={20} />} label="Données analytiques" />
        <StubItem icon={<Share2 size={20} />} label="Partager le profil" />
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

function StubItem({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 opacity-45 cursor-not-allowed">
      <span className="text-white/70">{icon}</span>
      <span className="flex-1 font-medium text-[15px]">{label}</span>
      <span className="text-xs text-white/35">bientôt</span>
    </div>
  );
}
