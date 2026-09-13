import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { slugify } from "@/lib/slug";
import { randomBytes } from "crypto";

export async function GET() {
  try {
    const communities = await prisma.community.findMany({
      where: { isPublic: true },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        _count: { select: { members: true, posts: true } },
      },
    });
    return NextResponse.json({
      communities: communities.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        avatarUrl: c.avatarUrl,
        coverUrl: c.coverUrl,
        memberCount: c._count.members,
        postCount: c._count.posts,
        owner: c.owner,
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }
    const existing = await prisma.community.findFirst({
      where: { ownerId: session.id },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Vous avez déjà un panneau.", slug: existing.slug },
        { status: 400 }
      );
    }
    const body = await req.json();
    const name = String(body.name || "").trim().slice(0, 60);
    const description = body.description
      ? String(body.description).trim().slice(0, 500)
      : null;
    const rules = body.rules
      ? String(body.rules).trim().slice(0, 1000)
      : "Soyez respectueux. Pas de spam. Contenu adapté à tous.";
    if (!name) {
      return NextResponse.json({ error: "Nom requis." }, { status: 400 });
    }
    let slug = slugify(name);
    const clash = await prisma.community.findUnique({ where: { slug } });
    if (clash) slug = `${slug}-${randomBytes(2).toString("hex")}`;

    const community = await prisma.community.create({
      data: {
        ownerId: session.id,
        name,
        slug,
        description,
        rules,
        members: {
          create: { userId: session.id, role: "OWNER" },
        },
      },
    });
    return NextResponse.json({
      community: {
        id: community.id,
        name: community.name,
        slug: community.slug,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
