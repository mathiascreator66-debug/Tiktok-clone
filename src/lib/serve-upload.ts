import { NextResponse } from "next/server";
import { createReadStream, existsSync, statSync } from "fs";
import { Readable } from "stream";
import { contentTypeFor, resolveUploadPath } from "@/lib/uploads";

export async function serveUpload(segments: string[]) {
  const filePath = resolveUploadPath(segments);
  if (!filePath || !existsSync(filePath)) {
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  }

  let stat;
  try {
    stat = statSync(filePath);
  } catch {
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  }
  if (!stat.isFile()) {
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  }

  const filename = segments[segments.length - 1] || "file";
  const type = contentTypeFor(filename);
  const nodeStream = createReadStream(filePath);
  const webStream = Readable.toWeb(nodeStream) as ReadableStream;

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      "Content-Type": type,
      "Content-Length": String(stat.size),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function headUpload(segments: string[]) {
  const filePath = resolveUploadPath(segments);
  if (!filePath || !existsSync(filePath)) {
    return new NextResponse(null, { status: 404 });
  }
  try {
    const stat = statSync(filePath);
    if (!stat.isFile()) return new NextResponse(null, { status: 404 });
    const filename = segments[segments.length - 1] || "file";
    return new NextResponse(null, {
      status: 200,
      headers: {
        "Content-Type": contentTypeFor(filename),
        "Content-Length": String(stat.size),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
