import { NextResponse } from "next/server";
import { voixDuJourForDate } from "@/lib/voix-du-jour";

export async function GET() {
  return NextResponse.json(voixDuJourForDate());
}
