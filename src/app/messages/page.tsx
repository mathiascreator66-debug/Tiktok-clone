import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import MessagesInbox from "@/components/MessagesInbox";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const session = await getSession();
  if (!session) redirect("/connexion");
  return <MessagesInbox />;
}
