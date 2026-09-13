import UploadForm from "@/components/UploadForm";
import StoryUploadForm from "@/components/StoryUploadForm";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { MAX_UPLOAD_LABEL } from "@/lib/limits";

export default async function TelechargerPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  const session = await getSession();
  if (!session) redirect("/connexion");

  const tab = searchParams?.tab === "story" ? "story" : "publish";

  return (
    <div className="min-h-[100dvh] pt-6 md:pt-20 pb-20 px-4">
      <div className="max-w-md mx-auto mb-6">
        <Link href="/" className="text-white/50 text-sm hover:text-white">
          ← Retour au fil
        </Link>
        <h1 className="text-2xl font-bold mt-3">Créer</h1>
        <p className="text-white/50 text-sm mt-1">
          Studio AfriVoix · @{session.username} · jusqu’à {MAX_UPLOAD_LABEL}
        </p>
        <div className="flex gap-2 mt-4 p-1 rounded-full bg-white/5">
          <Link
            href="/telecharger"
            className={`flex-1 text-center rounded-full py-2 text-sm font-semibold transition ${
              tab === "publish"
                ? "bg-white text-black"
                : "text-white/70 hover:bg-white/10"
            }`}
          >
            Publier
          </Link>
          <Link
            href="/telecharger?tab=story"
            className={`flex-1 text-center rounded-full py-2 text-sm font-semibold transition ${
              tab === "story"
                ? "bg-white text-black"
                : "text-white/70 hover:bg-white/10"
            }`}
          >
            Story
          </Link>
        </div>
      </div>
      {tab === "story" ? (
        <StoryUploadForm />
      ) : (
        <UploadForm username={session.username} />
      )}
    </div>
  );
}
