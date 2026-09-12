"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Users, MessageCircle, User, LogOut, LogIn } from "lucide-react";
import { useEffect, useState } from "react";

type Props = {
  user: { username: string } | null;
  initialUnread?: number;
};

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  const label = count > 99 ? "99+" : String(count);
  return (
    <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-[#fe2c55] text-[9px] font-bold flex items-center justify-center leading-none">
      {label}
    </span>
  );
}

export default function Navbar({ user, initialUnread = 0 }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [unread, setUnread] = useState(initialUnread);

  useEffect(() => {
    setUnread(initialUnread);
  }, [initialUnread]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/messages/unread");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setUnread(data.count ?? 0);
      } catch {
        /* ignore */
      }
    }
    poll();
    const id = setInterval(poll, 15000);
    const onFocus = () => poll();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [user, pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const hideOnAuth =
    pathname === "/connexion" || pathname === "/inscription";

  if (hideOnAuth) return null;

  const hideBottom =
    pathname.startsWith("/messages/") && pathname !== "/messages";

  const isHome = pathname === "/";
  const isAmis = pathname.startsWith("/amis");
  const isUpload = pathname.startsWith("/telecharger");
  const isMessages = pathname.startsWith("/messages");
  const isProfil =
    pathname.startsWith("/profil") || pathname.startsWith("/parametres");

  return (
    <>
      {/* Top bar desktop */}
      <header className="hidden md:flex fixed top-0 inset-x-0 z-50 h-14 items-center justify-between px-6 bg-black/80 backdrop-blur border-b border-white/10">
        <Link href="/" className="text-xl font-extrabold tracking-tight">
          <span className="text-[#fe2c55]">Clip</span>
          <span className="text-white">Tok</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link
            href="/"
            className={`hover:text-[#fe2c55] ${isHome ? "text-[#fe2c55]" : "text-white/80"}`}
          >
            Pour toi
          </Link>
          {user ? (
            <>
              <Link
                href="/amis"
                className={`hover:text-[#fe2c55] ${isAmis ? "text-[#fe2c55]" : "text-white/80"}`}
              >
                Amis
              </Link>
              <Link
                href="/telecharger"
                className={`hover:text-[#fe2c55] ${isUpload ? "text-[#fe2c55]" : "text-white/80"}`}
              >
                Publier
              </Link>
              <Link
                href="/messages"
                className={`relative hover:text-[#fe2c55] ${isMessages ? "text-[#fe2c55]" : "text-white/80"}`}
              >
                Messages
                {unread > 0 && (
                  <span className="ml-1 inline-flex min-w-[18px] h-[18px] px-1 rounded-full bg-[#fe2c55] text-[10px] font-bold items-center justify-center">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </Link>
              <Link
                href={`/profil/${user.username}`}
                className="hover:text-[#fe2c55] text-white/80"
              >
                @{user.username}
              </Link>
              <button
                onClick={logout}
                className="flex items-center gap-1 text-white/60 hover:text-white"
              >
                <LogOut size={16} /> Déconnexion
              </button>
            </>
          ) : (
            <Link
              href="/connexion"
              className="bg-[#fe2c55] px-4 py-1.5 rounded-full font-semibold"
            >
              Connexion
            </Link>
          )}
        </nav>
      </header>

      {/* Bottom nav mobile — Accueil | Amis | + | Messages | Profil */}
      {!hideBottom && (
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 h-14 flex items-center justify-around bg-black/95 border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
          <Link href="/" className="flex flex-col items-center gap-0.5 text-[10px] w-14">
            <Home size={22} className={isHome ? "text-white" : "text-white/50"} strokeWidth={isHome ? 2.5 : 2} />
            <span className={isHome ? "text-white font-semibold" : "text-white/50"}>Accueil</span>
          </Link>

          <Link
            href={user ? "/amis" : "/connexion"}
            className="relative flex flex-col items-center gap-0.5 text-[10px] w-14"
          >
            <Users size={22} className={isAmis ? "text-white" : "text-white/50"} strokeWidth={isAmis ? 2.5 : 2} />
            <span className={isAmis ? "text-white font-semibold" : "text-white/50"}>Amis</span>
          </Link>

          <Link
            href={user ? "/telecharger" : "/connexion"}
            className="flex flex-col items-center justify-center -mt-1"
            aria-label="Créer"
          >
            <span
              className={`relative flex items-center justify-center w-11 h-8 rounded-lg bg-white ${
                isUpload ? "opacity-100" : ""
              }`}
              style={{
                boxShadow: "-3px 0 0 #25f4ee, 3px 0 0 #fe2c55",
              }}
            >
              <span className="text-black text-2xl font-light leading-none mb-0.5">+</span>
            </span>
          </Link>

          <Link
            href={user ? "/messages" : "/connexion"}
            className="relative flex flex-col items-center gap-0.5 text-[10px] w-14"
          >
            <span className="relative">
              <MessageCircle
                size={22}
                className={isMessages ? "text-white" : "text-white/50"}
                strokeWidth={isMessages ? 2.5 : 2}
              />
              <Badge count={unread} />
            </span>
            <span className={isMessages ? "text-white font-semibold" : "text-white/50"}>
              Messages
            </span>
          </Link>

          {user ? (
            <Link
              href={`/profil/${user.username}`}
              className="flex flex-col items-center gap-0.5 text-[10px] w-14"
            >
              <User size={22} className={isProfil ? "text-white" : "text-white/50"} strokeWidth={isProfil ? 2.5 : 2} />
              <span className={isProfil ? "text-white font-semibold" : "text-white/50"}>Profil</span>
            </Link>
          ) : (
            <Link
              href="/connexion"
              className="flex flex-col items-center gap-0.5 text-[10px] w-14"
            >
              <LogIn size={22} className="text-white/50" />
              <span className="text-white/50">Connexion</span>
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
