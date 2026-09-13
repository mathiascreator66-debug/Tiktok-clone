import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import StudioDashboard from "@/components/studio/StudioDashboard";

export const dynamic = "force-dynamic";

export default async function StudioPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  const session = await getSession();
  if (!session) redirect("/connexion?next=/studio");
  const tab = searchParams?.tab || "analytics";
  return <StudioDashboard initialTab={tab} />;
}
