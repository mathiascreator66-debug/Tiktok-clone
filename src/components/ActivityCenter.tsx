"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bookmark, Heart, MessageCircle, UserPlus } from "lucide-react";
import Avatar from "./Avatar";
import { formatRelativeFr } from "@/lib/time";

type Kind = "like" | "comment" | "follow" | "save";
type Filter = "all" | "comment" | "like";

type Item = {
  id: string;
  kind: Kind;
  at: string;
  user: { username: string; displayName: string | null; avatarUrl: string | null };
  text: string;
};

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "comment", label: "Commentaires" },
  { id: "like", label: "J'aime" },
];

export default function ActivityCenter({ items }: { items: Item[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const visible = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((i) => i.kind === filter);
  }, [items, filter]);

  return (
    <div>
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap ${
              filter === f.id
                ? "bg-white text-black"
                : "bg-white/10 text-white/70 hover:bg-white/15"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="text-white/45 text-sm text-center py-16 px-4">
          {filter === "all"
            ? "Aucune activité récente sur vos vidéos (30 derniers jours)."
            : "Rien dans ce filtre pour le moment."}
        </p>
      ) : (
        <ul className="space-y-1">
          {visible.map((item) => (
            <li key={item.id}>
              <Link
                href={`/profil/${item.user.username}`}
                className="flex items-center gap-3 px-2 py-3 rounded-xl hover:bg-white/5"
              >
                <div className="relative shrink-0">
                  <Avatar
                    username={item.user.username}
                    avatarUrl={item.user.avatarUrl}
                    size={44}
                  />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center ${
                      item.kind === "like"
                        ? "bg-[#fe2c55]"
                        : item.kind === "comment"
                          ? "bg-sky-500"
                          : item.kind === "save"
                            ? "bg-yellow-500"
                            : "bg-emerald-500"
                    }`}
                  >
                    {item.kind === "like" ? (
                      <Heart size={11} fill="white" className="text-white" />
                    ) : item.kind === "comment" ? (
                      <MessageCircle size={11} className="text-white" />
                    ) : item.kind === "save" ? (
                      <Bookmark size={11} className="text-white" fill="white" />
                    ) : (
                      <UserPlus size={11} className="text-white" />
                    )}
                  </span>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm">
                    <span className="font-semibold">
                      {item.user.displayName || item.user.username}
                    </span>{" "}
                    <span className="text-white/70">{item.text}</span>
                  </p>
                  <p className="text-[11px] text-white/35 mt-0.5">
                    {formatRelativeFr(item.at)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
