/** Types & helpers for CapCut-like volume/trim, text overlays, captions (v1). */

export type TextOverlay = {
  id: string;
  text: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  bgColor?: string | null;
  align: "left" | "center" | "right";
  xPct: number;
  yPct: number;
  startMs: number;
  endMs?: number | null;
  bold?: boolean;
  italic?: boolean;
  stroke?: boolean;
};

export type CaptionCue = {
  startMs: number;
  endMs: number;
  text: string;
};

export const FONT_PRESETS: { id: string; label: string; stack: string }[] = [
  {
    id: "inter",
    label: "Classique",
    stack: 'Inter, system-ui, -apple-system, sans-serif',
  },
  {
    id: "impact",
    label: "Impact",
    stack: 'Impact, Haettenschweiler, "Arial Black", sans-serif',
  },
  {
    id: "hand",
    label: "Manuscrit",
    stack: '"Segoe Print", "Comic Sans MS", cursive',
  },
  {
    id: "serif",
    label: "Serif",
    stack: 'Georgia, "Times New Roman", serif',
  },
  {
    id: "mono",
    label: "Mono",
    stack: 'ui-monospace, "Cascadia Code", Consolas, monospace',
  },
];

export const OVERLAY_COLORS = [
  "#ffffff",
  "#000000",
  "#fe2c55",
  "#25f4ee",
  "#fbbf24",
  "#a78bfa",
  "#34d399",
  "#fb923c",
];

export function clampGain(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(2, Math.max(0, n));
}

/** Normalize stored gain: 0–2 expected; values >2 treated as 0–100 percentages. */
export function normalizeStoredGain(raw: unknown, fallback = 1): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return fallback;
  if (n > 2) return clampGain(n / 100);
  return clampGain(n);
}

export function parseGain(raw: unknown, fallback = 1): number {
  return normalizeStoredGain(raw, fallback);
}

export function parseTrimMs(raw: unknown, fallback: number | null): number | null {
  if (raw == null || raw === "") return fallback;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.round(n);
}

export function parseJsonArray<T>(raw: string | null | undefined): T[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}

export function serializeOverlays(list: TextOverlay[]): string | null {
  if (!list.length) return null;
  return JSON.stringify(
    list.map((o) => ({
      id: o.id,
      text: String(o.text).slice(0, 200),
      fontFamily: o.fontFamily || FONT_PRESETS[0].stack,
      fontSize: Math.min(72, Math.max(12, Number(o.fontSize) || 24)),
      color: o.color || "#ffffff",
      bgColor: o.bgColor ?? null,
      align: o.align === "left" || o.align === "right" ? o.align : "center",
      xPct: Math.min(100, Math.max(0, Number(o.xPct) || 50)),
      yPct: Math.min(100, Math.max(0, Number(o.yPct) || 50)),
      startMs: Math.max(0, Math.round(Number(o.startMs) || 0)),
      endMs:
        o.endMs == null || o.endMs === undefined
          ? null
          : Math.max(0, Math.round(Number(o.endMs))),
      bold: Boolean(o.bold),
      italic: Boolean(o.italic),
      stroke: Boolean(o.stroke),
    }))
  );
}

export function serializeCaptions(list: CaptionCue[]): string | null {
  if (!list.length) return null;
  return JSON.stringify(
    list
      .filter((c) => c.text.trim())
      .map((c) => ({
        startMs: Math.max(0, Math.round(Number(c.startMs) || 0)),
        endMs: Math.max(0, Math.round(Number(c.endMs) || 0)),
        text: String(c.text).trim().slice(0, 300),
      }))
  );
}

export function parseOverlaysField(raw: string | null | undefined): TextOverlay[] {
  return parseJsonArray<TextOverlay>(raw).filter((o) => o && typeof o.text === "string");
}

export function parseCaptionsField(raw: string | null | undefined): CaptionCue[] {
  return parseJsonArray<CaptionCue>(raw).filter(
    (c) => c && typeof c.text === "string" && Number.isFinite(c.startMs)
  );
}

export function newOverlayId(): string {
  return `ov_${Math.random().toString(36).slice(2, 10)}`;
}

export function defaultOverlay(partial?: Partial<TextOverlay>): TextOverlay {
  return {
    id: newOverlayId(),
    text: "Texte",
    fontFamily: FONT_PRESETS[0].stack,
    fontSize: 28,
    color: "#ffffff",
    bgColor: null,
    align: "center",
    xPct: 50,
    yPct: 40,
    startMs: 0,
    endMs: null,
    bold: true,
    italic: false,
    stroke: true,
    ...partial,
  };
}

/** Effective HTMLMediaElement.volume (0–1) from gain 0–2 (cap at 1). Prefer applyMediaGain for boost. */
export function elementVolumeFromGain(gain: number): number {
  return Math.min(1, Math.max(0, normalizeStoredGain(gain)));
}

type GainBridge = {
  ctx: AudioContext;
  source: MediaElementAudioSourceNode;
  gainNode: GainNode;
};

const gainBridges = new WeakMap<HTMLMediaElement, GainBridge>();

/**
 * Apply loudness 0–2 to a media element.
 * Uses HTMLMediaElement.volume for 0–1; Web Audio GainNode when gain > 1.
 * Also clears muted when gain > 0 so sliders are audible after a user gesture.
 */
export function applyMediaGain(
  el: HTMLMediaElement | null | undefined,
  gain: number,
  opts?: { unmute?: boolean }
): void {
  if (!el) return;
  const g = normalizeStoredGain(gain);
  if (opts?.unmute && g > 0) {
    el.muted = false;
  }
  if (g <= 1) {
    el.volume = g;
    const bridge = gainBridges.get(el);
    if (bridge) {
      bridge.gainNode.gain.value = 1;
    }
    return;
  }
  // Boost above 100%: route through GainNode (element volume stays at 1).
  el.volume = 1;
  let bridge = gainBridges.get(el);
  if (!bridge) {
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new AC();
      const source = ctx.createMediaElementSource(el);
      const gainNode = ctx.createGain();
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      bridge = { ctx, source, gainNode };
      gainBridges.set(el, bridge);
    } catch {
      // createMediaElementSource can only run once; if it failed, clamp.
      el.volume = 1;
      return;
    }
  }
  bridge.gainNode.gain.value = g;
  if (bridge.ctx.state === "suspended") {
    void bridge.ctx.resume().catch(() => {});
  }
}

/** Cover text style motifs (TikTok-like framed text). */
export type CoverTextStyleId =
  | "classic"
  | "neon"
  | "retro"
  | "soft"
  | "boldOutline"
  | "banner"
  | "pillWhite"
  | "pillBlack"
  | "pillRed"
  | "pillYellow"
  | "pillBlue"
  | "pillGreen"
  | "pillPink"
  | "pillOrange"
  | "bannerWide"
  | "doubleFrame"
  | "glass";

export type CoverTextStyle = {
  id: CoverTextStyleId;
  label: string;
  stack: string;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  shadow?: string;
  /** Background pill / banner behind text */
  bg?: string;
  /** pill | banner | double | none */
  frame: "none" | "pill" | "banner" | "double" | "glass";
  letterSpacing?: number;
  uppercase?: boolean;
};

export const COVER_TEXT_STYLES: CoverTextStyle[] = [
  {
    id: "classic",
    label: "Classique",
    stack: 'Inter, system-ui, -apple-system, sans-serif',
    fill: "#ffffff",
    stroke: "rgba(0,0,0,0.85)",
    strokeWidth: 1,
    shadow: "0 2px 8px rgba(0,0,0,0.65)",
    frame: "none",
  },
  {
    id: "neon",
    label: "Néon",
    stack: 'Impact, Haettenschweiler, "Arial Black", sans-serif',
    fill: "#25f4ee",
    stroke: "#fe2c55",
    strokeWidth: 2,
    shadow: "0 0 12px #25f4ee, 0 0 24px #fe2c55",
    frame: "none",
    uppercase: true,
  },
  {
    id: "retro",
    label: "Rétro",
    stack: 'Georgia, "Times New Roman", serif',
    fill: "#fbbf24",
    stroke: "#7c2d12",
    strokeWidth: 2,
    shadow: "3px 3px 0 #7c2d12",
    frame: "none",
  },
  {
    id: "soft",
    label: "Doux",
    stack: '"Segoe Print", "Comic Sans MS", cursive',
    fill: "#ffffff",
    shadow: "0 1px 6px rgba(0,0,0,0.45)",
    bg: "rgba(255,255,255,0.22)",
    frame: "glass",
  },
  {
    id: "boldOutline",
    label: "Contour",
    stack: 'Impact, Haettenschweiler, "Arial Black", sans-serif',
    fill: "#ffffff",
    stroke: "#000000",
    strokeWidth: 3,
    frame: "none",
    uppercase: true,
  },
  {
    id: "banner",
    label: "Bandeau",
    stack: 'Inter, system-ui, sans-serif',
    fill: "#ffffff",
    bg: "rgba(0,0,0,0.72)",
    frame: "banner",
  },
  {
    id: "pillWhite",
    label: "Blanc",
    stack: 'Inter, system-ui, sans-serif',
    fill: "#111111",
    bg: "#ffffff",
    frame: "pill",
  },
  {
    id: "pillBlack",
    label: "Noir",
    stack: 'Inter, system-ui, sans-serif',
    fill: "#ffffff",
    bg: "#000000",
    frame: "pill",
  },
  {
    id: "pillRed",
    label: "Rouge",
    stack: 'Inter, system-ui, sans-serif',
    fill: "#ffffff",
    bg: "#fe2c55",
    frame: "pill",
  },
  {
    id: "pillYellow",
    label: "Jaune",
    stack: 'Inter, system-ui, sans-serif',
    fill: "#111111",
    bg: "#facc15",
    frame: "pill",
  },
  {
    id: "pillBlue",
    label: "Bleu",
    stack: 'Inter, system-ui, sans-serif',
    fill: "#ffffff",
    bg: "#2563eb",
    frame: "pill",
  },
  {
    id: "pillGreen",
    label: "Vert",
    stack: 'Inter, system-ui, sans-serif',
    fill: "#052e16",
    bg: "#4ade80",
    frame: "pill",
  },
  {
    id: "pillPink",
    label: "Rose",
    stack: 'Inter, system-ui, sans-serif',
    fill: "#ffffff",
    bg: "#ec4899",
    frame: "pill",
  },
  {
    id: "pillOrange",
    label: "Orange",
    stack: 'Inter, system-ui, sans-serif',
    fill: "#111111",
    bg: "#fb923c",
    frame: "pill",
  },
  {
    id: "bannerWide",
    label: "Large",
    stack: 'Inter, system-ui, sans-serif',
    fill: "#ffffff",
    bg: "#fe2c55",
    frame: "banner",
    uppercase: true,
  },
  {
    id: "doubleFrame",
    label: "Double",
    stack: 'Inter, system-ui, sans-serif',
    fill: "#ffffff",
    bg: "#111111",
    stroke: "#25f4ee",
    strokeWidth: 2,
    frame: "double",
  },
  {
    id: "glass",
    label: "Verre",
    stack: 'Inter, system-ui, sans-serif',
    fill: "#ffffff",
    bg: "rgba(255,255,255,0.18)",
    frame: "glass",
  },
];

export function getCoverTextStyle(id: string): CoverTextStyle {
  return COVER_TEXT_STYLES.find((s) => s.id === id) || COVER_TEXT_STYLES[0];
}
