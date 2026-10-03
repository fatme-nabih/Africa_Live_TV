# Prompt de passation — Africa Live « Expérience Premium »

À coller tel quel dans une nouvelle session Claude Code (Sonnet 5.5),
dossier `C:\Users\GAMER PC\Africa_Live_TV`. Préparé le 2 octobre 2026.

> **Prompt initial, désormais exécuté pour P0, P1 et P2.** Pour continuer (P3 → P5),
> utiliser [prompt-reprise-premium-p3.md](prompt-reprise-premium-p3.md). Avancement :
> [plan-experience-premium.md](plan-experience-premium.md) §5.1.

---

```text
Tu reprends le projet Africa Live (Next.js 16 App Router, React 19, Tailwind 4,
Clerk, PostgreSQL/Drizzle, déployé en STAGING sur Railway, domaine africatv.sn
acquis mais production non lancée). Ta mission : construire l'« Expérience
Premium » — refonte visuelle et UX complète, harmonisée sur l'identité du logo.

## 0. À lire AVANT toute modification (dans cet ordre)
1. AGENTS.md — règles du projet (Next.js 16 différent de tes connaissances :
   lis le guide concerné dans node_modules/next/dist/docs/ avant d'utiliser
   une API, ex. 01-app/01-getting-started/13-fonts.md pour next/font).
2. contextellm.md — état courant.
3. docs/plan-experience-premium.md — LE plan de référence : §0 décisions du
   propriétaire, §2 diagnostic, §3 vision, §4 design system (couleurs, polices,
   motifs), §6 backlog UX-001 → UX-508 avec critères d'acceptation.
4. Regarde public/africa-live-logo.png : c'est l'identité de l'app.
Puis `git status --short` et `git log --oneline -5`.

## 1. Identité (décision du propriétaire, non négociable)
- Logo : carte de l'Afrique tricolore VERT / JAUNE / ROUGE, acacia, éléphant,
  lion, couronne, anneau OR, « Africa_Live » en italique gras, FOND NOIR.
- Toute l'UI découle du logo : noir profond + vert #12b54a, jaune #fcd116,
  rouge #e8112d, or #d4a72c (liant premium). Voir rôles stricts §4.1 :
  jaune = UNE action principale par écran (texte noir) ; vert = EN DIRECT/sain ;
  rouge = alertes/erreurs uniquement ; or = bordures marque, focus, sélection ;
  dégradé tricolore = signature seulement (barre 2 px haut, chargement,
  soulignement hero, bande kente).
- Le grand logo transparent RESTE sur les pages : crée `BrandBackdrop`
  (remplace BrandWatermark, plus de grayscale), logo en couleur très atténué,
  variantes hero 0.06 / app 0.035 / quiet 0.02, vignette radiale, halo
  tricolore flou. Contraste du texte par-dessus ≥ 4.5:1.
- Polices : Unbounded (titres, chiffres-clés, ≥ 18 px) + Manrope (texte/UI),
  via next/font/google, display swap, variables --font-display / --font-sans.
  Plus aucune police Arial. Plancher typographique 12 px.
- Signature : « Le live qui vient à vous ». Ton panafricain, chaleureux, fier,
  ancré au Sénégal (Teranga) ; touches wolof sobres (« Dalal ak jàmm » à
  l'accueil) sans nuire à la clarté du français.
- Public : Sénégal d'abord, mobile Android, data payante, WhatsApp, Wave/Orange
  Money, football/lutte/musique, diaspora. Mobile-first absolu (tester 360 px).

## 2. Ordre d'exécution
Lots du §5/§6 dans cet ordre, un lot à la fois, chacun terminé et vérifié
avant le suivant :
- P0 Hygiène & socle design : UX-001, 002, 003, 004, 005, 010, 009, 006, 007, 008
- P1 Coquille unique & navigation : UX-101 → 106
- P2 TV « streaming » : UX-201 → 211 (dont 210 WhatsApp, 211 Éco data)
- P3 Radar vivant : UX-301 (découpage d'abord) → 308
- P4 Landing, tarifs, compte : UX-401 → 407
- P5 Aimants : UX-501 → 508
Commence par P0. Au début de chaque lot, annonce le plan du lot en 5 lignes ;
à la fin, donne un bilan (fait / vérifié / limites) et attends mon feu vert
pour le lot suivant.

## 3. Détails clés de P0 (premier lot)
- UX-001 : jetons dans src/app/globals.css (`@theme`) exactement selon §4.1 ;
  remplace progressivement amber-*/yellow-*/emerald-*/rose-* codés en dur par
  les jetons (bg-al-yellow, text-al-green, border-line-gold…). Conserve les
  classes utilitaires existantes (.btn-*, .glass-*) en les réécrivant sur les
  jetons pour ne rien casser, puis migre les pages.
- UX-002 : next/font dans src/app/layout.tsx.
- UX-003 : src/components/ui/ : Button (primary jaune / secondary / ghost /
  danger ; sm/md/lg ; cible ≥ 44 px), Badge (live vert pulsant / vlc / info /
  warn), Card, Chip, Tabs, SectionHeader, EmptyState, ErrorState, Skeleton.
  Accessibles (focus or, aria). Pas de nouvelle dépendance.
- UX-004 : zéro `text-[9px|10px|11px]` (grep de contrôle).
- UX-005 / UX-009 : BrandBackdrop, bande kente SVG inline, anneau or,
  silhouettes (acacia/éléphant/lion) pour états vides et 404.
- UX-006 : supprimer de public/ les fichiers ChatGPT* et lumina-* SEULEMENT
  après grep prouvant qu'ils ne sont référencés nulle part ; un seul manifeste
  (src/app/manifest.ts), retirer site.webmanifest et sa référence.
- UX-007 : clés localStorage iptv_* → al_* avec migration transparente testée.
- UX-008 : aucun libellé « lumina » visible ; NE PAS changer les identifiants
  produit NabooPay ni la base.

## 4. Garde-fous ABSOLUS
- Ne jamais relayer, convertir ou stocker de média : navigateur/VLC lisent
  la source amont directement. Pas de cache serveur d'images de dépêches.
- Ne pas modifier la logique d'accès, d'éligibilité, de quotas, la machine
  de lecture (src/lib/playback-*), ni les API, sauf ticket explicite + tests.
- Aucune migration de base sans ticket dédié validé par moi.
- Ne pas toucher .env*, Railway, Clerk, DNS. Pas de commit, push ni
  déploiement sans ma demande explicite. Base locale africa_live_dev, port 3001.
- Ne pas affaiblir un test pour le faire passer. Si un libellé change, mets à
  jour l'E2E concerné (dashboard-reception, radar-*, tv-workspace, local-mvp)
  dans le même ticket avec une assertion équivalente.
- Chiffres affichés (nb de chaînes, pays) : issus de la base, jamais en dur.
- Respecter prefers-reduced-motion ; pas de nouvelle lib d'animation.

## 5. Vérification obligatoire à la fin de chaque lot
npx tsc --noEmit ; npm run lint ; npm test ; npm run test:invariants ;
npx playwright test (ou au minimum les specs touchées) ; npm run build.
Puis contrôle visuel dans le navigateur intégré sur http://localhost:3001 :
landing, /app/live, /app, /account, /pricing, 404, à 360 px, 768 px et 1366 px.
Enregistre les captures dans docs/screenshots/premium-<lot>-<page>-<largeur>.png.
Consigne le résultat daté dans docs/production-progress.md et coche les
tickets dans docs/plan-experience-premium.md (colonne État à ajouter).

## 6. Exigence de qualité
Simplicité et efficacité : supprimer avant d'ajouter, un composant partagé
plutôt qu'une copie, aucun jargon technique visible (MapLibre, GDELT, « sujet
inféré », « mode effectif »). Le résultat doit être beau, cohérent sur toutes
les pages, fluide sur un Android d'entrée de gamme, et donner envie de rester.
Réponds-moi en français.
```
