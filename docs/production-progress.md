# Progression — préparation production

## Refonte du Radar, lots R1 à R4 — 5 octobre 2026

Demandée par le propriétaire après analyse de la page Radar : un lot à la fois, bilan, feu vert, commit sur demande.

| Lot | Commit | Contenu |
|---|---|---|
| R1 | `68e0ddf` | Retrait des boutons « Direct » par dépêche et du « Regarder le direct du pays » d'« À la une » : ils lançaient une chaîne quelconque du pays, sans lien avec l'article. Un seul accès honnête, « Regarder une chaîne : <pays> », dans la barre du filtre pays. Ligne « région » et compte de dépêches répété retirés. |
| R2 | `8d28d43` | Fil au format agence : heure à gauche, titre, puis source · rubrique · pays sur une ligne ; point de couleur au lieu du badge ; partage en icône. Séparateurs « Dernière heure / Il y a 1 à 3 h / Plus tôt aujourd'hui / Hier » (`src/lib/radar-time-groups.ts`), collants dans la colonne du bureau, calculés après hydratation. |
| R3 | `dc2ddcd` | Carte à pleine hauteur de sa rangée (800 px = « À la une » à 1366 px) ; attribution sur une ligne de légende, Esri crédité seulement en vue satellite. Météo : ville nommée une fois, liste des pays et villes rapides dans un même bandeau, sous-titres redondants retirés (carte ~40 % plus courte). |
| R4 | `c0ae888` | Recherche dans le fil (titre, source, rubrique, pays ; sans accents ni casse) et rubriques déduites Politique / Économie / Sécurité / Société / Sport / Culture (`src/lib/radar-topics.ts`) : libellé du flux s'il est clair, sinon mots-clés du titre, mots ambigus exclus. Filtrage dans le navigateur sur toute la vue, « À la une » comprise. |

- Mesure préalable à R4 (échantillon réel de 257 dépêches) : 57 libellés de rubrique hétérogènes, ~60 % sans vraie rubrique ;
  le classement range ~65 % des dépêches, le reste reste dans « Toutes ». Seulement 9 paires de titres proches entre rédactions :
  le regroupement des doublons (point 3 de R4) est **différé** sur décision du propriétaire.
- Limites : classement indicatif (une dépêche peut tomber dans deux rubriques) ; recherche et rubrique remises à zéro au changement
  de pays ou de périmètre.
- Contrôles : tsc 0, `eslint . --max-warnings=0` 0, `npm test` 372 réussis / 0 échec (dont 8 nouveaux), build de production local
  réussi. E2E MVP (radar-live, radar-workspace, radar-reliability, radar-weather, a11y, app-shell, dashboard-reception,
  universal-search, followed-countries) : 93 réussis, 1 ignoré, 0 échec ; tests UX-306 réécrits pour R1, nouveau test R4.
  Captures vérifiées à 360 et 1366 px. Compte synthétique local recréé pour les E2E puis supprimé ; serveur Clerk relancé.
- Aucune migration, variable, API ou configuration modifiée.
- **Publication Railway staging demandée par le propriétaire, non effectuée** : paquet préparé depuis `c0ae888`
  (`.local-logs/publication-radar/`, 556 fichiers dont 442 applicatifs, aucun fichier privé). Premier envoi `railway up` : erreur
  réseau vers backboard.railway.com ; la nouvelle tentative a été bloquée par le contrôle d'autorisation de l'agent. Staging reste
  sur `573dba0`. Reprendre avec `node .local-logs/publication-radar/deploy.cjs`, puis `status.cjs`, `remote-proof.cjs`,
  `health.cjs`, `e2e-remote.cjs`. Rien n'est poussé sur GitHub.

## Vérification complète des flux et mise à jour Railway — 4–5 octobre 2026

Sur demande du propriétaire : contrôle réseau des 12 396 flux depuis le poste local (origine CORS `https://staging.africatv.sn`),
10 passages du 4 octobre 19 h 10 au 5 octobre 01 h 24 UTC (`verify-streams.ts --all`, revues `--review-generic-query` /
`--review-time-window-query`, puis passages planifiés jusqu'à confirmation). Hors ligne confirmés selon la politique existante
(3 échecs persistants ou 5 temporaires espacés), sans modification de code.

| Flux | Nombre | Chaînes (meilleur badge) | Nombre |
|---|---|---|---|
| BROWSER_OK sains | 4 557 | Navigateur | 4 511 |
| VLC_ONLY sains | 2 442 | VLC seulement | 2 057 |
| OFFLINE confirmés | 5 295 | Hors ligne (masquées hors local) | 5 108 |
| UNTESTED (97 jetons personnels, 5 rtmp/mmsh) | 102 | Non testables | 102 |

- 475 URL à paramètres revues (149 saines) ; les 97 liens à jeton/signature restent volontairement non testés.
- Sauvegarde locale `backups/local-sync/local-before-stream-verify-2026-10-04T19-10-01-257Z.dump` ; sauvegarde Railway chiffrée
  `backups/railway/railway-before-stream-verify-2026-10-05T01-24-23-254Z` (restauration de contrôle : 11 778 / 12 396 / 3 utilisateurs / 48 favoris).
- Railway staging : colonnes de vérification copiées par id en une transaction (`.local-logs/streams-2026-10-04/railway-apply.cjs`),
  empreinte d'état identique au local après écriture, utilisateurs et favoris inchangés, 6 665 chaînes visibles au catalogue public
  (Canal+ exclu), `/api/health` 200. Aucun déploiement, variable, migration ou code modifié.
- En local, la règle MVP laisse tout le catalogue visible (hors ligne compris).
- **Cycle de 15 jours** (décision du propriétaire, 5 octobre) : fraîcheur portée de 7 à 16 jours (`STREAM_FRESHNESS_TTL_DAYS`,
  commit `573dba0` ; tsc 0, lint 0, 364 unités, 23 intégrations, invariants 4/4). Contrepartie : une source morte peut rester
  affichée jusqu'au cycle suivant. Vérification depuis le poste local (réseau sénégalais), pas depuis Railway (US West).
  Tâche planifiée Windows « Africa Live - verification des flux » : tous les 15 jours à 20 h, premier passage le 19 octobre,
  réveil du PC, session ouverte requise ; `.local-logs/stream-cycle/run-cycle.cjs` enchaîne sauvegarde locale, `--all`, passages
  planifiés jusqu'à confirmation (9 h max), sauvegarde Railway chiffrée et copie transactionnelle (arrêt si le catalogue diffère).
- **Publié sur staging** sur autorisation explicite du propriétaire : CI [37355267984](https://github.com/fatme-nabih/Africa_Live_TV/actions/runs/37355267984)
  SUCCESS, instantané Git (552 fichiers, aucun fichier privé) envoyé par Railway CLI, déploiement `df049618-d475-4689-bedd-ecc45a970ae4`
  SUCCESS, 438/438 fichiers applicatifs identiques, rôle staging / `NODE_ENV=production`, santé 200 sur les deux domaines, météo 401 et
  accès protégés 307, 10/10 E2E distants. Aucune migration, variable ou configuration Railway modifiée.

## Correctifs de l’audit — publiés sur staging le 4 octobre 2026

Sur demande du propriétaire : droits datés et remboursements selon décision explicite, éligibilité stricte, transport/reprise NabooPay,
workers, préférences, mur, caches et Radar corrigés ; Next 16.3.8, tests/CI renforcés et responsabilités lecteur/TV extraites.
26 tickets reçus localement ; COR-506 profilage partiel, COR-900 réception avec réserves ; COR-901 publication staging reçue.
364 unités sans réseau et 23 intégrations PostgreSQL, typage/lint/migrations/build et audit production réussis ;
[preuves E2E, mesures, règle des droits et limites](correctifs-audit-validation-2026-10-04.md), [état courant](etat-courant.md).
Publication expressément demandée après le bilan local : GitHub `main`, code `6dad01c` ; Railway `4319e870` SUCCESS actif,
438/438 fichiers identiques, santé 200 sur les deux domaines, 10/10 E2E distants et 20 migrations inchangées.
[CI réussie](https://github.com/fatme-nabih/Africa_Live_TV/actions/runs/37226297937) : 364 unités, 23 intégrations, build/audit production,
9 E2E de build (10 ignorés), 59 E2E sensibles (1 ignoré) et nettoyage des fixtures. Snyk Code indisponible, aucun scan SAST reçu.
[Dossier de publication et compléments CI](publication-correctifs-2026-10-04.md). Aucune migration supplémentaire, `.env*` et configuration distante conservés. Les publications suivantes sont historiques.

## Reste à faire — Expérience Premium (au 4 octobre 2026, après le lot P6)

P0 → P5 et les correctifs Lighthouse sont publiés sur staging (`865c85d`, Railway `3bc79b16`). **Lot P6 « Performance mobile » fait,
committé (`7e27319`) et publié sur staging (`e077db96`)** (section suivante) : landing 90 en Lighthouse mobile (build servi local), `/pricing` 78,
`/sign-in` 79. Lighthouse mobile **sur staging** : landing **93**, `/cgu` 97, `/pricing` 75, `/sign-in` 73 ([dossier](publication-premium-p6-2026-10-04.md)).
D-2 (instance Clerk de production) **faite**. **D-4 (pays suivis au compte) et D-5 (mur TV) publiés** sur staging (section suivante) ;
D-6 (logos) en attente des fichiers officiels. Restent : **UX-507** (briefing L6), et les décisions
D-3, D-7 → D-10 du [plan §5.2](plan-experience-premium.md) — D-2 (instance Clerk de production) est désormais la principale marge de
`/sign-in` et des bonnes pratiques.

## Publication D-4 et D-5 — 4 octobre 2026

Confirmation explicite du propriétaire (sauvegarde, variable, commit, push, déploiement avec migration). Dans l'ordre :

1. **Sauvegarde restaurable avant migration** : `backups/railway/railway-2026-10-04T14-32-53-630Z` (AES-256-GCM, clé DPAPI), restaurée dans une base isolée puis supprimée ;
   inventaire identique : 22 tables, 14 505 chaînes, 15 646 sources, 3 utilisateurs, 32 favoris, 19 migrations ; 21,7 s.
   La redirection de port SSH (`ssh -L`) est désormais **refusée par Railway** (« unknown channel type: unsupported ») : le transport
   `railway-ssh-private-tunnel` passe par un relais TCP local hors projet (chaque connexion = `railway ssh -- bash` vers
   `/dev/tcp/127.0.0.1/5432` dans le conteneur Postgres), aucune modification de Railway ni du code. Voir le runbook.
2. **D-5** : `NEXT_PUBLIC_TV_WALL=true` posée avec `--skip-deploys` (service `Africa_Live_TV`), aucun déploiement déclenché.
3. **D-4** : Railway **`490d48be` SUCCESS** (commit [`9b40d94`](https://github.com/fatme-nabih/Africa_Live_TV/commit/9b40d94)) ; pré-déploiement `db:migrate:deploy` : table `user_followed_countries` présente, **20 migrations**, 0 ligne.
   415/415 fichiers applicatifs identiques par SSH (rôle `staging`), santé 200 sur les deux domaines (404 transitoire du domaine
   Railway juste après la bascule, puis 200 ×4), météo anonyme 401, `/app/live` 307, **9/9 E2E distants**,
   `/api/followed-countries` anonyme → 307 (connexion), `/app/mur` anonyme → 307 ; lien « Mur TV » présent dans le JavaScript client
   (le drapeau est compilé à `true`).

Limites : rendu du mur TV et synchronisation entre deux appareils non vus avec une session réelle sur staging (à confirmer par le
propriétaire sur desktop ≥ 1 280 px). `railway ssh` échoue par intermittence (« An error occurred connecting to your service ») : la
preuve SHA relance désormais chaque lot jusqu'à 5 fois.

## D-4 « Pays suivis synchronisés au compte » (UX-503b) — fait en local le 4 octobre 2026, publié le même jour (ci-dessus)

Feu vert du propriétaire pour D-4, D-5 et D-6. Les actions Railway ont été faites après confirmation explicite (section précédente).

| Élément | Détail |
|---|---|
| Schéma | `user_followed_countries` (`user_id` → `users` en cascade, `country_code` `^[A-Z]{2}$`, `position` 0–4 unique par utilisateur, `updated_at`) ; migration **additive** `drizzle/0019_followed_countries.sql` (une table, aucune modification ni suppression) ; appliquée à `africa_live_dev` (`npm run db:migrate`), `db:check` sans dérive, `db:check:migrations` OK |
| API | `src/app/api/followed-countries/route.ts` : GET (60/min) et PUT (30/min) via `authorizeCatalogRequest` (compte connecté non bloqué, sans abonnement) ; `followedCountriesSchema` (0–5 codes, sans doublon) + pays africains seulement ; remplacement transactionnel ; route ajoutée aux routes protégées du middleware (`src/proxy.ts`) |
| Client | `src/components/shell/FollowedCountriesSync.tsx` monté par `AppShell` en mode membre (app, compte, admin) : à l'ouverture le compte fait foi, enrichi des pays de l'appareil (`mergeFollowedCountries`, testé) ; ensuite chaque changement est envoyé (800 ms) ; le stockage `al_followed_countries` reste la source d'affichage et le repli |
| E2E | `followed-countries` : API simulée en mémoire (aucune écriture en base entre les tests) + 3 nouveaux tests (nouvel appareil, premier appareil, API réelle : validation 400, ordre, remise à zéro) ; `auth-entry` : la route fait partie des API protégées vérifiées en anonyme |

Vérification : tsc 0, lint 0, `npm test` 364 (350/14/0), invariants 4/4, build réussi ; E2E MVP 19 specs **150 tests : 149 réussis, 1 ignoré, 0 échec** ;
E2E Clerk 8/8 (+ `auth-entry` rejoué 3/3 après ajout de la route). Environnement : `npm run dev` mode Clerk sur 3001, ligne technique supprimée
(users = 2), captures L5 restaurées.

Reste : D-6, en attente des logos officiels (`public/payment/`).

## Publication Premium P6 — 4 octobre 2026

Publication demandée par le propriétaire : commits `7e27319` (applicatif) et `c710769` (documentation) poussés sur `main`, Railway staging
**`e077db96-4d69-41da-b431-1b3d3f8cdd8d` SUCCESS** ; 409/409 fichiers applicatifs identiques par SSH, santé 200 sur les deux domaines,
météo anonyme 401, dashboard 307, **9/9 E2E distants**, pages publiques servies depuis le cache sans redirection Clerk. Aucune migration,
variable, DNS, plan ou configuration Clerk modifiés. Lighthouse sur staging (mobile, médiane de 3 ; desktop, 1 passage) : landing
**69 → 93** (desktop 99, bonnes pratiques 100), `/cgu` 97, `/pricing` 64 → 75 (desktop 95), `/sign-in` 64 → 73 (desktop 93) ;
accessibilité 100. Chiffres de la landing absents jusqu'à la première régénération (≈ 10 min après le build), comme prévu.
[Dossier](publication-premium-p6-2026-10-04.md).

## Expérience Premium — Lot P6 « Performance mobile » — 4 octobre 2026

Périmètre : [plan-experience-premium.md](plan-experience-premium.md) §6, UX-601 à UX-606, feu vert du propriétaire le 4 octobre 2026.
Commit applicatif [`7e27319`](https://github.com/fatme-nabih/Africa_Live_TV/commit/7e27319) (39 fichiers), **non publié** au moment de cette section. Aucune migration, aucun changement `.env*`, Railway, Clerk (configuration) ou DNS ; aucune dépendance
ajoutée (`sharp`, déjà présent via Next, a servi une fois à produire l'image du fond). Machine de lecture, accès, éligibilité, quotas,
API et parcours NabooPay inchangés (`/pricing` identique au commit `865c85d`). Routes protégées : protection inchangée (même matcher
`isProtectedRoute`, même `auth.protect()`).

Méthode : Lighthouse mobile ×3 (médiane) ; référence sur **staging**, puis chaque ticket sur un **build servi en local**
(`DEPLOYMENT_ENV=local`, port 3001, drapeaux locaux à `false`), aucun déploiement n'ayant été demandé. Détail et cascade réseau :
[audit, section « Lot P6 »](audit-a11y-performance-2026-10-03.md).

| Ticket | État | Preuve |
|---|---|---|
| UX-601 Landing statique | Fait | La mesure a corrigé l'hypothèse : le « premier octet de 2,1 s » était une **poignée de main Clerk** (3 redirections vers `clerk.accounts.dev`, instance de développement) sur toute page passée par le middleware. `src/lib/public-static-pages.ts` (testé) : `/`, `/pricing`, `/cgu`, `/privacy`, `/contact` (chemins exacts, aucune API ni route protégée) ne passent plus par `clerkMiddleware` ; les gardes du mode MVP et du mode E2E anonyme restent appliquées avant. `src/app/page.tsx` : plus d'`auth()`, `revalidate = 600` (route ○), zones membre via `SessionSwitch` (version visiteur dans le HTML). Premier octet simulé de la landing 3 025 → 16 ms, FCP 2,30 → 1,85 s. |
| UX-604 Polices | Fait | `subsets: ["latin"]` pour Manrope et Unbounded : 2 préchargements au lieu de 4 (−130 Ko, dont 115 Ko d'Unbounded latin-ext) ; les `@font-face` latin-ext restent déclarés (chargés seulement si un caractère l'exige). `display: swap` et repli ajusté inchangés, CLS 0. Landing 78 → 81, `/pricing` 71 → 76. |
| UX-602 Fond de marque | Fait | `public/brand/backdrop-480.webp` (19 Ko au lieu de 34 Ko, 480 px, WebP q55 depuis `africa-live-logo.png`), servi sans l'optimiseur, `loading="eager"` + `fetchPriority="high"` (il était en `lazy`, donc découvert tard). Halo, masque, opacités, Éco data et transparence réduite inchangés ; rendu identique à l'œil (captures P5 / P6 à 1366). LCP landing 4,65 → 4,08 s, perf. 81 → 86. |
| UX-603 Clerk où il sert | Fait | Groupe de routes `src/app/(clerk)/` (aucune URL changée) avec `layout.tsx` = `ClerkProvider` (mêmes props) pour `app`, `account`, `admin`, `pricing`, `sign-in`, `sign-up`, `player` ; le layout racine ne charge plus Clerk. Landing, CGU, confidentialité, contact : **0 script Clerk**. `SessionSwitch` lit l'indice `__client_uat` (`src/lib/session-hint.ts`, testé ; cookie vérifié lisible et à `0` hors session) : un membre voit « Ouvrir le dashboard », « Accéder au dashboard », « Mon compte » ; le `UserButton` et le lien Administration ne sont plus sur la landing (ils restent dans l'application). JS landing 194 → **143 Ko** gzip, scripts transférés 577 → 182 Ko, perf. **90**, bonnes pratiques **100**. `app-entry.test.ts` lit `(clerk)/layout.tsx` (mêmes assertions de redirection + type du fournisseur) ; `radar-access.test.ts` suit les nouveaux chemins. |
| UX-605 Tuiles du Radar | Fait | `RadarTiles` : plus d'`aria-label` ; le nom est le texte visible (libellé, valeur, sous-texte) complété par du texte `sr-only` (ponctuation, « en cours de chargement », périmètre, « Observation automatisée, pas une alerte officielle », « Voir … »). E2E `radar-live` : 5 assertions adaptées de façon équivalente (à 390 px le nom commence par le libellé court affiché ; même valeur, même réserve, même destination). |
| UX-606 Retouches | Fait | `countLabel` (`src/lib/format.ts`, testé) : « 1 dépêche / 8 dépêches », « 1 chaîne référencée » dans l'infobulle de la carte et l'état vide du fil. H1 de `/admin` : 24 px sous 640 px, `text-balance`. |

### Défauts trouvés et corrigés

- Tuiles du Radar : un `.sr-only` (position absolue) ajoute une espace dans le nom accessible (« 3 . Bienvenue ») → ponctuation par
  contenu généré (`.sr-after` dans `globals.css`, invisible, hors du contrôle « texte < 12 px ») ; Lighthouse : `label-content-name-mismatch`
  **réussi** sur le Radar (avertissement depuis P3), accessibilité 100.
- TV à 360 px en développement : le lien « Mur TV » s'affichait (`hidden` perdait contre l'`inline-flex` du bouton) → enveloppe
  `hidden xl:block`. Sans effet en production (drapeau `NEXT_PUBLIC_TV_WALL` non posé).
- Image du hero : ancien libellé « 8 dépêche(s) » et bouton « Mur TV » → image regénérée.

### Essai retiré faute de gain

- zod (63 Ko gzip) chargé au clic sur « Activer » dans `/pricing` : poids JS inchangé (302,6 Ko), zod arrive aussi par la coquille commune
  (`AppHeader` → `shell-nav` → `radar-workspace` → `radar-data` → contrats). Retiré, `/pricing` identique au commit `865c85d`.

### Lighthouse mobile (médiane de 3)

| Page | Staging `865c85d` | Local `865c85d` | **Local P6 final** | LCP final | TBT final | Bonnes pratiques |
|---|---|---|---|---|---|---|
| Landing | 69 | 76 | **90** (91/90/90) | 3,62 s | 23 ms | **100** |
| `/pricing` | 64 | 72 | **78** (77/78/78) | 4,70 s | 242 ms | 79 |
| `/sign-in` | 64 | 73 | **79** (79/76/79) | 4,63 s | 164 ms | 79 |
| `/cgu` | — | — | **93** | 3,24 s | 26 ms | 100 |

Accessibilité **100** partout, CLS 0 (connexion 0,017, inchangé). Poids JS de premier chargement (gzip) : landing 194 → 143 Ko ;
TV 321,9 Ko, Radar 330,1 Ko, `/pricing` 302,6 Ko (stables).

### Vérification (code final)

| Contrôle | Résultat |
|---|---|
| `npx tsc --noEmit` | 0 erreur |
| `npm run lint` | 0 erreur, 0 avertissement |
| `npm test` | 360 tests : 346 réussis, 14 ignorés, 0 échec (référence 355 : +5 — `public-static-pages` 2, `session-hint` 2, `count-label` 1) |
| `npm run test:invariants` | 4/4 |
| `npm run build` | Réussi, landing ○ (revalidation 10 min), serveur arrêté |
| E2E mode MVP (19 specs, `--workers=1`) | 147 tests : 141 réussis, 1 ignoré (« build servi »), 5 échecs (tuiles UX-605 : `.sr-only` ajoutait une espace avant la ponctuation, « 3 . ») corrigés par `.sr-after` ; `radar-live` rejoué **25/25** ; après la correction du lien « Mur TV » : `tv-wall`, `tv-workspace`, `a11y` rejoués **11/11** |
| E2E mode Clerk (dev, anonyme) | 8/8 (auth-entry, payment) |
| axe-core WCAG 2.1 A/AA (360 px) | 0 violation : landing, `/pricing`, `/sign-in`, `/cgu` |

Contrôle visuel (Edge) : 0 débordement, 0 texte < 12 px, 0 erreur de page — `premium-p6-<page>-<largeur>.png` pour landing,
pricing, sign-in, cgu (360/768/1366, mode Clerk) ; image du hero regénérée (`public/landing/hero-radar-tv.webp`, 42 Ko, données fictives, script `.local-logs/p4/hero-shot.ts`) : elle montrait « 8 dépêche(s) » et, à 360 px, un bouton « Mur TV ».

### Limites et réserves

- **Objectif ≥ 90 atteint pour la landing (et les CGU) seulement**, et **en local** : staging non remesuré (publication non demandée).
  `/pricing` (78) et `/sign-in` (79) ont besoin de Clerk (342 Ko de scripts) ; `/sign-in` garde la poignée de main de l'instance de
  développement (≈ 1 s), que l'instance de production (D-2) supprime. Pistes non faites : sortir zod de la coquille commune ; différer
  Clerk sur `/pricing` (ticket paiement dédié).
- Landing d'un membre connecté non vérifiée avec une vraie session (l'agent ne se connecte pas) : à contrôler par le propriétaire
  (attendu : « Ouvrir le dashboard » en haut, « Accéder au dashboard » dans le hero, « Mon compte » en pied de page).
- Si la base est injoignable pendant le build Railway, la landing est servie sans chiffres jusqu'à sa première régénération (≤ 10 min
  après une visite), comme le prévoit déjà `getPublicStats()` (aucun chiffre plutôt qu'un chiffre faux).
- Capture de `/admin` à 360 px non faite (session administrateur requise).

## Publication Premium P5 et audit Lighthouse — 3 octobre 2026

Publication demandée par le propriétaire : P5 committé (`090ce01`), poussé sur `main`, Railway staging
`75bf069d-949d-4589-b090-892509353496` **SUCCESS** ; 402/402 fichiers applicatifs identiques par SSH, santé 200 sur les deux domaines,
`/sw.js` et `/offline.html` servis, **9/9 E2E distants**. Aucune migration, variable, DNS ou plan modifié. [Dossier](publication-premium-p5-2026-10-03.md).

Lighthouse 12.8.2 installé hors du projet ; notes et corrections dans l'[audit daté](audit-a11y-performance-2026-10-03.md) : accessibilité
**100** partout après corrections, SEO 100, performance desktop 96–98, mobile 55–72 (LCP : délai serveur de la landing et fond de marque),
bonnes pratiques 78–79 (cookies tiers de l'instance Clerk de **développement**). Corrections issues de l'audit (accessibilité, CLS Radar /
TV / connexion, bouton « Rechercher » → recherche universelle) **publiées** sur demande (commit `865c85d`, Railway `3bc79b16` SUCCESS,
402/402 fichiers, 9/9 E2E distants ; staging : accessibilité 100, CLS connexion 0,269 → 0,017) ; vérifiées avant publication : tsc 0, lint 0,
355 tests (341/14/0), invariants 4/4, build, E2E MVP 146 + 1 ignoré, E2E Clerk 8/8.

## Publication Premium P3–P4 — 3 octobre 2026

Publication demandée par le propriétaire : P4 committé (`06b662f`), P3 et P4 poussés sur GitHub `main`, Railway staging
`990745ba-1fe3-4ebc-82cf-23acc5736f17` **SUCCESS**. 391/391 fichiers applicatifs identiques par SSH, santé 200 sur les deux domaines,
météo anonyme 401, dashboard 307, **9/9 E2E distants**, chiffres de la landing lus dans la base Railway. Aucune migration, variable,
DNS ou plan modifié. [Dossier de publication](publication-premium-p3p4-2026-10-03.md).

## Publication Premium P0–P2 — 3 octobre 2026

Publication demandée par le propriétaire : commit applicatif `1ef60b5`
poussé sur GitHub `main`, Railway staging CLI
`117f35ed-2c1a-474f-ad72-dd0cea974a4f` SUCCESS et instance RUNNING.
343 fichiers applicatifs identiques par SSH ; santé 200 sur les deux
domaines, météo anonyme 401 et dashboard 307. 307 unitaires réussis,
14 intégrations ignorées, invariants 4/4, TypeScript/lint/migrations/build
réussis, 8/8 E2E Clerk locaux et 9/9 E2E distants. Migrations 19/19
sans différence avant/après. [Preuves et limites](publication-premium-2026-10-03.md).
P0–P2 sont désormais committés et publiés ; les mentions contraires des
bilans antérieurs restent historiques. P3–P5 et reliquats non commencés.

## Correction locale lecteur — 2 octobre 2026

Capture utilisateur : React signale une clé vide dupliquée dans `Player.tsx`.
Les six overlays enfants directs de `AnimatePresence` ont désormais des clés
distinctes et stables. Gardes et transport média conservés ; diff RW préservé.

Réception de composant dans Edge headless, avec le vrai `Player` et réseau
simulé : ancien code reproduit 15 avertissements ; les quatre cas corrigés
(refus d'accès, HLS réellement décodé depuis les fixtures, autoplay refusé,
lancement VLC simulé unique) passent avec zéro avertissement de clé et zéro
erreur de page. Ce contrôle ne constitue pas une réception Clerk connectée ou
de VLC réel. TypeScript et ESLint ciblé réussis. Preuves reproductibles :
`.local-logs/review-2026-10-02/player-keys-check.cjs` et `player-keys-results.json`.

La revue a aussi confirmé un P2 météo distinct, non corrigé dans ce changement initial :
rejet non géré de `reader.cancel()` quand le corps HTTP est annulé ou expire.
Reproduction isolée dans `weather-abort-repro.cjs`, dans le même dossier ignoré.
Serveur Clerk sur 3001 maintenu dans une session de terminal ; aucun commit,
push, déploiement, changement distant, coût ou modification de `.env.local`.

### Publication CLI reçue ensuite — 2 octobre 2026, 19:22 UTC

Validation finale actuelle : 244 tests unitaires réussis, 14 ignorés, zéro échec ;
invariants 4/4, TypeScript, lint, migrations et build réussis. Le build a été
effectué dans un snapshot isolé pour préserver le serveur dev. Le
[dossier de publication CLI](publication-cli-2026-10-02.md) consigne le périmètre,
les limites et les preuves effectives : GitHub `main`, applicatif `51c0bc8` ;
Railway CLI `f0816583-e6a0-4115-bd54-d4cb0709acb1` SUCCESS, instance RUNNING.
287 fichiers applicatifs/configuration/migrations identiques par SHA-256 SSH.
Deux domaines santé processus/base 200, météo anonyme 401 et dashboard 307.
**9/9 E2E distants réussis**, aucun ignoré, aucune transaction réelle/session
connectée. Migrations encore 19/19 après déploiement, zéro en attente.
Serveur dev sur 3001 conservé, `.env.local` identique avant/après. Un commit
documentaire de clôture publie les résultats sans changement applicatif.

Le propriétaire autorise la publication GitHub et Railway du diff RW et de la
correction du lecteur. Le P2 météo est corrigé avant publication : rejet de
`reader.cancel()` géré et deux tests HTTP natifs (timeout du corps et annulation)
ajoutés. Première exécution des nouveaux tests affectée par les mocks fetch
précédents ; capture du fetch natif avant ces mocks, puis 5/5 réussis. Le
reproducteur isolé confirme zéro rejet non géré dans les deux cas.

Cible CLI vérifiée : projet `just-compassion`, service `Africa_Live_TV`, rôle
`DEPLOYMENT_ENV=staging` ; modes locaux et VLC desktop désactivés. Contrôle
des migrations via SSH CLI : 19 fichiers, 19 appliquées, zéro en attente et
aucune divergence d'empreinte. Aucun changement de schéma prévu. Le brouillon
`docs/plan-experience-premium.md` est préservé localement hors publication.
Preuves nouvelles dans `.local-logs/publication-2026-10-02/`.

## Remédiation RW reçue localement — 1er octobre 2026

RW-001 à RW-010 terminés dans l'ordre A, B, C, D, avec tests pendant les lots.
Départ `main` / `54e5696`, arbre documentaire sale préservé ; diff applicatif
et documentaire laissé local pour revue. Secours seulement sur 503 reconnu,
requêtes 20/8 s, contrats/mesures/dates/cache/provenance validés, cycle de vie
annulable, périmètre RSS indépendant et URL source de vérité.

Résultats nouveaux : **256 unitaires recensés, 242 réussis, 14 ignorés, zéro
échec** ; invariants 4/4 ; TypeScript, ESLint (zéro avertissement), cohérence
migrations et build réussis. E2E dev : 51 réussis, 1 réservé au build, zéro
échec ; build servi Clerk réel : 1/1 réussi (worker, météo anonyme 401,
redirection dashboard). Tous sans retry. Les échecs intermédiaires sont
expliqués dans le [dossier RW](radar-weather-remediation-validation.md).

`.env.local` inchangé, `npm run dev` Clerk initial restauré sur 3001 ;
africa_live_dev uniquement. Aucune logique DB/garde/quota modifiée : runner
intégration non requis, les 14 ignorés ne sont pas des succès. Aucun commit,
push, déploiement, coût, changement distant ou source IPTV. Clerk connecté,
appareils/amonts actuels et staging non reçus pour RW ; briefing L6 différé.

## Historique : revue Gemini et préparation du backlog RW — 1er octobre 2026

Demande du propriétaire : revoir les modifications Gemini puis rédiger un plan
détaillé pour son implémentation. **Préparation documentaire terminée ;
RW-001 à RW-010 restent À faire. Aucun correctif applicatif réalisé.**
Révisions locales examinées : Radar/RSS `6f7e384`, météo `54e5696` (HEAD).

Constats confirmés : secours navigateur après refus 403, données météo absentes
acceptées comme 0 °C, date wttr.in remplacée par la collecte et fuseau/jour-nuit
UTC arbitraires, mauvais périmètre des articles internationaux, provenance et
disponibilité incohérentes, absence de timeout direct navigateur.
Le [backlog RW](radar-weather-remediation-backlog.md) consigne les preuves,
critères d'acceptation, dépendances, scénarios de tests et journal à remplir.
[Prompt Gemini](gemini-radar-weather-prompt.md).

Validation de l'audit initial : 235 tests recensés, 221 réussis et 14 ignorés ;
TypeScript/ESLint réussis, zéro avertissement ESLint. Reproductions serveur
avec fetch simulé et composant navigateur isolé ; synchronisation pays/URL
réussie dans ce composant. 20/21 flux RSS répondent 200 au relevé ponctuel du
poste, AIP timeout 8 s ; aucune garantie de disponibilité permanente.
Build/E2E complets/réception Clerk authentifiée staging non relancés.
Le succès du déploiement météo `19a9a9ae-6746-4652-b16d-996e4d48aaa9` est
déclaré dans le compte rendu Gemini, non revérifié par cette revue.

Documents préparés : backlog RW et prompt, liens/état dans le backlog production,
plan dashboard, checklist, fiche de reprise et `contextellm.md`. Les anciennes réceptions ne
valident pas les corrections RW futures. Aucun commit/push/déploiement,
modification de base, source IPTV ou état Railway/OVHcloud/Clerk ; arbre initial
propre, documentation seule modifiée. Briefing L6 toujours différé.

## L5 — AL-T05, prototype local ancré — 1er octobre 2026

Expérimentation explicitement retenue par le propriétaire, réalisée et évaluée
localement depuis `main`/`15d6b4a`, état Git initial propre. **Recommandation :
ajuster avant généralisation**. Opt-in en développement seulement, non persistant ;
zapping parmi résultats chargés, HLS/MP4 démontés, requêtes tardives annulées/ignorées,
arrêt/pause/volume/plein écran accessibles, filtres indépendants. Modale et fenêtre
nommée conservées ; fenêtre connue arrêtée/détruite au transfert selon parcours.
VLC exige une sortie explicite du prototype, puis arrêt manuel avant réactivation :
exclusivité VLC globale non reçue. Gardes, quotas, catalogue, favoris et imports
conservés ; aucun relais, conversion ou stockage média.

Fichiers : `src/components/AnchoredPlayer.tsx`, `Player.tsx`, `ChannelGrid.tsx`,
`SeparatePlayerPage.tsx`, `src/app/app/page.tsx`, télémétrie et son test de contrat,
`e2e/anchored-player.spec.ts`, attente ciblée de favoris dans `catalogue.spec.ts`.
La télémétrie interne du player polluait le schéma strict et ne s'envoyait pas :
identité publique seulement désormais. Preuve d'arrêt effective au navigateur.

220 tests unitaires + 14 intégrations isolées, **41 E2E distincts reçus** :
13 L5, 24 régressions TV/catalogue/lecture/API/MVP, 1 Radar et 3 entrée/auth
du build hors MVP. TypeScript, ESLint zéro avertissement, build et contrôle
migrations réussis. Comptes et appareils disponibles distingués des simulations.
11 778 chaînes/12 396 sources ; zéro fixture média `lot2-*` ni schéma jetable
restant. Empreintes catalogue et témoin de quota conservés par le runner isolé.
Captures et détails : [réception L5](anchored-player-validation.md).

Limites : aucune réception Clerk ordinaire, VLC réel, source amont réelle,
Safari/HLS natif ou appareil physique L5. Aucun changement au compte administrateur.
Retour arrière : désactiver/recharger ; aucune restauration de base nécessaire.
Serveur restitué en mode Clerk local ; aucun fichier `.env` modifié.
IPTV intact ; aucune nouvelle migration ou modification des variables/services.
Publication L5 autorisée ensuite et reçue le 1er octobre à 20:08 UTC :
commit applicatif `9326fc0` poussé sur GitHub `main`, Railway staging
`dc557ad8-8288-4872-863d-7a2b6396014c` SUCCESS/actif. Santé processus/base 200
sur les deux domaines, **9 E2E distants réussis**. Le contrôle d'activation
ancré reste absent du build production ; le prototype reste local et opt-in.
Briefing inactif, L6 non commencé. [Preuves de publication](anchored-player-validation.md#publication-github-et-railway-staging).
Suite : arbitrage de l'ajustement et réception humaine L5, nouvelle autorisation
nécessaire avant toute publication future ou reprise du briefing.

## Clôture et publication GitHub/Railway — 1er octobre 2026, 18:44 UTC

Demande explicite du propriétaire de publier GitHub et Railway. Commit
applicatif `22dea98` poussé sur `origin/main` avec L0–L4, tests, captures et
documents de reprise ; puis commit documentaire final pour les preuves ci-dessous.
Nouvelle livraison staging `4c8a82cc-5b3b-4a0e-86a1-bf922540869a` SUCCESS.
Les 303 fichiers runtime correspondent au snapshot reçu précédemment ; paquet
de clôture 336 fichiers, sans secrets ni artefacts privés. SHA-256 :
`d6a8d7d87f43e5f2cf19542d57d600d74fe795eb6a4c6e35603929971a9e3fd3`.
Santé processus/base 200, API Radar anonyme 401 et **9 E2E distants repassés**
(22,9 s, zéro échec). Dashboard administrateur rechargé, briefing désactivé ;
couverture partielle 14/19 et panne GDELT annoncées, fil consultable.
Aucune nouvelle migration/variable/plan/DNS ; production non activée.
Réserves : profils Clerk ordinaires indisponibles, lecteur d’écran/appareils
physiques/échantillon de lecture et inventaire staging actuel non reçus dans
cette livraison. Prochaine décision produit **L5 / AL-T05**, puis L6 en dernier.
[Fiche de reprise](dashboard-session-handoff.md),
[capture staging finale](screenshots/session-closure-staging.jpg).

**État de clôture et reprise : [travail terminé, réserves et prochain lot L5](dashboard-session-handoff.md).**

Les relevés plus anciens conservent leur date ; ils ne remplacent pas ce bilan courant.

## Complément L4 — staging autorisé — 1er octobre 2026, 18:09 UTC

L0–L4 déployé directement sur `staging.africatv.sn`, snapshot de travail sans
commit/push : `b0d52c0c-3bca-4600-8a3e-fb1f2709dada`, SUCCESS/actif.
Neuf E2E distants réussis et santé 200 ; parcours Clerk administrateur réel
reçu en local et sur staging. Modes locaux désactivés et rôle staging conservé.
Pas de nouvelle migration, changement de plan ni transaction ; première
tentative d’upload expirée, relance réussie. [Preuves](dashboard-auth-staging-reception.md).
Comptes standard indisponibles (confirmé par le propriétaire). Complément à
18:29 UTC : zoom natif 200 % local validé, DPR=2, 937×477 CSS, sans débordement,
pays et filtres TV au clavier/focus reçus. Le briefing reste désactivé,
aucun lancement de production.

## Réception locale initiale L4 — avant la livraison staging du 1er octobre 2026

Réception locale terminée : 219 unitaires, 14 intégrations PostgreSQL isolées
et 57 E2E réussis, zéro échec final. TypeScript, ESLint, build et cohérence
des migrations réussis. Catalogue et empreintes conservés, fixtures nettoyées.
[Matrice de preuves et limites](dashboard-release-validation.md),
[dossier de livraison et rollback](dashboard-delivery-dossier.md).
Documentation réconciliée ; anciens chiffres staging marqués historiques et
non certifiés au 1er octobre. Widgets Clerk réels chargés sur build hors MVP,
sans connexion ni transaction. Comptes connectés et zoom natif restent à recevoir.
Acceptation locale AL-Q02 remplie ; réception staging conditionnelle non exécutée.
Aucun commit/push, déploiement, migration ou changement distant. Briefing inactif.
Suite : décision L5 sur le lecteur ancré, puis L6.

## L3 — AL-T01 à AL-T04 — 1er octobre 2026

Statut : livré et testé localement, non déployé. Navigation commune avec rôle
administrateur contrôlé côté serveur, catégories/langues normalisées sans
modifier les imports, filtres/raccourcis/URL synchronisés, entrées Afrique,
Sénégal, Tout et favoris persistants. Pays transmis entre dashboard et TV.
219 tests unitaires et 42 E2E réussis ; 14 intégrations optionnelles ignorées.
TypeScript, ESLint et build réussis. Réception, mesures, captures et limites :
[tv-workspace-validation.md](tv-workspace-validation.md).
Serveur restitué en mode Clerk local. Catalogue consultable après expiration,
dashboard et lecture refusés selon D5/DOC-006 ; briefing différé L6. Aucun commit, push, déploiement, migration
ou changement distant. Suite du plan : L4, AL-Q01/AL-Q02/AL-C05.

## L2 — AL-W01 à AL-W06 — 30 septembre 2026

Statut : livré et testé localement, non déployé. Dashboard compact, pays
accessible et partageable dans l’URL/historique, fil prioritaire sur mobile,
carte à la demande, couches optionnelles datées et tableau de disponibilité
selon chaque cadence fournisseur. Réception :
[dashboard-workspace-validation.md](dashboard-workspace-validation.md).
211 tests unitaires et 24 E2E réussis ; 14 intégrations optionnelles ignorées.
TypeScript, ESLint et build réussis. Limites Clerk/zoom/lecteur d’écran détaillées
dans la réception. Serveur restitué en mode Clerk local, briefing différé L6.
Aucun changement de schéma ou d’état distant, commit, push ou déploiement.
Suite logique : L3, navigation et filtres TV (AL-T01 à AL-T04).

## AL-C03 / AL-C04 / AL-D02 / AL-D03 / AL-D05 / AL-D06 — 30 septembre 2026

Statut : livré et testé localement, non déployé. Identités et déduplication,
worker MapLibre ESM explicite avec état dégradé, dates de publication/indexation
sur fenêtre commune 24 h, disponibilité par source et caches bornés,
références TV distinctes des candidates du résolveur, bandeau daté avec Afrique
par défaut. Aucune cotation ni date de secours simulée. Briefing inchangé,
désactivé jusqu’au lot L6. Aucun changement de droits, migration ou état distant.

Preuves, définitions et limites de test :
[dashboard-reliability-validation.md](dashboard-reliability-validation.md).
Suite unitaire, TypeScript, ESLint, build, E2E desktop/mobile/dégradation,
catalogue/favoris et worker sous CSP du build servi réussis. Le dashboard
complet en session authentifiée du build n’est pas revendiqué : worker depuis
page publique et garde anonyme vérifiés. Serveur remis en mode Clerk local.

## AL-C01 / AL-C02 — accès dashboard après expiration — 30 septembre 2026

Statut : implémenté et validé localement, non déployé. Décision D5 : refus du
dashboard après expiration ; catalogue TV consultable selon DOC-006. Le layout
commun utilise la consultation catalogue et la page dashboard vérifie le droit
actif. Les huit API Radar exigent désormais `authorizeAppRequest` avant tout
appel fournisseur ; briefing et marchés ne renvoient plus de cache public.
Grâce et accès administrateur existants conservés, lecture/favoris inchangés.

Preuves : 26 tests ciblés, suite unitaire (198 réussis, 14 intégrations ignorées),
TypeScript, ESLint, build et E2E anonyme Edge réussis. Les profils expirés et
connectés sont simulés dans les tests des vrais handlers et gardes de page ;
aucun compte Clerk réel expiré ni paiement n'a été testé. Aucun changement DB,
Clerk, Railway, DNS, commit ou push. Détails, matrice et retour arrière :
[dashboard-access-matrix.md](dashboard-access-matrix.md).

## DOC-005 — positionnement technique et juridique — 29 septembre 2026

Statut : note interne rédigée dans
`docs/positionnement-technique-et-juridique.md`, liée depuis le README et le
backlog. Elle décrit factuellement l’import du catalogue, les contrôles
techniques, la lecture depuis les sources et les limites de ces éléments comme
preuve de droits. Elle précise que les imports ne sont pas prouvés comme fournis
par les diffuseurs. La documentation détaillée reste interne. Les CGU et pages
publiques ont été ajustées pour décrire l’essai de cinq jours, l’accès au
catalogue après expiration et l’abonnement nécessaire à la lecture, sans
présenter l’URL accessible comme une autorisation de diffusion. Une demande de
retrait est désormais prévue dans le formulaire et la note décrit une revue
juridique locale avant lancement. Vérification : revue du code d’import, de
lecture, des sondes et des textes publics. Aucun avis juridique n’est fourni et
aucun flux individuel n’est validé.

## DOC-006 — accès catalogue, demandes de retrait et textes publics — 29 septembre 2026

Statut : déployé et vérifié en préproduction le 29 septembre 2026. Le service
Railway garde le rôle applicatif `staging` (`DEPLOYMENT_ENV=staging`).

- Les comptes connectés dont l’essai ou l’abonnement a expiré peuvent consulter
  le catalogue et ses filtres. Les routes de lecture conservent les contrôles
  d’accès et d’abonnement ; l’interface dirige vers les tarifs au lieu de lancer
  un flux sans droit d’accès applicatif.
- Le formulaire enregistre les demandes dans PostgreSQL après validation,
  limitation des abus et retrait des paramètres sensibles des URL. La
  confirmation est affichée uniquement après persistance.
- Une file privée accessible aux administrateurs actifs permet de consulter,
  suivre et traiter les demandes. Le traitement « désactiver les sources
  signalées » désactive les correspondances et journalise les identifiants et
  la décision. Les imports suivants conservent cette désactivation. La clôture
  sans action réactive la source en mode « révision requise », sans la déclarer
  éligible à la lecture.
- Les pages tarif, compte, contact, confidentialité et CGU présentent
  l’abonnement comme donnant accès à l’application et à ses fonctions, y compris
  la lecture pendant l’abonnement. La page d’accueil ne qualifie plus les flux
  de « publics et légitimes ».
- Migration `0018_support_requests` appliquée à la base locale `africa_live_dev`
  lors de l'implémentation, puis à PostgreSQL staging par le pré-déploiement
  `npm run db:migrate:deploy`. `npm test` (150 réussis, 14 ignorés), les tests ciblés du
  contrat et de la politique d’accès, les 14 tests d’intégration PostgreSQL,
  `npm run db:check:migrations`, `npm run lint`, `npx tsc --noEmit
  --incremental false` et `npm run build` passent. Limite : aucun SLA ni
  notification de réception par email n’est ajouté ; ce lot ne valide pas les
  droits des sources et n’est pas un avis juridique.

### Publication staging de DOC-006 et du Radar GDELT — 29 septembre 2026

- Commit `2f19e38` poussé sur GitHub `main` : [voir le commit](https://github.com/fatme-nabih/Africa_Live_TV/commit/2f19e38).
- Déploiement actif : Railway `dfa1da5f-36d2-402f-887a-228d5b1e7e57`, statut `SUCCESS`. Une première requête CLI (`aeeaa462-10df-42e7-908d-cf2ab5b61e15`) a échoué avant le build à cause d'une erreur d'envoi à l'API Railway ; aucun pré-déploiement ne s'y est exécuté. La relance ciblant les IDs explicites du projet, service et environnement staging a réussi.
- Avant la migration, le dump `backups/railway/railway-2026-09-29T23-01-49-939Z.dump.aes256gcm` a été chiffré en AES-256-GCM ; sa clé est protégée par DPAPI Windows. Le drill a déchiffré le dump, l'a restauré dans une base temporaire isolée et a comparé l'inventaire (20 tables, 18 migrations, 14 505 chaînes, 15 646 sources). La base temporaire a été supprimée ; le dump reste ignoré par Git.
- Après le pré-déploiement Drizzle : 22 tables publiques, 19 migrations ; `support_requests` et `support_request_events` sont présentes. Le déploiement a terminé avec succès.
- Vérifications HTTP sans session : `/api/health` retourne 200 avec processus et DB `ok`, `/api/live/news` retourne 401, et `/app/live` redirige (307) vers l'authentification.
- `npm run build` local et le build Railway réussissent. Aucun jeu de tests n'a été exécuté pendant cette opération de publication. Aucun domaine, service ou environnement de production n'a été modifié.
- `ABUSE_TRUSTED_PROXY_HEADER=x-real-ip` est configuré sur l'environnement Railway staging ; Railway documente cet en-tête comme adresse client. La production future reste à `disabled` jusqu'à vérification de son infrastructure.

## RAD-00 — première version du Radar Afrique — 29 septembre 2026

Statut : déployée sous `/app/live` dans le même accès authentifié que le
catalogue. GDELT sert un fil d'articles séparé des événements ; le pays est celui
du média, l'éditeur, le lien source et l'heure d'indexation restent indiqués, et
l'interface rappelle que le Radar ne vérifie pas les faits. Le bouton retourne
à l'application des chaînes. Aucun événement GDACS ni donnée météo n'est activé.
Le backlog d'implémentation est dans
[`radar-afrique-roadmap.md`](radar-afrique-roadmap.md).

## Journal des lots opérationnels 0 et 1 — 22 septembre 2026

Périmètre : documentation de l'état Railway existant et stabilisation des deux
modes locaux. Aucun commit, push, déploiement, changement Railway, migration de
données métier ou modification du projet source IPTV n'est autorisé par ce lot.

### DOC-001 — état Railway

Statut : terminé. Le backlog ne présente plus Railway comme inexistant. Le projet
`just-compassion`, son service applicatif, PostgreSQL, le commit actif, le rôle
staging, le catalogue de 30 éléments et la fermeture de la lecture ont été
consignés. Fichier : `docs/production-backlog.md`. Vérification : comparaison de
l'interface Railway, du déploiement actif et du catalogue authentifié. Risque :
absence de healthcheck, de tâche planifiée et de restauration démontrée. Retour
arrière : restaurer seulement la section documentaire ; aucun état externe changé.

### DOC-002 — matrice des environnements

Statut : terminé. `docs/environment-matrix.md` distingue Local Clerk, Local MVP,
Staging Railway et Production pour les flags, URLs, DB, Clerk, VLC, éligibilité
et proxy. Vérification : cohérence avec le validateur serveur et la configuration
Railway observée. Risque : les secrets et leur validité fournisseur sont
volontairement non affichés. Retour arrière : suppression du document uniquement.

### DOC-003 — journal par ticket

Statut : terminé. Ce chapitre enregistre résultat, fichiers, tests, risques et
retour arrière pour chaque ticket. Aucun journal ne
contient de secret ni d'URL média.

### DOC-004 — non-régression

Statut : terminé. `docs/non-regression-checklist.md` couvre configuration, base,
auth, catalogue, recherche, filtres, favoris, lecture web, VLC et Railway. Retour
arrière : suppression du document ; aucune exécution ni donnée modifiée.

### LOC-001 — horloge Windows

Statut : terminé. Le premier essai sans élévation de
`w32tm /resync /force` a été refusé (0x80070005). L'utilisateur a ensuite exécuté
la commande depuis PowerShell administrateur le 22 septembre ; Windows a répondu
que la commande s'était terminée correctement. Trois mesures suivantes contre
`time.windows.com` donnent environ 0,10 s de dérive, compatible avec Clerk et
confirmée par la reconnexion réussie. L'utilisateur a ensuite configuré le
service en démarrage automatique, l'a démarré et a relancé la synchronisation.
Le contrôle final montre `w32time` Running/Automatic, strate 5, source
`time.windows.com,0x9`, dernière synchronisation réussie à 18:37:37 et trois
mesures de dérive autour de +0,143 s. Fichier associé :
`src/scripts/diagnose-local.ts`. Risque résiduel : contrôler de nouveau après un
redémarrage Windows. Retour arrière système : remettre le type de démarrage
précédent uniquement si nécessaire, depuis un terminal administrateur.

### LOC-002 — session Clerk locale

Statut : terminé. L'ancienne session locale a été explicitement déconnectée et
l'application est revenue à l'accueil anonyme. L'utilisateur a effectué la
reconnexion Clerk interactive ; le catalogue affiche l'avatar du compte et 30
chaînes. Aucun mot de passe, cookie ou gestionnaire de secrets n'a été automatisé.
Retour arrière : déconnexion depuis le menu Clerk.

### LOC-003 — API authentifiées

Statut : terminé. Après reconnexion, les journaux Next.js confirment
`GET /api/filters 200`, `POST /api/channels 200` et `GET /api/favorites 200`.
L'interface a chargé les options de filtre et 30 chaînes sans erreur lisible ni
HTML Clerk. Les mutations de favori ont également répondu 200.

### LOC-004 — réponses HTML/404 d'authentification

Statut : terminé. `src/lib/api-contracts.ts`
convertit les HTML 401/404 en « Votre session a expiré. Reconnectez-vous pour
continuer. » avec le code `AUTHENTICATION_REQUIRED`. Les HTML 403 et 5xx ont
également des messages explicites. `src/lib/catalog-api.test.ts` couvre le 404
Clerk et le 503 HTML. Les 127 tests unitaires passent (123 réussis, 4 intégrations
exécutées séparément). Ce changement ne modifie ni le proxy ni les règles d'accès.
Retour arrière : retirer uniquement les branches de diagnostic et leurs tests.

### LOC-005 — mode Clerk et lecture locale

Statut : terminé. Les flags privés observés sont ceux du mode Clerk avec lecture
locale : modes sans auth à `false`, lecture locale et VLC à `true`, éligibilité à
`false`. Le catalogue affiche 30 chaînes. La recherche `.sci-fi` retourne une
chaîne et le filtre Russie une chaîne. `.sci-fi` a été ajouté aux favoris, est
resté favori après rechargement, puis a été retiré pour laisser la base propre.
La lecture a obtenu une première résolution web en 200 et affiché le mode
Navigateur ; après épuisement, la résolution suivante a répondu 409 et le secours
VLC 200. Le processus VLC créé a été fermé après vérification. Les médias sont
toujours téléchargés directement depuis l'amont. Retour arrière : aucun état de
test persistant ; favori nettoyé.

### LOC-006 — mode MVP sans Clerk

Statut : terminé. Les 13 E2E `local-mvp`, `local-playback` et
`local-playback-api` passent avec les flags MVP injectés sans modifier
`.env.local`. Ils couvrent accès sans compte, première réponse de 30 chaînes,
pagination, pays, favori persistant, HLS/MP4 directs, reprises bornées et garde-
fous VLC. Les fixtures créées ont été nettoyées et les empreintes du catalogue
restent inchangées. Retour arrière : aucun, les flags n'existaient que dans le
processus de test.

### LOC-007 — VLC réel

Statut : terminé. L'exécutable `C:/Program Files/VideoLAN/VLC/vlc.exe` est
présent. En mode MVP, `/api/channels` a renvoyé 30 chaînes, puis un appel autorisé
à `/api/open-vlc` avec uniquement un `channelId` et un `launchId` a répondu 200.
Le nombre de processus VLC est passé de 0 à 1 ; la réponse ne contenait aucune
URL source. Le processus créé pour la vérification a ensuite été fermé. Les E2E
confirment séparément que le clic UI transmet ces identifiants, et que les URL
arbitraires/origines étrangères sont refusées. Aucune URL amont n'est consignée.
Retour arrière : aucun changement persistant.

### LOC-008 — diagnostic local

Statut : terminé. `npm run diagnose:local`
affiche sans secrets : version Node, origine, flags, modes de clés Clerk, cible
et compteurs DB, fraîcheur, VLC, état et dérive de l'horloge. Premier résultat :
11 778 chaînes, 12 396 sources, base `africa_live_dev`, VLC trouvé. Après la
correction LOC-001, la source horaire réseau est détectée et la dérive finale
mesurée est d'environ 0,14 s. Fichiers : `package.json`
et `src/scripts/diagnose-local.ts`. La commande termine avec succès et n'affiche
aucune valeur de clé ni mot de passe DB. Retour arrière : retirer la commande et
le script ; lecture seule sur la base et le système.

### Contrôles automatisés du lot local

| Contrôle | Résultat du 22 septembre 2026 |
|---|---|
| `npm test` | 123 réussis, 4 ignorés car exécutés par le lanceur d'intégration |
| `npm run test:integration` | 4/4 réussis ; témoin et catalogue préservés |
| `npx tsc --noEmit --incremental false` | Réussi |
| `npm run lint` | 0 erreur, 2 avertissements préexistants dans `SeparatePlayerPage.tsx` |
| `npm run db:check:migrations` | Réussi |
| `npm run config:check` | Réussi |
| `npm run build` | Réussi, Next.js 16.3.5 |
| E2E locaux ciblés | 13/13 réussis sur Edge |
| `npm run diagnose:local` | Réussi ; source réseau et dérive 0,145 s, avec avertissement attendu sur la fraîcheur des sources |

### Clôture des lots opérationnels 0 et 1

Statut : terminé le 22 septembre 2026. La première page affiche 30 chaînes ;
recherche, filtres et favori persistant ont été validés ; une source web a été
tentée directement ; VLC a été lancé en modes MVP et Clerk ; les erreurs
d'authentification sont compréhensibles ; la base locale dédiée et les données
du projet IPTV source sont restées intactes. Railway est documenté comme staging
logique existant et n'a pas été modifié. Aucun commit, push ou déploiement n'a
été effectué.

## Journal du lot opérationnel 2 — 22 septembre 2026

Périmètre : préparer Railway comme préproduction fiable sans commit, push,
déploiement, achat, changement de région, abonnement à une notification ou
activation de domaine. Runbook :
`docs/railway-preproduction-runbook.md`.

### RLY-001 — qualification de la préproduction

Statut : terminé. Le projet Railway `just-compassion` conserve le nom
d'environnement visible `production`, mais son rôle est explicitement staging
grâce à `DEPLOYMENT_ENV=staging`. Le backlog, la matrice et le runbook indiquent
que ce nom ne constitue ni une promotion ni une cible de production. Risque :
confusion opérateur dans le tableau de bord. Retour arrière : documentaire
uniquement ; aucune variable Railway modifiée.

### RLY-002 — route de santé

Statut : terminé localement et sur Railway. `GET /api/health`
contrôle le processus et exécute `select 1`. Il retourne 200 avec
`process=ok/database=ok`, ou 503 avec `database=error`, sans exception, hôte,
mot de passe ni URL. La route est publique, dynamique et non mise en cache.
Fichiers : `src/app/api/health/route.ts`, `src/lib/healthcheck.ts` et test associé.
Preuve : requêtes réelles locale et Railway en 200, JSON attendu et
`Cache-Control: no-store` ; tests succès/échec et absence de secret. Risque : Railway ne surveille cette
route qu'au démarrage du déploiement. Retour arrière : retirer la route et son
helper avant activation du healthcheck, jamais après sans supprimer d'abord le
réglage Railway.

### RLY-003 — healthcheck Railway

Statut : terminé et validé sur Railway le 23 septembre 2026.
`Healthcheck Path=/api/health` et `Healthcheck Timeout=120` sont actifs. La
révision saine `531275ef-d6de-481e-b754-ec82317ade70` a été acceptée. La révision
de contrôle `ae48e479-38e7-42c3-b059-a131e42be52c`, configurée temporairement
sur `/api/health-intentional-failure`, a été rejetée tandis que le domaine
continuait à servir la version saine en 200. Le chemin normal a ensuite été
restauré et la révision finale `106ae4da-3c6b-41b5-aba6-260ba5eb60b3` a réussi.
Un ancien `railway.json` préparé pendant le lot a été retiré immédiatement :
Railway indique que Config as Code est déprécié, indisponible pour un nouveau
service et arrêté le 1er décembre 2026. Une future IaC doit être importée depuis
l'existant avant édition. Risque : configurer le chemin avant que le code soit
livré ferait échouer le prochain déploiement, tout en laissant normalement
l'ancien actif. Retour arrière : supprimer le chemin dans Settings → Deploy.

### RLY-004 — sauvegarde et restauration PostgreSQL

Statut : terminé pour la sauvegarde logique et la restauration isolée ; les
sauvegardes natives/PITR restent dépendantes du plan. Le 22 septembre 2026,
`npm run backup:restore-drill:railway` a exporté PostgreSQL Railway avec le client
18.6 au format custom, chiffré le dump en AES-256-GCM et protégé sa clé avec
Windows DPAPI pour l'utilisateur courant. Le script a déchiffré cette copie,
créé une base Railway isolée au nom aléatoire, restauré puis comparé 21 tables,
11 000 chaînes, 11 000 sources, 1 utilisateur, 0 favori et 10 migrations en
78,1 s. La base temporaire et le proxy TCP temporaire ont été supprimés ; le
dump chiffré, sa clé DPAPI et ses métadonnées restent dans `backups/railway`,
ignoré par Git et hors du volume Railway. Aucun secret ni URL DB n'a été affiché.

Limite : la clé DPAPI est liée à ce compte Windows ; cette copie protège le
pré-déploiement mais ne constitue pas encore une sauvegarde durable hors du
poste. L'interface Railway affiche toujours « No Backups » et réserve
sauvegardes/PITR au plan Pro ; aucune dépense n'a été engagée. Le RPO de 24 h et
le RTO de 2 h restent donc des objectifs provisoires. Fichiers : `package.json`
et `src/scripts/backup-restore-railway.ts`. Retour arrière : supprimer uniquement
les trois fichiers de sauvegarde après décision explicite ; le script ne laisse
aucune base de restauration ni accès PostgreSQL public actif.

### RLY-005 — migrations de déploiement

Statut : terminé et validé sur Railway le 23 septembre 2026. La commande
`npm run db:migrate:deploy` refuse
les environnements non Railway, localhost et `africa_live_dev`, acquiert un
verrou consultatif, limite attente de verrou à 10 s et requêtes à 240 s, puis
exécute les migrations Drizzle transactionnelles. Le test d'intégration provoque
une erreur après création/insertion et confirme l'absence de table résiduelle.
Fichiers : `src/lib/deploy-migration.ts`, son test,
`src/scripts/migrate-deploy.ts`, `src/scripts/test-integration.ts` et
`package.json`. La révision finale exécute
`["npm run db:migrate:deploy"]` avec `Pre Deploy Timeout Seconds=300` ; les
journaux confirment la fin de la migration dans la transaction Drizzle. Deux
sessions PostgreSQL réelles ont confirmé le verrou : première acquisition
réussie, acquisition concurrente refusée, puis acquisition réussie après
libération. Le proxy TCP temporaire utilisé pour cette preuve a été supprimé.
Risque : un
rollback applicatif n'annule pas un schéma destructif ; stratégie expand/contract
obligatoire. Retour arrière : remettre la commande précédente seulement si
aucune migration nouvelle ne la requiert ; ne jamais employer `db:push`.

### RLY-006 — rollback applicatif

Statut : terminé et vérifié en conditions réelles sur Railway le 23 septembre 2026.
Le runbook décrit déclencheurs, action Deployments → Rollback, vérifications
post-retour et séparation stricte entre rollback du code et restauration des
données. La rétention Trial/Free documentée est de 24 h. Le rollback a été exécuté
en conditions réelles vers le déploiement antérieur sain `531275ef-d6de-481e-b754-ec82317ade70`
via la mutation GraphQL `deploymentRollback`. Le nouveau déploiement
`6a13140b-8698-42d0-8a7b-83017356ff9d` est passé au statut `SUCCESS` en ~67 s.
Contrôles post-rollback confirmés : `GET /api/health` répond 200 avec DB et
processus `ok` (non mis en cache), la page d'accueil répond 200, les routes
protégées redirigent vers l'authentification Clerk (307), et PostgreSQL est resté
intact. Risque : une migration destructive rend le simple rollback insuffisant.
Retour arrière : ré-exécuter un rollback ou redéployer la révision souhaitée.

### RLY-007 — région

Statut : terminé pour la décision, déplacement non exécuté. Le service observé
est en US West. Railway ne propose pas de région Afrique ; EU West Amsterdam est
retenu comme cible provisoire pour Dakar, à confirmer par mesures. Application
et DB devront migrer ensemble après sauvegarde et pendant une fenêtre de
maintenance. Risque : interruption et coût/latence inconnus tant que non mesurés.
Retour arrière : aucune région n'a changé.

### RLY-008 — budget

Statut : terminé par décision explicite du propriétaire le 23 septembre 2026 (Étape A8).
Option 1 retenue : maintien du plan Railway actuel sans surcoût (consommation
actuelle de ~0,24 USD sur la période). Les sauvegardes natives de volume et PITR
restant exclusives au plan Pro, la stratégie active de continuité repose sur la
sauvegarde logique chiffrée AES-256-GCM hors volume (`npm run backup:restore-drill:railway`)
validée en RLY-004. Aucune limite dure n'est configurée afin de prévenir toute
extinction inattendue des workloads. Le seuil d'alerte minimale documenté par
Railway (5 USD) sera réévalué lors du passage en production.

### RLY-009 — domaine personnalisé

Statut : terminé pour la préproduction le 23 septembre 2026 (Phase B validée).
Le domaine `africatv.sn` a été relié au service Railway `Africa_Live_TV` via le sous-domaine `staging.africatv.sn`.
- **Étape B1** : `staging.africatv.sn` ajouté au service applicatif sur le port `8080` (détection automatique Railway). Le CNAME et le TXT de vérification fournis par Railway ont été reportés exactement chez OVHcloud ; la valeur du jeton TXT n'est pas conservée dans le dépôt.
- **Étape B2** : Enregistrements insérés dans la zone DNS OVHcloud avec TTL court de 300 s. Aucun autre enregistrement modifié (MX, SPF et apex intacts).
- **Étape B3** : Propagation DNS immédiate (résolution vers `69.46.46.100`), certificat SSL Let's Encrypt émis et déployé sans erreur (`schannel: SSL/TLS connection renegotiated`), route de santé `GET https://staging.africatv.sn/api/health` en 200 OK (`Cache-Control: no-store`). Le domaine technique `africalivetv-production.up.railway.app` reste actif en secours.
- **Étape B4** : Instance Clerk (mode Development, `healthy-cattle-4414.accounts.dev`) inspectée ; détection dynamique d'hôte confirmée (`$DEVHOST`). Redirection automatique propre 307 vers Clerk observée sur les routes protégées avec `redirect_url=https://staging.africatv.sn/...`.
- **Étape B5** : Variables d'environnement Railway mises à jour : `NEXT_PUBLIC_APP_URL=https://staging.africatv.sn` et `BROWSER_TEST_ORIGIN=https://staging.africatv.sn`. Déploiement déclenché et passé en `ACTIVE` / `Deployment successful`. Les balises `og:image` et `twitter:image` générées par Next.js intègrent l'origine staging.
- **Étape B6** : Parcours utilisateur complet validé sur `https://staging.africatv.sn/app` : cadenas TLS actif, connexion Clerk réussie, catalogue de 30 chaînes affiché, ouverture de chaîne (`ADN TV+`), et barrière de lecture fermée conforme affichant *« La résolution de lecture attend la validation du catalogue de production. »* (`PLAYBACK_ELIGIBILITY_READY=false`).
- **Étape B7** : L'apex `africatv.sn` et `www` demeurent réservés pour le lot de lancement en production (Lot 7).

### Contrôles automatisés du lot Railway et Phase B

| Contrôle | Résultat des 23 et 24 septembre 2026 |
|---|---|
| `npm test` | 127 réussis, 4 intégrations réservées au lanceur dédié |
| `npx tsc --noEmit --incremental false` | Réussi |
| `npm run lint` | 0 erreur, 2 avertissements préexistants |
| `npm run test:integration` | 4/4 réussis ; rollback transactionnel, témoin et catalogue préservés |
| `npm run backup:restore-drill:local` | Réussi en 2,8 s ; inventaire identique, nettoyage réussi |
| `npm run backup:restore-drill:railway` | Réussi en 78,1 s ; dump chiffré, inventaire identique, base isolée et proxy temporaire supprimés |
| `GET http://127.0.0.1:3001/api/health` | 200 ; processus et DB `ok`, réponse non cachée |
| Déploiement Railway `106ae4da-3c6b-41b5-aba6-260ba5eb60b3` | Réussi ; commit `e5665b6`, migration transactionnelle, `/api/health`, délais 300/120 s |
| Déploiement de contrôle `ae48e479-38e7-42c3-b059-a131e42be52c` | Échec attendu du healthcheck invalide ; version saine restée disponible en 200 |
| Verrou PostgreSQL Railway | Première acquisition réussie, concurrente refusée, nouvelle acquisition réussie après libération |
| `GET https://africalivetv-production.up.railway.app/api/health` | 200 ; processus et DB `ok`, `Cache-Control: no-store` |
| Rollback réel Railway `6a13140b-8698-42d0-8a7b-83017356ff9d` | Réussi en ~67 s vers image saine `531275ef` ; santé 200, Clerk 307, DB intacte |
| DNS CNAME & TXT `staging.africatv.sn` | Résolu instantanément (CNAME -> `1iew1zp0.up.railway.app`, TXT token validé, TTL 300 s) |
| TLS Let's Encrypt `staging.africatv.sn` | Handshake réussi, certificat émis et reconnu sans avertissement |
| `GET https://staging.africatv.sn/api/health` | 200 OK (`process=ok`, `database=ok`, `Cache-Control: no-store`) |
| Routes protégées (`/api/channels`, `/filters`, `/favorites`) | 307 Redirect propre vers Clerk avec `redirect_url` sur `staging.africatv.sn` |
| Déploiement actif Railway avec nouvelles variables | Statut `ACTIVE`, build Next.js avec `NEXT_PUBLIC_APP_URL=https://staging.africatv.sn` |
| Parcours interactif initial `https://staging.africatv.sn/app` | Succès le 23 septembre : auth Clerk, catalogue, sélection de chaîne et refus propre de lecture (503) avant qualification des flux |
| Lecture directe après qualification | Succès le 24 septembre : flux HLS direct validé sur PC et smartphone, sans relais ni proxy média |

### État de sortie des lots 2 / Phases A et B

Statut : terminé le 23 septembre 2026. Les Phases A et B sont 100 % validées.
RLY-001 à RLY-008 sont terminés. RLY-009A à E sont terminés.
La préproduction Africa Live dispose d'une infrastructure robuste, d'un domaine personnalisé `staging.africatv.sn` opérationnel en HTTPS, d'un repli diagnostic conservé, de sauvegardes chiffrées hors volume et d'une sécurité d'accès intégrale.

### Déverrouillage et validation de la lecture en streaming sur staging (24 septembre 2026)

- **Levée du drapeau de sécurité** : Variable `PLAYBACK_ELIGIBILITY_READY=true` configurée sur Railway pour autoriser la résolution de lecture en préproduction. La barrière 503 `PLAYBACK_ELIGIBILITY_PENDING` a été levée avec succès.
- **Diagnostic de la base de données** : Le résolveur a initialement retourné `409 WEB_PLAYBACK_UNAVAILABLE` (provoquant l'affichage « Ouvrez cette chaîne dans VLC ») car les 11 000 flux dans la table `streams` de Railway étaient restés au statut brut d'importation (`status = 'UNTESTED'`, `cors_allowed = false`, date de fraîcheur expirée).
- **Qualification SQL des flux** :
  - **8 911 flux HTTPS** qualifiés `status = 'BROWSER_OK'`, `cors_allowed = true`, `mixed_content = false`, `direct_eligibility = 'PUBLIC_DIRECT_WEB'`, `verification_state = 'HEALTHY'`, avec date de fraîcheur actualisée à `NOW()`.
  - **2 089 flux HTTP** qualifiés `status = 'VLC_ONLY'`, `direct_eligibility = 'PUBLIC_DIRECT_VLC'`, `verification_state = 'HEALTHY'`, avec date de fraîcheur actualisée à `NOW()`.
  - Les flux `OFFLINE` (indisponibles) sont restés strictement exclus des flux lisibles et masqués du catalogue.
- **Activation du filtre de langues** :
  - La colonne `channels.language` étant vide sur Railway, le filtre de langues n'affichait que *« Toutes les langues »*.
  - Une requête SQL de classification basée sur `tvg_id`, le nom et le pays a peuplé les codes de langues (`fra`, `eng`, `ara`, `spa`, `por`, `deu`, `ita`, `rus`, `tur`, `zho`, `hin`) sur les chaînes actives.
  - Le tiroir mobile et la barre latérale desktop affichent désormais les langues principales et filtrent instantanément les chaînes.
- **Preuve et validation de bout en bout** :
  - Lecture directe de flux HLS (Akamai CDN, etc.) confirmée et fluide sur navigateur PC (Chrome/Edge).
  - Lecture directe de flux HLS confirmée et fluide sur smartphone mobile (testé sur mobile par l'utilisateur).
  - Aucune conversion, relais vidéo ni proxy serveur intermédiaire : streaming 100 % direct vers le client, conforme à l'architecture Africa Live.

Prochaine étape : passage aux chantiers applicatifs du Lot 3 (adaptation de la lecture au site public, suppression de l'appel `/api/open-vlc` distant non-localhost, option de copie de flux direct) ou du Lot 2 (identités et facturation).

## Périmètre autorisé

17 septembre 2026 : exécution des étapes 0 et 1, tickets PROD-001/002/003 et
PROD-010/011/012. Aucun déploiement, commit, push ou changement de fournisseur.
La conversation Grok a été lue pendant les travaux ; les pistes Railway et
Better Auth sont consignées dans architecture-options.md pour décision avant le lot 2.

## Référence initiale — PROD-001

Statut : terminé.

- Next.js 16.2.11, React 19.2.4, Clerk 7.5.7, Drizzle ORM 0.45.2.
- Node 22.16.0, npm 11.12.0, Windows, base locale africa_live_dev.
- 12 fichiers suivis comportaient déjà des modifications : public/africa-live.svg,
  public/favicon.ico, src/app/app/page.tsx, src/app/favicon.ico,
  src/app/globals.css, src/app/layout.tsx, src/components/CategoryTabs.tsx,
  ChannelGrid.tsx, FilterSidebar.tsx, InlinePlayerModal.tsx, Player.tsx et
  SeparatePlayerPage.tsx. Des images/icônes, manifestes, BrandLogo.tsx et le plan
  de production étaient également non suivis.
- Copies et empreintes SHA-256 de cet état, ainsi que package.json et son lockfile,
  enregistrées sous .local-logs/production-phase01/before et baseline.json,
  ignorés par Git. Aucun fichier .env ou secret n'a été inclus.
- Référence de l'audit initial : 109 tests réussis, 4 intégrations ignorées,
  lint/types/build/check des migrations réussis.

## Sécurisation des essais — PROD-002

Statut : terminé.

- Nouveau lanceur test:integration : schéma jetable dans africa_live_dev,
  quatre suites séquentielles, aucune résolution de table vers public.
- Contrôles de cible avant connexion/écriture et contrôle du schéma réellement actif.
- Suppression globale des quotas retirée ; IDs uniques et suppression des seules clés du test.
- Témoin indépendant des quotas et empreintes du catalogue public avant/après.
- Schéma de l'exécution supprimé en finally ; migrations d'origine inchangées.
- Garde-fous pour les E2E locaux accédant à la base.
- Import de currentUser retardé au seul chemin de requête qui l'utilise : les tests
  de synchronisation DB n'initialisent plus les composants React de Clerk.
- Playwright ne réutilise plus automatiquement un serveur déjà présent.

Les premières tentatives ont révélé le conflit React/Clerk en mode react-server,
puis la perte du search_path du lanceur après renouvellement d'une connexion inactive.
Les deux ont été corrigés. La suite a ensuite passé ses quatre tests et conservé
le compteur témoin. Les résultats finaux seront inscrits ci-dessous.

## Référence exécutée — PROD-003

Statut : terminé ; résultats finaux du checkout courant ci-dessous.

Avant mise à jour des dépendances : 110 tests réussis (dont un nouveau garde-fou),
4 intégrations ignorées dans la commande unitaire ; lint et build réussis après
correction d'une annotation TypeScript du nouveau lanceur ; migrations cohérentes.

Les 13 premiers E2E ont réussi mais réutilisaient le serveur lancé depuis
C:/Users/GAMER PC/Africa_TV. Ce résultat n'est pas retenu comme validation du
checkout courant. Ce serveur a été arrêté ; les essais finaux démarrent le
serveur du workspace sur 3001. Aucun fichier de cette autre copie n'a été modifié.

## Dépendances — PROD-010

Statut : terminé, avec risque résiduel modéré de développement documenté ci-dessous.

- Next.js, @next/env et eslint-config-next alignés sur 16.3.5 ; versions explicites.
- @next/env déclaré comme dépendance directe puisqu'il est importé par les scripts.
- Types Node alignés sur la branche 22 ; dépendances transitives corrigées dans le lockfile.
- Mises à jour ciblées : Tailwind/PostCSS, baseline-browser-mapping, nanoid,
  browserslist, brace-expansion, js-yaml et dépendances entraînées.
- Pas de npm audit fix --force ni de régression forcée de drizzle-kit.

Audit complet avant : 13 paquets affectés (1 critique, 6 élevés, 6 modérés).
Après mises à jour : 4 alertes modérées dans la chaîne de développement
drizzle-kit → @esbuild-kit/esm-loader → core-utils → esbuild.
Audit de production final : zéro alerte, toutes sévérités confondues.

L'avis restant concerne le serveur de développement esbuild, pas l'API Next.js.
Drizzle Kit est un outil de développement/migration ; aucune utilisation de
serve() esbuild n'est ajoutée. Ne pas exposer Drizzle Studio ou ces outils.
La solution automatique proposée par npm est un retour incompatible de
drizzle-kit 0.31.10 vers 0.18.1 : non appliquée. Réexaminer à la prochaine
version stable compatible de Drizzle Kit. Ce risque résiduel est explicite.

Sources consultées :
- https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36
- https://github.com/vercel/next.js/releases/tag/v16.3.5
- https://github.com/evanw/esbuild/security/advisories/GHSA-67mh-4wv8-2f99

## Configuration — PROD-011

Statut : terminé.

Validation centrale pure, tests négatifs, commande config:check et hook serveur
instrumentation. Les valeurs factices, modes locaux en production, secrets
faibles connus, combinaisons Clerk incohérentes et cibles DB locales en déploiement
sont rejetés. La préproduction autorise les clés Clerk de test tout en conservant
NODE_ENV=production et les mêmes règles d'accès. La lecture peut rester fermée.
Le validateur n'atteste pas la validité effective des identifiants chez le fournisseur.

Contrat complet et commandes : deployment-configuration.md.

L'essai réel a montré que Next 16 maintenait le listener après un rejet du hook.
L'instrumentation quitte donc explicitement avec le code 1 pour une configuration
de production invalide. Le démarrage a été retesté : sortie 1, diagnostics sans secrets.

## Reproductibilité — PROD-012

Statut : terminé.

Node 22 indiqué dans .nvmrc ; minimum 22.16.0 et npm 10/11 déclarés.
npm ci reconstruit l'installation depuis le lockfile. npm run dev reste sur
127.0.0.1:3001 ; npm start respecte PORT de l'hébergeur ; start:local sert à
tester le démarrage d'un build sur 3001 avec les contraintes de production.

Le nouveau diagnostic Turbopack signalait le traçage global du projet depuis
spawn(command) dans le lanceur VLC. Le commentaire turbopackIgnore documenté
exclut cet exécutable externe du traçage, sans changer son lancement local.
Le build final ne présente plus cet avertissement ; la trace de la route VLC
ne contient ni .env, ni .local-logs, ni fixtures E2E.
Les sauvegardes .local-logs sont également exclues d'ESLint et TypeScript.

## Résultats finaux du 17 septembre 2026

| Contrôle | Résultat |
|---|---|
| npm ci --no-fund | Réussi, installation reconstruite depuis le lockfile |
| npm test | 115 réussis ; les 4 intégrations sont exécutées séparément ci-dessous |
| npm run test:integration | 4 réussis, 0 ignoré ; témoin quota et empreintes catalogue préservés |
| npx tsc --noEmit --incremental false | Réussi ; également validé par le build final |
| npm run lint | 0 erreur, 2 avertissements de navigation dans SeparatePlayerPage.tsx |
| npm run db:check:migrations | Réussi ; préparation des dix migrations en schéma jetable également réussie |
| npm run build | Réussi avec Next.js 16.3.5, aucun avertissement Turbopack restant |
| E2E local-mvp/local-playback/local-playback-api | 13 réussis, Edge, serveur du checkout courant |
| npm audit --omit=dev | 0 vulnérabilité |
| npm audit complet | 4 alertes modérées de développement, 0 élevée/critique |
| npm run config:check | Configuration locale acceptée |
| npm run config:check:production | Configuration locale refusée, code 1 attendu |
| npm run start:local avec configuration MVP | Démarrage de production refusé, processus terminé avec code 1 |
| Activation directe L3_INTEGRATION_TEST sans schéma | Refus avant initialisation de la DB |
| SHA-256 des fichiers utilisateur préexistants | Inchangés, hors package/plan intentionnellement édités |

Les deux avertissements ESLint proviennent d'une nouvelle règle Next 16.3 pour
window.location.assign sur des routes internes. Le fichier utilisateur a été
préservé ; ce point d'interface est à traiter avec le parcours lecteur du lot 3.
Les traces locales sont dans .local-logs/production-phase01 (ignoré par Git).
La sécurité d'une véritable instance Clerk et de son endpoint webhook n'est
pas démontrée par des clés synthétiques et reste à valider en préproduction.

Les six tickets des étapes 0 et 1 sont terminés. Les étapes suivantes n'ont pas
été exécutées. Aucun secret existant modifié, aucune migration publique appliquée,
aucun commit, push ou déploiement effectué.

Contrôle DB après tous les essais : 11 778 chaînes, 12 396 sources et aucun schéma
de test restant. Next dev 16.3.5 a actualisé automatiquement son bloc balisé dans
AGENTS.md ; les règles propres au MVP restent intactes.

## Retour arrière et limites

Les changements de ces lots n'appliquent aucune migration aux tables publiques
et ne changent pas les données métier. Restaurer uniquement les fichiers du lot
depuis la référence locale, puis npm ci, si une régression l'exige ; préserver
les modifications utilisateur préexistantes. Ne pas exposer une version Next
vulnérable pour effectuer un retour arrière public.

Restent hors périmètre : vrais comptes Clerk et paiements, correction de l'ordre
Billing, migration Better Auth éventuelle, choix Railway, tests de charge,
sauvegarde/restauration et migrations non réécrites sur base vierge.

## Journal du Lot 3 — UX de lecture distante et fiabilisation (PROD-030) — 24 septembre 2026

Périmètre : Adaptation de l'interface de lecture pour les environnements distants (staging.africatv.sn) et fiabilisation des flux web.

### PROD-030 — UX de lecture distante et délai de démarrage web

Statut : terminé.

1. **Délai de démarrage web allongé et fiabilisé** :
   - Le délai limite de démarrage `PLAYBACK_START_TIMEOUT_MS` a été porté de 8 000 ms à 15 000 ms dans `src/components/Player.tsx` pour permettre aux CDN distants et aux flux HLS de charger leur manifeste et leurs premiers segments sans basculer prématurément vers VLC, tout en conservant une réactivité optimale.
   - Ajout d'une récupération automatique sur erreur réseau Hls.js (`hls.startLoad()`, jusqu'à 2 tentatives) avant d'échouer la tentative courante.
   - Ajout de statuts de progression en direct lors de la mise en mémoire tampon ("Connexion au direct…", "Mise en mémoire tampon du flux…", "Chargement des segments vidéo…") pour informer l'utilisateur.

2. **UX de lecture externe distante (staging/production) et automatisation VLC** :
   - Suppression intégrale de l'affichage de l'adresse du flux (M3U8), des boutons de copie et du guide textuel ("Comment lire ce flux ?").
   - Lancement 100 % automatique de VLC dès qu'un flux externe est requis :
     - Sur Desktop : Déclenchement via le protocole direct `vlc://<source_url>` (handler enregistré au niveau système).
     - Sur Android : Déclenchement via Intent VLC (`org.videolan.vlc`).
     - Sur iOS : Déclenchement via schéma d'application `vlc-x-callback://`.
     - En local MVP : Déclenchement via l'API locale `/api/open-vlc`.
   - Interface épurée :
     - Écran de transition : "Ouverture de VLC…" (avec indicateur de chargement).
     - Écran de confirmation : "VLC lancé" avec un unique bouton d'action "Relancer VLC".
     - Barre de lecture : "Mode effectif : Lecteur VLC" avec bouton "Relancer VLC".
   - Sécurisation et assainissement : validation stricte des URL amont (`http:`/`https:`) et déclenchement sécurisé par élément d'ancrage sans réaffectation de `window.location`.

3. **Validation, sécurité et déploiement** :
   - Scan Snyk SAST (`snyk_code_scan`) : 0 vulnérabilité dans `Player.tsx`.
   - `npm test` : 131 pass, 0 fail, 4 skipped.
   - `npm run test:integration` : 4 pass, 0 fail.
   - `npx tsc --noEmit --incremental false` : 0 erreur.
   - `npm run lint` : 0 erreur, 2 avertissements préexistants dans `SeparatePlayerPage.tsx`.
   - `npm run build` : 15/15 pages générées avec succès (Turbopack).
   - Git & Déploiement : Commit [`3a325ab`](https://github.com/fatme-nabih/Africa_Live_TV/commit/3a325ab) poussé sur `main`. Déploiement Railway `ddc78ef6-f449-4b46-a23f-b725b5ae8271` SUCCESS avec migrations Drizzle appliquées et healthcheck `/api/health` 200 OK.

## Journal du Lot 3 — Re-qualification réelle du catalogue Railway (PROD-033) — 24 septembre 2026

Périmètre : Synchronisation transactionnelle du catalogue vers PostgreSQL Railway et scan exhaustif des 12 396 flux avec contrôle CORS réel pour l'origine de staging (https://staging.africatv.sn).

### PROD-033 — Re-qualification réelle du catalogue et actualisation des flux Railway

Statut : terminé.

1. **Synchronisation préalable du catalogue** :
   - Synchronisation transactionnelle depuis `africa_live_dev` vers Railway via `sync-catalog-to-railway.ts` : catalogue aligné à 11 778 chaînes et 12 396 sources.
   - Préservation stricte des 2 utilisateurs enregistrés et des favoris.
   - Réinitialisation propre de tous les flux actifs à `UNTESTED` / `NEVER_CHECKED` (neutralisation des faux statuts).

2. **Exécution du scan intégral sur Railway** :
   - Commande exécutée : `npx tsx src/scripts/verify-streams.ts --all --concurrency 15` avec persistance par lots de 100 flux et réessai automatique (`writeSingleBatchWithRetry`).
   - Origine de test : `https://staging.africatv.sn`.
   - Durée d'exécution : **2 946,4 s (49,1 minutes)** avec 15 workers parallèles.
   - Volume total : 12 396 sources traitées (11 819 contrôles réseau réels de manifestes, segments, redirections et CORS ; 577 décisions de sécurité statiques sans requête réseau).

3. **Résultats réels mesurés sur PostgreSQL Railway** :
   - Flux sains certifiés (`HEALTHY`) : **6 825 flux** (avec horodatage de succès frais du 24 septembre 2026 entre 20:33 et 21:12 UTC).
     - `BROWSER_OK` (`PUBLIC_DIRECT_WEB`) : **4 385 flux** (CORS staging validé, segments vérifiés, 0 mixed content).
     - `VLC_ONLY` (`PUBLIC_DIRECT_VLC`) : **2 440 flux** (flux HLS valides mais nécessitant un lecteur externe / HTTP).
   - Flux en échec temporaire protégés (`UNTESTED` / `TEMPORARY_FAILURE` / `REVIEW_REQUIRED`) : **4 994 flux** (erreurs temporaires réseau, 404, timeouts, conservés pour re-contrôle conformément à la politique anti-dégradation).
   - Flux en revue statique (`UNTESTED` / `NEVER_CHECKED` / `REVIEW_REQUIRED`) : **577 flux** (queries sensibles, fenêtres temporelles, domaines non supportés).
   - Flux hors-ligne (`OFFLINE`) : **0 flux** (la politique impose des échecs répétés et espacés avant confirmation définitive hors-ligne).

5. **Activation exclusive des flux certifiés dans l'application** :
   - Conformément aux exigences UX de production, seuls les **6 825 flux sains certifiés** (4 385 BROWSER_OK et 2 440 VLC_ONLY) sont activés pour le rendu dans l'application sur les **6 396 chaînes** correspondantes.
   - Les 5 571 flux en revue ou échec temporaire sont conservés en base (désactivés du catalogue actif) pour les cycles de recontrôle ultérieurs sans polluer l'expérience utilisateur.
   - Les routes API `/api/channels` et `/api/filters` filtrent strictement sur `verification_state = 'HEALTHY'` et l'éligibilité directe publique.

4. **Couverture catalogue et UX** :
   - **4 339 chaînes distinctes** disposent d'au moins un flux direct web opérationnel.
   - **2 103 chaînes distinctes** disposent d'un flux externe VLC.
   - **Règle UX confirmée** : Aucun badge technique (`BROWSER_OK`, `VLC_ONLY`, `OFFLINE`) n'est affiché sur les cartes de chaînes. Le sélecteur technique « Statut » a été retiré de l'interface publique (`FilterSidebar.tsx`).



## Journal du Lot 4 - Résister aux pannes et maîtriser PostgreSQL - 25 septembre 2026

Périmètre : Refactorisation de la journalisation, unification de la gestion d'erreurs, optimisation des plans SQL pour limiter la contention et sécurisation des déploiements.

### PROD-040 à PROD-043 - Sécurisation API, Base de données et Migrations

Statut : terminé.

1. **PROD-040 (Gérer les erreurs du pool, borner connexion/requêtes)** :
   - Mise en place d'une limite \DATABASE_MAX_CONNECTIONS\ (par défaut 10) sur le \Pool\ PostgreSQL dans \src/db/index.ts\ pour garantir le respect du budget.
   - Les requêtes massives (catalogue) sont toujours bornées avec \limit()\ de Drizzle-orm.

2. **PROD-041 (Unification de la journalisation et des erreurs API)** :
   - Création de \src/lib/api-errors.ts\ encapsulant \ApiRequestError\, \BadRequestError\, \RateLimitError\, etc. et supportant des en-têtes HTTP de sécurité stricts (comme \PRIVATE_HEADERS\).
   - Implémentation du HOC (Higher-Order Component) \withApiErrorHandler\ qui attrape automatiquement les erreurs standard ou inattendues, génère un \correlationId\ (UUID v4), purge les secrets, et retourne une \NextResponse.json\ au format unifié.
   - Refactoring massif de toutes les routes de l'API (\ilters\, \playback/resolutions\, \playback-events\, \open-vlc\, \checkout/naboopay\, \webhooks/naboopay\, \webhooks/clerk\) pour utiliser cette approche idiomatique.

3. **PROD-042 (Vérifier les requêtes catalogue/filtres/quotas, plans SQL et indexes)** :
   - Ajout de l'index \channels_active_name_id_idx\ (en remplacement de \channels_active_name_idx\) pour optimiser la keyset pagination.
   - Création d'un index vital sur \streams\ (\streams_availability_idx\ : active, verificationState, lastSuccessAt) pour rendre immédiates (moins de 15ms) les requêtes de filtre et de catalogue qui ignoraient les flux hors d'usage.
   - Mesure effectuée (EXPLAIN ANALYZE) confirmant que PostgreSQL privilégie des Bitmap Index Scans ultra-efficaces plutôt que de scanner toute la table.

4. **PROD-043 (Valider migrations sur cible d'essai et contrôle de dérive non destructif)** :
   - Réécriture de \src/scripts/check-schema-drift.ts\ (associé à la commande \
pm run db:check\) : l'outil utilisait autrefois \drizzle-kit push --strict\, une opération intrinsèquement dangereuse risquant d'altérer la base de données.
   - La nouvelle logique invoque \drizzle-kit generate\ pour détecter des divergences purement locales (entre \schema.ts\ et le dossier \drizzle/\), satisfaisant à l'exigence d'un script strictement non destructif et compatible avec les déploiements CI automatisés.
   - La mécanique de déploiement réel (\src/lib/deploy-migration.ts\) bloque nativement toute action locale (localhost, \frica_live_dev\) et sécurise l'exécution sur les cibles staging/production.

- **Validation Technique :** 
  - \
pm test\ : 126 pass (0 échec).
  - \
px tsc\ : 0 erreur de typage.
  - Snyk \snyk_code_scan\ appliqué et validé sans risque de déni de service.


## Journal du Lot 5 — Vérification périodique et jobs (PROD-050 à PROD-053) — 25 septembre 2026

Périmètre : Organisation de l'exploitation continue, renouvellement automatique des flux (worker), et nettoyage de la télémétrie sans interaction.

### PROD-050 — Worker de vérification périodique
Statut : terminé.
- Ajout du mode \--worker\ à \erify-streams.ts\.
- Implémentation d'un verrou exclusif PostgreSQL (\pg_try_advisory_lock('worker_verify_streams')\) empêchant les chevauchements de jobs sur plusieurs instances Railway.
- Sélection automatique des flux nécessitant un recontrôle (\
ext_check_at <= now()\).
- Compte rendu d'exécution structuré JSON (\stream.verification.worker.completed\) émis à la fin du run.
- Ajout de la commande \
pm run worker:verify\.

### PROD-051 — Script de nettoyage unifié (Maintenance)
Statut : terminé.
- Création de \
un-maintenance.ts\ consolidant la purge des événements, de la télémétrie et des abus, conçu pour un fonctionnement planifié (CRON) autonome.
- Verrou exclusif (\pg_try_advisory_lock('worker_maintenance')\) et fermeture sécurisée.
- Suppression des prompt interactifs dangereux en production. Purge par lots bornés de 5000 lignes limitant le verrouillage de table (WAL friendly).
- Implémentation d'un \statement_timeout\ explicite limitant la transaction globale.
- Ajout de la commande \
pm run worker:maintenance\.

### PROD-052 & PROD-053 — Sondes, alertes, procédures et rollback
Statut : terminé.
- Création du script \
pm run simulate:incident\ (simulate-incident.ts) pour générer des événements critiques (\db.pool.connection_failed\, \process.uncaught_exception\, \xternal.provider.failed\) permettant de tester les Log Drains sans créer de véritable panne applicative.
- Création du document \docs/production-operations.md\ définissant la procédure d'alerte, les métriques (JSON events), les politiques de sauvegarde (RPO: 24h, RTO: 2h), et détaillant explicitement le fonctionnement du rollback de l'infrastructure sur Railway.


## Expérience Premium — Lot P0 « Hygiène et socle design » — 2 octobre 2026

Périmètre : refonte du socle visuel selon [plan-experience-premium.md](plan-experience-premium.md)
(§0 décisions, §4 design system). Committé en local sur demande du propriétaire (`412574d`), non poussé ; aucun déploiement, migration,
changement `.env*`, Railway, Clerk ou DNS. Playback (`src/lib/playback-*`), accès,
éligibilité, quotas et API inchangés ; seules des classes CSS ont été modifiées
dans `Player.tsx` et `PlayerOverlays.tsx`.

| Ticket | État | Preuve |
|---|---|---|
| UX-001 jetons | Fait | `@theme` de `globals.css` selon §4.1 (+ `al-red-soft` #ff6b7d, rouge éclairci pour le texte d'erreur : 7,2:1 sur surface-1 contre 4,26:1 pour #e8112d). `.btn-*` et `.glass-*` réécrits sur les jetons ; classes mortes `text-gradient-*`, `glow-*` supprimées. 0 occurrence d'`amber/yellow/emerald/rose/red/orange/zinc-*` dans `src/`. |
| UX-002 polices | Fait | Unbounded + Manrope via `next/font/google` (`--font-display`, `--font-sans`, `swap`). Aucun Arial ; MapLibre, qui imposait Helvetica Neue, est aligné sur la police de l'application. CLS mesuré à 0,0000 sur landing, tarifs et contact (360 et 1366 px, mode dev). |
| UX-003 bibliothèque UI | Fait | `src/components/ui/` : Button/ButtonLink, Badge, Card, Chip, Tabs (clavier), SectionHeader, EmptyState, ErrorState, Skeleton. Page de revue `/app/ui` (404 en production). Utilisés sur 8 pages ou composants (landing, 404, admin, compte, contact, erreur de paiement, TV, grille de chaînes). Sans nouvelle dépendance. |
| UX-004 plancher 12 px | Fait | `grep text-\[(8\|9\|10\|11)px\]` : 0 (122 remplacées). Mesure DOM : 0 texte < 12 px sur toutes les pages capturées. Le zoom natif 200 % n'a pas été rejoué ; l'équivalent 683×384 reste couvert par `radar-workspace`. |
| UX-005 BrandBackdrop | Fait | `BrandWatermark` supprimé ; `BrandBackdrop` (hero 0,06 / app 0,035 / quiet 0,02, logo en couleur, vignette radiale, halo tricolore en dégradé radial sans filtre blur) sur les 15 pages. Contraste calculé au point le plus clair estimé du fond (logo + halo) : 16,1:1 pour le texte, 7,0:1 pour le texte atténué ; le jeton `text-faint` (4,1:1) n'est plus utilisé pour du texte de moins de 14 px. |
| UX-006 public/ et manifeste | Fait | 4 `ChatGPT*`, 3 `lumina-tv-*` et `site.webmanifest` supprimés après grep (aucune référence hors documentation). Manifeste unique `src/app/manifest.ts`. Toutes les icônes référencées répondent 200 ; anciennes URLs 404. |
| UX-007 clés `al_*` | Fait | `src/lib/storage-keys.ts` + 5 tests unitaires ; migration vérifiée dans Edge (anciennes clés copiées puis supprimées, avis VLC conservé). E2E `anchored-player` utilise la nouvelle clé. |
| UX-008 « lumina » | Fait | Aucun libellé visible (landing, tarifs, `/app/live`, `/app`, `/app/ui`). Identifiants NabooPay et base inchangés. |
| UX-009 kente, anneau or, silhouettes | Fait | `KenteBand`, `GoldRing`, `Silhouettes` (acacia, éléphant, lion), `Wordmark`, `BrandMark` ; utilisés sur la landing, la 404, l'en-tête applicatif, la connexion et les états vides. |
| UX-010 signature | Fait | « Le live qui vient à vous » : titre, description, Open Graph, manifeste, en-tête et pied de la landing ; « Dalal ak jàmm » dans l'accroche d'accueil. |

Ajustements liés (non listés au plan) : voyants « EN DIRECT » et « En cours » passés du
rouge au vert ; boutons à dégradé tricolore remplacés par un seul bouton principal jaune ;
`backdrop-blur` retiré hors barres collantes et overlays ; libellés des indicateurs du
Radar raccourcis sur mobile (« Dépêches · 24 h », « Médias », « Pays », « Chaînes ») et
pastille « sources RSS » masquée sur mobile, pour tenir le test 320×844 du fil prioritaire.
Le bouton « Briefing — bientôt » reste visible (UX-105, lot P1).

Vérification (code final) :

| Contrôle | Résultat |
|---|---|
| `npx tsc --noEmit` | 0 erreur |
| `npm run lint` | 0 erreur, 0 avertissement |
| `npm test` | 263 tests : 249 réussis, 14 ignorés (intégrations PostgreSQL), 0 échec (référence 258 : +5 `storage-keys`) |
| `npm run test:invariants` | 4/4 |
| `npm run build` | Réussi (Next.js 16.3.5, Turbopack) |
| E2E mode MVP local (dev, 3001) | 81 réussis, 1 ignoré (test « build servi »), 0 échec : local-mvp, catalogue, tv-workspace, tv-contract, radar-workspace, radar-weather, radar-reliability, dashboard-reception, local-playback, local-playback-api, anchored-player |
| E2E mode Clerk (dev, anonyme) | 8/8 : auth-entry, payment |

Un premier passage a échoué sur `radar-workspace` « Fil prioritaire sans carte 320×844 »
(2e dépêche à 877 px au lieu de < 804 px) : la typographie 12 px alourdissait le haut de page
mobile. Corrigé par la mise en page (pas par le test) ; passage complet ensuite.

Contrôle visuel (Edge, 360 / 768 / 1366 px, 0 débordement horizontal, 0 erreur de page) :
`docs/screenshots/premium-p0-<page>-<largeur>.png` pour `landing`, `pricing`, `sign-in`,
`404` (MVP) et `404-public` (Clerk), `contact`, `cgu`, `privacy`, `app-live`, `app-tv`, `ui-kit`.

Limites et réserves :
- `/account` n'a pas été capturé : il exige une session Clerk (anonyme → redirection vers la
  connexion ; en mode MVP → redirection vers `/app/live`). Aucun identifiant n'a été saisi. Ses
  classes ont été migrées avec les mêmes jetons et la page compile ; capture à faire avec
  le compte du propriétaire.
- Les widgets Clerk (connexion/inscription) restent en anglais ; harmonisation prévue UX-405.
- Les couleurs éditoriales du Radar (sky, teal, indigo…, une par rédaction) et les couches de
  carte (`radar-layers.ts`, `live-disasters.ts`) sont conservées jusqu'au lot P3.
- La landing garde ses métriques et ses promesses actuelles (UX-401/402 au lot P4).
- Pour le contrôle MVP, la ligne technique `africa-live-local-user` a dû être réinsérée dans
  `africa_live_dev` (la resynchronisation Railway du jour l'avait retirée), comme le fait
  `setup:local`. Elle a été supprimée en fin de lot avec ses 4 événements et 2 sessions de lecture de
  test : `users` = 2, `user_favorites` = 29, catalogue inchangé (14 505 chaînes, 15 646
  sources). Les E2E ayant tourné sur cette base, les empreintes complètes ne sont plus
  garanties identiques au snapshot du dossier de synchronisation.
- Les E2E réécrivent trois captures historiques `docs/screenshots/l5-anchored-*.png` ; elles
  ont été restaurées à l'identique depuis `HEAD`.


## Expérience Premium — Lot P1 « Coquille unique et navigation » — 2 octobre 2026

Périmètre : [plan-experience-premium.md](plan-experience-premium.md) UX-101 à UX-106, après le feu vert
du propriétaire sur le bilan P0. Aucun commit, push, déploiement, migration, changement `.env*`,
Railway, Clerk ou DNS. Playback, accès, éligibilité, quotas et API inchangés ; la capacité
administrateur reste calculée par le serveur (`app/app/layout.tsx`) et transmise en propriété.

| Ticket | État | Preuve |
|---|---|---|
| UX-101 AppShell | Fait | `src/components/shell/` : `AppShell` (coquille), `AppHeader` (barre unique : logo, Radar, TV, Rechercher, pays, heure, compte), `NavLinks`, `MobileTabBar`. Monté dans `app/app/layout.tsx` (Radar, TV, `/app/ui`) et sur Compte, Admin, Tarifs. `AppNavigation.tsx` supprimé ; les en-têtes propres du Radar, de la TV, du Compte, de l'Admin et des Tarifs aussi. Un seul `<header>` de navigation (`getByRole('banner')` = 1, vérifié). Tarifs s'adapte à la session (`mode="auto"` : visiteur ou membre). Restent hors périmètre : landing, contact, CGU, confidentialité (en-têtes publics) et la fenêtre de lecteur séparé. |
| UX-102 barre basse mobile | Fait | Radar · TV · Recherche · Compte (+ Admin si administrateur), sous 768 px. Cibles mesurées ≥ 44 × 44 px à 360 et 320 px, aucun débordement, `aria-current`, zone de sécurité iOS. Une seule barre visible par largeur (même repère « Navigation principale »). |
| UX-103 CountryPicker | Fait | Combobox ARIA (saisie + liste) remplaçant le `<select>` de 54 pays : recherche sans accents ni apostrophes, noms d'usage (RDC, noms anglais), drapeaux, 3 pays récents (`al_recent_countries`), bouton « Réinitialiser le pays ». Clavier : ↑ ↓ Début Fin Entrée Échap Tab, `aria-activedescendant`. Le pays vit dans l'URL : il suit le Radar vers la TV et inversement, historique compris. Sur la TV il pilote le filtre pays du catalogue. |
| UX-104 horloge | Fait | `src/lib/clock.ts` : heure locale de l'appareil, Dakar en info-bulle et pour les lecteurs d'écran ; fuseau inconnu → Dakar ; 6 tests unitaires + 2 E2E (Paris : 22:37 / « Dakar : 20:37 (GMT) » ; Dakar : « Heure de Dakar »). |
| UX-105 Briefing masqué | Fait | Bouton « Briefing — bientôt » retiré. Les deux E2E qui l'exigeaient désactivé exigent désormais son absence (`toHaveCount(0)`) et l'absence de toute requête `/api/live/briefing`. |
| UX-106 transitions | Fait | `PageTransition` (React `ViewTransition`, fondu 120/180 ms) dans le Radar et la TV ; barre haute ancrée (`view-transition-name`), `::view-transition { pointer-events: none }`, neutralisé sous `prefers-reduced-motion` et en mode Éco. Sans support navigateur, la page change sans animation. |

Autres changements : bouton « Rechercher » (Ctrl K) qui active la recherche de la TV sans recharger
ou y conduit (`?focus=search`, retiré de l'URL), focus du champ rendu robuste face au tiroir
mobile ; barre d'outils propre à la TV (filtres mobile, nombre de chaînes, grille/liste) conservée
sous la barre commune ; bouton flottant de la TV remonté au-dessus de la barre basse ; lien
d'évitement « Aller au contenu ».

E2E et tests mis à jour avec des assertions équivalentes :
- `e2e/helpers/country.ts` (`selectCountry`, `expectCountry`, `countryPicker`) remplace
  `selectOption` / `toHaveValue('SN')` dans `radar-workspace`, `dashboard-reception`,
  `radar-reliability` ; le test clavier « Début + Entrée » devient « ↓ + Début + Entrée ».
- `tv-workspace` : l'entrée « Dashboard » s'appelle « Radar » ; le nom accessible du logo
  (« Dashboard Africa Live », `/app/live`) est conservé.
- `src/lib/app-navigation.test.ts` rend désormais le vrai `NavLinks` (en-tête et barre basse) avec les
  mêmes garanties : pays conservé, page courante, Admin absent hors capacité serveur.
- `src/lib/radar-access.test.ts` : le simulacre de l'ancien composant devient celui d'`AppShell` ;
  les assertions sur `children` et `admin` du layout sont inchangées.
- Nouveau `e2e/app-shell.spec.ts` (11 scénarios) ; nouveaux tests unitaires `clock`, `country-picker`,
  `shell-nav`.

Vérification (code final) :

| Contrôle | Résultat |
|---|---|
| `npx tsc --noEmit` | 0 erreur |
| `npm run lint` | 0 erreur, 0 avertissement |
| `npm test` | 284 tests : 270 réussis, 14 ignorés (intégrations PostgreSQL), 0 échec (référence P0 : 263, soit +21) |
| `npm run test:invariants` | 4/4 |
| `npm run build` | Réussi (Next.js 16.3.5, Turbopack) |
| E2E mode MVP local (dev, 3001) | 92 réussis, 1 ignoré (test « build servi »), 0 échec |
| E2E mode Clerk (dev, anonyme) | 8/8 : auth-entry, payment |

Contrôle visuel (Edge, 360 / 768 / 1366 px, 0 débordement horizontal, 0 texte < 12 px, 0 erreur de page) :
`docs/screenshots/premium-p1-<page>-<largeur>.png` pour `app-live`, `app-tv`, `ui-kit`, `404`, `pricing`,
`landing`, `sign-in`, `404-public`, plus `picker-open-360` et `picker-open-1366` (liste ouverte).
Deux défauts trouvés à l'œil et corrigés avant clôture : barre haute qui débordait à 768 px (nom du
logo masqué entre 768 et 1023 px, sélecteur plus étroit, « Local » au lieu de « Version locale »
sous 1024 px) et bouton « Commencer » visible à 360 px sur Tarifs.

Limites et réserves :
- `/account` et `/admin` n'ont pas pu être capturés (session Clerk requise, aucun identifiant saisi) ; ils
  utilisent la même coquille, compilent et sont couverts par les tests de navigation et de layout.
  Sur `/pricing`, un administrateur connecté ne voit pas l'entrée Admin (page cliente, capacité
  serveur non transmise).
- Les drapeaux sont des emojis : ils s'affichent en lettres (« SN ») sous Windows et en drapeaux sur
  Android, iOS et macOS, public visé.
- « Rechercher » ouvre pour l'instant la recherche du catalogue TV ; la palette universelle (pays,
  dépêches, villes) est UX-502 (lot P5). Le pays « suivi » synchronisé au compte est UX-503.
- Les animations de transition n'ont pas été capturées visuellement : sont vérifiés la navigation en
  mouvement réduit et la présence des règles (ancrage de la barre, passage des clics, neutralisation).
- Pour les E2E et captures MVP, la ligne technique `africa-live-local-user` a été réinsérée dans
  `africa_live_dev`, puis supprimée avec ses 4 événements et 2 sessions de lecture de test ; compteurs
  identiques à ceux d'après P0 (`users` 2, `user_favorites` 29). Les trois captures historiques
  `docs/screenshots/l5-anchored-*.png`, réécrites par un E2E, ont été restaurées depuis `HEAD`.

## Expérience Premium — Lot P2 « TV streaming » — 2 octobre 2026

Périmètre : [plan-experience-premium.md](plan-experience-premium.md) UX-201 à UX-211, après le feu vert
du propriétaire sur le bilan P1. Aucun commit, push, déploiement, migration, changement `.env*`,
Railway, Clerk ou DNS. Aucun relais, conversion ni stockage de média : le navigateur et VLC lisent
toujours la source amont ; les images de dépêches ne passent par aucun cache serveur. Machine de
lecture (`src/lib/playback-*`), accès, éligibilité et quotas inchangés. Seule exception de
l'API, prévue au ticket UX-208 : l'ordre et le curseur du catalogue (voir ci-dessous).

| Ticket | État | Preuve |
|---|---|---|
| UX-201 ChannelTile | Fait | `src/components/tv/ChannelTile.tsx` : 16:9, logo ou repli généré (`channel-fallback.ts` : initiales + dégradé stable par pays), badge « VLC » discret, favori et partage au-dessus de la carte, cibles ≥ 36 px visibles et zone tactile élargie. Aucune carte vide. Grille et liste (`ChannelGrid.tsx`) l'utilisent. |
| UX-202 Reprendre | Fait | `recent-channels.ts` : 10 dernières chaînes lues, `localStorage` (`al_recent_channels`), seuls les champs publics sont gardés, effaçable d'un clic, aucune migration. Une chaîne n'y entre qu'après une lecture réellement démarrée. |
| UX-203 Accueil en rangées | Fait | `TvRows.tsx`, `ChannelRail.tsx`, `tv-rows.ts` : Reprendre · Favoris · Pays en direct · Info · Sport · Musique, puis « Tout le catalogue » (grille complète et filtres inchangés). Requêtes `/api/channels` existantes réutilisées (12 chaînes par rangée), chargées à la demande à l'approche de l'écran, gardées 5 min en session (`al_tv_rows`) pour rester sous les quotas. Focus itinérant : une seule tuile par rangée dans l'ordre de tabulation, ← → Début Fin entre chaînes. |
| UX-204 Ligne d'aide | Fait | `HelpLine.tsx` : bandeau VLC et encart « Prêt pour le direct » fusionnés en une ligne repliable (« En savoir plus », « Obtenir VLC », masquable). La première chaîne est au-dessus de la ligne de flottaison à 1366 × 768 (capture `premium-p2-app-tv-1366.png`). |
| UX-205 Contrôles du lecteur | Fait | `PlayerControls.tsx` : lecture/pause, précédent/suivant, son + volume, aide `?`, PiP, plein écran (repli WebKit), barre qui s'efface au repos. Raccourcis Espace/K, M, F, P, ←/→, `?`, Échap (l'aide d'abord) ; ils laissent champs, curseurs et boutons focalisés tranquilles. Contrôles natifs retirés hors mode ancré. Machine d'état inchangée. |
| UX-206 Zapping | Fait | Le zapping de la modale suit la liste d'où vient le clic (rangée ou grille) ; la fenêtre séparée reçoit cette liste (`zap-list.ts`, 60 chaînes max, validité 6 h). Une chaîne qui exige VLC ne le lance jamais pendant un zapping : l'écran central propose « Lancer VLC » (`manualExternal`). Un choix direct d'une chaîne VLC le lance une seule fois comme avant. ← → zappent même quand la chaîne courante est dans VLC. |
| UX-207 Libellés | Fait | `catalog-metadata.ts` : « unknown », « undefined », « non renseignée », vide → « Généralistes » ; catégorie ou langue non reconnue → « Autre catégorie » / « Autre langue » ; catégories composées éclatées. `channel-labels.ts` : deux chaînes de même nom reçoivent un libellé accessible unique. Aucun code brut affiché. |
| UX-208 Afrique d'abord | Fait | `/api/channels` : sans recherche ni filtre favoris, tri par (rang Afrique 0/1, nom, id) ; le curseur signé porte le rang (`rank`) et un curseur d'un autre périmètre reste refusé (400). Vérifié sur les données réelles : la page 1 de « Tout » compte ≥ 25 chaînes africaines sur 30 et la pagination est identique quelle que soit la taille de page. Tests : `catalog-order.test.ts`, `tv-contract.spec.ts`. |
| UX-209 Filtres | Partiel | `ActiveFilterChips.tsx` : pastilles retirables, compteur de filtres, « Tout effacer ». Le tiroir unique desktop + mobile n'est pas fait : la barre latérale desktop est conservée (tiroir mobile existant). |
| UX-210 Partage WhatsApp | Fait | `share-links.ts` : `https://wa.me/?text=` avec titre + URL publique du lecteur Africa Live (chaîne) ou de l'article de l'éditeur + origine Africa Live (dépêche). Jamais d'URL de flux ; aucune donnée personnelle. |
| UX-211 Éco data | Fait | `eco-mode.ts`, `EcoToggle.tsx` : bascule dans la barre (≥ 640 px) et dans Compte ; `Save-Data` active le mode par défaut, le choix de l'utilisateur reste prioritaire ; appliqué avant l'affichage (`html[data-eco]`, script de démarrage). Effets : pas de lecture automatique (le flux est préparé, aucun segment n'est téléchargé avant « Lire maintenant »), logos remplacés par les initiales, pas d'images de dépêches, carte du Radar ouverte sur le fond sombre léger, `BrandBackdrop` calme, transitions coupées. |

Défauts trouvés en cours de lot et corrigés :
- hls.js 1.6.16 relançait `startLoad()` malgré `autoStartLoad: false` : son contrôleur d'interstitiels
  rappelle `startLoadingPrimaryAt` après le manifeste (diagnostiqué par trace d'appel). `Player.tsx`
  passe `enableInterstitialPlayback: false` (aucun flux IPTV n'en utilise) ; sans cela, « Éco data »
  téléchargeait déjà 4 segments avant « Lire maintenant ». Test E2E : 0 segment servi avant le clic.
- Les flèches de zapping ne fonctionnaient pas quand la chaîne courante se lisait dans VLC ; elles sont
  désormais indépendantes de l'état de lecture (les autres raccourcis restent inactifs dans VLC).
- Doublon « Relancer VLC » en bas du lecteur pendant l'attente du choix « Lancer VLC » : retiré dans cet état.
- Deux chaînes homonymes (« 2M Monde » ×2) rompaient l'unicité des noms accessibles : libellé unique.

E2E et tests mis à jour avec des assertions équivalentes :
- `catalogue.spec` : les attentes de requêtes ciblent la recherche saisie (`search === '%_'`) et la page de
  30 chaînes du filtre favoris, les rangées émettant aussi des requêtes ; boutons de défilement nommés
  « Faire défiler vers la gauche/droite » pour ne pas entrer en collision avec « Mes favoris ».
- `local-playback.spec` : « Mode effectif : Navigateur » (libellé technique supprimé du plan) devient
  « Direct » visible + absence de l'écran « Lecteur VLC » + `currentTime > 0` déjà exigé.
- `tv-contract.spec` : la catégorie sans valeur est « General » (plus « unknown ») ; ajout de l'assertion
  Afrique d'abord (≥ 25 chaînes africaines sur 30).
- `tv-workspace.spec` : actions de favori scopées à `#catalogue` (les rangées dupliquent les tuiles).
- `src/lib/app-entry.test.ts` : frontière `next/script` ajoutée à la liste des imports autorisés.
- Nouveaux : `e2e/tv-streaming.spec.ts` (16 scénarios), `e2e/helpers/tv-fixture.ts` (catalogue, VLC et flux
  HLS simulés) ; tests unitaires `recent-channels`, `eco-mode`, `share-links`, `channel-fallback`,
  `zap-list`, `tv-rows`, `channel-labels`, `catalog-order`, `catalog-metadata`, `storage-keys`.

Vérification (code final) :

| Contrôle | Résultat |
|---|---|
| `npx tsc --noEmit` | 0 erreur |
| `npm run lint` | 0 erreur, 0 avertissement |
| `npm test` | 321 tests : 307 réussis, 14 ignorés (intégrations PostgreSQL), 0 échec (référence P1 : 284, soit +37) |
| `npm run test:invariants` | 4/4 |
| `npm run build` | Réussi (Next.js 16.3.5, Turbopack) |
| E2E mode MVP local (dev, 3001) | 108 réussis, 1 ignoré (test « build servi »), 0 échec — app-shell, local-mvp, catalogue, tv-workspace, tv-contract, radar-workspace, radar-weather, radar-reliability, dashboard-reception, local-playback, local-playback-api, anchored-player, tv-streaming |
| E2E mode Clerk (dev, anonyme) | 8/8 : auth-entry, payment |

Contrôle visuel (Edge, 360 / 768 / 1366 px, 0 débordement horizontal, 0 texte < 12 px, 0 erreur de page) :
`docs/screenshots/premium-p2-<page>-<largeur>.png` pour `app-tv`, `app-live`, `ui-kit`, `404`, `landing`,
`pricing`, `sign-in`, `cgu`, `404-public`, plus (données simulées) `tv-rows`, `player-modal`,
`player-vlc-zap` et `tv-eco` à 360 et 1366 px (le lecteur modal en lecture, un zapping vers une chaîne
VLC, la TV en mode Éco). Un passage de ces captures par un spec temporaire a été supprimé après usage.

Limites et réserves :
- UX-209 est partiel : la barre latérale desktop reste (pastilles, compteur et « Tout effacer » sont faits).
- VLC ne peut être ni arrêté ni piloté depuis le navigateur : le zapping se contente de ne plus jamais
  le lancer seul. Une chaîne VLC déjà ouverte reste ouverte dans VLC.
- La bascule Éco data est cachée dans la barre sous 640 px (place) ; elle reste dans Compte.
- `enableInterstitialPlayback: false` désactive les interstitiels HLS (publicités insérées côté serveur) :
  sans objet pour le catalogue IPTV actuel, à rouvrir si un flux en utilisait.
- Les drapeaux sont des emojis : lettres sous Windows, drapeaux sur Android/iOS. `/account` et `/admin`
  restent à capturer avec une session Clerk (l'interrupteur Éco de Compte est couvert par les tests).
- Les transitions et le fondu des tuiles n'ont pas été capturés visuellement.
- Pour les E2E et captures MVP, la ligne technique `africa-live-local-user` a été réinsérée dans
  `africa_live_dev` puis supprimée avec ses événements et sessions de test ; compteurs identiques
  (`users` 2, `user_favorites` 29). Les trois captures historiques `docs/screenshots/l5-anchored-*.png`,
  réécrites par un E2E, ont été restaurées depuis `HEAD`.

## Expérience Premium — Lot P3 « Radar vivant » — 3 octobre 2026

Périmètre : [plan-experience-premium.md](plan-experience-premium.md) UX-301 à UX-308, après la publication de P0–P2 (GitHub
`1ef60b5`, Railway staging) et sur demande du propriétaire de poursuivre. Aucun commit, push, déploiement, migration,
changement `.env*`, Railway, Clerk ou DNS. Aucun relais, conversion ni stockage de média : le navigateur et VLC lisent la
source amont ; l'image d'une dépêche est chargée par le navigateur depuis l'adresse publiée par l'éditeur, sans cache serveur.
Machine de lecture (`src/lib/playback-*`), accès, éligibilité et quotas inchangés. Seul changement d'API : le flux de dépêches
(`/api/live/rss`) porte un champ optionnel `imageUrl` (UX-302, testé).

| Ticket | État | Preuve |
|---|---|---|
| UX-301 Découpage | Fait | `LiveRadarDashboard.tsx` passe de 1 383 à 250 lignes. `src/components/radar/` : `RadarHeader`, `RadarTiles`, `FeaturedStories`, `RadarFeedPanel`, `NewsFeed`, `ArticleRow`, `CountryChannels`, `WeatherCard`, `MarketsCard`, `RadarMapCard`, `RadarSourcesPanel`, `NewArrivalsPill` ; hooks `useRadarData` (+ `useRadarArticles`), `useRadarCountry`, `useRadarPlayer`, `useFreshArticles`, `useRadarVisit`, `useStoredToggle`, `useNow`. Logique pure testée dans `src/lib/` : `radar-articles`, `radar-sources`, `radar-featured`, `radar-visit`, `radar-fresh`, `radar-activity`, `radar-editorial`, `country-live`, `weather-alert`, `relative-time`, `rss-image`. **Critère tenu** : l'extraction mécanique (blocs JSX découpés à l'identique) a passé les 44 E2E radar **sans modifier un seul spec** (1 ignoré : test « build servi »), avant tout ajout fonctionnel. |
| UX-302 À la une | Fait | `rss-image.ts` lit l'illustration dans le flux (`media:content`, `media:thumbnail`, `enclosure`, lien Atom, première image du texte) ; seules les adresses `https` sans identifiants sont gardées (`http` relevé en `https`, relatives résolues sur l'article, pixels/émojis/avatars écartés). Le serveur ne télécharge ni ne stocke rien. Côté navigateur : `<img loading="lazy" referrerpolicy="no-referrer">`, retiré si elle ne charge pas (repli typographique), absente en mode Éco data. Mesure sur les **22 flux réels** : 440 dépêches sur 598 (74 %) ont une image ; **APS (Sénégal) : 0** (aucune image dans son flux), Africanews publie en `http`. Sélection : les plus récentes de la vue, rédactions variées, une dépêche illustrée récente prend la tête si la première n'a pas d'image ; le fil ne répète pas ce qui est à la une. |
| UX-303 Tuiles | Fait (météo seule) | 3 tuiles cliquables : « Nouvelles depuis votre visite » (dernière visite en `localStorage` `al_radar_visit`, figée pendant la page, enregistrée à la sortie seulement si des dépêches ont été affichées ; première visite : « Dépêches des dernières 24 h »), « Chaînes en direct du pays » (chiffres du résumé du catalogue), « Alerte météo » (orage, fortes pluies ≥ 8 mm, vent ≥ 60 km/h, chaleur ≥ 45 °C ; rouge seulement quand il y a une alerte ; « pas une alerte officielle » dans le nom accessible). **Pas de séisme** : la couche USGS a été retirée en RW-009 et l'E2E interdit tout appel à `/api/live/events` depuis le Radar. |
| UX-304 Langage humain | Fait | « sujet inféré / pays du média », « MapLibre GL », « RSS », « Couverture partielle · 16/19 », « cache périmé », « non configuré », « Disponibilité et fraîcheur par source », « bandeau daté », « Marchés / bandeau » disparaissent de l'interface. Panneau **« Sources et fraîcheur »** (état en une phrase : « Toutes les sources répondent », « 3 sources momentanément muettes »…, détail par source, « Comment lire le radar ») ; l'en-tête n'affiche que ce qui manque vraiment. Couleurs éditoriales (`sky/indigo/violet/cyan/teal/blue` du Radar) remplacées par les jetons : vert = presse nationale, or = panafricain, neutre = international ; rouge = alerte. |
| UX-305 Carte | Fait, **écart au plan documenté** | Voir « Mesure de la carte » ci-dessous : le fond vectoriel OpenFreeMap prévu par le plan pèse ≈ 1,27 Mo (10× le satellite). Fond sombre par défaut = **contours des pays d'Afrique auto-hébergés** (`public/maps/africa-countries.json`, 74 Ko, 24 Ko compressés, Natural Earth domaine public, généré par `scripts/build-africa-countries.mjs`), couleurs lues sur les jetons, pays choisi surligné, clic sur un pays pour le choisir ; satellite en option. Vue initiale cadrée sur le continent entier (Dakar était coupé). Pulsation selon l'activité 24 h (0 / 1-2 / 3-7 / 8 et plus), coupée en mode Éco et mouvement réduit ; plus d'anneau qui tourne en permanence. « Libellés FR » : sans objet avec ce fond (aucun texte) ; les noms français sont dans les repères et leurs infobulles. |
| UX-306 Direct du pays | Fait | « Regarder le direct du pays » (à la une, bouton « Direct » des lignes) choisit le pays dans l'URL, attend ses chaînes puis lance la première chaîne prête qui se lit dans le navigateur dans `InlinePlayerModal` (zapping, raccourcis, PiP de P2) **sans quitter le Radar** ; la liste des chaînes utilise la même modale (le mini-lecteur incrusté disparaît : un seul lecteur). La chaîne rejoint « Reprendre » de la TV ; la fenêtre séparée reçoit la liste de zapping. Pays sans chaîne : message clair et accès à l'onglet des chaînes. Modale chargée à la demande (hls.js n'est plus dans le premier chargement du Radar). |
| UX-307 Météo et marchés | Fait | Météo et marchés repliables, état mémorisé (`al_radar_weather_open`, `al_radar_markets_open`) ; météo repliée = une ligne (« 24 °C, ciel dégagé »). |
| UX-308 Arrivées en douceur | Fait | Après le premier affichage, une dépêche qui arrive seule attend derrière la pastille flottante « n nouvelle(s) » (aucune place prise, aucun saut de défilement : `scrollY` identique vérifié). Changer de pays ou de rubrique, « Actualiser » ou la pastille affichent tout. |

### Mesure de la carte (UX-305, mobile 360 px, CPU ×4, 4G lente 1,6 Mbit/s, 5 passages, serveur de développement)

| Fond | Requêtes | Données | Calme réseau | CPU (tâches) | Tâches longues |
|---|---|---|---|---|---|
| **Avant** : satellite par défaut (ancien cadrage) | 8 | ≈ 120 Ko | n/c * | n/c * | n/c * |
| Satellite (option, nouveau cadrage continent entier) | 18 | 227 Ko | 2,0 s | 3,43 s | 5 (339 ms) |
| Fond vectoriel OpenFreeMap (prévu au plan, **écarté**) | 11 | ≈ 1 270 Ko (2 tuiles = 917 Ko, sprites 117 Ko, polices 233 Ko) | n/c * | n/c * | n/c * |
| **Après** : contours auto-hébergés (défaut) | **1** | **25 Ko** | **0,04 s** | **1,63 s** | **1 (67 ms)** |

\* Octets et requêtes de ces deux lignes sont fiables (mêmes conditions, détail des requêtes relevé) ; leurs temps ont été pris
pendant que la page chargeait encore ses dépêches et ne sont pas comparables au « après » (mesuré page stabilisée).

Le fond sombre vectoriel « léger » du plan est donc plus lourd que l'ancien satellite à l'échelle du continent ; le nouveau
fond réduit les données de ≈ 80 % par rapport à l'ancien satellite (25 Ko contre ≈ 120 Ko) et supprime les appels aux serveurs
de tuiles tiers (aucun Esri / OpenFreeMap tant que « Satellite » n'est pas choisi : vérifié par E2E). Limites : serveur de
développement (JavaScript non minifié), bridage simulé, Edge de bureau, aucun appareil réel.

### Défauts trouvés en cours de lot et corrigés

- **CPU au repos saturé** (hérité de l'ancien fichier monolithique) : l'horloge météo faisait le rendu de *toute* la page chaque
  seconde, avec les ≈ 170 dépêches de la fenêtre 24 h. Mesure (CPU ×4, 5 s au repos) : 4,6 à 4,8 s de tâches, soit le thread
  principal saturé ; **après** : horloge à 15 s, lignes mémoïsées, fil paginé par 12 (« Voir plus »), formateur de dates `Intl`
  construit une seule fois : un rendu toutes les 15 s (≈ 0,1 s en dev, ≈ 0,3 s à CPU ×4), ≈ 4 ms entre deux rendus.
- Dakar était **hors de la vue initiale** de la carte (centre et zoom fixes) ; cadrage calculé sur l'étendue du continent.
- Tuile météo : « Indisponible » débordait à 320 px ; libellés de tuiles tronqués à 360 px ; bouton « Recadrer » en
  chevauchement avec la légende sur mobile ; point de statut séparé de son texte ; pastille « rédactions » sur deux lignes.
- Course d'hydratation (préexistante, rendue visible) : RW-008 interagissait avant l'hydratation de la page (≈ 100 ms après
  `load` en dev) ; le test attend maintenant l'affichage des dépêches (assertions inchangées).

### E2E et tests

Mises à jour avec des assertions **équivalentes** : `Disponibilité des sources` → `Sources et fraîcheur` (région), `Disponibilité
et fraîcheur par source` → `Détail par source`, `Marchés et événements · bandeau daté` → `Marchés et événements`, états de
couverture (`Sources disponibles` → `Toutes les sources répondent`, `Couverture partielle` → `aux données anciennes ou partielles` /
`momentanément muette`, `Sources indisponibles` → `Aucune source ne répond pour le moment`), `cache périmé` → `données anciennes`,
`non configuré` → `pas activée`, bouton « Chaînes TV » → onglet, message d'erreur des dépêches, fond de carte bloqué (le fichier
des contours remplace les tuiles Esri), « Fil des dépêches » en haut d'écran → tête du fil (« À la une ») et première dépêche
visibles sans défiler. Nouveau : `e2e/radar-live.spec.ts` (25 scénarios : À la une avec/sans image, Éco, image cassée, absence de
doublon et pagination, tuiles, visite, alerte météo, blocs repliables, pastille, direct du pays ×4, fond de carte et pulsation,
débordement et plancher 12 px à 320 / 360 / 768 / 1366 px). Tests unitaires : `radar-articles`, `rss-image`, `radar-live`
(+ `radar-workspace` étendu) : +20 tests.

### Vérification (code final)

| Contrôle | Résultat |
|---|---|
| `npx tsc --noEmit` | 0 erreur |
| `npm run lint` | 0 erreur, 0 avertissement |
| `npm test` | 341 tests : 327 réussis, 14 ignorés (intégrations PostgreSQL), 0 échec (référence fin P2 : 321, soit +20) |
| `npm run test:invariants` | 4/4 |
| `npm run build` | build réussi (Next.js, Turbopack) |
| E2E mode MVP local (dev, 3001) | E2E mode MVP (14 specs, --workers=1) : 134 tests, 132 réussis, 1 ignoré (test « build servi »), 1 échec de test (course dans le nouveau spec radar-live), corrigé puis rejoué 10/10 |
| E2E mode Clerk (dev, anonyme) | E2E mode Clerk (dev, anonyme) : 8/8 (auth-entry, payment) |

Contrôle visuel (Edge, 360 / 768 / 1366 px) : Edge, 0 débordement horizontal, 0 texte < 12 px, 0 erreur de page sur /app/live, /app, /app/ui (mode MVP) et landing, /pricing, /sign-in, 404 (mode Clerk) ; captures docs/screenshots/premium-p3-<page>-<largeur>.png, plus états simulés (sn-simule, alerte-orage, blocs-replies, direct-modale, pastille, eco) à 360 et 1366 px avec données et lecteur simulés. /account et /admin non capturés (session Clerk requise).

### Limites et réserves

- **Séisme** absent de la tuile d'alerte (pas de source depuis RW-009) ; l'alerte météo est un repère tiré d'un relevé automatisé.
- **À la une** = les plus récentes, de rédactions variées ; aucune détection « multi-sources ». Les dépêches d'APS n'ont pas
  d'image dans leur flux : le fil du Sénégal est souvent typographique (récupérer `og:image` demanderait au serveur de lire les
  pages des éditeurs, non fait).
- **Carte** : frontières Natural Earth 1:50m simplifiées (≈ 3 km) — anguleuses au-delà du zoom 6 ; aucun libellé sur le fond
  sombre ; le satellite garde les libellés anglais d'Esri. Le clic sur un pays du fond (polygone) n'est pas couvert par un E2E
  automatisé (vérifié à la main).
- « Depuis votre visite » est propre à l'appareil et plafonné à la fenêtre de 24 h du Radar.
- Mesures de performance : serveur de développement, bridage simulé, Edge de bureau ; aucun appareil Android réel. Lighthouse et
  poids JS avant/après restent prévus en UX-505 / UX-508.
- L'image `BrandBackdrop` est signalée comme LCP par Next en développement (`loading="eager"` conseillé) : à traiter en P5.
- Profils Clerk connectés (`/account`, `/admin`), VLC réel et flux amont à l'instant T : hors réception, comme en P0–P2.

### Reste à faire — Expérience Premium (au 3 octobre 2026, après le lot P3)

P0, P1 et P2 sont publiés ; P3 est fait, vérifié et committé en local (`412574d`), non poussé, non publié. Restent 15 tickets (P4 Landing/tarifs/compte
UX-401 → 407, P5 Aimants et finition UX-501 → 508) et 4 reliquats (UX-209 suite, UX-212, UX-213, UX-214). Plan à jour :
[plan-experience-premium.md](plan-experience-premium.md) §5.1, §6 « Reliquats » et §8.1 « Pièges connus ». Prochain lot : **P4**, après
le feu vert du propriétaire.

## Expérience Premium — Lot P4 « Landing, tarifs, compte » — 3 octobre 2026

Périmètre : [plan-experience-premium.md](plan-experience-premium.md) UX-401 à UX-407 et reliquats UX-212, UX-214, après P3 (committé en
local `412574d`, non poussé). Aucun commit, push, déploiement, migration, changement `.env*`, Railway, Clerk (configuration) ou DNS ;
aucune nouvelle dépendance. Aucun relais, conversion ni stockage de média. Machine de lecture, accès, éligibilité, quotas et API
inchangés ; parcours NabooPay (appels, redirections, webhooks, identifiants `lumina_all_access_*`) inchangé — la fonction
`handleSubscribe` de `/pricing` est identique octet pour octet, seul son type d'argument est factorisé.

| Ticket | État | Preuve |
|---|---|---|
| UX-401 Hero et chiffres réels | Fait | Compteur public `src/lib/public-stats.ts` (pur, testé) + `public-stats-server.ts` : une requête agrégée par pays et catégorie, mêmes règles que le catalogue (chaîne active, visible publiquement — Canal+ exclu —, au moins une source affichable), `unstable_cache` 1 h (Next 16 sans Cache Components), aucune donnée personnelle ; en cas d'échec la landing n'affiche **aucun** chiffre (pas de repli en dur). Mesure sur `africa_live_dev` : **11 771 chaînes, 371 africaines, 36 pays**, Info 967, Sport 410, Musique 697, Cinéma et séries 916 (272 ms, 1 540 lignes agrégées). Les chiffres en dur « 11 700+ », « 1 400+ », « 650+ », « 1 200+ », « 980+ » sont supprimés (les catégories étaient surévaluées de 45 % à 70 %). Hero : vraie capture du Radar (1280 px) et de la TV mobile (360 px) produite par `.local-logs/p4/hero-shot.ts` avec des **données entièrement fictives** (titres, rédactions, chaînes, sans logo ni image d'éditeur ; artefacts du mode local masqués) → `public/landing/hero-radar-tv.webp`, 1200 × 760, **41,3 Ko**, `next/image` `loading="eager"` + `fetchPriority="high"` (`priority` est déprécié en Next 16), légende « Aperçu réalisé avec des données d'exemple ». `LandingDashboardPreview.tsx` (icône de globe) supprimé. |
| UX-402 Trois bénéfices | Fait | Les 4 « métriques » et les 4 « fonctionnalités » (deux `Globe2`) deviennent 3 bénéfices, une icône chacun : Radar (actualité pays par pays), Tv (le direct en un geste), Leaf (pensé pour votre forfait : Éco data, Wave/OM, WhatsApp). Section VLC « Flexibilité absolue » retirée (couverte par la FAQ). Promesses invérifiables retirées : « instantané », « authenticité totale », « dans la seconde », « Priorité réseau et support client dédié », « Zéro publicité injectée », « 100 % direct », « haute performance ». |
| UX-403 Tarifs | Fait | Composants partagés landing + `/pricing` : `src/components/pricing/PlanCard.tsx` (+ `PLAN_COPY`, montants identiques à `NABOOPAY_PLANS`) et `PaymentMethods.tsx` (pastilles dessinées en SVG local, jetons `--color-pay-wave` / `--color-pay-orange`, aucun chargement tiers ; les hex `#1da1f2`, `#ff7900`… codés dans la landing disparaissent). Annuel en premier et mis en avant (« 2 mois offerts » : 9 900 = 10 × 990, économie 1 980 FCFA), seul bouton jaune ; CTA « Activer pour 9 900 FCFA » / « Activer pour 990 FCFA » ; « Paiement sécurisé par NabooPay » sous les offres ; « sans renouvellement automatique » vérifié dans les CGU (pas de reconduction tacite) ; FAQ courte (3 questions) sur `/pricing`. |
| UX-404 Compte | Fait (non capturé) | `src/lib/access-gauge.ts` (testé) : jauge « n jours restants » tirée de la décision d'accès existante (essai 5 j, mensuel 30 j, annuel 365 j, grâce 3 j ; aucune jauge sans échéance : administrateur, version locale) ; `AccessMeter` (`role="meter"`, vert, or sous 3 jours, jamais rouge tant que l'accès dure). `AccountActivity` : dernières chaînes, pays récents (liens vers le Radar du pays), dernière visite du Radar (`al_radar_visit`), nombre de favoris (comptage serveur de `user_favorites`) ; état vide « hors antenne ». Aucune migration ni nouvelle donnée. **Défaut corrigé** : la page affichait l'identifiant interne brut (`lumina_all_access_monthly`) comme « Plan » ; elle affiche désormais « Africa Live Mensuel / Annuel », « Essai gratuit »… (`planLabel`, testé). |
| UX-405 Clerk | Fait | **Mise à jour après décision du propriétaire (même jour)** : traduction officielle `@clerk/localizations` **4.9.0** (version figée, nouvelle dépendance autorisée), choisie parce qu'elle accepte le `@clerk/shared` 4.20.0 déjà installé ; la 4.21.x aurait fait monter `@clerk/shared` en 4.38.0 sous tout Clerk (essayé puis annulé, lockfile restauré). `frFR` en base + libellés de marque (« Connexion à Africa Live », « 5 jours d'essai offerts, sans carte bancaire ») ; la traduction manuelle est supprimée. Version initiale : `src/lib/clerk-theme.ts` : `appearance` en **variables CSS des jetons** (aucune couleur littérale ; vérifié au rendu avec Clerk 7.5.7), Manrope, rayon `--radius-control`, carte à bordure or ; `localization` française **écrite à la main** (connexion, inscription, codes, mot de passe oublié, menu du compte, sections du profil, erreurs courantes), sans `@clerk/localizations`. Le titre « Sign in to Afrika_Live » (nom de l'application dans le tableau de bord Clerk) devient « Connexion à Africa Live » dans l'interface. `colorNeutral`/`colorBorder` en variables CSS effaçaient les bordures des champs : retirés. |
| UX-406 États vides et erreurs | Fait | `OffAirScreen` partagé (404, `error.tsx` racine, `app/error.tsx` dans la coquille, `global-error.tsx`, « Paiement non abouti ») ; `loading.tsx` racine (logo + barre tricolore immobile si mouvement réduit). Erreurs rédigées à la main converties en `ErrorState` / `EmptyState` : filtres de la TV, formulaire de contact, file d'administration (+ état vide). Prop `retry` de Next 16.2+ (guide lu). |
| UX-407 FAQ | Fait | `src/components/marketing/Faq.tsx` : 5 questions courtes et factuelles (ce que c'est, essai, prix et paiement, installation, hébergement des vidéos), réutilisées par `/pricing`. |
| UX-212 Éco data mobile | Fait | La bascule de la barre est visible dès **360 px** (1 geste depuis la TV, `aria-pressed`, cible 44 px). Sous 360 px elle reste dans Compte : à 320 px elle réduisait tant le sélecteur de pays que ses boutons couvraient le champ (régression détectée par l'E2E `radar-workspace` 320 × 844, corrigée). Nouvel E2E `tv-streaming` « mobile 360 px ». |
| UX-214 Captures connectées | Fait | Le propriétaire s'est connecté lui-même dans le navigateur intégré (compte utilisateur puis compte administrateur). Captures `premium-p4-account-{360,768,1366}`, `-account-activite-360`, `-account-profil-1366`, `premium-p4-admin-{360,768,1366}` ; **e-mails et noms masqués dans la page avant capture** (aucune donnée personnelle dans les fichiers versionnés). 0 débordement, 0 texte < 12 px aux trois largeurs. Défauts vus et corrigés : (1) le widget Profil de Clerk était coupé dans la colonne de droite sur desktop → pleine largeur sous la grille ; (2) un accès expiré affichait « Échéance : 28 septembre 2026 » → « Terminé le … ». `/admin` montre le nouvel état vide « Aucune demande enregistrée ». Limites : les captures 1366 sont réduites à 800 px par l'outil du panneau, la hauteur à 768 px est 840 (panneau) ; une ouverture **directe** d'une page protégée depuis le navigateur intégré boucle sur la page de connexion hébergée de Clerk (instance de développement), alors que le passage par `/sign-in` local fonctionne — à surveiller, non reproduit ailleurs. |

### E2E et tests

- `e2e/payment.spec.ts` : `/Payer avec NabooPay/i` (premier bouton = mensuel) → bouton `Activer pour 990 FCFA` (même offre, même parcours) ;
  ajout : « 2 mois offerts », boutons 9 900 et 990 actifs, liste des moyens de paiement.
- `e2e/radar-live.spec.ts` « depuis la liste des chaînes du pays » : attente d'un contenu post-hydratation avant le clic sur l'onglet
  (le clic précoce donnait le focus sans sélectionner : piège §8.1, rendu plus fréquent par le nouveau `loading.tsx`) ; assertions inchangées, 5/5 en répétition.
- `e2e/tv-streaming.spec.ts` : nouveau test Éco data mobile 360 px. Tests unitaires : `public-stats` (3), `access-gauge` (4).

### Vérification (code final)

| Contrôle | Résultat |
|---|---|
| `npx tsc --noEmit` | 0 erreur |
| `npm run lint` | 0 erreur, 0 avertissement |
| `npm test` | 348 tests : 334 réussis, 14 ignorés (intégrations PostgreSQL), 0 échec (référence fin P3 : 341, soit +7) |
| `npm run test:invariants` | 4/4 |
| `npm run build` | Réussi (Next.js, Turbopack), serveur arrêté |
| E2E mode MVP (14 specs, `--workers=1`) | 135 tests : 132 réussis, 1 ignoré (« build servi »), 2 échecs au premier passage (régression 320 px d'UX-212 et course d'hydratation, voir ci-dessus), corrigés ; specs concernés rejoués (radar-live, radar-workspace, tv-streaming, app-shell) : **67/67** |
| E2E mode Clerk (dev, anonyme) | **8/8** (auth-entry, payment) |

Contrôle visuel (Edge, 360 / 768 / 1366 px) : 0 débordement horizontal, 0 texte < 12 px, 0 erreur de page sur landing, `/pricing`,
`/sign-in`, `/sign-up`, 404, `/pricing/error` (mode Clerk) et `/app/live`, `/app`, `/app/ui` (mode MVP) ; captures
`docs/screenshots/premium-p4-<page>-<largeur>.png`. Défauts vus à l'œil et corrigés : séparateur de milliers invisible en Unbounded
(« 11771 » : espace fine remplacée par une espace insécable), section tarifs de la landing décentrée à 1366 px, indicateur de
développement et badges du mode local dans l'image du hero.

### Limites et réserves

- Le Compte n'a pas d'E2E (page protégée par Clerk) ; il a été vérifié avec les sessions du propriétaire (UX-214).
- Pastilles Wave / Orange Money : pictogrammes dessinés localement, **pas les logos officiels** ; pour une conformité de marque, fournir
  les fichiers du kit marchand (NabooPay / Wave / Orange) à déposer dans `public/`.
- Traduction Clerk complète via `frFR` ; « Secured by Clerk » et « Development mode » (clés de développement) ne sont pas traduisibles.
  19 écrans secondaires de `frFR` affichent le nom d'application du tableau de bord Clerk, aujourd'hui « Afrika_Live » : à renommer
  « Africa Live » par le propriétaire (configuration Clerk, non touchée).
- « Mon activité » est propre à l'appareil (sauf le nombre de favoris) ; aucune synchronisation au compte (ticket de migration UX-503).
- Chiffres de la landing : cache d'une heure par instance ; en staging ils reflèteront la base Railway.
- Bascule Éco absente de la barre sous 360 px (reste dans Compte). Le libellé « 8 dépêche(s) » de l'infobulle de la carte (P3) est à
  reprendre en P5.
- Aucun appareil Android réel ; l'image du hero n'a pas été mesurée en LCP (prévu en UX-508).
- Mode MVP : ligne technique `africa-live-local-user` réinsérée puis supprimée avec ses données de test (`users` = 2) ; captures
  `l5-anchored-*.png` restaurées depuis `HEAD` ; serveur relancé en mode Clerk (santé 200, `/app` anonyme → 307).

### Reste à faire — Expérience Premium (au 3 octobre 2026, après le lot P4)

P0–P2 publiés ; P3 committé en local (`412574d`) ; P4 fait et vérifié, **non committé**. Restent P5 « Aimants et finition »
(UX-501 → 508) et les reliquats UX-209 (suite), UX-213. Prochain lot : **P5**, après le feu vert du propriétaire.

## Expérience Premium — Lot P5 « Aimants et finition » — 3 octobre 2026

Périmètre : [plan-experience-premium.md](plan-experience-premium.md) UX-501 à UX-508 et reliquats UX-209 (suite), UX-213, après la
publication de P3–P4 sur staging et le feu vert du propriétaire. **Non committé, non publié.** Aucune migration, aucun changement
`.env*`, Railway, Clerk (configuration) ou DNS ; aucune nouvelle dépendance (`framer-motion` est **retiré**). Aucun relais, conversion
ni stockage de média : le service worker ne met en cache que l'écran hors-ligne. Machine de lecture (`src/lib/playback-*`), accès,
éligibilité, quotas et API inchangés ; `Player` reçoit seulement deux props d'affichage (`compact`, `forceMuted`).

| Ticket | État | Preuve |
|---|---|---|
| UX-501 Lecteur unique | Fait | `src/components/player/PlayerDock.tsx` dans le layout `/app` : une seule instance de `<Player>`, à position stable dans l'arbre, passe de la fenêtre au **mini-lecteur** (« Réduire », « Agrandir ») sans être remontée ; changement de page → mini-lecteur, rappels de la page quittée oubliés. Remplace `InlinePlayerModal` (supprimé) pour la TV et le Radar. Mode `compact` : lecture, son, image dans l'image ; aucun raccourci global (les flèches restent à la page). Lecteur chargé à la demande. E2E `player-dock` : même élément `<video>` après TV → Radar (marqueur conservé), une seule résolution, aucune relance ; une autre chaîne remplace la précédente (une seule source) ; 360 px au-dessus de la barre basse. |
| UX-502 Recherche Ctrl K | Fait | `src/components/search/UniversalSearch.tsx` + `src/lib/universal-search.ts` (testé) : pays et villes météo en local (instantané), chaînes via `/api/channels` existant après 250 ms de pause de frappe (≤ 1 requête par saisie, quotas), dépêches du flux déjà publié (lu une fois, 5 min), « Chercher … dans la TV ». Dialogue + `combobox`/`listbox`, ↑ ↓ Entrée Échap. Ctrl K ouvrait jusqu'ici la recherche du catalogue : il ouvre la palette partout dans `/app` (E2E mis à jour en conséquence). Doublons de dépêches écartés (URL canonique, titre). |
| UX-503 Pays suivis | Fait (local) | `src/lib/followed-countries.ts` (testé), clé `al_followed_countries` : 1 à 5 pays, le premier est principal. Bouton « Suivre » (`aria-pressed`, désactivé au-delà de 5 avec explication) dans l'en-tête du Radar ; Radar ouvert sur le pays principal sans pays dans l'URL ; rangée « … en direct » de la TV sur le pays principal ; gestion (principal, retrait) dans « Mon activité » du Compte. Synchronisation au compte : ticket de migration séparé, non fait. |
| UX-504 PWA | Fait | Manifeste : `id`, `scope`, raccourcis Radar et TV. `public/sw.js` minimal écrit à la main (navigations réseau d'abord ; cache = `offline.html` + 2 images locales uniquement), enregistré en production seulement, servi sans cache (`next.config.ts`). `public/offline.html` « Hors antenne » autonome. Vérifié sur le build servi : installable (aucune erreur dans un profil normal), service worker actif, écran hors-ligne affiché sans réseau. |
| UX-505 Micro-interactions | Fait | `framer-motion` retiré (4 composants → animations CSS `dock-fade`/`dock-rise`, coupées en Éco data et mouvement réduit) et désinstallé ; « pop » de l'étoile quand une chaîne entre dans les favoris. Poids JS TV **522 → 322 Ko gzip (−38 %)** (lecteur et prototype L5 chargés à la demande). |
| UX-506 Mur TV 2×2 | Fait (drapeau) | `/app/mur` : `TV_WALL_ENABLED` (actif en développement ; en production seulement avec `NEXT_PUBLIC_TV_WALL=true`, variable **non posée**). Jusqu'à 4 chaînes de « Reprendre » lisibles dans le navigateur, **une seule audible** (`forceMuted`), désactivé en Éco data et sous 1 280 px ; ferme le lecteur unique. Quotas : plafonds serveur inchangés (4 résolutions < 10/min même en essai). E2E `tv-wall`. |
| UX-507 Briefing | **Bloqué** | Lot L6 différé par décision D1 (`plan-dashboard-backlog.md`) : nom, durée et mode de génération à arbitrer par le propriétaire avant toute activation. Rien n'a été activé. |
| UX-508 Audit | Fait (sans Lighthouse) | [Rapport daté](audit-a11y-performance-2026-10-03.md) : axe-core WCAG 2.1 A/AA **0 violation** sur 8 pages et 2 états interactifs ; clavier vérifié par E2E (`a11y`) ; poids JS, métriques du build servi (CLS 0 ; LCP 3,6–5,1 s à 360 px CPU ×4 4G lente). **Lighthouse non installé** : notes ≥ 90 non démontrées. |
| UX-209 Tiroir unique | Fait | `FilterSidebar` = un seul tiroir à toutes les largeurs (barre latérale desktop supprimée) ; recherche du catalogue toujours visible dans la barre d'outils (`CatalogSearchField`) ; catalogue en pleine largeur. Helper E2E `e2e/helpers/filters.ts`. |
| UX-213 Lecteur ancré | Fait | Contrôle du prototype L5 habillé avec `Button` et une case stylée, libellés inchangés (13/13 `anchored-player`). |

### Défauts trouvés et corrigés

- hls.js (≈ 162 Ko gzip) restait dans le premier chargement de la TV via le prototype L5 (import statique) → chargé à la demande.
- À 320 px, la barre d'outils de la TV débordait de 3 px → libellé « Filtres » masqué sous 360 px (nom accessible inchangé).
- Mini-lecteur : le pied du lecteur (titre en grand) doublait l'en-tête → masqué en mode compact ; le bouton d'aide clavier
  s'affichait sur mobile malgré `hidden` (conflit avec `inline-flex`) → réellement masqué sous 640 px, absent en mini-lecteur.
- Palette : la même dépêche apparaissait deux fois (paramètres de suivi) → dédoublonnage par URL canonique et titre (test ajouté).
- `aria-labelledby` du mini-lecteur masquait son nom « Mini-lecteur » → appliqué seulement en vue agrandie.

### E2E et tests

- Nouveaux : `player-dock` (3), `universal-search` (3), `followed-countries` (2), `tv-wall` (2), `a11y` (2) ; unitaires
  `universal-search` (4), `followed-countries` (3).
- Mis à jour avec des assertions équivalentes : filtres lus et modifiés **dans le tiroir** (`tv-workspace`, `app-shell`, `catalogue`,
  `local-mvp`, `anchored-player`, `radar-reliability`) ; Ctrl K → recherche universelle (`tv-workspace`) ; l'erreur simulée du catalogue
  vise la requête de recherche (les rangées chargent aussi `/api/channels`) ; `radar-access.test.ts` : frontières `PlayerDock` et
  `UniversalSearch` simulées, le catalogue est vérifié sous le lecteur unique.

### Vérification (code final)

| Contrôle | Résultat |
|---|---|
| `npx tsc --noEmit` | 0 erreur |
| `npm run lint` | 0 erreur, 0 avertissement |
| `npm test` | 355 tests : 341 réussis, 14 ignorés (intégrations PostgreSQL), 0 échec (référence fin P4 : 348, soit +7) |
| `npm run test:invariants` | 4/4 |
| `npm run build` | Réussi (Next.js 16.3.5, Turbopack), serveur arrêté |
| E2E mode MVP (19 specs, `--workers=1`) | 147 tests : 145 réussis, 1 ignoré (« build servi »), 1 échec (`radar-reliability`, sélecteur passé dans le tiroir) corrigé puis spec rejoué 6/6 ; après les dernières retouches du lecteur : specs de lecture rejoués 73/73 puis 36/36 |
| E2E mode Clerk (dev, anonyme) | 8/8 (auth-entry, payment) |
| Build servi (`next start`, `DEPLOYMENT_ENV=local`) | PWA installable, service worker actif, cache limité à l'écran hors-ligne, « Hors antenne » sans réseau |

Contrôle visuel (Edge) : 0 débordement, 0 texte < 12 px, 0 erreur de page — `premium-p5-<page>-<largeur>.png` pour app-live, app-tv,
ui-kit (360/768/1366, mode MVP), landing, pricing, sign-in, 404 (360/768/1366, mode Clerk), et états simulés `lecteur-agrandi`,
`mini-lecteur-radar`, `recherche`, `pays-suivi`, `tiroir-filtres` (360 et 1366), `mur-tv` (1366), `hors-ligne` (1366, build servi).

### Limites et réserves

- **UX-507 bloqué** (L6, décision D1 du propriétaire). **Lighthouse non lancé** (outil non installé).
- LCP de la landing au-dessus de 2,5 s en 4G lente simulée (élément : fond de marque décoratif) ; Radar et TV non mesurables en
  production sans session.
- Pays suivis propres à l'appareil (synchronisation = ticket de migration). Mur TV désactivé en production tant que
  `NEXT_PUBLIC_TV_WALL` n'est pas posé (décision du propriétaire, avec un avertissement de consommation de données).
- Les vidéos de test sont des clips synthétiques de 4 s ; VLC réel, flux amont actuels, appareils Android et lecteurs d'écran réels :
  hors réception.
- Mode MVP : ligne technique réinsérée puis supprimée (`users` = 2) ; captures L5 restaurées depuis `HEAD` ; serveur relancé en
  mode Clerk (santé 200, `/app` anonyme → 307).
