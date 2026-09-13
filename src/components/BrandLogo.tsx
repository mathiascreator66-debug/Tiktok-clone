"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";

type Props = {
  /** icon = emblem only; full = complete vertical logo; wordmark = icon + AfriVoix text */
  variant?: "icon" | "full" | "wordmark";
  href?: string | null;
  className?: string;
  /** pixel height for icon / wordmark */
  size?: number;
  priority?: boolean;
};

/**
 * Official AfriVoix brand mark (user-provided). Black-bg logo — sits on black UI as-is.
 */
export default function BrandLogo({
  variant = "wordmark",
  href = "/",
  className = "",
  size = 28,
  priority = false,
}: Props) {
  const iconSrc = "/brand/afrivoix-icon-192.png";
  const fullSrc = "/brand/afrivoix-logo.png";

  let inner: ReactNode;
  if (variant === "full") {
    inner = (
      <Image
        src={fullSrc}
        alt="AfriVoix — Nos voix | Notre Afrique | Un monde meilleur"
        width={280}
        height={280}
        className="w-full max-w-[240px] h-auto object-contain"
        priority={priority}
      />
    );
  } else if (variant === "icon") {
    inner = (
      <Image
        src={iconSrc}
        alt="AfriVoix"
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
        priority={priority}
      />
    );
  } else {
    inner = (
      <span className="inline-flex items-center gap-2">
        <Image
          src={iconSrc}
          alt=""
          width={size}
          height={size}
          className="rounded-full object-cover shrink-0"
          style={{ width: size, height: size }}
          priority={priority}
        />
        <span className="font-extrabold tracking-tight text-lg leading-none">
          <span className="text-white">Afri</span>
          <span className="text-[#d4af37]">Voix</span>
        </span>
      </span>
    );
  }

  if (href === null) {
    return <span className={className}>{inner}</span>;
  }
  return (
    <Link href={href} className={`inline-flex ${className}`} aria-label="AfriVoix">
      {inner}
    </Link>
  );
}
