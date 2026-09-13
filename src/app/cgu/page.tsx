import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import SiteFooterLinks from "@/components/SiteFooterLinks";

export const metadata = { title: "CGU — AfriVoix" };

export default function CguPage() {
  return (
    <div className="min-h-[100dvh] pt-2 md:pt-16 pb-28 max-w-2xl mx-auto px-4">
      <header className="flex items-center gap-2 h-12 mb-6">
        <Link href="/" className="p-2 -ml-1 rounded-full hover:bg-white/10" aria-label="Retour">
          <ArrowLeft size={22} />
        </Link>
        <h1 className="font-bold text-lg">Conditions générales d&apos;utilisation</h1>
      </header>

      <article className="prose-invert space-y-4 text-sm text-white/75 leading-relaxed">
        <p className="text-white/40 text-xs">Dernière mise à jour : septembre 2026</p>

        <h2 className="text-white font-semibold text-base pt-2">1. Objet</h2>
        <p>
          Les présentes Conditions générales d&apos;utilisation (CGU) régissent
          l&apos;accès et l&apos;usage de la plateforme AfriVoix, service de
          partage de vidéos courtes, stories, messages et interactions sociales
          (ci-après « le Service »). En créant un compte ou en utilisant le
          Service, vous acceptez ces CGU.
        </p>

        <h2 className="text-white font-semibold text-base pt-2">2. Âge minimum</h2>
        <p>
          Le Service est réservé aux personnes âgées d&apos;au moins{" "}
          <strong className="text-white">13 ans</strong>. Si vous avez moins de
          18 ans, vous confirmez disposer de l&apos;autorisation d&apos;un
          parent ou tuteur légal lorsque la loi l&apos;exige.
        </p>

        <h2 className="text-white font-semibold text-base pt-2">3. Compte</h2>
        <p>
          Vous êtes responsable de la confidentialité de vos identifiants et de
          l&apos;activité réalisée via votre compte. Les mots de passe sont
          stockés sous forme hachée (bcrypt) — jamais en clair. AfriVoix peut
          suspendre ou bannir un compte en cas de violation des présentes CGU
          ou de la loi.
        </p>

        <h2 className="text-white font-semibold text-base pt-2">4. Contenu utilisateur</h2>
        <p>
          Vous conservez vos droits sur les contenus que vous publiez (vidéos,
          commentaires, stories, messages). En publiant, vous accordez à
          AfriVoix une licence non exclusive, mondiale et gratuite pour héberger,
          diffuser et afficher ces contenus dans le cadre du Service. Vous
          garantissez disposer des droits nécessaires (image, musique, etc.).
        </p>
        <p>
          Durée maximale des vidéos : 8 minutes. Durée maximale des stories
          vidéo : 3 minutes. Taille maximale des fichiers : 100 Mo.
        </p>

        <h2 className="text-white font-semibold text-base pt-2">5. Usages interdits</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Contenus illégaux, pornographie impliquant des mineurs, apologie du terrorisme</li>
          <li>Harcèlement, discours de haine, menaces, doxxing</li>
          <li>Spam, arnaques, usurpation d&apos;identité</li>
          <li>Atteinte à la sécurité du Service (intrusion, scraping abusif)</li>
          <li>Contournement de suspensions ou bans</li>
        </ul>

        <h2 className="text-white font-semibold text-base pt-2">6. Modération</h2>
        <p>
          AfriVoix et ses modérateurs peuvent retirer du contenu, limiter la
          portée d&apos;une publication ou sanctionner un compte. Les
          signalements sont traités via la file d&apos;administration. Nous
          visons une modération proportionnée, non arbitraire, et respectueuse
          de la diversité culturelle africaine — sans pour autant tolérer les
          contenus interdits ci-dessus.
        </p>

        <h2 className="text-white font-semibold text-base pt-2">7. Messages privés</h2>
        <p>
          Les messages privés sont accessibles uniquement aux participants
          authentifiés. Un chiffrement au repos peut être activé côté serveur
          (clé d&apos;application). AfriVoix ne garantit pas le secret absolu
          face à une obligation légale.
        </p>

        <h2 className="text-white font-semibold text-base pt-2">8. Monétisation (démo)</h2>
        <p>
          Les crédits, pourboires et abonnements « Pro » proposés en démo sont
          virtuels et n&apos;ont pas de valeur monétaire réelle tant que les
          paiements (Orange Money, MTN, Wave, etc.) ne sont pas activés.
        </p>

        <h2 className="text-white font-semibold text-base pt-2">9. Responsabilité</h2>
        <p>
          Le Service est fourni « en l&apos;état ». Dans les limites permises
          par la loi, AfriVoix n&apos;est pas responsable des contenus publiés
          par les utilisateurs, des interruptions techniques, ni des dommages
          indirects. Vous utilisez le Service à vos risques.
        </p>

        <h2 className="text-white font-semibold text-base pt-2">10. Résiliation</h2>
        <p>
          Vous pouvez supprimer votre compte via les paramètres (ou en
          contactant le support). AfriVoix peut résilier l&apos;accès en cas de
          manquement grave aux CGU.
        </p>

        <h2 className="text-white font-semibold text-base pt-2">11. Contact</h2>
        <p>
          Pour toute question : utilisez le{" "}
          <Link href="/aide" className="text-[#d4af37] underline">
            centre d&apos;aide
          </Link>{" "}
          ou écrivez à support@afrivoix.local (placeholder).
        </p>
      </article>

      <div className="mt-10">
        <SiteFooterLinks />
      </div>
    </div>
  );
}
