import { getVideoAnalytics } from "../src/lib/studio";
import { prisma } from "../src/lib/prisma";

async function main() {
  const videos = await prisma.video.findMany({ select: { id: true, userId: true }, take: 10 });
  for (const v of videos) {
    try {
      const data = await getVideoAnalytics(v.id, v.userId, "viewers", "7d");
      console.log(v.id, "OK", data ? Object.keys(data) : null);
      if (data && "viewers" in data) {
        console.log("  types", (data as any).viewers.types);
      }
    } catch (e: any) {
      console.error(v.id, "FAIL", e?.message || e);
      console.error(e);
    }
  }
  await prisma.$disconnect();
}
main();
