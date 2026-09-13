import UploadForm from "@/components/UploadForm";
import StoryUploadForm from "@/components/StoryUploadForm";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { MAX_UPLOAD_LABEL } from "@/lib/limits";
import StartLiveButton from "@/components/StartLiveButton";

export default async function TelechargerPage({
  searchParams,
}: {
  searchParams?: { tab?: string; soundUrl?: string; soundName?: string; soundVolume?: string };
}) {
  const session = await getSession();
  if (!session) redirect("/connexion");

  const tab =
    searchParams?.tab === "story"
      ? "story"
      : searchParams?.tab === "live"
        ? "live"
        : searchParams?.tab === "post"
          ? "post"
          : "publish";

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
        <div className="flex gap-1 mt-4 p-1 rounded-full bg-white/5 overflow-x-auto scrollbar-hide">
          {(
            [
              ["publish", "Publier", "/telecharger"],
              ["story", "Story", "/telecharger?tab=story"],
              ["live", "LIVE", "/telecharger?tab=live"],
              ["post", "Texte", "/fil"],
            ] as const
          ).map(([id, label, href]) => (
            <Link
              key={id}
              href={href}
              className={`shrink-0 flex-1 text-center rounded-full py-2 px-2 text-xs font-semibold transition ${
                tab === id
                  ? id === "live"
                    ? "bg-[#fe2c55] text-white"
                    : "bg-white text-black"
                  : "text-white/70 hover:bg-white/10"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
      {tab === "story" ? (
        <StoryUploadForm />
      ) : tab === "live" ? (
        <div className="max-w-md mx-auto text-center space-y-4">
          <p className="text-white/60 text-sm">
            Passez en direct comme sur TikTok — caméra, chat, spectateurs.
          </p>
          <StartLiveButton />
          <Link href="/fil" className="block text-sm text-[#25f4ee]">
            Ou publier un texte →
          </Link>
        </div>
      ) : (
        <UploadForm username={session.username} />
      )}
    </div>
  );
}
