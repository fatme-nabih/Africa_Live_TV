# Africa Live — Rapport d'expérience et plan « Premium »

Date : 2 octobre 2026 (mis à jour le 4 octobre 2026 : P0–P5 faits et publiés sur staging, correctifs Lighthouse publiés ; reste : décisions du propriétaire et lot P6 proposé) · Africa/Dakar · applicatif `865c85d`, Railway staging `3bc79b16`.
Périmètre : lecture du code (`src/app`, `src/components`, `globals.css`),
captures réelles de `docs/screenshots` (staging connecté, TV 1366/390, L5),
audits existants (`audit-produit-professionnel.md`, `audit-agencement-dashboard.md`).
Ce document propose ; le propriétaire décide. Il ne déploie rien. L'avancement est en §5.1, la colonne « État » du §6 fait foi par ticket.

Contraintes intangibles reprises telles quelles : pas de relais/conversion/stockage
média, contrôles d'accès et d'éligibilité côté serveur inchangés, pas de migration
sans ticket dédié, pas de commit/push/déploiement implicite.

---

## 0. Décisions du propriétaire — 2 octobre 2026 (prioritaires sur la suite)

État : diff RW committé et publié (`51c0bc8`, `1aa85b5` sur GitHub `main`),
Railway staging mis à jour par le propriétaire. Domaine `africatv.sn` acquis,
production non lancée. Base locale resynchronisée depuis Railway (14 505 chaînes).

1. **Vision validée** (§3) et plan P0 → P5 retenu. Exécution déléguée à une
   nouvelle session ; prompt : [prompt-sonnet-experience-premium.md](prompt-sonnet-experience-premium.md).
2. **Le logo est l'identité.** Carte de l'Afrique tricolore vert/jaune/rouge,
   acacia, éléphant, lion, couronne, anneau or, mot « Africa_Live » en italique
   gras, **fond noir**. Toute l'interface en découle : noir profond + vert,
   jaune, rouge + or comme liant.
3. **Le grand logo transparent reste** sur les pages : il est signature, pas
   décor parasite. Il est harmonisé (un composant, trois intensités, en couleur
   très atténuée avec vignette) au lieu d'être supprimé — remplace UX-005.
4. **Signature : « Le live qui vient à vous ».** Ton panafricain, chaleureux,
   fier, ancré au Sénégal (Teranga), ouvert à toute l'Afrique et à la diaspora.
5. **Typographie libre, africaine et moderne** : choix arrêté en §4.0.

### 0.1 Contexte marketing Sénégal → décisions UX

| Réalité du terrain | Conséquence produit |
|---|---|
| Usage majoritairement mobile Android, data payante | Mobile d'abord, mode « Éco data » (fond de carte léger, pas d'autoplay, images réduites) |
| WhatsApp est le canal de partage n°1 | Bouton « Partager sur WhatsApp » sur dépêches et chaînes (lien `wa.me` texte + URL publique) |
| Wave et Orange Money dominent | Logos Wave/OM/CB visibles dès la landing et les tarifs, prix en FCFA |
| Football (Lions de la Teranga, CAN), lutte, musique (mbalax, afrobeats) | Rangées TV « Sport », « Musique » mises en avant ; mots-clés de recherche suggérés |
| Diaspora (France, Italie, Espagne, États-Unis) | Heure locale de l'appareil, Dakar en second ; pays suivis |
| Fierté panafricaine, Teranga | Micro-touches wolof sobres : accueil « Dalal ak jàmm », 404 « hors antenne » ; jamais au détriment de la clarté en français |

---

## 1. Synthèse exécutive

Africa Live a des **fondations techniques de niveau professionnel** (contrats Zod,
machine d'état de lecture, quotas, télémétrie, 250+ tests, E2E). Le produit, lui,
**ressemble encore à un outil interne** : il expose sa mécanique (« sujet inféré »,
« MapLibre GL », « Titre publié · source RSS », « Mode effectif : Navigateur »)
au lieu de raconter l'Afrique.

Trois constats dominent :

1. **Pas de système de design.** 421 occurrences de `amber-400`, 122 tailles de
   police arbitraires (`text-[10px]`, `[11px]`), en-têtes recodés dans chaque page
   (7 `<header>` différents), boutons gradients recopiés à la main, police Arial.
   Résultat : chaque page est « presque » cohérente, jamais tout à fait.
2. **Pas de boucle d'habitude.** Rien ne fait revenir : pas d'historique
   « Reprendre », pas de « Ma sélection » sur le dashboard, pas de zapping,
   pas de « Depuis votre dernière visite ». L'utilisateur arrive, cherche,
   repart.
3. **Densité sans hiérarchie.** Le dashboard affiche tout au même niveau
   (4 métriques, bandeau de couverture, onglets, filtres, carte, météo, marchés).
   Il manque *une* chose qui saute aux yeux : « ce qui se passe maintenant ».

La solution proposée tient en une phrase :
**« Un écran qui vit, une TV qui zappe, une identité qui se reconnaît. »**

| Axe | Aujourd'hui | Cible |
|---|---|---|
| Identité | Arial, or partout, filigrane derrière le contenu | Typo affirmée, palette à rôles, tricolore réservé aux moments forts |
| Dashboard | Grille de widgets égaux | « À la une » + carte héroïque + fil vivant |
| TV | Catalogue filtrable | Expérience TV : Reprendre, rangées, zapping, mini-lecteur |
| Confiance | Jargon technique visible | États humains (« En direct », « Ouvre dans VLC ») + détails à la demande |
| Fidélisation | Aucune | Historique, favoris pays, « depuis votre visite », PWA installable |

---

## 2. Diagnostic détaillé

### 2.1 Système visuel (transversal)

| # | Constat | Preuve | Impact |
|---|---|---|---|
| D0 | Logo traité en filigrane gris (`grayscale`) : la tricolore du logo n'irrigue pas l'UI, remplacée par un doré générique | `BrandWatermark.tsx` | Identité diluée |
| D1 | Police système Arial, aucune `next/font` | `globals.css` `--font-geist-sans: Arial` | Rendu générique, manque de caractère |
| D2 | Couleur accent unique sur-utilisée | 421 × `amber-400`, 109 × `amber-300`, mélange `yellow-*`/`amber-*` | Plus rien n'est mis en valeur quand tout est doré |
| D3 | Rouge = marque *et* erreur *et* direct | `rose-500` dans tricolore, 404, badge DIRECT | Ambiguïté sémantique |
| D4 | Micro-typographie illisible | 122 × `text-[9-11px]`, capitales espacées partout | Fatigue, accessibilité, zoom mobile |
| D5 | Filigrane `BrandWatermark` sur 15 pages | Visible derrière les cartes TV (capture l3) | Bruit visuel, effet « template » |
| D6 | Boutons recodés | gradients `from-emerald-500/20 via-amber-400/25…` copiés landing/404/header | Divergences, maintenance |
| D7 | 7 en-têtes distincts | landing, TV, dashboard, compte, tarifs, contact, admin | Navigation qui « saute » entre pages |
| D8 | Glassmorphism `backdrop-blur` empilé | panneaux blur dans panneaux blur | Coût GPU sur mobile d'entrée de gamme, contraste faible |
| D9 | Traces de l'ancienne marque | `lumina_all_access_*`, `public/lumina-tv-*.png`, `ChatGPT Image…png`, clés `iptv_*` | Non professionnel si visible (URLs, devtools) |
| D10 | Deux manifestes PWA divergents | `site.webmanifest` (logo-192) vs `manifest.ts` (africa-live-icon-192) | Icône d'installation incertaine |

### 2.2 Landing (`src/app/page.tsx`, 672 lignes)

- Promesses chiffrées hétérogènes : « 11 700+ chaînes », « 1 400+ actualités »,
  alors que le dashboard affiche 371 chaînes africaines. Risque de crédibilité ;
  le chiffre doit venir de la base (ou disparaître).
- Hero : l'aperçu du dashboard est une icône dans un cercle (capture
  `landing-dashboard-local`) — c'est le moment où il faut **montrer** le produit.
- 4 « métriques » qui n'en sont pas (« Afrique », « Multi-sources », « Par ville »).
- Deux icônes `Globe2` pour deux idées différentes.
- FAQ longue, ton commercial parfois excessif (« dans la seconde », « authenticité totale »).

### 2.3 Dashboard Radar (`LiveRadarDashboard.tsx`, 1 440 lignes)

- Composant monolithique : état, fetch, rendu, météo, marchés et chaînes
  dans un seul fichier. Freine toute évolution du design.
- Hiérarchie plate : sélecteur pays pleine largeur (natif `<select>` de 54 pays),
  puis 4 métriques de *volume* (« 40 résultats chargés ») qui n'aident pas à décider.
- Jargon exposé : « Couverture partielle · 16/19 sources », « sujet inféré »,
  « pays du média », « 2D / Globe 3D · MapLibre GL », « GDELT (0) ».
- Bouton « Briefing — bientôt » désactivé en permanence : promesse non tenue visible.
- Horloge « Heure de Dakar » imposée à un public panafricain/diaspora.
- Libellés de carte en anglais (fond ArcGIS) dans une interface française.
- Pas d'images dans les dépêches : liste de titres très textuelle.

Points forts à conserver : clic pays → chaînes du pays, badge « 19 chaînes »
sur une dépêche, filtres par source, carte 2D/3D, états d'erreur explicites.

### 2.4 TV (`src/app/app/page.tsx`, 764 lignes)

- Cartes sans logo → grands rectangles vides (capture `l3-tv-real-desktop`) :
  l'écran le plus important paraît « cassé ».
- Bandeau VLC + encart « Prêt pour le direct » occupent le premier écran avant
  la première chaîne.
- Pas d'historique, pas de « Reprendre », pas de rangées thématiques ;
  pas de zapping hors prototype L5 local.
- Lecteur : contrôles natifs, pas de raccourcis clavier, pas de Picture-in-Picture,
  pas de chaîne précédente/suivante, pas de mini-lecteur persistant entre pages.
- Catégories brutes (`Business;News`, « Catégorie non renseignée »),
  codes langue non traduits (audit du 30/09 toujours valable).
- 20+ `useState` dans la page : favoris, fenêtres, lecteur ancré, notices…

### 2.5 Compte, tarifs, 404, auth

- Compte : `UserProfile` Clerk brut + carte d'accès ; pas d'activité
  (favoris, temps regardé, pays suivis) — rien de personnel.
- Tarifs : bon contenu, mais bouton « Payer avec NabooPay » met le prestataire
  avant le bénéfice ; pas de comparaison visuelle mensuel/annuel (« 2 mois offerts »).
- 404 « Page hors antenne » : bonne idée de ton, à généraliser (erreurs, vides).
- Clerk : apparence réglée sur `#fbbf24` mais pas sur la typo/arrondis du futur système.

### 2.6 Accessibilité et performance (rapide)

- Bonnes bases : skip-link, `aria-*`, focus visible, `prefers-reduced-motion`.
- À corriger : contrastes `zinc-500` sur fond noir translucide, textes 9–10 px,
  cibles tactiles < 44 px (boutons nav `py-2 text-[11px]`).
- `framer-motion` chargé pour des transitions simples (6 composants).
- Carte : tuiles satellite ArcGIS lourdes par défaut sur mobile/3G.

---

## 3. Vision « Solution ultime »

### 3.1 Principes

1. **Le contenu d'abord, la mécanique à la demande.** Chaque détail technique
   passe derrière un « i » ou un panneau « Sources ».
2. **Une couleur = un rôle.** Or = action principale. Émeraude = en direct / sain.
   Rouge = alerte uniquement. Tricolore = signature (barre haute, chargement, moments clés).
3. **Toujours quelque chose de neuf.** Chaque visite affiche ce qui a changé.
4. **Un geste pour regarder.** De n'importe où, une chaîne se lance en 1 clic
   et continue pendant la navigation.
5. **Simplicité.** On supprime avant d'ajouter : moins de bandeaux, moins de compteurs.

### 3.2 Architecture d'expérience cible

```
┌ Barre unique (toutes pages connectées) ─────────────────────────────────┐
│ Logo · Radar · TV · [Recherche universelle ⌘K] · Pays suivi ▾ · Avatar │
└─────────────────────────────────────────────────────────────────────────┘
 RADAR  /app/live
 ┌ À la une (pays choisi) ──────────┐ ┌ Carte héroïque ──────────────────┐
 │ 3 dépêches majeures + images     │ │ pays cliquables, pulsations      │
 │ « 12 nouvelles depuis 8 h »      │ │ = activité 24 h                  │
 └──────────────────────────────────┘ └──────────────────────────────────┘
 ┌ Fil vivant ───────┐ ┌ En direct du pays ─────┐ ┌ Météo · Marchés ──────┐
 │ filtres en chips  │ │ 4 chaînes, ▶ immédiat  │ │ compacts, repliables  │
 └───────────────────┘ └────────────────────────┘ └───────────────────────┘
 TV  /app
 [Reprendre ▶▶▶]  [Mes favoris]  [Sénégal en direct]  [Info]  [Sport]  …
 Recherche + filtres en tiroir, grille complète en bas.
 MINI-LECTEUR flottant persistant (Radar ↔ TV), zapping ← →, PiP.
```

### 3.3 Les « aimants » qui font rester

| Aimant | Description | Coût |
|---|---|---|
| **Reprendre** | Rangée des 10 dernières chaînes (localStorage puis compte) | Faible |
| **Mini-lecteur persistant** | La lecture continue quand on passe du Radar à la TV | Moyen |
| **Zapping** | ← / → et boutons précédent/suivant dans la liste courante | Faible (base L5) |
| **Depuis votre visite** | Pastille « 12 nouvelles » par pays suivi | Faible (horodatage local) |
| **Pays suivis** | 1–5 pays épinglés : Radar s'ouvre dessus, rangées TV dédiées | Faible → Moyen (compte) |
| **Recherche universelle ⌘K** | Pays, chaînes, dépêches, villes météo dans une palette | Moyen |
| **Mode Mur TV** | 2×2 chaînes muettes, clic = son (desktop) | Moyen, flag |
| **Briefing du matin** | Réactivation L6 : 5 points par pays suivi | Selon L6 |
| **PWA installable** | Icône écran d'accueil, splash, raccourcis Radar/TV | Faible |

---

## 4. Système de design « Africa Live DS »

### 4.0 Typographie retenue

| Rôle | Police | Pourquoi |
|---|---|---|
| Titres, marque, chiffres-clés | **Unbounded** (600–800) | Large, ronde, affirmée : énergie « affiche de concert / sound system » africaine moderne ; superbe en capitales courtes |
| Texte, interface | **Manrope** (400–700) | Très lisible petit, moderne, accents français complets, chiffres tabulaires |
| Accent wordmark | Unbounded *italique simulée* interdite → utiliser le logo image pour le mot « Africa Live » ; en texte, `Africa Live` en Unbounded 700 avec « Live » en jaune |

Chargement `next/font/google` (auto-hébergé au build, `display: 'swap'`,
sous-ensemble `latin` + `latin-ext`), variables `--font-display` / `--font-sans`.
Unbounded uniquement ≥ 18 px (titres, chiffres, badges marque) ; jamais en corps de texte.

### 4.1 Jetons « Africa Live » (dans `globals.css` via `@theme`)

Couleurs tirées du logo (vert, jaune, rouge saturés + anneau or sur noir).

```css
@theme {
  --font-sans: var(--font-manrope), system-ui, sans-serif;
  --font-display: var(--font-unbounded), var(--font-manrope), sans-serif;

  /* Noirs du logo */
  --color-ink: #000000;          /* fond page (OLED) */
  --color-surface-1: #0b0b0c;    /* cartes */
  --color-surface-2: #141416;    /* cartes surélevées, champs */
  --color-surface-3: #1c1c1f;    /* survol */
  --color-line: rgb(255 255 255 / .08);
  --color-line-gold: rgb(212 167 44 / .35);

  /* Texte */
  --color-text: #f5f5f4;
  --color-text-muted: #a8a29e;   /* ≥ 4.5:1 sur surface-1 */
  --color-text-faint: #78716c;   /* légendes ≥ 14 px uniquement */

  /* Tricolore du logo */
  --color-al-green: #12b54a;     /* EN DIRECT, succès, actif */
  --color-al-yellow: #fcd116;    /* action principale (texte noir dessus) */
  --color-al-red: #e8112d;       /* alertes, erreurs, destructif */
  --color-al-gold: #d4a72c;      /* anneau or : bordures marque, focus, sélection */

  --radius-card: 1.25rem; --radius-control: .875rem; --radius-pill: 9999px;
  --text-xs: .75rem;             /* plancher 12 px */
}
```

**Rôles (règle d'or : une couleur = un sens)**
- **Jaune** `al-yellow` : *un seul* bouton principal par écran (texte noir), lien actif.
- **Vert** `al-green` : point « EN DIRECT » pulsant, états sains, onglet actif secondaire.
- **Rouge** `al-red` : erreurs, alertes séisme/météo, suppression. Jamais décoratif seul.
- **Or** `al-gold` : liant premium — bordure de la carte sélectionnée, anneau focus
  (`outline: 2px solid var(--color-al-gold)`), filet sous les titres de section.
- **Tricolore** (dégradé vert→jaune→rouge) : signature uniquement — barre de 2 px
  en haut de la coquille, barre de progression/chargement, soulignement du titre hero,
  bande « kente » (§4.4). Interdit sur les fonds de cartes et le texte courant.

Règles : fonds opaques `surface-1/2` (flou réservé à la barre et aux overlays),
plancher 12 px, capitales espacées réservées aux sur-titres courts.

### 4.4 Motifs de marque

- **`BrandBackdrop`** (remplace `BrandWatermark`) : le grand logo en couleur,
  centré, `opacity` 0.06 (`hero`), 0.035 (`app`), 0.02 (`quiet` : lecteur, admin),
  masque radial (vignette) pour qu'il s'efface sous le contenu, halo tricolore
  très flou derrière. Plus de `grayscale`. Désactivé si `prefers-reduced-transparency`
  et en mode Éco data (`quiet` statique).
- **Anneau or** : arc fin doré (comme le cercle du logo) autour de l'avatar,
  du pays sélectionné sur la carte et de la chaîne en lecture.
- **Bande kente** : séparateur décoratif fin (SVG inline en `mask`, losanges et
  bandes vert/jaune/rouge/or, 6 px) sous l'en-tête hero de la landing et en pied de page.
  Une seule occurrence par écran.
- **Silhouettes** (acacia, éléphant, lion) : réservées aux états vides et à la 404
  (illustration SVG monochrome or à 40 %), jamais en fond de contenu.

### 4.2 Composants partagés (`src/components/ui/`)

`Button` (primary / secondary / ghost / danger, tailles sm/md/lg, 44 px tactile),
`Badge` (live / vlc / info / warn), `Card`, `SectionHeader`, `Tabs`, `Chip`,
`EmptyState`, `ErrorState`, `Skeleton`, `Sheet` (tiroir mobile), `Tooltip`,
`AppShell` (barre unique + slot), `CountryPicker` (recherche + drapeaux),
`ChannelTile` (logo de repli généré : initiales sur dégradé de la couleur du pays).

### 4.3 Voix et vocabulaire

| Avant | Après |
|---|---|
| Sujet inféré / pays du média | *(supprimé ; info dans le panneau Sources)* |
| Couverture partielle · 16/19 sources | « 3 sources momentanément muettes » (lien détails) |
| Mode effectif : Navigateur | *(supprimé)* |
| Chaînes référencées 130 web · 147 VLC | « 371 chaînes · 130 dans le navigateur » |
| Briefing — bientôt | *(masqué jusqu'à L6)* |
| Catégorie non renseignée / Undefined | « Généraliste » |
| Payer avec NabooPay | « Activer pour 990 FCFA » + logos Wave/OM/CB |

---

## 5. Plan de réalisation

Six lots, chacun livrable seul, testé (unitaires + E2E existants + nouveaux),
documenté dans `production-progress.md`. Estimations en jours-dev effectifs.

| Lot | Thème | Durée | Valeur | État (4 octobre 2026) |
|---|---|---|---|---|
| **P0** | Hygiène et socle design | 3 j | Cohérence immédiate | ✅ Fait et vérifié (02/10), publié (03/10) |
| **P1** | Coquille unique et navigation | 3 j | Fluidité inter-pages | ✅ Fait et vérifié (02/10), publié (03/10) |
| **P2** | TV « streaming » | 5 j | Rétention n°1 | ✅ Fait et vérifié (02/10), publié (03/10) ; UX-209 partiel |
| **P3** | Radar « vivant » | 5 j | Identité du produit | ✅ Fait et vérifié (03/10), publié (03/10, `412574d`) |
| **P4** | Landing, tarifs, compte | 3 j | Conversion | ✅ Fait et vérifié (03/10), publié (03/10, `06b662f`) |
| **P5** | Aimants avancés et finition | 5 j | Habitude, différenciation | ✅ Fait et vérifié (03/10), publié (03/10, `090ce01`, correctifs Lighthouse `865c85d`) ; UX-507 bloqué (L6) |
| **P6** | Performance mobile (proposé) | 3 j | Notes mobile ≥ 90, data | ⏳ En attente du feu vert (§5.2 D-1, §6 « Lot P6 ») |

Ordre recommandé : P0 → P1 → P2 → P3 → P4 → P5. P2 avant P3 car le gain
de rétention est le plus rapide et la base L5 (zapping) existe déjà.

### 5.1 État d'avancement (mis à jour le 4 octobre 2026, lot P6 compris)

**Tout est publié sur Railway staging** (`just-compassion`, rôle `staging`, jamais promu en production), à la demande du propriétaire :

| Lot | Commit applicatif | Railway staging | Dossier |
|---|---|---|---|
| P0–P2 | `1ef60b5` | `117f35ed` | [publication-premium-2026-10-03.md](publication-premium-2026-10-03.md) |
| P3–P4 | `412574d`, `06b662f` | `990745ba` | [publication-premium-p3p4-2026-10-03.md](publication-premium-p3p4-2026-10-03.md) |
| P5 | `090ce01` | `75bf069d` | [publication-premium-p5-2026-10-03.md](publication-premium-p5-2026-10-03.md) |
| Correctifs Lighthouse | `865c85d` | `3bc79b16` | même dossier, section finale |
| P6 « Performance mobile » | [`7e27319`](https://github.com/fatme-nabih/Africa_Live_TV/commit/7e27319) | **`e077db96`** (actif) | [dossier de publication P6](publication-premium-p6-2026-10-04.md) |

HEAD documentaire `f260400` (et suivants). **49 tickets faits sur 50** (UX-001 → UX-508 et reliquats UX-209, UX-212, UX-213, UX-214) ;
**UX-507 bloqué** (briefing = lot L6, différé par la décision D1 du propriétaire). Preuves par lot : sections « Lot P0 » à « Lot P5 » de
[production-progress.md](production-progress.md) ; audit d'accessibilité et de performance : [audit-a11y-performance-2026-10-03.md](audit-a11y-performance-2026-10-03.md).

Dernière vérification complète (code `865c85d`) : `tsc` 0, `lint` 0, `npm test` 355 tests (341 réussis, 14 ignorés, 0 échec), invariants 4/4,
`npm run build` réussi, E2E mode MVP 19 specs / 147 tests (146 réussis, 1 ignoré « build servi »), E2E mode Clerk 8/8, **9/9 E2E distants**,
402/402 fichiers applicatifs identiques par SSH.

Lighthouse sur staging (après correctifs) : **accessibilité 100** et **SEO 100** partout ; performance desktop 85–88 (96–98 en build servi
local) ; **performance mobile 57–69** (LCP 5,2–6,5 s) ; **bonnes pratiques 78–79** (cookies tiers de l'instance Clerk de développement).
Radar et TV (serveur de dev, session requise) : accessibilité 100, CLS ≤ 0,024.

### 5.2 Ce qu'il reste à faire (4 octobre 2026)

#### A. Décisions du propriétaire (rien n'avance sans elles)

| # | Décision | Effet | Par défaut si rien n'est décidé |
|---|---|---|---|
| D-1 | ~~Lot P6 « Performance mobile »~~ **fait et publié le 4 octobre 2026** (§6, `e077db96`) | Staging mobile : landing 93, CGU 97, tarifs 75, connexion 73 | — |
| D-2 | ~~Instance Clerk de production~~ **faite le 4 octobre 2026** (`africatv.sn` conservé ; CSP corrigée `32d1a66`, Railway `047d66d7`) ; reste : renommer « Afrika_Live » dans Clerk, compte admin de production | /sign-in 78, /pricing bonnes pratiques 96 | — |
| D-3 | **Briefing L6** (UX-507) : nom, durée, fenêtre, mode de génération (cf. `plan-dashboard-backlog.md`, D1) | Débloque UX-507 branché sur les pays suivis | Briefing masqué |
| D-4 | **Synchronisation des pays suivis au compte** (UX-503b) | Ticket de **migration** : sauvegarde Railway restaurable préalable, `npm run db:migrate:deploy` | Pays suivis sur l'appareil seulement |
| D-5 | **Mur TV en production** : poser `NEXT_PUBLIC_TV_WALL=true` sur Railway | Active `/app/mur` (desktop ≥ 1 280 px) | Inactif en production |
| D-6 | **Logos officiels Wave / Orange Money** (kit marchand NabooPay / opérateurs) | Remplace les pictogrammes locaux de `PaymentMethods` | Pictogrammes locaux |
| D-7 | **Source sismique** pour la tuile d'alerte du Radar | Réintroduire un séisme (USGS retiré en RW-009, E2E l'interdit) | Tuile « Alerte météo » seule |
| D-8 | **Tests sur Android réel** (lecteur, PiP, Éco data, Radar), lecteur d'écran (TalkBack), VLC réel | Réception sur appareil | Mesures simulées seulement |
| D-9 | **Lighthouse du Radar et de la TV en production** : session requise (Lighthouse des DevTools du navigateur du propriétaire, connecté à staging) | Notes officielles des deux écrans principaux | Mesurés sur le serveur de développement |
| D-10 | **Promotion en production** (`africatv.sn`, `www`) | Lancement | Staging seulement (AGENTS.md : jamais implicite) |

#### B. Lot P6 — « Performance mobile » (fait en local le 4 octobre 2026)

Constat mesuré (Lighthouse staging) : l'élément LCP est partout le fond de marque décoratif `BrandBackdrop` ; la landing est rendue à chaque
requête (`auth()` dans `src/app/page.tsx` : **2,1 s de premier octet** mesurés) ; Clerk (`ClerkProvider` dans le layout racine) charge son
JavaScript sur toutes les pages publiques. Deux essais simples sur le fond (`loading="eager"`, `preload`) n'ont **pas** donné de gain mesurable
et ont été retirés. Tickets en §6 « Lot P6 ». Règle : **mesurer avant / après** chaque ticket (Lighthouse staging ×3, médiane), ne garder que
ce qui gagne.

**Fait le 4 octobre 2026** : la mesure a corrigé l'hypothèse — les 2,1 s venaient de la **poignée de main Clerk** (3 redirections, instance
de développement), pas du rendu. Pages publiques statiques hors middleware Clerk (`src/lib/public-static-pages.ts`), landing statique
revalidée, polices `latin` préchargées seules, fond de marque dédié, Clerk limité au groupe `(clerk)`. Suite possible (non faite) :
sortir zod de la coquille commune ; différer Clerk sur `/pricing` (ticket paiement dédié) ; D-2 pour `/sign-in`.

#### C. Repères de code pour la suite (relevés le 4 octobre 2026)

| Sujet | Où | Pièges connus |
|---|---|---|
| Landing | `src/app/page.tsx` : **statique** (`revalidate = 600`), sans `auth()` ni Clerk (P6) ; `getPublicStats()` en cache 1 h ; zones membre via `src/components/marketing/SessionSwitch.tsx` (indice `__client_uat`, `src/lib/session-hint.ts`) | Version visiteur d'abord ; aucun `UserButton` ni lien Administration sur la landing ; `redirect('/app/live')` du mode MVP conservé ; si la base est injoignable au build, page sans chiffres jusqu'à la régénération (≤ 10 min). |
| Fond de marque | `src/components/brand/BrandBackdrop.tsx` (`public/brand/backdrop-480.webp`, 19 Ko, sans optimiseur, `loading="eager"` + `fetchPriority="high"`, opacité 6 %) | Élément LCP de chaque page ; ne pas casser l'identité (décision §0.3 : le grand logo reste). Régénérer depuis `public/africa-live-logo.png` (sharp, 480 px, webp q55). |
| Clerk | `src/app/(clerk)/layout.tsx` (`ClerkProvider`) pour app, compte, admin, tarifs, connexion, inscription, lecteur séparé ; middleware sauté pour `/`, `/pricing`, `/cgu`, `/privacy`, `/contact` (`src/lib/public-static-pages.ts`) | Une nouvelle page qui utilise Clerk va **dans** le groupe `(clerk)` ; une page qui appelle `auth()` ne doit **pas** figurer dans `CLERK_FREE_PUBLIC_PAGES`. `@clerk/shared` 4.20.0 ; `app-entry.test.ts` lit `(clerk)/layout.tsx`. |
| Lecteur unique | `src/components/player/PlayerDock.tsx` (layout `/app`), `Player` props `compact`, `forceMuted` | Même instance de `<Player>` à position stable : ne jamais la sortir de l'arbre (sinon relance du flux). |
| Recherche | `src/components/search/UniversalSearch.tsx`, `src/lib/universal-search.ts` (`OPEN_UNIVERSAL_SEARCH_EVENT`) | Ctrl K = palette ; le bouton « Rechercher » de la barre ouvre la palette dans `/app`, la recherche TV ailleurs. |
| Pays suivis | `src/lib/followed-countries.ts`, clé `al_followed_countries`, hooks `useFollowedCountries` / `writeFollowedCountries` | Synchronisation = migration (D-4). |
| PWA | `public/sw.js` (cache = `offline.html` + 2 images), `public/offline.html`, `src/app/manifest.ts`, `ServiceWorkerRegister` (production seulement) | Ne jamais mettre en cache média, API ou image distante. |
| Mur TV | `src/app/app/mur/`, `src/lib/tv-wall.ts` (`NEXT_PUBLIC_TV_WALL`) | Actif en développement seulement par défaut. |
| Filtres TV | `FilterSidebar` = tiroir unique ; `CatalogSearchField` dans la barre d'outils ; E2E : `e2e/helpers/filters.ts` (`withFilters`, `openFilters`) | Les filtres ne sont plus visibles sans ouvrir le tiroir. |
| Mesures | Lighthouse 12.8.2 hors projet : `.local-logs/tools/lighthouse` ; P6 : `.local-logs/p6/cycle.sh <nom> [pages]` (build, service local, ×3, médiane via `lh-median.cjs`) et `measure-js.cjs` (chemins du groupe `(clerk)`) ; scripts `.local-logs/p5/lh-run.sh` (base, pages, `mobile`/`desktop`, dossier) et `lh-summary.cjs` ; CLS par élément : `.local-logs/p5/cls-sources.cjs` ; poids JS par route : `.local-logs/p5/measure-js.cjs` (lit `.next`) ; build servi local : `DEPLOYMENT_ENV=local`, port 3001, drapeaux locaux à `false` | Dossiers ignorés par Git, recréables. |
| Publication | Scripts `.local-logs/publication-lh/` (`prepare-upload`, `deploy`, `remote-proof-chunked` par lots de 30, `health`, `e2e-remote`) | Un envoi CLI peut être coupé par le réseau : vérifier la liste des déploiements avant de relancer. |

---

## 6. Backlog détaillé

Priorités : **P1** indispensable, **P2** important, **P3** confort.
Taille : S ≤ ½ j, M ≈ 1 j, L ≈ 2–3 j.

### Lot P0 — Hygiène et socle design

| ID | Prio | Taille | Ticket | Critères d'acceptation | État |
|---|---|---|---|---|---|
| UX-001 | P1 | M | Jetons de design dans `globals.css` (`@theme`), palette à rôles | Couleurs/rayons/typo référencés par jetons ; aucun hex nouveau dans les composants | ✅ P0 — 02/10/2026 |
| UX-002 | P1 | S | Polices Unbounded (titres) + Manrope (texte) via `next/font/google` (§4.0) | Plus d'Arial ; pas de CLS mesurable ; auto-hébergées au build | ✅ P0 — 02/10/2026 |
| UX-003 | P1 | L | Bibliothèque `src/components/ui` : Button, Badge, Card, Chip, Tabs, SectionHeader, EmptyState, ErrorState, Skeleton | Stories ou page `/app/ui` dev-only ; utilisés par ≥ 3 pages | ✅ P0 — 02/10/2026 |
| UX-004 | P1 | M | Plancher 12 px : remplacer `text-[9-11px]` | `grep text-\[(9|10|11)px\]` = 0 ; zoom 200 % sans chevauchement | ✅ P0 — 02/10/2026 |
| UX-005 | P1 | M | `BrandBackdrop` (§4.4) remplace `BrandWatermark` sur les 15 pages : logo couleur, 3 intensités, vignette | Logo visible et harmonieux ; texte des cartes ≥ 4.5:1 par-dessus | ✅ P0 — 02/10/2026 |
| UX-009 | P2 | S | Bande kente + anneau or + illustrations silhouettes (états vides, 404) | SVG inline, < 4 Ko chacun | ✅ P0 — 02/10/2026 |
| UX-010 | P1 | S | Signature « Le live qui vient à vous » : métadonnées, landing, manifeste | `layout.tsx`, OG, `manifest.ts` alignés | ✅ P0 — 02/10/2026 |
| UX-006 | P2 | S | Nettoyer `public/` (ChatGPT*, lumina-*) et unifier le manifeste (`manifest.ts` seul) | Une seule source d'icônes ; aucune 404 d'icône | ✅ P0 — 02/10/2026 |
| UX-007 | P3 | S | Renommer clés `iptv_*` → `al_*` avec migration localStorage transparente | Favoris existants conservés (test unitaire) | ✅ P0 — 02/10/2026 |
| UX-008 | P3 | S | Identifiants produit `lumina_*` : alias affiché « Africa Live Mensuel/Annuel » (sans changer l'ID NabooPay ni la base) | Aucun libellé « lumina » visible | ✅ P0 — 02/10/2026 |

### Lot P1 — Coquille unique et navigation

| ID | Prio | Taille | Ticket | Critères d'acceptation | État |
|---|---|---|---|---|---|
| UX-101 | P1 | L | `AppShell` : barre unique (logo, Radar, TV, recherche, pays suivi, compte) pour Radar/TV/Compte/Admin/Tarifs | 1 seul composant d'en-tête ; E2E navigation verts | ✅ P1 — 02/10/2026 |
| UX-102 | P1 | M | Navigation mobile en barre basse (Radar · TV · Recherche · Compte) | Cibles ≥ 44 px ; 320 px sans débordement | ✅ P1 — 02/10/2026 |
| UX-103 | P1 | M | `CountryPicker` : recherche, drapeaux, pays récents, remplace le `<select>` natif | Clavier complet ; pays conservé entre Radar et TV (URL) | ✅ P1 — 02/10/2026 |
| UX-104 | P2 | S | Horloge : heure locale de l'utilisateur, Dakar en info-bulle | Fuseau détecté ; test unitaire de format | ✅ P1 — 02/10/2026 |
| UX-105 | P2 | S | Masquer « Briefing — bientôt » tant que L6 inactif | Aucun bouton désactivé permanent | ✅ P1 — 02/10/2026 |
| UX-106 | P2 | M | Transitions de page légères (View Transitions API, repli sans animation) | Respect `prefers-reduced-motion` | ✅ P1 — 02/10/2026 |

### Lot P2 — TV « streaming »

| ID | Prio | Taille | Ticket | Critères d'acceptation | État |
|---|---|---|---|---|---|
| UX-201 | P1 | M | `ChannelTile` : logo ou repli généré (initiales + dégradé pays), ratio 16:9, état « Navigateur/VLC » en badge discret | Aucune carte vide ; captures 390/1366 | ✅ P2 — 02/10/2026 |
| UX-202 | P1 | M | Rangée **Reprendre** (10 dernières chaînes, localStorage) en tête de `/app` | Apparaît après 1 lecture ; effaçable ; sans migration | ✅ P2 — 02/10/2026 |
| UX-203 | P1 | L | Accueil TV en rangées : Reprendre · Favoris · Pays suivi en direct · Info · Sport · Musique ; grille complète sous « Tout le catalogue » | Rangées défilables clavier/tactile ; requêtes existantes réutilisées | ✅ P2 — 02/10/2026 |
| UX-204 | P1 | M | Bandeau VLC et encart « Prêt pour le direct » fusionnés en une ligne d'aide repliable | Première chaîne visible au-dessus de la ligne de flottaison à 1366×768 | ✅ P2 — 02/10/2026 |
| UX-205 | P1 | L | Lecteur : contrôles maison (lecture, volume, plein écran, PiP, précédent/suivant), raccourcis `Espace`, `M`, `F`, `←/→` | Machine d'état inchangée ; tests playback verts ; aide raccourcis `?` | ✅ P2 — 02/10/2026 |
| UX-206 | P2 | L | Généraliser le zapping L5 aux modales/lecteur séparé, VLC en sortie propre | Réserves de `anchored-player-validation.md` levées | ✅ P2 — 02/10/2026 |
| UX-207 | P2 | M | Normalisation des libellés : catégories composées, « Undefined », codes langue → noms français | Table de correspondance testée ; aucun code brut affiché | ✅ P2 — 02/10/2026 |
| UX-208 | P2 | M | Tri par défaut « Afrique d'abord » puis pertinence | Les 30 premières chaînes de « Tout » majoritairement africaines | ✅ P2 — 02/10/2026 |
| UX-210 | P1 | S | Partage WhatsApp (dépêche, chaîne) via `https://wa.me/?text=` (titre + URL publique, aucune donnée perso) | Ouvre WhatsApp mobile/web ; pas d'URL de flux média partagée | ✅ P2 — 02/10/2026 |
| UX-211 | P2 | M | Mode « Éco data » (préférence locale) : pas d'autoplay, fond de carte léger, images de dépêches désactivées, `BrandBackdrop` quiet | Toggle dans Compte et barre ; respecté partout | ✅ P2 — 02/10/2026 |
| UX-209 | P3 | M | Filtres en tiroir unique (mobile et desktop) avec chips actives retirables | Nombre de filtres visible ; « Tout effacer » | 🟡 P2 partiel — 02/10/2026 (pastilles, compteur, « Tout effacer » ; barre latérale desktop conservée) |

### Lot P3 — Radar « vivant »

| ID | Prio | Taille | Ticket | Critères d'acceptation | État |
|---|---|---|---|---|---|
| UX-301 | P1 | L | Découper `LiveRadarDashboard.tsx` : `useRadarData`, `NewsFeed`, `CountryChannels`, `WeatherCard`, `MarketsCard`, `RadarHeader` | Fichier racine < 300 lignes ; E2E radar inchangés et verts | ✅ P3 — 03/10/2026 (racine 250 lignes ; 44 E2E radar verts, specs inchangés à l'extraction) |
| UX-302 | P1 | M | Bloc **À la une** : 3 dépêches les plus récentes/multi-sources du pays, avec image `og:image` si fournie par le flux RSS | Pas de stockage d'image ; repli typographique | ✅ P3 — 03/10/2026 (74 % des dépêches réelles illustrées ; APS : aucune image dans son flux) |
| UX-303 | P1 | M | Remplacer les 4 métriques de volume par : « Nouvelles depuis votre visite », « Chaînes en direct du pays », « Alerte météo/séisme » | Chaque tuile cliquable vers son contenu | ✅ P3 — 03/10/2026 (météo seule : pas de séisme, voir §5.1 question 4) |
| UX-304 | P1 | M | Langage humain : supprimer jargon visible, panneau « Sources et fraîcheur » regroupant RSS/GDELT/couverture | Revue des libellés ; aucun nom de librairie dans l'UI | ✅ P3 — 03/10/2026 |
| UX-305 | P2 | M | Carte : fond sombre vectoriel par défaut (léger), satellite en option ; libellés FR si le style le permet ; pulsation des pays selon activité 24 h | Temps de rendu carte mobile réduit (mesure avant/après) | ✅ P3 — 03/10/2026 (écart : contours auto-hébergés au lieu du vectoriel OpenFreeMap, 10× plus lourd ; 25 Ko, 1 requête) |
| UX-306 | P2 | M | Dépêche → « Regarder le direct du pays » ouvre le mini-lecteur sans quitter le Radar | Parcours E2E clic dépêche → lecture | ✅ P3 — 03/10/2026 |
| UX-307 | P2 | S | Météo et marchés compacts et repliables, état mémorisé | Préférence locale | ✅ P3 — 03/10/2026 |
| UX-308 | P3 | M | Rafraîchissement doux : nouvelles dépêches annoncées par une pastille « 3 nouvelles ↑ » au lieu de repousser la liste | Pas de saut de défilement | ✅ P3 — 03/10/2026 |

### Lot P4 — Landing, tarifs, compte

| ID | Prio | Taille | Ticket | Critères d'acceptation | État |
|---|---|---|---|---|---|
| UX-401 | P1 | M | Hero avec vraie capture (ou animation statique) du Radar + TV, chiffres réels issus de la base au build/ISR | Aucun chiffre en dur ; capture à jour | ✅ P4 — 03/10/2026 (cache 1 h ; hero WebP 41 Ko, données fictives) |
| UX-402 | P1 | S | Remplacer les « métriques » par 3 bénéfices clairs ; supprimer les doublons d'icônes | Relecture copy | ✅ P4 — 03/10/2026 |
| UX-403 | P1 | M | Tarifs : carte annuelle mise en avant (« 2 mois offerts »), CTA orienté bénéfice, logos moyens de paiement, FAQ courte | Parcours NabooPay inchangé ; E2E paiement simulé vert | ✅ P4 — 03/10/2026 (logos : pictogrammes locaux, voir §5.1 q. 5) |
| UX-404 | P2 | M | Compte : « Mon activité » (pays suivis, favoris, dernières chaînes), état d'accès en jauge (jours restants) | Données déjà disponibles ; pas de migration | ✅ P4 — 03/10/2026 (capture connectée : UX-214) |
| UX-405 | P2 | S | Clerk `appearance` aligné sur jetons (police, rayons, couleurs) | Captures sign-in/sign-up cohérentes | ✅ P4 — 03/10/2026 (traduction manuelle partielle) |
| UX-406 | P2 | S | États vides/erreurs avec le ton « hors antenne » sur toutes les pages | Composants `EmptyState`/`ErrorState` partout | ✅ P4 — 03/10/2026 (`OffAirScreen`, `error.tsx`, `loading.tsx`) |
| UX-407 | P3 | S | FAQ resserrée (6 → 5 questions courtes, ton factuel) | Aucune promesse non vérifiable | ✅ P4 — 03/10/2026 |

### Lot P5 — Aimants avancés et finition

| ID | Prio | Taille | Ticket | Critères d'acceptation | État |
|---|---|---|---|---|---|
| UX-501 | P1 | L | **Mini-lecteur persistant** dans `AppShell` (layout `/app`), survit Radar ↔ TV | Une seule source active ; arrêt propre ; quotas respectés | ✅ P5 — 03/10/2026 (`PlayerDock`) |
| UX-502 | P1 | L | **Recherche universelle ⌘K** : pays, chaînes, dépêches, villes | Réutilise API existantes ; < 300 ms perçu ; clavier complet | ✅ P5 — 03/10/2026 (pays/villes instantanés, chaînes après 250 ms) |
| UX-503 | P2 | M | **Pays suivis** (1–5) en local, puis synchronisés au compte (ticket migration séparé) | Radar et TV s'ouvrent sur le pays principal | ✅ P5 — 03/10/2026 (local ; synchronisation = migration à part) |
| UX-504 | P2 | M | PWA : manifeste unique, raccourcis Radar/TV, écran hors-ligne « hors antenne » | Lighthouse PWA installable | ✅ P5 — 03/10/2026 (installable vérifié par le protocole du navigateur ; Lighthouse non installé) |
| UX-505 | P2 | M | Micro-interactions sobres : favori (pop), live dot, squelettes animés ; retrait de `framer-motion` là où CSS suffit | Bundle JS TV réduit (mesure) | ✅ P5 — 03/10/2026 (522 → 322 Ko gzip, `framer-motion` retiré) |
| UX-506 | P3 | L | **Mur TV 2×2** (desktop, flag) | Un seul flux sonore ; respect des quotas de lecture | ✅ P5 — 03/10/2026 (drapeau `NEXT_PUBLIC_TV_WALL`, non posé en production) |
| UX-507 | P3 | — | Briefing du matin = lot L6 existant, branché sur Pays suivis | Selon `plan-dashboard-backlog.md` | ⛔ Bloqué — L6 différé (décision D1 du propriétaire) |
| UX-508 | P2 | M | Audit a11y final (axe + clavier + lecteur d'écran) et Lighthouse ≥ 90 perf/a11y sur Radar et TV | Rapport daté dans `docs/` | ✅ P5 — 03/10/2026 ([rapport](audit-a11y-performance-2026-10-03.md) ; axe 0 violation ; Lighthouse non lancé) |

### Lot P6 — Performance mobile (feu vert le 4 octobre 2026 ; commit `7e27319`, publié sur staging `e077db96` le 4 octobre 2026)

Objectif : Lighthouse mobile ≥ 90 sur la landing, `/pricing` et `/sign-in` (staging), sans perte d'accessibilité (100) ni de fonctionnalité.
Chaque ticket : mesure avant / après (Lighthouse staging ×3, médiane, et `measure-js.cjs`), sinon abandon documenté.

| ID | Prio | Taille | Ticket | Critères d'acceptation | État |
|---|---|---|---|---|---|
| UX-601 | P1 | M | Landing **statique** (revalidée) : retirer `auth()` du rendu serveur, état connecté lu côté client (`<Show>` Clerk), chiffres publics revalidés | Premier octet < 300 ms sur staging ; `auth-entry` vert ; mode MVP inchangé | ✅ P6 — 04/10/2026 (cause réelle : poignée de main Clerk ; landing ○ revalidée 10 min, pages publiques hors middleware Clerk ; premier octet local 16 ms ; staging non mesuré) |
| UX-602 | P1 | S | Fond de marque allégé (variante plus petite et moins lourde, ou rendu CSS) sans changer l'identité | LCP mobile réduit (mesure) ; rendu identique à l'œil | ✅ P6 — 04/10/2026 (`public/brand/backdrop-480.webp` 19 Ko, immédiat ; LCP landing 4,65 → 4,08 s) |
| UX-603 | P2 | M | Clerk chargé seulement où il sert sur les pages publiques (landing sans widget Clerk) | JS de la landing réduit (mesure) ; connexion / inscription / compte inchangés ; `app-entry.test.ts` adapté de façon équivalente | ✅ P6 — 04/10/2026 (groupe `(clerk)` ; landing 194 → 143 Ko gzip, perf. 90, bonnes pratiques 100) |
| UX-604 | P2 | S | Polices : vérifier préchargement et sous-ensembles d'Unbounded / Manrope (Next `next/font`) | Aucun FOIT ; CLS 0 conservé | ✅ P6 — 04/10/2026 (préchargement `latin` seul : −130 Ko ; latin-ext toujours déclaré) |
| UX-605 | P3 | S | Radar : nom accessible des tuiles qui commence par le texte visible (règle `label-content-name-mismatch`), sans perdre « pas une alerte officielle » | 6 E2E `radar-live` équivalents verts | ✅ P6 — 04/10/2026 (nom = texte visible + compléments `sr-only` ; 5 assertions adaptées) |
| UX-606 | P3 | S | Infobulle de la carte « 8 dépêche(s) » → accord singulier / pluriel ; titre H1 de `/admin` trop grand à 360 px | Captures 360 / 1366 | ✅ P6 — 04/10/2026 (`countLabel` ; H1 /admin 24 px sous 640 px ; capture /admin : session admin requise, non faite ; en plus : lien « Mur TV » masqué sous 1 280 px, image du hero regénérée) |

Résultat (build servi local, Lighthouse mobile, médiane de 3) : landing **76 → 90**, `/cgu` 93, `/pricing` 72 → **78**, `/sign-in`
73 → **79** ; accessibilité 100 partout. Objectif ≥ 90 atteint pour la landing seulement : `/pricing` et `/sign-in` ont besoin de Clerk
(342 Ko de scripts) et `/sign-in` garde la poignée de main de l'instance de développement (D-2). Détail : [audit, section P6](audit-a11y-performance-2026-10-03.md).

Hors lot (décisions D-2 à D-10 du §5.2) : instance Clerk de production, UX-507 (L6), UX-503b (migration), mur TV en production, logos
officiels, source sismique, Android réel, Lighthouse connecté, promotion en production.

### Reliquats identifiés pendant P0–P2

Rien n'y est bloquant ; chaque reliquat est rattaché au lot où il coûte le moins.

| ID | Lot | Prio | Taille | Ticket | Critères d'acceptation | État |
|---|---|---|---|---|---|---|
| UX-209 (suite) | P5 | P3 | M | Filtres en tiroir unique desktop + mobile : retirer la barre latérale desktop au profit du tiroir mobile existant (pastilles, compteur et « Tout effacer » sont faits en P2) | Un seul panneau de filtres ; E2E `tv-workspace`, `catalogue`, `tv-streaming` équivalents et verts ; première chaîne toujours visible à 1366×768 | ✅ P5 — 03/10/2026 |
| UX-212 | P4 | P2 | S | « Éco data » découvrable sur mobile : la bascule est cachée dans la barre sous 640 px et n'existe que dans Compte | Accès en ≤ 2 gestes depuis la TV à 360 px ; état annoncé (`aria-pressed`) ; E2E | ✅ P4 — 03/10/2026 (1 geste dès 360 px ; Compte sous 360 px) |
| UX-213 | P5 | P2 | S | Contrôle du lecteur ancré (« Activer le lecteur ancré » + case « VLC et mes autres lecteurs sont arrêtés ») : habiller avec `Button`/`Chip` du design system, libellés humains, sans changer le comportement L5 | Aucune régression `anchored-player.spec` ; captures 360/1366 | ✅ P5 — 03/10/2026 |
| UX-214 | P4 | P2 | S | Capturer `/account` et `/admin` avec une session Clerk (non faisable en anonyme) | Captures `premium-p4-account-*` et `premium-p4-admin-*` ; **nécessite le propriétaire** | ✅ P4 — 03/10/2026 (sessions du propriétaire, données personnelles masquées) |

---

## 7. Mesure du succès

À suivre via la télémétrie existante (`playback-telemetry`) et des événements
UI légers, sans données personnelles supplémentaires :

| Indicateur | Pourquoi |
|---|---|
| Temps jusqu'à la première lecture (depuis l'arrivée) | Efficacité du parcours TV |
| % de sessions avec ≥ 2 chaînes regardées (zapping) | Engagement TV |
| % de retours J+1 / J+7 | Effet des aimants |
| Clics dépêche → direct pays | Valeur unique Radar + TV |
| Conversion essai → abonnement | Effet landing/tarifs |
| Lighthouse perf/a11y Radar et TV | Qualité perçue |

---

## 8. Risques et garde-fous

- **Régression lecture** : UX-205/206/501 touchent le lecteur → aucun changement
  de `playback-machine`/résolution sans tests dédiés ; E2E lecture obligatoires.
- **Persistance** : Reprendre et Pays suivis commencent en local ; toute
  synchronisation compte = ticket migration séparé, sauvegarde Railway préalable.
- **Images de dépêches** : uniquement l'URL fournie par l'éditeur, chargée par
  le navigateur ; aucune mise en cache serveur (cohérent avec la politique média).
- **Promesses commerciales** : chiffres uniquement issus de la base ; pas de
  « garanti », « instantané » sans preuve.
- **Arbre de travail** : P0 → P5 et les correctifs Lighthouse sont committés et publiés (dernier applicatif `865c85d`) ; l'arbre doit être propre au début d'un lot. Inspecter
  `git status --short` avant d'éditer et ne jamais utiliser de commande Git destructive pour « nettoyer ». Un commit local n'est fait
  que sur demande explicite ; push et déploiement Railway idem.
- **Libellés et E2E** : `e2e/dashboard-reception`, `radar-*`, `tv-workspace`,
  `local-mvp` vérifient des textes visibles ; tout changement de libellé met à
  jour le test dans le même ticket, sans affaiblir l'assertion.

### 8.1 Pièges connus (appris pendant P0–P2)

- **hls.js 1.6.16** : le contrôleur d'interstitiels rappelle `startLoad()` après le manifeste
  et contourne `autoStartLoad: false`. `Player.tsx` passe `enableInterstitialPlayback: false` ;
  ne pas le retirer sans rejouer le test « Éco data » (aucun segment avant « Lire maintenant »).
- **Quotas de `/api/channels`** : 120 requêtes d'entrée et 60 de page par minute. Les rangées de
  la TV chargent à la demande et gardent 5 min en session (`al_tv_rows`) ; en E2E MVP,
  `--workers=1` et éviter les rafales de requêtes réelles (429 sinon).
- **Rangées de la TV** : les rangées sont paresseuses ; une rangée sous la ligne de flottaison n'a
  pas de chaînes tant qu'elle n'est pas proche de l'écran (le test doit viser une rangée visible).
- **Doublons accessibles** : les rangées dupliquent des tuiles du catalogue ; cibler `#catalogue`
  ou une rangée par son nom (`getByRole('region', { name })`) dans les E2E, et utiliser
  `exact: true` (« Lancer VLC » ≠ « Relancer VLC »).
- **Windows / Git Bash** : une route `/app` passée en argument est réécrite en chemin de disque
  (passer `app`, sans barre initiale) ; `$` et accents dans `node -e` ou les heredocs
  cassent (écrire un fichier `.cjs`) ; les fichiers CRLF exigent des remplacements tolérants ;
  `docs/screenshots/l5-anchored-*.png` sont réécrits par l'E2E `anchored-player` (restaurer depuis
  `HEAD` après coup) ; un E2E peut échouer sur un verrou de fichier Windows transitoire (relancer).
- **Deux modes locaux** : Clerk (défaut, `npm run dev`) et MVP (`LOCAL_DEV_MODE=true
  NEXT_PUBLIC_LOCAL_DEV_MODE=true`, ligne technique `africa-live-local-user` à insérer dans
  `africa_live_dev` puis à retirer). Les E2E MVP exigent `E2E_REUSE_SERVER=true` et le serveur MVP
  sur 3001 ; les E2E Clerk (`auth-entry`, `payment`) le serveur Clerk. Redémarrer le serveur
  Clerk à la fin de chaque lot.

- **Hydratation (P3)** : en développement, React hydrate ≈ 100 ms **après** l'événement `load`. Un test qui agit juste après
  `page.goto` peut agir sur du HTML non hydraté (changement de liste ignoré). Attendre d'abord un contenu qui n'existe qu'après
  hydratation (dépêches affichées). Même piège pour les scripts de mesure ou de capture.
- **Modale du lecteur** : elle contient deux titres (celui de la fenêtre, `#inline-player-title`, et celui du lecteur) ; cibler
  `#inline-player-title` pour éviter l'erreur de sélecteur strict.
- **Rendu du Radar** : près de 170 dépêches sur 24 h. Ne jamais les rendre toutes d'un coup (fil paginé par 12) ni lier un état qui
  change souvent (horloge, tic) à la racine sans mémoïser les lignes. Mesurer le CPU au repos après toute modification
  (`PerformanceObserver` + `Performance.getMetrics`, CPU ×4).
- **Fond de carte** : ne pas réintroduire un fond en tuiles par défaut sans mesurer (OpenFreeMap : ≈ 1,27 Mo à l'échelle du
  continent). Les contours viennent de `public/maps/africa-countries.json` (régénérable par `scripts/build-africa-countries.mjs`).
- **Lecteur unique (P5)** : `PlayerDock` garde une seule instance de `<Player>` à position stable ; ne pas l'envelopper conditionnellement
  (remontage = flux relancé). En mini-lecteur, `compact` coupe les raccourcis globaux. Les vidéos de test sont des clips de 4 s (`ended`).
- **Ctrl K et filtres (P5)** : Ctrl K ouvre la palette universelle, plus le champ du catalogue ; les filtres TV sont dans un tiroir à
  ouvrir (`e2e/helpers/filters.ts`). Les rangées de l'accueil TV chargent aussi `/api/channels` : viser précisément la requête testée.
- **Mesures (P5)** : Playwright `page.evaluate` d'une fonction transpilée par `tsx` peut échouer (`__name is not defined`) : passer du
  JavaScript brut (`addScriptTag`). Un build de production refuse le mode MVP ; un build servi en local exige `DEPLOYMENT_ENV=local` sur
  le port 3001 avec les drapeaux locaux à `false`. CLS : réserver la hauteur (unité `lh`) des textes qui changent à l'arrivée des
  données ; exclure de l'ancrage de défilement (`overflow-anchor: none`) les lignes qui se réorganisent.
- **Windows (P4–P5)** : `EUNKNOWN` à l'écriture d'un fichier surveillé par le serveur dev : réessayer après 500 ms ; `npm ci` échoue
  (EPERM) si le serveur dev tourne ; preuve SHA par SSH Railway : lots de 30 fichiers (commande tronquée au-delà).
- **Shell** : les remplacements multilignes avec `\\` ou `\s` dans un heredoc perdent leurs échappements ; utiliser l'outil d'écriture
  ou d'édition. `python` lancé sans fichier bloque (processus à tuer).
- **Performance (P6)** : sur staging, toute page passée par le middleware Clerk subit à la première visite une **poignée de main** de
  l'instance de développement (3 redirections, 1 à 2 s) ; c'est elle, et non le rendu, qui faisait le « premier octet » de 2,1 s. Lire la
  cascade réseau du rapport Lighthouse (`network-requests`, `redirects`) avant toute hypothèse. `subsets` de `next/font/google` ne règle
  que le **préchargement**. Les routes Clerk vivent dans `src/app/(clerk)/` : après un déplacement de route, supprimer
  `.next/dev/types` et `.next/types` (anciens chemins, échec du typage au build). Un `redirect()` de page passe par le flux (le
  `loading.tsx` racine) : réponse 200 + redirection côté client, comme avant P6.

## 9. Prochaine étape

1. Le propriétaire tranche les décisions du §5.2 A (en particulier **D-1 : feu vert pour le lot P6 « Performance mobile »**).
2. Nouvelle session : coller [prompt-reprise-premium-p6.md](prompt-reprise-premium-p6.md) (lecture des documents, rappel des décisions en
   une ligne, annonce du plan de lot en 5 lignes, un lot à la fois, bilan fait / vérifié / limites, attente du feu vert).
3. ~~P6 commence par UX-601~~ P6 fait, committé (`7e27319`) et publié sur staging (`e077db96`) le 4 octobre 2026 ; Lighthouse staging mesuré
   ([dossier de publication P6](publication-premium-p6-2026-10-04.md)). Suite : décisions D-2 → D-10.
