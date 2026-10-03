# Publication Premium P5 — 3 octobre 2026

Le propriétaire a explicitement demandé de committer P5 et de le publier sur staging, puis d'installer Lighthouse pour obtenir les notes.

## Périmètre

- P5 « Aimants et finition » (UX-501 → 506, UX-508, UX-209 suite, UX-213) : commit applicatif
  [`090ce01`](https://github.com/fatme-nabih/Africa_Live_TV/commit/090ce01474eb3cfe4a0b8e863282b780bc93230e), 86 fichiers.
  UX-507 (briefing, L6) non commencé : décision du propriétaire en attente.
- Dépendances : `framer-motion` retiré ; aucune ajoutée. Lighthouse 12.8.2 est installé **hors du projet**
  (`.local-logs/tools/lighthouse`, ignoré par Git) : `package.json` et le build Railway n'en dépendent pas.

GitHub : `fatme-nabih/Africa_Live_TV`, `main`. Railway : `just-compassion`, service `Africa_Live_TV`, rôle **staging**. Pas de
promotion en production. Mur TV inactif en production (variable `NEXT_PUBLIC_TV_WALL` non posée).

## Contrôles avant publication

- `origin/main` = `683b3db` (synchronisé) ; recherche de secrets sur les 86 fichiers : aucun ; aucun fichier privé.
- Code P5 : tsc 0, lint 0, 355 tests (341 réussis, 14 ignorés, 0 échec), invariants 4/4, build ; E2E MVP 145 + 1 ignoré
  (1 échec corrigé, specs rejoués), E2E Clerk 8/8 (détail : `production-progress.md`, « Lot P5 »).
- Aucun changement de schéma depuis `06b662f` (`drizzle/`, `src/db` inchangés ; 19/19) ; contrôle Drizzle réussi ; pas de sauvegarde
  requise ; pré-déploiement `db:migrate:deploy` sans effet.

## Livraison et réception

- Push `683b3db..090ce01`, confirmé par `git ls-remote`.
- Paquet CLI extrait du commit : 504 fichiers (sans captures ni fixtures), 402 applicatifs ; empreinte du manifeste
  `325f0dfa852af83f44582a89f6fcfd7b0b094c828fd3958c86374c2353b4581c`.
- Railway : **`75bf069d-949d-4589-b090-892509353496` SUCCESS** (≈ 2 min).
- Preuve SHA-256 par SSH (lots de 30) : **402/402 fichiers identiques**, 0 différence ; rôle `staging`, Node en production.
- Santé 200 (processus et base `ok`) sur `staging.africatv.sn` et le domaine Railway ; météo anonyme 401 ; dashboard 307.
- En ligne : `/sw.js` (200, `Cache-Control: no-cache, no-store, must-revalidate`), `/offline.html` (200), manifeste avec raccourcis
  `/app/live` et `/app`, image du hero (200) ; `/app/mur` anonyme → connexion (307).
- **9/9 E2E distants** (31,5 s) : landing, widgets Clerk, accès anonymes protégés, paiement simulé sans transaction, build servi.

## Lighthouse (après publication)

Notes et corrections : [audit daté](audit-a11y-performance-2026-10-03.md), section « Lighthouse ». Les corrections issues de l'audit
(accessibilité 100, CLS) sont **locales, non committées et non publiées** : elles attendent l'accord du propriétaire.

## Limites

Profils Clerk connectés sur staging, paiement réel, amonts, appareils Android et VLC réel : hors réception. Variables, DNS, plans et schéma
inchangés. Preuves locales : `.local-logs/publication-p5/` (ignoré par Git).
