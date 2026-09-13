"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Heart, Search, Users } from "lucide-react";
import Avatar from "./Avatar";
import VerifiedBadge from "./VerifiedBadge";
import { formatCount } from "@/lib/format";

type UserHit = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  followerCount: number;
  videoCount: number;
  isVerified?: boolean;
};

type VideoHit = {
  id: string;
  caption: string;
  videoUrl: string;
  coverUrl?: string | null;
  likeCount: number;
  commentCount: number;
  user: { username: string; displayName: string | null; avatarUrl: string | null };
};

export default function SearchPage() {
  const sp = useSearchParams();
  const [q, setQ] = useState(() => sp.get("q") || "");
  const [users, setUsers] = useState<UserHit[]>([]);
  const [videos, setVideos] = useState<VideoHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setUsers([]);
      setVideos([]);
      setSearched(false);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
        const data = await res.json();
        setUsers(data.users || []);
        setVideos(data.videos || []);
        setSearched(true);
      } catch {
        setUsers([]);
        setVideos([]);
      } finally {
        setLoading(false);
      }
    }, 280);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="min-h-[100dvh] pt-2 md:pt-16 pb-24 max-w-lg mx-auto px-3">
      <header className="flex items-center gap-2 h-12 mb-3">
        <Link
          href="/"
          className="p-2 -ml-1 rounded-full hover:bg-white/10"
          aria-label="Retour"
        >
          <ArrowLeft size={22} />
        </Link>
        <div className="flex-1 flex items-center gap-2 bg-white/10 rounded-full px-3 h-10">
          <Search size={16} className="text-white/40 shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Comptes, vidéos, #hashtags"
            autoFocus
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-white/35"
          />
        </div>
      </header>

      {!q.trim() && (
        <div className="text-center py-16 px-4">
          <Search size={36} className="mx-auto text-white/20 mb-3" />
          <p className="font-semibold">Recherche</p>
          <p className="text-white/45 text-sm mt-1">
            Trouvez des créateurs et des vidéos par pseudo ou légende.
          </p>
        </div>
      )}

      {loading && (
        <p className="text-white/40 text-sm text-center py-8">Recherche…</p>
      )}

      {searched && !loading && users.length === 0 && videos.length === 0 && (
        <p className="text-white/45 text-sm text-center py-16">
          Aucun résultat pour « {q.trim()} »
        </p>
      )}

      {users.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs uppercase tracking-wide text-white/40 font-medium px-1 mb-2 flex items-center gap-1.5">
            <Users size={12} /> Comptes
          </h2>
          <ul className="space-y-0.5">
            {users.map((u) => (
              <li key={u.id}>
                <Link
                  href={`/profil/${u.username}`}
                  className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-white/5"
                >
                  <Avatar
                    username={u.username}
                    avatarUrl={u.avatarUrl}
                    size={44}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate inline-flex items-center gap-1 max-w-full">
                      <span className="truncate">{u.displayName || u.username}</span>
                      {(u.isVerified || u.isPro) && <VerifiedBadge size={15} />}
                    </p>
                    <p className="text-xs text-white/45 truncate">
                      @{u.username} · {formatCount(u.followerCount)} followers
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {videos.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-wide text-white/40 font-medium px-1 mb-2">
            Vidéos
          </h2>
          <div className="grid grid-cols-3 gap-1">
            {videos.map((v) => (
              <Link
                key={v.id}
                href={`/?v=${v.id}`}
                className="relative aspect-[9/16] bg-white/5 rounded overflow-hidden"
              >
                {v.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={v.coverUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={v.videoUrl}
                    className="w-full h-full object-cover"
                    muted
                    preload="metadata"
                  />
                )}
                <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/70 to-transparent">
                  <p className="text-[10px] line-clamp-2">{v.caption}</p>
                  <p className="text-[10px] text-white/70 flex items-center gap-1 mt-0.5">
                    <Heart size={9} /> {formatCount(v.likeCount)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
