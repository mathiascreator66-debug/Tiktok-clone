"use client";

import { useI18n } from "@/lib/i18n";
import type { UiLang } from "@/lib/countries";

const OPTS: { code: UiLang; label: string }[] = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
  { code: "zh", label: "中文" },
];

export default function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();
  return (
    <div>
      <p className="text-xs text-white/40 mb-2">{t("language")}</p>
      <div className="flex gap-2">
        {OPTS.map((o) => (
          <button
            key={o.code}
            type="button"
            onClick={() => setLang(o.code)}
            className={`px-3 py-1.5 rounded-full text-sm ${
              lang === o.code
                ? "bg-[#d4af37] text-black font-semibold"
                : "bg-white/10 text-white/80"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
