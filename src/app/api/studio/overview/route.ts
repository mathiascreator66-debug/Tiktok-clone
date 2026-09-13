import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getOverviewForUser, parseRange } from "@/lib/studio";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }
    const range = parseRange(req.nextUrl.searchParams.get("range"));
    const data = await getOverviewForUser(session.id, range);
    return NextResponse.json(data);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
