import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/** Suggest usernames for @mentions: followed users first, then matching users. */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ users: [] });
    }

    const q = (req.nextUrl.searchParams.get("q") || "").trim().toLowerCase();
    const take = 8;

    const following = await prisma.follow.findMany({
      where: { followerId: session.id },
      select: {
        following: {
          select: { id: true, username: true, avatarUrl: true, displayName: true },
        },
      },
    });

    let followed = following.map((f) => f.following);
    if (q) {
      followed = followed.filter(
        (u) =>
          u.username.toLowerCase().includes(q) ||
          (u.displayName || "").toLowerCase().includes(q)
      );
    }

    const followedIds = new Set(followed.map((u) => u.id));
    followedIds.add(session.id);

    const others = await prisma.user.findMany({
      where: {
        id: { notIn: Array.from(followedIds) },
        ...(q
          ? {
              OR: [
                { username: { contains: q } },
                { displayName: { contains: q } },
              ],
            }
          : {}),
      },
      take,
      orderBy: { createdAt: "desc" },
      select: { id: true, username: true, avatarUrl: true, displayName: true },
    });

    const users = [...followed, ...others].slice(0, take);
    return NextResponse.json({ users });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
