export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAppUrl, isGoogleAuthConfigured } from "@/lib/auth";

export async function GET() {
  if (!isGoogleAuthConfigured()) {
    return NextResponse.json(
      {
        error:
          "Connexion Google non configurée. Ajoutez GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET et NEXT_PUBLIC_APP_URL.",
      },
      { status: 503 }
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const redirectUri = `${getAppUrl()}/api/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
