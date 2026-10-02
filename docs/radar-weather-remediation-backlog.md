# Radar et météo — plan de correction pour Gemini

Date : 1er octobre 2026 · Fuseau : Africa/Dakar.
État actualisé le 2 octobre : **RW-001 à RW-010 terminés, publiés sur staging**
après demande explicite. GitHub applicatif `51c0bc8` ; Railway CLI
`f0816583-e6a0-4115-bd54-d4cb0709acb1` SUCCESS, 9/9 E2E distants.
[Dossier de publication](publication-cli-2026-10-02.md). Limites de réception
connectée/amonts/appareils conservées. Révisions de départ : `6f7e384`, `54e5696`.

Ce plan traite les défauts confirmés lors de la revue du Radar/RSS et des
secours météo. Il complète le [backlog production](production-backlog.md),
le [plan dashboard](plan-dashboard-backlog.md) et la
[fiche de reprise](dashboard-session-handoff.md).
Le [prompt prêt à copier-coller](gemini-radar-weather-prompt.md) renvoie à ce
document comme référence d'exécution.

## 1. Résultat attendu et périmètre

Livrer localement un Radar qui respecte les refus d'accès, borne ses requêtes,
affiche uniquement des mesures validées, conserve les dates et fournisseurs
réels, classe correctement les rédactions et conserve le pays dans l'URL.
Le fournisseur de secours et les boutons météo persistants sont à conserver.

La préparation initiale a été suivie de l'implémentation locale demandée par
le propriétaire, dans l'ordre A, B, C, D. Le
[dossier de réception](radar-weather-remediation-validation.md) consigne les
fichiers, résultats exacts et limites. À la clôture locale du 1er octobre,
aucun commit, push ou déploiement n'était autorisé ni effectué. La demande
du 2 octobre autorise la publication CLI décrite ci-dessus. Les constats et
preuves de départ restent historiques ci-dessous.

### Contraintes à conserver

- Lire `AGENTS.md`, `contextellm.md` et les guides pertinents sous
  `node_modules/next/dist/docs/` avant de modifier le code Next.js.
- Inspecter `git status --short` ; préserver toutes les modifications présentes.
  L'arbre était propre au début de la préparation documentaire.
- Ne pas modifier `C:/Users/GAMER PC/IPTV`. Base locale : `africa_live_dev` ;
  application et essais locaux sur localhost:3001.
- Conserver `authorizeAppRequest`, les droits d'abonnement, les suspensions,
  les quotas, l'exception administrateur et la grâce existantes.
- Après expiration : dashboard et API Radar refusés ; catalogue consultable
  selon la politique existante ; lecture toujours soumise à ses propres gardes.
- Garder les vidéos téléchargées directement depuis l'amont par navigateur/VLC.
  Aucun relais, conversion ou stockage média.
- Conserver l'interface Radar harmonisée, les rédactions ajoutées, les fonds de
  carte, les lecteurs historiques et les comportements mobile/clavier.
- Garder GDELT retiré du fil et FIRMS/USGS retirés des contrôles de carte.
  Les usages serveur encore présents, notamment les événements du bandeau,
  ne sont pas à supprimer implicitement. Adapter les tests au périmètre réel.
- Briefing L6 désactivé ; aucun travail L5/VLC supplémentaire dans ce plan.
- Aucune nouvelle migration, dépendance payante, clé fournisseur ou variable
  distante prévue. Une nécessité imprévue doit être exposée avec une solution
  locale et sans coût si possible ; elle n'autorise pas une opération distante.
- Railway `just-compassion` reste staging, même si son environnement s'appelle
  `production`. Aucun changement Railway/OVHcloud/Clerk/DNS/plan/abonnement.
- Ne jamais afficher secrets, cookies, tokens de connexion ou URLs média dans
  les logs, captures, commandes de diagnostic ou documents.
- Maintenir l'exclusion de `e2e/fixtures` de TypeScript et ESLint.

## 2. Constats et preuves de départ

| Constat | Reproduction / impact | Tickets |
|---|---|---|
| Secours navigateur après refus d'accès | Un `403 SUBSCRIPTION_REQUIRED` interne déclenche un appel Open-Meteo et affiche 29 °C dans le test de composant | RW-001 |
| Validation insuffisante des mesures | wttr.in `current_condition: [{}]` est accepté à 0 °C ; chaînes invalides donnent `NaN`, sérialisé en `null`. Open-Meteo navigateur `current: {}` affiche 0 °C / ciel dégagé | RW-002, RW-003 |
| Date/fuseau/jour-nuit inventés | Une observation wttr.in du 29 septembre devient datée du 1er octobre à la collecte ; Nairobi à 20 h 30 est annoncé de jour et avec `Africa/Dakar` | RW-004 |
| Rubrique internationale instable | La catégorie XML écrase celle du flux. Au contrôle ponctuel, 0/30 articles RFI Monde et 0/23 articles RFI Afrique correspondent à `category === 'International'` | RW-007 |
| Provenance et disponibilité incohérentes | wttr.in est déclaré Open-Meteo ; météo navigateur affichée alors que sa ligne de disponibilité reste en chargement | RW-005, RW-006 |
| Requête navigateur sans échéance | Un secours sans réponse maintient le widget en chargement ; pas de timeout explicite dans le code | RW-001, RW-006 |

Contrôles exécutés pendant la revue, **avant toute correction** :

- `npm test` : 235 tests recensés, 221 réussis, 14 ignorés, zéro échec.
- TypeScript et ESLint : aucune erreur ; ESLint sans avertissement.
- Reproductions serveur avec fournisseurs simulés et navigateur Edge headless
  sur composant isolé, dépendances de navigation/authentification simulées.
- Synchronisation météo → pays → URL et retour historique réussis dans ce
  test de composant ; cela ne remplace pas un E2E Next.js réel.
- Lecture ponctuelle des 21 flux RSS depuis le poste : 20 réponses HTTP 200,
  AIP en timeout de 8 s. Ce résultat n'est pas une réception Railway et ne
  justifie ni retrait automatique d'AIP ni garantie de disponibilité continue.
- Build, E2E complets et réception Clerk authentifiée staging non relancés.
  Les suites E2E ont encore des attentes GDELT/FIRMS/USGS devenues obsolètes.

Le déploiement météo `19a9a9ae-6746-4652-b16d-996e4d48aaa9` et son succès sont
**déclarés dans le compte rendu transmis par Gemini**, pas revalidés par cette
revue. Le HTTP 429 observé antérieurement ne démontre pas à lui seul que
d'autres applications partagent et épuisent le quota de l'IP Railway.
Ne pas présenter cette hypothèse comme un diagnostic établi.

## 3. Backlog et ordre d'exécution

Préfixe `RW` : remédiation Radar/météo ; distinct des tickets historiques AL/RAD.
Statuts : À faire → En cours → À valider → Terminé. Une limitation doit rester
explicite, sans transformer une simulation en réception réelle.
Tous les tickets ci-dessous sont nécessaires à la réception locale du lot.

| ID | Lot | Priorité | Travail | Dépendances | État local |
|---|---|---|---|---|---|
| RW-001 | A | P1 | Refus d'accès définitifs et échéances réseau | Aucune | Terminé local |
| RW-002 | A | P2 | Contrats météo partagés et modules utilisables côté navigateur | Aucune | Terminé local |
| RW-003 | B | P2 | Adaptateurs stricts Open-Meteo et wttr.in | RW-002 | Terminé local |
| RW-004 | B | P2 | Dates, fuseaux, jour/nuit et fraîcheur | RW-002, RW-003 | Terminé local |
| RW-005 | B | P2 | Fournisseur, attribution, cache et disponibilité | RW-003, RW-004 | Terminé local |
| RW-006 | B | P2 | Cycle de vie fiable du secours navigateur | RW-001 à RW-005 | Terminé local |
| RW-007 | C | P2 | Périmètre RSS indépendant des catégories | Aucune ; contrats à aligner | Terminé local |
| RW-008 | C | P2 | Pays/météo/TV/URL et sélecteurs accessibles | RW-006, RW-007 | Terminé local |
| RW-009 | D | P2 | Tests de régression et fixtures Radar réconciliées | RW-001 à RW-008 | Terminé local |
| RW-010 | D | P2 | Réception locale et dossier de livraison | RW-009 | Terminé local |

Ordre conseillé : lot A, lot B, lot C, lot D. Ajouter les tests de chaque
comportement pendant son ticket ; RW-009 assemble et actualise les suites.
Ne pas attendre le dernier lot pour tester le refus 403 ou les données invalides.

## 4. Tickets détaillés

### RW-001 — Respecter les refus et borner les requêtes

Fichiers : `src/app/app/live/LiveRadarDashboard.tsx`,
`src/app/api/live/weather/route.ts` (contrat à préserver), nouveaux helpers
client si nécessaires, tests météo et navigateur.

Travail :

1. Séparer la lecture du résultat interne de la décision d'utiliser le secours.
   Le seul déclencheur autorisé est **HTTP 503 et corps JSON valide avec
   `code: 'LIVE_WEATHER_UNAVAILABLE'`**, émis après les gardes existantes.
2. Aucun appel direct après `401`, `403`, `429`, redirection vers Clerk,
   réponse HTML, JSON invalide, erreur générique 500/503, échec réseau ou
   timeout de l'API interne : ces cas ne prouvent pas l'autorisation d'accès.
3. Sur refus 401/403, annuler la tentative, vider le relevé météo conservé et
   afficher le message adapté ; conserver les conventions de navigation de
   session/renouvellement existantes. Respecter `Retry-After` pour un 429 interne.
4. Définir des constantes : API interne **20 s**, secours navigateur **8 s**.
   Le budget interne couvre les deux appels serveur de 8 s plus une marge.
   Le timeout couvre aussi la lecture du corps. Garder l'annulation au
   démontage/changement de pays et distinguer cette annulation d'une panne.
5. Au plus une tentative directe par chargement ; pas de boucle de réessai
   immédiat ni de chargements périodiques superposés.

Acceptation : zéro requête Open-Meteo navigateur pour chaque refus/cas non
autorisé ; une requête au plus sur 503 météo reconnu ; arrêt au délai prévu ;
aucune modification des gardes/quotas/rôles pour obtenir ce résultat.

### RW-002 — Unifier les contrats météo

Fichiers : `src/lib/live-weather-types.ts`, `src/lib/live-weather.ts`,
`LiveRadarDashboard.tsx`, helpers purs et tests sous `src/lib`.

Travail :

1. Séparer configuration des lieux, conversion et validation pures des appels
   serveur, erreurs API, caches et requêtes réseau. Le navigateur n'importe
   plus `live-weather.ts` pour trois constantes/helpers serveur.
2. Utiliser les dépendances présentes, notamment Zod si approprié ; aucune
   bibliothèque supplémentaire nécessaire par défaut.
3. Définir une provenance explicite `Open-Meteo | wttr.in` et un transport
   serveur/navigateur distinct. Faire suivre ces champs dans tous les DTO.
4. Prévoir les informations réellement inconnues : observation/fuseau/jour-nuit
   ou code météo non déterminables peuvent être `null` avec rendu adapté.
   Ne jamais remplacer leur absence par une valeur prétendument observée.
5. Exiger un contrat de snapshot validé contenant les mesures, le pays ciblé,
   les lieux rapides, les dates de collecte, la provenance et `availability`.
   La validation ne se limite plus à l'existence de `current`.
6. Rechercher et adapter tous les consommateurs et fixtures des types changés.
   Une compatibilité temporaire doit être documentée, pas un `as` masquant
   l'absence d'un champ obligatoire.

Acceptation : serveur et secours navigateur appliquent la même normalisation
Open-Meteo et les mêmes invariants métier ; valeurs inconnues explicites ;
TypeScript valide tous les consommateurs sans cast de contournement.

### RW-003 — Valider les réponses des fournisseurs

Fichiers : adaptateurs/helper partagé, `src/lib/live-weather.ts`,
`src/lib/live-weather.test.ts` et tests de contrat à ajouter.

Travail :

1. Valider la structure de chaque payload, y compris le premier élément de
   `current_condition`. Rejeter objet vide, `null`, tableau ou mesure absente.
2. Pour wttr.in, convertir strictement les chaînes numériques : refuser chaîne
   vide, espaces seuls, `NaN`, infini et suffixe non numérique. Accepter 0 et
   les températures négatives ; ne pas utiliser `Number(value) || fallback`.
3. Température/ressenti : nombres finis ; humidité : 0–100 ; vent et pluie :
   nombres finis positifs ou nuls ; direction : 0–360, normalisée en boussole.
   Ne pas borner une mesure incorrecte pour lui donner artificiellement raison.
4. Valider les coordonnées, le pays demandé et les unités attendues. Garder
   les paramètres d'unités explicites lorsque le fournisseur les permet.
5. Open-Meteo : mapper ses codes WMO. wttr.in : mapper ses propres codes
   fournisseur selon sa documentation ; ne pas les traiter comme codes WMO
   ni fixer `weatherCode: 0` pour toutes les conditions. Code inconnu : rendu
   neutre/« condition inconnue », sans ciel dégagé inventé.
6. Maintenir la limite serveur de 100 000 octets et l'appliquer au chemin
   direct navigateur. Conserver HTTPS, délais et politique de redirection
   explicite vers les seuls fournisseurs prévus.
7. Réponse invalide Open-Meteo serveur : essayer wttr.in. Réponse wttr.in
   invalide : conserver un cache admissible ou produire le 503 météo existant.
   Un résultat invalide n'entre jamais dans le cache comme succès.

Acceptation : `{}`, mesures manquantes/invalides et payloads trop gros ne
créent pas de relevé à 0 °C ; chaque fournisseur peut échouer indépendamment ;
les valeurs nulles, zéro réel et valeurs négatives légitimes sont distinguées.

### RW-004 — Conserver le temps et le lieu réels

Fichiers : adaptateur wttr.in, contrats météo, widget et tests d'horloge.

Travail :

1. `fetchedAt` est l'instant de collecte ; `observedAt` est l'instant amont.
   Ne jamais remplacer `observedAt` par l'instant de collecte.
2. Lire les champs amont documentés, par exemple `localObsDateTime` avec son
   fuseau/offset vérifié ou un timestamp complet. `observation_time` seul ne
   permet pas d'inventer une date : rendre l'observation inconnue si la date
   et le fuseau ne sont pas établis. Aucun `Date.parse` d'heure locale ambiguë.
3. Utiliser le fuseau du lieu réellement demandé. Pour les villes connues,
   une table de fuseaux IANA vérifiés est possible ; pour un point arbitraire
   non résolu, afficher fuseau inconnu plutôt qu'Africa/Dakar.
4. Déterminer jour/nuit avec une information fournisseur ou des heures de
   lever/coucher datées et localisées. Si insuffisant : état inconnu, icône
   neutre. Le simple intervalle 6–19 en UTC est à supprimer.
5. Politique de réception proposée pour ce lot : cache frais 15 min ; cache
   de secours au maximum 60 min depuis le dernier succès, comme aujourd'hui.
   Une observation de plus de 60 min ne peut être annoncée fraîche : état
   périmé explicite ou indisponibilité si aucun relevé exploitable. Date
   inconnue : disponibilité partielle et mention « Date d'observation inconnue ».
   Rejeter un timestamp futur de plus de 5 min ; petite dérive future ≤5 min
   conservée et signalée, sans substitution silencieuse à l'heure actuelle.
6. Calculer ces états à partir d'un instant de référence testable. Ne pas
   prolonger la durée de vie de données anciennes lors d'un simple affichage
   ou passage entre cache serveur et navigateur.

Acceptation : dates amont stables au réaffichage, exemple vieux de deux jours
jamais annoncé récent ; Nairobi 20 h 30 n'est pas de jour à cause de l'UTC ;
minuit local, date inconnue, données futures et expiration sont testés.

### RW-005 — Afficher la provenance et préserver le cache

Fichiers : `live-weather-types.ts`, `live-weather.ts`, helpers de snapshot,
`LiveRadarDashboard.tsx`, `RadarSourcesPanel.tsx` si nécessaire.

Travail :

1. Faire porter au relevé, à sa ligne de disponibilité et à l'interface le
   fournisseur réellement utilisé. Le transport navigateur ne devient pas
   un nouveau fournisseur. Éviter d'afficher « Open-Meteo & wttr.in » comme
   si les deux avaient produit le relevé courant.
2. Conserver l'attribution Open-Meteo existante pour ses données. Vérifier les
   instructions de provenance de wttr.in avant de fixer son attribution ;
   ne pas lui appliquer automatiquement la licence des données Open-Meteo.
3. Produire pour chaque snapshot une ligne `availability` cohérente :
   fournisseur, lieu, état, collecte, dernier succès, date des données,
   expiration et nombre de résultats. Date inconnue : `dataAt: null` / partial.
4. Quand le secours réussit, présenter sa disponibilité sans déclarer
   simultanément le fournisseur principal sain. Si les deux tentatives sont
   exposées, préciser quel fournisseur a produit la mesure affichée.
5. Préserver la mutualisation serveur par coordonnées et les TTL existants.
   Un cache de secours conserve fournisseur, observation, collecte et dernier
   succès d'origine. Un cache dépassant 60 min ne sert plus de relevé valide.

Acceptation : wttr.in nommé wttr.in ; Open-Meteo navigateur disponible dans
le tableau, jamais en chargement après succès ; dates/TTL non rajeunis ;
requêtes concurrentes mutualisées et cache périmé correctement signalé.

### RW-006 — Fiabiliser le cycle de vie du widget

Fichiers : `LiveRadarDashboard.tsx`, helpers/hook météo si extraction utile.

Travail :

1. Utiliser les contrats et snapshots partagés dans le secours navigateur,
   avec validation et disponibilité complètes ; supprimer les `?? 0` actuels.
2. Maintenir des états cohérents : chargement, valide, partiel, cache périmé,
   indisponible et refus d'accès. La fin d'une tentative règle le chargement.
3. Une réponse tardive SN ne peut remplacer le relevé CI après changement de
   pays. Une erreur tardive ou le `finally` d'une requête annulée ne peut
   écraser l'état de la nouvelle requête. Vérifier aussi actualisation et démontage.
4. Garder les boutons de villes et le sélecteur disponibles pendant chargement
   et panne. L'erreur doit pouvoir être retentée et disparaître après reprise.
5. Toute donnée affichée après panne doit rester admissible et identifiée
   comme conservée/périmée ; arrêter son affichage à expiration même sans
   nouvelle réponse réseau. Sur refus d'accès : aucun relevé conservé.
6. Cadence périodique 15 min maintenue ; éviter les tentatives superposées et
   permettre une actualisation manuelle sans fuite d'écouteur ou de timer.

Acceptation : réponses tardives ignorées, chargement terminé après délai,
table cohérente avec la carte météo, contrôles persistants, reprise réussie.

### RW-007 — Séparer rédaction et sujet dans les RSS

Fichiers : `rss-collector-types.ts`, `rss-collector.ts`, `rss-collector.test.ts`,
`live-osint-types.ts` (type d'article consommé), `LiveRadarDashboard.tsx`,
fixtures Radar et consommateurs d'articles concernés.

Travail :

1. Introduire un champ de périmètre stable, par exemple
   `editorialScope: 'africa' | 'international'`, dans `FeedConfig` et l'article
   normalisé. Ne pas réutiliser `category` pour deux concepts différents.
2. Périmètre `international` : `f24_monde`, `f24_afrique`, `rfi_monde`, `rfi`,
   `bbc`, `lemonde_afrique`, conformément au classement livré. Les autres
   flux restent `africa`. Aucun reclassement produit implicite.
3. Continuer à conserver la catégorie XML « Politique », « Afrique », etc.
   Transmettre le périmètre jusqu'au DTO et au modèle affiché, sans le déduire
   du titre, du domaine, de la catégorie ou d'une liste copiée dans le client.
4. Filtrer onglets et compteurs par ce champ sur le même ensemble temporel et
   le même filtre pays. Les articles sans date conservent ce périmètre tout
   en restant exclus des compteurs 24 h.
5. Préserver l'ID stable, les URL sûres, la déduplication et l'inférence pays.
   Un article repris dans Monde/Afrique reste dédupliqué et classé de manière
   déterministe ; les sources dupliquées citées ci-dessus ont le même périmètre.
6. Garder la fenêtre 24 h et les limites actuelles ; ne pas élargir le volume
   pour cacher un problème de classement ou de compteur.

Acceptation : RFI Monde catégorie « Monde » et RFI Afrique catégorie « Afrique »
restent internationaux ; MaliJet catégorie « International » reste une
rédaction du groupe Afrique/National ; toutes = Afrique + International
pour les articles datés visibles, indépendamment des catégories XML.

### RW-008 — Consolider le choix du pays sans régression

Fichiers : `LiveRadarDashboard.tsx`, `radar-workspace.ts` si nécessaire,
configuration pure des lieux et tests `e2e/radar-workspace.spec.ts`.

Travail :

1. Conserver un code pays validé comme source de vérité pour filtre général,
   carte, météo, RSS, chaînes TV et lien vers le catalogue. Réévaluer l'état
   local et l'écouteur `popstate` ajoutés : Next.js intègre déjà `pushState`
   à `useSearchParams` ; simplifier seulement avec des tests de non-régression.
2. Vérifier chaque chemin : contrôle général, carte, météo, ville rapide,
   reset, lien direct, précédent/suivant et rechargement. Préserver les autres
   paramètres et le fragment de l'URL.
3. Pays invalide : vue Afrique et message existant ; pays sans articles/TV :
   état vide explicite. Aucun affichage d'un autre pays présenté comme celui choisi.
4. Garder les lieux rapides actuels. Utiliser « Villes rapides » plutôt que
   « Grandes capitales » puisque tous ces lieux ne sont pas des capitales.
5. Trier la liste par nom français, dériver son nombre de l'inventaire et
   préserver les pays/territoires déjà présents. Éviter des options ambiguës
   avec le même code dans deux groupes ; un code doit conduire au même lieu.
   Pour un point de référence de pays, ne pas prétendre mesurer tout le pays.
6. Conserver noms accessibles, navigation clavier, focus et absence de
   débordement à 320/390 px et en reflow. Les boutons rapides restent visibles
   même lorsque les fournisseurs échouent.

Acceptation : vrai E2E Next.js de la synchronisation bidirectionnelle et de
l'historique ; affichages liés au bon pays ; aucun changement du catalogue
ou de l'éligibilité de lecture ; aucune perte des paramètres/fragment.

### RW-009 — Réconcilier et compléter les tests

Fichiers : tests sous `src/lib`, `e2e/helpers/radar-fixture.ts`,
`e2e/radar-workspace.spec.ts`, `e2e/radar-reliability.spec.ts`,
`e2e/dashboard-reception.spec.ts`, `e2e/tv-workspace.spec.ts` selon impact.

Travail :

1. Ajouter les cas de la matrice ci-dessous, avec fetch simulé, compte des
   appels, horloge contrôlée et payloads documentés sans secrets.
2. Remplacer les fixtures de dépêches GDELT par des fixtures RSS qui conservent
   les mêmes assertions utiles : dates, identités, déduplication, pays et
   disponibilité. Mettre à jour textes de panne et compteurs attendus.
3. Adapter les attentes FIRMS/USGS retirées de la carte : conserver une
   assertion d'absence de contrôles et de requêtes de couches depuis la carte.
   Le bandeau peut encore utiliser ses événements serveur existants : ne pas
   interdire globalement tous les appels serveur de catastrophe.
4. Préserver les tests réels du worker, des fonds de carte, du globe, de la
   panne WebGL et des interactions pays. Ne pas rendre des tests verts par
   des `skip`, suppression générale d'assertions, timeout gonflé ou mock des gardes.
5. Tester l'absence d'appel direct après refus et le succès du seul 503 autorisé
   dans le navigateur réel. Une simulation d'accès n'est pas un compte Clerk réel.
6. Ne pas rendre les tests de régression dépendants des flux/amonts vivants.
   Un contrôle réseau manuel ponctuel est un relevé séparé et daté.

Acceptation : toutes les attentes obsolètes sont remplacées par des contrôles
équivalents pertinents ; chaque défaut de l'audit possède un test comportemental ;
les appels aux fournisseurs restent absents en cas de refus d'accès.

### RW-010 — Recevoir le lot local et documenter la livraison

Fichiers : `docs/radar-weather-remediation-validation.md` à créer après essais,
ce backlog, `production-progress.md`, `non-regression-checklist.md`,
`dashboard-session-handoff.md`, `contextellm.md`.

Travail :

1. Exécuter les vérifications de la section 6. Vérifier le serveur déjà actif
   avant tout lancement ; ne pas réutiliser un autre checkout sur 3001.
2. Distinguer tests unitaires, E2E locaux MVP, build avec gardes actives et
   réception Clerk réelle. Protéger les variables privées ; si un test exige
   un mode MVP, l'utiliser uniquement dans le processus de développement local,
   sans modifier les variables distantes ni laisser `.env` altéré.
3. Consigner résultats exacts, échecs/ignorés, fichiers changés, dates,
   fournisseur/transport observés et limites. Conserver les historiques L0–L5.
4. Mettre à jour chaque ticket et la checklist seulement avec une preuve
   correspondante. « Code écrit », « tests réussis » et « staging reçu » sont
   des étapes distinctes ; garder la publication hors de ce lot.
5. Fournir un résumé final et le diff local pour revue. Réparer un résultat
   négatif dans le périmètre ; signaler précisément une dépendance extérieure
   manquante sans modifier rôles, comptes ou production pour fabriquer une preuve.

Acceptation : dossier local complet, aucun test échoué inexpliqué, restrictions
conservées, environnement local restitué ; corrections non déclarées déployées.

## 5. Matrice minimale de tests comportementaux

| Cas | Attente à vérifier | Ticket |
|---|---|---|
| API météo 401 / 403 abonnement / 403 suspension | Zéro fetch direct ; aucun relevé conservé | RW-001 |
| API météo 429 avec Retry-After | Zéro fetch direct ; message/délai respectés | RW-001 |
| API interne redirigée/HTML/JSON cassé/network/timeout | Aucun secours sans autorisation prouvée | RW-001 |
| 503 générique / code erroné | Zéro fetch direct | RW-001 |
| 503 LIVE_WEATHER_UNAVAILABLE JSON valide | Une tentative directe au plus | RW-001, RW-006 |
| API interne lente et secours navigateur bloqué | Échéances 20 s / 8 s et sortie du chargement | RW-001, RW-006 |
| Open-Meteo serveur OK | Normalisation valide, aucun wttr.in | RW-003 |
| Open-Meteo serveur 429/500/timeout/payload invalide | wttr.in essayé ; résultat validé | RW-003 |
| wttr.in objet vide/null/mauvais élément | Rejet, jamais 0 °C inventé | RW-003 |
| Champs absents/NaN/infini/chaîne vide/12abc | Rejet ; pas de mise en cache saine | RW-003 |
| 0 °C, vent/pluie 0, température négative | Valeurs légitimes conservées | RW-003 |
| Humidité hors 0–100 / pluie négative | Rejet, pas d'écrêtage silencieux | RW-003 |
| Corps déclaré ou réellement >100 000 octets | Rejet serveur et navigateur | RW-003 |
| Code wttr.in connu/inconnu | Mapping fournisseur ou état inconnu, jamais code 0 forcé | RW-003 |
| Observation vieille de deux jours | Date inchangée ; jamais fraîche/temps réel | RW-004 |
| Date absente, heure seule, fuseau absent | Unknown/partial explicite, pas de date fabriquée | RW-004 |
| Timestamp futur >5 min / petite dérive | Rejet / date conservée et anomalie signalée | RW-004 |
| Nairobi 20 h 30 ; minuit local ; pays sans fuseau vérifié | Jour/nuit local ou inconnu ; pas de fuseau Dakar arbitraire | RW-004 |
| Cache frais / >15 min avec panne / >60 min | Réutilisation correcte, stale, puis arrêt de réutilisation | RW-005 |
| Requêtes concurrentes même lieu | Mutualisation, dates d'origine conservées | RW-005 |
| wttr.in réussi | Source et attribution wttr.in ; Open-Meteo non déclaré sain | RW-005 |
| Secours navigateur réussi / date inconnue | Ligne disponible / partielle, aucune ligne en chargement | RW-005, RW-006 |
| SN→CI pendant la requête ; erreur/finally tardifs | Seul CI modifie les états finaux | RW-006 |
| Démontage, intervalle et actualisation manuelle | Annulations/nettoyage, aucune requête superposée | RW-006 |
| Panne des deux fournisseurs puis reprise | Contrôles persistants, erreur visible puis levée | RW-006 |
| RFI Monde/Monde, RFI Afrique/Afrique, France 24/Politique | International indépendamment de category | RW-007 |
| MaliJet/International ou Actu Cameroun/International | Afrique/National selon la rédaction | RW-007 |
| Même URL dans deux flux, article sans date/futur/ancien | Déduplication ; périmètre transmis ; fenêtre 24 h conservée | RW-007 |
| Filtre pays + trois onglets | Toutes = Afrique + International sur le même ensemble daté | RW-007 |
| Météo→pays, pays→météo, carte→pays, villes rapides | RSS/TV/URL/météo synchronisés | RW-008 |
| Précédent/suivant, reload, code invalide, reset | État et URL cohérents ; autres paramètres/fragment conservés | RW-008 |
| Pays vide/pays sans actualités/TV, liste, clavier, mobile | États vides honnêtes, options non ambiguës, focus/reflow | RW-008 |
| Carte mobile non demandée / panne worker / globe | Fil utilisable, pas de nouvelle requête de couche depuis la carte | RW-009 |
| Accès catalogue/lecture/administration, briefing | Gardes inchangées, briefing désactivé | RW-009, RW-010 |

## 6. Vérifications et preuve de clôture

Exécuter, avec résultats consignés sans secrets :

```powershell
git status --short
npm test
npm run test:invariants
npx tsc --noEmit --incremental false
npm run lint
npm run db:check:migrations
npm run build
git diff --check
```

Contrôler le serveur existant et consulter `playwright.config.ts` avant les E2E.
Dans le processus local adapté aux fixtures, exécuter au minimum les suites :

```powershell
npx playwright test e2e/radar-workspace.spec.ts e2e/radar-reliability.spec.ts e2e/dashboard-reception.spec.ts e2e/tv-workspace.spec.ts
```

Ajouter la nouvelle suite météo si elle est séparée. Distinguer le parcours
du worker/build prévu par `RADAR_BUILD_TEST` des tests dashboard en développement.
Ne pas partager une même `.next` en construction avec un serveur qui la sert ;
orchestrer leur arrêt/redémarrage local et restituer le service convenablement.
Les captures existantes suivies ne sont pas à écraser sans vérifier le diff.

Exécuter `npm run test:integration` seulement si des changements touchent les
gardes/persistance/quotas et nécessitent les intégrations PostgreSQL. Utiliser
le runner isolé officiel, jamais des drapeaux d'intégration bruts. Si aucune
logique DB n'est changée, consigner cette justification ; les 14 tests ignorés
dans `npm test` ne doivent pas être revendiqués comme réussis.

Ne pas compter comme validations nouvelles le build Railway déclaré par Gemini,
les anciens E2E distants ou le relevé RSS ponctuel de l'audit. Les tests réseau
amont et profils Clerk réellement disponibles doivent être datés et distingués
des fixtures. Un échec d'AIP ponctuel ne doit pas être masqué par un succès fictif.

### Définition de terminé pour ce plan

- RW-001 à RW-010 clos avec fichiers, tests et preuves correspondants.
- Aucun accès météo direct après refus ; aucun 0 °C ou ciel dégagé inventé.
- Dates, fuseaux et provenance vérifiables ou explicitement inconnus.
- Widget et table de sources cohérents, requêtes bornées, cache non rajeuni.
- Classement RSS et compteurs cohérents, pays/URL et accessibilité reçus.
- Contrôles locaux pertinents réussis et limites réelles documentées.
- Aucun changement de schéma, environnement distant ou coût implicite.
- Code laissé localement pour revue ; aucune publication revendiquée.

## 7. Publication ultérieure et retour arrière

La publication n'est pas un ticket d'implémentation autorisé par ce document.
Une demande ultérieure du propriétaire pourra autoriser commit/push et Railway
staging ; vérifier alors la cible, les versions et le runbook d'exploitation.
Si une migration finit par être nécessaire, backup restaurable avant déploiement
et `db:migrate:deploy` obligatoires ; jamais `db:push` sur Railway.

Préparer à cette occasion une réception authentifiée, santé sur les deux
domaines staging, refus anonyme et tests de panne météo. Un rollback vers
`54e5696` réintroduirait le défaut RW-001 : ne pas présenter cette version
comme repli sûr pour les droits. Un repli applicatif acceptable doit conserver
les gardes et désactiver le secours navigateur si sa fiabilité n'est pas reçue.
Aucune restauration de base n'est prévue pour ces corrections sans migration.

## 8. Références techniques à vérifier pendant l'implémentation

- Guides Next.js installés : directive `use client`, composants serveur/client,
  Native History API, `useSearchParams`, Route Handlers et tests.
- [Documentation Open-Meteo](https://open-meteo.com/en/docs).
- [Format JSON wttr.in](https://github.com/chubin/wttr.in#json-output) et
  documentation des codes de son fournisseur, fuseaux et attributions.
- [Matrice d'accès dashboard](dashboard-access-matrix.md),
  [matrice des environnements](environment-matrix.md),
  [checklist de non-régression](non-regression-checklist.md).

## 9. Journal de réalisation locale — 1er octobre 2026

Réception dev achevée avant 23:41 Africa/Dakar ; build servi Clerk reçu à
23:42, puis dernière revue/build/restitution achevée à 23:52 ; départ `main` / `54e5696`,
six documents suivis modifiés et deux documents RW non suivis préservés.
Journal détaillé et limites : [dossier de validation](radar-weather-remediation-validation.md).

| Ticket | État | Fichiers / résultat | Tests / preuve / limites |
|---|---|---|---|
| RW-001 | Terminé local | weather-request, route, hook | Tests refus et 20/8 s, un secours au plus, Retry-After |
| RW-002 | Terminé local | types, contract, locations, client | Contrat complet Zod, inconnues, normalisation commune ; TypeScript |
| RW-003 | Terminé local | adapters, live-weather, route | Payloads/mesures/unités/lieux/tailles, zéro réel ; invalides jamais cachés |
| RW-004 | Terminé local | adapters, contract, widget | Horloges contrôlées, Nairobi/minuit/inconnu/futur ; pas de mesure amont réelle |
| RW-005 | Terminé local | live-weather, contract, widget | Cache mutualisé 15/60 min, provenance/date/table ; fournisseurs simulés |
| RW-006 | Terminé local | useLiveWeather, client, widget | Obsolescence SN→CI, démontage, cadence, expiration, refus, reprise E2E |
| RW-007 | Terminé local | rss-collector/types/tests, DTO, widget | 21 scopes fixes, catégorie indépendante, déduplication/24 h/onglets |
| RW-008 | Terminé local | radar-countries, locations, workspace, dashboard | Next.js réel URL/pays/carte/TV/météo, inventaire, focus/mobile/historique |
| RW-009 | Terminé local | fixtures et cinq suites E2E | 51 dev réussis, 1 réservé build puis réussi ; worker/globe/WebGL/bandeau |
| RW-010 | Terminé local | dossier, journal, checklist, reprise | 242 unitaires + 14 ignorés, 4 invariants, tsc/lint/migrations/build ; Clerk anonyme réel uniquement |

Aucun ticket d'implémentation restant. Réception connectée Clerk, appareils,
amonts vivants et publication staging restent hors de cette clôture locale.
