"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import BrandLogo from "./BrandLogo";
import { COUNTRIES, LANG_OPTIONS } from "@/lib/countries";

type Mode = "login" | "register";

const GOOGLE_ERRORS: Record<string, string> = {
  google_non_configure: "Connexion Google non configurée sur ce serveur.",
  google_annule: "Connexion Google annulée.",
  google_echec: "Échec de la connexion Google. Réessayez.",
  google_email_requis: "Google n'a pas fourni d'email.",
};

export default function AuthForm({
  mode,
  googleEnabled,
}: {
  mode: Mode;
  googleEnabled: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("SN");
  const [language, setLanguage] = useState("fr");
  const [birthdate, setBirthdate] = useState("");
  const [phoneCountry, setPhoneCountry] = useState("+221");
  const [phone, setPhone] = useState("");
  const [acceptCgu, setAcceptCgu] = useState(false);
  const [error, setError] = useState(
    () => GOOGLE_ERRORS[searchParams.get("erreur") || ""] || ""
  );
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const url = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body =
        mode === "login"
          ? { email, password }
          : {
              email,
              username,
              password,
              country,
              language,
              birthdate,
              phoneE164: phone.trim()
                ? `${phoneCountry}${phone.replace(/\D/g, "")}`
                : undefined,
              phoneCountry,
              acceptCgu,
            };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-4 py-10 bg-black">
      <div className="mb-6 flex flex-col items-center">
        <BrandLogo variant="full" priority href="/" className="mb-2" />
      </div>

      <div className="w-full max-w-sm space-y-4 bg-white/5 border border-white/10 rounded-2xl p-6">
        <h1 className="text-xl font-bold text-center mb-2">
          {mode === "login" ? "Connexion" : "Créer un compte"}
        </h1>

        {googleEnabled ? (
          <a
            href="/api/auth/google"
            className="w-full flex items-center justify-center gap-2 bg-white text-black hover:bg-white/90 rounded-full py-2.5 font-semibold transition text-sm"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continuer avec Google
          </a>
        ) : (
          <button
            type="button"
            disabled
            title="Ajoutez GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET et APP_URL dans .env"
            className="w-full flex items-center justify-center gap-2 bg-white/10 text-white/40 rounded-full py-2.5 font-semibold text-sm cursor-not-allowed"
          >
            Continuer avec Google
          </button>
        )}
        {!googleEnabled && (
          <p className="text-[11px] text-white/35 text-center -mt-2">
            Google non configuré — voir README / .env.example
          </p>
        )}

        <div className="flex items-center gap-3 text-white/30 text-xs">
          <div className="flex-1 h-px bg-white/10" />
          ou
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs text-white/50 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#d4af37]"
              placeholder="vous@exemple.com"
            />
          </div>

          {mode === "register" && (
            <>
              <div>
                <label className="block text-xs text-white/50 mb-1">
                  Nom d&apos;utilisateur
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={3}
                  pattern="[a-zA-Z0-9_]+"
                  className="w-full bg-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#d4af37]"
                  placeholder="votre_pseudo"
                />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Pays</label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  required
                  className="w-full bg-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#d4af37]"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code} className="bg-black">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Langue</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#d4af37]"
                >
                  {LANG_OPTIONS.map((l) => (
                    <option key={l.code} value={l.code} className="bg-black">
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">
                  Date de naissance (13 ans minimum)
                </label>
                <input
                  type="date"
                  value={birthdate}
                  onChange={(e) => setBirthdate(e.target.value)}
                  required
                  className="w-full bg-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#d4af37]"
                />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">
                  Téléphone (optionnel — SMS phase 2)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={phoneCountry}
                    onChange={(e) => setPhoneCountry(e.target.value)}
                    className="w-20 bg-white/10 rounded-lg px-2 py-2.5 text-sm outline-none"
                    placeholder="+221"
                  />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="flex-1 bg-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#d4af37]"
                    placeholder="77 000 00 00"
                  />
                </div>
              </div>
              <label className="flex items-start gap-2 text-xs text-white/70 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptCgu}
                  onChange={(e) => setAcceptCgu(e.target.checked)}
                  required
                  className="mt-0.5"
                />
                <span>
                  J&apos;accepte les{" "}
                  <Link href="/cgu" className="text-[#d4af37] underline" target="_blank">
                    Conditions générales d&apos;utilisation
                  </Link>{" "}
                  et la{" "}
                  <Link
                    href="/confidentialite"
                    className="text-[#d4af37] underline"
                    target="_blank"
                  >
                    Politique de confidentialité
                  </Link>
                  .
                </span>
              </label>
            </>
          )}

          <div>
            <label className="block text-xs text-white/50 mb-1">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#d4af37]"
              placeholder="••••••••"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>

          {error && <p className="text-[#fe2c55] text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#d4af37] hover:bg-[#c4a030] text-black disabled:opacity-50 rounded-full py-2.5 font-semibold transition"
          >
            {loading
              ? "Chargement..."
              : mode === "login"
                ? "Se connecter"
                : "S'inscrire"}
          </button>
        </form>

        <p className="text-center text-sm text-white/50">
          {mode === "login" ? (
            <>
              Pas encore de compte ?{" "}
              <Link href="/inscription" className="text-[#25f4ee] hover:underline">
                S&apos;inscrire
              </Link>
            </>
          ) : (
            <>
              Déjà un compte ?{" "}
              <Link href="/connexion" className="text-[#25f4ee] hover:underline">
                Se connecter
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
