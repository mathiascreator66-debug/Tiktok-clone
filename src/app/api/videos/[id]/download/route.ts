import { NextRequest, NextResponse } from "next/server";
import { createReadStream, existsSync, statSync } from "fs";
import { Readable } from "stream";
import path from "path";
import { prisma } from "@/lib/prisma";
import { contentTypeFor, resolveUploadPath } from "@/lib/uploads";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const video = await prisma.video.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        videoUrl: true,
        allowDownload: true,
        caption: true,
      },
    });
    if (!video) {
      return NextResponse.json({ error: "Vidéo introuvable." }, { status: 404 });
    }
    if (!video.allowDownload) {
      return NextResponse.json(
        { error: "Téléchargement désactivé par l’auteur." },
        { status: 403 }
      );
    }
    if (!video.videoUrl.startsWith("/uploads/")) {
      return NextResponse.json(
        { error: "Fichier non téléchargeable." },
        { status: 400 }
      );
    }
    const segments = video.videoUrl
      .replace(/^\/uploads\//, "")
      .split("/")
      .filter(Boolean);
    const filePath = resolveUploadPath(segments);
    if (!filePath || !existsSync(filePath)) {
      return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
    }
    const stat = statSync(filePath);
    if (!stat.isFile()) {
      return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
    }
    const filename = segments[segments.length - 1] || `afrivoix-${video.id}.mp4`;
    const safeName = `afrivoix-${video.id}${path.extname(filename) || ".mp4"}`;
    const nodeStream = createReadStream(filePath);
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;
    return new NextResponse(webStream, {
      status: 200,
      headers: {
        "Content-Type": contentTypeFor(filename),
        "Content-Length": String(stat.size),
        "Content-Disposition": `attachment; filename="${safeName}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
