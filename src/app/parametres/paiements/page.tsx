import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import PaiementsClient from "@/components/PaiementsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Moyens de paiement — AfriVoix" };

export default async function PaiementsPage() {
  const session = await getSession();
  if (!session) redirect("/connexion");
  return <PaiementsClient username={session.username} />;
}
