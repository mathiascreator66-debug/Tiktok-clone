"use client";

/** Simple start/end trim for the video clip (v1 — not multi-clip Diviser). */

type Props = {
  durationSec: number | null;
  trimStartSec: number;
  trimEndSec: number | null;
  onChange: (startSec: number, endSec: number | null) => void;
};

function formatSec(s: number): string {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function VideoTrimControls({
  durationSec,
  trimStartSec,
  trimEndSec,
  onChange,
}: Props) {
  const max = durationSec && durationSec > 0 ? durationSec : 60;
  const endVal = trimEndSec != null ? trimEndSec : max;

  return (
    <div className="space-y-3 rounded-xl bg-white/5 border border-white/10 p-3">
      <p className="text-xs font-medium text-white/70">
        Couper la vidéo (début / fin)
      </p>
      <p className="text-[10px] text-white/35">
        Version simple — le découpage multi-clips « Diviser » arrive plus tard.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] text-white/45">Début</label>
          <input
            type="number"
            min={0}
            step={0.1}
            max={max}
            value={Number(trimStartSec.toFixed(1))}
            onChange={(e) => {
              const s = Math.max(0, Number(e.target.value) || 0);
              const end =
                trimEndSec != null && trimEndSec <= s ? s + 0.5 : trimEndSec;
              onChange(s, end);
            }}
            className="w-full mt-0.5 bg-white/10 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-[#fe2c55]"
          />
        </div>
        <div>
          <label className="text-[11px] text-white/45">
            Fin{durationSec ? ` · max ${formatSec(durationSec)}` : ""}
          </label>
          <input
            type="number"
            min={0}
            step={0.1}
            max={max}
            value={Number(endVal.toFixed(1))}
            onChange={(e) => {
              onChange(trimStartSec, Math.max(0, Number(e.target.value) || 0));
            }}
            className="w-full mt-0.5 bg-white/10 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-[#fe2c55]"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={0}
          max={Math.max(max, 1) * 10}
          value={trimStartSec * 10}
          onChange={(e) => {
            const s = Number(e.target.value) / 10;
            const end =
              trimEndSec != null && trimEndSec <= s ? s + 0.5 : trimEndSec;
            onChange(s, end);
          }}
          className="flex-1 accent-[#25f4ee]"
          aria-label="Début vidéo"
        />
        <input
          type="range"
          min={0}
          max={Math.max(max, 1) * 10}
          value={endVal * 10}
          onChange={(e) => onChange(trimStartSec, Number(e.target.value) / 10)}
          className="flex-1 accent-[#fe2c55]"
          aria-label="Fin vidéo"
        />
      </div>
      <p className="text-[10px] text-white/30">
        Lecture de {formatSec(trimStartSec)} à {formatSec(endVal)}.
      </p>
    </div>
  );
}
