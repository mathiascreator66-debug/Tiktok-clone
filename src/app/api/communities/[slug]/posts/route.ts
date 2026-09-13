import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import path from "path";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureUploadDir, saveUploadFile } from "@/lib/uploads";
import {
  MAX_PANNEAU_VIDEO_DURATION_SEC,
  MAX_UPLOAD_BYTES,
} from "@/lib/limits";
import {
  parseClientDuration,
  resolveDurationSeconds,
} from "@/lib/duration";

type Ctx = { params: { slug: string } };

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }
    const community = await prisma.community.findUnique({
      where: { slug: params.slug },
    });
    if (!community) {
      return NextResponse.json({ error: "Introuvable." }, { status: 404 });
    }
    const member = await prisma.communityMember.findUnique({
      where: {
        communityId_userId: {
          communityId: community.id,
          userId: session.id,
        },
      },
    });
    const canPost = community.ownerId === session.id || Boolean(member);
    if (!canPost) {
      return NextResponse.json(
        { error: "Rejoignez le panneau pour publier." },
        { status: 403 }
      );
    }

    const ct = req.headers.get("content-type") || "";
    let content = "";
    let imageUrl: string | null = null;
    let videoUrl: string | null = null;
    let durationSec: number | null = null;

    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      content = String(form.get("content") || "").trim();
      const image = form.get("image") as File | null;
      const video = form.get("video") as File | null;
      if (image && image.size > 0) {
        if (image.size > 8 * 1024 * 1024) {
          return NextResponse.json({ error: "Image trop lourde (max 8 Mo)." }, { status: 400 });
        }
        const ext = path.extname(image.name) || ".jpg";
        const name = `${randomUUID()}${ext}`;
        const dir = await ensureUploadDir("panneau");
        await saveUploadFile(image, path.join(dir, name));
        imageUrl = `/uploads/panneau/${name}`;
      }
      if (video && video.size > 0) {
        if (video.size > MAX_UPLOAD_BYTES) {
          return NextResponse.json({ error: "Vidéo trop lourde." }, { status: 400 });
        }
        const clientDuration = parseClientDuration(form.get("durationSec"));
        const ext = path.extname(video.name) || ".mp4";
        const name = `${randomUUID()}${ext}`;
        const dir = await ensureUploadDir("panneau");
        const fullPath = path.join(dir, name);
        await saveUploadFile(video, fullPath);
        const duration = await resolveDurationSeconds(fullPath, clientDuration);
        if (duration != null && duration > MAX_PANNEAU_VIDEO_DURATION_SEC + 0.5) {
          return NextResponse.json(
            {
              error: `Vidéo trop longue (max ${MAX_PANNEAU_VIDEO_DURATION_SEC}s).`,
            },
            { status: 400 }
          );
        }
        videoUrl = `/uploads/panneau/${name}`;
        durationSec = duration;
      }
    } else {
      const body = await req.json();
      content = String(body.content || "").trim();
      if (body.imageUrl) imageUrl = String(body.imageUrl);
      if (body.videoUrl) videoUrl = String(body.videoUrl);
    }

    if (!content && !imageUrl && !videoUrl) {
      return NextResponse.json({ error: "Contenu requis." }, { status: 400 });
    }
    if (content.length > 2000) {
      return NextResponse.json({ error: "Texte trop long." }, { status: 400 });
    }

    const post = await prisma.communityPost.create({
      data: {
        communityId: community.id,
        authorId: session.id,
        content: content || "",
        imageUrl,
        videoUrl,
        durationSec,
      },
      include: {
        author: {
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
      post: {
        id: post.id,
        content: post.content,
        imageUrl: post.imageUrl,
        videoUrl: post.videoUrl,
        viewCount: 0,
        pinnedAt: null,
        createdAt: post.createdAt.toISOString(),
        likeCount: 0,
        commentCount: 0,
        likedByMe: false,
        author: post.author,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
