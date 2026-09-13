import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import ParametresClient from "@/components/ParametresClient";

export const dynamic = "force-dynamic";

export default async function ParametresPage() {
  const session = await getSession();
  if (!session) redirect("/connexion");
  return <ParametresClient username={session.username} />;
}
