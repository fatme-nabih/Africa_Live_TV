# Réception E2 — moteur des éditions, 11 octobre 2026

**EDI-201 à EDI-209 terminés et vérifiés localement après « vert pour E2 ».** E0/E1 conservés, aucun commit, push, migration ou déploiement.
Le propriétaire a choisi de **conserver les flux FR pour E2** et de reporter R1–R5 aux mesures de semaine. E3 attend son feu vert.

## Livrables

| Ticket | Résultat reçu |
| --- | --- |
| EDI-201 | Six registres `src/lib/feeds/{africa,world}-{fr,en,ar}.ts`, types et index. 36 flux FR, 85 EN, 41 AR ; identifiants uniques, éditions/origines/rôles explicites. Listes FR, ordre, identifiants et URL conservés ; `RSS_FEEDS`/`WORLD_FEEDS` sont leurs alias. RT Arabic présent, origine « Russie · média d'État ». Exception HTTP de Times of Eswatini documentée. Eye Radio présent mais désactivé après dépassement de 8 s. |
| EDI-202 | Cache et collecte en cours par édition ; derniers relevés de flux réutilisables 45 min ; limite de 8 lectures simultanées par collecte. ETag/Last-Modified, 304 et rafraîchissement du dernier succès. Petit dictionnaire serveur des disponibilités ; sorties FR conservées. Disponibilités des homonymes The Citizen TZ/ZA rattachées au flux, sans recherche par nom (régression rouge puis verte). Al Jazeera English et Anadolu AR généralistes filtrés sur les titres parlant de l'Afrique dans le bouquet africain. |
| EDI-203 | Paramètre `edition` sur RSS, monde et briefing, après autorisation/quota. Absent → FR ; inconnu/inactif → 400 `EDITION_UNAVAILABLE`, réponse privée sans cache. Briefing isolé par `edition|pays`. |
| EDI-204 | `feed-dates.ts`, sept adaptateurs remesurés avant codage : Punch/Lagos, Daily Maverick/Johannesburg, Cairo24/Caire, Arabi21/Londres, Masrawy américain 12 h, Youm7 arabe, El Bilad heure/date. Mois égyptiens, levantins et maghrébins ; DST par ICU. Avance ≤ 3 h ramenée à l'heure de collecte RSS, y compris FR ; plus grande avance laissée future. `temporalWindow` inchangé. |
| EDI-205 | `feed-text.ts` : décodage HTTP > prologue XML > configuration du flux > UTF-8 ; étiquette inconnue → UTF-8. Limite inchangée de 1 000 000 octets, y compris corps découpé et longueur HTTP mensongère. |
| EDI-206 | Lexiques FR déplacés sans changer les règles ; noms EN/AR générés une fois avec ICU Node 22, puis alias éditoriaux statiques. Normalisation arabe et comparaison de mots/proclitiques, protection des homonymes. Détection et mentions africaines prennent l'édition. |
| EDI-207 | Rubriques EN/AR et recherche arabe effective, chiffres occidentaux/orientaux et proclitiques. Ancienne recherche arabe vide reproduite sur le source HEAD ; nouvelle régression reçue. Recherche FR inchangée. |
| EDI-208 | Régions EN/AR ; Gaza → Moyen-Orient, Kyiv → Europe ; généraliste sans région ni mention africaine écarté. Régions déclarées par l'éditeur prioritaires. Contrat `parseWorldSnapshot` conservé. |
| EDI-209 | Mesures réelles des 162 flux et des collectes, comparaison exacte FR sur flux simulés, contrôles et captures ci-dessous. |

Les registres et collecteurs EN/AR sont prêts côté moteur. **L'application reste FR seule** : `READY_EDITIONS=['fr']`, y compris avec `EDITIONS=fr,en`.
Les API utilisent la même disponibilité que l'application. Le scénario d'API EN active est reçu avec disponibilité et frontières externes simulées ;
les vrais collecteurs EN/AR ont été exécutés séparément avec leurs flux réels. L'activation HTTP et l'interface anglaise seront reçues en E3.
Les textes de synthèse du briefing restent français jusqu'aux lots de traduction.

## Contrôles

Preuves privées : `.local-logs/editions-e2/`.

| Commande / banc | Résultat réel | Preuve |
| --- | --- | --- |
| `npx tsc --noEmit --incremental false` | Sans erreur | `types-final.txt` |
| `npm run lint` | Sans erreur | `lint-final.txt` |
| `npm test` avec garde réseau | **537 tests : 496 réussis, 41 ignorés, 0 échec** | `unit-final.txt` |
| Dates/registres après finalisation des métadonnées EN/AR | **22/22** | `tests-final-registry.txt` |
| `npm run test:invariants` | **4/4** | `invariants.txt` |
| `npm run build`, FR et `fr,en` | Réussis ; FR seul, landing ISR 600 s et espace connecté dynamique | `build-fr-final.txt`, `build-fr-en.txt` |
| `npx playwright test --config playwright.components.config.ts` | **102/102** | `components.txt` |
| E2E MVP, 6 fichiers | **59 réussis, 1 ignoré, 0 échec** | `e2e-mvp.txt` |
| E2E Clerk sur build `fr,en`, 4 fichiers + hydratation séparée | **23 réussis, 1 ignoré, 0 échec** | `e2e-clerk.txt`, `e2e-hydration.txt` |
| Empreintes PostgreSQL avant/après | **8/8 tables identiques** | `before.json`, `after.json` |
| Vérification du diff (CRLF pris en compte) | Aucune erreur d'espacement | `diff-check.txt` |

MVP : `edition-api`, `edition-routing`, `radar-live`, `radar-reliability`, `radar-workspace`, `dashboard-reception`.
Le cas ignoré porte sur le worker du serveur de build. RSS FR implicite/explicite reçu par une vraie requête au serveur MVP et de vrais flux.
Les interactions, pannes, lecture et relevés des autres scénarios utilisent les fixtures prévues ; résumé TV réel en lecture seule.
Clerk : `auth-entry`, `edition-api`, `edition-routing`, `payment`, puis `account-controls-hydration` (3 tests).
Le cas ignoré est le RSS privé réservé au MVP. Widgets Clerk réellement chargés et refus anonymes réels ; paiements et frontières d'hydratation simulés.
Le parcours connecté réel reçu en E1 n'a pas été rejoué en E2 ; aucune règle d'authentification ou de routage modifiée.
Les 41 unités ignorées sont des intégrations conditionnelles, pas des succès.

La référence `src/lib/fixtures/editions/fr-collector-before-e2.json` a été enregistrée **avant les modifications E2**, avec horloge/flux simulés.
Le test compare profondément RSS et monde : forme, valeurs, ordre, articles datés/non datés, sources, fenêtres et disponibilités.
Il conserve les assertions historiques françaises ; seuls les deux objets `FeedConfig` de test reçoivent les nouvelles métadonnées obligatoires.

## Mesures linguistiques

`npx tsx src/scripts/measure-edition-lexicons.ts`, sans réseau ; `lexicon-final.json`.

| Échantillon | EN | AR |
| --- | --- | --- |
| Titres réels, repli compris | **228/229 (99,56 %)** | **227/228 (99,56 %)** |
| Pays nommés dans le titre | **105/106 (99,06 %)** | **98/99 (98,99 %)** |
| Repli sur pays du média | 67/67 | 67/67 |
| Pièges synthétiques | **20/20** | **28/28** |
| Titres réels marqués pièges | **40/40** | **36/36** |
| Mentions africaines des titres monde | 37/37 | 70/70 |
| Régions des titres monde, région de source comprise | 36/37 | 68/70 |

Le seuil de 90 % passe aussi sans gonfler le score avec les replis. Les deux pays manqués concernent des titres multipays :
`en-186` choisit l'Éthiopie au lieu du Soudan ; `ar-183` la RDC au lieu du Kenya, selon la priorité des expressions spécifiques.
Trois régions ambiguës restent en écart (`en-182`, `ar-152`, `ar-172`), sans pays africain inventé.
Les annotations AR restent celles de l'agent en E0 : **relecture native D7 attendue en E4**, aucune réception humaine arabe prétendue.

## Flux et charge réels

Deux passages `npm run feeds:verify -- --edition all --out … --dump-titles` : annexes avant déplacement, puis registres et adaptateurs.
162 sources vérifiées à chaque passage, sources désactivées comprises ; mêmes délai de 8 s, User-Agent et limite de taille que le collecteur.
Résultats dans `feeds-before/` et `feeds-adapted/` ; aucun flux au-dessus de 1 Mo, zéro avance résiduelle après adaptation au second relevé.

| Édition | Second relevé | Observations |
| --- | --- | --- |
| FR, 36 | 30 noyau, 1 complément, 2 anciens, 3 KO | AIP/Financial Afrik lents, Jeune Afrique 403 ; Ecofin et Okapi anciens. **Aucune source remplacée.** |
| EN, 85 | 58 noyau, 26 compléments, 1 KO | Kerr Fatou lent au second passage. Nation revenu en 200 ; Eye Radio redevenu accessible au second passage mais conservé désactivé après son premier dépassement. |
| AR, 41 | 35 noyau, 5 compléments, 1 KO | Al Sudani lent au second passage. Dates Youm7/El Bilad désormais comprises ; corrections horaires reçues. RT Arabic 200, 100 articles. |

Il s'agit encore de mesures du dimanche 11/10 ; les mesures de semaine FR et décisions de remplacement R1–R5 restent ouvertes.
Les erreurs intermittentes sont signalées par les disponibilités et le repli de 45 min. Revérifier les registres avant activation EN/AR en E3/E4.
La langue des titres de Nawaat peut varier entre français et arabe ; le corpus E0 conserve deux titres FR explicitement annotés.

`npx tsx src/scripts/profile-feed-editions.ts` : collectes froides réelles RSS puis monde, éditions successives, aucun média lu.
Mesure dans `profile-feeds.json` / `profile-feeds-final.txt` :

| Édition | RSS | Monde | Total | Articles RSS / monde | Mémoire résidente après | Tas JS après |
| --- | --- | --- | --- | --- | --- | --- |
| FR | 8,071 s | 0,981 s | **9,052 s** | 183 / 99 | 135,19 Mo | 35,74 Mo |
| EN | 11,942 s | 0,862 s | **12,804 s** | 300 / 116 | 147,73 Mo | 28,40 Mo |
| AR | 9,781 s | 2,448 s | **12,229 s** | 300 / 240 | 148,49 Mo | 25,99 Mo |

Mo décimaux ; mémoire du processus de mesure des collecteurs, pas celle de tout Next. Relevé avant/après, GC non forcé,
donc deltas parfois négatifs ; ni pic mémoire ni charge simultanée multiutilisateur prétendus. Les plafonds RSS 300 / monde 240 restent inchangés.
Les derniers ajustements de libellés de disponibilité/catégories n'affectent pas les requêtes mesurées.

## Captures et état final

[Galerie 360/768/1366](<C:/Users/GAMER PC/Africa_Live_TV/.local-logs/editions-e2/captures.md>).
Six vues finales MVP Radar/TV : HTTP 200, FR, aucun débordement, aucune erreur console ; données réelles et évolutives, pas de comparaison pixel du Radar prétendue.
Dix-huit vues publiques Clerk : landing, CGU, confidentialité, contact, tarifs, 404. FR, aucun débordement ; **18/18 extraits de texte identiques à E1**.
**17/18 captures identiques au seuil 12/255** ; landing 768 px : 0,098 % d'écart de rendu, sans différence de texte ni débordement.
Les messages console de préchargement Clerk bloqué sur contact et de ressources 404 sont également présents dans la référence E1 ; URLs masquées dans le rapport.

Huit empreintes métier identiques : chaînes, sources, utilisateurs (hors horodatage de synchronisation Clerk), abonnements, transactions,
favoris, pays suivis et demandes de support. Compte local préexistant conservé ; aucun utilisateur/flux synthétique ajouté en base.
Ports 3001/3002 libres, serveurs de réception arrêtés. `.env*`, source IPTV, configuration Railway/Clerk/OVHcloud/DNS et tâches Windows sans écriture.

Fichiers principaux : `src/lib/feeds/*`, `country-lexicon/*`, `country-detector.ts`, `text-normalize.ts`, `feed-dates.ts`, `feed-text.ts`,
`feed-concurrency.ts`, `api-edition.ts`, `radar-topic-lexicon.ts`, `world-region-lexicon.ts`, collecteurs RSS/monde/briefing, `radar-topics.ts`,
`world-desk-data.ts`, `src/i18n/feed-messages.ts`, trois routes API, scripts de vérification/génération/mesure et leurs tests ; `e2e/edition-api.spec.ts`.
Les modifications E0/E1 et `.claude/` sont préservées. L'écart de routage `next.config.ts` reçu en E1 reste inchangé.

**Suite : E3 (EDI-301 à EDI-308) après feu vert explicite ; E3 non commencé.**
