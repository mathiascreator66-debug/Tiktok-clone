"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ListMusic, Play } from "lucide-react";

type Video = {
  id: string;
  caption: string;
  videoUrl: string;
  coverUrl: string | null;
  likeCount: number;
  user: { username: string; displayName: string | null };
};

type Playlist = {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  user: { username: string; displayName: string | null; avatarUrl: string | null };
  videos: Video[];
};

export default function PlaylistPage({ params }: { params: { id: string } }) {
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/playlists/${params.id}`);
        if (!res.ok) {
          setError("Playlist introuvable.");
          return;
        }
        const data = await res.json();
        setPlaylist(data.playlist);
        if (data.playlist?.videos?.[0]) {
          setPlayingId(data.playlist.videos[0].id);
        }
      } catch {
        setError("Erreur réseau.");
      }
    })();
  }, [params.id]);

  const current = playlist?.videos.find((v) => v.id === playingId) || playlist?.videos[0];

  return (
    <div className="min-h-[100dvh] pt-2 md:pt-16 pb-28 max-w-lg mx-auto">
      <header className="flex items-center gap-2 px-3 h-12 mb-2">
        <Link
          href={playlist ? `/profil/${playlist.user.username}` : "/"}
          className="p-2 -ml-1 rounded-full hover:bg-white/10"
          aria-label="Retour"
        >
          <ArrowLeft size={22} />
        </Link>
        <h1 className="font-bold text-lg flex items-center gap-2 truncate">
          <ListMusic size={18} /> {playlist?.title || "Playlist"}
        </h1>
      </header>

      {error && (
        <p className="text-center text-[#fe2c55] text-sm py-10">{error}</p>
      )}
      {!playlist && !error && (
        <p className="text-center text-white/40 text-sm py-10">Chargement…</p>
      )}

      {playlist && (
        <>
          <div className="px-3 mb-3">
            <p className="text-sm text-white/50">
              Par{" "}
              <Link
                href={`/profil/${playlist.user.username}`}
                className="text-white/80 hover:underline"
              >
                @{playlist.user.username}
              </Link>{" "}
              · {playlist.videos.length} vidéo
              {playlist.videos.length === 1 ? "" : "s"}
            </p>
            {playlist.description && (
              <p className="text-sm text-white/60 mt-1">{playlist.description}</p>
            )}
          </div>

          {current && (
            <div className="px-3 mb-4">
              <div className="rounded-2xl overflow-hidden bg-black aspect-[9/16] max-h-[55vh] mx-auto relative">
                <video
                  key={current.id}
                  src={current.videoUrl}
                  className="w-full h-full object-contain bg-black"
                  controls
                  playsInline
                  autoPlay
                  onEnded={() => {
                    const idx = playlist.videos.findIndex((v) => v.id === current.id);
                    const next = playlist.videos[idx + 1];
                    if (next) setPlayingId(next.id);
                  }}
                />
              </div>
              <p className="text-sm mt-2 line-clamp-2">{current.caption}</p>
            </div>
          )}

          <ul className="px-3 space-y-1">
            {playlist.videos.map((v, i) => (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => setPlayingId(v.id)}
                  className={`w-full flex items-center gap-3 p-2 rounded-xl text-left ${
                    playingId === v.id ? "bg-white/15" : "hover:bg-white/5"
                  }`}
                >
                  <span className="w-6 text-xs text-white/40 text-center">
                    {i + 1}
                  </span>
                  <div className="w-12 h-16 rounded overflow-hidden bg-white/10 shrink-0 relative">
                    {v.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={v.coverUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <video src={v.videoUrl} className="w-full h-full object-cover" muted />
                    )}
                    {playingId === v.id && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <Play size={14} className="fill-white text-white" />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{v.caption}</p>
                    <p className="text-[11px] text-white/40 truncate">
                      @{v.user.username}
                    </p>
                  </div>
                </button>
              </li>
            ))}
            {playlist.videos.length === 0 && (
              <p className="text-center text-white/40 text-sm py-8">
                Aucune vidéo dans cette playlist.
              </p>
            )}
          </ul>
        </>
      )}
    </div>
  );
}
