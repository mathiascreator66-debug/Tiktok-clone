"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import BrandLogo from "./BrandLogo";

type UserRow = {
  id: string;
  email: string | null;
  username: string;
  displayName: string | null;
  accountStatus: string;
  isAdmin: boolean;
  isModerator: boolean;
  isVerified: boolean;
  createdAt: string;
  country: string | null;
};

type ReportRow = {
  id: string;
  createdAt: string;
  targetType: string;
  targetId: string;
  reason: string;
  status: string;
  reporter: string;
};

type ActionRow = {
  id: string;
  createdAt: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  actor: string;
  meta: string | null;
};

type TicketRow = {
  id: string;
  createdAt: string;
  email: string | null;
  subject: string;
  message: string;
};

export default function AdminPanel({
  me,
  counts,
  users: initialUsers,
  reports: initialReports,
  actions: initialActions,
  tickets,
}: {
  me: { id: string; username: string; isAdmin: boolean };
  counts: Record<string, number>;
  users: UserRow[];
  reports: ReportRow[];
  actions: ActionRow[];
  tickets: TicketRow[];
}) {
  const [tab, setTab] = useState<"users" | "reports" | "tickets" | "log">("users");
  const [users, setUsers] = useState(initialUsers);
  const [reports, setReports] = useState(initialReports);
  const [actions, setActions] = useState(initialActions);
  const [msg, setMsg] = useState<string | null>(null);

  async function userAction(
    userId: string,
    action: string,
    extra?: Record<string, unknown>
  ) {
    setMsg(null);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action, ...extra }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Erreur");
      return;
    }
    setMsg(data.message || "OK");
    if (data.user) {
      setUsers((list) =>
        list.map((u) => (u.id === data.user.id ? { ...u, ...data.user } : u))
      );
    }
    if (data.actionLog) {
      setActions((a) => [data.actionLog, ...a].slice(0, 40));
    }
  }

  async function reportAction(reportId: string, action: "resolve" | "dismiss") {
    setMsg(null);
    const res = await fetch("/api/admin/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId, action }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Erreur");
      return;
    }
    setReports((r) => r.filter((x) => x.id !== reportId));
    setMsg(action === "resolve" ? "Signalement résolu" : "Signalement rejeté");
    if (data.actionLog) setActions((a) => [data.actionLog, ...a].slice(0, 40));
  }

  const tabs = [
    { id: "users" as const, label: "Utilisateurs" },
    { id: "reports" as const, label: `Signalements (${reports.length})` },
    { id: "tickets" as const, label: `Aide (${tickets.length})` },
    { id: "log" as const, label: "Journal" },
  ];

  return (
    <div className="min-h-[100dvh] pt-2 md:pt-16 pb-28 max-w-4xl mx-auto px-3">
      <header className="flex items-center gap-2 h-12 mb-4">
        <Link href="/" className="p-2 -ml-1 rounded-full hover:bg-white/10">
          <ArrowLeft size={22} />
        </Link>
        <BrandLogo variant="icon" size={28} href={null} />
        <h1 className="font-bold text-lg flex items-center gap-2">
          <Shield size={18} className="text-[#d4af37]" /> Admin AfriVoix
        </h1>
        <span className="ml-auto text-xs text-white/40">@{me.username}</span>
      </header>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
        {[
          ["Users", counts.users],
          ["Vidéos", counts.videos],
          ["Reports", counts.openReports],
          ["Tickets", counts.openTickets],
          ["Suspendus", counts.suspended],
          ["Bannis", counts.banned],
        ].map(([label, n]) => (
          <div
            key={String(label)}
            className="rounded-xl bg-white/[0.06] border border-white/10 px-3 py-2 text-center"
          >
            <p className="text-lg font-bold text-[#d4af37]">{n}</p>
            <p className="text-[10px] text-white/50 uppercase">{label}</p>
          </div>
        ))}
      </div>

      {msg && (
        <p className="mb-3 text-sm text-[#d4af37] bg-[#d4af37]/10 rounded-lg px-3 py-2">
          {msg}
        </p>
      )}

      <div className="flex gap-1 mb-4 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
              tab === t.id ? "bg-[#d4af37] text-black font-semibold" : "bg-white/10"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "users" && (
        <div className="space-y-2">
          {users.map((u) => (
            <div
              key={u.id}
              className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">@{u.username}</span>
                {u.isVerified && (
                  <span className="text-[10px] bg-sky-500/30 text-sky-200 px-1.5 rounded">
                    vérifié
                  </span>
                )}
                {u.isAdmin && (
                  <span className="text-[10px] bg-amber-500/30 text-amber-200 px-1.5 rounded">
                    admin
                  </span>
                )}
                {u.isModerator && (
                  <span className="text-[10px] bg-emerald-500/30 text-emerald-200 px-1.5 rounded">
                    modo
                  </span>
                )}
                <span
                  className={`text-[10px] px-1.5 rounded ${
                    u.accountStatus === "ACTIVE"
                      ? "bg-white/10"
                      : u.accountStatus === "SUSPENDED"
                        ? "bg-orange-500/30"
                        : "bg-red-500/30"
                  }`}
                >
                  {u.accountStatus}
                </span>
                <span className="text-white/40 text-xs ml-auto">{u.email}</span>
              </div>
              {me.isAdmin && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {u.accountStatus === "ACTIVE" ? (
                    <>
                      <Btn onClick={() => userAction(u.id, "suspend")}>Suspendre</Btn>
                      <Btn danger onClick={() => userAction(u.id, "ban")}>
                        Bannir
                      </Btn>
                    </>
                  ) : (
                    <Btn onClick={() => userAction(u.id, "unban")}>Réactiver</Btn>
                  )}
                  <Btn onClick={() => userAction(u.id, "verify", { value: !u.isVerified })}>
                    {u.isVerified ? "Retirer badge" : "Badge vérifié"}
                  </Btn>
                  {!u.isModerator && !u.isAdmin && (
                    <Btn onClick={() => userAction(u.id, "make_moderator")}>
                      Nommer modo
                    </Btn>
                  )}
                </div>
              )}
              {!me.isAdmin && (
                <p className="text-xs text-white/40 mt-2">
                  Modérateur : gestion des signalements uniquement
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "reports" && (
        <div className="space-y-2">
          {reports.length === 0 && (
            <p className="text-white/40 text-sm">Aucun signalement ouvert.</p>
          )}
          {reports.map((r) => (
            <div
              key={r.id}
              className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm"
            >
              <p>
                <span className="text-[#d4af37] font-medium">{r.targetType}</span>{" "}
                <code className="text-xs text-white/50">{r.targetId.slice(0, 12)}…</code>
                {" · "}
                motif <strong>{r.reason}</strong> · par @{r.reporter}
              </p>
              <p className="text-xs text-white/40 mt-1">
                {new Date(r.createdAt).toLocaleString("fr-FR")}
              </p>
              <div className="flex gap-2 mt-2">
                <Btn onClick={() => reportAction(r.id, "resolve")}>Résoudre</Btn>
                <Btn onClick={() => reportAction(r.id, "dismiss")}>Rejeter</Btn>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "tickets" && (
        <div className="space-y-2">
          {tickets.map((t) => (
            <div
              key={t.id}
              className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm"
            >
              <p className="font-semibold">{t.subject}</p>
              <p className="text-xs text-white/40">{t.email}</p>
              <p className="mt-2 text-white/70 whitespace-pre-wrap">{t.message}</p>
            </div>
          ))}
          {tickets.length === 0 && (
            <p className="text-white/40 text-sm">Aucun ticket ouvert.</p>
          )}
        </div>
      )}

      {tab === "log" && (
        <div className="space-y-1.5">
          {actions.map((a) => (
            <div
              key={a.id}
              className="text-xs border-b border-white/5 py-2 flex flex-wrap gap-x-2"
            >
              <span className="text-white/40">
                {new Date(a.createdAt).toLocaleString("fr-FR")}
              </span>
              <span className="font-medium">@{a.actor}</span>
              <span className="text-[#d4af37]">{a.action}</span>
              {a.targetType && (
                <span className="text-white/50">
                  {a.targetType}/{a.targetId?.slice(0, 8)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Btn({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs px-2.5 py-1 rounded-full font-medium ${
        danger ? "bg-red-500/80 text-white" : "bg-white/15 hover:bg-white/25"
      }`}
    >
      {children}
    </button>
  );
}
