import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { createSession, getSession } from "@/lib/auth";
import { ensureUploadDir } from "@/lib/uploads";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get("avatar") as File | null;
    if (!file || file.size === 0) {
      return NextResponse.json({ error: "Image requise." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Image trop lourde (max 5 Mo)." },
        { status: 400 }
      );
    }
    const mime = file.type || "";
    const extFromName = path.extname(file.name).toLowerCase();
    const okExt = [".jpg", ".jpeg", ".png", ".webp"].includes(extFromName);
    if (!ALLOWED.has(mime) && !okExt) {
      return NextResponse.json(
        { error: "Formats acceptés : JPEG, PNG, WebP." },
        { status: 400 }
      );
    }

    const ext =
      extFromName ||
      (mime === "image/png" ? ".png" : mime === "image/webp" ? ".webp" : ".jpg");
    const filename = `${randomUUID()}${ext}`;
    const dir = await ensureUploadDir("avatars");
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, filename), buffer);

    const avatarUrl = `/uploads/avatars/${filename}`;
    const user = await prisma.user.update({
      where: { id: session.id },
      data: { avatarUrl },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
      },
    });

    await createSession({
      id: user.id,
      email: user.email,
      username: user.username,
      avatarUrl: user.avatarUrl,
    });

    return NextResponse.json({ user });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
