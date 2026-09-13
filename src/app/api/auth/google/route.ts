export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import {
  getGoogleRedirectUri,
  googleAuthMissingReason,
  isGoogleAuthConfigured,
} from "@/lib/auth";

export async function GET() {
  const missing = googleAuthMissingReason();
  if (missing || !isGoogleAuthConfigured()) {
    return NextResponse.json(
      {
        error:
          missing ||
          "Connexion Google non configurée. Ajoutez GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET et APP_URL.",
        redirectUri: getGoogleRedirectUri(),
        hint:
          "Dans Google Cloud Console > APIs & Services > Identifiants > Client OAuth 2.0, ajoutez exactement cette URI de redirection autorisée.",
      },
      { status: 503 }
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const redirectUri = getGoogleRedirectUri();
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
