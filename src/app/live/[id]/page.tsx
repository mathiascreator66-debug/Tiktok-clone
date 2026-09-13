import LiveRoom from "@/components/LiveRoom";

export const dynamic = "force-dynamic";

export default function LivePage({ params }: { params: { id: string } }) {
  return <LiveRoom liveId={params.id} />;
}
