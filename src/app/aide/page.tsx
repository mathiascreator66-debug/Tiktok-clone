"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown } from "lucide-react";
import SiteFooterLinks from "@/components/SiteFooterLinks";

const FAQ = [
  {
    q: "Comment créer un compte ?",
    a: "Allez sur Inscription, renseignez email, pseudo, pays, langue, date de naissance (13 ans min.) et acceptez les CGU. Le téléphone est optionnel (vérification SMS en phase 2).",
  },
  {
    q: "Quelle durée maximale pour une vidéo ?",
    a: "8 minutes pour les vidéos du fil, 3 minutes pour les stories. Taille max 100 Mo.",
  },
  {
    q: "Comment signaler un contenu ?",
    a: "Sur une vidéo : menu Partager → Signaler. Vous pouvez aussi signaler un utilisateur depuis son profil. Les signalements rejoignent la file de modération.",
  },
  {
    q: "Mes messages sont-ils privés ?",
    a: "Oui : authentification requise sur toutes les API DM. Un chiffrement au repos côté serveur peut être activé par l'administrateur.",
  },
  {
    q: "AfriVoix Pro et le solde ?",
    a: "Pour l'instant ce sont des crédits virtuels de démonstration. Les paiements Orange/MTN/Wave arriveront en phase 2.",
  },
  {
    q: "Comment changer la langue de l'interface ?",
    a: "Dans Paramètres, section Langue : Français, English ou 中文.",
  },
];

export default function AidePage() {
  const [open, setOpen] = useState<number | null>(0);
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/api/help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, subject, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error || "Erreur");
        return;
      }
      setStatus("Message envoyé — notre équipe vous répondra bientôt.");
      setSubject("");
      setMessage("");
    } catch {
      setStatus("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] pt-2 md:pt-16 pb-28 max-w-2xl mx-auto px-4">
      <header className="flex items-center gap-2 h-12 mb-6">
        <Link href="/" className="p-2 -ml-1 rounded-full hover:bg-white/10" aria-label="Retour">
          <ArrowLeft size={22} />
        </Link>
        <h1 className="font-bold text-lg">Centre d&apos;aide</h1>
      </header>

      <section className="mb-8">
        <h2 className="font-semibold mb-3">FAQ</h2>
        <div className="space-y-2">
          {FAQ.map((item, i) => (
            <div
              key={i}
              className="rounded-xl border border-white/10 bg-white/[0.04] overflow-hidden"
            >
              <button
                type="button"
                className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium"
                onClick={() => setOpen(open === i ? null : i)}
              >
                {item.q}
                <ChevronDown
                  size={16}
                  className={`shrink-0 transition ${open === i ? "rotate-180" : ""}`}
                />
              </button>
              {open === i && (
                <p className="px-4 pb-3 text-sm text-white/60 leading-relaxed">{item.a}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-semibold mb-3">Nous contacter</h2>
        <form onSubmit={submit} className="space-y-3 rounded-xl border border-white/10 bg-white/[0.04] p-4">
          <div>
            <label className="text-xs text-white/50">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full bg-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#d4af37]"
            />
          </div>
          <div>
            <label className="text-xs text-white/50">Sujet</label>
            <input
              type="text"
              required
              maxLength={120}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1 w-full bg-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#d4af37]"
            />
          </div>
          <div>
            <label className="text-xs text-white/50">Message</label>
            <textarea
              required
              maxLength={4000}
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1 w-full bg-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#d4af37] resize-y"
            />
          </div>
          {status && <p className="text-sm text-[#d4af37]">{status}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[#d4af37] text-black font-semibold py-2.5 disabled:opacity-50"
          >
            {loading ? "Envoi…" : "Envoyer"}
          </button>
        </form>
      </section>

      <div className="mt-10">
        <SiteFooterLinks />
      </div>
    </div>
  );
}
