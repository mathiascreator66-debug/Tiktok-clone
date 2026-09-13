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

export function parseGain(raw: unknown, fallback = 1): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return clampGain(n);
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

/** Effective HTMLMediaElement.volume (0–1) from gain 0–2 (cap at 1 for element, boost via gain if >1 not available without WebAudio). */
export function elementVolumeFromGain(gain: number): number {
  return Math.min(1, clampGain(gain));
}
