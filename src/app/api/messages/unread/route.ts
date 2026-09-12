import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { unreadMessageCount } from "@/lib/messages";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ count: 0 });
    }
    const count = await unreadMessageCount(session.id);
    return NextResponse.json({ count });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
