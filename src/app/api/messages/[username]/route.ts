import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import path from "path";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { findOrCreateConversation } from "@/lib/messages";
import { encryptMessageBody, decryptMessageBody } from "@/lib/crypto-messages";
import {
  ensureUploadDir,
  saveUploadFile,
  isAllowedAudioFile,
  audioExtFor,
} from "@/lib/uploads";
import { MAX_UPLOAD_BYTES, MAX_AUDIO_BYTES } from "@/lib/limits";
import { isBlockedEither } from "@/lib/blocks";

type Ctx = { params: { username: string } };

function mapMessage(
  m: {
    id: string;
    body: string;
    senderId: string;
    imageUrl: string | null;
    videoUrl: string | null;
    audioUrl: string | null;
    audioDurationMs: number | null;
    createdAt: Date;
    readAt: Date | null;
    sender?: { username: string };
  },
  sessionId: string
) {
  return {
    id: m.id,
    body: decryptMessageBody(m.body || ""),
    imageUrl: m.imageUrl,
    videoUrl: m.videoUrl,
    audioUrl: m.audioUrl,
    audioDurationMs: m.audioDurationMs,
    senderId: m.senderId,
    senderUsername: m.sender?.username,
    createdAt: m.createdAt.toISOString(),
    readAt: m.readAt?.toISOString() ?? null,
    mine: m.senderId === sessionId,
  };
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }
    const other = await prisma.user.findUnique({
      where: { username: params.username.toLowerCase() },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
      },
    });
    if (!other) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }
    if (other.id === session.id) {
      return NextResponse.json({ error: "Impossible de vous écrire." }, { status: 400 });
    }
    if (await isBlockedEither(session.id, other.id)) {
      return NextResponse.json(
        { error: "Utilisateur indisponible." },
        { status: 403 }
      );
    }

    const conv = await findOrCreateConversation(session.id, other.id);

    await prisma.message.updateMany({
      where: {
        conversationId: conv.id,
        senderId: { not: session.id },
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    const messages = await prisma.message.findMany({
      where: { conversationId: conv.id },
      orderBy: { createdAt: "asc" },
      take: 200,
      include: {
        sender: {
          select: { id: true, username: true, avatarUrl: true },
        },
      },
    });

    const iFollowThem = Boolean(
      await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: session.id,
            followingId: other.id,
          },
        },
      })
    );

    return NextResponse.json({
      conversationId: conv.id,
      other,
      iFollowThem,
      messages: messages.map((m) => mapMessage(m, session.id)),
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
    const other = await prisma.user.findUnique({
      where: { username: params.username.toLowerCase() },
      select: { id: true, username: true },
    });
    if (!other) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }
    if (other.id === session.id) {
      return NextResponse.json({ error: "Impossible de vous écrire." }, { status: 400 });
    }
    if (await isBlockedEither(session.id, other.id)) {
      return NextResponse.json(
        { error: "Utilisateur indisponible." },
        { status: 403 }
      );
    }

    const ct = req.headers.get("content-type") || "";
    let text = "";
    let imageUrl: string | null = null;
    let videoUrl: string | null = null;
    let audioUrl: string | null = null;
    let audioDurationMs: number | null = null;

    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      text = String(form.get("body") || "").trim();
      const image = form.get("image") as File | null;
      const video = form.get("video") as File | null;
      const audio = form.get("audio") as File | null;
      const durRaw = form.get("audioDurationMs");
      if (durRaw != null) {
        const n = Number(durRaw);
        if (Number.isFinite(n) && n > 0) {
          audioDurationMs = Math.min(Math.round(n), 120_000);
        }
      }
      if (image && image.size > 0) {
        if (image.size > 8 * 1024 * 1024) {
          return NextResponse.json({ error: "Image trop lourde (max 8 Mo)." }, { status: 400 });
        }
        const ext = path.extname(image.name) || ".jpg";
        const name = `${randomUUID()}${ext === ".jpeg" ? ".jpg" : ext}`;
        const dir = await ensureUploadDir("messages");
        await saveUploadFile(image, path.join(dir, name));
        imageUrl = `/uploads/messages/${name}`;
      }
      if (video && video.size > 0) {
        if (video.size > MAX_UPLOAD_BYTES) {
          return NextResponse.json({ error: "Vidéo trop lourde." }, { status: 400 });
        }
        const ext = path.extname(video.name) || ".mp4";
        const name = `${randomUUID()}${ext}`;
        const dir = await ensureUploadDir("messages");
        await saveUploadFile(video, path.join(dir, name));
        videoUrl = `/uploads/messages/${name}`;
      }
      if (audio && audio.size > 0) {
        if (!isAllowedAudioFile(audio) && !audio.type.startsWith("audio/")) {
          return NextResponse.json({ error: "Audio non supporté." }, { status: 400 });
        }
        if (audio.size > MAX_AUDIO_BYTES) {
          return NextResponse.json({ error: "Audio trop lourd." }, { status: 400 });
        }
        const aExt = audioExtFor(audio);
        const name = `${randomUUID()}${aExt}`;
        const dir = await ensureUploadDir("messages");
        await saveUploadFile(audio, path.join(dir, name));
        audioUrl = `/uploads/messages/${name}`;
      }
    } else {
      const body = await req.json();
      text = String(body.body || "").trim();
      if (body.imageUrl) imageUrl = String(body.imageUrl);
      if (body.videoUrl) videoUrl = String(body.videoUrl);
      if (body.audioUrl) audioUrl = String(body.audioUrl);
      if (body.audioDurationMs != null) {
        audioDurationMs = Math.min(Math.round(Number(body.audioDurationMs) || 0), 120_000);
      }
    }

    if (!text && !imageUrl && !videoUrl && !audioUrl) {
      return NextResponse.json({ error: "Message vide." }, { status: 400 });
    }
    if (text.length > 2000) {
      return NextResponse.json(
        { error: "Message limité à 2000 caractères." },
        { status: 400 }
      );
    }

    const conv = await findOrCreateConversation(session.id, other.id);
    const message = await prisma.message.create({
      data: {
        conversationId: conv.id,
        senderId: session.id,
        body: encryptMessageBody(text || ""),
        imageUrl,
        videoUrl,
        audioUrl,
        audioDurationMs,
      },
    });
    await prisma.conversation.update({
      where: { id: conv.id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      message: mapMessage(message, session.id),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
