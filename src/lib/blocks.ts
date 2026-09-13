import { prisma } from "@/lib/prisma";

/** True if either user blocked the other. */
export async function isBlockedEither(aId: string, bId: string): Promise<boolean> {
  if (!aId || !bId || aId === bId) return false;
  const row = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: aId, blockedId: bId },
        { blockerId: bId, blockedId: aId },
      ],
    },
    select: { id: true },
  });
  return Boolean(row);
}

/** IDs blocked by viewer (hide their content). */
export async function blockedIdsFor(userId: string | null | undefined): Promise<string[]> {
  if (!userId) return [];
  const rows = await prisma.block.findMany({
    where: { blockerId: userId },
    select: { blockedId: true },
  });
  return rows.map((r) => r.blockedId);
}

/** IDs who blocked viewer (also hide / deny). */
export async function blockedByIdsFor(userId: string | null | undefined): Promise<string[]> {
  if (!userId) return [];
  const rows = await prisma.block.findMany({
    where: { blockedId: userId },
    select: { blockerId: true },
  });
  return rows.map((r) => r.blockerId);
}

export async function excludedUserIds(userId: string | null | undefined): Promise<string[]> {
  if (!userId) return [];
  const [a, b] = await Promise.all([
    blockedIdsFor(userId),
    blockedByIdsFor(userId),
  ]);
  return [...new Set([...a, ...b])];
}
