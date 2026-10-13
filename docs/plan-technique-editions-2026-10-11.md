> **État après EDI-903, 13/10/2026 : 43/43 tickets reçus.** D7/juridique validés par le propriétaire sur les textes actuels ; publication FR/EN/AR **f4d85931-e353-422e-bbe6-aa1476ab360a SUCCESS** sur Railway staging, 22 migrations, 646/646 fichiers, santé 200, 28 E2E +22 ignorés, 45 captures. Aucun commit/push ; index, sources FR, données, .env, tâche et cycle conservés. [Publication](publication-editions-edi903-2026-10-13.md), [passation actuelle](passation-editions-publication-2026-10-13.md). Les bilans « en attente/non autorisé » ci-dessous décrivent les états antérieurs.

# Africa Live — plan technique des éditions linguistiques (FR · EN · AR)

**Destinataire : l'agent codeur (LLM) qui implémente.** Rédigé le 11 octobre 2026 (Africa/Dakar), sur `main` à `ab9a6f7`,
avec un arbre volontairement sale (`.claude/` non suivi). **Aucun ticket n'est commencé.**

**Note d'exécution après réception E3 (12 octobre 2026) :** la phrase précédente décrit uniquement l'état initial à la rédaction du plan.
**E0 à E3, 27/43 tickets, sont vérifiés localement. Mise à jour du 12/10 au soir : E4 est fait techniquement ([réception E4](reception-editions-e4-2026-10-12.md)), EDI-404 attend la relecture native D7. Mise à jour du 13/10 : E5 reçu ([réception E5](reception-editions-e5-2026-10-13.md)) ; E6 attend son feu vert ; état courant dans la [passation du 13/10](passation-editions-2026-10-13.md).** Écart E5 : liens préfixés vers l'espace connecté jamais préchargés (le préchargement posait le cookie d'édition). Écarts E4 : police Cairo seule (31 Ko) au lieu de Noto Kufi + IBM Plex ; bandeau RTL par `marquee-scroll-rtl` plutôt que `animation-direction: reverse` ; barre média gardée LTR. Lire la [passation du 12/10](passation-editions-2026-10-12.md) et le backlog pour l'état courant ; ne pas reprendre les lots déjà reçus.
Écart reçu du § 1.1 : réécritures internes relatives par `next.config.ts` (afterFiles), redirections/authentification par le proxy.
Dictionnaires FR/EN prêts après E3 ; `EDITIONS=fr,en` active EN, AR reste masquée. E2 a reçu son feu vert et est terminé : [réception du moteur](reception-editions-e2-2026-10-11.md). E3 est reçu : [réception EN](reception-editions-e3-2026-10-12.md). E4 attend son feu vert. Les flux FR sont restés identiques sur décision du propriétaire ; R1–R5 attendent les mesures de semaine.

Documents liés :
- [Étude et décisions](<C:/Users/GAMER PC/Africa_Live_TV/docs/plan-editions-linguistiques-2026-10-11.md>) : constats sur le code, concept, **URL exactes des flux vérifiés (annexes A et B)**.
- [Backlog EDI](<C:/Users/GAMER PC/Africa_Live_TV/docs/backlog-editions-2026-10-11.md>) : tickets, dépendances, critères d'acceptation et état.
- [Prompt de reprise](<C:/Users/GAMER PC/Africa_Live_TV/docs/prompt-agent-editions-2026-10-11.md>).
- Preuves de l'étude (hors Git) : `.local-logs/editions-2026-10-11/` (`verify-feeds.mjs`, `feeds-*.txt`, `result-*.json`, `lang-stats.cjs`).

---

## 0. Mandat, décisions, règles

### 0.1 Objectif produit

Un sélecteur **Français · English · العربية** (landing, en-tête de `/app`, compte) ouvre une **édition**. Elle change la langue et le sens de l'interface,
**le bouquet RSS du Radar** (fil africain + « Regards sur le monde »), l'ordre des pays et des chaînes, les devises du bandeau, la ville météo par défaut,
le Flash Briefing, les écrans Clerk et les textes de partage. Restent communs : le compte, les favoris, les pays suivis, les droits, le paiement, le mode Éco
et le **catalogue TV complet, toujours visible** (l'édition réordonne, elle ne filtre jamais).

### 0.2 Décisions du propriétaire (définitives, ne pas les redemander)

| # | Décision |
|---|---|
| D1 | Trois éditions : `fr`, `en`, `ar`. Pas d'espagnol. Le portugais est hors périmètre. |
| D2 | Pays par défaut : `fr` → `SN` (Dakar), `en` → `NG` (Lagos), `ar` → **`DZ` (Alger), avec `MA` juste après** dans l'ordre « pays de l'édition ». Une seule constante par édition. |
| D3 | Arabe en chiffres occidentaux : `Intl` avec `ar-u-nu-latn`. |
| D4 | Éditions strictes (le fil ne mélange pas les langues) + **pont entre éditions** (E6). |
| D5 | Hors zone FCFA : prix toujours en FCFA, moyens de paiement dits clairement, carte bancaire mise en avant. **Aucune** modification de NabooPay, des montants, de la devise `XOF` (contrainte SQL `naboopay_transactions_currency_check`) ni des règles d'éligibilité. |
| D6 | **RT Arabic inclus** (`https://rtarabic.com/rss/`), origine affichée « Russie · média d'État ». Nom neutre ONU « Sahara occidental » / « Western Sahara » / « الصحراء الغربية ». |
| D7 | Relecteur arabe natif : **en attente**. Les textes arabes restent marqués « à relire » ; E4 ne peut pas être déclaré reçu sans cette relecture. |
| D8 | Ordre : E0 → E1 → E2 → E3 (anglais) → E4 (arabe) → E5 → E6. |

### 0.3 Méthode de travail imposée par le propriétaire

- **Un lot à la fois.** Au début du lot, annonce son plan en 5 lignes. À la fin, livre un bilan (fait / vérifié / limites, en disant honnêtement ce qui est simulé ou non vérifié),
  puis **attends le feu vert explicite** (« vert pour E2 ») avant le lot suivant. À l'intérieur d'un lot, les choix techniques réversibles ne demandent pas d'autorisation.
- **Le français reste identique à chaque lot** : mêmes libellés, mêmes pages, mêmes E2E. Si un libellé français change volontairement, mets à jour l'E2E concerné
  avec une assertion équivalente dans le même ticket ; n'affaiblis jamais un test.
- Fin de lot : `npx tsc --noEmit --incremental false`, `npm run lint`, `npm test`, `npm run test:invariants`, E2E pertinents (mode MVP **et** mode Clerk quand l'auth est touchée),
  `npm run build`, captures 360/768/1366 px, entrée datée dans `docs/production-progress.md`, backlog EDI mis à jour, dossier `docs/validation-editions-2026-10-11.md` et `contextellm.md` mis à jour.
- **Aucun commit, push ou déploiement sans demande explicite portant sur ces actions.** Une clôture documentaire ou une passation ne les autorise pas. Mettre à jour le bilan et le prompt de reprise à chaque lot.

### 0.4 Règles du dépôt (AGENTS.md, à relire)

- Next.js **16.3.8** : lis le guide installé avant d'écrire du code (`node_modules/next/dist/docs/01-app/02-guides/internationalization.md`,
  `03-api-reference/04-functions/next-root-params.md`, `03-api-reference/03-file-conventions/proxy.md`, `not-found.md`, `layout.md`, `route-groups.md`, `dynamic-routes.md`).
  Clerk **7.5.7** (`@clerk/nextjs`) et `@clerk/localizations` **4.9.0** (exports vérifiés : `frFR`, `enUS`, `enGB`, `arSA`).
- `C:/Users/GAMER PC/IPTV` intact ; base `africa_live_dev` ; serveur sur `localhost:3001`. Aucun secret affiché, aucune réécriture de `.env*`, aucun Git destructif.
- Aucun relais, conversion ou stockage média. Les images des flux restent des URL https de l'éditeur, jamais téléchargées.
- `e2e/fixtures` reste exclu de TypeScript et d'ESLint. Pas de nouvelle dépendance npm sans nécessité démontrée : Node 22 a l'ICU complet.
- Railway `just-compassion` = **staging**. Aucune action Railway, Clerk, DNS ou OVHcloud, aucune tâche Windows modifiée, aucun coût engagé.
- Migrations : seulement en E6 si l'option « colonne » est choisie ; additive ; sauvegarde locale vérifiée avant l'application locale ; `db:migrate:deploy` pour un futur déploiement.

### 0.5 Pièges connus du poste

- Le banc complet des composants vise **3001 en dur**. Ne le lancer qu'une fois ses propres serveurs arrêtés, sans stopper le serveur du propriétaire.
  Un banc ciblé peut utiliser le modèle `playwright.ticker.config.ts` (port 3002, `COMPONENT_TEST_PORT`) si les tests supportent ce port ; ce réglage seul ne déplace pas la suite complète.
- Le banc de composants (`e2e/components/server.mjs`) bundle les composants avec esbuild et des fausses versions de `next/link`, `next/navigation`, etc.
  **Tout hook i18n client doit fonctionner sans fournisseur** (repli sur le français), sinon les tests de composants existants cassent.
- Clerk réel est reçu dans **Edge avec la session existante** ; le navigateur intégré n'a pas fourni une connexion fiable. Le MVP couvre les vues locales mais ne remplace pas Clerk.
  Le compte local existant appartient au propriétaire : ne pas relancer les anciens scripts d'ajout/nettoyage d'utilisateur, ni `setup:local`. Les références pratiques actuelles sont dans la passation E3.
- Dernier artefact à la passation du 12/10 : `.next` construit avec `EDITIONS=fr`, mode Clerk. Reconstruire avec les valeurs du processus de réception voulu avant `next start` ; `.env*` et variables distantes restent intactes.
- `npm test` passe par `scripts/unit-network-guard.cjs` : **aucun accès réseau dans les tests unitaires**. Les vérifications de flux réelles se font par script, hors CI.
- Les `.ico` doivent contenir des PNG RGBA (sinon Turbopack répond 500 partout).
- Ne pas relancer `setup:local` sur l'installation existante.

---

## 1. Architecture cible

```
src/lib/editions.ts                registre des éditions, types, analyse, cookie, éditions actives (EDITIONS)
src/i18n/fr.ts                     dictionnaire de référence (forme = type Dictionary)
src/i18n/en.ts, ar.ts              `satisfies Dictionary` (une clé manquante casse tsc) — créés en E3 et E4
src/i18n/server.ts                 getDictionary(edition) côté serveur
src/i18n/client.tsx                I18nProvider, useI18n(), useEdition() — repli FR sans fournisseur
src/i18n/format.ts                 formats purs : dates, heures, nombres, relatif, pluriel, tri (Intl)
src/lib/text-normalize.ts          normalisation latine et arabe, découpage en mots, proclitiques
src/lib/country-lexicon/{fr,en,ar}.ts   alias pays (noms, capitales, gentilés, dirigeants)
src/lib/country-names.ts           noms des 55 pays par édition (FR = radar-countries ; EN/AR = tables générées + corrections)
src/lib/edition-affinity.ts        matrice pays ↔ langues de presse
src/lib/feeds/types.ts             FeedConfig étendu
src/lib/feeds/africa-{fr,en,ar}.ts, world-{fr,en,ar}.ts   registres des flux
src/lib/feed-dates.ts              adaptateurs de dates par flux
src/app/[edition]/…                arbre des pages et layouts déplacé (app/api reste à la racine)
src/proxy.ts                       résolution de l'édition + réécriture interne
```

### 1.1 Routage (Next 16, root params)

- Tout ce qui est rendu en HTML passe sous `src/app/[edition]/` : `layout.tsx` (racine, avec `<html lang dir>`), `page.tsx`, `error.tsx`, `loading.tsx`, `not-found.tsx`,
  `cgu/`, `privacy/`, `contact/`, `(clerk)/…`. Restent à la racine de `src/app` : `api/`, `global-error.tsx` (il porte son propre `<html>`), `globals.css`, et
  les fichiers de métadonnées (`manifest.ts`, `icon.png`, `apple-icon.png`, `favicon.ico`) **si** le build les sert toujours aux mêmes URL ; sinon, documente leur emplacement final.
- `[edition]/layout.tsx` : `import { edition } from 'next/root-params'`, `export const dynamicParams = false`, `generateStaticParams()` = éditions actives.
  Une valeur inconnue répond 404. Ajoute `app/global-not-found.tsx` avec `experimental.globalNotFound: true` (documenté dans `not-found.md`) si c'est nécessaire pour un 404 propre.
- **Adresses visibles :**
  - pages publiques (`/`, `/pricing`, `/cgu`, `/privacy`, `/contact`) : français sans préfixe ; `/en/…` et `/ar/…` explicites, qui correspondent directement à `[edition]` ;
  - espace connecté (`/app`, `/account`, `/admin`, `/player`, `/sign-in`, `/sign-up`, `/pricing/success|error`) : **adresses inchangées**, édition lue dans le cookie.
- **Proxy** (`src/proxy.ts`), sur les seules requêtes de page (`/api`, `/_next`, `/__clerk` et fichiers statiques exclus, comme aujourd'hui) :
  1. `/{fr}/…` visible → redirection 308 vers l'adresse sans préfixe, avec le cookie `al_edition=fr`.
  2. `/{en|ar}/<chemin public>` → passe tel quel (route `[edition]` native), si l'édition est active ; sinon 404.
  3. `/{en|ar}/<chemin connecté>` → cookie `al_edition` posé, redirection 307 vers `/<chemin connecté>` (un lien partagé `/ar/app/live` fonctionne).
  4. `<chemin public>` sans préfixe : cookie `en|ar` actif → 307 vers `/{cookie}<chemin>` ; sinon réécriture interne vers `/fr<chemin>`.
  5. `<chemin connecté>` sans préfixe → réécriture interne vers `/{cookie ou fr}<chemin>`.
  - La logique est une **fonction pure** `resolveEditionRequest({ pathname, cookie, enabled })` → `{ kind: 'pass' | 'rewrite' | 'redirect', target, setCookie? }`, couverte par des tests unitaires.
  - `isClerkFreePublicPage()` reçoit le **chemin sans préfixe**. Les trois branches (E2E anonyme, mode local, Clerk) appliquent la même résolution.
  - Avec Clerk, la réécriture est renvoyée depuis le gestionnaire de `clerkMiddleware` (`return NextResponse.rewrite(url)` après `auth.protect()`), à vérifier sur les types de Clerk 7.5.7.
    Le post-traitement actuel ne retire `x-middleware-rewrite` que si la cible a le même chemin que la requête : la cible `/fr/app/live` est différente, donc conservée. **À prouver par test.**
- Cookie `al_edition` : `Path=/; Max-Age=31536000; SameSite=Lax`, `Secure` en https ; valeurs `fr|en|ar` ; une valeur invalide est ignorée.
- **Option écartée** : lire `cookies()` dans le layout racine. Toutes les pages deviendraient dynamiques et l'on perdrait l'ISR de la landing sans Clerk (UX-603).

### 1.2 Éditions actives

- Variable serveur `EDITIONS` (liste séparée par des virgules ; défaut `fr` ; `fr` toujours inclus ; valeur inconnue ignorée avec un avertissement structuré).
  Lue par le proxy et par `[edition]/layout.tsx`, qui transmet la liste au client par le fournisseur (pas de `NEXT_PUBLIC_`).
- Avec `EDITIONS=fr`, l'application doit être **fonctionnellement et visuellement identique** à aujourd'hui (sélecteur masqué). C'est le critère de non-régression de E1.
- Ajoute `EDITIONS` à `src/lib/server-environment.ts` et `src/scripts/check-environment.ts` (validation), et dans `docs/environment-matrix.md` (documentation seulement ; aucune variable Railway modifiée).

### 1.3 Dictionnaires et formats

- `src/i18n/fr.ts` exporte un objet `as const` structuré par espaces (`shell`, `radar`, `tv`, `player`, `search`, `share`, `account`, `pricing`, `landing`, `legal`, `errors`, `briefing`, `weather`, `markets`).
  `type Dictionary = DeepStringShape<typeof fr>` (feuilles `string` ou fonctions de format typées).
- Messages à variables : fonctions pures (`(n: number) => string`) ou gabarits `{name}` résolus par un `format()` minimal. Pluriels avec `Intl.PluralRules(edition.intl)` :
  l'arabe a six catégories (`zero, one, two, few, many, other`).
- `getDictionary(edition)` côté serveur. Côté client, `I18nProvider` reçoit uniquement les espaces utiles depuis le layout serveur, pour limiter le JavaScript.
  `useI18n()` sans fournisseur renvoie le dictionnaire français et l'édition `fr`.
- `src/i18n/format.ts` remplace les 25 locales `'fr-FR'`/`'fr'` en dur hors tests (liste en § 3, EDI-106). **La sortie française doit rester identique au caractère près** :
  `public-stats.ts` utilise volontairement une espace insécable, et `radar-data.ts` fixe `Africa/Dakar` ; conserve ces comportements.
- Commentaires de code : ils restent en français. Seuls les textes **visibles** passent au dictionnaire.
- Messages d'API : le serveur garde un `code` stable et son message français (compatibilité) ; le client affiche le message de son dictionnaire selon le `code`.

### 1.4 Collecteurs par édition

- `FeedConfig` (dans `src/lib/feeds/types.ts`, réexporté par `rss-collector-types.ts`) gagne :
  `edition: Edition`, `origin: string` (pays ou nature du média, affiché), `role: 'national' | 'panafrican' | 'international'`, et en option
  `timeZone?: string` (dates sans fuseau), `wallClockTimeZone?: string` (heure locale publiée comme UTC : on ignore le décalage déclaré),
  `dateFormat?: 'rfc' | 'arabic-long' | 'us-12h' | 'hm-pipe-dmy'`, `charset?: string`.
- `RSS_FEEDS` et `WORLD_FEEDS` restent exportés et **désignent les registres français** : les tests existants (`rss-collector.test.ts` compte 6 flux internationaux,
  `rss-regressions.test.ts` prend `RSS_FEEDS[0]`, `rss-image.test.ts` cherche `aps`) passent sans changement.
- Caches, collectes en cours (`inFlight`) et « dernier bon relevé » (45 min) **par édition** (`Map<Edition, …>`). `feedCache` reste indexé par l'identifiant du flux (unique entre éditions : préfixe `en-`, `ar-`).
- Au plus **8 flux lus en parallèle** par collecte (limiteur simple, sans dépendance). Requêtes conditionnelles : mémoriser `ETag`/`Last-Modified` par flux ;
  un 304 réutilise les articles en cache et rafraîchit `savedAt`.
- Les libellés de disponibilité aujourd'hui écrits en dur côté serveur (`'Afrique · dépêches'`, `'Monde · …'`) deviennent des clés ou passent par le dictionnaire serveur de l'édition.
- API : `GET /api/live/rss?edition=`, `GET /api/live/world?edition=`, `GET /api/live/briefing?edition=` (validation par énumération).
  **Sans paramètre → `fr`** (réponse identique à aujourd'hui, pour les anciens onglets). Valeur inconnue ou édition inactive → 400, `code: 'EDITION_UNAVAILABLE'`.
  Quotas (`authorizeAppRequest`) inchangés. `Cache-Control: private, no-store` conservé.

### 1.5 Moteur linguistique

- **Dates** (`src/lib/feed-dates.ts`) : formats mesurés le 11/10 :
  Youm7 « الأحد، 11 أكتوبر 2026 08:50 م » (mois égyptiens, marqueur ص/م, heure du Caire) ; Masrawy « 10/11/2026 8:25:50 PM » (mois/jour, sans fuseau, Le Caire) ;
  El Bilad « 17:24 | 11-10-2026 » (Alger) ; Punch « +0000 » alors que l'heure est celle de Lagos ; Daily Maverick (Johannesburg), Cairo24 (Le Caire) et Arabi21 (Londres) en avance de la même façon.
  Prévois aussi les mois levantins (كانون الثاني…) et maghrébins (جانفي، فيفري، مارس، أفريل، ماي، جوان، جويلية، أوت، سبتمبر، أكتوبر، نوفمبر، ديسمبر).
  Les fuseaux se calculent avec `Intl.DateTimeFormat(..., { timeZone })`, ce qui gère l'heure d'été (Égypte, Royaume-Uni).
  **Garde générique** au niveau du collecteur (pas dans `temporalWindow`, partagé par d'autres données) : une date future de 3 h au plus est ramenée à l'heure de collecte ;
  au-delà, elle reste « future » comme aujourd'hui. Ce changement touche aussi les flux français : il est volontaire, testé et noté dans le dossier de validation.
- **Encodage** : décoder selon `charset` (en-tête, puis prologue XML, puis `feed.charset`), avec `new TextDecoder(label)` et repli UTF-8. La limite de 1 Mo reste comptée en octets.
- **Normalisation** (`src/lib/text-normalize.ts`) :
  - latine : comportement actuel conservé (NFKD, sans accents, minuscules, apostrophes et tirets → espace) ;
  - arabe : retirer les voyelles (U+064B–U+065F, U+0670) et le tatweel (U+0640) ; أ إ آ ٱ → ا ; ى → ي ; ة → ه ; chiffres ٠–٩ et ۰–۹ → 0–9 ;
  - découpage en mots ; pour l'arabe, retrait des proclitiques (`وال`, `بال`, `فال`, `كال`, `لل`, `ال`, `و`, `ف`, `ب`, `ل`, `ك`) en gardant un radical d'au moins 2 lettres ;
  - **comparaison mot par mot, jamais en sous-chaîne.**
- **Lexiques des pays** :
  - `fr.ts` = `COUNTRY_KEYWORDS` actuel déplacé tel quel, plus les `EXTRA_ALIASES` de `world-desk-data.ts` ;
  - `en.ts` et `ar.ts` : base **générée une fois** par un script (`Intl.DisplayNames(['en'|'ar'], { type: 'region' })`), écrite en TypeScript statique (le navigateur n'a pas toujours le même ICU),
    puis complétée à la main (capitales, gentilés, dirigeants, noms usuels : « DR Congo », « DRC », « Ivory Coast », « جمهورية الكونغو الديمقراطية », « ساحل العاج »…).
  - Pièges qui doivent avoir un test : « Guinea » face à « Equatorial Guinea », « Guinea-Bissau » et « Papua New Guinea » ; « Niger Delta » et « Niger State » → `NG` ;
    « Chad » prénom ; « Congo » seul ambigu ; « Sudan » / « South Sudan » ; « مصر » dans « مصرف » ; « المغرب » (Maroc, Maghreb, prière) ; « الصحراء » (désert ou Sahara occidental) ;
    « النيجر » / « نيجيريا » ; « السودان » / « جنوب السودان ».
  - API : `detectCountryCode(text, defaultCountry, edition = 'fr')` et `africanMentions(title, edition = 'fr')` ; le comportement français est inchangé.
- **Rubriques** (`radar-topics.ts`) et **recherche** (`normalizeSearchText`, `matchesRadarQuery`) par édition. Aujourd'hui, une recherche en arabe ne filtre rien :
  test qui échoue avant, réussit après.
- **Régions du monde** (`world-desk-data.ts`) : `REGION_KEYWORDS` par langue. Tous les flux « monde » arabes sont généralistes : la région se déduit du titre, et un titre arabe ne doit plus devenir vide.
- **Critère mesurable** : sur 200 titres réels étiquetés par édition (fixtures E0), au moins **90 %** de pays exacts, et zéro faux positif sur la liste de pièges.

### 1.6 Interface droite → gauche (arabe)

- `<html lang="ar" dir="rtl">` côté serveur.
- Conversion des ~300 classes directionnelles dans 31 fichiers (`ml-/mr-/pl-/pr-/left-/right-/text-left/text-right/rounded-l|r…/border-l|r…/space-x-*`) en classes logiques
  de Tailwind 4 (`ms-/me-/ps-/pe-/start-/end-/text-start/text-end/rounded-s|e…/border-s|e…`). C'est sans effet en LTR : captures françaises **identiques avant et après**.
  Les positionnements volontairement physiques (carte, mini-courbes, contrôles média) restent physiques, avec un commentaire.
- Icônes de direction (flèches, chevrons) : `rtl:-scale-x-100`. Jamais le bouton lecture, le logo, la carte ni les courbes.
- Bandeau (`.animate-marquee`, `@keyframes marquee-scroll` dans `globals.css`) : `[dir='rtl'] .animate-marquee { animation-direction: reverse; }`. Revérifie la distance mesurée et l'arrêt au survol.
- Police arabe via `next/font/google`, `subsets: ['arabic']`, appliquée seulement quand `edition === 'ar'`, avec `preload: false` si elle est déclarée dans un module commun.
  Par exemple Noto Kufi Arabic pour les titres et IBM Plex Sans Arabic pour le texte ; **mesure le poids transféré** sur la landing et le Radar, en Éco.
- Textes mixtes : `<bdi>` autour des noms de source, des pays et des prix ; `unicode-bidi: plaintext` sur les titres d'articles.

---

## 2. Données à reprendre de l'étude

- **URL des flux** : annexes A (anglais) et B (arabe) de l'étude. Reprends l'URL **finale** indiquée (après redirection). Défi Media (Maurice, `https://defimedia.info/rss.xml`) est un candidat pour l'édition française, à proposer au propriétaire, non activé d'office.
- **Origines à afficher** : celles des tableaux B.2 et B.3 (Qatar, Arabie saoudite, Émirats, Royaume-Uni, France, Allemagne, États-Unis, Turquie, Russie · média d'État, Nations unies).
- **Flux avec correction de date** : Punch (`wallClockTimeZone: 'Africa/Lagos'`), Daily Maverick (`Africa/Johannesburg`), Cairo24 (`Africa/Cairo`), Arabi21 (`Europe/London`) ;
  Masrawy (`dateFormat: 'us-12h'`, `timeZone: 'Africa/Cairo'`) ; Youm7 (`arabic-long`, `Africa/Cairo`) ; El Bilad (`hm-pipe-dmy`, `Africa/Algiers`).
  **Remesure chaque cas avec le script avant de le coder** : les décalages observés ont été mesurés un seul jour.
- **Gros flux** : MyJoyOnline (438 Ko), The Citizen ZA (455 Ko), Asharq Al-Awsat (294 Ko), RT Arabic (150 Ko). Requêtes conditionnelles obligatoires ; pour Asharq, évalue les flux de rubrique (`/feed/africa` est vérifié).
- **Catalogue TV** (lecture seule, 11/10) : 419 chaînes africaines, dont 176 `eng`, 161 `fra`, 62 `ara`, 11 `por`, 6 `spa` ; catalogue entier : 3 173 `eng`, 546 `fra`, 392 `ara` ; 2 829 sans langue.

---

## 3. Lots et tickets

Chaque ticket : reproduction ou test rouge d'abord quand c'est un défaut, puis implémentation, contrôle positif et tests. Les identifiants correspondent au backlog.

### E0 — Préparation (petit)

**EDI-000 — Référence.** Relève `git status --short`, le listener 3001 (sans l'arrêter) et les totaux de référence (`npm test`, `tsc`, `lint`).
Crée `docs/validation-editions-2026-10-11.md` (journal : commandes, modes, résultats, cas ignorés, limites).

**EDI-001 — Vérification des flux versionnée.** Transforme `.local-logs/editions-2026-10-11/verify-feeds.mjs` en `src/scripts/verify-feeds.ts`
(`npm run feeds:verify -- --edition en|ar|fr|all [--out <dossier>]`). Le script lit les registres `src/lib/feeds/*` dès qu'ils existent ; d'ici là, une liste en argument.
Il contrôle le statut, le format, le nombre d'articles, les articles des 24 dernières heures, l'âge et l'avance du plus récent, l'encodage, la langue réelle et la taille.
Sortie JSON dans `.local-logs/feeds-verify/<date>/` (hors Git). Même User-Agent que l'application. Jamais lancé par la CI ni par `npm test`.
Acceptation : relance sur les annexes A et B et écarts signalés (un flux peut avoir changé depuis le 11/10).

**EDI-002 — Échantillons de test.** `src/lib/fixtures/editions/titles-en.json` et `titles-ar.json` : environ 200 titres réels par édition, pris dans les flux vérifiés,
chacun annoté avec le pays attendu (ou `null`) et la région du monde attendue pour les flux « monde ». Plus des fichiers XML **synthétiques** reproduisant les formats de date ou d'encodage
(`windows-1256`), sans recopier d'articles. Ces fichiers ne sont pas dans `e2e/fixtures`, donc ils restent dans TypeScript et ESLint.
Acceptation : annotations relues ; les pièges du § 1.5 sont présents.

### E1 — Socle invisible (moyen à grand)

**EDI-101 — Registre des éditions.** `src/lib/editions.ts` : `Edition`, `EDITIONS` (`label`, `dir`, `intl`, `clerk`, `defaultCountry`, `secondaryCountries`, `worldOrder`, `weatherDefault`),
`isEdition()`, `parseEditionCookie()`, `enabledEditions(env)`, `EDITION_COOKIE = 'al_edition'`. Valeurs de D2 et D3.
Tests unitaires : analyse, valeurs invalides, `fr` toujours actif.

**EDI-102 — Preuve technique `app/[edition]`.** Déplace les pages et layouts (§ 1.1) sans changer leur contenu. `next/root-params`, `dynamicParams = false`, `generateStaticParams`,
`global-not-found` si nécessaire, métadonnées et icônes.
Mesures : la table de build montre la landing statique ou ISR pour chaque édition active ; `/app/*` reste dynamique comme avant ; aucun écart de rendu en français.
Si la preuve échoue, **arrête-toi et rends compte** avant toute alternative.

**EDI-103 — Proxy et cookie.** `resolveEditionRequest()` pure, puis intégration dans les trois branches de `src/proxy.ts` (§ 1.1).
Tests unitaires de la fonction : la table des cinq cas × cookie (absent, `fr`, `en`, invalide) × éditions actives.
E2E : `/` en français ; `/en` 404 tant que `EDITIONS=fr` ; `/app/live` connecté (MVP et Clerk) ; redirection de connexion `/sign-in?redirect_url=/app/live` inchangée ;
API non réécrites ; `sw.js`, icônes et `manifest` servis.

**EDI-104 — Infrastructure i18n.** `src/i18n/{fr,server,client,format}.ts(x)` (§ 1.3). Fournisseur posé dans `[edition]/layout.tsx` (espaces publics) et dans
`(clerk)/app/layout.tsx` (espaces de l'application), avec la liste des éditions actives. `useI18n()` se replie sur le français sans fournisseur.
Tests unitaires : pluriels arabes (0, 1, 2, 3, 11, 100), formats `ar-u-nu-latn` (chiffres occidentaux), `en-GB` (jour/mois), sortie française identique aux formats actuels.

**EDI-105 — Extraction française du shell et du Radar.** Remplace les textes visibles de `src/components/shell/*` et `src/components/radar/*`, de `LiveRadarDashboard.tsx`
et des libellés client de `src/lib` (`relative-time.ts`, `radar-time-groups.ts`, `radar-topics.ts` (libellés), `shell-nav.ts`, `country-grid.ts` (libellés), `market-format.ts`,
`market-geography.ts` (phrase), `weather-alert.ts`, `world-desk-data.ts` (`WORLD_REGIONS`)) par `fr.ts`. **Aucun changement visible.**
Acceptation : tous les E2E existants qui lisent ces libellés passent sans modification ; une recherche de chaînes accentuées dans ces dossiers ne trouve plus que des commentaires.

**EDI-106 — Locales en dur.** Remplace les 25 occurrences hors tests :
`account/page.tsx:56`, `LiveRadarDashboard.tsx:134`, `global-error.tsx:11`, `layout.tsx:64` (devenu `[edition]/layout.tsx`), `manifest.ts:9`, `AdminSupportQueue.tsx:128,136`,
`FilterSidebar.tsx:194,214`, `FlashBriefingModal.tsx:101`, `WeatherCard.tsx:115,175`, `WorldDesk.tsx:19`, `catalog-metadata.ts:26`, `clock.ts:6,26`, `country-grid.ts:52`,
`country-picker.ts:61`, `format.ts:1,2`, `market-format.ts:3,5,11`, `market-geography.ts:28`, `public-stats.ts:55`, `radar-data.ts:88`, `radar-time-groups.ts:57`, `weather-contract.ts:14`.
`weather-contract.ts` (validation de fuseau) et l'administration (outil interne) peuvent rester en français : justifie-le dans le dossier.
Sortie française identique, tests existants verts.

**EDI-107 — Réception E1.** Contrôles globaux du § 0.3, captures françaises 360/768/1366 comparées à celles d'avant le lot, `EDITIONS=fr` puis `EDITIONS=fr,en` (avec seulement `fr.ts` : le build doit refuser ou masquer `en` proprement ; documente le choix).

### E2 — Moteur multilingue côté serveur (moyen)

**EDI-201 — Registres de flux.** `src/lib/feeds/types.ts`, `africa-fr.ts` et `world-fr.ts` (déplacement **à l'identique** des listes actuelles, avec `edition`, `origin`, `role`),
`africa-en.ts`, `world-en.ts`, `africa-ar.ts`, `world-ar.ts` (annexes A et B, `enabled: true` pour les flux « noyau », compléments activés aussi s'ils tiennent la charge).
RT Arabic dans `world-ar.ts`, origine « Russie · média d'État ». Alias `RSS_FEEDS`/`WORLD_FEEDS` = français.
Test : identifiants uniques entre toutes les éditions ; URL https sauf exception documentée (`times.co.sz` en http seulement) ; chaque flux a une origine.

**EDI-202 — Collecteurs par édition.** `rss-collector.ts` et `world-desk.ts` (§ 1.4) : caches, collectes en cours, limiteur à 8, requêtes conditionnelles, libellés de disponibilité.
Tests : deux éditions collectées en parallèle ne partagent ni cache ni résultat ; un 304 réutilise le cache ; `getRadarRss()` sans édition = comportement actuel (tests existants intacts).

**EDI-203 — API.** `?edition=` sur `/api/live/rss`, `/api/live/world` et `/api/live/briefing` (clé de cache du briefing : `edition|pays`).
Tests (sur le modèle de `radar-access.test.ts`) : absent → `fr`, `en` actif → bouquet anglais, inconnu ou inactif → 400 `EDITION_UNAVAILABLE`, refus d'accès inchangés.

**EDI-204 — Dates.** `feed-dates.ts` + options par flux + garde générique de 3 h (§ 1.5). Tests sur les XML synthétiques d'EDI-002 : chaque format, heure d'été du Caire,
déclaration UTC trompeuse, date future de 2 h ramenée, de 5 h laissée « future ».

**EDI-205 — Encodage.** `readBoundedText` décode selon le `charset`. Tests : `windows-1256` (en-tête, prologue), étiquette inconnue → UTF-8, limite d'1 Mo inchangée.

**EDI-206 — Normalisation et lexiques.** `text-normalize.ts`, `country-lexicon/{fr,en,ar}.ts`, script de génération (versionné dans `src/scripts/`, lancé une fois).
`detectCountryCode` et `africanMentions` prennent l'édition. Tests : pièges du § 1.5, critère de 90 % sur les fixtures, et **sortie française identique**
sur les fixtures existantes de `rss-regressions.test.ts` et `world-desk.test.ts`.

**EDI-207 — Rubriques et recherche.** Expressions par langue dans `radar-topics.ts` (anglais : election, president, parliament, inflation, attack, army, football, AFCON… ;
arabe : انتخابات، رئيس، حكومة، برلمان، اقتصاد، تضخم، هجوم، الجيش، كرة القدم، كأس أمم أفريقيا…).
`normalizeSearchText` et `matchesRadarQuery` selon l'édition. Tests : recherche arabe réelle, mots courts sans faux positifs.

**EDI-208 — Régions du monde.** `REGION_KEYWORDS` en anglais et en arabe ; `inferWorldRegion(title, edition)` ; `parseWorldSnapshot` inchangé.
Test : un titre arabe généraliste sur Gaza → `moyen-orient` ; sur Kyiv → `europe` ; sans indice → écarté s'il ne touche pas l'Afrique.

**EDI-209 — Réception E2.** Relance de `feeds:verify` sur tous les registres ; tests unitaires ; aucune différence de réponse en français sans paramètre
(comparaison de forme et d'ordre sur un même jeu de flux simulés) ; mesure de la durée d'une collecte complète par édition et de la mémoire.

### E3 — Édition anglaise (grand)

**EDI-301 — Édition côté client.** `useRadarData`, `useWorldDesk`, `useFreshArticles`, `useRadarVisit`, `useLiveMarkets` et la modale de briefing reçoivent l'édition
(`?edition=` dans les appels ; clés locales par édition : `al_radar_visit:en`, etc. ; favoris, pays suivis et Éco restent globaux).

**EDI-302 — Sélecteur.** `EditionSwitcher` (bouton globe dans `AppHeader`, section dans `AccountPreferences`, sélecteur et ligne sous l'accroche sur la landing).
Options écrites dans leur langue (`lang` et `dir` par option), **sans drapeaux**, rôle `radiogroup`, clavier. Choix → cookie, puis navigation complète vers la même adresse
(nécessaire pour `dir` et les polices). Masqué si une seule édition est active.

**EDI-303 — Traduction anglaise.** `src/i18n/en.ts` complet (`satisfies Dictionary`). Extraction française et traduction des espaces restants : TV (`src/components/tv`, `ChannelGrid`, `FilterSidebar`, `CategoryTabs`),
lecteur (`src/components/player`, `Player.tsx`, `AnchoredPlayer.tsx`, `SeparatePlayerPage.tsx`), recherche, partage, compte, tarifs, pages d'erreur.
Clerk : `clerkLocalization` selon l'édition (`enGB` + libellés de marque). Vocabulaire du § 2.6 de l'étude. L'administration reste en français.

**EDI-304 — Pays, langues, TV.** `country-names.ts` (noms par édition, corrections : « DR Congo », « Republic of the Congo », « Western Sahara »), tri avec `Intl.Collator(edition.intl)`.
`edition-affinity.ts` (matrice de l'étude, § 2.3). Grille des pays : pays suivis, puis pays de l'édition (`defaultCountry`, puis `secondaryCountries`), puis l'ordre actuel.
Météo par défaut : `edition.weatherDefault` (remplace `'SN'` dans `LiveRadarDashboard.tsx:66`). TV : `DEFAULT_FOLLOWED_COUNTRY` (`tv-rows.ts:8`) par édition ;
dans un pays, les chaînes de la langue de l'édition (`eng`/`ara`/`fra`, codes ISO 639-3 de la colonne `language`) passent d'abord ; **aucun filtre imposé**.
Noms de langues des chaînes avec `Intl.DisplayNames(edition)`.

**EDI-305 — Marchés et météo.** Paires ajoutées côté serveur à partir du même appel `open.er-api.com` (`live-markets.ts`, fonction `forex`) : USD/NGN, USD/GHS, USD/KES, USD/ZAR,
USD/DZD, USD/MAD, USD/TND, USD/EGP. Le bandeau montre celles de l'édition (FR : actuel ; EN : NGN, GHS, KES, ZAR ; AR : DZD, MAD, TND, EGP).
Noms des produits par symbole dans le dictionnaire (aujourd'hui « Riz », « Blé »… viennent du serveur). Météo : le client traduit à partir du code WMO plutôt que du texte français
du serveur (vérifie `weather-adapters.ts` et le contrat ; ajoute le code au contrat seulement de façon additive).

**EDI-306 — Briefing.** Gabarits de `live-briefing.ts` dans le dictionnaire serveur ; moteur heuristique inchangé ; aucune API payante.

**EDI-307 — Paiement (D5).** Pages tarifs et compte en anglais : prix en FCFA, « Paiement par Wave, Orange Money (Sénégal et zone UEMOA) ou carte bancaire internationale »,
carte mise en avant. Aucune modification de `naboopay*`, des montants, de la devise ou de l'éligibilité.

**EDI-308 — Réception E3.** `EDITIONS=fr,en`. Nouveau `e2e/editions.spec.ts` : cookie `en` → `html[lang=en]`, Radar en anglais, appels `?edition=en` (routes simulées),
sélecteur aller-retour, landing `/en`, `/` français. Composants : `useI18n` sans fournisseur. Captures 360/768/1366 en anglais et en français, Éco, mouvement réduit.
Tous les E2E français existants verts.

### E4 — Édition arabe (grand)

**EDI-401 — Classes logiques.** Conversion (§ 1.6) par script de remplacement relu fichier par fichier ; captures françaises **identiques** avant et après.

**EDI-402 — Sens, police, bidi.** `dir="rtl"`, police arabe chargée en arabe seulement (poids mesuré), icônes de direction, bandeau inversé, `<bdi>`, formats `ar-u-nu-latn`.

**EDI-403 — Traduction arabe.** `src/i18n/ar.ts` complet, en arabe standard moderne, marqué « à relire » (D7). Clerk `arSA` (rendu droite → gauche de ses écrans vérifié en vrai).
Nom neutre du Sahara occidental partout.

**EDI-404 — Réception E4.** `EDITIONS=fr,en,ar`. E2E : `html[dir=rtl]`, aucun défilement horizontal à 360 px (`document.documentElement.scrollWidth <= innerWidth`),
direction du bandeau, recherche arabe, « Regards sur le monde » rempli par déduction de région. Captures 360/768/1366. **Reçu seulement après la relecture native (D7).**

### E5 — Pages publiques et partage (moyen)

**EDI-501 — Pages publiques.** `/en`, `/ar` : landing, CGU, confidentialité, contact, tarifs (statiques par édition). `generateMetadata` par édition,
`alternates.languages` (`fr` → `/`, `en` → `/en`, `ar` → `/ar`, `x-default` → `/`), canonique.
Images d'aperçu `public/og-image-en.png` et `og-image-ar.png` (1200 × 630, même charte que `og-image.png`). Le manifeste reste français : documente cette limite.

**EDI-502 — Partage.** `share-links.ts` : textes WhatsApp/Facebook selon l'édition (`channelShare(input, edition)`), lien `/ar/…` ou `/en/…` pour les pages publiques.

**EDI-503 — Suggestion de langue.** Première visite : si `navigator.languages` préfère `en` ou `ar` et qu'aucun cookie n'existe, une bannière discrète propose l'édition.
Fermeture mémorisée en local. Jamais de redirection automatique.

**EDI-504 — Textes juridiques.** CGU et confidentialité traduites, avec « La version française fait foi ». Signale au propriétaire qu'une relecture juridique est conseillée.

**EDI-505 — Réception E5.** Build : pages publiques statiques par édition ; aperçus WhatsApp (balises OG) contrôlés ; `hreflang` présents.

### E6 — Ponts et finitions (moyen)

**EDI-601 — Pont entre éditions.** Le serveur ajoute à la réponse RSS, **à partir des seuls caches encore valides des autres éditions** (aucune collecte déclenchée),
le nombre de dépêches par pays. Le client affiche « {Pays} se raconte surtout en {langue} : {n} dépêches dans l'édition {x} → » quand l'édition courante a moins de 3 dépêches
sur le pays choisi et l'autre au moins 5. Le geste pose le cookie et ouvre `/app/live?country=XX`.

**EDI-602 — Halo de la sphère.** Au changement d'édition, la carte allume une fois les pays de la sphère (`edition-affinity.ts`). Rien en Éco ni en mouvement réduit.

**EDI-603 — Choix mémorisé dans le compte.** Proposer au propriétaire : colonne additive `users.preferred_edition` (migration, sauvegarde, `db:migrate:deploy` au déploiement)
ou métadonnées Clerk. **N'implémente qu'après sa décision.**

**EDI-604 — Cycle de vérification.** Préparer l'ajout de `feeds:verify` au cycle de 15 jours (`.local-logs/stream-cycle/run-cycle.cjs`), **sans modifier la tâche Windows** sans accord explicite.

### E9 — Réception globale et publication

**EDI-901 — Réception globale locale.** Tous les contrôles du § 0.3 avec `EDITIONS=fr,en,ar`, plus `EDITIONS=fr` (identité avec l'existant).

**EDI-902 — Dossier et passation.** Dossier de validation complet, tableau ticket → preuve, limites, `contextellm.md`, backlog, prompt de reprise.

**EDI-903 — Publication staging.** **Conditionnelle, non autorisée** : uniquement sur demande explicite, avec la procédure habituelle
(scripts `.local-logs/publication-*`, preuve SHA, santé, E2E distants). La variable `EDITIONS` sur Railway est une configuration distante : demande l'accord avant de la poser.

---

## 4. Matrice de non-régression

| Domaine | Contrôle |
|---|---|
| Français | `EDITIONS=fr` : rendu, libellés, E2E et captures identiques à `ab9a6f7` |
| Landing | Statique/ISR au build, aucun JavaScript Clerk, chiffres publics après la première régénération |
| Auth | Redirections Clerk, refus anonymes (401/307), mode MVP local, mode E2E anonyme |
| Radar | Fil, À la une, pastille, pays, carte, météo collante, bandeau (deux lignes, arrêt au survol, Éco), « Regards sur le monde » |
| API | `?edition` absent = réponse actuelle ; quotas et `Cache-Control` inchangés |
| TV | Catalogue complet, filtres, favoris, dock, lecture navigateur/VLC, mur TV |
| Paiement | Aucune modification fonctionnelle (D5) ; E2E `payment` verts |
| Données | Aucune migration avant E6 ; empreintes catalogue/favoris inchangées |

## 5. Commandes de référence

```bash
npm run lint
npx tsc --noEmit --incremental false
npm test
npm run test:invariants
npm run build
npx playwright test e2e/auth-entry.spec.ts e2e/catalogue.spec.ts e2e/payment.spec.ts e2e/radar-reliability.spec.ts e2e/account-controls-hydration.spec.ts
npx playwright test -c playwright.ticker.config.ts
npm run feeds:verify -- --edition all
```

Les E2E « sensibles » de la CI (`tv-workspace`, `player-dock`, `followed-countries`, `universal-search`…) demandent le compte de test isolé
(`npx tsx src/scripts/ui-fixture-user.ts --catalog`, puis `--cleanup`) : suis `.github/workflows/ci.yml` et nettoie ce que tu crées.
