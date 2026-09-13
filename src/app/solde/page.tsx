import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import SoldeClient from "@/components/SoldeClient";

export const dynamic = "force-dynamic";

export default async function SoldePage() {
  const session = await getSession();
  if (!session) redirect("/connexion");
  return <SoldeClient username={session.username} />;
}
