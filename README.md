# ClipTok — Clone TikTok local

Application web type TikTok : fil vertical plein écran, comptes, upload vidéo, likes, commentaires, republications, profils éditables et connexion Google.

## Stack

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS**
- **SQLite** via **Prisma 5**
- Auth : cookies de session **JWT** (`jose`) + hachage **bcrypt** + OAuth Google (manuel, même cookie)
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

Le seed télécharge 5 vidéos d’exemple dans `public/uploads/` et crée 3 comptes démo.

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
- `NEXT_PUBLIC_APP_URL` — URL publique (ex. `http://localhost:3000`)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — optionnels ; sans eux le bouton Google est désactivé

### Configurer Google OAuth (FR)

1. Ouvrez [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un projet (ou sélectionnez-en un)
3. **APIs et services** → **Écran de consentement OAuth** → type « Externe » (ou Interne pour Workspace), renseignez le nom de l’app
4. **APIs et services** → **Identifiants** → **Créer des identifiants** → **ID client OAuth**
5. Type d’application : **Application Web**
6. **URI de redirection autorisés** : `http://localhost:3000/api/auth/google/callback`  
   (en prod, ajoutez aussi `https://votre-domaine/api/auth/google/callback`)
7. Copiez l’ID client et le secret dans `.env` :
   ```env
   GOOGLE_CLIENT_ID="….apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="…"
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   ```
8. Redémarrez `npm run dev` — le bouton « Continuer avec Google » s’active

La connexion Google crée ou lie un utilisateur par e-mail et pose le **même cookie JWT** que l’auth e-mail/mot de passe.

## Fonctionnalités

1. **Auth** — inscription, connexion, déconnexion, Google OAuth
2. **Fil « Pour toi »** — scroll vertical snap, autoplay muet jusqu’à interaction
3. **Upload** — vidéo courte + légende (utilisateurs connectés)
4. **Likes** — bascule + compteur
5. **Commentaires** — panneau / sheet avec liste, timestamps, liens profil, Envoyer
6. **Republication** — « Republier » (modèle Repost) mélangée au fil avec libellé « Republie @user »
7. **Partage** — Web Share API ou copie du lien (« Lien copié »)
8. **Profils** — bio, nom d’affichage, avatar URL, bouton « Modifier »
9. **Édition / suppression** — menu ⋯ sur ses vidéos (légende + supprimer fichier local)
10. **UI** — thème sombre, libellés en français, mobile-first

## Routes principales

| Route | Description |
|-------|-------------|
| `/` | Fil vertical Pour toi (originaux + republications) |
| `/connexion` | Connexion (+ Google) |
| `/inscription` | Inscription (+ Google) |
| `/telecharger` | Publier une vidéo |
| `/profil/[username]` | Profil utilisateur |
| `/profil/[username]/modifier` | Éditer son profil |
| `/api/auth/*` | Auth e-mail + Google |
| `/api/users/me` | PATCH profil (auth) |
| `/api/videos` | Liste / upload |
| `/api/videos/[id]` | PATCH légende / DELETE vidéo |
| `/api/videos/[id]/like` | Like |
| `/api/videos/[id]/comments` | Commentaires |
| `/api/videos/[id]/repost` | POST/DELETE republication |

## Limites connues

- Pas de live, Duets, algo ML, notifications push
- Vidéos démo en paysage — le lecteur utilise `object-cover`
- Upload limité à 50 Mo, stockage local uniquement
- Pas de pagination du fil (tout charge d’un coup)
- Avatar = URL externe uniquement (pas d’upload d’image v1)
- Google OAuth nécessite une config Cloud Console ; sans env vars le bouton est désactivé

## Scripts utiles

```bash
npm run db:push    # Appliquer le schéma Prisma
npm run db:seed    # Recharger les données démo
npm run db:setup   # push + seed
npm run build      # Build production
npm start          # Serveur production
```
