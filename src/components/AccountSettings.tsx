"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, Download, LogOut } from "lucide-react";

type User = {
  email: string | null;
  username: string;
  displayName: string | null;
  hasPassword: boolean;
  phoneE164: string | null;
};

export default function AccountSettings({ user }: { user: User }) {
  const router = useRouter();
  const [view, setView] = useState<"menu" | "info" | "password" | "phone">("menu");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [phoneCountry, setPhoneCountry] = useState("+221");
  const [phone, setPhone] = useState("");
  const [phoneSaved, setPhoneSaved] = useState(user.phoneE164);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  async function onChangePassword(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    if (newPassword !== confirm) {
      setErr("Les mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error || "Échec");
        return;
      }
      setMsg("Mot de passe mis à jour.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
    } finally {
      setLoading(false);
    }
  }

  async function onAddPhone(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setLoading(true);
    try {
      const phoneE164 = `${phoneCountry}${phone.replace(/\D/g, "")}`;
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneE164, phoneCountry }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error || "Échec");
        return;
      }
      setPhoneSaved(data.user?.phoneE164 || phoneE164);
      setMsg("Téléphone ajouté.");
      setView("menu");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (view === "info") {
    return (
      <Shell title="Informations du compte" onBack={() => setView("menu")}>
        <div className="rounded-xl bg-white/[0.06] border border-white/10 divide-y divide-white/5">
          <Row label="E-mail" value={user.email || "— (non renseigné)"} />
          <Row label="Téléphone" value={phoneSaved || "— (non renseigné)"} />
          <Row label="Nom d'utilisateur" value={`@${user.username}`} />
          <Row label="Nom" value={user.displayName || "—"} />
        </div>
        <p className="text-xs text-white/35 mt-4 px-1">
          Pour modifier le pseudo ou le nom, utilisez « Modifier le profil ».
        </p>
        <Link
          href={`/profil/${user.username}/modifier`}
          className="inline-block mt-3 text-sm font-semibold text-[#25f4ee]"
        >
          Modifier le profil →
        </Link>
      </Shell>
    );
  }

  if (view === "password") {
    return (
      <Shell title="Mot de passe" onBack={() => setView("menu")}>
        {!user.hasPassword ? (
          <p className="text-sm text-white/50">
            Ce compte n&apos;a pas de mot de passe (connexion Google).
          </p>
        ) : (
          <form onSubmit={onChangePassword} className="space-y-3">
            <Field
              label="Mot de passe actuel"
              type="password"
              value={currentPassword}
              onChange={setCurrentPassword}
              required
            />
            <Field
              label="Nouveau mot de passe"
              type="password"
              value={newPassword}
              onChange={setNewPassword}
              required
              minLength={6}
            />
            <Field
              label="Confirmer"
              type="password"
              value={confirm}
              onChange={setConfirm}
              required
              minLength={6}
            />
            {err && <p className="text-sm text-[#fe2c55]">{err}</p>}
            {msg && <p className="text-sm text-emerald-400">{msg}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#fe2c55] font-semibold py-2.5 rounded-lg disabled:opacity-50"
            >
              {loading ? "…" : "Enregistrer"}
            </button>
          </form>
        )}
      </Shell>
    );
  }

  if (view === "phone") {
    return (
      <Shell title="Ajouter un téléphone" onBack={() => setView("menu")}>
        <p className="text-sm text-white/50 mb-4">
          Ajoutez un numéro pour sécuriser votre compte (pas de SMS OTP dans
          cette version).
        </p>
        <form onSubmit={onAddPhone} className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={phoneCountry}
              onChange={(e) => setPhoneCountry(e.target.value)}
              className="w-20 bg-white/10 rounded-lg px-2 py-2.5 text-sm outline-none"
              placeholder="+221"
              required
            />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="flex-1 bg-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#25f4ee]/50"
              placeholder="77 000 00 00"
              required
            />
          </div>
          {err && <p className="text-sm text-[#fe2c55]">{err}</p>}
          {msg && <p className="text-sm text-emerald-400">{msg}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#fe2c55] font-semibold py-2.5 rounded-lg disabled:opacity-50"
          >
            {loading ? "…" : "Enregistrer le téléphone"}
          </button>
        </form>
      </Shell>
    );
  }

  return (
    <Shell title="Compte" backHref="/parametres">
      {user.email && !phoneSaved && (
        <button
          type="button"
          onClick={() => setView("phone")}
          className="mb-4 w-full text-left rounded-xl border border-[#d4af37]/40 bg-[#d4af37]/10 px-4 py-3"
        >
          <p className="text-sm font-semibold text-[#d4af37]">
            Ajouter un téléphone
          </p>
          <p className="text-xs text-white/50 mt-0.5">
            Sécurisez votre compte e-mail avec un numéro (optionnel).
          </p>
        </button>
      )}

      <div className="rounded-xl bg-white/[0.06] border border-white/10 overflow-hidden divide-y divide-white/5">
        <button
          type="button"
          onClick={() => setView("info")}
          className="w-full flex items-center justify-between px-4 py-4 hover:bg-white/5 text-left"
        >
          <span className="font-medium">Informations du compte</span>
          <ChevronRight size={18} className="text-white/30" />
        </button>
        <button
          type="button"
          onClick={() => setView("password")}
          className="w-full flex items-center justify-between px-4 py-4 hover:bg-white/5 text-left"
        >
          <div>
            <p className="font-medium">Mot de passe</p>
            <p className="text-xs text-white/40 mt-0.5">
              Changer votre mot de passe de connexion
            </p>
          </div>
          <ChevronRight size={18} className="text-white/30 shrink-0" />
        </button>
        {!phoneSaved && (
          <button
            type="button"
            onClick={() => setView("phone")}
            className="w-full flex items-center justify-between px-4 py-4 hover:bg-white/5 text-left"
          >
            <div>
              <p className="font-medium">Ajouter un téléphone</p>
              <p className="text-xs text-white/40 mt-0.5">
                Optionnel — sécurité du compte
              </p>
            </div>
            <ChevronRight size={18} className="text-white/30 shrink-0" />
          </button>
        )}
        <a
          href="/api/me/export"
          className="w-full flex items-center justify-between px-4 py-4 hover:bg-white/5 text-left"
        >
          <div className="flex items-center gap-3">
            <Download size={18} className="text-white/60" />
            <div>
              <p className="font-medium">Télécharger tes données</p>
              <p className="text-xs text-white/40 mt-0.5">
                Export JSON du profil, vidéos, commentaires et abonnements
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-white/30 shrink-0" />
        </a>
      </div>

      <button
        type="button"
        onClick={logout}
        className="mt-8 w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-white/15 text-[#fe2c55] font-semibold hover:bg-white/5"
      >
        <LogOut size={18} />
        Déconnexion
      </button>
    </Shell>
  );
}

function Shell({
  title,
  children,
  onBack,
  backHref,
}: {
  title: string;
  children: React.ReactNode;
  onBack?: () => void;
  backHref?: string;
}) {
  return (
    <div className="min-h-[100dvh] pt-2 md:pt-16 pb-24 max-w-lg mx-auto px-3">
      <header className="flex items-center gap-2 h-12 mb-4">
        {backHref ? (
          <Link
            href={backHref}
            className="p-2 -ml-1 rounded-full hover:bg-white/10"
            aria-label="Retour"
          >
            <ArrowLeft size={22} />
          </Link>
        ) : (
          <button
            type="button"
            onClick={onBack}
            className="p-2 -ml-1 rounded-full hover:bg-white/10"
            aria-label="Retour"
          >
            <ArrowLeft size={22} />
          </button>
        )}
        <h1 className="font-bold text-lg">{title}</h1>
      </header>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3.5 flex justify-between gap-4">
      <span className="text-white/50 text-sm">{label}</span>
      <span className="font-medium text-sm text-right truncate">{value}</span>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  required,
  minLength,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <label className="block">
      <span className="text-xs text-white/50 mb-1 block">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        minLength={minLength}
        className="w-full bg-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#25f4ee]/50"
      />
    </label>
  );
}
