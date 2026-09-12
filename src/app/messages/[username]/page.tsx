import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import ChatThread from "@/components/ChatThread";

export const dynamic = "force-dynamic";

export default async function ConversationPage({
  params,
}: {
  params: { username: string };
}) {
  const session = await getSession();
  if (!session) redirect("/connexion");
  if (params.username.toLowerCase() === session.username) {
    redirect("/messages");
  }
  return <ChatThread username={params.username.toLowerCase()} />;
}
