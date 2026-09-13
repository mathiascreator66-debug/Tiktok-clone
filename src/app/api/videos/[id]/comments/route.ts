import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureUploadDir, uploadPublicUrl } from "@/lib/uploads";
import type { CommentItem } from "@/lib/types";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

type DbComment = {
  id: string;
  content: string;
  createdAt: Date;
  parentId: string | null;
  imageUrl: string | null;
  user: { id: string; username: string; avatarUrl: string | null; isVerified?: boolean; isPro?: boolean };
  _count: { likes: number };
  likes: { id: string }[];
};

function mapComment(c: DbComment, replies: CommentItem[] = []): CommentItem {
  return {
    id: c.id,
    content: c.content,
    createdAt: c.createdAt.toISOString(),
    parentId: c.parentId,
    imageUrl: c.imageUrl,
    likeCount: c._count.likes,
    likedByMe: c.likes.length > 0,
    user: c.user,
    replies,
  };
}

function nestComments(flat: DbComment[]): CommentItem[] {
  const byParent = new Map<string | null, DbComment[]>();
  for (const c of flat) {
    const key = c.parentId;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(c);
  }

  function build(parentId: string | null): CommentItem[] {
    const kids = byParent.get(parentId) || [];
    return kids.map((c) => mapComment(c, build(c.id)));
  }

  return build(null);
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    const sort = req.nextUrl.searchParams.get("sort") === "popular" ? "popular" : "recent";

    const comments = await prisma.comment.findMany({
      where: { videoId: params.id },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true, isVerified: true, isPro: true } },
        _count: { select: { likes: true } },
        likes: session
          ? { where: { userId: session.id }, select: { id: true } }
          : { take: 0 },
      },
    });

    const flat = comments as unknown as DbComment[];

    // Sort top-level by recent or popular; replies always by createdAt asc (conversation order)
    const nested = nestComments(flat);

    if (sort === "popular") {
      nested.sort((a, b) => {
        if (b.likeCount !== a.likeCount) return b.likeCount - a.likeCount;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    } else {
      nested.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    for (const c of nested) {
      c.replies.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    }

    return NextResponse.json({
      comments: nested,
      totalCount: flat.length,
      sort,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

async function parseBody(req: NextRequest): Promise<{
  content: string;
  parentId: string | null;
  imageFile: File | null;
}> {
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("multipart/form-data")) {
    const form = await req.formData();
    const content = String(form.get("content") || "").trim();
    const parentRaw = form.get("parentId");
    const parentId =
      parentRaw && String(parentRaw).trim() ? String(parentRaw).trim() : null;
    const imageFile = (form.get("image") as File | null) || null;
    return { content, parentId, imageFile };
  }
  const body = await req.json();
  return {
    content: String(body.content || "").trim(),
    parentId: body.parentId ? String(body.parentId) : null,
    imageFile: null,
  };
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }

    const { content, parentId, imageFile } = await parseBody(req);

    if (!content && !imageFile) {
      return NextResponse.json(
        { error: "Commentaire vide." },
        { status: 400 }
      );
    }
    if (content.length > 500) {
      return NextResponse.json(
        { error: "Commentaire trop long (max 500)." },
        { status: 400 }
      );
    }

    const video = await prisma.video.findUnique({ where: { id: params.id } });
    if (!video) {
      return NextResponse.json({ error: "Vidéo introuvable." }, { status: 404 });
    }

    let resolvedParentId: string | null = null;
    if (parentId) {
      const parent = await prisma.comment.findFirst({
        where: { id: parentId, videoId: params.id },
      });
      if (!parent) {
        return NextResponse.json(
          { error: "Commentaire parent introuvable." },
          { status: 400 }
        );
      }
      // Flatten deep nests: reply to a reply attaches under the top-level parent
      resolvedParentId = parent.parentId ?? parent.id;
    }

    let imageUrl: string | null = null;
    if (imageFile && imageFile.size > 0) {
      if (imageFile.size > MAX_IMAGE_BYTES) {
        return NextResponse.json(
          { error: "Image trop lourde (max 5 Mo)." },
          { status: 400 }
        );
      }
      const mime = imageFile.type || "";
      const extFromName = path.extname(imageFile.name).toLowerCase();
      const okExt = [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(extFromName);
      if (!ALLOWED_IMAGE.has(mime) && !okExt) {
        return NextResponse.json(
          { error: "Formats acceptés : JPEG, PNG, WebP, GIF." },
          { status: 400 }
        );
      }
      const ext =
        extFromName ||
        (mime === "image/png"
          ? ".png"
          : mime === "image/webp"
            ? ".webp"
            : mime === "image/gif"
              ? ".gif"
              : ".jpg");
      const filename = `${randomUUID()}${ext}`;
      const dir = await ensureUploadDir("comments");
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      await writeFile(path.join(dir, filename), buffer);
      imageUrl = uploadPublicUrl("comments", filename);
    }

    const comment = await prisma.comment.create({
      data: {
        content: content,
        imageUrl,
        userId: session.id,
        videoId: params.id,
        parentId: resolvedParentId,
      },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true, isVerified: true, isPro: true } },
        _count: { select: { likes: true } },
      },
    });

    const item: CommentItem = {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      parentId: comment.parentId,
      imageUrl: comment.imageUrl,
      likeCount: 0,
      likedByMe: false,
      user: comment.user,
      replies: [],
    };

    return NextResponse.json({ comment: item });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
