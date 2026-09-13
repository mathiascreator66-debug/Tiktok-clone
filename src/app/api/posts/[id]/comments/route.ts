import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureUploadDir, saveUploadFile, uploadPublicUrl } from "@/lib/uploads";
import {
  MAX_COMMENT_VIDEO_DURATION_SEC,
  MAX_UPLOAD_BYTES,
} from "@/lib/limits";
import {
  parseClientDuration,
  resolveDurationSeconds,
} from "@/lib/duration";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type Ctx = { params: { id: string } };

function mapComment(c: {
  id: string;
  content: string;
  createdAt: Date;
  imageUrl: string | null;
  videoUrl: string | null;
  user: {
    id: string;
    username: string;
    avatarUrl: string | null;
    displayName: string | null;
  };
}) {
  return {
    id: c.id,
    content: c.content,
    imageUrl: c.imageUrl,
    videoUrl: c.videoUrl,
    createdAt: c.createdAt.toISOString(),
    user: c.user,
  };
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const comments = await prisma.postComment.findMany({
      where: { postId: params.id },
      orderBy: { createdAt: "asc" },
      take: 100,
      include: {
        user: {
          select: { id: true, username: true, avatarUrl: true, displayName: true },
        },
      },
    });
    return NextResponse.json({
      comments: comments.map(mapComment),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }

    const ct = req.headers.get("content-type") || "";
    let content = "";
    let imageFile: File | null = null;
    let videoFile: File | null = null;
    let clientDuration: number | null = null;

    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      content = String(form.get("content") || "").trim().slice(0, 1000);
      imageFile = (form.get("image") as File | null) || null;
      videoFile = (form.get("video") as File | null) || null;
      clientDuration = parseClientDuration(form.get("durationSec"));
    } else {
      const body = await req.json();
      content = String(body.content || "").trim().slice(0, 1000);
    }

    if (!content && !imageFile && !videoFile) {
      return NextResponse.json({ error: "Commentaire vide." }, { status: 400 });
    }

    let imageUrl: string | null = null;
    if (imageFile && imageFile.size > 0) {
      if (imageFile.size > MAX_IMAGE_BYTES) {
        return NextResponse.json(
          { error: "Image trop lourde (max 5 Mo)." },
          { status: 400 }
        );
      }
      const ext = path.extname(imageFile.name) || ".jpg";
      const name = `${randomUUID()}${ext}`;
      const dir = await ensureUploadDir("post-comments");
      await saveUploadFile(imageFile, path.join(dir, name));
      imageUrl = uploadPublicUrl("post-comments", name);
    }

    let videoUrl: string | null = null;
    let videoDurationSec: number | null = null;
    if (videoFile && videoFile.size > 0) {
      if (videoFile.size > MAX_UPLOAD_BYTES) {
        return NextResponse.json({ error: "Vidéo trop lourde." }, { status: 400 });
      }
      const ext = path.extname(videoFile.name) || ".mp4";
      const name = `${randomUUID()}${ext}`;
      const dir = await ensureUploadDir("post-comments");
      const fullPath = path.join(dir, name);
      await saveUploadFile(videoFile, fullPath);
      const duration = await resolveDurationSeconds(fullPath, clientDuration);
      if (duration != null && duration > MAX_COMMENT_VIDEO_DURATION_SEC + 0.5) {
        return NextResponse.json(
          {
            error: `Vidéo trop longue (max ${MAX_COMMENT_VIDEO_DURATION_SEC}s).`,
          },
          { status: 400 }
        );
      }
      videoUrl = uploadPublicUrl("post-comments", name);
      videoDurationSec = duration;
    }

    const comment = await prisma.postComment.create({
      data: {
        postId: params.id,
        userId: session.id,
        content: content || "",
        imageUrl,
        videoUrl,
        videoDurationSec,
      },
      include: {
        user: {
          select: { id: true, username: true, avatarUrl: true, displayName: true },
        },
      },
    });
    return NextResponse.json({ comment: mapComment(comment) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
