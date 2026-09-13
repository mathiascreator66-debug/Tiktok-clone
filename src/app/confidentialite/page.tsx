import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import SiteFooterLinks from "@/components/SiteFooterLinks";

export const metadata = { title: "Confidentialité — AfriVoix" };

export default function ConfidentialitePage() {
  return (
    <div className="min-h-[100dvh] pt-2 md:pt-16 pb-28 max-w-2xl mx-auto px-4">
      <header className="flex items-center gap-2 h-12 mb-6">
        <Link href="/" className="p-2 -ml-1 rounded-full hover:bg-white/10" aria-label="Retour">
          <ArrowLeft size={22} />
        </Link>
        <h1 className="font-bold text-lg">Politique de confidentialité</h1>
      </header>

      <article className="space-y-4 text-sm text-white/75 leading-relaxed">
        <p className="text-white/40 text-xs">Dernière mise à jour : septembre 2026</p>

        <h2 className="text-white font-semibold text-base pt-2">1. Responsable</h2>
        <p>
          AfriVoix traite vos données pour fournir le Service de réseau social
          vidéo. Contact privacy (placeholder) : privacy@afrivoix.local.
        </p>

        <h2 className="text-white font-semibold text-base pt-2">2. Données collectées</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Compte : email, nom d&apos;utilisateur, mot de passe haché (bcrypt), pays, langue, date de naissance</li>
          <li>Optionnel : téléphone (E.164), avatar, bio, liens de profil</li>
          <li>Contenus : vidéos, stories, commentaires, messages, hashtags</li>
          <li>Usage : likes, follows, visionnages, signalements, tickets d&apos;aide</li>
          <li>Techniques : cookies de session JWT httpOnly, adresse IP pour la limitation de débit</li>
        </ul>

        <h2 className="text-white font-semibold text-base pt-2">3. Finalités</h2>
        <p>
          Fourniture du Service, sécurité (auth, rate limiting, modération),
          personnalisation du fil « Pour toi », support utilisateur, et
          obligations légales. Pas de revente de données à des tiers publicitaires
          dans la version actuelle.
        </p>

        <h2 className="text-white font-semibold text-base pt-2">4. Base légale</h2>
        <p>
          Exécution du contrat (CGU), intérêt légitime (sécurité, prévention des
          abus), et consentement lorsque requis (ex. acceptation CGU à
          l&apos;inscription, cookies non essentiels futurs).
        </p>

        <h2 className="text-white font-semibold text-base pt-2">5. Conservation</h2>
        <p>
          Données de compte tant que le compte est actif ; messages et contenus
          jusqu&apos;à suppression ; logs techniques de façon limitée ; tickets
          d&apos;aide le temps du traitement.
        </p>

        <h2 className="text-white font-semibold text-base pt-2">6. Partage</h2>
        <p>
          Hébergeur / infrastructure technique ; autorités si obligation légale.
          OAuth Google si vous choisissez cette connexion. Pas de paiement réel
          activé en phase 1.
        </p>

        <h2 className="text-white font-semibold text-base pt-2">7. Sécurité</h2>
        <p>
          HTTPS recommandé en production (voir README). Mots de passe bcrypt.
          Secrets uniquement dans les variables d&apos;environnement. Les
          journaux applicatifs ne doivent pas contenir mots de passe ni jetons.
          Chiffrement optionnel des messages au repos via{" "}
          <code className="text-white/90">MESSAGES_ENCRYPTION_KEY</code>.
        </p>

        <h2 className="text-white font-semibold text-base pt-2">8. Vos droits</h2>
        <p>
          Accès, rectification, export (Paramètres → Télécharger vos données),
          suppression du compte, opposition pour motifs légitimes. Mineurs :
          un parent peut nous contacter via le centre d&apos;aide.
        </p>

        <h2 className="text-white font-semibold text-base pt-2">9. Mineurs</h2>
        <p>
          Service interdit sous 13 ans. Nous ne collectons pas sciemment de
          données d&apos;enfants de moins de 13 ans.
        </p>
      </article>

      <div className="mt-10">
        <SiteFooterLinks />
      </div>
    </div>
  );
}
