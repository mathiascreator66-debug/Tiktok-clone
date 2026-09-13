import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import StudioVideoAnalytics from "@/components/studio/StudioVideoAnalytics";

export const dynamic = "force-dynamic";

export default async function StudioVideoPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSession();
  if (!session) redirect(`/connexion?next=/studio/videos/${params.id}`);
  return <StudioVideoAnalytics videoId={params.id} />;
}
