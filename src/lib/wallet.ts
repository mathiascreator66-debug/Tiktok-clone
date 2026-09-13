import { prisma } from "./prisma";
import {
  BOOST_COST_CENTS,
  BOOST_DURATION_MS,
  DEMO_CREDIT_CENTS,
  PRO_COST_CENTS,
  PRO_TRIAL_DAYS,
  TIP_AMOUNTS_CENTS,
  tipFeeCents,
} from "./wallet-shared";

export * from "./wallet-shared";

/**
 * Crédit démo (pas d'argent réel). Structure prête pour Stripe Checkout plus tard.
 */
export async function creditDemo(userId: string, amountCents = DEMO_CREDIT_CENTS) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: { balanceCents: { increment: amountCents } },
      select: { balanceCents: true },
    });
    const transaction = await tx.transaction.create({
      data: {
        userId,
        type: "credit",
        amountCents,
        meta: JSON.stringify({
          demo: true,
          note: "Crédit démo — pas d'argent réel",
          source: "demo_button",
        }),
      },
    });
    return { balanceCents: user.balanceCents, transaction };
  });
}

export async function sendTip(opts: {
  fromUserId: string;
  toUserId: string;
  amountCents: number;
  videoId?: string;
}) {
  const { fromUserId, toUserId, amountCents, videoId } = opts;
  if (fromUserId === toUserId) {
    throw new Error("SELF_TIP");
  }
  if (!TIP_AMOUNTS_CENTS.includes(amountCents as (typeof TIP_AMOUNTS_CENTS)[number])) {
    throw new Error("INVALID_AMOUNT");
  }

  const fee = tipFeeCents(amountCents);
  const net = amountCents - fee;

  return prisma.$transaction(async (tx) => {
    const sender = await tx.user.findUnique({ where: { id: fromUserId } });
    if (!sender) throw new Error("NOT_FOUND");
    if (sender.balanceCents < amountCents) throw new Error("INSUFFICIENT");

    const updatedSender = await tx.user.update({
      where: { id: fromUserId },
      data: { balanceCents: { decrement: amountCents } },
      select: { balanceCents: true },
    });
    await tx.user.update({
      where: { id: toUserId },
      data: { balanceCents: { increment: net } },
    });

    const sent = await tx.transaction.create({
      data: {
        userId: fromUserId,
        type: "tip_sent",
        amountCents: -amountCents,
        meta: JSON.stringify({
          demo: true,
          note: "Démo — crédits virtuels",
          counterpartyId: toUserId,
          videoId: videoId ?? null,
          feeCents: fee,
          netCents: net,
          platformFeeNote:
            fee > 0 ? `Frais plateforme 10 % : ${fee} centimes` : null,
        }),
      },
    });
    const received = await tx.transaction.create({
      data: {
        userId: toUserId,
        type: "tip_received",
        amountCents: net,
        meta: JSON.stringify({
          demo: true,
          note: "Démo — crédits virtuels",
          counterpartyId: fromUserId,
          videoId: videoId ?? null,
          feeCents: fee,
          grossCents: amountCents,
          platformFeeNote:
            fee > 0
              ? `Frais plateforme 10 % retenus : ${fee} centimes`
              : null,
        }),
      },
    });

    return {
      balanceCents: updatedSender.balanceCents,
      sent,
      received,
      feeCents: fee,
      netCents: net,
    };
  });
}

export async function boostVideo(opts: { userId: string; videoId: string }) {
  const { userId, videoId } = opts;
  return prisma.$transaction(async (tx) => {
    const video = await tx.video.findUnique({ where: { id: videoId } });
    if (!video) throw new Error("NOT_FOUND");
    if (video.userId !== userId) throw new Error("FORBIDDEN");

    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("NOT_FOUND");
    if (user.balanceCents < BOOST_COST_CENTS) throw new Error("INSUFFICIENT");

    const now = Date.now();
    const base =
      video.boostedUntil && video.boostedUntil.getTime() > now
        ? video.boostedUntil.getTime()
        : now;
    const boostedUntil = new Date(base + BOOST_DURATION_MS);

    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: { balanceCents: { decrement: BOOST_COST_CENTS } },
      select: { balanceCents: true },
    });
    const updatedVideo = await tx.video.update({
      where: { id: videoId },
      data: { boostedUntil },
    });
    const transaction = await tx.transaction.create({
      data: {
        userId,
        type: "boost",
        amountCents: -BOOST_COST_CENTS,
        meta: JSON.stringify({
          demo: true,
          note: "Démo — crédits virtuels · boost 24 h",
          videoId,
          boostedUntil: boostedUntil.toISOString(),
        }),
      },
    });

    return {
      balanceCents: updatedUser.balanceCents,
      boostedUntil: updatedVideo.boostedUntil,
      transaction,
    };
  });
}

export async function activatePro(opts: {
  userId: string;
  useTrial: boolean;
}) {
  const { userId, useTrial } = opts;
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("NOT_FOUND");

    const now = Date.now();
    const currentEnd =
      user.isPro && user.proUntil && user.proUntil.getTime() > now
        ? user.proUntil.getTime()
        : now;
    const proUntil = new Date(
      currentEnd + PRO_TRIAL_DAYS * 24 * 60 * 60 * 1000
    );

    if (useTrial) {
      if (user.proTrialUsed) throw new Error("TRIAL_USED");
      await tx.user.update({
        where: { id: userId },
        data: {
          isPro: true,
          proUntil,
          proTrialUsed: true,
        },
      });
      const transaction = await tx.transaction.create({
        data: {
          userId,
          type: "subscription",
          amountCents: 0,
          meta: JSON.stringify({
            demo: true,
            note: "Essai Pro gratuit 7 jours — démo",
            trial: true,
            proUntil: proUntil.toISOString(),
          }),
        },
      });
      return {
        balanceCents: user.balanceCents,
        isPro: true,
        proUntil,
        transaction,
        trial: true,
      };
    }

    if (user.balanceCents < PRO_COST_CENTS) throw new Error("INSUFFICIENT");

    const updated = await tx.user.update({
      where: { id: userId },
      data: {
        balanceCents: { decrement: PRO_COST_CENTS },
        isPro: true,
        proUntil,
      },
      select: { balanceCents: true },
    });
    const transaction = await tx.transaction.create({
      data: {
        userId,
        type: "subscription",
        amountCents: -PRO_COST_CENTS,
        meta: JSON.stringify({
          demo: true,
          note: "ClipTok Pro 7 jours — démo crédits virtuels",
          trial: false,
          proUntil: proUntil.toISOString(),
        }),
      },
    });
    return {
      balanceCents: updated.balanceCents,
      isPro: true,
      proUntil,
      transaction,
      trial: false,
    };
  });
}
