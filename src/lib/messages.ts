import { prisma } from "./prisma";

/** Ordered pair so Conversation unique constraint is stable. */
export function orderedPair(userId1: string, userId2: string): [string, string] {
  return userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];
}

export function otherParticipantId(
  conv: { participantAId: string; participantBId: string },
  meId: string
) {
  return conv.participantAId === meId ? conv.participantBId : conv.participantAId;
}

export async function findOrCreateConversation(userId1: string, userId2: string) {
  if (userId1 === userId2) throw new Error("SELF_DM");
  const [a, b] = orderedPair(userId1, userId2);
  const existing = await prisma.conversation.findUnique({
    where: { participantAId_participantBId: { participantAId: a, participantBId: b } },
  });
  if (existing) return existing;
  return prisma.conversation.create({
    data: { participantAId: a, participantBId: b },
  });
}

export async function unreadMessageCount(userId: string) {
  const convs = await prisma.conversation.findMany({
    where: {
      OR: [{ participantAId: userId }, { participantBId: userId }],
    },
    select: { id: true },
  });
  if (convs.length === 0) return 0;
  return prisma.message.count({
    where: {
      conversationId: { in: convs.map((c) => c.id) },
      senderId: { not: userId },
      readAt: null,
    },
  });
}
