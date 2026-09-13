import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import path from "path";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureUploadDir, saveUploadFile } from "@/lib/uploads";
import { excludedUserIds } from "@/lib/blocks";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    const username = req.nextUrl.searchParams.get("username");
    const excluded = await excludedUserIds(session?.id);

    const where: {
      authorId?: string | { notIn: string[] };
      visibility?: string | { in: string[] };
    } = {};

    if (username) {
      const u = await prisma.user.findUnique({
        where: { username: username.toLowerCase() },
        select: { id: true },
      });
      if (!u) return NextResponse.json({ posts: [] });
      where.authorId = u.id;
    } else if (excluded.length) {
      where.authorId = { notIn: excluded };
    }

    // FOLLOWERS visibility: show if public OR (followers and viewer follows author) — simplify: PUBLIC only for feed unless own
    const posts = await prisma.post.findMany({
      where: {
        ...where,
        OR: [
          { visibility: "PUBLIC" },
          ...(session ? [{ authorId: session.id }] : []),
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
        images: { orderBy: { sortOrder: "asc" } },
        _count: { select: { likes: true, comments: true } },
        likes: session
          ? { where: { userId: session.id }, select: { id: true, reaction: true } }
          : false,
      },
    });

    return NextResponse.json({
      posts: posts.map((p) => ({
        id: p.id,
        content: p.content,
        visibility: p.visibility,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        author: p.author,
        images: p.images.map((i) => i.imageUrl),
        likeCount: p._count.likes,
        commentCount: p._count.comments,
        likedByMe: Array.isArray(p.likes) ? p.likes.length > 0 : false,
        myReaction: Array.isArray(p.likes) && p.likes[0] ? p.likes[0].reaction : null,
        isOwner: session?.id === p.authorId,
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
    const ct = req.headers.get("content-type") || "";
    let content = "";
    let visibility = "PUBLIC";
    let isAiGenerated = false;
    const imageUrls: string[] = [];

    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      content = String(form.get("content") || "").trim();
      visibility = String(form.get("visibility") || "PUBLIC").toUpperCase();
      if (visibility !== "FOLLOWERS") visibility = "PUBLIC";
      const aiRaw = String(form.get("isAiGenerated") ?? "false").toLowerCase();
      isAiGenerated = ["1", "true", "yes", "on"].includes(aiRaw);
      const files = form.getAll("images") as File[];
      for (const file of files.slice(0, 6)) {
        if (!file || !file.size) continue;
        if (file.size > 8 * 1024 * 1024) continue;
        const ext = path.extname(file.name) || ".jpg";
        const name = `${randomUUID()}${ext === ".jpeg" ? ".jpg" : ext}`;
        const dir = await ensureUploadDir("posts");
        await saveUploadFile(file, path.join(dir, name));
        imageUrls.push(`/uploads/posts/${name}`);
      }
    } else {
      const body = await req.json();
      content = String(body.content || "").trim();
      visibility =
        String(body.visibility || "PUBLIC").toUpperCase() === "FOLLOWERS"
          ? "FOLLOWERS"
          : "PUBLIC";
      isAiGenerated = Boolean(body.isAiGenerated);
    }

    if (!content && imageUrls.length === 0) {
      return NextResponse.json({ error: "Écrivez quelque chose." }, { status: 400 });
    }
    if (content.length > 5000) {
      return NextResponse.json({ error: "Texte trop long." }, { status: 400 });
    }

    const post = await prisma.post.create({
      data: {
        authorId: session.id,
        content: content || "",
        isAiGenerated,
        visibility,
        images: {
          create: imageUrls.map((imageUrl, i) => ({
            imageUrl,
            sortOrder: i,
          })),
        },
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
        images: true,
      },
    });

    return NextResponse.json({
      post: {
        id: post.id,
        content: post.content,
        visibility: post.visibility,
        createdAt: post.createdAt.toISOString(),
        author: post.author,
        images: post.images.map((i) => i.imageUrl),
        likeCount: 0,
        commentCount: 0,
        likedByMe: false,
        isOwner: true,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
