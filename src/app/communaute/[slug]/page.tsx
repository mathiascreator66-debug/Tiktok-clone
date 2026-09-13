import PanneauView from "@/components/PanneauView";

export const dynamic = "force-dynamic";

export default function CommunautePage({
  params,
}: {
  params: { slug: string };
}) {
  return <PanneauView slug={params.slug} />;
}
