import Link from "next/link";

export default function SiteFooterLinks({ className = "" }: { className?: string }) {
  return (
    <nav
      className={`flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/40 ${className}`}
      aria-label="Liens légaux"
    >
      <Link href="/a-propos" className="hover:text-[#d4af37]">
        À propos
      </Link>
      <Link href="/cgu" className="hover:text-[#d4af37]">
        CGU
      </Link>
      <Link href="/confidentialite" className="hover:text-[#d4af37]">
        Confidentialité
      </Link>
      <Link href="/aide" className="hover:text-[#d4af37]">
        Aide
      </Link>
    </nav>
  );
}
