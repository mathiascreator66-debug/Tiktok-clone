import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { getSession } from "@/lib/auth";
import { unreadMessageCount } from "@/lib/messages";
import { I18nProvider } from "@/lib/i18n";
import ThemeProvider from "@/components/ThemeProvider";
import ThemeScript from "@/components/ThemeScript";
import { cookies } from "next/headers";
import type { ThemeMode } from "@/lib/theme";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: "AfriVoix — Nos voix | Notre Afrique",
  description:
    "Plateforme africaine de vidéos courtes : partage, communauté, messages — libre et pour les Africains.",
  applicationName: "AfriVoix",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/afrivoix-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/brand/afrivoix-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: ["/favicon.ico"],
  },
  openGraph: {
    title: "AfriVoix",
    description: "Plus qu'un réseau social — Nos voix | Notre Afrique | Un monde meilleur",
    images: ["/brand/afrivoix-logo.png"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  let unread = 0;
  let isStaff = false;
  let initialTheme: ThemeMode = "light";
  const cookieTheme = cookies().get("afrivoix_theme")?.value;
  if (cookieTheme === "dark" || cookieTheme === "light") {
    initialTheme = cookieTheme;
  }

  if (session) {
    try {
      unread = await unreadMessageCount(session.id);
    } catch {
      unread = 0;
    }
    try {
      const { prisma } = await import("@/lib/prisma");
      const u = await prisma.user.findUnique({
        where: { id: session.id },
        select: { isAdmin: true, isModerator: true, theme: true },
      });
      isStaff = Boolean(u?.isAdmin || u?.isModerator);
      if (u?.theme === "dark" || u?.theme === "light") {
        initialTheme = u.theme;
      }
    } catch {
      isStaff = false;
    }
  }

  return (
    <html lang="fr" data-theme={initialTheme} className={initialTheme === "dark" ? "dark" : undefined} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="bg-background text-foreground antialiased">
        <ThemeProvider initialTheme={initialTheme}>
          <I18nProvider initialLang="fr">
            <Navbar
              user={session ? { username: session.username } : null}
              initialUnread={unread}
              isStaff={isStaff}
            />
            <main>{children}</main>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
