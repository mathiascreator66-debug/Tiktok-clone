import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "ClipTok — Fil vertical",
  description: "Clone TikTok local : vidéos courtes, likes et commentaires",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html lang="fr">
      <body className="bg-black text-white antialiased">
        <Navbar user={session ? { username: session.username } : null} />
        <main>{children}</main>
      </body>
    </html>
  );
}
