"use client";

import { useI18n } from "@/lib/i18n";
import { LANG_OPTIONS, type UiLang } from "@/lib/countries";

export default function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();
  return (
    <div>
      <p className="text-xs text-white/40 mb-2">{t("language")}</p>
      <div className="flex flex-wrap gap-2">
        {LANG_OPTIONS.map((o) => (
          <button
            key={o.code}
            type="button"
            onClick={() => setLang(o.code as UiLang)}
            aria-pressed={lang === o.code}
            className={`px-3 py-1.5 rounded-full text-sm transition ${
              lang === o.code
                ? "bg-[#d4af37] text-black font-semibold"
                : "bg-white/10 text-white/80 hover:bg-white/15"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
