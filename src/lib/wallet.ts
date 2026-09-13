import { prisma } from "./prisma";
import { getGiftById, giftFeeCents } from "./gifts";
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
        provider: "WALLET",
        status: "COMPLETED",
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
          note: "AfriVoix Pro 7 jours — démo crédits virtuels",
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

export async function sendVideoGift(opts: {
  fromUserId: string;
  videoId: string;
  giftId: string;
  provider?: string;
}) {
  const { fromUserId, videoId, giftId, provider = "WALLET" } = opts;
  const gift = getGiftById(giftId);
  if (!gift) throw new Error("INVALID_GIFT");

  const fee = giftFeeCents(gift.priceCents);
  const net = gift.priceCents - fee;

  return prisma.$transaction(async (tx) => {
    const video = await tx.video.findUnique({
      where: { id: videoId },
      select: { id: true, userId: true },
    });
    if (!video) throw new Error("NOT_FOUND");
    if (video.userId === fromUserId) throw new Error("SELF_GIFT");

    const sender = await tx.user.findUnique({ where: { id: fromUserId } });
    if (!sender) throw new Error("NOT_FOUND");
    if (sender.balanceCents < gift.priceCents) throw new Error("INSUFFICIENT");

    const updatedSender = await tx.user.update({
      where: { id: fromUserId },
      data: { balanceCents: { decrement: gift.priceCents } },
      select: { balanceCents: true },
    });
    await tx.user.update({
      where: { id: video.userId },
      data: { balanceCents: { increment: net } },
    });

    const videoGift = await tx.videoGift.create({
      data: {
        giftId: gift.id,
        amountCents: gift.priceCents,
        feeCents: fee,
        videoId,
        senderId: fromUserId,
        receiverId: video.userId,
        provider,
      },
    });

    await tx.transaction.create({
      data: {
        userId: fromUserId,
        type: "gift_sent",
        amountCents: -gift.priceCents,
        provider,
        status: "COMPLETED",
        meta: JSON.stringify({
          demo: true,
          note: `Cadeau ${gift.emoji} ${gift.label} — démo`,
          giftId: gift.id,
          giftLabel: gift.label,
          videoId,
          counterpartyId: video.userId,
          feeCents: fee,
          videoGiftId: videoGift.id,
        }),
      },
    });
    await tx.transaction.create({
      data: {
        userId: video.userId,
        type: "gift_received",
        amountCents: net,
        provider,
        status: "COMPLETED",
        meta: JSON.stringify({
          demo: true,
          note: `Cadeau reçu ${gift.emoji} ${gift.label} — démo`,
          giftId: gift.id,
          giftLabel: gift.label,
          videoId,
          counterpartyId: fromUserId,
          feeCents: fee,
          grossCents: gift.priceCents,
          videoGiftId: videoGift.id,
        }),
      },
    });

    return {
      balanceCents: updatedSender.balanceCents,
      gift,
      feeCents: fee,
      netCents: net,
      videoGiftId: videoGift.id,
      receiverId: video.userId,
    };
  });
}

export const CREATOR_SUB_DAYS = 30;
export const CREATOR_SUB_PLATFORM_FEE_BPS = 1000; // 10 %

export async function subscribeToCreator(opts: {
  fanId: string;
  creatorId: string;
  provider?: string;
}) {
  const { fanId, creatorId, provider = "WALLET" } = opts;
  if (fanId === creatorId) throw new Error("SELF_SUB");

  return prisma.$transaction(async (tx) => {
    const plan = await tx.creatorSubscriptionPlan.findUnique({
      where: { creatorId },
    });
    if (!plan || !plan.active) throw new Error("NO_PLAN");
    if (plan.priceCents < 50) throw new Error("INVALID_PRICE");

    const fan = await tx.user.findUnique({ where: { id: fanId } });
    if (!fan) throw new Error("NOT_FOUND");
    if (fan.balanceCents < plan.priceCents) throw new Error("INSUFFICIENT");

    const fee = Math.floor((plan.priceCents * CREATOR_SUB_PLATFORM_FEE_BPS) / 10_000);
    const net = plan.priceCents - fee;
    const now = Date.now();

    const existing = await tx.creatorSubscriber.findUnique({
      where: { fanId_creatorId: { fanId, creatorId } },
    });
    const base =
      existing &&
      existing.status === "ACTIVE" &&
      existing.until.getTime() > now
        ? existing.until.getTime()
        : now;
    const until = new Date(base + CREATOR_SUB_DAYS * 24 * 60 * 60 * 1000);

    const updatedFan = await tx.user.update({
      where: { id: fanId },
      data: { balanceCents: { decrement: plan.priceCents } },
      select: { balanceCents: true },
    });
    await tx.user.update({
      where: { id: creatorId },
      data: { balanceCents: { increment: net } },
    });

    const sub = await tx.creatorSubscriber.upsert({
      where: { fanId_creatorId: { fanId, creatorId } },
      create: {
        fanId,
        creatorId,
        planId: plan.id,
        status: "ACTIVE",
        until,
        provider,
      },
      update: {
        planId: plan.id,
        status: "ACTIVE",
        until,
        provider,
      },
    });

    await tx.transaction.create({
      data: {
        userId: fanId,
        type: "creator_sub",
        amountCents: -plan.priceCents,
        provider,
        status: "COMPLETED",
        meta: JSON.stringify({
          demo: true,
          note: "Abonnement Premium créateur (démo — pas AfriVoix Pro ni badge certifié)",
          creatorId,
          until: until.toISOString(),
          feeCents: fee,
        }),
      },
    });
    await tx.transaction.create({
      data: {
        userId: creatorId,
        type: "creator_sub",
        amountCents: net,
        provider,
        status: "COMPLETED",
        meta: JSON.stringify({
          demo: true,
          note: "Abonnement Premium reçu (démo)",
          fanId,
          until: until.toISOString(),
          feeCents: fee,
          grossCents: plan.priceCents,
        }),
      },
    });

    return {
      balanceCents: updatedFan.balanceCents,
      until,
      sub,
      feeCents: fee,
      netCents: net,
      priceCents: plan.priceCents,
    };
  });
}

export async function isActiveCreatorSubscriber(
  fanId: string | null | undefined,
  creatorId: string
): Promise<boolean> {
  if (!fanId) return false;
  if (fanId === creatorId) return true;
  const sub = await prisma.creatorSubscriber.findUnique({
    where: { fanId_creatorId: { fanId, creatorId } },
  });
  if (!sub || sub.status !== "ACTIVE") return false;
  return sub.until.getTime() > Date.now();
}
