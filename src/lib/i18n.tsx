"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  isUiLang,
  normalizeUiLang,
  type UiLang,
} from "./countries";

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
    activity: "Activité",
    appearance: "Apparence",
    data: "Données",
    monetization: "Monétisation",
    account: "Compte",
    helpLegal: "Aide et légal",
    editProfile: "Modifier le profil",
    shareProfile: "Partager le profil",
    follow: "Suivre",
    message: "Message",
    following: "Suivis",
    followers: "Followers",
    likes: "J'aime",
    register: "Créer un compte",
    continueGoogle: "Continuer avec Google",
    email: "E-mail",
    password: "Mot de passe",
    or: "ou",
    save: "Enregistrer",
    cancel: "Annuler",
    comments: "Commentaires",
    addComment: "Ajouter un commentaire…",
    balance: "Solde",
    studio: "Studio",
    premium: "Premium",
    panneau: "Panneau",
    theme: "Thème",
    light: "Clair",
    dark: "Sombre",
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
    activity: "Activity",
    appearance: "Appearance",
    data: "Data",
    monetization: "Monetization",
    account: "Account",
    helpLegal: "Help & legal",
    editProfile: "Edit profile",
    shareProfile: "Share profile",
    follow: "Follow",
    message: "Message",
    following: "Following",
    followers: "Followers",
    likes: "Likes",
    register: "Sign up",
    continueGoogle: "Continue with Google",
    email: "Email",
    password: "Password",
    or: "or",
    save: "Save",
    cancel: "Cancel",
    comments: "Comments",
    addComment: "Add a comment…",
    balance: "Balance",
    studio: "Studio",
    premium: "Premium",
    panneau: "Board",
    theme: "Theme",
    light: "Light",
    dark: "Dark",
  },
  es: {
    forYou: "Para ti",
    search: "Buscar",
    friends: "Amigos",
    publish: "Publicar",
    messages: "Mensajes",
    profile: "Perfil",
    home: "Inicio",
    login: "Iniciar sesión",
    logout: "Cerrar sesión",
    settings: "Ajustes y privacidad",
    about: "Acerca de",
    help: "Centro de ayuda",
    terms: "Términos",
    privacy: "Privacidad",
    language: "Idioma",
    admin: "Admin",
    create: "Crear",
    activity: "Actividad",
    appearance: "Apariencia",
    data: "Datos",
    monetization: "Monetización",
    account: "Cuenta",
    helpLegal: "Ayuda y legal",
    editProfile: "Editar perfil",
    shareProfile: "Compartir perfil",
    follow: "Seguir",
    message: "Mensaje",
    following: "Seguidos",
    followers: "Seguidores",
    likes: "Me gusta",
    register: "Crear cuenta",
    continueGoogle: "Continuar con Google",
    email: "Correo",
    password: "Contraseña",
    or: "o",
    save: "Guardar",
    cancel: "Cancelar",
    comments: "Comentarios",
    addComment: "Añadir un comentario…",
    balance: "Saldo",
    studio: "Studio",
    premium: "Premium",
    panneau: "Panel",
    theme: "Tema",
    light: "Claro",
    dark: "Oscuro",
  },
  de: {
    forYou: "Für dich",
    search: "Suche",
    friends: "Freunde",
    publish: "Hochladen",
    messages: "Nachrichten",
    profile: "Profil",
    home: "Start",
    login: "Anmelden",
    logout: "Abmelden",
    settings: "Einstellungen & Datenschutz",
    about: "Über uns",
    help: "Hilfezentrum",
    terms: "AGB",
    privacy: "Datenschutz",
    language: "Sprache",
    admin: "Admin",
    create: "Erstellen",
    activity: "Aktivität",
    appearance: "Darstellung",
    data: "Daten",
    monetization: "Monetarisierung",
    account: "Konto",
    helpLegal: "Hilfe & Rechtliches",
    editProfile: "Profil bearbeiten",
    shareProfile: "Profil teilen",
    follow: "Folgen",
    message: "Nachricht",
    following: "Folge ich",
    followers: "Follower",
    likes: "Likes",
    register: "Konto erstellen",
    continueGoogle: "Weiter mit Google",
    email: "E-Mail",
    password: "Passwort",
    or: "oder",
    save: "Speichern",
    cancel: "Abbrechen",
    comments: "Kommentare",
    addComment: "Kommentar hinzufügen…",
    balance: "Guthaben",
    studio: "Studio",
    premium: "Premium",
    panneau: "Pinnwand",
    theme: "Design",
    light: "Hell",
    dark: "Dunkel",
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
    activity: "动态",
    appearance: "外观",
    data: "数据",
    monetization: "变现",
    account: "账户",
    helpLegal: "帮助与法律",
    editProfile: "编辑资料",
    shareProfile: "分享主页",
    follow: "关注",
    message: "私信",
    following: "关注",
    followers: "粉丝",
    likes: "获赞",
    register: "注册",
    continueGoogle: "使用 Google 继续",
    email: "邮箱",
    password: "密码",
    or: "或",
    save: "保存",
    cancel: "取消",
    comments: "评论",
    addComment: "添加评论…",
    balance: "余额",
    studio: "工作室",
    premium: "会员",
    panneau: "看板",
    theme: "主题",
    light: "浅色",
    dark: "深色",
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

function persistLocal(l: UiLang) {
  try {
    localStorage.setItem(STORAGE_KEY, l);
    document.cookie = `afrivoix_lang=${l};path=/;max-age=31536000;samesite=lax`;
    if (typeof document !== "undefined") {
      document.documentElement.lang = l === "zh" ? "zh-CN" : l;
    }
  } catch {
    /* ignore */
  }
}

function readStoredLang(): UiLang | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isUiLang(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function I18nProvider({
  children,
  initialLang = "fr",
}: {
  children: React.ReactNode;
  initialLang?: UiLang;
}) {
  const [lang, setLangState] = useState<UiLang>(normalizeUiLang(initialLang));

  useEffect(() => {
    const stored = readStoredLang();
    if (stored) {
      setLangState(stored);
      document.documentElement.lang = stored === "zh" ? "zh-CN" : stored;
    } else {
      document.documentElement.lang =
        initialLang === "zh" ? "zh-CN" : normalizeUiLang(initialLang);
    }
  }, [initialLang]);

  const setLang = useCallback((l: UiLang) => {
    const next = normalizeUiLang(l);
    setLangState(next);
    persistLocal(next);
    // Best-effort sync to User.language when logged in
    fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ language: next }),
    }).catch(() => {});
  }, []);

  const t = useCallback(
    (key: I18nKey) => {
      const dict = STRINGS[lang] || STRINGS.fr;
      return dict[key] || STRINGS.fr[key] || key;
    },
    [lang]
  );

  const value = useMemo<Ctx>(
    () => ({ lang, setLang, t }),
    [lang, setLang, t]
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
