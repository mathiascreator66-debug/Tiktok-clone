# ClipTok — Clone TikTok local

Application web type TikTok : fil vertical plein écran, comptes, upload vidéo, likes, commentaires, republications, **follows**, **messages privés**, profils et paramètres.

## Stack

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS**
- **SQLite** via **Prisma 5**
- Auth : cookies de session **JWT** (`jose`) + hachage **bcrypt** + OAuth Google (manuel, même cookie)
- Stockage des vidéos sur le disque local (`public/uploads/`)
- Messages : polling (pas de WebSocket)

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

Le seed télécharge 5 vidéos d’exemple dans `public/uploads/`, crée 4 comptes démo, des **follows** et des **conversations DM** d’exemple.

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
| charlie@cliptok.local | demo1234 | charlie |

### Tester les messages (2 comptes)

1. Connexion `demo@cliptok.local` / `demo1234` → onglet **Messages** : conversations avec Alice, Bob + demande de Charlie.
2. Ouvrir un fil, répondre.
3. Déconnexion → connexion `alice@cliptok.local` / `demo1234` → Messages → conversation avec Démo (polling ~4 s).
4. Depuis un profil (ex. `/profil/bob`), bouton **Message** ouvre/crée le fil.

Onglets inbox : **Principal** (personnes que vous suivez), **Demandes** (ex. Charlie → demo), **Non lu**.

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

## Fonctionnalités

1. **Auth** — inscription, connexion, déconnexion, Google OAuth, changement de mot de passe
2. **Fil « Pour toi »** — scroll vertical snap, autoplay muet jusqu’à interaction
3. **Upload** — vidéo courte + légende
4. **Likes / commentaires / republications / partage**
5. **Follows** — Suivre / Ne plus suivre ; stats Suivis / Followers / J’aime sur le profil
6. **Amis** — liste des suivis + suggestions
7. **Messages privés** — inbox (Principal / Demandes / Non lu), fil de discussion, badge non lus, polling
8. **Profil** — grille vidéos, crayon d’édition, bouton Message, menu hamburger → paramètres
9. **Paramètres** — compte (infos, mot de passe, déconnexion) ; autres entrées stub « bientôt »
10. **Nav mobile** — Accueil | Amis | + | Messages | Profil

## Routes principales

| Route | Description |
|-------|-------------|
| `/` | Fil Pour toi |
| `/amis` | Suivis + suggestions |
| `/messages` | Inbox DM |
| `/messages/[username]` | Fil de discussion |
| `/telecharger` | Studio — Publier / Story |
| `/recherche` | Recherche comptes + vidéos |
| `/historique` | Historique de visionnage |
| `/profil/[username]` | Profil |
| `/profil/[username]/modifier` | Éditer le profil |
| `/parametres` | Paramètres et confidentialité |
| `/parametres/compte` | Infos compte / mot de passe / logout |
| `/api/follow/[username]` | POST/DELETE follow |
| `/api/messages` | Liste conversations |
| `/api/messages/[username]` | GET/POST fil |
| `/api/messages/unread` | Compteur non lus |
| `/api/auth/password` | Changer le mot de passe |

## Schéma (extra)

- `Follow` — followerId / followingId (unique)
- `Conversation` — participantAId / participantBId (IDs ordonnés, unique)
- `Message` — conversationId, senderId, body, createdAt, readAt?

## Hors périmètre / stubbés

- Solde, LIVE, Shop, Famille, passkeys, succession, analytics, promouvoir, Studio, QR, hors ligne, Stories (badge « bientôt »)
- Pas de WebSocket (polling), pas de paiements

## Limites connues

- Pas de live, Duets, algo ML, notifications push
- Vidéos démo en paysage — le lecteur utilise `object-cover`
- Upload limité à 100 Mo (104 857 600 octets), stockage local uniquement
- Pas de pagination du fil
- Avatar = URL externe uniquement
- Google OAuth optionnel

## Scripts utiles

```bash
npm run db:push    # Appliquer le schéma Prisma
npm run db:seed    # Recharger les données démo
npm run db:setup   # push + seed
npm run build      # Build production
npm start          # Serveur production
```
