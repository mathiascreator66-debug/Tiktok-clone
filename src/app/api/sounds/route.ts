import { NextResponse } from "next/server";
import { CURATED_SOUNDS } from "@/lib/sounds";

export async function GET() {
  return NextResponse.json({ sounds: CURATED_SOUNDS });
}
