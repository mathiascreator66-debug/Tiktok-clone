import { prisma } from "./prisma";

const TAG_RE = /#([\p{L}\p{N}_]{1,50})/gu;

export function extractHashtags(text: string): string[] {
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  const re = new RegExp(TAG_RE.source, TAG_RE.flags);
  while ((m = re.exec(text)) !== null) {
    found.add(m[1].toLowerCase());
  }
  return Array.from(found);
}

/** Persist hashtags from caption onto a video (create Hashtag + VideoHashtag). */
export async function syncVideoHashtags(videoId: string, caption: string) {
  const names = extractHashtags(caption);
  await prisma.videoHashtag.deleteMany({ where: { videoId } });
  for (const name of names) {
    const tag = await prisma.hashtag.upsert({
      where: { name },
      create: { name },
      update: {},
    });
    await prisma.videoHashtag.create({
      data: { videoId, hashtagId: tag.id },
    });
  }
  return names;
}
