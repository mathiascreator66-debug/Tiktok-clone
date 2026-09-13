import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import SiteFooterLinks from "@/components/SiteFooterLinks";

export const metadata = {
  title: "À propos — AfriVoix",
  description: "Mission AfriVoix : plateforme africaine pour les Africains",
};

export default function AProposPage() {
  return (
    <div className="min-h-[100dvh] pt-2 md:pt-16 pb-28 max-w-2xl mx-auto px-4">
      <header className="flex items-center gap-2 h-12 mb-6">
        <Link
          href="/"
          className="p-2 -ml-1 rounded-full hover:bg-white/10"
          aria-label="Retour"
        >
          <ArrowLeft size={22} />
        </Link>
        <h1 className="font-bold text-lg">À propos d&apos;AfriVoix</h1>
      </header>

      <div className="flex justify-center mb-8">
        <BrandLogo variant="full" href={null} />
      </div>

      <article className="space-y-5 text-white/80 text-[15px] leading-relaxed">
        <p className="text-white font-semibold text-lg">
          Une plateforme africaine, pour les Africains.
        </p>
        <p>
          AfriVoix est un espace de création et de partage vidéo pensé depuis
          l&apos;Afrique et pour les communautés africaines — sur le continent et
          dans la diaspora. Notre ambition est simple : donner une voix libre,
          visible et digne à des talents trop souvent relégués au second plan
          par des plateformes conçues ailleurs.
        </p>
        <p>
          Nous croyons que le contenu africain ne doit pas être filtré, réduit
          ou orienté selon les seuls intérêts commerciaux ou éditoriaux de
          plateformes étrangères. AfriVoix refuse la modération arbitraire
          imposée de l&apos;extérieur : nos règles sont claires, publiées, et
          appliquées avec responsabilité — sans censurer la diversité
          culturelle, linguistique et créative de l&apos;Afrique.
        </p>
        <p>
          Cela ne signifie pas l&apos;absence de règles. Les contenus illégaux,
          haineux ou dangereux n&apos;ont pas leur place ici. Cela signifie une
          gouvernance proche des utilisateurs, transparente, et alignée sur des
          valeurs d&apos;empowerment, de respect mutuel et de souveraineté
          numérique.
        </p>
        <p className="text-[#d4af37] font-medium">
          Nos voix | Notre Afrique | Un monde meilleur — plus qu&apos;un réseau
          social.
        </p>
        <p>
          Rejoignez-nous pour créer, découvrir et faire rayonner les voix
          africaines.
        </p>
      </article>

      <div className="mt-10">
        <SiteFooterLinks />
      </div>
    </div>
  );
}
