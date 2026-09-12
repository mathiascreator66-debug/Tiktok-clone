"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "./Avatar";
import Link from "next/link";
import { Camera } from "lucide-react";

type User = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
};

export default function EditProfileForm({ user }: { user: User }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState(user.username);
  const [displayName, setDisplayName] = useState(user.displayName || "");
  const [bio, setBio] = useState(user.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || "");
  const [externalUrl, setExternalUrl] = useState(
    user.avatarUrl && !user.avatarUrl.startsWith("/uploads/")
      ? user.avatarUrl
      : ""
  );
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);

  async function onAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Image trop lourde (max 5 Mo).");
      return;
    }
    setAvatarUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("avatar", file);
      const res = await fetch("/api/users/me/avatar", {
        method: "POST",
        body: form,
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Échec de l'envoi de la photo.");
        return;
      }
      setAvatarUrl(data.user.avatarUrl || "");
      setExternalUrl("");
      setOk(true);
    } catch {
      setError("Erreur réseau.");
    } finally {
      setAvatarUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setOk(false);
    try {
      const nextAvatar =
        externalUrl.trim() ||
        (avatarUrl.startsWith("/uploads/") ? avatarUrl : null) ||
        null;
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          displayName: displayName.trim() || null,
          bio: bio.trim() || null,
          avatarUrl: nextAvatar,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur");
        return;
      }
      setOk(true);
      router.push(`/profil/${data.user.username}`);
      router.refresh();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-md mx-auto space-y-5">
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative group"
          aria-label="Changer la photo de profil"
        >
          <Avatar
            username={username || user.username}
            avatarUrl={avatarUrl || null}
            size={96}
          />
          <span className="absolute inset-0 rounded-full bg-black/45 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
            <Camera size={22} />
          </span>
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={avatarUploading}
          className="text-sm font-semibold text-[#25f4ee] disabled:opacity-50"
        >
          {avatarUploading ? "Envoi…" : "Changer la photo"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={onAvatarFile}
        />
      </div>

      <div>
        <label className="block text-sm text-white/60 mb-1.5">
          Nom d&apos;utilisateur
        </label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          minLength={3}
          pattern="[a-zA-Z0-9_]+"
          required
          className="w-full bg-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#fe2c55]"
        />
        <p className="text-[11px] text-white/35 mt-1">
          Lettres, chiffres et _ uniquement
        </p>
      </div>

      <div>
        <label className="block text-sm text-white/60 mb-1.5">
          Nom d&apos;affichage
        </label>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={50}
          placeholder="Optionnel"
          className="w-full bg-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#fe2c55]"
        />
      </div>

      <div>
        <label className="block text-sm text-white/60 mb-1.5">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          maxLength={300}
          placeholder="Parlez un peu de vous…"
          className="w-full bg-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-[#fe2c55] resize-none"
        />
        <p className="text-[11px] text-white/35 mt-1 text-right">
          {bio.length}/300
        </p>
      </div>

      <div>
        <label className="block text-sm text-white/60 mb-1.5">
          URL de l&apos;avatar (optionnel)
        </label>
        <input
          type="url"
          value={externalUrl}
          onChange={(e) => {
            setExternalUrl(e.target.value);
            if (e.target.value.trim()) setAvatarUrl(e.target.value.trim());
          }}
          placeholder="https://…"
          className="w-full bg-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#fe2c55]"
        />
        <p className="text-[11px] text-white/35 mt-1">
          Préférez « Changer la photo » ci-dessus. Une URL externe remplace la
          photo locale.
        </p>
      </div>

      {error && <p className="text-[#fe2c55] text-sm">{error}</p>}
      {ok && <p className="text-[#25f4ee] text-sm">Profil mis à jour.</p>}

      <div className="flex gap-3">
        <Link
          href={`/profil/${user.username}`}
          className="flex-1 text-center border border-white/15 rounded-full py-2.5 text-sm font-semibold hover:bg-white/5"
        >
          Annuler
        </Link>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-[#fe2c55] hover:bg-[#e0264c] disabled:opacity-50 rounded-full py-2.5 text-sm font-semibold"
        >
          {loading ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
