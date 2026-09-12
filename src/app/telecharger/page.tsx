import UploadForm from "@/components/UploadForm";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function TelechargerPage() {
  const session = await getSession();
  if (!session) redirect("/connexion");

  return (
    <div className="min-h-[100dvh] pt-6 md:pt-20 pb-20 px-4">
      <div className="max-w-md mx-auto mb-6">
        <Link href="/" className="text-white/50 text-sm hover:text-white">
          ← Retour au fil
        </Link>
        <h1 className="text-2xl font-bold mt-3">Publier une vidéo</h1>
        <p className="text-white/50 text-sm mt-1">
          Connecté en tant que @{session.username}
        </p>
      </div>
      <UploadForm />
    </div>
  );
}
