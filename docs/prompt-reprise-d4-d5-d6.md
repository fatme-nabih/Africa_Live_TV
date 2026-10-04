Tu reprends le projet Africa Live (Next.js 16 App Router, React 19, Tailwind 4, Clerk, PostgreSQL/Drizzle, STAGING sur Railway,
domaine africatv.sn, production NON lancée). Réponds-moi en français.

## État au 4 octobre 2026 (fin de session)
- Expérience Premium P0 → P6 publiée sur staging. Dernier déploiement Railway actif : `7e1bb51d` (commit `2caf8ad`, carte « Mon accès »
  admin) ; documentation poussée jusqu'à `087923d`.
- D-2 FAIT : staging utilise l'instance Clerk de PRODUCTION (`pk_live`, `clerk.africatv.sn`, DNS OVH, Google OAuth propre, webhook,
  CSP corrigée `32d1a66`). `.env.local` garde l'instance Clerk de DEV (la production refuse localhost) : ne pas y toucher.
- D-4 (pays suivis synchronisés au compte, UX-503b) : FAIT ET VÉRIFIÉ EN LOCAL, NON COMMITTÉ, NON PUBLIÉ. L'arbre de travail est donc
  volontairement sale : `drizzle/0019_followed_countries.sql` + `drizzle/meta/*`, `src/db/schema.ts`, `src/app/api/followed-countries/`,
  `src/components/shell/FollowedCountriesSync.tsx`, `AppShell.tsx`, `followed-countries.ts(+test)`, `api-contracts.ts`, `proxy.ts`,
  `e2e/followed-countries.spec.ts`, `e2e/auth-entry.spec.ts`, et la documentation mise à jour. Vérifié : tsc 0, lint 0, 364 tests
  (350/14/0), invariants 4/4, build, E2E MVP 150 (149 + 1 ignoré, 0 échec), E2E Clerk 8/8.
- D-5 (mur TV en production) : feu vert donné, RIEN posé sur Railway.
- D-6 (logos officiels Wave / Orange Money) : feu vert donné, en attente des fichiers officiels (je les déposerai dans `public/payment/`).

## À lire AVANT toute action (dans cet ordre)
1. AGENTS.md (règles ; Next.js 16 : lire le guide de `node_modules/next/dist/docs/` avant d'utiliser une API).
2. contextellm.md — section « D-4 / D-5 / D-6 — 4 octobre 2026, fin de session » en tête.
3. docs/plan-experience-premium.md — §5.2 A (décisions D-1 → D-10), **§5.2 A bis « Suite immédiate »** (procédure), §8.1 pièges.
4. docs/production-progress.md — section « D-4 » en tête ; docs/publication-premium-p6-2026-10-04.md (déploiements, preuves) ;
   docs/railway-preproduction-runbook.md (sauvegarde / restauration / migrations).
Puis `git status --short` et `git log --oneline -8` : tu dois voir `087923d` en tête et les fichiers D-4 modifiés. Préserve tout ; aucune
commande Git destructive.

## Ce que j'attends de toi
Premier message : rappelle en 5 lignes l'état et la suite ci-dessous, puis DEMANDE-MOI CONFIRMATION avant toute action Railway.
Après mon accord explicite, dans cet ordre :
1. Sauvegarde Railway restaurable AVANT la migration : `npm run backup:restore-drill:railway` en mode tunnel SSH, comme le
   29 septembre (transport `railway-ssh-private-tunnel`) : configuration SSH générée par `railway ssh config --path <fichier du
   dossier temporaire>` (jamais `~/.ssh/config`), tunnel `ssh -F <fichier> -N -L 15432:localhost:5432 <alias>` vers le service
   `Postgres`, variables injectées via `railway run --service Postgres` sans JAMAIS afficher un secret (construire
   `DATABASE_PUBLIC_URL` vers `localhost:15432/railway` dans un petit script), `RAILWAY_BACKUP_USE_SSH=true`,
   `RAILWAY_BACKUP_CONFIRMED_ROLE=staging`, `RAILWAY_BACKUP_CONFIRMED_PROJECT_ID` = `RAILWAY_PROJECT_ID`, `POSTGRES_BIN_DIR` = client
   PostgreSQL local (versions 16 et 17 dans `C:/Program Files/PostgreSQL`). Vérifier l'inventaire restauré, puis fermer le tunnel.
   Si la méthode bloque, t'arrêter et me proposer une alternative ; ne JAMAIS migrer sans sauvegarde vérifiée.
2. D-5 : `railway variable set NEXT_PUBLIC_TV_WALL=true --skip-deploys` (service `Africa_Live_TV`, environnement staging ;
   IDs dans `.local-logs/publication-p6/deploy.cjs`).
3. Commit de D-4 (message en anglais, ligne Co-Authored-By de la session), push sur `main`, nouveau dossier de release dans
   `.local-logs/publication-p6/` (`release.json` → `prepare-upload.cjs` → `deploy.cjs`, message à adapter), attendre SUCCESS
   (`railway deployment list --json`), puis : preuve SHA (`remote-proof-chunked.cjs`), `health.cjs`, `e2e-remote.cjs` (9/9),
   table `user_followed_countries` présente (requête en lecture via `railway ssh`), `/api/followed-countries` anonyme → 307,
   `/app/mur` sur desktop. Le pré-déploiement Railway lance `npm run db:migrate:deploy` (jamais `db:push`).
4. Mettre à jour production-progress, plan (§5.1/§5.2, D-4/D-5), contextellm, checklist, dossier de publication ; commit doc + push.
5. D-6 dès que les logos sont déposés (vérifier format, poids, conditions d'usage ; remplacer les pictogrammes de
   `src/components/pricing/PaymentMethods.tsx` ; captures 360/768/1366 de /pricing et de la landing ; E2E `payment` équivalent).
6. Bilan « fait / vérifié / limites », puis attendre ma décision sur la suite (D-3 briefing L6 → UX-507, D-7 → D-10).

## Garde-fous ABSOLUS (rappel)
- Jamais de relais, conversion ni stockage de média. Aucune donnée personnelle dans les captures versionnées.
- Ne pas modifier accès, éligibilité, quotas, machine de lecture, NabooPay sans ticket explicite + tests.
- Ne jamais toucher `.env*`, la configuration Clerk, le DNS, le plan Railway ; ne jamais promouvoir staging en production.
  Railway : seulement les actions listées ci-dessus, après mon accord. Aucune nouvelle dépendance sans accord.
- Ne pas affaiblir un test. Mesurer avant de croire une hypothèse.
- Pièges : heredocs / `node -e` cassent antislashs, accents grave et `$` (et `String.replace` interprète `$\`` : utiliser un
  remplacement par fonction) ; fichiers CRLF ; `EUNKNOWN` sur un fichier surveillé → réessayer ; Git Bash réécrit `/app` ;
  après un déplacement de route, supprimer `.next/dev/types` et `.next/types` ; mode MVP : `$env:LOCAL_DEV_MODE='true';
  $env:NEXT_PUBLIC_LOCAL_DEV_MODE='true'; npm run dev` + `node .local-logs/premium/local-user.cjs add`, E2E avec
  `E2E_REUSE_SERVER=true --workers=1`, puis `cleanup-local-user.cjs`, `local-user.cjs remove` (users = 2), restaurer
  `docs/screenshots/l5-anchored-*.png` depuis HEAD et relancer `npm run dev` (mode Clerk, santé 200, `/app` anonyme 307).
