# Audit accessibilité et performance — 3 octobre 2026 (Premium P5, UX-508)

Périmètre : Radar (`/app/live`), TV (`/app`), mur TV (`/app/mur`), page de revue (`/app/ui`), landing, `/pricing`, `/sign-in`, 404,
et les états ajoutés en P5 (lecteur agrandi, mini-lecteur, recherche universelle, tiroir de filtres). Code final du lot P5,
non committé au moment de l'audit. axe-core est déjà présent dans `node_modules` (dépendance transitive) ; Lighthouse a ensuite
été installé hors du projet à la demande du propriétaire (section « Lighthouse »).

## Accessibilité (axe-core, règles WCAG 2.0 / 2.1 niveaux A et AA)

| Page ou état | Largeur | Règles vérifiées | Violations |
|---|---|---|---|
| Radar `/app/live` (données réelles, mode MVP) | 360 / 1366 | 33 | **0** |
| TV `/app` (données réelles) | 360 / 1366 | 30 | **0** |
| Mur TV `/app/mur` (état vide) | 360 | 23 | **0** |
| Page de revue `/app/ui` | 360 / 1366 | 27 | **0** |
| Landing, `/pricing`, `/sign-in`, 404 (mode Clerk) | 360 | 26 / 28 / 24 / 20 | **0** |
| Lecteur agrandi puis réduit (données simulées, E2E `a11y`) | 1366 | — | **0** |
| Recherche universelle ouverte (E2E `a11y`) | 1366 | — | **0** |

Clavier (vérifié par E2E) : focus placé sur « Fermer le lecteur » à l'ouverture, Tab piégé dans la fenêtre du lecteur, focus rendu
à la page à la fermeture ; palette Ctrl K : liste annoncée (`combobox` + `listbox` + `aria-activedescendant`), ↑ ↓ Entrée Échap ;
tiroir de filtres : focus piégé, Échap rend le focus au bouton « Ouvrir les filtres » ; mini-lecteur et mur TV : aucun raccourci
global (les flèches appartiennent à la page). Plancher 12 px et absence de débordement : 0 écart sur toutes les captures P5.

Non couvert : lecteur d'écran réel (NVDA, TalkBack, VoiceOver), contraste des images de chaînes, appareils réels.

## Performance

### Poids JS de premier chargement (lu dans le build, JS de démarrage + segments de la route, gzip)

| Route | Avant P5 (code P4) | Après P5 | Écart |
|---|---|---|---|
| TV `/app` | 522,3 Ko | **321,6 Ko** | **−38 %** |
| Radar `/app/live` | 323,4 Ko | 329,7 Ko | +2 % |
| Landing `/` | 193,9 Ko | 194,0 Ko | = |

Causes : le lecteur et hls.js (≈ 162 Ko gzip à eux seuls) étaient embarqués dans la TV par la modale et par le prototype L5 ; ils
sont désormais chargés à la première lecture (lecteur unique, prototype chargé à la demande). `framer-motion` est retiré du projet.
Le Radar prend +6 Ko : le lecteur unique et la recherche universelle vivent dans le layout `/app`.

### Build servi en local (`next start`, `DEPLOYMENT_ENV=local`), mobile 360 px, CPU ×4, 4G lente (1,6 Mbit/s, 150 ms) — 3 passages

| Page | FCP | LCP | CLS | Blocage (TBT) | Script transféré |
|---|---|---|---|---|---|
| Landing | 1,8–2,2 s | 3,6–4,5 s | **0** | 270–510 ms | 430 Ko |
| `/pricing` | 1,7 s | 4,4–5,1 s | **0** | 560–780 ms | 536 Ko (dont Clerk) |

L'élément LCP est le grand logo décoratif `BrandBackdrop` (640 px, 34 Ko) affiché à 6 % d'opacité. Un essai `loading="eager"` n'a
pas apporté de gain net (LCP plus tardif, blocage plus faible) et a été retiré. Pistes pour atteindre LCP < 2,5 s sur 4G lente : alléger
ou dessiner ce fond en CSS, différer Clerk sur la landing. **Lighthouse ≥ 90 n'est pas démontré** : ces chiffres laissent prévoir
une note mobile simulée sous 90 (LCP), un score à confirmer avec Lighthouse.

Radar et TV ne peuvent pas être mesurés en production sans session (le mode MVP est refusé par un build de production, par conception) ;
au repos sur le serveur de développement, le Radar consomme **15 ms de CPU en 5 s** (mesure de P3 reconduite), sans régression.

### PWA (build servi)

Manifeste unique avec raccourcis Radar et TV ; installable (aucune erreur d'installabilité dans un profil normal, protocole
du navigateur) ; service worker actif ; **cache limité à `offline.html` et deux images locales** (aucune vidéo, réponse d'API ou image
distante) ; hors connexion, une navigation affiche l'écran « Hors antenne » (capture `premium-p5-hors-ligne-1366.png`).

## Lighthouse (12.8.2, installé à la demande du propriétaire le 3 octobre 2026)

Installé **hors du projet** (`.local-logs/tools/lighthouse`, ignoré par Git) : ni `package.json` ni le build Railway n'en dépendent.
Navigateur : Edge (Chromium) sans interface. Profils Lighthouse par défaut : « mobile » (appareil milieu de gamme simulé, 4G lente,
CPU ×4) et « desktop ». Une seule mesure par page et par profil (variations observées : ± 5 à 10 points en performance mobile).

### 1. Staging (`staging.africatv.sn`, build de production, P5 publié)

| Page | Perf. mobile / desktop | Accessibilité | Bonnes pratiques | SEO | LCP mobile | CLS mobile |
|---|---|---|---|---|---|---|
| Landing | 71 / 88 | 99 / 100 | 79 / 78 | 100 | 5,5 s | 0 |
| `/pricing` | 65 / 88 | 100 / 99 | 79 / 78 | 100 | 6,4 s | 0 |
| `/sign-in` | 55 / 89 | 100 | 79 / 78 | 100 | 5,4 s | **0,269** |

### 2. Corrections faites après cette mesure (publiées le 3 octobre : commit `865c85d`, Railway `3bc79b16` ; staging : accessibilité 100, CLS connexion 0,017)

- **Accessibilité** : logo de marque au texte alternatif redondant à côté du mot « Africa Live » (`image-redundant-alt`) → logo
  décoratif (`BrandLogo decorative`) ; lien d'accueil dont le nom ne reprenait pas le texte visible → nom = texte visible ; bouton
  « Rechercher » de la barre (nom « Rechercher une chaîne », texte « Rechercher Ctrl K ») → nom = texte visible, et dans `/app` il
  ouvre désormais la recherche universelle, comme le raccourci Ctrl K qu'il affiche (E2E `app-shell` mis à jour, équivalent).
- **CLS de la connexion** (0,269 sur mobile) : place réservée au widget Clerk avant son arrivée.
- **CLS du Radar** (jusqu'à 0,47 sur mobile, CPU ×4, existant depuis P3) : textes des tuiles et ligne d'état à hauteur réservée
  (unité `lh`), ligne d'état exclue de l'ancrage de défilement (la pastille « n nouvelles » ne fait pas bouger la page, E2E vert) ;
  sur grand écran, place de la carte réservée dès le rendu serveur (le bouton « Afficher la carte » disparaissait après hydratation).
- **CLS de la TV** : la rangée « Mes favoris » n'affiche plus un squelette qui s'efface quand il n'y a aucun favori (et n'est plus
  demandée : une requête `/api/channels` de moins ; E2E `tv-streaming` mis à jour en conséquence).
- Essais **retirés faute de gain mesuré** : `loading="eager"`, puis `preload` du fond de marque (LCP mobile inchangé dans le bruit).

### 3. Après corrections — build servi en local (`next start`, `DEPLOYMENT_ENV=local`)

| Page | Perf. mobile / desktop | Accessibilité | Bonnes pratiques | SEO | LCP mobile | CLS mobile |
|---|---|---|---|---|---|---|
| Landing | 63 / **98** | **100** | 79 / 78 | 100 | 6,9 s | 0 |
| `/pricing` | 64 / **96** | **100** | 79 / 78 | 100 | 6,2 s | 0 |
| `/sign-in` | 71 / **98** | **100** | 79 / 78 | 100 | 4,6 s | **0,017** |

### 4. Radar et TV (session requise : mesurés sur le serveur de **développement**, mode MVP)

La performance n'est **pas représentative** (code non minifié, compilation à la volée) ; accessibilité, bonnes pratiques et SEO le sont.

| Page | Perf. (dev) mobile / desktop | Accessibilité | Bonnes pratiques | SEO | CLS mobile / desktop |
|---|---|---|---|---|---|
| Radar `/app/live` | 47 / 78 | **100** | 100 | 100 | 0,024 / 0,001 (avant : 0,035–0,47 / 0,167) |
| TV `/app` | 47 / 89 | **100** | 100 / 78 | 100 | 0,011 / 0,024 (avant : 0,121 / 0,079) |

Avertissement restant sans effet sur la note : les tuiles du Radar ont un nom accessible plus riche que leur texte visible
(« … pas une alerte officielle », etc.), choisi en P3 et vérifié par 6 E2E : conservé volontairement.

### Lecture

- **Accessibilité : 100 partout** après corrections. **SEO : 100.**
- **Bonnes pratiques 78–79** : uniquement les **cookies tiers de l'instance Clerk de développement** (`*.clerk.accounts.dev`)
  utilisée par staging ; une instance Clerk de production sur le domaine `africatv.sn` (configuration Clerk, décision du propriétaire)
  supprime ce point. Aucun défaut de code relevé.
- **Performance desktop : 96–98** (build servi). **Performance mobile : 55–72**, LCP 4,6–6,9 s : l'élément LCP est le grand logo
  décoratif `BrandBackdrop` ; la part dominante est le **délai serveur** (landing rendue à chaque requête par `auth()` : 2,1 s de
  premier octet sur staging) et le JavaScript (Clerk compris). Pistes, à décider : landing **statique** (état de connexion lu côté
  client) et revalidée ; fond de marque plus léger ou dessiné en CSS ; Clerk chargé seulement où il sert sur la landing.

## Recommandations

1. ~~Autoriser Lighthouse~~ fait (voir « Lighthouse ») ; publier les corrections d'accessibilité et de CLS (accord du propriétaire).
2. Alléger le fond de marque (LCP) et charger Clerk seulement où il sert sur la landing.
3. Tester sur un Android d'entrée de gamme réel avec TalkBack.
