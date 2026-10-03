# Africa Live — Rapport d'expérience et plan « Premium »

Date : 2 octobre 2026 (mis à jour le 3 octobre 2026 : P0–P2 publiés, P3 committé en local, P4 fait non committé) · Africa/Dakar · HEAD `1ff0e53` (P3 `412574d` + documentation, non poussés).
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

| Lot | Thème | Durée | Valeur | État (3 octobre 2026) |
|---|---|---|---|---|
| **P0** | Hygiène et socle design | 3 j | Cohérence immédiate | ✅ Fait et vérifié (02/10), publié (03/10) |
| **P1** | Coquille unique et navigation | 3 j | Fluidité inter-pages | ✅ Fait et vérifié (02/10), publié (03/10) |
| **P2** | TV « streaming » | 5 j | Rétention n°1 | ✅ Fait et vérifié (02/10), publié (03/10) ; UX-209 partiel |
| **P3** | Radar « vivant » | 5 j | Identité du produit | ✅ Fait et vérifié (03/10), publié (03/10, `412574d`) |
| **P4** | Landing, tarifs, compte | 3 j | Conversion | ✅ Fait et vérifié (03/10), publié (03/10, `06b662f`) |
| **P5** | Aimants avancés et finition | 5 j | Habitude, différenciation | ✅ Fait et vérifié (03/10), publié (03/10, `090ce01`) ; UX-507 bloqué (L6) ; corrections Lighthouse locales non publiées |

Ordre recommandé : P0 → P1 → P2 → P3 → P4 → P5. P2 avant P3 car le gain
de rétention est le plus rapide et la base L5 (zapping) existe déjà.

### 5.1 État d'avancement et reste à faire (mis à jour le 3 octobre 2026)

**Publié (P3–P4, 3 octobre)** : P3 (`412574d`) et P4 (`06b662f`) sont poussés et publiés sur Railway staging (`990745ba`, 9/9 E2E distants) — [dossier](publication-premium-p3p4-2026-10-03.md).

**Publié** : P0, P1 et P2 sont committés et publiés sur GitHub `main` (applicatif `1ef60b5`, documentation `01279c0`) et sur
Railway staging, à la demande du propriétaire ([dossier de publication](publication-premium-2026-10-03.md)).

**Fait, vérifié, committé en local (`412574d`), non poussé, non publié** : P3 « Radar vivant » (UX-301 → 308, 8 tickets), le 3 octobre 2026. Au total 34 tickets
faits et 1 partiel (UX-209) sur 50 à la fin de P3. Preuves, mesures de la carte, défauts corrigés et limites : section « Expérience Premium — Lot
P3 » de [production-progress.md](production-progress.md) ; captures `docs/screenshots/premium-p3-*`. Dernière vérification complète
(fin de P3) : `tsc` 0 erreur, `lint` 0, `npm test` 341 tests (327 réussis, 14 ignorés, 0 échec), invariants 4/4, `build` réussi,
E2E mode MVP 132 réussis + 1 ignoré sur 134 (un échec de test corrigé, voir production-progress.md), E2E mode Clerk 8/8.

**Fait et vérifié, non committé** : P4 « Landing, tarifs, compte » (UX-401 → 407 + UX-212), le 3 octobre 2026 : 42 tickets faits et
1 partiel (UX-209) sur 50, plus le reliquat UX-214 fait. Preuves, mesures (chiffres réels : 11 771 chaînes, 371 africaines, 36 pays)
et limites : section « Lot P4 » de [production-progress.md](production-progress.md) ; captures `docs/screenshots/premium-p4-*`. Dernière
vérification complète (fin de P4) : `tsc` 0, `lint` 0, `npm test` 348 (334 réussis, 14 ignorés, 0 échec), invariants 4/4, build réussi,
E2E MVP 135 tests (132 réussis + 1 ignoré, 2 échecs corrigés puis specs rejoués 67/67), E2E Clerk 8/8.

**Fait et vérifié, non committé** : P5 « Aimants et finition » le 3 octobre 2026 (UX-501 → 506, UX-508, UX-209 suite, UX-213) ; **UX-507 bloqué**
(briefing = L6 différé, arbitrage D1 du propriétaire). Preuves : section « Lot P5 » de [production-progress.md](production-progress.md) et
[audit daté](audit-a11y-performance-2026-10-03.md). Vérification : tsc 0, lint 0, 355 tests (341/14/0), invariants 4/4, build, E2E MVP
145 + 1 ignoré (1 échec corrigé, specs rejoués), E2E Clerk 8/8 ; poids JS TV −38 %.

**Reste à faire** : UX-507 (après décision L6) ; synchronisation des pays suivis au compte (ticket de migration) ; Lighthouse (outil à autoriser).
Historique — tickets P5 + 2 reliquats : UX-209 suite, UX-213, un lot à la fois. Le tableau P4 ci-dessous est conservé pour l'historique :

| Lot | Tickets | Points d'attention |
|---|---|---|
| **P4 Landing, tarifs, compte** (7) | UX-401 → 407 + reliquats UX-212, UX-214 | Chiffres de la landing issus de la base, jamais en dur. Parcours NabooPay inchangé (E2E paiement simulé verts). UX-404 « Mon activité » peut réutiliser `recent-channels`, favoris, pays récents, et le repère `al_radar_visit` du Radar. UX-405 : widgets Clerk encore en anglais. |
| **P5 Aimants et finition** (8) | UX-501 → 508 + reliquats UX-209 (suite), UX-213 | UX-501 mini-lecteur persistant : touche au lecteur, donc E2E lecture obligatoires, une seule source active (le Radar utilise déjà `InlinePlayerModal` ; le mini-lecteur persistant le remplacera ou le prolongera). UX-502 : la barre de recherche (Ctrl K) existe déjà pour le catalogue TV. UX-503 : la synchronisation au compte est un **ticket de migration séparé**, sauvegarde Railway préalable. UX-505 : mesurer le poids JS de la TV et du Radar avant/après ; l'image `BrandBackdrop` est signalée comme LCP en développement (`loading="eager"`). UX-508 : audit a11y + Lighthouse, rapport daté dans `docs/`. |

**Reliquats identifiés pendant P0–P2** (à traiter dans le lot indiqué ; détail en §6) :
UX-209 (tiroir unique des filtres, suite), UX-212 (Éco data visible sur mobile), UX-213 (contrôle du lecteur ancré à harmoniser),
UX-214 (capturer `/account` et `/admin` avec une session Clerk — action du propriétaire).

**Questions ouvertes pour le propriétaire** (5. et 6. nouvelles en P4) :
1. ~~Committer P0–P2 avant P3~~ — **résolue** : P0–P2 sont committés et publiés (`1ef60b5`, `01279c0`). P3 est committé en local (`412574d`) à la demande du propriétaire, non poussé ni déployé ;
   push et publication restent à sa demande explicite.
2. Fournir une session Clerk (ou valider lui-même) pour capturer `/account` et `/admin` (UX-214).
3. Faire valider sur appareil Android réel le lecteur (raccourcis, PiP, plein écran), le mode Éco data et la fluidité du Radar :
   seuls Edge et Chromium sont testés, les mesures de performance sont simulées (bridage CPU/réseau).
4. **Nouvelle (P3)** : la tuile « Alerte météo/séisme » n'a pas de séisme (couche USGS retirée en RW-009, appel interdit par les E2E).
   Réintroduire une source sismique est un choix produit à valider ; sinon la tuile reste « Alerte météo ».
5. **P4** : logos officiels Wave / Orange Money (kit marchand) à fournir ; pictogrammes locaux en attendant.
6. **P4** : le nom de l'application dans le tableau de bord Clerk est « Afrika_Live » (masqué par la traduction, à corriger côté Clerk).

### 5.2 Préparation de P4 et P5 (repères de code, relevés le 3 octobre 2026)

Repères pour ne pas tout redécouvrir. Ils n'engagent pas : relire le code avant d'agir et mettre ce tableau à jour si l'un d'eux change.

**P4 — Landing, tarifs, compte** (✅ fait le 3 octobre 2026 ; repères conservés pour l'historique — voir production-progress.md « Lot P4 »)

| Ticket | Repères dans le code | Pièges et décisions par défaut |
|---|---|---|
| UX-401 | `src/app/page.tsx` (676 lignes, composant serveur ; en mode MVP local il redirige vers `/app/live`). `LandingDashboardPreview.tsx` : aujourd'hui une icône de globe, pas une capture. Chiffres **en dur** à supprimer : catégories « 1 400+ / 650+ / 1 200+ / 980+ chaînes » (≈ l. 77-80) et « 11 700+ chaînes » (≈ l. 471 et 533). | Chiffres depuis la base : `publicCatalogChannelCondition()` (`src/lib/public-catalog-visibility.ts`) exclut Canal+ des réponses publiques ; il n'existe **pas encore** de compteur public (`getAfricanChannelsSummary` est derrière l'accès). Prévoir une requête de comptage légère et mise en cache (lire les guides de cache de `node_modules/next/dist/docs/` : la page appelle `auth()`, donc reste dynamique), sans donnée personnelle. Image du hero : à produire avec des **données simulées** (jamais de contenu d'éditeur dans un fichier public), WebP < 60 Ko, `next/image`. |
| UX-402 | `metrics` (4 « métriques » qui n'en sont pas) et `features` de `page.tsx` ; `Globe2` y sert deux fois. | 3 bénéfices clairs, ton Teranga sobre, une icône par idée. |
| UX-403 | `src/app/pricing/page.tsx` (242 lignes, composant client) : boutons « Payer avec NabooPay (990 FCFA) » et « (9 900 FCFA) ». Identifiants internes `lumina_all_access_*` à **ne pas** changer (alias d'affichage déjà en place, UX-008). 9 900 FCFA = 10 mois de 990 FCFA : « 2 mois offerts » est exact. | `e2e/payment.spec.ts` cherche `/Payer avec NabooPay/i` : mettre le libellé à jour dans le même ticket avec une assertion équivalente ; parcours NabooPay (appels, redirections, webhooks) inchangé. Logos Wave / Orange Money / CB : fichiers locaux, aucun chargement tiers. |
| UX-404 | `src/app/account/page.tsx` (148 lignes) : « Mon accès » puis `UserProfile` de Clerk. Sources locales pour « Mon activité » : `useRecentChannels()`, favoris (`/api/favorites`), pays récents (`al_recent_countries`), dernière visite du Radar (`al_radar_visit`). | Aucune migration. Jauge de jours restants à partir de la décision d'accès déjà calculée (`getCurrentAccessDecision`). La page exige une session Clerk : captures par le propriétaire (UX-214). |
| UX-405 | `src/app/layout.tsx` : `ClerkProvider appearance.variables` avec des couleurs en **hex littéraux** et un rayon. | À aligner sur les jetons (police, rayons, éléments). **`@clerk/localizations` n'est pas installé** : l'ajouter est une nouvelle dépendance (décision du propriétaire) ; **par défaut**, passer un objet `localization` partiel écrit à la main, sans dépendance. Captures sign-in / sign-up à 360 / 768 / 1366 px (mode Clerk). |
| UX-406 | Pas de `error.tsx` ni de `loading.tsx` à la racine de `src/app/` ; `not-found.tsx` (48 lignes) porte déjà le ton « hors antenne ». | `EmptyState` / `ErrorState` du design system partout ; jamais de message technique brut. |
| UX-407 | `faqs` de `page.tsx` (6 questions longues). | 5 questions courtes, ton factuel, aucune promesse invérifiable. |
| UX-212 | `EcoToggle` est dans `AppHeader` mais caché sous 640 px. | Accessible en ≤ 2 gestes à 360 px, `aria-pressed`, E2E. |
| UX-214 | `/account` et `/admin`. | **Action du propriétaire** : fournir une session Clerk. |

Vérification propre à P4 : la landing, `/pricing` et `/sign-in` sont testées en **mode Clerk** (en mode MVP elles redirigent vers le Radar) ; `e2e/auth-entry.spec.ts` et `e2e/payment.spec.ts` sont les garde-fous.

**P5 — Aimants et finition**

| Ticket | Repères dans le code | Pièges et décisions par défaut |
|---|---|---|
| UX-501 | `InlinePlayerModal` (utilisée par la TV et le Radar) ; `Player.tsx` (1 035 lignes) ; layout `/app` = `AppShell`. | Mini-lecteur persistant dans le layout `/app` : **une seule source active**, arrêt propre, quotas respectés ; remplace ou prolonge la modale. E2E lecture obligatoires : `tv-streaming`, `anchored-player`, `local-playback`, `radar-live`. |
| UX-502 | Recherche Ctrl K déjà présente pour le catalogue TV (`useOpenSearch`, `CountryPicker`). | Réutiliser les API existantes (catalogue, pays) ; pas de nouvelle route sans ticket. |
| UX-503 | Clés locales `al_recent_countries`, `al_favorites`. | Pays suivis en local d'abord ; la synchronisation au compte est un **ticket de migration séparé**, sauvegarde Railway préalable. |
| UX-504 | `src/app/manifest.ts` (manifeste unique depuis P0). | Raccourcis Radar / TV, écran hors-ligne « hors antenne », Lighthouse PWA installable. |
| UX-505 | `framer-motion` reste dans 5 composants (`CategoryTabs`, `FilterSidebar`, `InlinePlayerModal`, `PlayerOverlays`, `Player`) ; l'image `BrandBackdrop` est signalée comme LCP en développement. | Mesurer le poids JS de la TV et du Radar avant/après (le Radar charge déjà la modale à la demande) ; `loading="eager"` sur le logo ; CSS plutôt que bibliothèque là où il suffit. |
| UX-506 → 508, UX-209 suite, UX-213 | Voir §6. | Mur TV derrière un drapeau (desktop) ; briefing = lot L6 ; audit a11y + Lighthouse, rapport daté dans `docs/`. |

**Décisions du propriétaire en attente** (après P5) : (8) **briefing L6** (UX-507) ; (9) ~~Lighthouse~~ installé hors du projet ; publier les corrections de l'audit ; landing statique (performance mobile) ; instance Clerk de production ; (10) activer le mur TV en production (`NEXT_PUBLIC_TV_WALL`) ; (11) ~~publier P5~~ fait (`090ce01`, Railway `75bf069d`) ; (1) ~~publier P3–P4~~ résolue (publiés le 3 octobre) ; (2) source sismique pour la tuile d'alerte ? ; (3) ~~traduction Clerk~~ résolue : `@clerk/localizations` 4.9.0 ; (4) ~~session Clerk pour UX-214~~ résolue ; (5) validation sur Android réel ; (6) logos officiels Wave / Orange Money ; (7) nom « Afrika_Live » dans le tableau de bord Clerk.

Repères ajoutés en P4 utiles à P5 : chiffres publics `getPublicStats()` (`src/lib/public-stats-server.ts`, cache 1 h) ; écran partagé `OffAirScreen` (404, erreurs, hors-ligne PWA d'UX-504) ; `PlanCard` / `PaymentMethods` / `Faq` ; `loading.tsx` racine (penser au piège d'hydratation en E2E) ; bascule Éco visible dès 360 px.

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
- **Arbre de travail** : P0, P1 et P2 sont committés et publiés (`1ef60b5`, `01279c0`), P3 est committé en local (`412574d`, non poussé) ; l'arbre doit être propre au début d'un lot. Inspecter
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
- **Shell** : les remplacements multilignes avec `\\` ou `\s` dans un heredoc perdent leurs échappements ; utiliser l'outil d'écriture
  ou d'édition. `python` lancé sans fichier bloque (processus à tuer).

## 9. Prochaine étape

1. Le propriétaire revoit le bilan P4, répond aux décisions en attente du §5.2 et donne son feu vert pour **P5** ; commit, push et
   publication de P3–P4 uniquement sur sa demande.
2. Nouvelle session : coller [prompt-reprise-premium-p4.md](prompt-reprise-premium-p4.md) (lecture des documents, annonce du plan de
   lot en 5 lignes, un lot à la fois, bilan fait / vérifié / limites, attente du feu vert).
3. P5 commence par le mini-lecteur persistant (UX-501, E2E lecture obligatoires) ; voir les repères du §5.2.
