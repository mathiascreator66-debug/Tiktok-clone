"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Heart, Search, UserPlus, Bell } from "lucide-react";
import Avatar from "./Avatar";
import { formatInboxTime } from "@/lib/format";

type Conv = {
  id: string;
  updatedAt: string;
  other: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  lastMessage: {
    id: string;
    body: string;
    senderId: string;
    createdAt: string;
    mine: boolean;
    readAt: string | null;
  } | null;
  unread: number;
  iFollowThem: boolean;
  isRequest: boolean;
};

type Tab = "principal" | "demandes" | "nonlu";

export default function MessagesInbox() {
  const [tab, setTab] = useState<Tab>("principal");
  const [conversations, setConversations] = useState<Conv[]>([]);
  const [tabs, setTabs] = useState({ principal: 0, demandes: 0, nonlu: 0 });
  const [activity, setActivity] = useState({ newFollowers: 0, likes: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages?tab=${tab}`);
      if (!res.ok) return;
      const data = await res.json();
      setConversations(data.conversations || []);
      setTabs(data.tabs || { principal: 0, demandes: 0, nonlu: 0 });
      setActivity(data.activity || { newFollowers: 0, likes: 0 });
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    setLoading(true);
    load();
    const id = setInterval(load, 8000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  return (
    <div className="min-h-[100dvh] pt-2 md:pt-16 pb-20 max-w-lg mx-auto">
      <header className="flex items-center justify-between px-4 h-12">
        <div className="w-8" />
        <h1 className="font-bold text-lg flex items-center gap-1.5">
          Messages
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
        </h1>
        <button type="button" className="p-2 text-white/60" aria-label="Rechercher">
          <Search size={20} />
        </button>
      </header>

      {/* Stories stub */}
      <div className="px-4 py-2 overflow-x-auto scrollbar-hide">
        <div className="flex gap-3">
          <div className="flex flex-col items-center gap-1 w-16 shrink-0 opacity-50">
            <div className="w-14 h-14 rounded-full bg-white/10 border-2 border-dashed border-white/30 flex items-center justify-center text-xl">
              +
            </div>
            <span className="text-[10px] text-white/50 truncate w-full text-center">
              bientôt
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto scrollbar-hide">
        <TabPill
          active={tab === "principal"}
          onClick={() => setTab("principal")}
          label="Principal"
          count={tabs.principal}
        />
        <TabPill
          active={tab === "demandes"}
          onClick={() => setTab("demandes")}
          label="Demandes"
          count={tabs.demandes}
        />
        <TabPill
          active={tab === "nonlu"}
          onClick={() => setTab("nonlu")}
          label="Non lu"
          count={tabs.nonlu}
        />
      </div>

      {/* Activity rows */}
      {tab === "principal" && (
        <div className="px-2 mt-1">
          <ActivityRow
            href="/amis"
            icon={<UserPlus size={18} className="text-white" />}
            iconBg="bg-sky-500"
            title="Nouveaux abonnés"
            subtitle={
              activity.newFollowers > 0
                ? `${activity.newFollowers} cette semaine`
                : "Personne pour l'instant"
            }
            badge={activity.newFollowers}
          />
          <ActivityRow
            href="/"
            icon={<Heart size={18} className="text-white" fill="white" />}
            iconBg="bg-[#fe2c55]"
            title="Activité"
            subtitle={
              activity.likes > 0
                ? `${activity.likes} j'aime récents`
                : "Pas d'activité récente"
            }
            badge={activity.likes}
          />
          <ActivityRow
            href="/parametres"
            icon={<Bell size={18} className="text-white" />}
            iconBg="bg-indigo-600"
            title="Notifications système"
            subtitle="Mises à jour du compte…"
            badge={0}
          />
        </div>
      )}

      {/* Conversations */}
      <div className="mt-2">
        {loading && conversations.length === 0 ? (
          <p className="text-center text-white/40 text-sm py-10">Chargement…</p>
        ) : conversations.length === 0 ? (
          <p className="text-center text-white/40 text-sm py-10 px-6">
            {tab === "demandes"
              ? "Aucune demande de message."
              : tab === "nonlu"
                ? "Tout est lu."
                : "Aucune conversation. Envoyez un message depuis un profil."}
          </p>
        ) : (
          conversations.map((c) => {
            const name = c.other.displayName || c.other.username;
            const preview = c.lastMessage
              ? c.lastMessage.mine
                ? `Vous : ${c.lastMessage.body}`
                : c.lastMessage.body
              : "";
            return (
              <Link
                key={c.id}
                href={`/messages/${c.other.username}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-white/5"
              >
                <Avatar
                  username={c.other.username}
                  avatarUrl={c.other.avatarUrl}
                  size={52}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`truncate ${c.unread ? "font-bold" : "font-semibold"}`}>
                      {name}
                    </p>
                    {c.lastMessage && (
                      <span className="text-xs text-white/40 shrink-0">
                        {formatInboxTime(c.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-sm truncate ${
                        c.unread ? "text-white font-medium" : "text-white/45"
                      }`}
                    >
                      {preview}
                    </p>
                    {c.unread > 0 && (
                      <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-[#fe2c55] text-[10px] font-bold flex items-center justify-center">
                        {c.unread > 99 ? "99+" : c.unread}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

function TabPill({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-semibold transition ${
        active
          ? "bg-[#25f4ee]/25 text-[#25f4ee]"
          : "bg-white/10 text-white/70 hover:bg-white/15"
      }`}
    >
      {label}
      {count > 0 ? ` ${count > 99 ? "99+" : count}` : ""}
    </button>
  );
}

function ActivityRow({
  href,
  icon,
  iconBg,
  title,
  subtitle,
  badge,
}: {
  href: string;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  badge: number;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-white/5"
    >
      <div
        className={`w-12 h-12 rounded-full ${iconBg} flex items-center justify-center shrink-0`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[15px]">{title}</p>
        <p className="text-sm text-white/45 truncate">{subtitle}</p>
      </div>
      {badge > 0 && (
        <span className="min-w-[28px] h-5 px-1.5 rounded-full bg-[#fe2c55] text-[11px] font-bold flex items-center justify-center">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}
