# Audit accessibilité et performance — 3 octobre 2026 (Premium P5, UX-508)

Périmètre : Radar (`/app/live`), TV (`/app`), mur TV (`/app/mur`), page de revue (`/app/ui`), landing, `/pricing`, `/sign-in`, 404,
et les états ajoutés en P5 (lecteur agrandi, mini-lecteur, recherche universelle, tiroir de filtres). Code final du lot P5,
non committé au moment de l'audit. Aucun outil n'a été installé : axe-core est déjà présent dans `node_modules` (dépendance
transitive) ; **Lighthouse n'est pas installé** et n'a pas été lancé (il faudrait l'ajouter : décision du propriétaire).

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

## Recommandations

1. Autoriser Lighthouse (outil de mesure, sans effet sur l'application) pour obtenir les notes officielles Radar / TV / landing.
2. Alléger le fond de marque (LCP) et charger Clerk seulement où il sert sur la landing.
3. Tester sur un Android d'entrée de gamme réel avec TalkBack.
