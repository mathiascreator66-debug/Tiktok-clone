import { redirect } from "next/navigation";

export default function StatistiquesRedirect({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  const q = searchParams?.tab ? `?tab=${searchParams.tab}` : "";
  redirect(`/studio${q}`);
}
