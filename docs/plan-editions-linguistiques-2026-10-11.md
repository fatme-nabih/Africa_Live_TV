# Africa Live — Éditions linguistiques (français · anglais · arabe)

Étude et plan, 11 octobre 2026 (fuseau Africa/Dakar). **Document seul : aucun code, aucune base, aucune configuration distante modifiés.**
Preuves privées : `.local-logs/editions-2026-10-11/` (script de vérification des flux, listes testées, résultats JSON, comptage du catalogue).

> **Décisions du propriétaire reçues le 11 octobre 2026 (voir § 7).** Mise en œuvre :
> [plan technique pour l'agent codeur](plan-technique-editions-2026-10-11.md), [backlog EDI](backlog-editions-2026-10-11.md),
> [prompt de reprise](prompt-agent-editions-2026-10-11.md). Ce document reste l'étude de référence : constats, concept, sources vérifiées (annexes).

Périmètre demandé par le propriétaire : un choix de langue (dès la landing et dans l'application) qui change **l'interface ET les sources**.
L'espagnol est retiré. Restent **français, anglais, arabe**, pensés pour l'Afrique.

---

## 0. L'idée en une phrase

**Pas une traduction : trois rédactions.** Choisir une langue revient à ouvrir une autre *édition* d'Africa Live, comme un journal
qui publie une édition par langue. Chacune a sa propre langue d'interface, son propre bouquet de sources, son propre regard sur le monde
et ses propres réglages par défaut. Le compte, les favoris, les pays suivis, les droits et le catalogue TV complet restent communs.

| Édition | Nom affiché dans le sélecteur | Sens d'écriture | Sphère africaine principale |
|---|---|---|---|
| `fr` | Français | gauche → droite | Afrique de l'Ouest et centrale francophone, Maghreb, océan Indien |
| `en` | English | gauche → droite | Nigeria, Ghana, Afrique de l'Est, Afrique australe, Égypte (presse anglophone) |
| `ar` | العربية | droite → gauche | Égypte, Soudan, Libye, Tunisie, Algérie, Maroc, Mauritanie, puis l'Orient arabe |

---

## 1. Ce que l'étude du code révèle

### 1.1 Le fonctionnement actuel du Radar

```
Navigateur (Radar)                         Serveur Next (Railway)                       Rédactions
useRadarData ── GET /api/live/rss ──────▶ getRadarRss()  ── cache unique 5 min ──▶ 21 flux RSS français
                                           (rss-collector.ts : détection du pays,       (11 nationaux, 4 panafricains,
                                            dédoublonnage, fenêtre 24 h)                  6 internationaux)
WorldDesk ───── GET /api/live/world ────▶ getWorldDesk()  ── cache unique 10 min ─▶ 15 flux « Regards sur le monde »
                                           (world-desk.ts : région, « Touche l'Afrique »)  (France 24, RFI, Le Monde…)
Flash Briefing ─ GET /api/live/briefing ▶ live-briefing.ts : modèles de phrases en français
Bandeau ──────── GET /api/live/markets ─▶ cours d'origine + USD/EUR en FCFA (open.er-api.com)
```

### 1.2 Ce qui est déjà prêt et qu'on réutilise

- `fetchSingleFeed()` (lecture bornée : 8 s, 1 Mo, format vérifié) est déjà partagée entre les deux collecteurs.
- `FeedConfig` est simple, et `WorldArticle.origin` affiche déjà d'où parle chaque rédaction : la pluralité des regards est un principe existant.
- **Le catalogue TV connaît déjà la langue de chaque chaîne** (colonne `language`, codes ISO 639-3, filtre « Langue » dans la grille).
  Mesure en lecture seule sur `africa_live_dev` : **419 chaînes africaines, dont 176 en anglais, 161 en français, 62 en arabe**
  (11 en portugais, 6 en espagnol). Sur tout le catalogue (14 505 chaînes) : 3 173 en anglais, 546 en français, 392 en arabe ; 2 829 sans langue.
- Node 22 embarque l'ICU complet (vérifié) : noms des 55 pays en anglais et en arabe (`Intl.DisplayNames`), **six formes du pluriel arabe**
  (`Intl.PluralRules`), dates relatives (« قبل 3 ساعات », « 3 hours ago »), décodage `windows-1256`.
- `@clerk/localizations` 4.9.0, déjà installé, contient `frFR`, `enUS`, `enGB` et `arSA`.
- La carte n'affiche aucun nom dans ses tuiles (imagerie Esri + contours Natural Earth) : seuls les libellés de l'interface sont à traduire.

### 1.3 Ce qui est verrouillé sur le français

| Endroit | Constat | Conséquence pour l'anglais ou l'arabe |
|---|---|---|
| `rss-collector.ts` | Une seule liste `RSS_FEEDS`, un seul cache `rssCache`, un seul appel en cours | Impossible de servir deux bouquets sans qu'ils s'écrasent |
| `COUNTRY_KEYWORDS` | Alias normalisés en ASCII, en français (« cote d'ivoire », « tchad »…) | L'anglais est partiellement couvert ; l'arabe ne l'est pas du tout |
| `normalizeTitle` (`world-desk-data.ts`), `normalizeSearchText` (`radar-topics.ts`) | Tout ce qui n'est pas `a-z0-9` est effacé | **Un titre arabe devient une chaîne vide** : la recherche ne filtre plus rien, la région et « Touche l'Afrique » ne sont jamais trouvées, donc les flux arabes généralistes de « Regards sur le monde » seraient entièrement écartés |
| `radar-topics.ts` | Rubriques par expressions régulières françaises | Aucune rubrique en anglais ni en arabe |
| `normalizeRadarDate` + `temporalWindow` | Dates RSS standard seulement ; une date « dans le futur » est comptée à part et **masquée** | Mesuré le 11/10 : Youm7 date en arabe (« الأحد، 11 أكتوبر 2026 08:50 م »), Masrawy au format américain sans fuseau, El Bilad « 17:24 \| 11-10-2026 », et Punch, Daily Maverick, Cairo24, Masrawy et Arabi21 publient avec 0,8 à 3 h d'avance (heure locale étiquetée UTC) : leurs dernières dépêches disparaîtraient |
| `readBoundedText` | Décodage UTF-8 imposé | Un flux arabe en `windows-1256` serait illisible (tous les flux testés étaient en UTF-8, mais la garde manque) |
| `live-briefing.ts` | Phrases françaises écrites dans le code | À passer par le dictionnaire |
| `src/app/layout.tsx` | `<html lang="fr">` fixe, polices Manrope et Unbounded | Aucune ne contient de glyphes arabes ; aucun `dir="rtl"` |
| Interface | Environ 90 fichiers TSX contiennent du texte français ; ordre de grandeur estimé : 1 500 à 2 000 libellés | Gros du travail de traduction |
| Formats | 25 `'fr-FR'`/`'fr'` en dur hors tests (dates, nombres, noms de langues) | À remplacer par la langue de l'édition |
| Mise en page | Environ 300 classes directionnelles (`ml-`, `pr-`, `left-`, `text-left`…) dans 31 fichiers, 12 classes logiques seulement | À convertir pour l'arabe (droite → gauche) |
| Bandeau | `@keyframes marquee-scroll` défile vers la gauche | Doit défiler dans l'autre sens en arabe |
| Clerk | `clerkLocalization` construit sur `frFR` | Choisir la traduction selon l'édition |

---

## 2. Le concept : trois éditions, trois rédactions

### 2.1 Ce qui change et ce qui reste commun

| Change avec l'édition | Reste commun |
|---|---|
| Langue et sens de l'interface, polices | Compte, connexion, rôles, droits, essais, paiements |
| **Le fil et « À la une » : bouquet africain de l'édition** | Favoris, pays suivis, historique « Reprendre » |
| **« Regards sur le monde » : bouquet mondial et ordre des régions** | **Catalogue TV complet, toujours visible** (règle du projet) |
| Ordre de la grille des pays (« pays de votre édition » d'abord) | Lecture directe navigateur/VLC depuis la source (aucun relais) |
| Chaînes mises en avant (celles dans la langue de l'édition passent devant) | Mode Éco data, quotas, sécurité |
| Devises du panier (FCFA, puis naira, cedi, shilling, rand ; livre égyptienne, dirham, dinar) | Carte, météo (Open-Meteo), séismes (USGS/GDACS) |
| Ville météo par défaut (Dakar, Lagos, Alger), horloges de « Regards sur le monde » | |
| Flash Briefing, textes de partage WhatsApp, images d'aperçu, écrans Clerk | |

### 2.2 Les marques miroirs : un repère quand on change d'édition

Plusieurs rédactions vérifiées existent dans les trois langues. Elles servent de fil conducteur : en passant du français à l'anglais ou à l'arabe,
l'utilisateur retrouve des noms familiers.

| Marque | Français (actuel) | Anglais (vérifié) | Arabe (vérifié) |
|---|---|---|---|
| France 24 | Afrique, Monde | Afrique, Europe, Amériques, Moyen-Orient, Asie | Flux général |
| BBC | BBC Afrique | BBC Africa + 5 régions | BBC Arabic |
| RFI | Afrique, Monde | **RFI English Africa** | (Monte Carlo Doualiya : pas de flux) |
| Hespress (Maroc) | Hespress FR | Hespress EN | Hespress (arabe) |
| Africanews | FR | EN | — |
| DW, Euronews | — | DW Africa, DW World, Euronews | DW Arabic, Euronews arabe |
| Dabanga (Soudan) | — | Dabanga EN | Dabanga (arabe) |

### 2.3 La matrice pays ↔ langues

Une table de données unique (`src/lib/edition-affinity.ts`) indique, pour chacun des 55 pays, les langues de sa presse.
Elle alimente quatre choses à la fois : l'ordre de la grille des pays, le halo de la carte, l'ordre des chaînes et le pont entre éditions.

Pays partagés entre plusieurs éditions (extrait) : Cameroun `fr+en`, Rwanda `en+fr`, Maurice et Seychelles `en+fr`, Maroc, Algérie,
Tunisie et Mauritanie `ar+fr`, Tchad, Djibouti et Comores `fr+ar`, Égypte et Soudan `ar+en`, Somalie et Érythrée `ar+en`, Soudan du Sud `en+ar`.

### 2.4 Le pont entre éditions

Une édition stricte laisse des trous : peu de dépêches anglophones sur le Mali, peu de dépêches arabophones sur le Kenya.
Plutôt que de mélanger les langues dans le fil, une ligne discrète apparaît quand un pays est peu couvert dans l'édition choisie :

> *Mali se raconte surtout en français : 23 dépêches dans l'édition francophone →*

Un geste ouvre l'autre édition, sur ce pays. Le compte vient des caches déjà chauds : le pont ne déclenche jamais de collecte supplémentaire.

### 2.5 Le sélecteur

- Chaque langue est écrite dans sa propre langue et son propre alphabet : **Français · English · العربية**. **Pas de drapeaux** : un drapeau désigne un pays, pas une langue.
- Landing : sélecteur en haut à droite, et une ligne sous l'accroche. En-tête de l'application : un bouton globe. Également dans « Mon compte ».
- Première visite : aucune redirection automatique (Sénégal d'abord, référencement stable). Si le navigateur préfère l'anglais ou l'arabe,
  une suggestion discrète s'affiche (« This page is also available in English »), calculée dans le navigateur.
- Au changement d'édition, le Radar repart de zéro : nouveau fil, pastille « nouvelles dépêches » et compteur « depuis votre visite » propres à l'édition.
  La carte allume brièvement les pays de la sphère choisie (une seule animation, désactivée en Éco et en mouvement réduit).

### 2.6 Vocabulaire proposé (à valider, relecture arabe par un locuteur natif)

| Français | English | العربية |
|---|---|---|
| Le live qui vient à vous | The live that comes to you | البث المباشر يأتي إليك |
| À la une | Top stories | أبرز الأخبار |
| Le fil | The wire | آخر الأخبار |
| Regards sur le monde | The world, seen from Africa | العالم بعيون أفريقية |
| Touche l'Afrique | Africa angle | يهمّ أفريقيا |
| Mode Éco data | Data saver | توفير البيانات |
| Vos pays | Your countries | بلدانك |

---

## 3. Les bouquets de sources (vérifiés le 11 octobre 2026, vers 18 h UTC, un dimanche)

Méthode identique à celle de « Regards sur le monde » : même User-Agent honnête, réponse 200, RSS ou Atom valide, articles présents,
date du plus récent, encodage, et **langue réelle des titres** (deux flux annoncés en anglais étaient en somali et en français).
**257 adresses testées (quelques doublons), 124 flux distincts retenus (85 anglais, 39 arabes, dont RT Arabic réintégré par D6), 2 de plus récupérables avec un adaptateur de dates.** Le détail, avec les URL exactes, est en annexe.

| Bouquet | Noyau (≥ 3 articles en 24 h) | Compléments (rythme lent ou week-end) |
|---|---|---|
| Anglais — presse africaine nationale | 40 flux, 20 pays | 14 flux ; 27 pays au total |
| Anglais — panafricain et international Afrique | 6 | 6 (dont RFI English, BBC Africa) |
| Anglais — monde, par région | 16 (BBC, France 24, Guardian par région + DW, NPR, ABC, The Hindu, SCMP, Euronews) | 3 |
| Arabe — presse africaine | 18 flux, 7 pays | 5 ; 8 pays au total ; plus Youm7 et El Bilad récupérables avec l'adaptateur de dates |
| Arabe — panafricain et Afrique | 3 (Qiraat Afriqiya, Anadolu, Asharq Al-Awsat Afrique) | — |
| Arabe — Orient et monde | 12 (Al Jazeera, BBC Arabic, France 24, DW, Euronews, Sky News Arabia, Asharq Al-Awsat, Al-Quds Al-Arabi, CNN Arabic, Alhurra, Arabi21, RT Arabic par décision D6) | 1 (ONU Info) |

**Trous honnêtes à connaître :**
- Anglais : Éthiopie (Fana seulement, 28 h), Liberia, Mozambique et Botswana à rythme lent ; Seychelles, Lesotho, Addis Standard, The Africa Report, Sudan Tribune et Ahram Online bloquent les robots (403).
  On ne contourne pas ces protections. Les pays francophones sont couverts en anglais par Africanews, AllAfrica, BBC Africa, RFI English, France 24 et DW.
- Arabe : aucun flux arabe trouvé pour le Tchad, Djibouti et les Comores ; une seule source mauritanienne. L'Afrique subsaharienne passe par Qiraat Afriqiya, Asharq Al-Awsat Afrique, Al Jazeera, Anadolu, Sky News Arabia, BBC Arabic et France 24.
- Arabe : aucun flux régional France 24 ou BBC n'existe. Tous les flux « monde » arabes sont généralistes : la région se déduit du titre, d'où l'importance du lexique arabe (§ 4.5).

**Ligne éditoriale pour l'arabe (décision D6) :** pluralité affichée, pas supposée. Chaque source montre son origine (Qatar, Arabie saoudite,
Émirats, Royaume-Uni, France, Allemagne, États-Unis, Turquie, Russie) pour équilibrer les lignes éditoriales. **RT Arabic est inclus** par décision du propriétaire,
avec l'origine affichée « Russie · média d'État ». Al Mayadeen bloque de toute façon les robots.
Nom du Sahara occidental : nom neutre des Nations unies (« الصحراء الغربية », « Western Sahara »), validé.

---

## 4. Architecture technique

### 4.1 Le registre des éditions (`src/lib/editions.ts`, partagé serveur et navigateur)

```ts
export type Edition = 'fr' | 'en' | 'ar';
export const EDITIONS = {
  fr: { label: 'Français', dir: 'ltr', intl: 'fr-FR', clerk: 'frFR', defaultCountry: 'SN', worldOrder: ['europe', 'ameriques', 'moyen-orient', 'asie-pacifique'] },
  en: { label: 'English',  dir: 'ltr', intl: 'en-GB', clerk: 'enGB', defaultCountry: 'NG', worldOrder: ['europe', 'ameriques', 'moyen-orient', 'asie-pacifique'] },
  ar: { label: 'العربية',  dir: 'rtl', intl: 'ar-u-nu-latn', clerk: 'arSA', defaultCountry: 'DZ', worldOrder: ['moyen-orient', 'europe', 'ameriques', 'asie-pacifique'] },
} as const satisfies Record<Edition, EditionConfig>;
```

- `en-GB` plutôt que `en-US` : la presse anglophone africaine écrit à l'anglaise et date au format jour/mois.
- `ar-u-nu-latn` : chiffres occidentaux (usage du Maghreb, meilleure lisibilité des cours et des scores), validé (D3).
- Pays par défaut (D2) : Nigeria pour l'anglais ; **Algérie pour l'arabe, Maroc juste après** dans l'ordre des pays de l'édition.
- Les éditions actives sont fixées par variable d'environnement (`EDITIONS=fr,en`) : une édition non activée n'est pas routable. On peut ainsi ouvrir l'anglais sur staging avant l'arabe.

### 4.2 Où vit la langue (routage)

**Recommandation : suivre le guide i18n de Next 16 (`node_modules/next/dist/docs/01-app/02-guides/internationalization.md`).**

- Arborescence `app/[edition]/…` (les groupes `(clerk)` passent dessous ; `app/api` reste à la racine). `next/root-params` donne l'édition à tout composant serveur ;
  `generateStaticParams` produit une landing statique par édition : l'ISR de 10 minutes est conservé.
- **Pages publiques** (landing, CGU, confidentialité, contact) : `/` en français, `/en` et `/ar` explicites, pour le référencement et le partage.
- **Espace `/app`** : URL inchangées (`/app/live` reste `/app/live`). Le proxy lit le cookie `al_edition` et réécrit en interne vers `/{edition}/app/live`.
  Aucun lien interne, aucune redirection Clerk (`/app/live`), aucun lien de partage ni test E2E existant n'a besoin de changer d'adresse.
- `<html lang dir>` est posé côté serveur, sans flash : c'est indispensable pour l'arabe (droite → gauche dès le premier affichage).
- **Point de vigilance** : `src/proxy.ts` porte déjà Clerk, le mode local, le mode E2E anonyme et un traitement des en-têtes `x-middleware-rewrite`.
  Le lot E1 commence par une **preuve technique** : landing toujours statique au build, Clerk intact, E2E en mode MVP et Clerk verts. Il faut aussi `global-not-found` et déplacer les fichiers d'icônes.
- Option écartée : lire le cookie dans le layout racine. Cela rend toutes les pages dynamiques et détruit le gain mesuré de la landing sans Clerk (UX-603).

### 4.3 Les dictionnaires, sans nouvelle dépendance

- `src/i18n/fr.ts` est la référence. `en.ts` et `ar.ts` sont typés `satisfies Dictionary` : **une clé manquante casse la compilation TypeScript**.
- Composants serveur : `getDictionary()`. Composants client : un fournisseur qui ne transmet que les espaces utiles (`radar`, `shell`…) pour garder le JavaScript léger.
- Pluriels : `Intl.PluralRules` (six formes en arabe). Dates et heures : `Intl.DateTimeFormat` et `Intl.RelativeTimeFormat` de l'édition. Noms de langues des chaînes : `Intl.DisplayNames(edition)`.
- Noms des pays : `Intl.DisplayNames` pour l'anglais et l'arabe, avec quelques corrections (« Congo - Kinshasa » → « DR Congo » / « جمهورية الكونغو الديمقراطية »).
- Pourquoi pas `next-intl` : une dépendance de plus et une compatibilité Next 16.3.8 à prouver, alors que le projet garde peu de dépendances.
  À reconsidérer seulement si les messages deviennent complexes.

### 4.4 Les collecteurs par édition

- `FeedConfig` gagne `edition`, `origin` (pays du média) et des corrections facultatives par flux : `timeZone` (dates sans fuseau), `dateFormat`, `charset`, `clockSkewMinutes`.
- Les listes quittent le code des collecteurs : `src/lib/feeds/{fr,en,ar}.ts` (Afrique) et `src/lib/feeds/world-{fr,en,ar}.ts`.
- Caches, collectes en cours et « dernier bon relevé » sont rangés **par édition**. Un bouquet n'est collecté que si quelqu'un lit cette édition.
- API : `/api/live/rss?edition=en`, `/api/live/world?edition=ar`, `/api/live/briefing?edition=…`, validées par une énumération.
  **Sans paramètre, la réponse reste française** : les anciens onglets ouverts continuent de fonctionner.
- Côté navigateur : `useRadarData`, `useWorldDesk`, `useFreshArticles` et `useRadarVisit` reçoivent l'édition et l'intègrent à leurs clés.
- Sobriété : requêtes conditionnelles (`ETag`, `If-Modified-Since`, réponse 304) et au plus 8 flux lus en même temps (on passe de 36 flux à environ 160 au total, dont 85 au plus pour l'édition anglaise).
  Asharq Al-Awsat publie 300 articles (294 Ko) : préférer ses flux de rubrique.

### 4.5 Le moteur linguistique (la partie invisible mais décisive)

1. **Dates** : un adaptateur par flux. Mois arabes égyptiens (يناير…ديسمبر), levantins (كانون الثاني…) et maghrébins (جانفي، فيفري، أفريل، ماي، جوان، جويلية، أوت…),
   marqueurs ص/م, format américain, fuseau local déclaré. Une avance d'horloge de 3 h au plus est ramenée à l'heure de collecte au lieu d'être masquée.
2. **Encodage** : respecter `charset` (en-tête ou prologue XML) avec `TextDecoder(label)` ; `windows-1256` est vérifié sous Node 22.
3. **Normalisation arabe** : supprimer les voyelles (U+064B–U+065F) et le tatweel (U+0640), unifier أ إ آ ٱ → ا, ى → ي, ة → ه, chiffres orientaux → occidentaux.
   Retirer les proclitiques collés au mot (و، ف، ب، ل، ك، ال، وال، بال، لل) **avant** de comparer, mot par mot et jamais en sous-chaîne.
4. **Lexiques par langue** (pays, capitales, gentilés, dirigeants), générés à partir d'`Intl.DisplayNames`, puis complétés à la main. Pièges mesurés à couvrir par des tests :
   - anglais : « Guinea » face à « Equatorial Guinea », « Guinea-Bissau » et « Papua New Guinea » ; « Niger Delta » et « Niger State » sont au **Nigeria** ; « Chad » est aussi un prénom ; « Congo » est ambigu ;
   - arabe : « مصر » est contenu dans « مصرف » (banque) ; « المغرب » désigne le Maroc, mais aussi le Maghreb et la prière du coucher ; « الصحراء » désigne le désert ou le Sahara occidental ; « النيجر » et « نيجيريا » ; « السودان » et « جنوب السودان ».
5. **Rubriques** (politique, économie, sécurité, société, sport, culture) en anglais et en arabe, par exemple AFCON / كأس أمم أفريقيا.
6. **Régions du monde** en anglais et en arabe : indispensable, car tous les flux « monde » arabes sont généralistes.
7. **Recherche** dans le fil : normalisation propre à chaque langue (aujourd'hui, une recherche en arabe ne filtre rien).

Critère mesurable : sur un échantillon étiqueté de 200 titres réels par édition, au moins **90 % des pays détectés sont exacts**
et aucun faux positif sur la liste de pièges. Les échantillons sont pris dans les flux vérifiés.

### 4.6 L'arabe : droite → gauche

- `dir="rtl"` côté serveur. Conversion des ~300 classes directionnelles en classes logiques de Tailwind 4 (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`, `rounded-s`, `border-e`),
  par un script de conversion puis une relecture visuelle. C'est sans effet en français.
- Icônes de direction (flèches, chevrons) retournées en arabe (`rtl:-scale-x-100`). On ne retourne ni le bouton lecture, ni le logo, ni la carte, ni les mini-courbes.
- Bandeau : défilement inversé en arabe (`animation-direction: reverse`), mesure de la distance revérifiée.
- Police arabe chargée **seulement dans l'édition arabe** (par exemple Noto Kufi Arabic pour les titres, IBM Plex Sans Arabic pour le texte) avec `next/font`, sous-ensemble `arabic` ; poids mesuré en Éco.
- Textes mixtes (nom de source latin dans une phrase arabe, prix, FCFA) : `<bdi>` et `unicode-bidi: plaintext` sur les titres.
- Clerk `arSA` : le rendu droite → gauche de ses écrans reste à vérifier en vrai dans le lot E4.

### 4.7 La télévision

- Le catalogue complet reste visible (règle du projet) : l'édition **réordonne**, elle ne filtre pas. Les rangées « En anglais » et « باللغة العربية » passent en tête,
  et dans un pays, les chaînes dans la langue de l'édition passent d'abord. Une puce « Langue de l'édition » est proposée sans être imposée.
- `catalog-metadata.ts` nomme les langues dans la langue de l'édition (aujourd'hui `Intl.DisplayNames(['fr'])`).

### 4.8 Marchés, météo, briefing

- Panier : mêmes cotations d'origine. Les devises affichées dépendent de l'édition (`open.er-api.com` fournit déjà toutes les monnaies, sans nouvelle source) :
  FR USD/EUR → FCFA ; EN USD → NGN, GHS, KES, ZAR ; AR USD → DZD, MAD, TND, EGP.
- Météo par défaut : Dakar (FR), Lagos (EN), Alger (AR), sauf si l'utilisateur suit déjà un pays.
- Flash Briefing : modèles de phrases dans le dictionnaire, moteur heuristique inchangé. Aucune API payante.

### 4.9 Mémoriser le choix

- V1 : cookie `al_edition` (un an, `SameSite=Lax`), lu par le proxy. C'est suffisant.
- Plus tard (E6) : synchronisation avec le compte, soit par une colonne additive `users.preferred_edition`
  (migration → **sauvegarde Railway restaurable d'abord**, `db:migrate:deploy`), soit par les métadonnées Clerk. À décider.
- Restent globaux : favoris, pays suivis, mode Éco. Deviennent propres à l'édition : « depuis votre dernière visite » et les dépêches déjà vues.

### 4.10 Référencement et partage

- `alternates.languages` (hreflang `fr`, `en`, `ar`, `x-default`) sur les pages publiques. Images d'aperçu `og-image-en.png` et `og-image-ar.png`.
- Textes de partage WhatsApp et Facebook dans la langue de l'édition (`share-links.ts`).
- CGU et confidentialité traduites, avec la mention « la version française fait foi » (relecture juridique conseillée).

---

## 5. Livraison en lots

Méthode habituelle : **un lot à la fois**, bilan (fait / vérifié / limites), feu vert du propriétaire avant le lot suivant, aucun commit ni publication sans demande.
Chaque lot garde le français strictement identique (tests E2E et libellés).

| Lot | Contenu | Réception | Taille |
|---|---|---|---|
| **E0 — Décisions et outillage** | Réponses aux décisions du § 7 ; script `npm run feeds:verify -- --edition en` tiré de celui de l'étude ; échantillons de titres réels pour les tests | Rapport de vérification reproductible | Petit |
| **E1 — Socle invisible** | `editions.ts`, preuve technique `app/[edition]` + réécriture du proxy + cookie, `<html lang dir>`, dictionnaire français extrait (shell + Radar), suppression des `'fr-FR'` en dur | Français identique, landing toujours statique, Clerk intact, E2E MVP et Clerk verts, captures 360/768/1366 | Moyen à grand |
| **E2 — Moteur multilingue (serveur)** | Registres de flux par édition, caches par édition, `?edition=`, dates, encodages, avance d'horloge, normalisation arabe, lexiques, rubriques, régions, requêtes conditionnelles | Tests unitaires sur titres réels, critère de 90 % du § 4.5, réponse française inchangée sans paramètre | Moyen |
| **E3 — Édition anglaise** | Traduction du Radar, du shell, de la TV, du compte et des tarifs ; sélecteur ; Clerk `enGB` ; bouquets EN ; devises ; « Regards sur le monde » ; briefing ; réordonnancement TV ; activée par `EDITIONS=fr,en` | Parcours complet en anglais, mobile 360 px, Éco, E2E EN ajoutés | Grand |
| **E4 — Édition arabe** | Conversion droite → gauche, police arabe, bandeau inversé, bidi, Clerk `arSA`, bouquets AR, relecture native | Parcours complet en arabe, aucune régression du français, poids de police mesuré | Grand |
| **E5 — Pages publiques et référencement** | `/en`, `/ar`, CGU et confidentialité traduites, hreflang, images d'aperçu, textes de partage | Landing statique par édition, aperçus WhatsApp vérifiés | Moyen |
| **E6 — Ponts et finitions** | Pont entre éditions, halo de la sphère sur la carte, synchronisation du choix au compte, vérification des flux RSS ajoutée au cycle de 15 jours (avec accord, car c'est une tâche planifiée) | Selon le lot | Moyen |

Ordre conseillé : **l'anglais d'abord** (gauche → droite, il valide toute l'architecture), puis l'arabe.
Publication sur staging seulement sur demande, édition par édition grâce à `EDITIONS`.

---

## 6. Risques et garde-fous

- **Proxy et Clerk** : point le plus délicat ; preuve technique en ouverture du lot E1, retour arrière simple tant que le français ne change pas.
- **Poids et données mobiles** : dictionnaires résolus côté serveur, police arabe seulement en arabe, bouquets collectés à la demande, requêtes conditionnelles.
- **Fragilité des sources** : plus de la moitié des adresses testées ont été écartées. Des sites passent derrière un anti-robot ; il faut une revérification régulière et le « dernier bon relevé » de 45 minutes, déjà en place.
- **Droits** : comme aujourd'hui, titres et liens seulement. Les images restent celles de l'éditeur (https), jamais stockées. Pas de traduction automatique des titres (coût et droits).
- **Sensibilités éditoriales** : origine affichée pour chaque source, nom neutre du Sahara occidental. RT Arabic est inclus (D6) avec l'origine
  « Russie · média d'État » ; le média étant sous sanctions de l'Union européenne pour sa diffusion dans l'UE, il reste désactivable d'une ligne (`enabled: false`) dans le registre.
- **Qualité des traductions** : premier jet par l'agent, relecture humaine obligatoire pour l'arabe (arabe standard moderne), relecture rapide pour l'anglais.
- **Paiement** : NabooPay encaisse en FCFA (Wave, Orange Money, carte). Un lecteur nigérian ou égyptien ne paiera pas par Wave. Le message doit le dire honnêtement, sans assouplir les règles d'éligibilité (décision D5).
- **Migration** : seule la synchronisation au compte (E6) toucherait au schéma. Sauvegarde restaurable avant tout déploiement ; un retour arrière du code n'annule pas une migration.

---

## 7. Décisions du propriétaire (reçues le 11 octobre 2026)

| # | Question | Décision |
|---|---|---|
| D1 | Langues | **Validé** : français, anglais, arabe ; pas d'espagnol. Le portugais reste la 4ᵉ édition naturelle, hors périmètre |
| D2 | Pays par défaut | **Anglais : Nigeria (Lagos). Arabe : Algérie (Alger) par défaut, Maroc juste après** (réponse « Algérie / Maroc » ; une seule constante à changer pour les inverser) |
| D3 | Chiffres de l'édition arabe | **Validé** : chiffres occidentaux (`ar-u-nu-latn`) |
| D4 | Éditions strictes ou mélange | **Validé** : éditions strictes + pont entre éditions |
| D5 | Paiement hors zone FCFA | **Validé** : prix en FCFA, moyens de paiement dits clairement, carte bancaire mise en avant ; aucune règle d'éligibilité ni logique NabooPay modifiée |
| D6 | RT Arabic et Sahara occidental | **RT Arabic inclus** (origine « Russie · média d'État ») ; **nom neutre « Sahara occidental » validé** |
| D7 | Relecture de l'arabe | **En attente** : nécessaire avant la réception de l'édition arabe (E4), pas avant |
| D8 | Ordre de livraison | Non contesté : E0 → E1 → E2 → E3 (anglais) → E4 (arabe) → E5 → E6 |

---

## 8. Avis

L'idée est juste et différenciante : peu de services couvrent l'Afrique dans ses trois grandes langues de presse avec de vraies rédactions locales,
au lieu de traduire la même actualité. La partie « sources » est la plus précieuse et la moins coûteuse : le collecteur est déjà propre, les bouquets sont trouvés et vérifiés,
et le catalogue TV est déjà plus anglophone que francophone sur l'Afrique. Le gros de l'effort est ailleurs : traduire environ 1 500 à 2 000 libellés,
puis faire passer l'interface en droite → gauche pour l'arabe. D'où l'ordre proposé : le socle invisible, le moteur, l'anglais, puis l'arabe.

---

## Annexe A — Flux anglophones retenus

Rang « noyau » : au moins 3 articles sur 24 h et un article de moins de 24 h au moment du test (un dimanche). « Complément » : rythme plus lent.
« Avance » : heure locale publiée comme UTC, à corriger par flux.

### A.1 Presse africaine nationale

| Pays | Source | Rang | Art. 24 h | Plus récent | Flux | Remarque |
|---|---|---|---|---|---|---|
| BW | Botswana Gazette | noyau | 3 | 8,2 h | https://www.thegazette.news/feed/ | |
| BW | Sunday Standard | complément | 0 | 31,1 h | https://www.sundaystandard.info/feed/ | |
| CM | The Post | noyau | 10 | 22,8 h | https://thepostnewspaper.net/feed/ | Cameroun anglophone |
| CM | Cameroon News Agency | complément | 0 | 43,1 h | https://cameroonnewsagency.com/feed/ | |
| EG | Egypt Independent | noyau | 10 | 2,3 h | https://www.egyptindependent.com/feed/ | |
| EG | Daily News Egypt | noyau | 3 | 6 h | https://www.dailynewsegypt.com/feed/ | |
| ER | Shabait | complément | 1 | 11,9 h | https://shabait.com/feed/ | ministère de l'Information |
| ET | Fana | complément | 0 | 28,4 h | https://www.fanamc.com/english/feed/ | proche du pouvoir |
| GH | MyJoyOnline | noyau | 50 | 0,4 h | https://www.myjoyonline.com/feed/ | 438 Ko : requêtes conditionnelles |
| GH | Graphic Online | noyau | 10 | 3,1 h | https://www.graphic.com.gh/news.feed?type=rss | |
| GM | Kerr Fatou | noyau | 7 | 1,8 h | https://www.kerrfatou.com/feed/ | |
| KE | Nation | noyau | 25 | 5,9 h | https://nation.africa/kenya/rss.xml | |
| KE | Kenyans.co.ke | noyau | 19 | 1,6 h | https://www.kenyans.co.ke/feeds/news | |
| KE | Capital FM | noyau | 10 | 0,6 h | https://capitalfm.africa/news/feed/ | |
| KE | KBC | noyau | 8 | 1,2 h | https://www.kbc.co.ke/feed/ | |
| KE | The Standard | complément | 2 | 0 h | https://www.standardmedia.co.ke/rss/headlines.php | |
| LR | FrontPage Africa | complément | 0 | 45,6 h | https://frontpageafricaonline.com/feed/ | |
| LY | Libya Herald | noyau | 7 | 21,7 h | https://libyaherald.com/feed/ | |
| MA | Hespress English | noyau | 10 | 0,2 h | https://en.hespress.com/feed | marque miroir |
| MU | NewsMoris | complément | 0 | 27,9 h | https://newsmoris.com/feed/ | |
| MW | Nyasa Times | noyau | 10 | 2,8 h | https://www.nyasatimes.com/feed/ | |
| MW | Malawi24 | noyau | 10 | 1,1 h | https://malawi24.com/feed/ | |
| MZ | Club of Mozambique | complément | 0 | 52,1 h | https://clubofmozambique.com/feed/ | |
| NA | The Namibian | noyau | 12 | 0,2 h | https://www.namibian.com.na/feed/ | |
| NA | New Era | complément | 1 | 0,1 h | https://neweralive.na/feed/ | |
| NG | Punch | noyau | 30 | avance 0,8 h | https://rss.punchng.com/v1/category/latest_news | |
| NG | Vanguard | noyau | 20 | 0,1 h | https://www.vanguardngr.com/feed/ | |
| NG | Nairametrics | noyau | 19 | 0,7 h | https://nairametrics.com/feed/ | économie |
| NG | Premium Times | noyau | 15 | 1,6 h | https://www.premiumtimesng.com/feed | |
| NG | Daily Trust | noyau | 14 | 2,2 h | https://dailytrust.com/feed/ | |
| NG | Channels TV | noyau | 10 | 0,4 h | https://www.channelstv.com/feed/ | |
| NG | Leadership | noyau | 10 | 0,1 h | https://leadership.ng/feed/ | |
| NG | BusinessDay | noyau | 5 | 0 h | https://businessday.ng/feed/ | économie |
| RW | KT Press | complément | 2 | 2 h | https://www.ktpress.rw/feed/ | |
| SD | Dabanga | complément | 0 | 49,1 h | https://www.dabangasudan.org/en/feed | marque miroir |
| SL | Sierraloaded | noyau | 10 | 0,6 h | https://sierraloaded.sl/feed/ | |
| SL | Sierra Leone Telegraph | complément | 0 | 57,8 h | https://www.thesierraleonetelegraph.com/feed/ | |
| SO | Somali Dispatch | noyau | 4 | 0,1 h | https://www.somalidispatch.com/feed/ | |
| SO | Somali Guardian | noyau | 3 | 7,8 h | https://www.somaliguardian.com/feed/ | |
| SS | Eye Radio | noyau | 7 | 6 h | https://eyeradio.org/feed/ | |
| SS | Sudans Post | complément | 0 | 28,7 h | https://www.sudanspost.com/feed/ | |
| SZ | Times of Eswatini | noyau | 8 | 13,5 h | http://times.co.sz/feed/ | http seulement |
| TZ | Daily News | noyau | 10 | 1,3 h | https://dailynews.co.tz/feed/ | |
| TZ | The Citizen | noyau | 4 | 2,8 h | https://www.thecitizen.co.tz/rss.xml | |
| UG | Nile Post | noyau | 43 | 1,1 h | https://nilepost.co.ug/feed | |
| UG | The Independent | noyau | 9 | 3 h | https://www.independent.co.ug/feed/ | |
| ZA | The Citizen | noyau | 38 | 0,2 h | https://www.citizen.co.za/feed/ | 455 Ko : requêtes conditionnelles |
| ZA | IOL | noyau | 30 | 0,9 h | https://iol.co.za/rss/ | |
| ZA | Daily Maverick | noyau | 11 | avance 1,9 h | https://www.dailymaverick.co.za/dmrss/ | |
| ZA | SABC News | noyau | 10 | 0,1 h | https://www.sabcnews.com/sabcnews/feed/ | |
| ZA | Mail & Guardian | complément | 0 | 31,5 h | https://mg.co.za/rss/ | |
| ZM | Lusaka Times | noyau | 10 | 11,4 h | https://www.lusakatimes.com/feed/ | |
| ZM | Diggers | noyau | 10 | 8,2 h | https://diggers.news/feed/ | |
| ZW | NewZimbabwe | noyau | 6 | 12,7 h | https://www.newzimbabwe.com/feed/ | |

### A.2 Panafricain et international (Afrique)

| Source | Rang | Art. 24 h | Plus récent | Flux | Remarque |
|---|---|---|---|---|---|
| Al Jazeera English | noyau | 25 | 0,7 h | https://www.aljazeera.com/xml/rss/all.xml | généraliste : garder ce qui touche l'Afrique |
| Africanews | noyau | 10 | 2,6 h | https://www.africanews.com/feed/ | marque miroir |
| AllAfrica | noyau | 10 | 5,1 h | https://allafrica.com/tools/headlines/rdf/latest/headlines.rdf | agrégateur, tous pays |
| Guardian Africa | noyau | 6 | 0 h | https://www.theguardian.com/world/africa/rss | |
| The EastAfrican | noyau | 3 | 9,9 h | https://www.theeastafrican.co.ke/rss.xml | |
| DW Africa | noyau | 3 | 0,1 h | https://rss.dw.com/rdf/rss-en-africa | |
| RFI English Africa | complément | 2 | 4 h | https://www.rfi.fr/en/africa/rss | marque miroir |
| BBC Africa | complément | 2 | 2,4 h | https://feeds.bbci.co.uk/news/world/africa/rss.xml | marque miroir |
| France 24 Africa | complément | 1 | 8,5 h | https://www.france24.com/en/africa/rss | marque miroir |
| Business Insider Africa | complément | 1 | 11,8 h | https://africa.businessinsider.com/rss | |
| TechCabal | complément | 0 | 28,1 h | https://techcabal.com/feed/ | numérique |
| African Arguments | complément | 0 | 49,1 h | https://africanarguments.org/feed/ | analyses |

### A.3 Monde (« The world, seen from Africa »)

| Région | Source | Rang | Art. 24 h | Flux |
|---|---|---|---|---|
| Europe | Guardian | noyau | 22 | https://www.theguardian.com/world/europe-news/rss |
| Europe | France 24 | noyau | 6 | https://www.france24.com/en/europe/rss |
| Europe | BBC | noyau | 4 | https://feeds.bbci.co.uk/news/world/europe/rss.xml |
| Amériques | Guardian | noyau | 8 | https://www.theguardian.com/world/americas/rss |
| Amériques | BBC US & Canada | noyau | 4 | https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml |
| Amériques | France 24 | complément | 1 | https://www.france24.com/en/americas/rss |
| Amériques | BBC Latin America | complément | 0 | https://feeds.bbci.co.uk/news/world/latin_america/rss.xml |
| Moyen-Orient | Guardian | noyau | 14 | https://www.theguardian.com/world/middleeast/rss |
| Moyen-Orient | France 24 | noyau | 6 | https://www.france24.com/en/middle-east/rss |
| Moyen-Orient | BBC | noyau | 3 | https://feeds.bbci.co.uk/news/world/middle_east/rss.xml |
| Asie-Pacifique | Guardian | noyau | 4 | https://www.theguardian.com/world/asia-pacific/rss |
| Asie-Pacifique | BBC | noyau | 3 | https://feeds.bbci.co.uk/news/world/asia/rss.xml |
| Asie-Pacifique | France 24 | complément | 1 | https://www.france24.com/en/asia-pacific/rss |
| Généraliste | SCMP (Hong Kong) | noyau | 47 | https://www.scmp.com/rss/91/feed/ |
| Généraliste | ABC (Australie) | noyau | 26 | https://www.abc.net.au/news/feed/51120/rss.xml |
| Généraliste | The Hindu (Inde) | noyau | 26 | https://www.thehindu.com/news/international/feeder/default.rss |
| Généraliste | Euronews | noyau | 10 | https://www.euronews.com/rss?level=theme&name=news |
| Généraliste | NPR (États-Unis) | noyau | 6 | https://feeds.npr.org/1004/rss.xml |
| Généraliste | DW World (Allemagne) | noyau | 5 | https://rss.dw.com/rdf/rss-en-world |

## Annexe B — Flux arabophones retenus

### B.1 Presse africaine arabophone

| Pays | Source | Rang | Art. 24 h | Plus récent | Flux | Remarque |
|---|---|---|---|---|---|---|
| DZ | Echorouk | noyau | 10 | 0 h | https://www.echoroukonline.com/feed | |
| DZ | Ennahar | noyau | 10 | 0,1 h | https://www.ennaharonline.com/feed/ | |
| DZ | El Bilad | récupérable | 10 | — | https://www.elbilad.net/feed | dates « 17:24 \| 11-10-2026 » : adaptateur |
| EG | Al-Masry Al-Youm | noyau | 20 | 10,3 h | https://www.almasryalyoum.com/rss/rssfeeds | |
| EG | Youm7 | récupérable | 20 | — | https://www.youm7.com/rss/SectionRss?SectionID=65 | dates en arabe : adaptateur |
| EG | Masrawy | complément | — | avance 2,5 h | https://www.masrawy.com/rss/feed/25/news | format américain sans fuseau |
| EG | Cairo24 | complément | — | avance 3 h | https://www.cairo24.com/rss.aspx | heure du Caire étiquetée UTC |
| EG | Mada Masr | complément | 1 | 2,6 h | https://www.madamasr.com/feed/ | indépendant |
| LY | Libya Observer | noyau | 10 | 0,9 h | https://ar.libyaobserver.ly/rss.xml | |
| LY | Al Marsad | noyau | 10 | 0,9 h | https://almarsad.co/feed/ | |
| MA | Al3omk | noyau | 20 | 0,9 h | https://al3omk.com/feed | |
| MA | Hespress | noyau | 12 | 0,9 h | https://www.hespress.com/feed | marque miroir |
| MA | Alyaoum24 | noyau | 10 | 0,4 h | https://alyaoum24.com/feed | |
| MA | Barlamane | noyau | 10 | 0,2 h | https://barlamane.com/feed/ | |
| MR | Sahara Medias | noyau | 10 | 0,9 h | https://saharamedias.net/feed/ | seule source mauritanienne trouvée |
| SD | Dabanga | noyau | 11 | 0,2 h | https://www.dabangasudan.org/ar/feed | marque miroir |
| SD | Al Nilin | noyau | 10 | 1,5 h | https://www.alnilin.com/feed | |
| SD | Al Sudani | noyau | 6 | 1 h | https://alsudaninews.com/?feed=rss2 | |
| SD | Sudan Tribune | noyau | 5 | 1,5 h | https://sudantribune.net/feed | |
| SD | Al Taghyeer | noyau | 3 | 4,5 h | https://www.altaghyeer.info/ar/feed/ | |
| SO | Al-Somal Al-Jadid | complément | 0 | 30,7 h | https://alsomal.net/feed/ | |
| TN | Babnet | noyau | 52 | 0 h | https://www.babnet.net/feed.php | |
| TN | Mosaïque FM | noyau | 41 | 0,6 h | https://www.mosaiquefm.net/ar/rss | |
| TN | Alchourouk | noyau | 10 | 1,6 h | https://www.alchourouk.com/rss | |
| TN | Nawaat | complément | 0 | 26,5 h | https://nawaat.org/feed/ | indépendant |

### B.2 Afrique vue en arabe (panafricain)

| Source | Origine | Art. 24 h | Flux |
|---|---|---|---|
| Qiraat Afriqiya (قراءات إفريقية) | spécialiste Afrique | 10 | https://qiraatafrican.com/feed/ |
| Asharq Al-Awsat — Afrique | Arabie saoudite | 3 | https://aawsat.com/feed/africa |
| Anadolu (arabe) | Turquie | 30 | https://www.aa.com.tr/ar/rss/default?cat=guncel |

### B.3 Orient et monde (« العالم بعيون أفريقية »)

Tous généralistes : la région se déduit du titre (lexique arabe du § 4.5).

| Source | Origine | Art. 24 h | Flux | Remarque |
|---|---|---|---|---|
| Asharq Al-Awsat | Arabie saoudite | 193 | https://aawsat.com/feed | 294 Ko : préférer les flux de rubrique |
| Sky News Arabia | Émirats | 55 | https://www.skynewsarabia.com/rss | |
| Al Jazeera | Qatar | 25 | https://www.aljazeera.net/aljazeerarss/a7c186be-1baa-4bd4-9d80-a84db769f779/73d0e1b4-532f-45ef-b135-bfdff8b8cab9 | |
| France 24 | France | 24 | https://www.france24.com/ar/rss | marque miroir |
| Euronews | Europe | 23 | https://arabic.euronews.com/rss?level=theme&name=news | marque miroir |
| CNN Arabic | États-Unis | 20 | https://arabic.cnn.com/api/v1/rss/rss.xml | |
| Arabi21 | Royaume-Uni | 15 | https://arabi21.com/feed | avance 0,8 h |
| DW Arabic | Allemagne | 13 | https://rss.dw.com/xml/rss-ar-all | |
| BBC Arabic | Royaume-Uni | 11 | https://feeds.bbci.co.uk/arabic/rss.xml | marque miroir |
| Al-Quds Al-Arabi | Royaume-Uni | 10 | https://www.alquds.co.uk/feed/ | |
| Alhurra | États-Unis | 3 | https://alhurra.com/feed | |
| RT Arabic | Russie · média d'État | 100 | https://rtarabic.com/rss/ | inclus par décision D6 ; 150 Ko, requêtes conditionnelles ; adresse testée `https://arabic.rt.com/rss/` (redirection) |
| ONU Info | Nations unies | 0 (week-end) | https://news.un.org/feed/subscribe/ar/news/all/rss.xml | complément |

## Annexe C — Adresses écartées (résumé)

- **Bloquées par un anti-robot (403/429)** : The Guardian Nigeria, TheCable, Daily Monitor, Addis Standard, The Herald, ZimLive, Sudan Tribune (EN), Ahram Online, Morocco World News,
  Seychelles News Agency, The Africa Report, IPP Media, Liberian Observer, Bawabet Ahram, Al-Rakoba, Hibapress, MAP Express, Independent Arabia, Al-Araby Al-Jadeed, Al Arabiya, Arab News, Asharq Business, Al Mayadeen.
- **Pas de flux à l'adresse testée (404, page HTML)** : Citi Newsroom, GhanaWeb, Ghana News Agency, Modern Ghana, The Star Kenya, The New Times, ChimpReports, News24, TimesLIVE, EWN, Mmegi, Awoko, The Point, The Standard Gambia,
  Hiiraan, CNBC Africa, Ecofin EN, ISS Africa, VOA, Semafor, Libya Observer (EN), Shorouk, Akhbar El Yom, Al Watan, Al Wasat, APS (arabe), Le360 (arabe), Alakhbar, Essirage, Alwihda, France 24 arabe par région, Monte Carlo Doualiya, TRT Arabi.
- **Injoignables (délai, DNS, TLS)** : News24 (domaine des flux), Foroyaa, Radio Tamazuj, CBC, Libya Al Ahrar, TAP (certificat), Assabah, El Khabar, AMI, ONU Info EN.
- **Langue ou contenu non conforme** : Caasimada (somali), Mimi Mefo Info (français), Afro Policy (anglais), Sudan Akhbar (un article), Jawhara FM (418 h sans article), Ethiopia Insight (268 h).
- RT Arabic, d'abord proposé à l'exclusion, est **réintégré** par la décision D6 (annexe B.3).
- **À recycler pour l'édition française** : Défi Media (Maurice, `https://defimedia.info/rss.xml`, 41 articles en 24 h).

Liste complète, statuts et temps de réponse : `.local-logs/editions-2026-10-11/result-*.json`.
