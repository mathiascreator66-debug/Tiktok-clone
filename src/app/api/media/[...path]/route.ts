import { NextRequest } from "next/server";
import { headUpload, serveUpload } from "@/lib/serve-upload";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Internal media endpoint. Middleware rewrites /uploads/* → /api/media/*
 * so new files work without a Next.js restart (public/ static cache bypass).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return serveUpload(params.path);
}

export async function HEAD(
  _req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return headUpload(params.path);
}
