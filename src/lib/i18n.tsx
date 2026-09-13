"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { UiLang } from "./countries";

const STRINGS = {
  fr: {
    forYou: "Pour toi",
    search: "Recherche",
    friends: "Amis",
    publish: "Publier",
    messages: "Messages",
    profile: "Profil",
    home: "Accueil",
    login: "Connexion",
    logout: "Déconnexion",
    settings: "Paramètres et confidentialité",
    about: "À propos",
    help: "Centre d'aide",
    terms: "CGU",
    privacy: "Confidentialité",
    language: "Langue",
    admin: "Admin",
    create: "Créer",
  },
  en: {
    forYou: "For you",
    search: "Search",
    friends: "Friends",
    publish: "Upload",
    messages: "Messages",
    profile: "Profile",
    home: "Home",
    login: "Log in",
    logout: "Log out",
    settings: "Settings & privacy",
    about: "About",
    help: "Help center",
    terms: "Terms",
    privacy: "Privacy",
    language: "Language",
    admin: "Admin",
    create: "Create",
  },
  zh: {
    forYou: "推荐",
    search: "搜索",
    friends: "好友",
    publish: "发布",
    messages: "私信",
    profile: "主页",
    home: "首页",
    login: "登录",
    logout: "退出",
    settings: "设置与隐私",
    about: "关于",
    help: "帮助中心",
    terms: "条款",
    privacy: "隐私",
    language: "语言",
    admin: "管理",
    create: "创作",
  },
} as const;

export type I18nKey = keyof (typeof STRINGS)["fr"];

type Ctx = {
  lang: UiLang;
  setLang: (l: UiLang) => void;
  t: (key: I18nKey) => string;
};

const I18nContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "afrivoix_lang";

export function I18nProvider({
  children,
  initialLang = "fr",
}: {
  children: React.ReactNode;
  initialLang?: UiLang;
}) {
  const [lang, setLangState] = useState<UiLang>(initialLang);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as UiLang | null;
      if (stored === "fr" || stored === "en" || stored === "zh") {
        setLangState(stored);
      }
    } catch {
      /* ignore */
    }
  }, []);

  function setLang(l: UiLang) {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
      document.cookie = `afrivoix_lang=${l};path=/;max-age=31536000;samesite=lax`;
    } catch {
      /* ignore */
    }
  }

  const value = useMemo<Ctx>(
    () => ({
      lang,
      setLang,
      t: (key) => STRINGS[lang][key] || STRINGS.fr[key] || key,
    }),
    [lang]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return {
      lang: "fr" as UiLang,
      setLang: () => {},
      t: (key: I18nKey) => STRINGS.fr[key] || key,
    };
  }
  return ctx;
}
