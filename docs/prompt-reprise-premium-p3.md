# Prompt de reprise — Africa Live « Expérience Premium », lot P3 et suivants

> **Historique** : ce prompt a servi à la session P3 (terminée, committée en local). Le prompt à utiliser maintenant est
> [prompt-reprise-premium-p4.md](prompt-reprise-premium-p4.md).

À coller tel quel dans une **nouvelle session** Claude Code, dossier
`C:\Users\GAMER PC\Africa_Live_TV`. Préparé le 3 octobre 2026, après le bilan du
lot P2. Le prompt initial (P0 → P5) reste dans
[prompt-sonnet-experience-premium.md](prompt-sonnet-experience-premium.md) ;
celui-ci le remplace pour la suite.

---

```text
Tu reprends le projet Africa Live (Next.js 16 App Router, React 19, Tailwind 4, Clerk,
PostgreSQL/Drizzle, STAGING sur Railway, domaine africatv.sn acquis, production non
lancée). Mission en cours : l'« Expérience Premium », refonte visuelle et UX harmonisée
sur le logo. Les lots P0, P1 et P2 sont FAITS et vérifiés en local (non committés). Tu
continues avec le lot P3 « Radar vivant », puis P4, puis P5, UN LOT À LA FOIS. Réponds-moi
en français.

## 0. À lire AVANT toute modification (dans cet ordre)
1. AGENTS.md — règles du projet. Next.js 16 diffère de tes connaissances : lis le guide
   concerné dans node_modules/next/dist/docs/ avant d'utiliser une API.
2. contextellm.md — état courant (section « Expérience Premium », en haut).
3. docs/plan-experience-premium.md — plan de référence : §0 décisions, §3 vision, §4 design
   system, §5.1 AVANCEMENT ET RESTE À FAIRE, §6 backlog (colonne « État », bloc « Reliquats »),
   §8.1 PIÈGES CONNUS.
4. docs/production-progress.md — sections « Lot P0 », « Lot P1 », « Lot P2 » (preuves, limites,
   conventions de test) ; docs/non-regression-checklist.md (en haut).
5. public/africa-live-logo.png — l'identité de l'app.
Puis `git status --short` et `git log --oneline -5`. L'arbre est VOLONTAIREMENT SALE
(≈ 190 fichiers P0–P2 non committés) : préserve tout, n'utilise jamais de commande Git
destructive pour « nettoyer », ne committe rien sans ma demande explicite.

## 1. Identité (décision du propriétaire, non négociable)
- Logo : carte de l'Afrique tricolore VERT / JAUNE / ROUGE, acacia, éléphant, lion, couronne,
  anneau OR, « Africa_Live » en italique gras, FOND NOIR. Toute l'UI en découle :
  noir profond + vert #12b54a, jaune #fcd116, rouge #e8112d, or #d4a72c.
  Rôles : jaune = UNE action principale par écran (texte noir) ; vert = EN DIRECT/sain ;
  rouge = alertes/erreurs seulement ; or = bordures marque, focus, sélection ; dégradé
  tricolore = signature seulement.
- Polices Unbounded (titres, chiffres-clés ≥ 18 px) + Manrope (texte/UI), déjà en place.
  Plancher typographique 12 px. Signature « Le live qui vient à vous », ton panafricain
  chaleureux, ancré au Sénégal (Teranga), micro-touches wolof sobres.
- Public : Sénégal d'abord, Android d'entrée de gamme, data payante, WhatsApp, Wave/Orange
  Money, football/lutte/musique, diaspora. Mobile-first absolu : tester 360 px.

## 2. Ce qui existe déjà — À RÉUTILISER, ne pas recréer
- Design system : src/components/ui (Button, Badge, Card, Chip, Tabs, SectionHeader,
  EmptyState, ErrorState, Skeleton), jetons dans src/app/globals.css (`@theme`),
  src/components/brand (BrandBackdrop 3 intensités, BrandMark, Wordmark, GoldRing, KenteBand,
  Silhouettes), page de revue /app/ui (dev seulement).
- Coquille : src/components/shell (AppShell, AppHeader, NavLinks, CountryPicker — pays dans
  l'URL, ClockBadge, PageTransition, EcoToggle), barre basse mobile.
- TV : src/components/tv (ChannelTile, ChannelRail, TvRows, HelpLine, ActiveFilterChips),
  src/components/player/PlayerControls.tsx, Player.tsx (props `zapping`, `manualExternal`,
  `onPlaybackStarted`), InlinePlayerModal.tsx (zapping), SeparatePlayerPage.tsx.
- Libs (avec tests) : recent-channels, eco-mode, share-links (WhatsApp wa.me), channel-fallback,
  zap-list, tv-rows, channel-labels, catalog-metadata, storage-keys (clés al_*).
- Éco data : `useEcoMode()` (localStorage `al_eco`, `Save-Data`, `html[data-eco="true"]`) ; en
  mode Éco : pas d'autoplay, pas de logos, pas d'images de dépêches, carte sombre légère. Tout
  nouvel écran doit respecter ce mode.
- Radar : src/app/app/live/LiveRadarDashboard.tsx (≈ 1 383 lignes, à découper en UX-301),
  src/components/radar/* (TacticalVectorMap, LiveMarketTicker, RadarSourcesPanel,
  useLiveWeather…), ShareArticleLink déjà branché sur les dépêches.

## 3. Garde-fous ABSOLUS
- Ne jamais relayer, convertir ni stocker de média : navigateur et VLC lisent la source amont
  directement. Aucun cache serveur d'images de dépêches : l'URL de l'éditeur est chargée par
  le navigateur.
- Ne pas modifier la logique d'accès, d'éligibilité, de quotas, la machine de lecture
  (src/lib/playback-*) ni les API, sauf ticket explicite + tests. Aucune migration de base sans
  ticket dédié que je valide. Ne pas toucher .env*, Railway, Clerk, DNS. Pas de commit, push ni
  déploiement sans ma demande explicite. Base locale `africa_live_dev`, port 3001.
- Ne pas affaiblir un test pour le faire passer. Si un libellé change, mets à jour l'E2E
  concerné dans le même ticket avec une assertion ÉQUIVALENTE (specs radar-workspace,
  radar-weather, radar-reliability, dashboard-reception, tv-workspace, local-mvp…).
- Chiffres affichés issus de la base, jamais en dur. Respecter prefers-reduced-motion et le
  mode Éco. Aucune nouvelle dépendance ni librairie d'animation. Aucun jargon visible
  (MapLibre, GDELT, RSS, « sujet inféré », « mode effectif »).
- Exigence de qualité : supprimer avant d'ajouter, un composant partagé plutôt qu'une copie,
  fluide sur Android d'entrée de gamme, beau et cohérent sur toutes les pages.

## 4. Méthode de travail (identique à P0–P2)
- UN lot à la fois. Au début : annonce le plan du lot en 5 lignes. À la fin : bilan
  « fait / vérifié / limites » et ATTENDS mon feu vert avant le lot suivant.
- Les 3 questions ouvertes du plan §5.1 (commit de P0–P2, session Clerk, test Android réel) ne
  bloquent pas P3 : rappelle-les-moi en une ligne dans ton premier message, sans attendre, puis
  avance. Ne me pose aucune question dont la réponse est dans le plan.
- Corrige les défauts que tu trouves à l'œil sur les captures avant de clôturer ; signale les
  limites honnêtement (ce qui n'a pas pu être vérifié, ce qui est simulé).

## 5. Lot P3 « Radar vivant » (premier lot de cette session)
Tickets du plan §6 : UX-301 (découper LiveRadarDashboard.tsx en useRadarData, NewsFeed,
CountryChannels, WeatherCard, MarketsCard, RadarHeader ; fichier racine < 300 lignes ; E2E
radar INCHANGÉS et verts — fais-le EN PREMIER, sans ajout fonctionnel), UX-302 (« À la une » :
3 dépêches du pays, image og:image de l'éditeur si présente dans le flux, jamais stockée ;
repli typographique ; mode Éco sans image), UX-303 (remplacer les 4 métriques de volume par
« Nouvelles depuis votre visite », « Chaînes en direct du pays », « Alerte météo/séisme »,
chacune cliquable), UX-304 (langage humain, panneau « Sources et fraîcheur »), UX-305 (carte :
fond sombre vectoriel léger par défaut, satellite en option, libellés FR si possible,
pulsation selon l'activité 24 h ; MESURE avant/après du rendu mobile), UX-306 (dépêche →
« Regarder le direct du pays » : mini-lecteur sans quitter le Radar, réutilise la modale et le
zapping de P2), UX-307 (météo et marchés compacts, repliables, état mémorisé en local),
UX-308 (pastille « n nouvelles ↑ » au lieu de repousser la liste, sans saut de défilement).
Les couleurs éditoriales du Radar, conservées jusqu'ici, sont harmonisées avec les jetons
dans ce lot. Ensuite : P4 (UX-401 → 407 + UX-212, UX-214), P5 (UX-501 → 508 + UX-209 suite,
UX-213) — voir le plan.

## 6. Vérification obligatoire à la fin de chaque lot
Commandes : `npx tsc --noEmit` ; `npm run lint` ; `npm test` (attendu : au moins 321 tests,
14 ignorés, 0 échec) ; `npm run test:invariants` (4/4) ; E2E ; `npm run build`.
Contrôle visuel sur http://localhost:3001 (Edge, 360 / 768 / 1366 px) : landing, /app/live,
/app, /pricing, 404 (+ /account et /admin seulement avec une session Clerk que JE fournis) :
0 débordement horizontal, 0 texte < 12 px, 0 erreur de page. Captures dans
docs/screenshots/premium-<lot>-<page>-<largeur>.png. Consigne le résultat daté dans
docs/production-progress.md (section « Lot P3 »), coche les tickets dans la colonne « État » du
plan, mets à jour contextellm.md, la checklist de non-régression et le §5.1 du plan.

## 7. Procédures locales (Windows, Git Bash / PowerShell)
- Deux modes. Clerk (défaut, `npm run dev`, port 3001) : E2E `auth-entry` et `payment`.
  MVP local : démarrer avec `LOCAL_DEV_MODE=true NEXT_PUBLIC_LOCAL_DEV_MODE=true npm run dev` et
  insérer dans `africa_live_dev` la ligne technique `africa-live-local-user`
  (`clerk_user_id = 'local-development'`) ; les pages /, /account, /pricing, /sign-in redirigent
  alors vers /app/live. Les E2E MVP : `E2E_REUSE_SERVER=true npx playwright test <specs>
  --workers=1` avec les deux variables ci-dessus. À la fin : supprimer la ligne technique et ses
  événements/sessions de test, arrêter le serveur MVP, relancer `npm run dev` en mode Clerk (onglet
  terminal) et vérifier /api/health (200) et /app en anonyme (307). `npm run build` : serveur arrêté.
- Scripts de travail non versionnés dans .local-logs/premium/ (ignoré par Git), recréables :
  local-user.cjs add|remove, cleanup-local-user.cjs, shots.cjs <lot> "nom=route,…" (routes SANS
  barre initiale, Git Bash réécrit `/app`), edit-helper.cjs (remplacements CRLF-tolérants).
- Pièges : heredocs et `node -e` cassent avec accents/`$`/apostrophes → écris un fichier .cjs ou
  utilise l'outil d'écriture ; fichiers CRLF → remplacements tolérants ; quotas /api/channels
  (120 entrée / 60 page par minute) → `--workers=1`, mocks dans les E2E ; rangées TV paresseuses ;
  noms accessibles dupliqués → cibler une région ou `#catalogue`, `exact: true` ;
  hls.js : garder `enableInterstitialPlayback: false` dans Player.tsx ; l'E2E anchored-player
  réécrit docs/screenshots/l5-anchored-*.png (les restaurer depuis HEAD) et peut échouer sur un
  verrou de fichier Windows transitoire (relancer).

Commence par lire les documents du §0, puis annonce-moi le plan du lot P3 en 5 lignes.
```
