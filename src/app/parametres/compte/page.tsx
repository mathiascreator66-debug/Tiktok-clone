import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AccountSettings from "@/components/AccountSettings";

export const dynamic = "force-dynamic";

export default async function ComptePage() {
  const session = await getSession();
  if (!session) redirect("/connexion");
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      email: true,
      username: true,
      displayName: true,
      passwordHash: true,
    },
  });
  if (!user) redirect("/connexion");
  return (
    <AccountSettings
      user={{
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        hasPassword: Boolean(user.passwordHash),
      }}
    />
  );
}
