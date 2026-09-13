"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Eye,
  Heart,
  Users,
  Wallet,
  ChevronRight,
  Clapperboard,
} from "lucide-react";
import { LineChart } from "./StudioCharts";
import type { StudioRange } from "@/lib/studio";

type Delta = { text: string; positive: boolean | null };

type OverviewData = {
  range: StudioRange;
  kpis: {
    views: { value: number; display: string; delta: Delta };
    interactions: { value: number; display: string; delta: Delta };
    followersNet: {
      value: number;
      display: string;
      delta: Delta;
      note?: string;
    };
    revenue: {
      value: number;
      display: string;
      delta: Delta;
      note?: string;
    };
  };
  viewsSeries: { date: string; label: string; value: number }[];
  latestContent: {
    id: string;
    caption: string;
    coverUrl: string | null;
    videoUrl: string;
    createdAt: string;
    viewsTotal: number;
    viewsPeriod: number;
    viewsDelta: Delta;
  } | null;
};

const RANGES: { id: StudioRange; label: string }[] = [
  { id: "28d", label: "28 jours" },
  { id: "7d", label: "7 jours" },
  { id: "1d", label: "Aujourd’hui" },
];

const TABS = [
  { id: "analytics", label: "Analytics", href: "/studio" },
  { id: "contenu", label: "Contenu", href: "/studio?tab=contenu" },
  { id: "communaute", label: "Communauté", href: "/studio?tab=communaute" },
  { id: "monetisation", label: "Monétisation", href: "/solde" },
] as const;

function DeltaBadge({ delta }: { delta: Delta }) {
  if (delta.positive === null) {
    return <span className="text-xs text-white/40">{delta.text}</span>;
  }
  return (
    <span
      className={`text-xs font-medium ${
        delta.positive ? "text-emerald-400" : "text-[#fe2c55]"
      }`}
    >
      {delta.text}
    </span>
  );
}

export default function StudioDashboard({
  initialTab = "analytics",
}: {
  initialTab?: string;
}) {
  const [range, setRange] = useState<StudioRange>("7d");
  const [tab, setTab] = useState(initialTab);
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/studio/overview?range=${range}`, {
        credentials: "include",
      });
      if (res.status === 401) {
        window.location.href = "/connexion?next=/studio";
        return;
      }
      if (!res.ok) throw new Error("fail");
      const json = await res.json();
      setData(json);
    } catch {
      setError("Impossible de charger les statistiques.");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-[100dvh] pt-2 md:pt-16 pb-28 max-w-lg mx-auto">
      <header className="flex items-center gap-2 px-3 h-12 mb-1">
        <Link
          href="/parametres"
          className="p-2 -ml-1 rounded-full hover:bg-white/10"
          aria-label="Retour"
        >
          <ArrowLeft size={22} />
        </Link>
        <div className="flex-1">
          <h1 className="font-bold text-lg leading-tight">Tableau de bord</h1>
          <p className="text-[11px] text-white/40">AfriVoix Studio</p>
        </div>
        <BarChart3 size={20} className="text-[#25f4ee]" />
      </header>

      <nav className="flex gap-1 px-3 overflow-x-auto scrollbar-hide mb-3 border-b border-white/10">
        {TABS.map((t) => {
          const active =
            t.id === "monetisation"
              ? false
              : tab === t.id || (t.id === "analytics" && tab === "analytics");
          if (t.id === "monetisation") {
            return (
              <Link
                key={t.id}
                href={t.href}
                className="px-3 py-2.5 text-sm whitespace-nowrap text-white/50 hover:text-white"
              >
                {t.label}
              </Link>
            );
          }
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3 py-2.5 text-sm whitespace-nowrap border-b-2 transition ${
                active
                  ? "border-[#fe2c55] text-white font-semibold"
                  : "border-transparent text-white/50"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      {(tab === "analytics" || tab === "contenu") && (
        <div className="flex gap-2 px-3 mb-4">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                range === r.id
                  ? "bg-white text-black border-white"
                  : "bg-transparent text-white/60 border-white/20 hover:border-white/40"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <p className="text-center text-white/40 text-sm py-10">Chargement…</p>
      )}
      {error && (
        <p className="text-center text-[#fe2c55] text-sm py-10 px-4">{error}</p>
      )}

      {!loading && !error && data && tab === "analytics" && (
        <div className="px-3 space-y-4">
          <section>
            <h2 className="text-sm font-semibold text-white/50 mb-2 px-0.5">
              Indicateurs clés
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <KpiCard
                icon={<Eye size={16} />}
                label="Vues"
                value={data.kpis.views.display}
                delta={data.kpis.views.delta}
              />
              <KpiCard
                icon={<Heart size={16} />}
                label="Interactions"
                value={data.kpis.interactions.display}
                delta={data.kpis.interactions.delta}
              />
              <KpiCard
                icon={<Users size={16} />}
                label="Followers nets"
                value={data.kpis.followersNet.display}
                delta={data.kpis.followersNet.delta}
              />
              <KpiCard
                icon={<Wallet size={16} />}
                label="Revenus estimés"
                value={data.kpis.revenue.display}
                delta={data.kpis.revenue.delta}
              />
            </div>
            <p className="text-[10px] text-white/30 mt-2 px-0.5">
              {data.kpis.followersNet.note}. {data.kpis.revenue.note}.
            </p>
          </section>

          <section className="rounded-2xl bg-white/[0.06] border border-white/10 p-4">
            <h2 className="text-sm font-semibold mb-3">Vues</h2>
            <LineChart data={data.viewsSeries} />
          </section>

          {data.latestContent && (
            <section>
              <div className="flex items-center justify-between mb-2 px-0.5">
                <h2 className="text-sm font-semibold text-white/50">Contenu</h2>
                <button
                  type="button"
                  onClick={() => setTab("contenu")}
                  className="text-xs text-[#25f4ee]"
                >
                  Tout voir
                </button>
              </div>
              <ContentTeaser item={data.latestContent} />
            </section>
          )}
        </div>
      )}

      {!loading && !error && data && tab === "contenu" && (
        <div className="px-3 space-y-3">
          <h2 className="text-sm font-semibold text-white/50 px-0.5">
            Dernière publication
          </h2>
          {data.latestContent ? (
            <ContentTeaser item={data.latestContent} />
          ) : (
            <EmptyContent />
          )}
          <Link
            href="/telecharger"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#fe2c55] font-semibold text-sm"
          >
            <Clapperboard size={16} /> Publier une vidéo
          </Link>
        </div>
      )}

      {tab === "communaute" && (
        <div className="px-3 py-8 text-center">
          <Users size={36} className="mx-auto text-white/20 mb-3" />
          <p className="font-semibold">Communauté</p>
          <p className="text-sm text-white/45 mt-1 max-w-xs mx-auto">
            Les followers nets de la période figurent dans Analytics. Plus
            d’outils communauté bientôt.
          </p>
          <Link
            href="/amis"
            className="inline-block mt-4 text-sm text-[#25f4ee] font-medium"
          >
            Trouver des amis
          </Link>
        </div>
      )}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  delta,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delta: Delta;
}) {
  return (
    <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-3.5">
      <div className="flex items-center gap-1.5 text-white/45 text-xs mb-2">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      <div className="mt-1">
        <DeltaBadge delta={delta} />
        <span className="text-[10px] text-white/30 ml-1">vs période préc.</span>
      </div>
    </div>
  );
}

function ContentTeaser({
  item,
}: {
  item: NonNullable<OverviewData["latestContent"]>;
}) {
  return (
    <Link
      href={`/studio/videos/${item.id}`}
      className="flex gap-3 rounded-2xl bg-white/[0.06] border border-white/10 p-3 hover:bg-white/[0.09] transition"
    >
      <div className="w-16 h-24 rounded-lg overflow-hidden bg-white/5 shrink-0">
        {item.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.coverUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <video
            src={item.videoUrl}
            className="w-full h-full object-cover"
            muted
            preload="metadata"
          />
        )}
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <p className="text-sm font-medium line-clamp-2">{item.caption}</p>
        <p className="text-xs text-white/45 mt-1">
          {item.viewsPeriod} vues (période) · {item.viewsTotal} au total
        </p>
        <div className="mt-1">
          <DeltaBadge delta={item.viewsDelta} />
        </div>
      </div>
      <ChevronRight size={18} className="text-white/30 self-center shrink-0" />
    </Link>
  );
}

function EmptyContent() {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center">
      <Clapperboard size={28} className="mx-auto text-white/25 mb-2" />
      <p className="text-sm text-white/50">Aucune publication pour l’instant</p>
    </div>
  );
}
