import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Ctx = { params: { slug: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    const community = await prisma.community.findUnique({
      where: { slug: params.slug },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        _count: { select: { members: true } },
        posts: {
          orderBy: [{ pinnedAt: "desc" }, { createdAt: "desc" }],
          take: 50,
          include: {
            author: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
            _count: { select: { likes: true, comments: true } },
            likes: session
              ? { where: { userId: session.id }, select: { id: true } }
              : false,
          },
        },
      },
    });
    if (!community) {
      return NextResponse.json({ error: "Introuvable." }, { status: 404 });
    }

    let membership: { role: string } | null = null;
    if (session) {
      membership = await prisma.communityMember.findUnique({
        where: {
          communityId_userId: {
            communityId: community.id,
            userId: session.id,
          },
        },
        select: { role: true },
      });
    }

    // Best-effort view bump for posts (async fire)
    const postIds = community.posts.map((p) => p.id);
    if (postIds.length) {
      prisma.communityPost
        .updateMany({
          where: { id: { in: postIds } },
          data: { viewCount: { increment: 1 } },
        })
        .catch(() => {});
    }

    return NextResponse.json({
      community: {
        id: community.id,
        name: community.name,
        slug: community.slug,
        description: community.description,
        rules: community.rules,
        avatarUrl: community.avatarUrl,
        coverUrl: community.coverUrl,
        isPublic: community.isPublic,
        memberCount: community._count.members,
        owner: community.owner,
        myRole: membership?.role ?? null,
        isMember: Boolean(membership),
        isOwner: session?.id === community.ownerId,
        posts: community.posts.map((p) => ({
          id: p.id,
          content: p.content,
          imageUrl: p.imageUrl,
          videoUrl: p.videoUrl,
          viewCount: p.viewCount + 1,
          pinnedAt: p.pinnedAt?.toISOString() ?? null,
          createdAt: p.createdAt.toISOString(),
          likeCount: p._count.likes,
          commentCount: p._count.comments,
          likedByMe: Array.isArray(p.likes) ? p.likes.length > 0 : false,
          author: p.author,
        })),
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }
    const community = await prisma.community.findUnique({
      where: { slug: params.slug },
    });
    if (!community || community.ownerId !== session.id) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
    }
    const body = await req.json();
    const data: {
      name?: string;
      description?: string | null;
      rules?: string | null;
    } = {};
    if (body.name != null) data.name = String(body.name).trim().slice(0, 60);
    if ("description" in body) {
      data.description = body.description
        ? String(body.description).trim().slice(0, 500)
        : null;
    }
    if ("rules" in body) {
      data.rules = body.rules ? String(body.rules).trim().slice(0, 1000) : null;
    }
    const updated = await prisma.community.update({
      where: { id: community.id },
      data,
    });
    return NextResponse.json({ community: updated });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
