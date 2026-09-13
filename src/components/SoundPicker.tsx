"use client";

import { useState } from "react";
import { Music2 } from "lucide-react";
import { CURATED_SOUNDS } from "@/lib/sounds";

type Props = {
  value: string;
  username: string;
  onChange: (name: string) => void;
};

export default function SoundPicker({ value, username, onChange }: Props) {
  const [custom, setCustom] = useState("");
  const original = `Son original — @${username}`;

  return (
    <div>
      <label className="block text-sm text-white/60 mb-1.5">Son</label>
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => onChange(original)}
          className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-left ${
            value === original || !value
              ? "bg-white text-black"
              : "bg-white/10 hover:bg-white/15"
          }`}
        >
          <Music2 size={16} />
          {original}
        </button>
        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto scrollbar-hide">
          {CURATED_SOUNDS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onChange(`${s.name} — ${s.artist}`)}
              className={`text-left px-3 py-2 rounded-xl text-xs ${
                value === `${s.name} — ${s.artist}`
                  ? "bg-white text-black"
                  : "bg-white/10 hover:bg-white/15"
              }`}
            >
              <p className="font-semibold truncate">{s.name}</p>
              <p className="opacity-60 truncate">{s.artist}</p>
            </button>
          ))}
        </div>
        <input
          value={custom}
          onChange={(e) => {
            setCustom(e.target.value);
            if (e.target.value.trim()) onChange(e.target.value.trim());
          }}
          placeholder="Ou saisissez un nom de son…"
          maxLength={80}
          className="w-full bg-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#fe2c55]"
        />
      </div>
    </div>
  );
}
