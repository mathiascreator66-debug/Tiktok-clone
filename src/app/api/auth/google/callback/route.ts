export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createSession,
  getAppUrl,
  getGoogleRedirectUri,
  isGoogleAuthConfigured,
} from "@/lib/auth";

function redirectError(message: string) {
  const url = new URL("/connexion", getAppUrl());
  url.searchParams.set("erreur", message);
  return NextResponse.redirect(url.toString());
}

function slugifyUsername(base: string): string {
  const cleaned = base
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 20);
  return cleaned.length >= 3 ? cleaned : `user${Date.now().toString(36)}`;
}

async function uniqueUsername(preferred: string): Promise<string> {
  let candidate = slugifyUsername(preferred);
  let n = 0;
  while (await prisma.user.findUnique({ where: { username: candidate } })) {
    n += 1;
    candidate = `${slugifyUsername(preferred).slice(0, 16)}${n}`;
  }
  return candidate;
}

export async function GET(req: NextRequest) {
  if (!isGoogleAuthConfigured()) {
    return redirectError("google_non_configure");
  }

  const code = req.nextUrl.searchParams.get("code");
  const oauthError = req.nextUrl.searchParams.get("error");
  if (oauthError === "access_denied") {
    return redirectError("google_annule");
  }
  if (oauthError || !code) {
    return redirectError("google_annule");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri = getGoogleRedirectUri();

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("Google token error", errText, "redirect_uri=", redirectUri);
      if (
        /redirect_uri_mismatch/i.test(errText) ||
        /redirect_uri/i.test(errText)
      ) {
        return redirectError("google_redirect_mismatch");
      }
      if (/invalid_client/i.test(errText)) {
        return redirectError("google_non_configure");
      }
      return redirectError("google_echec");
    }

    const tokens = (await tokenRes.json()) as { access_token?: string };
    if (!tokens.access_token) {
      return redirectError("google_echec");
    }

    const profileRes = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    );
    if (!profileRes.ok) {
      console.error("Google profile error", await profileRes.text());
      return redirectError("google_echec");
    }

    const profile = (await profileRes.json()) as {
      id: string;
      email?: string;
      name?: string;
      picture?: string;
      verified_email?: boolean;
    };

    if (!profile.email) {
      return redirectError("google_email_requis");
    }

    const email = profile.email.toLowerCase();

    let user = await prisma.user.findFirst({
      where: {
        OR: [{ googleId: profile.id }, { email }],
      },
    });

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: profile.id,
          avatarUrl: user.avatarUrl || profile.picture || null,
          displayName: user.displayName || profile.name || null,
        },
      });
    } else {
      const base =
        profile.name?.split(/\s+/)[0] || email.split("@")[0] || "user";
      const username = await uniqueUsername(base);
      user = await prisma.user.create({
        data: {
          email,
          username,
          passwordHash: null,
          googleId: profile.id,
          avatarUrl: profile.picture || null,
          displayName: profile.name || null,
        },
      });
    }

    await createSession({
      id: user.id,
      email: user.email,
      username: user.username,
      avatarUrl: user.avatarUrl,
    });

    return NextResponse.redirect(`${getAppUrl()}/`);
  } catch (e) {
    console.error(e);
    return redirectError("google_echec");
  }
}
