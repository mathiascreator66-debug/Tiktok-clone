# ClipTok — Clone TikTok local (v1)

Application web type TikTok : fil vertical plein écran, comptes, upload vidéo, likes et commentaires.

## Stack

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS**
- **SQLite** via **Prisma 5**
- Auth : cookies de session **JWT** (`jose`) + hachage **bcrypt**
- Stockage des vidéos sur le disque local (`public/uploads/`)

## Prérequis

- Node.js 18+ (testé avec Node 20)
- npm

## Installation

```bash
cd tiktok-clone
cp .env.example .env
# Éditez AUTH_SECRET si besoin (déjà prérempli pour le démo)

npm install
npx prisma db push
npm run db:seed
```

Le seed télécharge 5 vidéos d’exemple (SampleLib / test-videos.co.uk) dans `public/uploads/` et crée 3 comptes démo.

## Lancer l’app

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000).

## Comptes démo

| Email | Mot de passe | Pseudo |
|-------|--------------|--------|
| demo@cliptok.local | demo1234 | demo |
| alice@cliptok.local | demo1234 | alice |
| bob@cliptok.local | demo1234 | bob |

## Variables d’environnement

Voir `.env.example` :

- `DATABASE_URL` — chemin SQLite (défaut : `file:./dev.db` relatif à `prisma/`)
- `AUTH_SECRET` — secret pour signer les JWT de session

## Fonctionnalités

1. **Auth** — inscription, connexion, déconnexion
2. **Fil « Pour toi »** — scroll vertical snap, autoplay muet jusqu’à interaction
3. **Upload** — vidéo courte + légende (utilisateurs connectés)
4. **Likes** — bascule + compteur
5. **Commentaires** — liste + publication
6. **Profils** — pseudo, avatar placeholder, grille de vidéos
7. **UI** — thème sombre, libellés en français, mobile-first

## Routes principales

| Route | Description |
|-------|-------------|
| `/` | Fil vertical Pour toi |
| `/connexion` | Connexion |
| `/inscription` | Inscription |
| `/telecharger` | Publier une vidéo |
| `/profil/[username]` | Profil utilisateur |
| `/api/auth/*` | API auth |
| `/api/videos` | Liste / upload |
| `/api/videos/[id]/like` | Like |
| `/api/videos/[id]/comments` | Commentaires |

## Limites connues (v1)

- Pas de live, Duets, algo ML, notifications push
- Vidéos démo en paysage (samples Google) — le lecteur utilise `object-cover`
- Upload limité à 50 Mo, stockage local uniquement
- Pas de pagination du fil (tout charge d’un coup)

## Scripts utiles

```bash
npm run db:push    # Appliquer le schéma Prisma
npm run db:seed    # Recharger les données démo
npm run db:setup   # push + seed
npm run build      # Build production
npm start          # Serveur production
```
