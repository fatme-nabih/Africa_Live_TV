# Publication Premium P6 « Performance mobile » — 4 octobre 2026

Le propriétaire a explicitement demandé : commit, publication sur staging, puis mesure Lighthouse sur staging.

## Périmètre

- Lot P6 (UX-601 → UX-606) : commit applicatif
  [`7e27319`](https://github.com/fatme-nabih/Africa_Live_TV/commit/7e27319) (39 fichiers), puis commit documentaire
  [`c710769`](https://github.com/fatme-nabih/Africa_Live_TV/commit/c710769). Détail : section « Lot P6 » de
  [production-progress.md](production-progress.md) ; mesures : [audit, section P6](audit-a11y-performance-2026-10-03.md).
- GitHub : `fatme-nabih/Africa_Live_TV`, `main`. Railway : `just-compassion`, service `Africa_Live_TV`, rôle **staging**. Pas de promotion
  en production. Aucune variable, DNS, plan ou configuration Clerk modifiés.

## Contrôles avant publication

- `origin/main` = `f260400` (synchronisé) ; recherche de secrets sur les 61 fichiers modifiés : aucun ; aucun fichier privé.
- Aucun changement de schéma ni de dépendance (`drizzle/`, `src/db`, `package.json`, `package-lock.json` inchangés) : pas de
  sauvegarde requise, pré-déploiement `db:migrate:deploy` sans effet.
- Code : tsc 0, lint 0, 360 tests (346/14/0), invariants 4/4, build ; E2E MVP 141 + 1 ignoré, 5 échecs corrigés et specs rejoués
  (25/25, 11/11) ; E2E Clerk 8/8.

## Livraison et réception

- Push `f260400..c710769`, confirmé par `git ls-remote`.
- Paquet CLI extrait du commit `c710769` : 514 fichiers (sans captures ni fixtures), 409 applicatifs ; empreinte du manifeste
  `6b4e906818d8d999c596ee3ea0c584ec06dd93632d9dc46dafb01b1dd9af8413`.
- Railway : **`e077db96-4d69-41da-b431-1b3d3f8cdd8d` SUCCESS** ; le déploiement précédent `3bc79b16` est remplacé.
- Preuve SHA-256 par SSH (lots de 30) : **409/409 fichiers identiques**, 0 différence ; rôle `staging`, Node en production.
- Santé 200 (processus et base `ok`) sur `staging.africatv.sn` et le domaine Railway ; météo anonyme 401 ; dashboard 307.
- Pages publiques servies depuis le cache Next (`x-nextjs-cache: HIT`) **sans redirection Clerk** : `/` (`s-maxage=600`), `/pricing`,
  `/cgu`. `/sign-in` garde la poignée de main de l'instance Clerk de développement (307 vers `clerk.accounts.dev`), comme prévu.
- **9/9 E2E distants** (28 s) : landing, widgets Clerk, accès anonymes protégés, paiement simulé sans transaction, build servi.
- Chiffres de la landing : absents juste après le build (base injoignable pendant le build Railway, comportement prévu et documenté),
  revenus à la première régénération, environ 10 minutes après le build (11 771 chaînes, 371 africaines, 36 pays).

## Lighthouse sur staging après publication

Mobile : 3 passages, médiane (mesure de la landing faite après le retour des chiffres). Desktop : 1 passage.

| Page | Mobile avant (`865c85d`) | **Mobile après** | LCP mobile | Desktop avant | **Desktop après** | Accessibilité | Bonnes pratiques |
|---|---|---|---|---|---|---|---|
| Landing | 69 | **93** (93/94/92) | 2,98 s | 88 | **99** | 100 | **100** (79 avant) |
| `/pricing` | 64 | **75** (70/75/75) | 5,25 s | 85 | **95** | 100 | 79 |
| `/sign-in` | 64 | **73** (75/73/72) | 4,46 s | 85 | **93** | 100 | 79 |
| `/cgu` | — | **97** | 2,53 s | — | **99** | 100 | 100 |

- Objectif ≥ 90 en mobile **atteint sur la landing (93) et les CGU (97)**. `/pricing` et `/sign-in` restent sous 90 : 342 Ko de scripts
  Clerk sur 4G lente, et pour `/sign-in` la poignée de main de l'instance de développement. Plus aucune redirection sur `/pricing`.
- Bonnes pratiques 79 sur les pages qui chargent Clerk : cookies tiers de l'instance de développement (D-2).

## Limites

Profils Clerk connectés sur staging (landing d'un membre), paiement réel, appareils Android et VLC réel : hors réception. Preuves
locales : `.local-logs/publication-p6/` et `.local-logs/p6/after-staging*` (ignorés par Git).

## Instance Clerk de production (D-2) — 4 octobre 2026, après-midi

Faite par le propriétaire dans Clerk, Google Cloud, OVH et Railway (l'agent n'a modifié aucune de ces configurations ; vérifications en
lecture seule) : instance de production sur `africatv.sn` (domaine conservé, marque « Africa Live »), identifiants Google OAuth propres
(projet Google Cloud « Africa Live », redirection `https://clerk.africatv.sn/v1/oauth_callback`), 5 CNAME chez OVH (`clerk`, `accounts`,
`clkmail`, `clk._domainkey`, `clk2._domainkey`, propagés et vérifiés par Clerk, certificats émis), webhook
`https://staging.africatv.sn/api/webhooks/clerk` (user.created/updated/deleted, session.created/ended/removed/revoked), clés `pk_live` /
`sk_live` et `CLERK_WEBHOOK_SIGNING_SECRET` posées sur Railway (redéploiement `2f9852a6` SUCCESS). `.env.local` garde l'instance de dev.

- **Défaut trouvé par l'E2E distant** : la CSP (`next.config.ts`) n'autorisait que `*.clerk.accounts.dev` ; le navigateur bloquait
  `clerk.africatv.sn` (« failed_to_load_clerk_js ») et les widgets de connexion / inscription ne s'affichaient plus. Correctif
  [`32d1a66`](https://github.com/fatme-nabih/Africa_Live_TV/commit/32d1a66) (origine Clerk déduite de la clé publique,
  `src/lib/clerk-csp.ts` testé ; Cloudflare Turnstile autorisé en `script-src` et `frame-src`), déployé sur accord explicite :
  **`047d66d7` SUCCESS**, 411/411 fichiers identiques, santé 200, widget de connexion affiché, **9/9 E2E distants**.
- Plus de poignée de main : `/sign-in` répond 200 directement ; scripts Clerk servis par `clerk.africatv.sn`.
- Lighthouse staging mobile (×3, médiane) : `/sign-in` **73 → 78**, bonnes pratiques 79 (cookie Cloudflare `__cf_bm` posé par
  `img.clerk.com` sur l'icône Google du widget, hors de notre code) ; `/pricing` 75, bonnes pratiques **79 → 96**. Accessibilité 100.
- À faire par le propriétaire : créer son compte sur l'instance de production et lui remettre le rôle admin (métadonnées Clerk) ; les
  comptes de l'instance de développement ne sont pas repris.

## D-4 (pays suivis au compte) et D-5 (mur TV) — 4 octobre 2026, soir

Sur confirmation explicite du propriétaire :

| Étape | Résultat |
|---|---|
| Sauvegarde avant migration | `backups/railway/railway-2026-10-04T14-32-53-630Z` ; restauration isolée : 22 tables, 14 505 chaînes, 15 646 sources, 3 utilisateurs, 32 favoris, 19 migrations, identiques ; base temporaire supprimée |
| D-5 | `NEXT_PUBLIC_TV_WALL=true`, `--skip-deploys` (aucun déploiement déclenché) |
| Commit / push | [`9b40d94`](https://github.com/fatme-nabih/Africa_Live_TV/commit/9b40d94) sur `main` |
| Déploiement | **`490d48be` SUCCESS** (release `release-2026-10-04T14-34-57.217Z`, 521 fichiers) |
| Migration | `user_followed_countries` présente, 20 migrations appliquées |
| Preuves | 415/415 fichiers applicatifs identiques, rôle `staging` ; santé 200 (deux domaines) ; 9/9 E2E distants ; `/api/followed-countries` et `/app/mur` anonymes → 307 ; lien « Mur TV » compilé |

Limites : rendu connecté du mur TV et synchronisation entre deux appareils à confirmer par le propriétaire.

## Suite D-2 — compte administrateur et carte « Mon accès » — 4 octobre 2026

- Le propriétaire a créé son compte sur l'instance de production (connexion Google), retrouvé le rôle administrateur (onglet Admin
  visible) et renommé l'application « Afrika Live » → **« Africa Live »** dans Clerk.
- Défaut vu sur la page Compte d'un administrateur en essai : « Essai actif · 5 jours restants » à côté de « Échéance : Accès
  permanent ». Cause : `getCurrentAccessDecision()` renvoie l'essai actif avant de vérifier le rôle administrateur. Correctif
  **d'affichage seulement** (logique d'accès inchangée) : `accountAccessView` (`src/lib/access-gauge.ts`, testé) ; un administrateur
  voit « Actif (Administrateur) », « Accès administrateur », « Accès permanent », sans jauge ni bouton « Prolonger ». Commit
  [`2caf8ad`](https://github.com/fatme-nabih/Africa_Live_TV/commit/2caf8ad), Railway **`7e1bb51d` SUCCESS**, 411/411 fichiers
  identiques, santé 200, 9/9 E2E distants ; rendu confirmé par le propriétaire. Vérification : tsc 0, lint 0, 363 tests (349/14/0),
  invariants 4/4.
