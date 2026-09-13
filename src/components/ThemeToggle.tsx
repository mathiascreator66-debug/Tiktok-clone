"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="px-3 mb-2">
      <p className="text-xs font-semibold uppercase tracking-wide mb-2 px-1 opacity-50">
        Thème
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setTheme("light")}
          className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border transition ${
            theme === "light"
              ? "bg-[#0a0a0a] text-white border-transparent"
              : "bg-white/10 border-white/15 opacity-80"
          }`}
        >
          <Sun size={16} /> Clair
        </button>
        <button
          type="button"
          onClick={() => setTheme("dark")}
          className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border transition ${
            theme === "dark"
              ? "bg-white text-black border-transparent"
              : "bg-white/10 border-white/15 opacity-80"
          }`}
        >
          <Moon size={16} /> Sombre
        </button>
      </div>
      <p className="text-[11px] opacity-40 mt-2 px-1">
        Clair (blanc) par défaut · Sombre style TikTok
      </p>
    </div>
  );
}
