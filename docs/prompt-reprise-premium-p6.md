# Prompt de reprise — Africa Live « Expérience Premium », après P5 (lot P6 et décisions)

À coller tel quel dans une **nouvelle session** Claude Code, dossier `C:\Users\GAMER PC\Africa_Live_TV`. Préparé le
4 octobre 2026, après la publication sur staging de P5 et des correctifs Lighthouse (`865c85d`, Railway `3bc79b16`). Il remplace
[prompt-reprise-premium-p4.md](prompt-reprise-premium-p4.md) (historique).

---

```text
Tu reprends le projet Africa Live (Next.js 16 App Router, React 19, Tailwind 4, Clerk, PostgreSQL/Drizzle, STAGING sur
Railway, domaine africatv.sn acquis, production NON lancée). L'« Expérience Premium » (refonte visuelle et UX harmonisée sur le
logo) est FAITE de P0 à P5 et PUBLIÉE sur staging : dernier commit applicatif 865c85d (correctifs Lighthouse), déploiement Railway
actif 3bc79b16. 49 tickets sur 50 ; UX-507 (briefing) est BLOQUÉ par une décision du propriétaire (lot L6). La suite proposée est
le lot P6 « Performance mobile » (UX-601 → UX-606), en attente de mon feu vert, plus des décisions D-1 → D-10. Réponds-moi en français.

## 0. À lire AVANT toute modification (dans cet ordre)
1. AGENTS.md — règles du projet. Next.js 16 diffère de tes connaissances : lis le guide concerné dans
   node_modules/next/dist/docs/ avant d'utiliser une API (cache, rendu statique, images, polices, métadonnées…).
2. contextellm.md — section « Point de reprise — 4 octobre 2026 » en tête.
3. docs/plan-experience-premium.md — §0 décisions, §4 design system, §5.1 état publié, §5.2 « Ce qu'il reste à faire »
   (A : décisions D-1 → D-10 ; B : lot P6 ; C : REPÈRES DE CODE), §6 « Lot P6 » (tickets, colonne État), §8.1 pièges connus.
4. docs/audit-a11y-performance-2026-10-03.md — notes Lighthouse avant / après, élément LCP, causes de la performance mobile.
5. docs/production-progress.md — « Reste à faire » en tête, sections « Lot P5 » et « Publication Premium P5 et audit Lighthouse » ;
   docs/non-regression-checklist.md (en haut).
6. public/africa-live-logo.png — l'identité de l'app.
Puis `git status --short` et `git log --oneline -6` (tu dois voir 865c85d « fix(premium): Lighthouse audit fixes » et des commits
documentaires après). Si l'arbre n'est pas propre, préserve tout, signale-le et n'utilise jamais de commande Git destructive.

## 1. Identité (décision du propriétaire, non négociable)
- Logo : carte de l'Afrique tricolore VERT / JAUNE / ROUGE, acacia, éléphant, lion, couronne, anneau OR, « Africa_Live »,
  FOND NOIR. Jetons de globals.css uniquement (aucun nouveau hex dans les composants) : noir + vert #12b54a (EN DIRECT/sain),
  jaune #fcd116 (UNE action principale par écran, texte noir), rouge #e8112d (alertes/erreurs), or #d4a72c (bordures, focus).
- Polices Unbounded (titres ≥ 18 px) + Manrope. Plancher 12 px. Signature « Le live qui vient à vous », ton panafricain chaleureux
  ancré au Sénégal (Teranga). Le grand logo transparent (BrandBackdrop) RESTE sur les pages (décision §0.3) : on peut l'alléger, pas le supprimer.
- Public : Sénégal d'abord, Android d'entrée de gamme, data payante, Wave/Orange Money, diaspora. Mobile-first : tester 360 px.

## 2. Ce qui existe — À RÉUTILISER, ne pas recréer
Design system src/components/ui ; marque src/components/brand (BrandBackdrop, OffAirScreen…) ; coquille src/components/shell
(AppShell, AppHeader, EcoToggle, FollowCountryButton, ServiceWorkerRegister) ; lecteur unique src/components/player/PlayerDock.tsx
(une seule instance de <Player> à position stable : ne jamais la remonter) ; recherche universelle Ctrl K
src/components/search/UniversalSearch.tsx ; landing src/app/page.tsx (auth() + getPublicStats() en cache 1 h) ; Clerk
src/lib/clerk-theme.ts (+ @clerk/localizations 4.9.0, @clerk/shared doit rester en 4.20.0) ; PWA public/sw.js (cache = offline.html
+ 2 images, JAMAIS de média) ; mur TV /app/mur derrière NEXT_PUBLIC_TV_WALL ; tiroir de filtres unique + e2e/helpers/filters.ts.
Détail et pièges : plan §5.2 C et §8.1.

## 3. Garde-fous ABSOLUS
- Jamais de relais, conversion ni stockage de média : navigateur et VLC lisent la source amont. Aucun contenu d'éditeur dans un
  fichier public ou versionné. Aucune donnée personnelle dans les captures versionnées (masquer e-mails/noms avant capture).
- Ne pas modifier accès, éligibilité, quotas, machine de lecture (src/lib/playback-*), API, parcours NabooPay
  (identifiants lumina_all_access_* inchangés) sans ticket explicite + tests. Aucune migration sans ticket dédié validé ET sauvegarde
  Railway restaurable préalable (npm run db:migrate:deploy, jamais db:push).
- Ne jamais toucher .env*, Railway (variables, plan), Clerk (configuration), DNS ; ne jamais promouvoir staging en production.
  Pas de commit, push ni déploiement sans ma demande explicite. Aucune nouvelle dépendance du projet sans mon accord
  (les outils de mesure s'installent HORS projet, dans .local-logs/tools/, comme Lighthouse 12.8.2).
- Ne pas affaiblir un test : si un libellé ou un comportement change, mettre à jour l'E2E avec une assertion ÉQUIVALENTE dans le même ticket.
- Chiffres affichés issus de la base ; aucune promesse invérifiable ; prefers-reduced-motion et mode Éco data respectés.
- MESURER avant de suivre une hypothèse et ne garder une optimisation que si la mesure montre un gain (en P5, `loading="eager"` puis
  `preload` du fond de marque n'ont rien gagné et ont été retirés).

## 4. Méthode de travail (identique à P0–P5)
- Mon premier message : rappelle-moi en UNE ligne les décisions en attente du plan §5.2 A (D-1 → D-10), sans attendre ma réponse ;
  ne me pose aucune question dont la réponse est dans le plan. Puis annonce le plan du lot P6 en 5 lignes et ATTENDS mon feu vert
  explicite (« vert pour P6 ») avant de modifier du code — sauf si mon message de reprise contient déjà ce feu vert.
- UN lot à la fois. Fin de lot : bilan « fait / vérifié / limites » (honnête sur ce qui est simulé ou non vérifié) et attente.
- Corrige les défauts vus à l'œil sur les captures avant de clôturer.

## 5. Lot P6 « Performance mobile » (plan §6, objectif Lighthouse mobile ≥ 90 sur landing, /pricing, /sign-in)
Constat mesuré : l'élément LCP est partout BrandBackdrop ; la landing est rendue à chaque requête (auth() : 2,1 s de premier octet
sur staging) ; Clerk charge son JS sur toutes les pages publiques. Ordre conseillé, mesure Lighthouse staging ×3 (médiane) avant/après :
- UX-601 landing STATIQUE et revalidée (état connecté lu côté client avec <Show> Clerk ; mode MVP et e2e/auth-entry inchangés).
- UX-602 fond de marque allégé (identité intacte). UX-603 Clerk seulement où il sert sur les pages publiques
  (src/lib/app-entry.test.ts lit l'arbre du layout par position : adapter de façon équivalente). UX-604 polices.
- UX-605 noms accessibles des tuiles du Radar commençant par le texte visible (6 E2E radar-live équivalents).
- UX-606 « dépêche(s) » de l'infobulle de la carte, titre H1 de /admin à 360 px.
Note : sans déploiement (que je dois demander), la mesure finale se fait sur un build servi en local (DEPLOYMENT_ENV=local, port 3001,
drapeaux locaux à false) ; précise-le dans le bilan.

## 6. Vérification obligatoire en fin de lot
Références (code 865c85d) : `npx tsc --noEmit` 0 ; `npm run lint` 0 ; `npm test` 355 tests (341 réussis, 14 ignorés, 0 échec) — au
moins autant ; `npm run test:invariants` 4/4 ; `npm run build` réussi (serveur arrêté) ; E2E mode MVP 19 specs, 147 tests (146 réussis
+ 1 ignoré) ; E2E mode Clerk (auth-entry, payment) 8/8. Lighthouse : accessibilité 100 à conserver. Captures
docs/screenshots/premium-p6-<page>-<largeur>.png (360 / 768 / 1366) : 0 débordement, 0 texte < 12 px, 0 erreur.
Documentation : section « Lot P6 » datée dans docs/production-progress.md, colonne « État » du plan §6 + §5.1/§5.2, contextellm.md,
checklist. Ne committe QUE si je te le demande.

## 7. Procédures locales (Windows, Git Bash / PowerShell)
- Deux modes. Clerk (défaut, `npm run dev`, port 3001, onglet terminal) : landing, /pricing, /sign-in, E2E auth-entry et payment.
  MVP : `$env:LOCAL_DEV_MODE='true'; $env:NEXT_PUBLIC_LOCAL_DEV_MODE='true'; npm run dev` + ligne technique
  (`node .local-logs/premium/local-user.cjs add`), E2E `LOCAL_DEV_MODE=true NEXT_PUBLIC_LOCAL_DEV_MODE=true E2E_REUSE_SERVER=true
  npx playwright test <specs> --workers=1`. À la fin : `node .local-logs/premium/cleanup-local-user.cjs` puis `local-user.cjs remove`
  (users = 2), relancer le mode Clerk, vérifier /api/health 200 et /app anonyme 307. Restaurer après E2E :
  `git checkout HEAD -- docs/screenshots/l5-anchored-1366.png docs/screenshots/l5-anchored-320.png docs/screenshots/l5-anchored-390.png`.
- Outils de travail NON versionnés (recréables) : .local-logs/p5/lh-run.sh (bash lh-run.sh <base> "nom=chemin,…" mobile|desktop
  <dossier absolu>) et lh-summary.cjs ; cls-sources.cjs (CLS par élément) ; measure-js.cjs (poids JS par route, lit .next) ;
  shots-p5.cjs (captures, routes SANS barre initiale) ; axe-audit.cjs ; .local-logs/publication-lh/ (paquet, déploiement, preuve SHA par
  lots de 30, santé, E2E distants) — à n'utiliser que sur ma demande de publication.
- Pièges : heredocs et `node -e` cassent antislashs, accents grave et `$` → écrire un fichier avec l'outil d'écriture ; fichiers CRLF →
  remplacements tolérants ; écriture EUNKNOWN sur un fichier surveillé → réessayer ; Git Bash réécrit une route `/app` en argument ;
  `npm ci` échoue si le serveur dev tourne ; pas de `sleep` en avant-plan ; quotas /api/channels (120/60 par minute) → --workers=1 et
  ne pas répéter les specs sur la base réelle ; hydratation ≈ 100 ms après `load` en dev ; Playwright evaluate d'une fonction tsx →
  `__name is not defined` (passer du JS brut) ; un build de production refuse le mode MVP.
- Performance : ne lie jamais un état qui change souvent à la racine d'une grosse page ; mesure le CPU au repos après modification.

## 8. Hors P6 (pour info, ne pas commencer sans décision)
D-2 instance Clerk de production + renommer « Afrika_Live » ; D-3 briefing L6 (UX-507) ; D-4 migration des pays suivis (UX-503b) ;
D-5 mur TV en production ; D-6 logos officiels Wave/OM ; D-7 source sismique ; D-8 Android réel ; D-9 Lighthouse connecté du
Radar/TV ; D-10 promotion en production. Détails : plan §5.2 A.

Commence par lire les documents du §0, puis fais ton premier message comme décrit au §4.
```
