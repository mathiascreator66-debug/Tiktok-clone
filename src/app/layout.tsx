import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { getSession } from "@/lib/auth";
import { unreadMessageCount } from "@/lib/messages";

export const metadata: Metadata = {
  title: "ClipTok — Fil vertical",
  description:
    "Clone TikTok local : vidéos, follows, messages privés, likes et commentaires",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  let unread = 0;
  if (session) {
    try {
      unread = await unreadMessageCount(session.id);
    } catch {
      unread = 0;
    }
  }

  return (
    <html lang="fr">
      <body className="bg-black text-white antialiased">
        <Navbar
          user={session ? { username: session.username } : null}
          initialUnread={unread}
        />
        <main>{children}</main>
      </body>
    </html>
  );
}
