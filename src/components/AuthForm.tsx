"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Mode = "login" | "register";

export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
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
          : { email, username, password };
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
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-4 bg-black">
      <Link href="/" className="text-3xl font-extrabold mb-8">
        <span className="text-[#fe2c55]">Clip</span>
        <span className="text-white">Tok</span>
      </Link>

      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-4 bg-white/5 border border-white/10 rounded-2xl p-6"
      >
        <h1 className="text-xl font-bold text-center mb-2">
          {mode === "login" ? "Connexion" : "Créer un compte"}
        </h1>

        <div>
          <label className="block text-xs text-white/50 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#fe2c55]"
            placeholder="vous@exemple.com"
          />
        </div>

        {mode === "register" && (
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
              className="w-full bg-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#fe2c55]"
              placeholder="votre_pseudo"
            />
          </div>
        )}

        <div>
          <label className="block text-xs text-white/50 mb-1">Mot de passe</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full bg-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#fe2c55]"
            placeholder="••••••••"
          />
        </div>

        {error && <p className="text-[#fe2c55] text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#fe2c55] hover:bg-[#e0264c] disabled:opacity-50 rounded-full py-2.5 font-semibold transition"
        >
          {loading
            ? "Chargement..."
            : mode === "login"
              ? "Se connecter"
              : "S'inscrire"}
        </button>

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
      </form>
    </div>
  );
}
