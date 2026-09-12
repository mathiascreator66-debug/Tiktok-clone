import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import QRCode from "qrcode";
import { getSession, getAppUrl } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function QrPage() {
  const session = await getSession();
  if (!session) redirect("/connexion");

  const profileUrl = `${getAppUrl()}/profil/${session.username}`;
  const svg = await QRCode.toString(profileUrl, {
    type: "svg",
    margin: 2,
    width: 280,
    color: { dark: "#000000", light: "#ffffff" },
  });

  return (
    <div className="min-h-[100dvh] pt-2 md:pt-16 pb-24 max-w-lg mx-auto px-3">
      <header className="flex items-center gap-2 h-12 mb-6">
        <Link
          href={`/profil/${session.username}`}
          className="p-2 -ml-1 rounded-full hover:bg-white/10"
          aria-label="Retour"
        >
          <ArrowLeft size={22} />
        </Link>
        <h1 className="font-bold text-lg">Ton code QR</h1>
      </header>

      <div className="flex flex-col items-center text-center">
        <p className="text-white/60 text-sm mb-4">
          Scannez pour ouvrir le profil @{session.username}
        </p>
        <div
          className="bg-white p-4 rounded-2xl shadow-lg [&_svg]:w-64 [&_svg]:h-64"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <p className="mt-4 text-xs text-white/40 break-all max-w-xs">
          {profileUrl}
        </p>
        <Link
          href={`/profil/${session.username}`}
          className="mt-6 text-sm font-semibold text-[#25f4ee]"
        >
          Voir mon profil →
        </Link>
      </div>
    </div>
  );
}
