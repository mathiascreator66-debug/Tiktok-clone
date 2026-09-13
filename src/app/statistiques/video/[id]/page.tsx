import { redirect } from "next/navigation";

export default function StatistiquesVideoRedirect({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/studio/videos/${params.id}`);
}
