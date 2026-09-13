import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AdminPaiementsClient from "@/components/AdminPaiementsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin paiements — AfriVoix" };

export default async function AdminPaiementsPage() {
  const session = await getSession();
  if (!session) redirect("/connexion");
  const me = await prisma.user.findUnique({
    where: { id: session.id },
    select: { isAdmin: true, accountStatus: true },
  });
  if (!me || me.accountStatus !== "ACTIVE" || !me.isAdmin) redirect("/");
  return <AdminPaiementsClient />;
}
