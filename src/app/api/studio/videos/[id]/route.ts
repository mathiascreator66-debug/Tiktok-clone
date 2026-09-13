import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getVideoAnalytics, parseRange } from "@/lib/studio";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }
    const tabRaw = req.nextUrl.searchParams.get("tab") || "overview";
    const tab =
      tabRaw === "viewers" || tabRaw === "engagement" || tabRaw === "overview"
        ? tabRaw
        : "overview";
    const range = parseRange(req.nextUrl.searchParams.get("range"));
    const data = await getVideoAnalytics(params.id, session.id, tab, range);
    if (!data) {
      return NextResponse.json(
        { error: "Vidéo introuvable ou accès refusé." },
        { status: 404 }
      );
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
