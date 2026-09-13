import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import EditProfileForm from "@/components/EditProfileForm";

export const dynamic = "force-dynamic";

export default async function ModifierProfilPage({
  params,
}: {
  params: { username: string };
}) {
  const session = await getSession();
  if (!session) redirect("/connexion");

  const user = await prisma.user.findUnique({
    where: { username: params.username.toLowerCase() },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      bio: true,
      profileLinks: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, url: true, label: true },
      },
    },
  });

  if (!user) notFound();
  if (user.id !== session.id) {
    redirect(`/profil/${user.username}`);
  }

  return (
    <div className="min-h-[100dvh] pt-6 md:pt-20 pb-20 px-4">
      <div className="max-w-md mx-auto mb-6">
        <Link
          href={`/profil/${user.username}`}
          className="text-white/50 text-sm hover:text-white"
        >
          ← Retour au profil
        </Link>
        <h1 className="text-2xl font-bold mt-3">Modifier le profil</h1>
      </div>
      <EditProfileForm
        user={{
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          bio: user.bio,
          links: user.profileLinks,
        }}
      />
    </div>
  );
}
