"use client";

import type { CaptionCue, TextOverlay } from "@/lib/media-edit";

type Props = {
  overlays: TextOverlay[];
  captions: CaptionCue[];
  /** Current playback time in ms */
  currentMs: number;
  showCaptions?: boolean;
};

export default function VideoMediaOverlays({
  overlays,
  captions,
  currentMs,
  showCaptions = true,
}: Props) {
  const visibleOverlays = overlays.filter((o) => {
    if (currentMs < (o.startMs || 0)) return false;
    if (o.endMs != null && currentMs > o.endMs) return false;
    return Boolean(o.text?.trim());
  });

  const activeCaption = showCaptions
    ? captions.find(
        (c) => currentMs >= c.startMs && currentMs <= c.endMs && c.text.trim()
      )
    : undefined;

  return (
    <>
      {visibleOverlays.map((o) => (
        <div
          key={o.id}
          className="absolute z-[15] pointer-events-none px-2 py-0.5 max-w-[90%]"
          style={{
            left: `${o.xPct}%`,
            top: `${o.yPct}%`,
            transform: "translate(-50%, -50%)",
            fontFamily: o.fontFamily,
            fontSize: o.fontSize,
            color: o.color,
            backgroundColor: o.bgColor || "transparent",
            fontWeight: o.bold ? 700 : 400,
            fontStyle: o.italic ? "italic" : "normal",
            textAlign: o.align,
            WebkitTextStroke: o.stroke ? "1.5px rgba(0,0,0,0.85)" : undefined,
            textShadow: o.stroke
              ? "0 2px 6px rgba(0,0,0,0.85)"
              : "0 1px 4px rgba(0,0,0,0.7)",
            wordBreak: "break-word",
            lineHeight: 1.15,
          }}
        >
          {o.text}
        </div>
      ))}
      {activeCaption && (
        <div className="absolute z-[16] left-1/2 bottom-32 md:bottom-28 -translate-x-1/2 pointer-events-none w-[88%] text-center">
          <span
            className="inline-block px-3 py-1.5 rounded-lg bg-black/55 text-white text-[15px] sm:text-base font-semibold leading-snug"
            style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}
          >
            {activeCaption.text}
          </span>
        </div>
      )}
    </>
  );
}
