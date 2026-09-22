# Africa Live

## Accueil et authentification Clerk

La configuration de développement actuelle utilise la landing page publique et
les formulaires Clerk sur `/sign-in` et `/sign-up`, avec retour par défaut vers
`/app`. Les routes catalogue, compte et administration exigent une connexion.
L'accès au catalogue conserve les règles d'essai et d'abonnement existantes.

Dans `.env.local`, renseigner les deux clés de la même instance Clerk Development,
et définir `LOCAL_DEV_MODE=false`, `NEXT_PUBLIC_LOCAL_DEV_MODE=false`,
`ENABLE_LOCAL_VLC=false`. Conserver `africa_live_dev` et localhost:3001.
Ne jamais publier ce fichier. Le rôle propriétaire se configure selon
[admin-access.md](docs/admin-access.md).

```powershell
npm run dev
```

Les nouveaux essais d'entrée authentifiée sont dans `e2e/auth-entry.spec.ts`.
Ils vérifient l'accueil, le chargement des formulaires et les refus anonymes ;
ils ne simulent pas un utilisateur connecté ou un paiement réel.
L'horloge Windows doit être synchronisée pour la validation des jetons Clerk.

## Mode MVP local sans authentification

Le fonctionnement ci-dessous reste disponible en définissant ensemble
`LOCAL_DEV_MODE=true`, `NEXT_PUBLIC_LOCAL_DEV_MODE=true` et
`ENABLE_LOCAL_VLC=true` dans la configuration locale, puis en redémarrant.
Ces réglages ne sont jamais utilisables en production.

Application indépendante d’IPTV : catalogue complet, recherche, filtres,
favoris locaux, lecture navigateur directe et secours VLC automatique.
Les contrôles de disponibilité repris d’IPTV sont historiques ; ils ne prouvent
pas que les sources fonctionnent aujourd’hui. Toutes les chaînes restent
cliquables pour une nouvelle tentative locale.

## Démarrage

La base est déjà préparée sur cette machine. Ce parcours nécessite le mode MVP
local décrit ci-dessus.

```powershell
npm run dev
```

Ouvrir http://localhost:3001. Le port 3001 permet de conserver IPTV sur 3000.
Le serveur écoute uniquement sur l’adresse de boucle locale. Aucun compte
Clerk et aucun abonnement ne sont nécessaires en développement local.

Le fichier `Demarrer Africa Live.bat` lance également l’application.

## Lecture et VLC

Cliquer sur une chaîne ouvre le lecteur. Jusqu’à trois sources web sont essayées
automatiquement ; si aucune ne fonctionne, VLC est lancé avec une source du
catalogue. Une source déjà connue comme incompatible avec le navigateur passe
directement à VLC. Les contrôles expirés, anciens échecs et URLs avec paramètres
n’empêchent pas les essais locaux ; aucun ancien statut n’est transformé en
succès sans vérification réelle.

Le navigateur utilise HLS.js, le HLS natif ou l’élément vidéo pour les fichiers
compatibles. Le chargement initial est limité à 12 secondes et le démarrage à
8 secondes après préparation du manifeste. Un blocage de lecture automatique
par le navigateur affiche un bouton de lecture ; il ne provoque pas un lancement
VLC automatique.

VLC doit être installé sur la même machine que le serveur local. Sous Windows,
les installations usuelles sont détectées automatiquement. Pour une installation
personnalisée, définir `VLC_PATH` dans `.env.local`. Le mode local active
`ENABLE_LOCAL_VLC=true`. Le bouton VLC permet aussi une ouverture manuelle ou
une nouvelle tentative après une erreur. Un lancement réussi confirme la
transmission du lien au lecteur, pas la disponibilité du diffuseur.

Les sources restent téléchargées directement par le navigateur ou VLC.
Africa Live ne télécharge pas les vidéos et ne convertit aucun flux.

## Installation initiale sur une autre copie

Prérequis : Node.js 22 ou ultérieur compatible avec les dépendances, PostgreSQL
et un projet IPTV possédant un `.env.local` avec `DATABASE_URL`.

```powershell
npm ci
npm run setup:local -- "C:\Users\GAMER PC\IPTV"
npm run dev
```

La commande crée `africa_live_dev` sur le même serveur PostgreSQL, applique les
migrations et copie uniquement les chaînes, sources et métadonnées d’import.
Elle lit la base IPTV dans une transaction en lecture seule et vérifie que les
chaînes et sources copiées sont identiques. Un utilisateur technique propre au
MVP est créé pour les favoris. Aucun compte ni historique IPTV n’est copié.

La commande refuse d’écraser un catalogue cible existant et un fichier
`.env.local` existant. Les identifiants restent dans `.env.local`, ignoré par Git.
Ne pas remplacer `DATABASE_URL` par la base utilisée par IPTV.

## Contrat du MVP

- Toutes les chaînes actives du catalogue source restent visibles, y compris
  celles sans contrôle réussi. Les filtres sont facultatifs.
- L’application ne sert ni vidéo, ni playlist de lecture, ni segment.
- Le mode sans authentification exige `LOCAL_DEV_MODE=true`, est limité à
  localhost et ne s’active jamais en production.
- L’intégration VLC exige une requête locale de même origine et refuse une URL
  arbitraire fournie par le client. Les demandes identiques de lancement sont
  regroupées pendant cinq minutes dans le processus local.
- Cette version n’est pas un déploiement SaaS et ne traite aucun paiement réel.

## Vérification

La configuration et les commandes de préparation à la production sont décrites
dans [deployment-configuration.md](docs/deployment-configuration.md).
Le suivi des lots figure dans [production-progress.md](docs/production-progress.md).
L'exploitation de la préproduction est décrite dans
[railway-preproduction-runbook.md](docs/railway-preproduction-runbook.md).

```powershell
npm test
npm run test:integration
npm run config:check
npm run diagnose:local
npm run backup:restore-drill:local
npm run test:invariants
npm run lint
npx tsc --noEmit --incremental false
npm run db:check:migrations
npm run db:check
npm run build
npx playwright test e2e/local-mvp.spec.ts
npx playwright test e2e/local-playback.spec.ts e2e/local-playback-api.spec.ts
```

Les essais navigateur locaux utilisent Edge sous Windows. Un autre navigateur
peut être sélectionné avec `PLAYWRIGHT_CHANNEL`. Les anciennes suites Clerk
restent réservées à une session dédiée et ne constituent pas les essais du MVP.

Les fichiers vidéo synthétiques dans `e2e/fixtures/hls` servent uniquement aux
essais navigateur et ne sont pas exposés par l’application. FFmpeg a été utilisé
pour fabriquer ces fixtures de test ; il n’est pas utilisé par le lecteur,
l’API ni le serveur Africa Live.
