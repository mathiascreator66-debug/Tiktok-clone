import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
]);

function isImageOrMp4(mime: string, filename: string) {
  if (ALLOWED.has(mime)) return true;
  const ext = path.extname(filename).toLowerCase();
  return [".jpg", ".jpeg", ".png", ".webp", ".mp4"].includes(ext);
}

export async function GET() {
  try {
    const session = await getSession();
    const now = new Date();

    const stories = await prisma.story.findMany({
      where: { expiresAt: { gt: now } },
      orderBy: { createdAt: "asc" },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        views: session
          ? { where: { userId: session.id }, select: { id: true } }
          : false,
      },
    });

    const followingIds = new Set<string>();
    if (session) {
      const follows = await prisma.follow.findMany({
        where: { followerId: session.id },
        select: { followingId: true },
      });
      follows.forEach((f) => followingIds.add(f.followingId));
    }

    type StoryRow = (typeof stories)[number];
    const byUser = new Map<
      string,
      {
        user: StoryRow["user"];
        stories: {
          id: string;
          mediaUrl: string;
          caption: string | null;
          createdAt: string;
          expiresAt: string;
          viewedByMe: boolean;
        }[];
      }
    >();

    for (const s of stories) {
      const viewedByMe =
        session && Array.isArray(s.views) ? s.views.length > 0 : false;
      const entry = byUser.get(s.userId) ?? {
        user: s.user,
        stories: [],
      };
      entry.stories.push({
        id: s.id,
        mediaUrl: s.mediaUrl,
        caption: s.caption,
        createdAt: s.createdAt.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
        viewedByMe,
      });
      byUser.set(s.userId, entry);
    }

    const groups = Array.from(byUser.values()).map((g) => ({
      user: g.user,
      stories: g.stories,
      hasUnviewed: g.stories.some((st) => !st.viewedByMe),
      isOwn: session ? g.user.id === session.id : false,
      isFollowing: followingIds.has(g.user.id),
    }));

    groups.sort((a, b) => {
      if (a.isOwn !== b.isOwn) return a.isOwn ? -1 : 1;
      if (a.isFollowing !== b.isFollowing) return a.isFollowing ? -1 : 1;
      if (a.hasUnviewed !== b.hasUnviewed) return a.hasUnviewed ? -1 : 1;
      const aLast = a.stories[a.stories.length - 1]?.createdAt ?? "";
      const bLast = b.stories[b.stories.length - 1]?.createdAt ?? "";
      return bLast.localeCompare(aLast);
    });

    return NextResponse.json({
      groups: groups.map((g) => ({
        user: g.user,
        stories: g.stories,
        hasUnviewed: g.hasUnviewed,
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

    const form = await req.formData();
    const captionRaw = form.get("caption");
    const caption =
      captionRaw != null && String(captionRaw).trim()
        ? String(captionRaw).trim().slice(0, 200)
        : null;
    const file = form.get("media") as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json(
        { error: "Image ou vidéo requise." },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Fichier trop lourd (max 15 Mo)." },
        { status: 400 }
      );
    }
    if (!isImageOrMp4(file.type, file.name)) {
      return NextResponse.json(
        { error: "Formats acceptés : JPEG, PNG, WebP, MP4." },
        { status: 400 }
      );
    }

    const ext =
      path.extname(file.name) ||
      (file.type === "image/png"
        ? ".png"
        : file.type === "image/webp"
          ? ".webp"
          : file.type.startsWith("video/")
            ? ".mp4"
            : ".jpg");
    const filename = `${randomUUID()}${ext}`;
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "stories");
    await mkdir(uploadsDir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadsDir, filename), buffer);

    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);

    const story = await prisma.story.create({
      data: {
        userId: session.id,
        mediaUrl: `/uploads/stories/${filename}`,
        caption,
        createdAt,
        expiresAt,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    return NextResponse.json({
      story: {
        id: story.id,
        mediaUrl: story.mediaUrl,
        caption: story.caption,
        createdAt: story.createdAt.toISOString(),
        expiresAt: story.expiresAt.toISOString(),
        viewedByMe: true,
        user: story.user,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
