# Prompt de reprise — Africa Live « Expérience Premium », lot P4 et suivants

À coller tel quel dans une **nouvelle session** Claude Code, dossier `C:\Users\GAMER PC\Africa_Live_TV`. Préparé le
3 octobre 2026, après le commit local du lot P3 (`412574d`). Il remplace
[prompt-reprise-premium-p3.md](prompt-reprise-premium-p3.md) (historique).

---

```text
Tu reprends le projet Africa Live (Next.js 16 App Router, React 19, Tailwind 4, Clerk, PostgreSQL/Drizzle,
STAGING sur Railway, domaine africatv.sn acquis, production non lancée). Mission en cours : l'« Expérience
Premium », refonte visuelle et UX harmonisée sur le logo. Les lots P0, P1 et P2 sont FAITS et PUBLIÉS sur
staging. Le lot P3 « Radar vivant » est FAIT, vérifié et COMMITTÉ EN LOCAL (commit 412574d puis un commit
documentaire), NON POUSSÉ et NON DÉPLOYÉ. Tu continues avec le lot P4 « Landing, tarifs, compte », puis P5,
UN LOT À LA FOIS. Réponds-moi en français.

## 0. À lire AVANT toute modification (dans cet ordre)
1. AGENTS.md — règles du projet. Next.js 16 diffère de tes connaissances : lis le guide concerné dans
   node_modules/next/dist/docs/ avant d'utiliser une API (cache, métadonnées, images, formulaires…).
2. contextellm.md — état courant (section P3 en haut).
3. docs/plan-experience-premium.md — §0 décisions, §4 design system, §5.1 avancement, §5.2 REPÈRES DE CODE ET
   DÉCISIONS EN ATTENTE pour P4 et P5, §6 backlog (tickets P4/P5, colonne « État », bloc « Reliquats »),
   §8.1 pièges connus.
4. docs/production-progress.md — sections « Lot P2 » et « Lot P3 » (preuves, mesures, limites, conventions de
   test) ; docs/non-regression-checklist.md (en haut).
5. public/africa-live-logo.png — l'identité de l'app.
Puis `git status --short` (l'arbre doit être PROPRE) et `git log --oneline -5` (tu dois voir « feat(radar):
Premium P3 … » 412574d suivi d'un commit documentaire). Si l'arbre n'est pas propre, préserve tout, signale-le,
et n'utilise jamais de commande Git destructive pour « nettoyer ».

## 1. Identité (décision du propriétaire, non négociable)
- Logo : carte de l'Afrique tricolore VERT / JAUNE / ROUGE, acacia, éléphant, lion, couronne, anneau OR,
  « Africa_Live » en italique gras, FOND NOIR. Toute l'UI en découle : noir profond + vert #12b54a, jaune
  #fcd116, rouge #e8112d, or #d4a72c. Rôles : jaune = UNE action principale par écran (texte noir) ; vert =
  EN DIRECT/sain ; rouge = alertes/erreurs seulement ; or = bordures marque, focus, sélection ; dégradé
  tricolore = signature seulement. Aucun nouveau hex dans les composants : jetons de globals.css.
- Polices Unbounded (titres, chiffres-clés ≥ 18 px) + Manrope (texte/UI). Plancher typographique 12 px.
  Signature « Le live qui vient à vous », ton panafricain chaleureux, ancré au Sénégal (Teranga), micro-touches
  wolof sobres.
- Public : Sénégal d'abord, Android d'entrée de gamme, data payante, WhatsApp, Wave/Orange Money,
  football/lutte/musique, diaspora. Mobile-first absolu : tester 360 px.

## 2. Ce qui existe déjà — À RÉUTILISER, ne pas recréer
- Design system : src/components/ui (Button/ButtonLink, Badge, Card, Chip, Tabs, SectionHeader, EmptyState,
  ErrorState, Skeleton), jetons dans src/app/globals.css (`@theme`), src/components/brand (BrandBackdrop,
  BrandMark, Wordmark, GoldRing, KenteBand, Silhouettes), page de revue /app/ui (dev seulement).
- Coquille : src/components/shell (AppShell, AppHeader, NavLinks, CountryPicker, ClockBadge, PageTransition,
  EcoToggle), barre basse mobile.
- TV (P2) : src/components/tv (ChannelTile, ChannelRail, TvRows, HelpLine, ActiveFilterChips), Player.tsx,
  InlinePlayerModal.tsx (zapping, chargée à la demande), PlayerControls.tsx.
- Radar (P3) : src/components/radar/* (RadarTiles, FeaturedStories, NewsFeed, ArticleRow, WeatherCard,
  MarketsCard, RadarMapCard, TacticalVectorMap, RadarSourcesPanel…), hooks useStoredToggle (préférence mémorisée),
  useNow, useRadarVisit (clé `al_radar_visit`), useRadarPlayer, scrollToSection. Ne retouche pas le Radar sauf
  régression.
- Libs avec tests : recent-channels, eco-mode, share-links, channel-fallback, zap-list, tv-rows, channel-labels,
  catalog-metadata, relative-time, radar-visit, rss-image, weather-alert, storage-keys (clés `al_*`).
- Éco data : `useEcoMode()` (`al_eco`, `Save-Data`, `html[data-eco="true"]`). Tout nouvel écran le respecte
  (pas d'autoplay, pas de logos, pas d'images distantes, animations coupées).

## 3. Garde-fous ABSOLUS
- Ne jamais relayer, convertir ni stocker de média : navigateur et VLC lisent la source amont directement.
  Aucun contenu d'éditeur (image, texte) dans un fichier public ou versionné.
- Ne pas modifier la logique d'accès, d'éligibilité, de quotas, la machine de lecture (src/lib/playback-*) ni
  les API, sauf ticket explicite + tests. Parcours de paiement NabooPay (appels, redirections, webhooks)
  INCHANGÉ ; identifiants internes `lumina_all_access_*` inchangés (alias d'affichage déjà en place).
  Aucune migration de base sans ticket dédié que je valide. Ne pas toucher .env*, Railway, Clerk (config),
  DNS. Base locale `africa_live_dev`, port 3001.
- Pas de commit, de push ni de déploiement sans ma demande explicite. Aucune nouvelle dépendance sans mon
  accord (en particulier `@clerk/localizations` n'est PAS installé : voir UX-405).
- Ne pas affaiblir un test pour le faire passer. Si un libellé change, mets à jour l'E2E concerné dans le même
  ticket avec une assertion ÉQUIVALENTE (auth-entry, payment, app-shell, radar-*, tv-*…).
- Chiffres affichés issus de la base, jamais en dur ; aucune promesse invérifiable (« garanti », « instantané »,
  « authenticité totale »). Respecter prefers-reduced-motion et le mode Éco. Aucun jargon visible.
- Qualité : supprimer avant d'ajouter, un composant partagé plutôt qu'une copie, fluide sur Android d'entrée de
  gamme. Quand un ticket repose sur une hypothèse du plan, VÉRIFIE-LA par une mesure avant de la suivre
  (leçon de P3 : le fond de carte vectoriel « léger » du plan pesait 10× l'ancien satellite).

## 4. Méthode de travail (identique à P0–P3)
- UN lot à la fois. Au début : annonce le plan du lot en 5 lignes. À la fin : bilan « fait / vérifié /
  limites » et ATTENDS mon feu vert avant le lot suivant.
- Mon premier message : rappelle-moi en une ligne les décisions en attente du plan §5.2 (publier P3 sur
  staging ? source sismique ? dépendance de traduction Clerk ou traduction manuelle ? session Clerk pour
  UX-214 ? test Android réel ?), sans attendre ma réponse, puis avance avec les valeurs par défaut du plan.
  Ne me pose aucune question dont la réponse est dans le plan.
- Corrige les défauts que tu trouves à l'œil sur les captures avant de clôturer ; signale honnêtement les
  limites (ce qui n'a pas pu être vérifié, ce qui est simulé).

## 5. Lot P4 « Landing, tarifs, compte »
Tickets du plan §6 : UX-401 → UX-407 + reliquats UX-212 et UX-214. Ordre conseillé :
- UX-401 d'abord (socle) : hero avec vraie capture du Radar + TV et chiffres RÉELS issus de la base (compteur
  public à créer, mis en cache ; supprimer « 11 700+ », « 1 400+ », « 650+ », « 1 200+ », « 980+ » en dur de
  src/app/page.tsx). Image du hero produite avec des DONNÉES SIMULÉES (pas de contenu d'éditeur), WebP < 60 Ko.
- UX-402 : remplacer les 4 « métriques » par 3 bénéfices clairs, supprimer le doublon d'icône Globe2.
- UX-407 : FAQ resserrée à 5 questions courtes, ton factuel.
- UX-403 : tarifs — carte annuelle mise en avant (« 2 mois offerts » : 9 900 FCFA = 10 × 990), CTA orienté
  bénéfice (« Activer pour 990 FCFA ») au lieu de « Payer avec NabooPay (…) », logos Wave / Orange Money / CB
  locaux. Mets à jour e2e/payment.spec.ts (qui cherche /Payer avec NabooPay/i) avec une assertion équivalente.
- UX-405 : apparence Clerk alignée sur les jetons (police, rayons, éléments) ; widgets encore en anglais →
  par défaut un objet `localization` partiel écrit à la main, SANS nouvelle dépendance.
- UX-406 : états vides/erreurs au ton « hors antenne » sur toutes les pages (EmptyState/ErrorState ; pas de
  error.tsx ni loading.tsx à la racine aujourd'hui).
- UX-404 : Compte — « Mon activité » (pays récents, favoris, dernières chaînes, dernière visite du Radar : tout
  est local ou déjà disponible, aucune migration) et état d'accès en jauge (jours restants).
- UX-212 : « Éco data » découvrable sur mobile (≤ 2 gestes à 360 px, `aria-pressed`, E2E).
- UX-214 : capturer /account et /admin n'est possible qu'avec une session Clerk que JE fournis ; ne l'invente
  pas, rappelle-le moi en fin de lot.
Repères de code précis et pièges par ticket : plan §5.2.

## 6. Vérification obligatoire à la fin de chaque lot
Références actuelles (fin de P3) : `npx tsc --noEmit` 0 erreur ; `npm run lint` 0 ; `npm test` 341 tests (327
réussis, 14 ignorés, 0 échec) — attendu : au moins autant ; `npm run test:invariants` 4/4 ; `npm run build`
réussi ; E2E mode MVP 14 specs, 134 tests (133 réussis + 1 ignoré attendus ; le dernier passage complet avait
132 réussis + 1 échec de test, corrigé ensuite et rejoué) ; E2E mode Clerk (auth-entry, payment) 8/8.
- La landing, /pricing et /sign-in se testent en MODE CLERK (en mode MVP elles redirigent vers /app/live) :
  auth-entry et payment sont les garde-fous de ce lot.
- Contrôle visuel sur http://localhost:3001 (Edge, 360 / 768 / 1366 px) : landing, /pricing, /sign-in, 404,
  /app/live, /app (+ /account et /admin seulement avec ma session Clerk) : 0 débordement horizontal, 0 texte
  < 12 px, 0 erreur de page. Captures docs/screenshots/premium-p4-<page>-<largeur>.png.
- Documentation : section « Lot P4 » datée dans docs/production-progress.md, colonne « État » du plan (§6),
  §5.1 et §5.2, contextellm.md, checklist de non-régression. Ne committe QUE si je te le demande.

## 7. Procédures locales (Windows, Git Bash / PowerShell)
- Deux modes. Clerk (défaut, `npm run dev`, port 3001) : E2E auth-entry et payment, landing, tarifs, sign-in.
  MVP local : `LOCAL_DEV_MODE=true NEXT_PUBLIC_LOCAL_DEV_MODE=true npm run dev` + ligne technique
  `africa-live-local-user` (`clerk_user_id='local-development'`) dans `africa_live_dev` ; E2E MVP :
  `E2E_REUSE_SERVER=true npx playwright test <specs> --workers=1` avec les deux variables. À la fin :
  supprimer la ligne technique et ses événements/sessions de test, arrêter le serveur MVP, relancer
  `npm run dev` en mode Clerk (onglet terminal) et vérifier /api/health (200) et /app en anonyme (307).
  `npm run build` : serveur arrêté.
- Scripts de travail NON versionnés (dossiers .local-logs/premium/ et .local-logs/p3/, ignorés par Git,
  présents sur cette machine, recréables) : local-user.cjs add|remove, cleanup-local-user.cjs,
  edit-helper.cjs (remplacements tolérants au CRLF), shots-p3.cjs "nom=route,…" (routes SANS barre initiale),
  map-measure2.cjs, cpu-idle2.cjs, commit-timeline.cjs et count-commits.cjs (sonde des rendus React).
- Pièges : les heredocs et `node -e` perdent les antislashs et cassent avec accents/`$` → écris un fichier avec
  l'outil d'écriture ; fichiers CRLF → remplacements tolérants ; Git Bash réécrit une route `/app` passée en
  argument ; `python` lancé sans fichier bloque ; pas de `sleep` en avant-plan (attends via une commande en
  arrière-plan). Quotas /api/channels (120/60 par minute) → `--workers=1`, mocks dans les E2E. Hydratation :
  en dev React hydrate ~100 ms APRÈS l'événement `load` → un test attend d'abord un contenu qui n'existe
  qu'après hydratation avant de cliquer. Modale du lecteur : deux titres → cibler `#inline-player-title`.
  Rangées TV paresseuses ; noms accessibles dupliqués → cibler une région, `exact: true`. hls.js : garder
  `enableInterstitialPlayback: false`. L'E2E anchored-player réécrit docs/screenshots/l5-anchored-*.png :
  `git checkout HEAD -- docs/screenshots/l5-anchored-1366.png docs/screenshots/l5-anchored-320.png
  docs/screenshots/l5-anchored-390.png` après coup.
- Performance : ne lie jamais un état qui change souvent (horloge, tic) à la racine d'une grosse page sans
  mémoïser ses lignes ; mesure le CPU au repos après une modification (bridage CPU ×4).

## 8. Ensuite : P5 « Aimants et finition » (pour info, ne le commence pas)
UX-501 → 508 + reliquats UX-209 (suite) et UX-213 : mini-lecteur persistant (une seule source active), recherche
universelle Ctrl K, pays suivis (la synchro au compte = ticket de migration séparé, sauvegarde Railway préalable),
PWA, micro-interactions (retrait de framer-motion là où le CSS suffit, mesure du poids JS), mur TV, briefing,
audit a11y + Lighthouse. Détails et repères : plan §5.2 et §6.

Commence par lire les documents du §0, puis annonce-moi le plan du lot P4 en 5 lignes.
```
