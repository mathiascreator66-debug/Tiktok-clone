"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bookmark,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Clock,
} from "lucide-react";
import { LineChart, RetentionChart, BarRow } from "./StudioCharts";
import type { StudioRange } from "@/lib/studio";
import { formatCount } from "@/lib/format";

type Header = {
  id: string;
  caption: string;
  coverUrl: string | null;
  videoUrl: string;
  durationSec: number | null;
  createdAt: string;
  counts: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    bookmarks: number;
    viewsDisplay: string;
    likesDisplay: string;
    commentsDisplay: string;
    sharesDisplay: string;
    bookmarksDisplay: string;
  };
};

type Tab = "overview" | "viewers" | "engagement";

const RANGES: { id: StudioRange; label: string }[] = [
  { id: "28d", label: "28 jours" },
  { id: "7d", label: "7 jours" },
  { id: "1d", label: "Aujourd’hui" },
];

export default function StudioVideoAnalytics({ videoId }: { videoId: string }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [range, setRange] = useState<StudioRange>("7d");
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [header, setHeader] = useState<Header | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/studio/videos/${videoId}?tab=${tab}&range=${range}`,
        { credentials: "include" }
      );
      if (res.status === 401) {
        window.location.href = `/connexion?next=/studio/videos/${videoId}`;
        return;
      }
      if (res.status === 404) {
        setError("Vidéo introuvable ou accès refusé.");
        setData(null);
        return;
      }
      if (!res.ok) throw new Error("fail");
      const json = await res.json();
      setHeader(json.header);
      setData(json);
    } catch {
      setError("Impossible de charger l’analyse.");
    } finally {
      setLoading(false);
    }
  }, [videoId, tab, range]);

  useEffect(() => {
    load();
  }, [load]);

  const published = header
    ? new Date(header.createdAt).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

  return (
    <div className="min-h-[100dvh] pt-2 md:pt-16 pb-28 max-w-lg mx-auto">
      <header className="flex items-center gap-2 px-3 h-12 mb-2">
        <Link
          href="/studio"
          className="p-2 -ml-1 rounded-full hover:bg-white/10"
          aria-label="Retour"
        >
          <ArrowLeft size={22} />
        </Link>
        <h1 className="font-bold text-lg">Analyse vidéo</h1>
      </header>

      {header && (
        <div className="px-3 mb-4">
          <div className="flex gap-3 rounded-2xl bg-white/[0.06] border border-white/10 p-3">
            <div className="w-14 h-20 rounded-lg overflow-hidden bg-white/5 shrink-0">
              {header.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={header.coverUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <video
                  src={header.videoUrl}
                  className="w-full h-full object-cover"
                  muted
                  preload="metadata"
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium line-clamp-2">{header.caption}</p>
              <p className="text-[11px] text-white/40 mt-1 flex items-center gap-1">
                <Clock size={11} />
                {header.durationSec
                  ? `${Math.round(header.durationSec)} s`
                  : "—"}{" "}
                · {published}
              </p>
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-white/60">
                <span className="inline-flex items-center gap-1">
                  <Eye size={12} /> {header.counts.viewsDisplay}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Heart size={12} /> {header.counts.likesDisplay}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MessageCircle size={12} /> {header.counts.commentsDisplay}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Share2 size={12} /> {header.counts.sharesDisplay}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Bookmark size={12} /> {header.counts.bookmarksDisplay}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <nav className="flex gap-1 px-3 overflow-x-auto scrollbar-hide mb-3 border-b border-white/10">
        {(
          [
            ["overview", "Vue d’ensemble"],
            ["viewers", "Spectateurs"],
            ["engagement", "Engagement"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-3 py-2.5 text-sm whitespace-nowrap border-b-2 transition ${
              tab === id
                ? "border-[#fe2c55] text-white font-semibold"
                : "border-transparent text-white/50"
            }`}
          >
            {label}
          </button>
        ))}
        <span className="px-3 py-2.5 text-sm text-white/25 whitespace-nowrap">
          Inspiration
        </span>
      </nav>

      <div className="flex gap-2 px-3 mb-4">
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRange(r.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
              range === r.id
                ? "bg-white text-black border-white"
                : "bg-transparent text-white/60 border-white/20"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {loading && (
        <p className="text-center text-white/40 text-sm py-10">Chargement…</p>
      )}
      {error && (
        <p className="text-center text-[#fe2c55] text-sm py-10 px-4">{error}</p>
      )}

      {!loading && !error && data && tab === "overview" && (
        <OverviewTab data={data as OverviewPayload} />
      )}
      {!loading && !error && data && tab === "viewers" && (
        <ViewersTab data={data as ViewersPayload} />
      )}
      {!loading && !error && data && tab === "engagement" && (
        <EngagementTab data={data as EngagementPayload} />
      )}
    </div>
  );
}

type OverviewPayload = {
  overview: {
    keyIndicators: {
      views: number;
      viewsDisplay: string;
      totalWatchDisplay: string;
      avgWatchDisplay: string;
      completionRate: number;
      newFollowersAttributed: number;
    };
    viewsSeries: { label: string; value: number }[];
    retention: {
      limited: boolean;
      note: string | null;
      points: { pct: number; rate: number }[];
    };
    trafficSources: {
      key: string;
      label: string;
      count: number;
      pct: number;
    }[];
  };
};

function OverviewTab({ data }: { data: OverviewPayload }) {
  const o = data.overview;
  const k = o.keyIndicators;
  return (
    <div className="px-3 space-y-4">
      <section>
        <h2 className="text-sm font-semibold text-white/50 mb-2">
          Indicateurs clés
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <MiniStat label="Vues" value={k.viewsDisplay} />
          <MiniStat label="Temps de lecture" value={k.totalWatchDisplay} />
          <MiniStat label="Temps moyen" value={k.avgWatchDisplay} />
          <MiniStat
            label="% regardé en entier"
            value={`${k.completionRate.toFixed(k.completionRate % 1 ? 1 : 0).replace(".", ",")} %`}
          />
          <MiniStat
            label="Nouveaux followers"
            value={formatCount(k.newFollowersAttributed)}
            className="col-span-2"
          />
        </div>
      </section>

      <section className="rounded-2xl bg-white/[0.06] border border-white/10 p-4">
        <h2 className="text-sm font-semibold mb-3">Vues</h2>
        <LineChart data={o.viewsSeries} />
      </section>

      <section className="rounded-2xl bg-white/[0.06] border border-white/10 p-4">
        <h2 className="text-sm font-semibold mb-1">Taux de fidélisation</h2>
        {o.retention.note && (
          <p className="text-[10px] text-amber-200/70 mb-2">{o.retention.note}</p>
        )}
        <RetentionChart points={o.retention.points} />
      </section>

      <section className="rounded-2xl bg-white/[0.06] border border-white/10 p-4">
        <h2 className="text-sm font-semibold mb-3">Sources de trafic</h2>
        {o.trafficSources.every((s) => s.count === 0) ? (
          <p className="text-sm text-white/40">Pas encore de données</p>
        ) : (
          o.trafficSources.map((s) => (
            <BarRow
              key={s.key}
              label={s.label}
              pct={s.pct}
              count={s.count}
              color={s.key === "pour_toi" ? "#fe2c55" : "#25f4ee"}
            />
          ))
        )}
      </section>
    </div>
  );
}

type ViewersPayload = {
  viewers: {
    totalWatches: number;
    distinctLoggedIn: number;
    anonymousWatches: number;
    limitedNote: string;
    types: {
      newViewers: number;
      returningViewers: number;
      followerViewers: number;
      nonFollowerViewers: number;
    };
    gender: { available: boolean; note: string };
    age: {
      sampleSize: number;
      buckets: { label: string; count: number; pct: number }[];
    };
    locations: {
      sampleSize: number;
      countries: { code: string; count: number; pct: number }[];
      note: string | null;
    };
  };
};

function ViewersTab({ data }: { data: ViewersPayload }) {
  const v = data.viewers;
  const typeTotal =
    v.types.newViewers + v.types.returningViewers || 1;
  const followTotal =
    v.types.followerViewers + v.types.nonFollowerViewers || 1;

  return (
    <div className="px-3 space-y-4">
      <p className="text-[11px] text-amber-200/70 bg-amber-400/10 border border-amber-400/20 rounded-xl px-3 py-2">
        {v.limitedNote}
      </p>

      <section className="rounded-2xl bg-white/[0.06] border border-white/10 p-4">
        <h2 className="text-sm font-semibold mb-3">Types de spectateurs</h2>
        <BarRow
          label="Nouveaux"
          pct={(v.types.newViewers / typeTotal) * 100}
          count={v.types.newViewers}
        />
        <BarRow
          label="Récurrents"
          pct={(v.types.returningViewers / typeTotal) * 100}
          count={v.types.returningViewers}
          color="#fe2c55"
        />
        <div className="mt-3 pt-3 border-t border-white/10">
          <BarRow
            label="Followers"
            pct={(v.types.followerViewers / followTotal) * 100}
            count={v.types.followerViewers}
          />
          <BarRow
            label="Non-followers"
            pct={(v.types.nonFollowerViewers / followTotal) * 100}
            count={v.types.nonFollowerViewers}
            color="#a78bfa"
          />
        </div>
        {v.anonymousWatches > 0 && (
          <p className="text-[10px] text-white/35 mt-2">
            + {v.anonymousWatches} visionnage(s) anonyme(s) non ventilés
          </p>
        )}
      </section>

      <section className="rounded-2xl bg-white/[0.06] border border-white/10 p-4">
        <h2 className="text-sm font-semibold mb-2">Sexe</h2>
        <p className="text-sm text-white/45">{v.gender.note}</p>
      </section>

      <section className="rounded-2xl bg-white/[0.06] border border-white/10 p-4">
        <h2 className="text-sm font-semibold mb-3">Âge</h2>
        {v.age.sampleSize === 0 ? (
          <p className="text-sm text-white/45">Données limitées</p>
        ) : (
          v.age.buckets
            .filter((b) => b.label !== "inconnu" || b.count > 0)
            .map((b) => (
              <BarRow
                key={b.label}
                label={b.label}
                pct={b.pct}
                count={b.count}
              />
            ))
        )}
      </section>

      <section className="rounded-2xl bg-white/[0.06] border border-white/10 p-4">
        <h2 className="text-sm font-semibold mb-3">Emplacements</h2>
        {v.locations.note && (
          <p className="text-[10px] text-white/40 mb-2">{v.locations.note}</p>
        )}
        {v.locations.countries.length === 0 ? (
          <p className="text-sm text-white/45">Données limitées</p>
        ) : (
          v.locations.countries.map((c) => (
            <BarRow
              key={c.code}
              label={c.code}
              pct={c.pct}
              count={c.count}
              color="#fbbf24"
            />
          ))
        )}
      </section>
    </div>
  );
}

type EngagementPayload = {
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    likesDisplay: string;
    commentsDisplay: string;
    sharesDisplay: string;
    savesDisplay: string;
    topComments: {
      id: string;
      content: string;
      username: string;
      likeCount: number;
      replyCount: number;
    }[];
  };
};

function EngagementTab({ data }: { data: EngagementPayload }) {
  const e = data.engagement;
  return (
    <div className="px-3 space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <MiniStat label="J’aime" value={e.likesDisplay} />
        <MiniStat label="Commentaires" value={e.commentsDisplay} />
        <MiniStat label="Partages" value={e.sharesDisplay} />
        <MiniStat label="Enregistrements" value={e.savesDisplay} />
      </div>

      <section className="rounded-2xl bg-white/[0.06] border border-white/10 p-4">
        <h2 className="text-sm font-semibold mb-3">Meilleurs commentaires</h2>
        {e.topComments.length === 0 ? (
          <p className="text-sm text-white/40">Aucun commentaire</p>
        ) : (
          <ul className="space-y-3">
            {e.topComments.map((c) => (
              <li key={c.id} className="text-sm">
                <p className="font-semibold text-white/80">@{c.username}</p>
                <p className="text-white/70 line-clamp-2">{c.content}</p>
                <p className="text-[11px] text-white/35 mt-0.5">
                  {c.likeCount} j’aime · {c.replyCount} réponses
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function MiniStat({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl bg-white/[0.06] border border-white/10 p-3.5 ${className}`}
    >
      <p className="text-xs text-white/45 mb-1">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

