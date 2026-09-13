# AfriVoix — Nos voix | Notre Afrique | Un monde meilleur

Plateforme africaine de vidéos courtes : fil vertical, comptes, upload, likes, commentaires, follows, messages privés, stories, modération et monétisation démo.

**Orthographe officielle : AfriVoix** (avec un **i**).

## Stack

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS**
- **SQLite** via **Prisma 5**
- Auth : cookies de session **JWT** (`jose`) + hachage **bcrypt** (jamais en clair) + OAuth Google optionnel
- Stockage local des médias (`public/uploads/`)
- Messages : polling ; chiffrement optionnel au repos (`MESSAGES_ENCRYPTION_KEY`)

## Prérequis

- Node.js 18+ (testé avec Node 20)
- npm
- **HTTPS en production** (terminaison TLS reverse-proxy / Cloudflare / etc.) — `APP_URL` doit être en `https://…`

## Installation

```bash
cd tiktok-clone
cp .env.example .env
# Éditez AUTH_SECRET (et optionnellement MESSAGES_ENCRYPTION_KEY)

npm install
npx prisma db push
npm run db:seed
```

## Lancer

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000).

## Comptes démo

| Email | Mot de passe | Pseudo | Notes |
|-------|--------------|--------|-------|
| demo@afrivoix.local | demo1234 | demo | Compte principal |
| alice@afrivoix.local | demo1234 | alice | |
| bob@afrivoix.local | demo1234 | bob | |
| charlie@afrivoix.local | demo1234 | charlie | Demandes DM |
| admin@afrivoix.local | demo1234 | admin | **isAdmin** → `/admin` |

## Variables d'environnement

Voir `.env.example` :

- `DATABASE_URL` — SQLite
- `AUTH_SECRET` — signature JWT
- `APP_URL` / `NEXT_PUBLIC_APP_URL` — URL publique (**HTTPS en prod**)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — OAuth optionnel
- `MESSAGES_ENCRYPTION_KEY` — chiffrement AES-256-GCM des nouveaux DM (optionnel)

Ne committez jamais `.env`.

## WAVE 1 — livré

- Rebrand **AfriVoix** + logo officiel (`/public/brand/`)
- `/a-propos`, `/cgu`, `/confidentialite`, `/aide` (+ HelpTicket)
- Inscription : pays, langue (fr|en|zh), naissance (13+), téléphone optionnel, acceptation CGU
- Admin `/admin` : rôles admin/modo, ACTIVE|SUSPENDED|BANNED, reports, journal AdminAction
- Signalements video|user|comment|story
- Hashtags (parse légende, recherche `#tag`)
- Fil « Pour toi » : score d'engagement documenté dans `src/lib/feed.ts`
- Durées : vidéos **8 min**, stories **3 min** (client + serveur / ffprobe)
- Liens cliquables (http(s), #, @) dans légendes / commentaires
- Rate limiting login/register/tips ; logs sanitizés
- i18n UI fr/en/zh (nav + paramètres)

## Hors WAVE 1 / phase 2

- Filtres caméra, Duo, OTP SMS réel, paiements Orange/MTN/Wave
- Auto-traduction contenu (LibreTranslate), carrousels photo, réutilisation son, musique galerie
- Migration complète chiffrement DM historique

## Formule feed « Pour toi »

Voir commentaires dans `src/lib/feed.ts` :

`likes + comments*2 + bookmarks + recentWatchBoost + followAffinity + hashtagAffinity + paidBoost + recencyBonus`

## Scripts

```bash
npm run db:push
npm run db:seed
npm run db:setup
npm run build
npm start
```
