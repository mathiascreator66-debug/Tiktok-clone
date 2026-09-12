import { NextRequest } from "next/server";
import { headUpload, serveUpload } from "@/lib/serve-upload";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
