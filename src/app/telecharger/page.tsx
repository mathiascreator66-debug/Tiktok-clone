import UploadForm from "@/components/UploadForm";
import StoryUploadForm from "@/components/StoryUploadForm";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function TelechargerPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  const session = await getSession();
  if (!session) redirect("/connexion");

  const tab = searchParams?.tab === "story" ? "story" : "video";

  return (
    <div className="min-h-[100dvh] pt-6 md:pt-20 pb-20 px-4">
      <div className="max-w-md mx-auto mb-6">
        <Link href="/" className="text-white/50 text-sm hover:text-white">
          ← Retour au fil
        </Link>
        <h1 className="text-2xl font-bold mt-3">
          {tab === "story" ? "Ajouter une story" : "Publier une vidéo"}
        </h1>
        <p className="text-white/50 text-sm mt-1">
          Connecté en tant que @{session.username}
        </p>
        <div className="flex gap-2 mt-4">
          <Link
            href="/telecharger"
            className={`flex-1 text-center rounded-full py-2 text-sm font-semibold transition ${
              tab === "video"
                ? "bg-white text-black"
                : "bg-white/10 text-white/70 hover:bg-white/15"
            }`}
          >
            Vidéo
          </Link>
          <Link
            href="/telecharger?tab=story"
            className={`flex-1 text-center rounded-full py-2 text-sm font-semibold transition ${
              tab === "story"
                ? "bg-white text-black"
                : "bg-white/10 text-white/70 hover:bg-white/15"
            }`}
          >
            Story
          </Link>
        </div>
      </div>
      {tab === "story" ? <StoryUploadForm /> : <UploadForm />}
    </div>
  );
}
