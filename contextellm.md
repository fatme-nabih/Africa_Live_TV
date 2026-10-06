# Africa Live — contexte de reprise de session

Dernière mise à jour : 6 octobre 2026 (fiabilisation VLC iPhone locale, non publiée), fuseau Africa/Dakar. Lire d’abord la section VLC iPhone ci-dessous, puis [l’état courant concis](docs/etat-courant.md), la [publication COR](docs/publication-correctifs-2026-10-04.md) et le [dossier local](docs/correctifs-audit-validation-2026-10-04.md).

## VLC iPhone / CNews — 6 octobre 2026 (lire en premier)

- Signalement propriétaire : VLC se lance sur iPhone mais montre sa médiathèque vide, chaîne **CNews** ; Android fonctionne.
- Fiabilisation **locale, NON committée / NON poussée / NON publiée** : iOS prépare le flux puis affiche un vrai lien
  « Ouvrir dans VLC », suivi d’un lien de relance ; Android et bureau gardent le lancement automatique. iPadOS reconnu,
  protocoles HTTP/HTTPS validés et résolutions externes annulables/bornées. [Diagnostic et preuves](docs/ios-vlc-cnews-2026-10-06.md).
- Réception : 398 unités (375 réussies, 23 intégrations ignorées), typage/lint/build verts, 7 Playwright sur composant réel
  dans Edge avec agents mobiles. CNews : manifeste et variante HTTPS 206 depuis le poste, lecture seule, aucun statut changé.
- **Appareil réel et cause exacte non reçus** ; ouverture de VLC simulée dans les tests. Après publication expressément demandée,
  tester Safari/iPhone et CNews avec VLC fermé puis déjà ouvert. Aucun état distant/DB/`.env*` changé ; source IPTV intacte.

## Refonte du Radar R1–R4 — 5 octobre 2026 (lire en premier)

- Lots R1 (`68e0ddf`, retrait des « Direct » trompeurs), R2 (`8d28d43`, fil format agence et séparateurs horaires), R3 (`dc2ddcd`,
  carte pleine hauteur, météo condensée) et R4 (`c0ae888`, recherche et rubriques déduites) committés en local. Doublons (R4 point 3)
  différés. Détail et contrôles : première section de [production-progress.md](docs/production-progress.md).
- **Publié sur Railway staging : `c151b5b1` SUCCESS** depuis `53fce10` (envoi lancé par le propriétaire, l'envoi par l'agent ayant
  été bloqué). 442/442 fichiers identiques, santé 200 sur les deux domaines, refus anonymes conservés, 10/10 E2E distants.
  Scripts : `.local-logs/publication-radar/`. Pas de migration. Poussé sur GitHub (`a55b63c`) ; CI [37370828544](https://github.com/fatme-nabih/Africa_Live_TV/actions/runs/37370828544)
  SUCCESS après relance (premier essai perdu dans une panne GitHub Actions).
- E2E MVP en local : arrêter le serveur Clerk de 3001, lancer `npm run dev` avec `LOCAL_DEV_MODE` et `NEXT_PUBLIC_LOCAL_DEV_MODE`
  à `true`, recréer l'utilisateur `africa-live-local-user` (ligne de `setup-local.ts`, `setup:local` refuse car `.env.local` existe),
  `E2E_EXTERNAL_SERVER=true`, puis supprimer l'utilisateur et relancer le serveur Clerk.

## Vérification complète des flux — 5 octobre 2026

- 12 396 flux recontrôlés (10 passages, 4 oct. 19 h 10 → 5 oct. 01 h 24 UTC) puis **copiés sur Railway staging** avec le feu vert du
  propriétaire, après sauvegarde chiffrée vérifiée. Flux : 4 557 navigateur, 2 442 VLC, 5 295 OFFLINE confirmés, 102 non testables.
  Chaînes : 4 511 navigateur, 2 057 VLC seulement, 5 108 hors ligne (masquées sur staging), 102 non testables ; 6 665 visibles en public.
  Détail : première section de [production-progress.md](docs/production-progress.md). Outils : `.local-logs/streams-2026-10-04/`.
- **Cycle de 15 jours décidé par le propriétaire** : validité d'un contrôle portée de 7 à 16 jours (`src/lib/stream-freshness.ts`,
  commit `573dba0`, CI [37355267984](https://github.com/fatme-nabih/Africa_Live_TV/actions/runs/37355267984) SUCCESS) **publié sur
  staging après autorisation explicite : Railway `df049618-d475-4689-bedd-ecc45a970ae4` SUCCESS**, 438/438 fichiers identiques, santé 200
  sur les deux domaines, 10/10 E2E distants (`.local-logs/publication-freshness/`). Tâche Windows « Africa Live - verification des flux » (tous les 15 jours, 20 h,
  première le 19 octobre) : `.local-logs/stream-cycle/run-cycle.cjs`, journaux `runs/`, résultat `last-result.json`.

## Audit et plan des correctifs — 4 octobre 2026

- Audit approfondi local : [rapport F1–F12](docs/audit-code-2026-10-04.md). Deux priorités : droits NabooPay recrédités par recalcul et branche UNTESTED permissive hors local.
- À la demande du propriétaire, [plan détaillé en cinq lots](docs/plan-correctifs-audit-2026-10-04.md) et [backlog de 29 tickets COR](docs/backlog-correctifs-audit-2026-10-04.md) préparés.
- **Implémentation locale demandée et réalisée.** 26 tickets reçus localement ; COR-506 partiel, COR-900 avec réserves, COR-901 publication reçue. Remboursement validé : retrait de l’achat puis reconstruction aux dates d’origine. Next 16.3.8, 364 unités et 23 intégrations PostgreSQL, build/audit production reçus ; détail des E2E et mesures dans le dossier COR.
- **Publication GitHub et Railway staging expressément demandée après le bilan local et effectuée** : code `6dad01c`, Railway `4319e870-a9a3-417d-82b5-c85440183ac4` SUCCESS actif ; 438/438 fichiers identiques, santé 200 sur les deux domaines, 10/10 E2E distants. CI [37226297937](https://github.com/fatme-nabih/Africa_Live_TV/actions/runs/37226297937) SUCCESS : 364 unités, 23 intégrations, 9 E2E de build (10 ignorés), 59 E2E sensibles (1 ignoré), fixtures nettoyées. COR-901 reçu ; réserves COR-506/COR-900 et Snyk Code indisponible maintenues. Aucun changement de droits historiques, activation de paiement ou configuration distante. Pas de nouvelle migration ; `.env*` conservés. Rôle staging et MVP désactivé confirmés, 20/20 migrations identiques. Local Clerk/dev relancé sur 3001, compte et catalogue synthétiques nettoyés. Poursuivre les réceptions ouvertes sans recommencer les correctifs reçus.

## D-4 / D-5 publiés — 4 octobre 2026 (lire en premier)

- **Publiés sur staging** après confirmation du propriétaire : sauvegarde vérifiée `backups/railway/railway-2026-10-04T14-32-53-630Z` (inventaire identique, base isolée
  supprimée), `NEXT_PUBLIC_TV_WALL=true` (`--skip-deploys`), commit [`9b40d94`](https://github.com/fatme-nabih/Africa_Live_TV/commit/9b40d94),
  **Railway `490d48be` SUCCESS** (actif) : migration 0019 appliquée (20 migrations), 415/415 fichiers identiques, santé 200, 9/9 E2E distants,
  `/api/followed-countries` et `/app/mur` anonymes → 307. Détail : section « Publication D-4 et D-5 » de [production-progress.md](docs/production-progress.md).
- **Piège nouveau** : Railway refuse la redirection de port `ssh -L` ; sauvegarde par relais TCP local (`railway ssh -- bash` + `/dev/tcp`),
  scripts hors projet ; `railway ssh` échoue par intermittence (relancer). Voir [runbook](docs/railway-preproduction-runbook.md).
- Reste : D-6 (logos officiels dans `public/payment/`), rendu connecté du mur TV à confirmer par le propriétaire, puis D-3 (L6 → UX-507), D-7 → D-10.
- Les mentions « non committé / non publié » de la section suivante sont historiques.

## D-4 / D-5 / D-6 — 4 octobre 2026, fin de session (historique)

- **D-4 (pays suivis synchronisés au compte, UX-503b) fait et vérifié en local, NON committé, NON publié** : table `user_followed_countries`,
  migration additive `drizzle/0019_followed_countries.sql`, API `/api/followed-countries`, `FollowedCountriesSync` dans `AppShell` (membre),
  E2E `followed-countries` (API simulée + 3 tests) et `auth-entry`. tsc 0, lint 0, 364 tests (350/14/0), invariants 4/4, build, E2E MVP 149 + 1
  ignoré / 0 échec, E2E Clerk 8/8. Détail : section D-4 de [production-progress.md](docs/production-progress.md).
- **Rien n'a été fait sur Railway pour D-4/D-5** : sauvegarde restaurable, variable `NEXT_PUBLIC_TV_WALL=true` (`--skip-deploys`), commit, push,
  déploiement avec migration → **sur confirmation explicite du propriétaire**. Procédure : [plan §5.2 A bis](docs/plan-experience-premium.md).
- **D-6** : attente des logos officiels Wave / Orange Money (`public/payment/`).
- Arbre de travail volontairement sale (D-4). Environnement : `npm run dev` mode Clerk sur 3001 (`.env.local` = instance Clerk de **dev**),
  users = 2. Prompt de reprise : [docs/prompt-reprise-d4-d5-d6.md](docs/prompt-reprise-d4-d5-d6.md).

## Instance Clerk de production (D-2) — 4 octobre 2026 (lire ensuite)

- Staging utilise désormais l'**instance Clerk de production** (`pk_live`, `clerk.africatv.sn`, DNS OVH, Google OAuth propre, webhook) ;
  `.env.local` garde l'instance de dev (la production refuse localhost). CSP corrigée (`32d1a66`, Railway `047d66d7` SUCCESS, 9/9 E2E distants).
  Détail : [dossier P6, dernière section](docs/publication-premium-p6-2026-10-04.md). Compte admin de production créé, application renommée « Africa Live ». Carte « Mon accès » d'un admin corrigée (affichage seulement,
  `2caf8ad`, Railway `7e1bb51d` actif, 9/9 E2E distants).

## Lot P6 « Performance mobile » — 4 octobre 2026 (lire ensuite)

- **Fait, committé (`7e27319` + docs `c710769`) et publié sur staging : Railway `e077db96` SUCCESS** (409/409 fichiers, 9/9 E2E distants).
  Lighthouse staging mobile : landing **93**, CGU 97, tarifs 75, connexion 73 ; desktop 99/99/95/93 ; [dossier](docs/publication-premium-p6-2026-10-04.md).
  Détail : section « Lot P6 » de [production-progress.md](docs/production-progress.md) ; mesures : [audit, section P6](docs/audit-a11y-performance-2026-10-03.md).
- Découverte : le « premier octet de 2,1 s » était la **poignée de main Clerk** (instance de développement, 3 redirections), pas le rendu.
  Pages publiques `/`, `/pricing`, `/cgu`, `/privacy`, `/contact` hors middleware Clerk (`src/lib/public-static-pages.ts`) ; landing
  statique (`revalidate = 600`), session lue par l'indice `__client_uat` (`SessionSwitch`) ; **routes Clerk déplacées dans
  `src/app/(clerk)/`** (URL inchangées, `ClerkProvider` dans `(clerk)/layout.tsx`) ; polices : préchargement `latin` seul ; fond de marque
  `public/brand/backdrop-480.webp` ; tuiles du Radar nommées par leur texte visible (`.sr-after`) ; `countLabel` ; H1 /admin.
- Lighthouse mobile, build servi local, médiane de 3 : landing **76 → 90** (bonnes pratiques 100), `/cgu` 93, `/pricing` 72 → 78,
  `/sign-in` 73 → 79 ; accessibilité 100. `/pricing` et `/sign-in` restent sous 90 (Clerk 342 Ko ; poignée de main dev → D-2).
- Vérification : tsc 0, lint 0, 360 tests (346/14/0), invariants 4/4, build (landing ○), E2E MVP 141 + 1 ignoré + 5 échecs corrigés
  (radar-live 25/25, tv-wall/tv-workspace/a11y 11/11), E2E Clerk 8/8, axe 0 violation, captures `premium-p6-*`.
- Pièges nouveaux : après un déplacement de route, supprimer `.next/dev/types` et `.next/types` ; `.sr-only` ajoute une espace dans un
  nom accessible ; une page qui appelle `auth()` ne doit pas entrer dans `CLERK_FREE_PUBLIC_PAGES` ; une page Clerk va dans `(clerk)`.
- Environnement laissé : `npm run dev` en mode **Clerk** sur 3001 (onglet « dev server (Clerk) »), santé 200, `/app` anonyme 307 ;
  ligne technique MVP supprimée (users = 2) ; captures L5 restaurées. Outils : `.local-logs/p6/` (`cycle.sh`, `lh-median.cjs`…).
- Suite : décisions D-2 → D-10 (D-2 = principale marge de `/sign-in`, `/pricing` et des bonnes pratiques) ; UX-507 bloqué (L6).

## Point de reprise — 4 octobre 2026 (avant P6)

- **Expérience Premium P0 → P5 faite et publiée sur Railway staging** (`just-compassion`, rôle staging, jamais promu) ; dernier applicatif
  `865c85d` (correctifs Lighthouse), déploiement actif **`3bc79b16`** ; 49 tickets sur 50, **UX-507 bloqué** (briefing L6, décision D1).
- État et reste à faire : [plan §5.1 / §5.2](docs/plan-experience-premium.md) (décisions **D-1 → D-10**, repères de code), backlog du
  **lot P6 « Performance mobile »** proposé (§6, UX-601 → 606, en attente du feu vert). Audit : [audit-a11y-performance](docs/audit-a11y-performance-2026-10-03.md).
- Vérification de référence : tsc 0, lint 0, 355 tests (341/14/0), invariants 4/4, build, E2E MVP 146 + 1 ignoré, E2E Clerk 8/8, 9/9 E2E distants.
- Lighthouse staging : accessibilité 100, SEO 100, desktop 85–88, **mobile 57–69**, bonnes pratiques 78–79 (Clerk de développement).
- Environnement laissé : `npm run dev` en mode **Clerk** sur 3001, santé 200 ; ligne technique MVP supprimée ; arbre Git propre sauf ces
  mises à jour documentaires. Outils hors projet : Lighthouse `.local-logs/tools/lighthouse`, scripts `.local-logs/p4|p5|publication-*`.
- **Prompt de reprise : [docs/prompt-reprise-premium-p6.md](docs/prompt-reprise-premium-p6.md).**

## Publication P5 et audit Lighthouse — 3 octobre 2026

- P5 committé (`090ce01`), poussé, publié sur Railway staging (`75bf069d` **SUCCESS**, 402/402 fichiers identiques, 9/9 E2E distants).
  [Dossier](docs/publication-premium-p5-2026-10-03.md).
- Lighthouse 12.8.2 installé **hors du projet** (`.local-logs/tools/lighthouse`, scripts `.local-logs/p5/lh-run.sh` et `lh-summary.cjs`).
  Notes : [audit](docs/audit-a11y-performance-2026-10-03.md). Corrections issues de l'audit **locales, non committées** (accessibilité 100,
  CLS Radar/TV/connexion, bouton « Rechercher » = recherche universelle dans `/app`) **publiées** : commit `865c85d`, Railway `3bc79b16`
  SUCCESS (une première tentative `2aaeeb5b` coupée par le réseau, close sans build), 402/402 fichiers, 9/9 E2E distants.
- Pistes performance mobile proposées (non faites) : landing statique, fond de marque allégé, Clerk différé ; instance Clerk de production.

## Expérience Premium — Lot P5 « Aimants et finition » fait et vérifié (3 octobre 2026)

- Fait (UX-501 → 506, UX-508, UX-209 suite, UX-213) ; **UX-507 bloqué** (L6 différé, décision D1). Détail : « Lot P5 » de
  [production-progress.md](docs/production-progress.md), [audit daté](docs/audit-a11y-performance-2026-10-03.md), captures `premium-p5-*`.
- Nouveautés : lecteur unique `PlayerDock` (layout `/app`, mini-lecteur qui survit au Radar ↔ TV), recherche Ctrl K
  (`UniversalSearch`), pays suivis (`al_followed_countries`), PWA (`public/sw.js`, `offline.html`, raccourcis), `framer-motion` retiré,
  mur TV `/app/mur` derrière `NEXT_PUBLIC_TV_WALL` (actif en dev seulement), tiroir de filtres unique, recherche du catalogue dans la barre.
- Vérification : tsc 0, lint 0, 355 tests (341/14/0), invariants 4/4, build, E2E MVP 145 + 1 ignoré (échec corrigé), E2E Clerk 8/8,
  TV 522 → 322 Ko gzip. Pièges nouveaux : Ctrl K = palette (plus le champ du catalogue) ; filtres à ouvrir dans le tiroir en E2E
  (`e2e/helpers/filters.ts`) ; un build servi en local exige `DEPLOYMENT_ENV=local` sur le port 3001.
- Environnement laissé : `npm run dev` en mode Clerk sur 3001 (santé 200, `/app` anonyme → 307) ; ligne technique MVP supprimée.
- Suite : bilan au propriétaire ; commit / publication de P5 uniquement sur demande.

## Publication Premium P3–P4 sur staging — 3 octobre 2026

- À la demande du propriétaire : P4 committé (`06b662f`), poussé avec P3 sur GitHub `main`, publié sur Railway staging
  (`990745ba-1fe3-4ebc-82cf-23acc5736f17` **SUCCESS**). 391/391 fichiers applicatifs identiques par SSH, santé 200 sur les deux
  domaines, météo anonyme 401, dashboard 307, **9/9 E2E distants**. Aucune migration, variable, DNS ou plan modifié. [dossier de publication P3–P4](docs/publication-premium-p3p4-2026-10-03.md).
- Les mentions « non committé / non poussé / non publié » de P3 et P4 ci-dessous sont historiques.
- Suite : **lot P5** (feu vert donné le 3 octobre), un lot à la fois.

## Expérience Premium — Lot P4 « Landing, tarifs, compte » fait et vérifié (3 octobre 2026)

- **Fait et vérifié en local, non committé** (UX-401 → 407 + UX-212 + UX-214, captures connectées faites avec le propriétaire). Dépendance
  ajoutée sur décision du propriétaire : `@clerk/localizations` 4.9.0 (compatible `@clerk/shared` 4.20.0). HEAD reste
  `1ff0e53` (P3 `412574d` + documentation, non poussés). Détail : section « Lot P4 » de [production-progress.md](docs/production-progress.md) ;
  captures `docs/screenshots/premium-p4-*`.
- Landing : chiffres réels (`src/lib/public-stats*.ts`, cache 1 h : 11 771 chaînes, 371 africaines, 36 pays en local), hero
  `public/landing/hero-radar-tv.webp` (41 Ko, données fictives, script `.local-logs/p4/hero-shot.ts`), 3 bénéfices, FAQ 5 questions.
  Tarifs : `PlanCard` / `PaymentMethods` partagés, annuel mis en avant, « Activer pour … FCFA » (NabooPay inchangé). Clerk :
  `src/lib/clerk-theme.ts` (jetons en variables CSS + traduction française manuelle). Erreurs : `OffAirScreen`, `error.tsx`,
  `app/error.tsx`, `global-error.tsx`, `loading.tsx`. Compte : jauge `access-gauge` + « Mon activité ». Éco data dans la barre dès 360 px.
- Vérification : tsc 0, lint 0, npm test 348 (334/14 ignorés/0), invariants 4/4, build réussi, E2E MVP 132 + 1 ignoré (2 échecs corrigés,
  specs rejoués 67/67), E2E Clerk 8/8.
- Environnement laissé : `npm run dev` en mode **Clerk** sur 3001 (onglet « dev server (Clerk) »), santé 200, `/app` anonyme → 307 ;
  ligne technique MVP supprimée (`users` = 2). Scripts de travail : `.local-logs/p4/` (look, shots-p4, hero-shot, look-section).
- Suite : bilan au propriétaire, **P5 après son feu vert**. Commit/push uniquement sur demande.

## Expérience Premium — Lot P3 « Radar vivant » fait et committé en local (3 octobre 2026)

- **Fait, vérifié et committé en local (`412574d`, suivi d'un commit documentaire), non poussé, non publié** (UX-301 → 308). Arbre propre. Détail, mesures et limites : section « Lot P3 » de
  [production-progress.md](docs/production-progress.md) ; plan à jour : [plan-experience-premium.md](docs/plan-experience-premium.md) §5.1.
  Captures : `docs/screenshots/premium-p3-*`.
- `LiveRadarDashboard.tsx` : 1 383 → 250 lignes ; composants et hooks dans `src/components/radar/`, logique pure testée dans
  `src/lib/` (`radar-articles`, `radar-featured`, `radar-visit`, `radar-fresh`, `radar-activity`, `weather-alert`, `rss-image`…).
  Nouveautés : « À la une » (image de l'éditeur lue dans le flux, jamais téléchargée par le serveur), trois tuiles cliquables,
  panneau « Sources et fraîcheur », direct du pays dans `InlinePlayerModal` sans quitter le Radar, météo et marchés repliables
  (mémorisés), pastille « n nouvelles » sans saut de défilement.
- **Carte** : le fond vectoriel OpenFreeMap prévu au plan pèse ≈ 1,27 Mo (10× le satellite) et a été écarté. Fond sombre par défaut
  = contours des pays d'Afrique auto-hébergés (`public/maps/africa-countries.json`, 74 Ko / 24 Ko compressés, Natural Earth domaine
  public, `scripts/build-africa-countries.mjs`) : 1 requête, 25 Ko ; satellite en option ; vue initiale cadrée sur tout le continent.
- **Performance** : l'ancien Radar saturait le CPU au repos (rendu complet de ≈ 170 dépêches chaque seconde via l'horloge météo).
  Horloge à 15 s, lignes mémoïsées, fil paginé par 12 : un rendu toutes les 15 s, ≈ 4 ms entre deux rendus (CPU ×4).
- Vérification de fin de P3 : `tsc` 0, `lint` 0, `npm test` 341 (327 réussis, 14 ignorés, 0 échec), invariants 4/4, build réussi (Next.js, Turbopack),
  E2E mode MVP (14 specs, --workers=1) : 134 tests, 132 réussis, 1 ignoré (test « build servi »), 1 échec de test (course dans le nouveau spec radar-live), corrigé puis rejoué 10/10, E2E mode Clerk (dev, anonyme) : 8/8 (auth-entry, payment).
- Limites : pas de séisme dans la tuile d'alerte (USGS retiré en RW-009) ; APS n'a pas d'image dans son flux ; mesures simulées sur
  Edge de bureau (aucun appareil réel) ; Clerk connecté, VLC réel et flux amont hors réception.
- Suite : **P4 après le feu vert du propriétaire** (Landing, tarifs, compte : UX-401 → 407 + UX-212, UX-214), puis P5. Repères de code
  et décisions en attente : [plan §5.2](docs/plan-experience-premium.md). **Prompt à coller dans une nouvelle session :
  [prompt-reprise-premium-p4.md](docs/prompt-reprise-premium-p4.md).** Push et déploiement de P3 : seulement sur demande explicite.
- Environnement laissé : serveur `npm run dev` sur 3001 en mode **Clerk** (santé 200, `/app` anonyme → 307), ligne technique
  `africa-live-local-user` et événements de test supprimés (compteurs de tables identiques). Scripts de travail non versionnés dans
  `.local-logs/p3/` (mesures de carte, CPU au repos, rendus React, captures) en plus de `.local-logs/premium/`.

## Publication Premium P0–P2 — 3 octobre 2026

- Sur demande explicite du propriétaire, l'ensemble des changements Premium
  P0/P1/P2, leurs tests, captures et documentation sont committés et poussés
  sur GitHub `main` : applicatif `1ef60b5` (226 fichiers).
- Railway staging CLI : `117f35ed-2c1a-474f-ad72-dd0cea974a4f` **SUCCESS**,
  instance RUNNING ; 343 fichiers applicatifs identiques par SSH.
- Réception : 307 unitaires réussis, 14 intégrations ignorées, invariants
  4/4, TypeScript/lint/migrations/build réussis ; 8/8 E2E Clerk locaux et
  **9/9 E2E distants**. Santé 200 sur les deux domaines, météo anonyme 401,
  dashboard 307 ; migrations 19/19 sans différence avant/après.
- Serveur local absent au début de la réception navigateur, relancé sur 3001
  avec Clerk ; santé 200. Variables, DNS, plans, schéma et source IPTV inchangés.
- [Dossier de publication](docs/publication-premium-2026-10-03.md).
  Un commit documentaire de clôture suit l'applicatif. Les mentions
  « non committé/non publié » des bilans P0–P2 ci-dessous sont historiques.
- Suite (historique) : P3 est fait en local depuis (voir ci-dessus) ; P4–P5 et reliquats inchangés.
  Profils connectés, amonts actuels, appareils et VLC réel restent hors réception.

Ce document permet à une nouvelle session de reprendre le travail sans
réinterpréter l'historique. Il ne contient volontairement aucun secret, cookie,
mot de passe, identifiant de paiement, clé Clerk ou URL de flux média.

## Expérience Premium — P0 à P2 faits et publiés (historique, 2-3 octobre 2026)

- Diff RW committé et publié par le propriétaire (`51c0bc8`, `1aa85b5`),
  Railway staging mis à jour. Vision UX/design validée.
- Plan de référence : [plan-experience-premium.md](docs/plan-experience-premium.md)
  (§0 décisions : identité = logo noir + vert/jaune/rouge + or, grand logo
  transparent conservé via `BrandBackdrop`, polices Unbounded + Manrope,
  signature « Le live qui vient à vous », contexte Sénégal).
- Prompt de passation initial : [prompt-sonnet-experience-premium.md](docs/prompt-sonnet-experience-premium.md).
  (historique) prompt P3 : [prompt-reprise-premium-p3.md](docs/prompt-reprise-premium-p3.md). **Prompt de reprise actuel à coller dans une nouvelle session : [prompt-reprise-premium-p4.md](docs/prompt-reprise-premium-p4.md).**
- Avancement : [plan-experience-premium.md](docs/plan-experience-premium.md) §5.1 (fait / reste à faire / questions
  ouvertes), colonne « État » du §6, reliquats UX-209 (suite), UX-212, UX-213, UX-214, §8.1 « Pièges connus ».
- **Lot P0 terminé et vérifié localement le 2 octobre 2026**, non committé, non publié.
  Détail, preuves et limites : section « Expérience Premium — Lot P0 » de
  [production-progress.md](docs/production-progress.md) ; état par ticket dans la
  colonne « État » du plan. Nouveau socle : jetons et polices dans `globals.css` et
  `layout.tsx`, `src/components/ui/`, `src/components/brand/` (BrandBackdrop, BrandMark,
  Wordmark, GoldRing, KenteBand, Silhouettes), `src/lib/storage-keys.ts`, page de revue
  `/app/ui` (développement seulement). Captures : `docs/screenshots/premium-p0-*`.
- **Lot P1 terminé et vérifié localement le 2 octobre 2026**, non committé, non publié : coquille
  unique `src/components/shell/` (AppShell, AppHeader, NavLinks, CountryPicker, ClockBadge, PageTransition),
  barre basse mobile, pays dans l'URL, horloge locale, Briefing masqué, transitions. Détail dans la section
  « Lot P1 » de [production-progress.md](docs/production-progress.md).
- **Lot P2 terminé et vérifié localement le 2 octobre 2026**, non committé, non publié : TV « streaming »
  (UX-201 → 211). `src/components/tv/` (ChannelTile, ChannelRail, TvRows, HelpLine, ActiveFilterChips),
  `src/components/player/PlayerControls.tsx`, `src/components/shell/EcoToggle.tsx`, libs `recent-channels`,
  `eco-mode`, `share-links`, `channel-fallback`, `zap-list`, `tv-rows`, `channel-labels`. Seule modification
  d'API : ordre « Afrique d'abord » et curseur à rang de `/api/channels` (UX-208, testé). Piège hls.js : le
  contrôleur d'interstitiels contournait `autoStartLoad:false` ; `Player.tsx` le désactive
  (`enableInterstitialPlayback:false`). UX-209 partiel (barre latérale desktop conservée). Détail et preuves :
  section « Lot P2 » de [production-progress.md](docs/production-progress.md) ; captures
  `docs/screenshots/premium-p2-*`.
- Suite : ~~attendre le feu vert pour P3~~ (P3 est fait : voir plus haut) (Radar « vivant », UX-301 → 308 ; commencer par le
  découpage UX-301 avec les E2E radar inchangés). Puis P4 (UX-401 → 407), P5 (UX-501 → 508). Réserves :
  `/account` et `/admin` à capturer avec une session Clerk (UX-214) ; widgets Clerk encore en anglais (UX-405) ;
  couleurs éditoriales du Radar harmonisées en P3 ; contrôle du lecteur ancré encore brut (UX-213).
- **Arbre de travail** : (historique) P0–P2 étaient non committés (≈ 190 fichiers) ; ils sont committés et publiés depuis (`1ef60b5`). Le propriétaire
  n'a pas encore décidé de les committer ; ne rien committer sans demande explicite, ne jamais nettoyer par une
  commande Git destructive. `docs/screenshots/l5-anchored-*.png` sont réécrits par l'E2E `anchored-player` :
  les restaurer depuis `HEAD` après un passage.
- Mode du serveur dev laissé sur 3001 à la fin de P2 : Clerk (`npm run dev` sans drapeaux MVP, onglet terminal
  « dev server (Clerk) »), santé 200, `/app` en anonyme → 307. Pour les E2E et captures MVP, il faut redémarrer
  avec `LOCAL_DEV_MODE=true NEXT_PUBLIC_LOCAL_DEV_MODE=true` et insérer la ligne technique `africa-live-local-user`
  (`clerk_user_id='local-development'`) dans `africa_live_dev` ; la retirer ensuite (ainsi que ses événements et
  sessions de lecture de test) et remettre le serveur en mode Clerk. Les scripts de travail non versionnés sont dans
  `.local-logs/premium/` (ignoré par Git) : `local-user.cjs add|remove`, `cleanup-local-user.cjs`, `shots.cjs`
  (captures 360/768/1366), `edit-helper.cjs` (remplacements CRLF-tolérants). Ils peuvent être recréés ; la procédure
  est décrite dans le prompt de reprise.
- Dernière vérification complète (fin de P2, 2 octobre 2026) : `tsc` 0 erreur, `lint` 0, `npm test` 321 tests
  (307 réussis, 14 ignorés, 0 échec), invariants 4/4, `build` réussi, E2E MVP 108 réussis + 1 ignoré, E2E Clerk 8/8.

## Complément de reprise — 2 octobre 2026

- À la demande du propriétaire, base Railway copiée vers `africa_live_dev`
  uniquement, réception à 19:39 UTC : 14 505 chaînes, 15 646 sources,
  22 tables publiques + journal Drizzle, 19 migrations, 2 utilisateurs et
  29 favoris. Ancien local sauvegardé/chiffré et restauration isolée vérifiée ;
  export Railway en lecture seule, restauration temporaire locale puis bascule
  transactionnelle. Empreintes de toutes les tables restaurées identiques au
  snapshot ; catalogue/données métier Railway vérifiés inchangés avant/après.
  Aucune écriture distante, migration, variable, publication ou état Railway
  modifié. Serveur dev relancé sur 3001, santé 200, gardes Clerk conservées.
  [Dossier de synchronisation locale](docs/local-database-sync-2026-10-02.md).
- Diff RW revu, fichiers existants préservés. Le serveur absent a été relancé ;
  après un nouvel arrêt sans erreur consignée, `npm run dev` est maintenant
  maintenu dans une session de terminal sur 3001, avec Clerk initial.
- Capture utilisateur : clés dupliquées dans les overlays `AnimatePresence`
  du lecteur. Six clés distinctes ajoutées dans `src/components/Player.tsx`.
  Reproduction navigateur avant : 15 avertissements ; après : zéro sur quatre
  cas (refus, HLS décodé, autoplay refusé, VLC simulé). TypeScript et lint ciblé
  réussis. Preuves dans `.local-logs/review-2026-10-02/player-keys-results.json`.
  Réception de composant avec réseau simulé, distincte des E2E RW historiques.
- Point P2 météo corrigé avant la publication demandée le 2 octobre : rejet de
  `reader.cancel()` géré, deux tests de corps HTTP réels ajoutés. Le reproducteur
  timeout/annulation ne produit plus aucun rejet non géré. Les tests utilisent
  le fetch natif capturé avant les mocks précédents du même fichier.
- Mise à jour GitHub et Railway CLI autorisée puis effectuée : `main`, commit
  applicatif `51c0bc8`, Railway staging
  `f0816583-e6a0-4115-bd54-d4cb0709acb1` **SUCCESS**, instance RUNNING.
  Réception à 19:22 UTC : 287 fichiers applicatifs identiques par SSH CLI ;
  deux domaines santé 200, météo anonyme 401, dashboard 307 vers connexion,
  **9/9 E2E distants**. Migrations avant/après : 19/19, zéro en attente,
  empreintes identiques. Validation locale : 244 unitaires réussis, 14 ignorés,
  invariants 4/4, TypeScript/lint/migrations/build réussis. Lire le
  [dossier de publication CLI](docs/publication-cli-2026-10-02.md).
  Le brouillon `docs/plan-experience-premium.md` apparu ensuite reste local.
  Aucun changement de variable, DNS, plan ou fichier `.env`. Aucun service
  payant supplémentaire souscrit ; l'usage du déploiement n'a pas été chiffré.
- Point de reprise actuel : GitHub et Railway staging publiés ; un commit
  documentaire de clôture consigne les preuves sans nouveau changement
  applicatif. Aucun ticket RW restant. Le serveur dev demeure sur 3001,
  santé 200, Clerk initial. Les profils connectés/amonts/appareils restent
  hors réception ; ne pas lancer L5/L6 ni promouvoir staging implicitement.

## État de reprise historique — 1er octobre 2026

**Point d'arrêt avant déconnexion du propriétaire :**
- Travail demandé terminé localement : RW-001 à RW-010 clos ; aucun test
  échoué restant. Dernière modification : message de validation météo lisible,
  suivi de 18/18 E2E météo, TypeScript/lint/build et test build servi réussis.
- À la prochaine connexion : lire AGENTS.md, ce document et le dossier RW,
  puis `git status --short`. L'arbre sale est le résultat à revoir ; ne pas
  le nettoyer, committer, pousser ou déployer sans nouvelle demande.
- Suite normale : revue du diff local et des limites du dossier. Il n'y a pas
  de ticket RW d'implémentation à reprendre. Une réception Clerk connectée/
  staging ou publication nécessite une demande explicite du propriétaire.
- Serveur laissé en `npm run dev` avec Clerk initial, santé 200, météo anonyme
  401 et dashboard 307 à la clôture. Après déconnexion, vérifier le listener
  3001 et son checkout avant de le réutiliser ; sa survie n'est pas garantie.
  Si absent, relancer `npm run dev` dans Africa_Live_TV sans modifier `.env.local`.
- Journaux exacts dans `.local-logs/rw/` ; liste et chemins dans le dossier RW.
  Un seul test build ignoré en dev est reçu séparément ; les 14 intégrations
  PostgreSQL ignorées ne sont pas des succès. HEAD toujours `54e5696`.

**Complément courant : remédiation RW-001 à RW-010 reçue localement.**
- Lots A/B/C/D terminés ; HEAD `54e5696`, diff applicatif/documentaire non
  committé. Modifications documentaires précédentes conservées.
- Preuves : [dossier RW](docs/radar-weather-remediation-validation.md),
  [backlog/journal](docs/radar-weather-remediation-backlog.md), checklist et reprise dashboard.
- 256 unitaires : 242 réussis, 14 intégrations PostgreSQL ignorées, zéro échec ;
  invariants 4/4, TypeScript/ESLint (zéro avertissement), migrations et build verts.
- E2E dev : 51 réussis, 1 réservé build ; build servi Clerk anonyme réel :
  1/1 réussi, worker prêt, météo 401 et dashboard redirigé. Les amonts météo/RSS
  et profils authentifiés sont simulés dans les autres scénarios.
- Serveur final `npm run dev` Clerk initial sur 3001, `.env.local` inchangé,
  africa_live_dev seulement. Aucun commit/push/déploiement, changement DB,
  distant, source IPTV ou coût. Railway demeure staging, RW non publié.
- Restent hors réception RW : Clerk connecté, appareils/VLC et amonts actuels,
  staging/production. Revue du diff puis publication uniquement sur demande.
  Ne pas utiliser le mode anonyme de test pour recevoir les handlers Radar
  qui requièrent le middleware Clerk. L5/L6 non relancés.

Les paragraphes de préparation suivants décrivent l'état avant cette exécution.

**Historique : revue Gemini et plan de remédiation Radar/météo :**
- Code local revu : `6f7e384` (Radar/RSS) et `54e5696` (météo), HEAD `54e5696`.
- Défauts confirmés : secours navigateur après refus d'accès, mesures absentes
  acceptées comme 0 °C, observation wttr.in rajeunie et fuseau/jour-nuit arbitraires,
  provenance/disponibilité incohérentes, filtre International basé sur une catégorie
  RSS instable, appel météo direct sans timeout.
- Le propriétaire a demandé un plan détaillé destiné à Gemini :
  [backlog RW-001 à RW-010](docs/radar-weather-remediation-backlog.md) et
  [prompt prêt à copier-coller](docs/gemini-radar-weather-prompt.md).
  **Plan rédigé, aucune correction implémentée ; tous les tickets À faire.**
- Audit initial : 221 tests réussis, 14 ignorés ; TypeScript/ESLint réussis.
  Reproductions serveur et composant navigateur avec fournisseurs simulés,
  pas de nouveau build/E2E complets ni réception Clerk authentifiée staging.
- Déploiement météo `19a9a9ae-6746-4652-b16d-996e4d48aaa9` déclaré SUCCESS
  par Gemini dans le compte rendu transmis ; non revérifié pendant cette revue.
  Le relevé 22:14 UTC ci-dessous concerne le déploiement Radar antérieur.
- Préparation documentaire uniquement : aucun commit/push/déploiement, coût,
  modification de base ou état distant. Reprise des corrections selon le plan
  et une demande d'implémentation ; aucun lancement implicite de L5/L6.

**Mise à jour Radar & rédactions (GitHub et Railway staging reçus à 22:14 UTC)** :
- Commit applicatif `6f7e384` poussé sur GitHub `main`.
- Déploiement Railway staging CLI `812e1527-13a8-4884-9250-e25133afddca` **SUCCESS / actif** sur le service `Africa_Live_TV`.
- Santé `GET /api/health` : HTTP 200 (`process` et `database` ok) sur `staging.africatv.sn` et sur le domaine de secours Railway.
- Radar anonyme : HTTP 401 et redirection 307 de `/app/live` vers Clerk protégées.
- Évolutions livrées :
  1. Intégration et validation d'AIP (Côte d'Ivoire) et de 21 flux RSS nationaux et économiques africains (APS, MaliJet, LeFaso, Actu Cameroun, Okapi, etc.).
  2. Nouvelle rubrique internationale (France 24 Monde/Afrique, RFI Monde/Afrique, BBC Afrique, Le Monde Afrique) avec onglets de filtrage (« Toutes », « Afrique & National », « International »).
  3. Retrait de GDELT (dépendance externe en dépassement de quota) et suppression des couches séismes (USGS) et feux thermiques (FIRMS) sur la carte vectorielle.
  4. Harmonisation visuelle complète du dashboard avec le design de la page TV (barre tricolore, cartes glassmorphismes, badges de rédaction avec codes couleur dédiés).
- Schéma PostgreSQL et dépendances inchangés (0 nouvelle migration requise).

**Complément L5 historique : AL-T05 réalisé, testé et évalué localement**, après
demande explicite du propriétaire. Prototype opt-in dans `/app`, désactivé au
chargement, uniquement avec `npm run dev` sur localhost:3001 ; base africa_live_dev.
Lecteur web unique géré, zapping, destruction HLS/vidéo, pause, volume conservé,
plein écran, filtres indépendants et parcours modale/fenêtre reçus.
Recommandation **ajuster avant généralisation** : VLC sort du prototype vers le
lecteur historique ; son arrêt reste manuel et l'exclusivité globale n'est pas
reçue. Voir [la réception L5](docs/anchored-player-validation.md).
220 unitaires + 14 intégrations isolées, 41 scénarios E2E distincts reçus ;
TypeScript/ESLint/build/migrations réussis. Comptes Clerk ordinaires, VLC réel,
amont réel et appareils physiques non reçus en L5. Administrateur inchangé.
Publication L5 autorisée ensuite et reçue le 1er octobre à 20:08 UTC :
commit applicatif `9326fc0` poussé sur GitHub `main`, Railway staging
`dc557ad8-8288-4872-863d-7a2b6396014c` SUCCESS/actif. Santé processus/base 200
sur les deux domaines, **9 E2E distants réussis**. Le contrôle d'activation
ancré reste absent du build production ; le prototype reste local et opt-in.
Briefing inactif, L6 non commencé. [Preuves de publication](docs/anchored-player-validation.md#publication-github-et-railway-staging).
La clôture L0–L4 ci-dessous est un relevé historique.
La prochaine reprise doit traiter l'ajustement/réception humaine L5 selon demande,
sans démarrer L6 implicitement. Serveur restitué en développement Clerk local.

Clôture publiée à la demande du propriétaire : GitHub `main`, applicatif
`22dea98`, puis commit documentaire final ; Railway staging
`4c8a82cc-5b3b-4a0e-86a1-bf922540869a` SUCCESS reçu à 18:44 UTC.
Santé processus/base 200, Radar anonyme 401, neuf E2E distants repassés.
Aucun changement de code depuis les preuves L4, ni nouvelle migration,
variable, DNS, plan ou abonnement. Voir la fiche de reprise pour les empreintes.

**Lire d’abord [la fiche de reprise dashboard](docs/dashboard-session-handoff.md)** :
L0–L4 terminés et déployés staging ; L5 évalué localement, recommandation ajuster ;
L6 reste différé et nécessite une nouvelle demande.
Les sections anciennes ci-dessous conservent l’historique ; leurs « suite » et
« non déployé » ne sont pas les instructions de reprise actuelles.

### Complément local — 1er octobre 2026 : réception L4

Complément staging autorisé à la suite : snapshot L0–L4 déployé le 1er octobre,
`b0d52c0c-3bca-4600-8a3e-fb1f2709dada` SUCCESS/actif vérifié à 18:09 UTC.
Neuf E2E distants réussis, santé processus/base 200 ; parcours administrateur
Clerk réel reçu en local et staging. Pas de commit/push, changement de plan,
variable ou nouvelle migration. Premier upload expiré avant build puis relance
réussie. Preuves : `docs/dashboard-auth-staging-reception.md`.
Le propriétaire ne dispose que du compte administrateur : essai/actif standard/
expiré non reçus en session réelle. Zoom natif 200 % confirmé puis reçu à
18:29 UTC : viewport de l’outil réinitialisé, DPR=2, 937×477 CSS, aucun
débordement ; pays/clavier/filtres TV/Échap/focus vérifiés. Les premiers
relevés DPR=1 étaient masqués par le viewport simulé de l’outil.

AL-Q01, AL-C05 et acceptation locale AL-Q02 : réception intégrée et dossier
dans `docs/dashboard-release-validation.md` et `docs/dashboard-delivery-dossier.md`.
Les lots L0–L3 sont implémentés et testés localement, sans migration supplémentaire.
Dashboard/API et lecture refusés après expiration ; catalogue consultable.
Les statistiques staging historiques divergent : ne pas les reconduire comme
mesure actuelle. À la réception locale initiale, aucun déploiement n’avait eu lieu ; staging a
ensuite été livré avec autorisation. Rôle, domaine et plan inchangés.
Suite : arbitrage L5 sur le lecteur ancré ; briefing désactivé jusqu’à L6.
La réception de comptes Clerk connectés et le zoom natif restent explicitement
distincts des tests automatisés de gardes et de reflow.

### Complément local — 30 septembre 2026 : AL-C01 / AL-C02

Le propriétaire a décidé de refuser l'accès au dashboard après expiration.
Cette règle est implémentée localement sur `/app/live` et les huit API Radar ;
le catalogue TV demeure consultable selon DOC-006. Grâce active et exception
administrateur préexistantes conservées. Matrice, tests et limites dans
`docs/dashboard-access-matrix.md` ; suivi dans `docs/plan-dashboard-backlog.md`
et `docs/production-progress.md`. Aucun déploiement ni changement distant.
Les références plus anciennes ci-dessous ne décrivent pas cette livraison
locale. Préserver les modifications landing/navigation déjà présentes.

### Complément local — 30 septembre 2026 : fin L0 / fiabilité L1

AL-C03/AL-C04 et AL-D02/AL-D03/AL-D05/AL-D06 sont livrés et testés
localement : identités RSS/options/bandeau, worker ESM explicite, fenêtre
commune 24 h, états par fournisseur, candidates TV selon le résolveur et
bandeau daté. Contrats et preuves : `docs/dashboard-reliability-validation.md`.
La réception du worker en build servi passe depuis une page publique sous
CSP ; le dashboard complet est testé en mode MVP de développement. Pas de
nouvelle session Clerk authentifiée sur le build. Serveur restitué en mode
Clerk local, briefing toujours désactivé jusqu’au lot L6. Aucun changement
de schéma, déploiement, commit, push ou état distant. Les autres lots du plan
restent à faire ; ne pas confondre cette livraison avec Railway.

### Complément local — 30 septembre 2026 : L2 terminé

AL-W01 à AL-W06 sont livrés localement : dashboard compact, sélecteur pays
accessible, URL/historique, priorité au fil sur mobile, carte à la demande,
couches optionnelles datées et tableau de disponibilité. Contrats, captures
et limites : `docs/dashboard-workspace-validation.md`. 211 tests unitaires
et 24 E2E réussis, TypeScript/ESLint/build réussis. Serveur Clerk local
restitué ; briefing désactivé jusqu’à L6. Prochain lot : L3, AL-T01 à AL-T04.
Pas de déploiement, migration, commit, push ou modification distante.

### Complément local — 1er octobre 2026 : L3 terminé

AL-T01 à AL-T04 livrés localement : navigation commune et capacité admin
vérifiée sur le serveur, catégories/langues normalisées à la lecture,
URL/sidebar/raccourcis synchronisés, Afrique/Sénégal/Tout/favoris et contexte
pays dashboard→TV. Les imports restent inchangés. Contrats et réception :
`docs/tv-workspace-validation.md` ; 219 unitaires et 42 E2E réussis,
TypeScript/ESLint/build réussis, 14 intégrations optionnelles ignorées.
Serveur remis en mode Clerk local. Briefing désactivé jusqu’à L6.
Prochain lot : L4, AL-Q01/AL-Q02/AL-C05. Aucun déploiement, migration, commit,
push ou changement distant. Les parcours Clerk réels du build restent à recevoir.

## 1. Point de départ obligatoire

1. Lire intégralement `AGENTS.md`, notamment le bloc Next.js auto-généré et les
   règles Africa Live.
2. Exécuter `git status --short` avant toute modification. Le checkout contient
   des changements non commités qui doivent être préservés.
3. Lire, dans cet ordre :
   - `docs/production-backlog.md` ;
   - `docs/production-progress.md` ;
   - `docs/environment-matrix.md` ;
   - `docs/non-regression-checklist.md` ;
   - `docs/railway-preproduction-runbook.md` ;
   - `docs/deployment-configuration.md`.
4. Pour tout changement Next.js, lire d'abord le guide correspondant sous
   `node_modules/next/dist/docs/`. Le projet utilise Next.js 16.3.5, dont les
   conventions peuvent différer des versions connues du modèle.
5. Ne pas supposer que les sessions navigateur, Clerk, Railway ou OVHcloud sont
   encore ouvertes. L'authentification interactive reste à la charge de
   l'utilisateur ; ne jamais automatiser un mot de passe ou un code OTP.

## 2. Dépôt et règles non négociables

- Workspace : `C:/Users/GAMER PC/Africa_Live_TV`.
- Branche locale : `main` (synchronisée avec `origin/main` après mise à jour documentaire du déploiement).
- Applicatif GitHub publié : `22dea98` ; commit documentaire final ensuite.
  Vérifier `git log -1` et `git ls-remote origin refs/heads/main` à la reprise.
- Dernier staging reçu : `4c8a82cc-5b3b-4a0e-86a1-bf922540869a`, SUCCESS
  le 1er octobre à 18:44 UTC ; code identique au premier snapshot L0–L4,
  documentation de reprise incluse. Les autres identifiants sont historiques.
- Un fichier non suivi, `docs/radar-cockpit-backlog.md`, est apparu pendant cette reprise. Il n'a pas été publié ni validé ; le préserver et traiter ses propositions comme un brouillon à comparer à la feuille de route sourcée `docs/radar-afrique-roadmap.md`.
- Dépôt distant : `https://github.com/fatme-nabih/Africa_Live_TV.git`.
- Aucun commit ou push ne doit être créé sans demande explicite de l'utilisateur.
- Le projet source `C:/Users/GAMER PC/IPTV` doit rester entièrement inchangé.
- La base locale autorisée est uniquement PostgreSQL `africa_live_dev`.
- L'application locale écoute sur `127.0.0.1:3001`.
- Ne jamais lancer un test ou une migration destructive sur une autre base.
- Ne jamais utiliser `npm run db:push` sur Railway ou une production.
- Le navigateur et VLC téléchargent les médias directement depuis l'amont.
  Aucun relais, proxy vidéo, conversion, playlist servie ou stockage média ne
  doit être ajouté au serveur Africa Live.
- Le lancement automatique de VLC est une capacité du poste local seulement.
- Les règles d'authentification et d'éligibilité déployées ne doivent jamais être
  affaiblies pour faire passer un test.
- Les fixtures binaires `e2e/fixtures` restent exclues de TypeScript et ESLint.
- Préserver tous les changements déjà présents dans le working tree. Ne pas
  employer `git reset --hard`, `git checkout --` ou une suppression globale.

## 3. Architecture fonctionnelle actuelle

L'application possède deux modes locaux indépendants :

1. **Local avec Clerk** : authentification réelle Development, catalogue,
   recherche, filtres, favoris, lecture web locale et secours VLC.
2. **MVP local sans Clerk** : activé uniquement par les trois flags locaux,
   accès complet au catalogue local, favoris, lecture directe et VLC.

Le mode Railway est une préproduction authentifiée. La lecture directe y est
ouverte avec `PLAYBACK_ELIGIBILITY_READY=true` depuis la validation du catalogue
du 24 septembre 2026. Le domaine, le healthcheck ou un déploiement réussi ne
constituent pas, à eux seuls, une validation des droits média.

Depuis le 29 septembre, staging inclut aussi les demandes de contact/retrait
avec file administrateur privée, la neutralisation persistante des sources
signalées, et le Radar GDELT sous `/app/live`. Le Radar reste derrière l'accès
authentifié au catalogue ; GDACS et la météo ne sont pas activés.

État local vérifié :

- 11 778 chaînes ;
- 12 396 sources (re-qualification intégrale achevée le 24 septembre 2026 : 4 588 BROWSER_OK, 2 446 VLC_ONLY, 4 556 OFFLINE, 806 UNTESTED ; 6 872 flux sains avec succès frais du jour ; 4 539 chaînes web directes) ;
- 21 tables ;
- 10 migrations Drizzle ;
- 2 utilisateurs lors du dernier inventaire ;
- aucun favori de test conservé ;
- première page : 30 chaînes ;
- horloge Windows `w32time` en Running/Automatic, source `time.windows.com`,
  dérive finale observée d'environ 0,14 seconde ;
- VLC installé sous `C:/Program Files/VideoLAN/VLC/vlc.exe`.

La session Clerk locale a été réinitialisée manuellement et validée. Les routes
`/api/filters`, `/api/channels` et `/api/favorites` ont répondu en JSON/200.
Recherche, filtre, favori persistant, tentative web et lancement VLC réel ont
été testés. Le favori et le processus VLC de test ont ensuite été nettoyés.

## 4. Lots 0 et 1 terminés

### Documentation

- DOC-001 : backlog aligné avec Railway existant.
- DOC-002 : matrice Local Clerk / Local MVP / Railway staging / Production.
- DOC-003 : journal par ticket.
- DOC-004 : checklist de non-régression.

### Local

- LOC-001 : horloge Windows compatible Clerk.
- LOC-002 : reconnexion Clerk locale.
- LOC-003 : trois API authentifiées en JSON/200.
- LOC-004 : réponses HTML/404 Clerk traduites en erreur de session claire.
- LOC-005 : parcours Clerk complet avec lecture locale.
- LOC-006 : MVP sans Clerk, 13 E2E réussis.
- LOC-007 : lancement VLC réel vérifié.
- LOC-008 : `npm run diagnose:local` ajouté, lecture seule et sans secrets.

La logique d'erreur client modifiée se trouve dans `src/lib/api-contracts.ts`,
avec ses tests dans `src/lib/catalog-api.test.ts`.

## 5. État Railway historique — 29 septembre 2026

- Projet `just-compassion`, environnement visible `production`, rôle applicatif `staging` (`DEPLOYMENT_ENV=staging`).
- Déploiement applicatif actif : `dfa1da5f-36d2-402f-887a-228d5b1e7e57`, `SUCCESS`, commit `2f19e38` ; domaine `https://staging.africatv.sn`.
- Publication faite avec `railway up` après le push GitHub : aucun déploiement automatique n'était apparu dans la liste Railway au bout d'environ une minute. Ne pas supposer qu'un push seul publie ; vérifier le service avant de conclure.
- Une première tentative CLI (`aeeaa462-10df-42e7-908d-cf2ab5b61e15`) a échoué sur l'envoi de la requête Railway avant le build ; elle n'a pas exécuté de migration. La seconde tentative, avec les IDs explicites projet/service/environnement, a réussi.
- Avant la migration `0018_support_requests`, le dump staging chiffré a été restauré et comparé dans une base temporaire, ensuite supprimée. L'artefact est dans `backups/railway` (ignoré par Git) : `railway-2026-09-29T23-01-49-939Z.dump.aes256gcm`, clé DPAPI Windows, métadonnées `.json`.
- Après migration : 22 tables publiques, 19 migrations Drizzle, 14 505 chaînes et 15 646 sources ; les tables `support_requests` et `support_request_events` existent.
- Vérifié après déploiement : `/api/health` HTTP 200 (`process` et `database` ok), GET anonyme `/api/live/news` HTTP 401 et `/app/live` HTTP 307 vers l'authentification.
- `ABUSE_TRUSTED_PROXY_HEADER=x-real-ip` est défini uniquement dans l'environnement Railway staging. Le réglage de production future reste désactivé jusqu'à vérification de son proxy.
- Aucun domaine de production, service Railway de production, OVHcloud ou plan n'a été modifié.

### État de staging observé le 24 septembre 2026 (historique)

- Projet : `just-compassion`.
- Environnement visible Railway : `production`.
- Rôle réel de l'application : staging via `DEPLOYMENT_ENV=staging`.
- Services : `Africa_Live_TV` et `Postgres`, en ligne et sains.
- Domaine principal staging : `https://staging.africatv.sn` (SSL Let's Encrypt actif, DNS OVHcloud).
- Domaine technique de repli : `africalivetv-production.up.railway.app`.
- Déploiement actif : `ddc78ef6-f449-4b46-a23f-b725b5ae8271` (SUCCESS, commit `3a325ab` : lancement automatique VLC sans affichage d'URL ni bouton de copie M3U8).
- Runtime : Node.js 22.23.3, Railpack 0.40.0.
- Région : US West (sfo), 1 réplique.
- PostgreSQL : volume persistant, 21 tables, 6 396 chaînes actives, 6 825 sources actives certifiées HEALTHY (11 778 chaînes et 12 396 sources au total en base).
- Pré-déploiement actif : `npm run db:migrate:deploy` avec timeout 300 s (exécuté avec succès dans transaction Drizzle).
- Healthcheck actif : `/api/health` avec timeout 120 s (répond 200 OK, `checks: {process: ok, database: ok}`, `Cache-Control: no-store`).
- Sauvegardes : dump logique PostgreSQL chiffré AES-256-GCM + DPAPI stocké hors volume sous `backups/railway`, restauration isolée validée en 78,1 s.
- Consommation relevée : ~0,24 USD sur la période (facture estimée à 0,24 USD). Aucune limite dure.
- Rollback applicatif : vérifié et exécuté en direct via mutation GraphQL `deploymentRollback`.
- Déverrouillage de la lecture de préproduction : `PLAYBACK_ELIGIBILITY_READY=true` configuré sur Railway.
- Qualification réelle des flux et des langues sur PostgreSQL Railway (24 septembre 2026) :
  - Catalogue synchronisé transactionnellement depuis africa_live_dev : 11 778 chaînes et 12 396 sources (2 utilisateurs et favoris préservés).
  - Scan exhaustif en direct avec 15 workers et l'origine réelle https://staging.africatv.sn (durée 49,1 min, écriture par lots de 100 avec réessai) :
    - 11 819 flux soumis à contrôle réseau réel (manifestes HLS, en-têtes CORS staging, statuts HTTP, segments vidéo).
    - 577 flux traités par décisions de sécurité statiques (requêtes sensibles, expiration, URL non prises en charge).
    - 6 825 flux qualifiés sains (`HEALTHY`) avec succès direct certifié :
      - 4 385 flux `PUBLIC_DIRECT_WEB` (`BROWSER_OK`, CORS staging validé, 0 mixed content).
      - 2 440 flux `PUBLIC_DIRECT_VLC` (`VLC_ONLY`).
    - 4 994 flux en échec temporaire protégés (`UNTESTED` / `TEMPORARY_FAILURE` / `REVIEW_REQUIRED`) sans déclaration artificielle d'indisponibilité permanente.
    - 577 flux en revue statique (`UNTESTED` / `NEVER_CHECKED` / `REVIEW_REQUIRED`).
    - 0 flux artificiellement qualifié sain ou hors-ligne par simple protocole.
    - 4 339 chaînes avec au moins un flux direct web opérationnel, 2 103 avec flux externe VLC.
  - Les langues principales des chaînes (`fra`, `eng`, `ara`, `spa`, `por`, `deu`, `ita`, `rus`, `tur`, `zho`, `hin`) sont renseignées dans `channels.language`.
- Streaming direct vérifié et validé avec succès de bout en bout sur navigateur PC (Chrome/Edge) et sur smartphone mobile.

## 6. Lot 2 : ce qui a été implémenté localement

### Route de santé — RLY-002

Fichiers :

- `src/app/api/health/route.ts` ;
- `src/lib/healthcheck.ts` ;
- `src/lib/healthcheck.test.ts`.

`GET /api/health` est public, dynamique, Node.js et non mis en cache. Il exécute
`select 1` sur PostgreSQL. Il retourne :

- HTTP 200, `process=ok` et `database=ok` en succès ;
- HTTP 503 et `database=error` en échec ;
- jamais l'exception, l'hôte, l'utilisateur ou l'URL PostgreSQL.

Preuve locale : `http://127.0.0.1:3001/api/health` a répondu 200 avec
`Cache-Control: no-store, max-age=0`.

### Migrations de déploiement — RLY-005

Fichiers :

- `src/lib/deploy-migration.ts` ;
- `src/lib/deploy-migration.test.ts` ;
- `src/scripts/migrate-deploy.ts` ;
- `src/scripts/test-integration.ts` ;
- script npm `db:migrate:deploy` dans `package.json`.

La commande cible refuse une configuration incomplète, un autre rôle que
staging/production, une cible non Railway, localhost et `africa_live_dev`. Elle
acquiert un verrou consultatif PostgreSQL, borne l'attente du verrou à 10 s et
les requêtes à 240 s, puis utilise les migrations transactionnelles Drizzle.
Le test provoque une migration en échec et vérifie qu'aucune table résiduelle ne
reste. Le 23 septembre 2026, la commande `npm run db:migrate:deploy` et le délai
dashboard de 300 s ont été appliqués et validés sur Railway, y compris le refus
d'un verrou concurrent puis son acquisition après libération.

### Sauvegarde/restauration — RLY-004

Fichier : `src/scripts/test-backup-restore.ts`, commande
`npm run backup:restore-drill:local`.

Le script est volontairement limité à localhost et `africa_live_dev`. Il crée un
dump PostgreSQL custom dans un dossier temporaire, crée une base isolée au nom
aléatoire, restaure, compare l'inventaire, puis supprime base et dump. Il refuse
production, une base distante ou une autre base locale.

Dernier résultat : succès en 2 797 ms, inventaire identique de 21 tables,
11 778 chaînes, 12 396 sources, 2 utilisateurs, 0 favori et 10 migrations.
Aucun dump local n'a été conservé lors de cet essai. La preuve Railway a ensuite
été réalisée le 22 septembre : dump custom PostgreSQL 18.6 chiffré AES-256-GCM,
clé protégée par Windows DPAPI, déchiffrement puis restauration dans une base
Railway isolée. Les inventaires source/restauré concordent : 21 tables, 11 000
chaînes, 11 000 sources, 1 utilisateur, 0 favori et 10 migrations, en 78,1 s.
La base temporaire et le proxy TCP temporaire ont été supprimés. La copie
chiffrée reste dans `backups/railway`, hors volume Railway et ignorée par Git.
Elle reste liée à ce compte Windows et ne remplace pas une sauvegarde durable
hors poste ni le PITR Railway.

### Exploitation — RLY-001/003/006/007/008

- Railway est documenté comme staging malgré le nom visible `production`.
- Healthcheck actif : `/api/health`, délai 120 s, validé sur le domaine Railway
  et sur `staging.africatv.sn`.
- Rollback documenté et exécuté en conditions réelles vers un déploiement sain ;
  la rétention Trial/Free est annoncée à 24 h. Un rollback de code ne restaure
  pas la DB.
- Région proposée pour Dakar : EU West Amsterdam, à confirmer par mesure. Ne pas
  déplacer application ou volume avant sauvegarde et fenêtre de maintenance.
- Objectifs provisoires staging : RPO 24 h, RTO 2 h. La restauration logique
  isolée est démontrée, mais une destination durable hors poste reste à décider.
- RLY-008 est clôturé par la décision de conserver le plan actuel sans surcoût,
  sans limite dure ni alerte inadaptée au crédit restant.

Le fichier `railway.json` a été envisagé puis supprimé : Railway indique que ce
mécanisme est déprécié, indisponible pour ce service et arrêté le 1er décembre
2026. Ne pas le recréer. Le futur mécanisme est `.railway/railway.ts`, mais il
doit être produit par import de l'existant, suivi d'un plan sans changement ; un
graphe écrit à la main peut considérer les ressources omises comme à supprimer.

## 7. Domaine `africatv.sn` et OVHcloud

Le propriétaire a acquis `africatv.sn` chez OVHcloud le 22 septembre 2026. La
capture fournie confirme le domaine et sa zone DNS. Aucune donnée personnelle,
de paiement ou de messagerie de cette capture ne doit être reproduite.

Architecture décidée :

- `staging.africatv.sn` : Railway staging actuel ;
- `africatv.sn` : production canonique future ;
- `www.africatv.sn` : futur alias ou redirection vers l'apex ;
- domaine Railway : accès de diagnostic conservé pendant la préproduction.

État RLY-009 :

- RLY-009A, propriété et zone DNS : terminé ;
- RLY-009B, réservation des noms par environnement : terminé dans le plan ;
- RLY-009C, liaison de `staging.africatv.sn` à Railway et enregistrements DNS
  OVHcloud : terminé ;
- RLY-009D, propagation, certificat, healthcheck et domaine de repli : terminé ;
- RLY-009E, Clerk, `NEXT_PUBLIC_APP_URL`, `BROWSER_TEST_ORIGIN` et parcours
  authentifié : terminé ;
- RLY-009F, apex/`www` de production : différé jusqu'au lancement.

Ne jamais deviner une cible DNS : utiliser exactement les valeurs fournies par
Railway au moment de l'ajout du domaine. Ne pas toucher aux MX, à la messagerie,
à l'apex ou à `www` pendant l'installation du staging. Un TTL de 300 s est
proposé pour la bascule, à relever après stabilité. Valider d'abord
`https://staging.africatv.sn/api/health`, puis Clerk et les variables. Les
variables `NEXT_PUBLIC_*` imposent un nouveau build.

Retour arrière prévu : revenir aux URLs app/Clerk précédentes, vérifier le
domaine Railway, retirer le domaine personnalisé dans Railway, puis supprimer
uniquement les CNAME/TXT staging chez OVHcloud. L'acquisition du domaine reste.

## 8. État précis des tickets

| Ticket | État |
|---|---|
| RLY-001 | Terminé |
| RLY-002 | Terminé et validé sur Railway (route `/api/health` 200/no-store) |
| RLY-003 | Terminé et validé sur Railway (healthcheck 120 s actif, test négatif réussi) |
| RLY-004 | Sauvegarde logique Railway chiffrée et restauration isolée terminées ; sauvegarde native/PITR dépendante du plan |
| RLY-005 | Terminé et validé sur Railway (`db:migrate:deploy`, 300 s, verrou concurrent vérifié) |
| RLY-006 | Terminé : runbook documenté et rollback réel vérifié (`6a13140b`) |
| RLY-007 | Décision EU West proposée ; migration non exécutée |
| RLY-008 | Terminé : décision A8 actée (Option 1 : plan actuel sans surcoût, sauvegardes chiffrées hors volume) |
| RLY-009A/B | Terminés |
| RLY-009C/D/E | Terminés et validés sur `staging.africatv.sn` (DNS OVHcloud, TLS Let's Encrypt, Clerk et garde-fous) |
| RLY-009F | Différé au lancement production |
| PROD-030 | Terminé : UX de lecture distante épurée, suppression de l'URL M3U8, des boutons de copie et des textes techniques |
| PROD-031 | Terminé : Lancement automatique de VLC multi-plateforme (desktop `vlc://`, Android `intent://`, iOS `vlc-x-callback://`, local `/api/open-vlc`) |
| PROD-032 | Terminé : Gestion des transitions, validation sécurisée des protocoles HTTP/HTTPS, scan Snyk SAST 0 vulnérabilité |
| PROD-033 | Terminé : Scan exhaustif Railway (12 396 flux), certification de 6 825 flux sains (4 385 BROWSER_OK, 2 440 VLC_ONLY) et activation exclusive |

Les Phases A, B et le Lot 3 (UX de lecture et qualification des flux) sont 100 % validés et déployés en ligne.
Le domaine de staging `https://staging.africatv.sn` est pleinement opérationnel.
Prochaine séquence recommandée :
- **Lot 2 (PROD-020..022)** : Synchronisation des identités Clerk, webhooks et abonnements Billing.
- **Lot 4 (PROD-040..043)** : Résistance aux pannes et maîtrise de PostgreSQL.

## 9. Validations déjà obtenues

Dernière batterie complète après l'implémentation du lot 3 et déploiement staging (commit `3a325ab`) :

| Contrôle | Résultat |
|---|---|
| `npm test` | 135 tests : 131 réussis, 0 échec, 4 ignorés |
| `npm run test:integration` | 4/4 réussis ; rollback transactionnel, témoin et catalogue préservés |
| `npx tsc --noEmit --incremental false` | 0 erreur |
| `npm run lint` | 0 erreur, 2 avertissements préexistants dans `SeparatePlayerPage.tsx` |
| `npm run build` | Réussi avec Next.js 16.3.5 (Turbopack) ; 15/15 pages générées |
| Snyk SAST (`snyk_code_scan`) | 0 vulnérabilité dans `Player.tsx` ; protocoles et redirections assainis |
| Déploiement Railway | `ddc78ef6-f449-4b46-a23f-b725b5ae8271` SUCCESS avec migrations Drizzle validées |
| Healthcheck staging réel | HTTP 200 `{"status":"ok","checks":{"process":"ok","database":"ok"}}` |
| Streaming direct staging | Validé sur `https://staging.africatv.sn/app` sur PC et mobile |

Les deux avertissements ESLint concernent `window.location.assign()` dans
`src/components/SeparatePlayerPage.tsx` et préexistaient aux modifications. Ne pas les
masquer dans le rapport d'une future validation.

## 10. État Git à préserver

La branche locale `main` est synchronisée avec `origin/main` après le commit
documentaire demandé pour cette reprise. Le runtime staging correspond au commit
applicatif `2f19e38` ; la fiche actuelle et l'ID Railway sont consignés plus haut.
Le seul élément non suivi laissé hors publication est le brouillon
`docs/radar-cockpit-backlog.md` apparu le 29 septembre ; ne pas le supprimer et
valider ses propositions de sources et de droits avant de les reprendre.

Toujours refaire `git status --short` avant une modification. Ne pas restaurer,
nettoyer ou remplacer les changements existants avec une commande Git
destructive.

## 11. Séquence historique — Identités et Abonnements (Lot 2)

Les Phases A, B et le Lot 3 (adaptation de la lecture et qualification des flux) sont terminés et déployés sur staging. L'ordre recommandé pour la suite est :

1. **Lot 2 — Identités et abonnements (PROD-020..022)** :
   - Webhook Clerk et synchronisation des utilisateurs.
   - Abonnements et statut des droits d'accès (plans Billing).
2. **Lot 4 — Résister aux pannes et maîtriser PostgreSQL (PROD-040..043)** :
   - Gestion des erreurs de pool, quotas et contention.
   - Abonnements et statut des droits d'accès.

Ne pas déplacer la région dans cette fenêtre. La migration US West vers EU
West reste un changement séparé, après sauvegarde et mesure de latence.

## 12. Commandes utiles de reprise

Contrôles en lecture ou locaux sûrs :

```powershell
git status --short
npm run diagnose:local
npm test
npm run test:integration
npx tsc --noEmit --incremental false
npm run lint
npm run db:check:migrations
npm run config:check
npm run build
npm run backup:restore-drill:local
```

Le serveur de développement peut déjà être actif. Vérifier
`http://127.0.0.1:3001/api/health` avant de lancer un second processus. La
commande locale habituelle est `npm run dev`.

Commandes ou actions à ne pas exécuter sans l'étape et l'autorisation adéquates :

- `git commit`, `git push`, création de PR ou déploiement ;
- `npm run db:push` ;
- migration ou restauration sur Railway ;
- changement de région ou de plan Railway ;
- création d'une alerte e-mail ou d'une limite budgétaire ;
- modification DNS OVHcloud ;
- modification des domaines/URLs Clerk ;
- activation de `africatv.sn` ou `www.africatv.sn` en production.

## 13. Clôture des Phases A, B et validation Streaming Staging

### Clôture Phase A — Validée le 23 septembre 2026

- [x] Route `/api/health` publique déployée (HTTP 200, no-store).
- [x] Healthcheck Railway configuré (120 s) et test d'échec bloquant validé.
- [x] Migrations sécurisées `npm run db:migrate:deploy` (300 s) et verrou concurrent vérifiés.
- [x] Sauvegarde logique PostgreSQL chiffrée AES-256-GCM et restauration isolée démontrées.
- [x] Rollback applicatif testé et reproductible en direct (`6a13140b` en SUCCESS).
- [x] Décision budgétaire A8 actée (Option 1 : plan actuel sans surcoût, sauvegardes chiffrées hors volume).
- [x] Checklist fonctionnelle complète validée.

### Clôture Phase B (`staging.africatv.sn`) — Validée le 23 septembre 2026

- [x] `staging.africatv.sn` possède ses enregistrements CNAME/TXT validés chez OVHcloud (TTL 300 s) ;
- [x] Le certificat SSL/TLS Let's Encrypt est actif et `https://staging.africatv.sn/api/health` répond 200 (no-store) ;
- [x] L'instance Clerk autorise l'origine et détecte dynamiquement le domaine staging ;
- [x] `NEXT_PUBLIC_APP_URL` et `BROWSER_TEST_ORIGIN` pointent vers `https://staging.africatv.sn` et sont intégrés au build ;
- [x] La checklist complète est rejouée avec succès sur `https://staging.africatv.sn/app` (connexion, catalogue, favoris, barrière 503 conforme) ;
- [x] Le domaine Railway `africalivetv-production.up.railway.app` reste actif en fallback de diagnostic ;
- [x] L'apex `africatv.sn` et `www` restent réservés pour la production future.

### Clôture de la validation de streaming staging — Validée le 24 septembre 2026

- [x] Variable `PLAYBACK_ELIGIBILITY_READY=true` configurée sur Railway et effective.
- [x] Synchronisation transactionnelle du catalogue vers Railway : 11 778 chaînes, 12 396 sources, 2 utilisateurs et favoris préservés, avec activation exclusive des 6 825 flux sains certifiés (6 396 chaînes actives dans l'application).
- [x] Requalification réelle sur PostgreSQL Railway avec 15 workers et l'origine `https://staging.africatv.sn` (2 946 s / 49,1 min) :
  - 11 819 contrôles réseau effectifs (manifestes HLS, segments vidéo, en-têtes CORS pour staging.africatv.sn, statuts HTTP).
  - 577 décisions de sécurité statiques.
  - 6 825 flux qualifiés sains (`HEALTHY`) avec preuve d'accès frais :
    - 4 385 flux `PUBLIC_DIRECT_WEB` (`BROWSER_OK`, CORS staging validé, 0 mixed content).
    - 2 440 flux `PUBLIC_DIRECT_VLC` (`VLC_ONLY`).
  - 4 994 flux en échec temporaire protégés (`UNTESTED` / `TEMPORARY_FAILURE` / `REVIEW_REQUIRED`) sans bascule artificielle en hors-ligne.
  - 577 flux en revue statique (`UNTESTED` / `NEVER_CHECKED` / `REVIEW_REQUIRED`).
  - 4 339 chaînes disposent d'au moins un flux direct web opérationnel, 2 103 d'un flux externe VLC.
- [x] Inférence des langues principales (`channels.language`) appliquée sur PostgreSQL Railway (filtre de langue opérationnel sur mobile et desktop).
- [x] UX de lecture distante fiabilisée et automatisée (Player.tsx) :
  - Lancement 100 % automatique de VLC dès qu'un flux externe est requis (desktop via protocole direct `vlc://`, Android via `intent://`, iOS via `vlc-x-callback://`, local via `/api/open-vlc`).
  - Suppression intégrale de l'exposition d'URL de flux (M3U8), des boutons de copie et des blocs de consignes techniques.
  - Interface sobre : écran "Ouverture de VLC...", écran "VLC lancé", bouton unique "Relancer VLC", mode effectif "Lecteur VLC".
  - Validation et assainissement strict des URL (protocoles `http:`/`https:`) sans Open Redirect ni DOMXSS (Snyk SAST 0 vulnérabilité).
- [x] Interface publique épurée : retrait du filtre technique de statut dans `FilterSidebar.tsx` ; aucun badge technique brut exposé publiquement.
- [x] Parcours complet de lecture web et VLC validé avec succès sur ordinateur (PC) et téléphone mobile.
- [x] Déploiement Railway Staging `ddc78ef6-f449-4b46-a23f-b725b5ae8271` réussi (commit `3a325ab`), migrations Drizzle appliquées et healthcheck HTTP 200 vérifié.

### Clôture de la Phase Lot 2 — Identités, Abonnements et Paiements NabooPay (25 septembre 2026)

- [x] Pivot stratégique : remplacement de Clerk Billing par **NabooPay** pour supporter les paiements locaux (Orange Money, Wave) et internationaux (Visa/Mastercard).
- [x] PROD-020 : Intégration de l'API NabooPay v2 et gestion idempotente des Webhooks (HMAC SHA256) via la table 
aboopay_transactions.
- [x] PROD-021 : Synchronisation du cycle de vie des identités Clerk (suppression d'utilisateur expresse marquant les abonnements existants comme \xpired\).
- [x] PROD-022 : Création de la page \/pricing\ moderne proposant les forfaits Mensuel (990 FCFA) et Annuel (9 900 FCFA), avec redirection sécurisée vers NabooPay Checkout.
- [x] Code mort et logique propre à Clerk Billing supprimés de la base de données (ajout de la contrainte provider \
aboopay\) et du code source.



### Clôture de la Phase Lot 4 - Résister aux pannes et maîtriser PostgreSQL (25 septembre 2026)

- [x] PROD-040 : Gestion des erreurs du pool (limite de 10 max connections configurée dans src/db/index.ts) et bornage des requêtes.
- [x] PROD-041 : Unification de la journalisation et des erreurs API via withApiErrorHandler dans src/lib/api-errors.ts.
- [x] PROD-042 : Ajout et validation des index composites (channels_active_name_id_idx et streams_availability_idx) limitant le temps de réponse du catalogue à ~10ms via Bitmap Index Scan.
- [x] PROD-043 : Remplacement du mécanisme destructif de dérive par drizzle-kit generate (script db:check non destructif) et validation de l'environnement explicite pour le push des migrations.


### Clôture de la Phase Lot 5 - Vérification périodique et jobs (25 septembre 2026)

- [x] PROD-050 : Ajout du worker de vérification avec concurrence bornée, verrou consultatif et reprise automatisée.
- [x] PROD-051 : Consolidation du nettoyage (télémétrie/abus) dans un script \
un-maintenance.ts\ autonome avec lots de suppression, verrou exclusif et sécurité des connexions.
- [x] PROD-052 & PROD-053 : Simulation d'incidents (simulate-incident.ts) pour valider l'observabilité externe des métriques. Ajout des objectifs de sauvegarde/restauration.
