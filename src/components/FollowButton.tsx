"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  username: string;
  initialFollowing: boolean;
  size?: "sm" | "md";
  onChange?: (following: boolean) => void;
};

export default function FollowButton({
  username,
  initialFollowing,
  size = "md",
  onChange,
}: Props) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (loading) return;
    setLoading(true);
    const method = following ? "DELETE" : "POST";
    try {
      const res = await fetch(`/api/follow/${encodeURIComponent(username)}`, {
        method,
      });
      if (res.status === 401) {
        router.push("/connexion");
        return;
      }
      if (!res.ok) return;
      const next = !following;
      setFollowing(next);
      onChange?.(next);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const pad = size === "sm" ? "px-3 py-1 text-xs" : "px-5 py-2 text-sm";

  if (following) {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={loading}
        className={`${pad} rounded-md font-semibold bg-white/10 border border-white/20 hover:bg-white/15 disabled:opacity-50`}
      >
        Suivi(e)
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className={`${pad} rounded-md font-semibold bg-[#fe2c55] hover:bg-[#e62a4f] disabled:opacity-50`}
    >
      Suivre
    </button>
  );
}
