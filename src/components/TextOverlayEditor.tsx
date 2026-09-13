"use client";

import { useRef, useState } from "react";
import { Plus, Trash2, Type } from "lucide-react";
import {
  FONT_PRESETS,
  OVERLAY_COLORS,
  defaultOverlay,
  type TextOverlay,
} from "@/lib/media-edit";

type Props = {
  overlays: TextOverlay[];
  onChange: (next: TextOverlay[]) => void;
  /** Optional preview container — drag sets xPct/yPct */
  previewUrl?: string | null;
};

export default function TextOverlayEditor({
  overlays,
  onChange,
  previewUrl,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dragRef = useRef<{ id: string; ox: number; oy: number } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  function update(id: string, patch: Partial<TextOverlay>) {
    onChange(overlays.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }

  function add() {
    const o = defaultOverlay({
      yPct: 30 + overlays.length * 8,
      text: `Texte ${overlays.length + 1}`,
    });
    onChange([...overlays, o]);
    setSelectedId(o.id);
  }

  function remove(id: string) {
    onChange(overlays.filter((o) => o.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function onPointerDown(
    e: React.PointerEvent,
    id: string
  ) {
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(id);
    const box = boxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    dragRef.current = {
      id,
      ox: ((e.clientX - rect.left) / rect.width) * 100,
      oy: ((e.clientY - rect.top) / rect.height) * 100,
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current || !boxRef.current) return;
    const rect = boxRef.current.getBoundingClientRect();
    const xPct = Math.min(
      95,
      Math.max(5, ((e.clientX - rect.left) / rect.width) * 100)
    );
    const yPct = Math.min(
      95,
      Math.max(5, ((e.clientY - rect.top) / rect.height) * 100)
    );
    update(dragRef.current.id, { xPct, yPct });
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  return (
    <div className="space-y-3 rounded-xl bg-white/5 border border-white/10 p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-white/70 flex items-center gap-1.5">
          <Type size={14} /> Texte sur la vidéo
        </p>
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1 text-xs bg-[#fe2c55]/20 hover:bg-[#fe2c55]/30 text-[#fe2c55] rounded-full px-2.5 py-1"
        >
          <Plus size={12} /> Ajouter
        </button>
      </div>

      {previewUrl && overlays.length > 0 && (
        <div
          ref={boxRef}
          className="relative aspect-[9/16] max-h-[220px] mx-auto rounded-xl overflow-hidden bg-black/60 touch-none"
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          <video
            src={previewUrl}
            className="absolute inset-0 w-full h-full object-cover opacity-80"
            muted
            loop
            autoPlay
            playsInline
          />
          {overlays.map((o) => (
            <div
              key={o.id}
              onPointerDown={(e) => onPointerDown(e, o.id)}
              className={`absolute px-2 py-0.5 cursor-grab active:cursor-grabbing select-none ${
                selectedId === o.id ? "ring-2 ring-[#25f4ee]" : ""
              }`}
              style={{
                left: `${o.xPct}%`,
                top: `${o.yPct}%`,
                transform: "translate(-50%, -50%)",
                fontFamily: o.fontFamily,
                fontSize: Math.max(12, o.fontSize * 0.55),
                color: o.color,
                backgroundColor: o.bgColor || "transparent",
                fontWeight: o.bold ? 700 : 400,
                fontStyle: o.italic ? "italic" : "normal",
                textAlign: o.align,
                WebkitTextStroke: o.stroke ? "1px rgba(0,0,0,0.8)" : undefined,
                textShadow: o.stroke
                  ? "0 1px 3px rgba(0,0,0,0.9)"
                  : "0 1px 2px rgba(0,0,0,0.6)",
                maxWidth: "90%",
                wordBreak: "break-word",
              }}
            >
              {o.text || "…"}
            </div>
          ))}
          <p className="absolute bottom-1 left-0 right-0 text-center text-[9px] text-white/40">
            Glissez pour positionner
          </p>
        </div>
      )}

      {overlays.length === 0 && (
        <p className="text-[11px] text-white/40">
          Ajoutez du texte style CapCut / TikTok (polices, couleurs, position).
        </p>
      )}

      <ul className="space-y-2">
        {overlays.map((o) => (
          <li
            key={o.id}
            className={`rounded-lg p-2 ${
              selectedId === o.id ? "bg-white/10" : "bg-black/20"
            }`}
          >
            <div className="flex gap-2">
              <input
                value={o.text}
                onChange={(e) => update(o.id, { text: e.target.value })}
                onFocus={() => setSelectedId(o.id)}
                maxLength={120}
                className="flex-1 bg-white/10 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-[#fe2c55]"
                placeholder="Votre texte…"
              />
              <button
                type="button"
                onClick={() => remove(o.id)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/15"
                aria-label="Supprimer"
              >
                <Trash2 size={14} />
              </button>
            </div>
            {selectedId === o.id && (
              <div className="mt-2 space-y-2">
                <div className="flex flex-wrap gap-1">
                  {FONT_PRESETS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => update(o.id, { fontFamily: f.stack })}
                      className={`text-[10px] px-2 py-1 rounded-full ${
                        o.fontFamily === f.stack
                          ? "bg-[#fe2c55] text-white"
                          : "bg-white/10 text-white/70"
                      }`}
                      style={{ fontFamily: f.stack }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {OVERLAY_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => update(o.id, { color: c })}
                      className={`w-5 h-5 rounded-full border ${
                        o.color === c ? "border-white scale-110" : "border-white/20"
                      }`}
                      style={{ backgroundColor: c }}
                      aria-label={`Couleur ${c}`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-white/50">
                  <span>Taille</span>
                  <input
                    type="range"
                    min={14}
                    max={56}
                    value={o.fontSize}
                    onChange={(e) =>
                      update(o.id, { fontSize: Number(e.target.value) })
                    }
                    className="flex-1 accent-[#fe2c55]"
                  />
                  <span>{o.fontSize}</span>
                </div>
                <div className="flex flex-wrap gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => update(o.id, { bold: !o.bold })}
                    className={`px-2 py-1 rounded ${o.bold ? "bg-white/20" : "bg-white/5"}`}
                  >
                    Gras
                  </button>
                  <button
                    type="button"
                    onClick={() => update(o.id, { italic: !o.italic })}
                    className={`px-2 py-1 rounded ${o.italic ? "bg-white/20" : "bg-white/5"}`}
                  >
                    Italique
                  </button>
                  <button
                    type="button"
                    onClick={() => update(o.id, { stroke: !o.stroke })}
                    className={`px-2 py-1 rounded ${o.stroke ? "bg-white/20" : "bg-white/5"}`}
                  >
                    Contour
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      update(o.id, {
                        bgColor: o.bgColor ? null : "rgba(0,0,0,0.55)",
                      })
                    }
                    className={`px-2 py-1 rounded ${o.bgColor ? "bg-white/20" : "bg-white/5"}`}
                  >
                    Fond
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-white/40">Début (s)</label>
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={(o.startMs / 1000).toFixed(1)}
                      onChange={(e) =>
                        update(o.id, {
                          startMs: Math.round(
                            (Number(e.target.value) || 0) * 1000
                          ),
                        })
                      }
                      className="w-full bg-white/10 rounded px-2 py-1 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40">
                      Fin (s, vide = toute la vidéo)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={
                        o.endMs != null ? (o.endMs / 1000).toFixed(1) : ""
                      }
                      placeholder="—"
                      onChange={(e) => {
                        const v = e.target.value;
                        update(o.id, {
                          endMs:
                            v === ""
                              ? null
                              : Math.round((Number(v) || 0) * 1000),
                        });
                      }}
                      className="w-full bg-white/10 rounded px-2 py-1 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
