"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import Avatar from "./Avatar";
import StoryViewer from "./StoryViewer";
import type { StoryGroup } from "@/lib/types";

type Props = {
  isLoggedIn: boolean;
  currentUsername?: string | null;
};

export default function StoryRail({ isLoggedIn, currentUsername }: Props) {
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/stories", { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setGroups(data.groups || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function onViewed(storyId: string, userId: string) {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.user.id !== userId) return g;
        const stories = g.stories.map((s) =>
          s.id === storyId ? { ...s, viewedByMe: true } : s
        );
        return {
          ...g,
          stories,
          hasUnviewed: stories.some((s) => !s.viewedByMe),
        };
      })
    );
  }

  const hasOwn = groups.some(
    (g) => currentUsername && g.user.username === currentUsername
  );

  if (loading && groups.length === 0) {
    return (
      <div className="pointer-events-none absolute top-10 md:top-[4.5rem] inset-x-0 z-30 px-3">
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-16 h-16 rounded-full bg-white/10 animate-pulse shrink-0"
            />
          ))}
        </div>
      </div>
    );
  }

  if (groups.length === 0 && !isLoggedIn) return null;

  return (
    <>
      <div className="pointer-events-none absolute top-10 md:top-[4.5rem] inset-x-0 z-30">
        <div className="pointer-events-auto flex gap-3 overflow-x-auto scrollbar-hide px-3 py-1">
          {isLoggedIn && !hasOwn && (
            <Link
              href="/telecharger?tab=story"
              className="flex flex-col items-center gap-1 shrink-0 w-[68px]"
            >
              <div className="relative w-16 h-16 rounded-full bg-white/10 border-2 border-dashed border-white/40 flex items-center justify-center">
                <Plus size={22} className="text-white/80" />
              </div>
              <span className="text-[10px] text-white/70 truncate w-full text-center">
                Ajouter
              </span>
            </Link>
          )}

          {groups.map((g, idx) => {
            const isOwn =
              !!currentUsername && g.user.username === currentUsername;
            return (
              <button
                key={g.user.id}
                type="button"
                onClick={() => setViewerIndex(idx)}
                className="flex flex-col items-center gap-1 shrink-0 w-[68px]"
              >
                <div
                  className={`p-[2px] rounded-full ${
                    g.hasUnviewed
                      ? "bg-gradient-to-tr from-[#fe2c55] via-[#ff7a45] to-[#25f4ee]"
                      : "bg-white/30"
                  }`}
                >
                  <div className="rounded-full bg-black p-[2px]">
                    <Avatar
                      username={g.user.username}
                      avatarUrl={g.user.avatarUrl}
                      size={56}
                    />
                  </div>
                </div>
                <span className="text-[10px] text-white/80 truncate w-full text-center drop-shadow">
                  {isOwn ? "Votre story" : g.user.username}
                </span>
              </button>
            );
          })}

          {isLoggedIn && hasOwn && (
            <Link
              href="/telecharger?tab=story"
              className="flex flex-col items-center gap-1 shrink-0 w-[68px]"
            >
              <div className="relative w-16 h-16 rounded-full bg-white/10 border-2 border-dashed border-white/40 flex items-center justify-center">
                <Plus size={22} className="text-white/80" />
              </div>
              <span className="text-[10px] text-white/70 truncate w-full text-center">
                Ajouter
              </span>
            </Link>
          )}
        </div>
      </div>

      {viewerIndex !== null && groups[viewerIndex] && (
        <StoryViewer
          groups={groups}
          startGroupIndex={viewerIndex}
          isLoggedIn={isLoggedIn}
          onClose={() => setViewerIndex(null)}
          onViewed={onViewed}
        />
      )}
    </>
  );
}
