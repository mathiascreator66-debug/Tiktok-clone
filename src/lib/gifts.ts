/** Catalogue cadeaux vidéo (TikTok-like) — prix en crédits / centimes démo. */

export const GIFT_PLATFORM_FEE_BPS = 1000; // 10 %

export type GiftCatalogItem = {
  id: string;
  emoji: string;
  label: string;
  priceCents: number;
};

export const GIFT_CATALOG: GiftCatalogItem[] = [
  { id: "heart", emoji: "❤️", label: "Cœur", priceCents: 50 },
  { id: "rose", emoji: "🌹", label: "Rose", priceCents: 100 },
  { id: "fire", emoji: "🔥", label: "Feu", priceCents: 200 },
  { id: "star", emoji: "⭐", label: "Étoile", priceCents: 300 },
  { id: "lion", emoji: "🦁", label: "Lion", priceCents: 500 },
  { id: "crown", emoji: "👑", label: "Couronne", priceCents: 1000 },
  { id: "diamond", emoji: "💎", label: "Diamant", priceCents: 2000 },
];

export function getGiftById(id: string): GiftCatalogItem | undefined {
  return GIFT_CATALOG.find((g) => g.id === id);
}

export function giftFeeCents(grossCents: number): number {
  return Math.floor((grossCents * GIFT_PLATFORM_FEE_BPS) / 10_000);
}
