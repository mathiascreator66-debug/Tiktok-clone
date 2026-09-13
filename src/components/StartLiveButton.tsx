"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Radio } from "lucide-react";

export default function StartLiveButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("En direct");
  const [error, setError] = useState("");

  async function start() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/lives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur");
        return;
      }
      router.push(`/live/${data.live.id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={80}
        placeholder="Titre du live"
        className="w-full bg-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-[#fe2c55]"
      />
      {error && <p className="text-xs text-[#fe2c55]">{error}</p>}
      <button
        type="button"
        onClick={start}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full bg-[#fe2c55] font-bold text-sm disabled:opacity-40"
      >
        <Radio size={18} /> {loading ? "Démarrage…" : "Passer en LIVE"}
      </button>
    </div>
  );
}
