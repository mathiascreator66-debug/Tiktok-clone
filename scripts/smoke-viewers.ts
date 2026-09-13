import { getVideoAnalytics } from "../src/lib/studio";
import { prisma } from "../src/lib/prisma";

async function main() {
  const video = await prisma.video.findFirst();
  if (!video) {
    console.log("NO_VIDEO");
    process.exit(1);
  }
  const data = await getVideoAnalytics(video.id, video.userId, "viewers", "7d");
  if (!data || !("viewers" in data)) {
    console.error("FAIL missing viewers", data);
    process.exit(1);
  }
  console.log("OK", JSON.stringify({ tab: (data as any).tab, types: (data as any).viewers.types }).slice(0, 300));
  await prisma.$disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
