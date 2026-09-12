"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, PlusSquare, User, LogOut, LogIn } from "lucide-react";

type Props = {
  user: { username: string } | null;
};

export default function Navbar({ user }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const hideOnAuth =
    pathname === "/connexion" || pathname === "/inscription";

  if (hideOnAuth) return null;

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
            className={`hover:text-[#fe2c55] ${pathname === "/" ? "text-[#fe2c55]" : "text-white/80"}`}
          >
            Pour toi
          </Link>
          {user ? (
            <>
              <Link
                href="/telecharger"
                className={`hover:text-[#fe2c55] ${pathname === "/telecharger" ? "text-[#fe2c55]" : "text-white/80"}`}
              >
                Publier
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

      {/* Bottom nav mobile */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 h-14 flex items-center justify-around bg-black/95 border-t border-white/10">
        <Link href="/" className="flex flex-col items-center gap-0.5 text-[10px]">
          <Home size={22} className={pathname === "/" ? "text-white" : "text-white/50"} />
          <span className={pathname === "/" ? "text-white" : "text-white/50"}>Accueil</span>
        </Link>
        {user ? (
          <Link
            href="/telecharger"
            className="flex flex-col items-center gap-0.5 text-[10px]"
          >
            <PlusSquare
              size={22}
              className={pathname === "/telecharger" ? "text-white" : "text-white/50"}
            />
            <span className={pathname === "/telecharger" ? "text-white" : "text-white/50"}>
              Publier
            </span>
          </Link>
        ) : (
          <Link
            href="/connexion"
            className="flex flex-col items-center gap-0.5 text-[10px]"
          >
            <LogIn size={22} className="text-white/50" />
            <span className="text-white/50">Connexion</span>
          </Link>
        )}
        {user ? (
          <Link
            href={`/profil/${user.username}`}
            className="flex flex-col items-center gap-0.5 text-[10px]"
          >
            <User
              size={22}
              className={pathname.startsWith("/profil") ? "text-white" : "text-white/50"}
            />
            <span className={pathname.startsWith("/profil") ? "text-white" : "text-white/50"}>
              Profil
            </span>
          </Link>
        ) : (
          <Link
            href="/inscription"
            className="flex flex-col items-center gap-0.5 text-[10px]"
          >
            <User size={22} className="text-white/50" />
            <span className="text-white/50">S&apos;inscrire</span>
          </Link>
        )}
      </nav>
    </>
  );
}
