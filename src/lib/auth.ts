import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

const COOKIE_NAME = "afrivoix_session";
const SESSION_DAYS = 7;

function sessionCookieSecure() {
  if (process.env.NODE_ENV === "production") return true;
  const url = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "";
  return url.startsWith("https://");
}

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET manquant");
  return new TextEncoder().encode(secret);
}

export type SessionUser = {
  id: string;
  email: string | null;
  username: string;
  avatarUrl: string | null;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({
    id: user.id,
    email: user.email,
    username: user.username,
    avatarUrl: user.avatarUrl,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecret());

  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: sessionCookieSecure(),
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession() {
  cookies().set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: sessionCookieSecure(),
    path: "/",
    maxAge: 0,
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      id: payload.id as string,
      email: (payload.email as string | null | undefined) ?? null,
      username: payload.username as string,
      avatarUrl: (payload.avatarUrl as string | null) ?? null,
    };
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  return prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      bio: true,
      createdAt: true,
      isAdmin: true,
      isModerator: true,
      isVerified: true,
      accountStatus: true,
      country: true,
      language: true,
      birthdate: true,
      phoneE164: true,
      phoneCountry: true,
    },
  });
}

/** Load full auth flags; returns null if missing or not ACTIVE */
export async function getActiveUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      avatarUrl: true,
      accountStatus: true,
      isAdmin: true,
      isModerator: true,
      isVerified: true,
    },
  });
  if (!user) return null;
  if (user.accountStatus !== "ACTIVE") return null;
  return user;
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      email: true,
      username: true,
      isAdmin: true,
      isModerator: true,
      accountStatus: true,
    },
  });
  if (!user || user.accountStatus !== "ACTIVE" || !user.isAdmin) {
    throw new Error("FORBIDDEN");
  }
  return user;
}

export async function requireModerator() {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      email: true,
      username: true,
      isAdmin: true,
      isModerator: true,
      accountStatus: true,
    },
  });
  if (
    !user ||
    user.accountStatus !== "ACTIVE" ||
    (!user.isAdmin && !user.isModerator)
  ) {
    throw new Error("FORBIDDEN");
  }
  return user;
}

export function isGoogleAuthConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim() &&
      (process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim())
  );
}

export function getAppUrl() {
  return (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

/** Exact URI to whitelist in Google Cloud Console > Credentials > OAuth client. */
export function getGoogleRedirectUri() {
  return `${getAppUrl()}/api/auth/google/callback`;
}

export function googleAuthMissingReason(): string | null {
  if (!process.env.GOOGLE_CLIENT_ID?.trim()) {
    return "GOOGLE_CLIENT_ID manquant dans .env";
  }
  if (!process.env.GOOGLE_CLIENT_SECRET?.trim()) {
    return "GOOGLE_CLIENT_SECRET manquant dans .env";
  }
  if (!process.env.APP_URL?.trim() && !process.env.NEXT_PUBLIC_APP_URL?.trim()) {
    return "APP_URL / NEXT_PUBLIC_APP_URL manquant dans .env";
  }
  return null;
}

export function ageFromBirthdate(birthdate: Date, now = new Date()): number {
  let age = now.getFullYear() - birthdate.getFullYear();
  const m = now.getMonth() - birthdate.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birthdate.getDate())) age -= 1;
  return age;
}
