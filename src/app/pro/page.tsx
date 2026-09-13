import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import ProClient from "@/components/ProClient";

export const dynamic = "force-dynamic";

export default async function ProPage() {
  const session = await getSession();
  if (!session) redirect("/connexion");
  return <ProClient username={session.username} />;
}
