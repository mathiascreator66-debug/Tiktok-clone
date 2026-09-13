"use client";

import { useEffect, useState } from "react";
import { getDataSaver, setDataSaver } from "@/lib/preferences";

export default function DataSaverToggle() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(getDataSaver());
  }, []);
  return (
    <label className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 cursor-pointer">
      <div>
        <p className="text-sm font-semibold">Économie de data</p>
        <p className="text-[11px] text-white/45">
          Qualité réduite, moins de préchargement — idéal sur réseau mobile.
        </p>
      </div>
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => {
          setOn(e.target.checked);
          setDataSaver(e.target.checked);
        }}
        className="w-5 h-5 accent-[#fe2c55]"
      />
    </label>
  );
}
