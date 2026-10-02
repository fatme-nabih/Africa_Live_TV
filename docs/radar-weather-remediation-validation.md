# Radar et météo — réception locale RW-001 à RW-010

**Actualisation du 2 octobre : publication CLI autorisée et reçue**, GitHub
applicatif `51c0bc8` et Railway staging
`f0816583-e6a0-4115-bd54-d4cb0709acb1` SUCCESS ; 9/9 E2E distants, santé 200,
météo anonyme 401 et dashboard 307. Validation actuelle : 244 unitaires réussis,
14 ignorés. [Preuves complètes](publication-cli-2026-10-02.md). Le bilan suivant
conserve la réception locale historique du 1er octobre et ses limites.

1er octobre 2026 · Africa/Dakar (UTC) · code de départ `main` / `54e5696`.
Clôture et restitution finale : **23:52 Africa/Dakar**.
Point d'arrêt avant déconnexion enregistré dans `contextellm.md` et la fiche
dashboard : revue du diff à la reprise, aucun ticket RW restant, vérifier le
serveur local avant réutilisation ; aucune publication automatique.
**Lots A, B, C, D implémentés et reçus localement ; aucun ticket RW restant.**
Les limites ci-dessous concernent une réception authentifiée et les amonts
réels, pas des tests locaux déclarés réussis à leur place. Aucun commit, push,
déploiement, migration, changement distant ou opération payante effectué.

## Contexte et préservation

AGENTS.md, contextellm.md, le prompt et le backlog RW ont été lus, ainsi que
les documents opérationnels associés. Guides de Next.js **16.3.5** consultés
avant les changements : composants serveur/client, `use client`,
`useSearchParams`, Native History API, Route Handlers et Playwright.

L'arbre était intentionnellement sale : six documents suivis modifiés
(`contextellm.md`, reprise dashboard, checklist, plan dashboard, backlog
production, progression) et deux nouveaux documents RW non suivis. Leur
contenu est conservé ; les bilans initiaux sont maintenant étiquetés historiques
et les résultats de cette exécution ajoutés. Aucun nettoyage Git destructif.
HEAD reste `54e5696`. Source IPTV, schéma, migrations, dépendances, gardes,
quotas, règles d'abonnement, lecteurs et transport média non modifiés.

Tests et serveur exclusivement sur localhost:3001 / `africa_live_dev`.
Les API fournisseurs et RSS des scénarios de panne sont simulées. Aucune
mesure météo actuelle ou disponibilité actuelle d'AIP n'est revendiquée.

## Journal et preuves par ticket

| Lot / ticket | Résultat local | Preuves comportementales |
|---|---|---|
| A / RW-001 | Terminé : seul 503 JSON `LIVE_WEATHER_UNAVAILABLE` permet le secours ; délais interne 20 s / direct 8 s, corps compris ; Retry-After respecté | `weather-request.test.ts`, `radar-weather.spec.ts` : 401, deux 403, 429, 500, 503 générique, HTML, JSON cassé, redirection, réseau et timeout → zéro appel direct ; 503 reconnu → un appel ; refus après succès vide le relevé |
| A / RW-002 | Terminé : modules purs, contrat Zod complet commun, provenance/transport et inconnues explicites | `weather-contract.test.ts`, TypeScript, normalisation serveur/navigateur identique ; champs obligatoires et disponibilité incohérente rejetés |
| B / RW-003 | Terminé : mesures, unités, coordonnées, codes fournisseur et limite 100 000 octets validés avant succès/cache | `weather-adapters.test.ts`, `weather-server.test.ts`, `live-weather.test.ts`, `radar-access.test.ts` et E2E payload direct vide : objets vides/null/tableaux, champs absents/invalides, plages, UTF-8/tailles ; zéro et valeurs négatives réels conservés |
| B / RW-004 | Terminé : collecte distincte d'observation ; IANA des neuf villes rapides ; jour/nuit fournisseur ou lever/coucher local daté ; inconnues neutres | Tests horloge : vieux de deux jours, heure seule, date invalide, Nairobi 20:30, minuit local, point arbitraire, futur >5 min rejeté et petite dérive signalée ; widget wttr partiel reçu |
| B / RW-005 | Terminé : provenance réelle dans widget/table ; attribution distincte ; TTL 15/60 min sans rajeunissement | Tests concurrence/cache : OM OK sans wttr ; OM 429/500/timeout simulé/invalidité/taille → wttr ; dates originales et mutualisation conservées ; expiry 60 min ; E2E OM navigateur disponible et wttr serveur partiel sans fausse ligne OM |
| B / RW-006 | Terminé : hook annulable, chargement borné, contrôles persistants, cache admissible seulement | E2E SN→CI, réponse/erreur/finally obsolètes, actualisation/panne/reprise, démontage et cadence ; relevé retiré à 60 min même sans réponse réseau ; refus efface les mesures |
| C / RW-007 | Terminé : `editorialScope` fixé dans les 21 configurations et transmis à chaque article RSS | Tests RFI Monde/Monde, RFI Afrique/Afrique, France 24/Politique, BBC/Le Monde et MaliJet/Actu Cameroun/International ; catégories XML conservées, sans date/dédoublonnage ; E2E pays/24 h et Toutes = Afrique + International |
| C / RW-008 | Terminé : URL source de vérité, inventaire complet, options uniques triées en français et points de référence explicites | Tests inventaire + E2E contrôle général, météo, ville rapide, carte, TV, lien direct, reset, invalidité, historique/reload et paramètres/fragment ; clavier, 320/390 px et reflow |
| D / RW-009 | Terminé : fixtures RSS et assertions cartographiques réconciliées | 51 E2E dev réussis, puis worker/build réel séparé ; panne worker, fonds bloqués, globe, vraie absence WebGL, absence contrôles/requêtes FIRMS/USGS depuis la carte ; bandeau serveur conservé |
| D / RW-010 | Terminé : build/checks/E2E et documentation reçus, environnement restitué | Résultats ci-dessous ; fichiers privés inchangés ; dev Clerk restauré ; réception authentifiée distante non exécutée |

Les tests ont accompagné les lots : décision de secours et contrat en A ;
adaptateurs/dates/cache et cycle de vie en B ; rédaction/URL en C ; assemblage
des suites et réception en D. Le dossier n'assimile pas les tests de l'audit
initial ni les anciennes réceptions L0–L5 à ces nouvelles preuves.

## Commandes et résultats finaux

| Vérification | Résultat exact | Journal local ignoré par Git |
|---|---|---|
| `npm test` | **256 recensés, 242 réussis, 14 ignorés, 0 échec**, 0 annulé | `.local-logs/rw/unit-received.log` |
| `npm run test:invariants` | **4/4 réussis**, 0 ignoré/échec | `.local-logs/rw/invariants-final.log` |
| `npx tsc --noEmit --incremental false` | Exit 0, aucune erreur | `.local-logs/rw/types-received.log` |
| `npm run lint` | Exit 0, aucune erreur ni avertissement ESLint | `.local-logs/rw/lint-received.log` |
| `npm run db:check:migrations` | Exit 0, « Everything's fine » | Contrôle local, aucune migration appliquée |
| `npm run build` | Exit 0, compilation/TypeScript et 25 pages statiques réussis | `.local-logs/rw/build.log` |
| Cinq suites E2E dev, un worker, aucun retry | **52 recensés, 51 réussis, 1 ignoré réservé au build, 0 échec** | `.local-logs/rw/e2e-dev-received.log` |
| E2E build servi, sélection `Build servi`, aucun retry | **1/1 réussi**, 0 ignoré/échec ; worker réel, API météo 401, redirection dashboard | `.local-logs/rw/e2e-build-clerk.log` |
| Dernière revue : suite météo relancée après simplification du message de validation public | **18/18 réussis**, 0 ignoré/échec ; cas déjà inclus dans les 51 dev, pas 18 nouveaux cas | `.local-logs/rw/e2e-weather-final.log` |
| `git diff --check` | Exit 0, aucune erreur d'espaces | Aucun commit/index modifié |

Les 14 ignorés de `npm test` sont les intégrations PostgreSQL opt-in. Le runner
`test:integration` n'est pas lancé : aucune logique de persistance, quota,
garde ou schéma DB n'est modifiée. La matrice des handlers réels reste testée
avec ses frontières externes simulées ; elle n'est pas une réception de profils
Clerk connectés. Un test du handler météo vérifie les paramètres invalides
**après** l'autorisation, sans modifier cette dernière.

Commande E2E développement :

```powershell
npx playwright test e2e/radar-workspace.spec.ts e2e/radar-reliability.spec.ts e2e/dashboard-reception.spec.ts e2e/tv-workspace.spec.ts e2e/radar-weather.spec.ts --workers=1
```

Seul le processus dev dédié aux fixtures a utilisé `LOCAL_DEV_MODE=true`,
`NEXT_PUBLIC_LOCAL_DEV_MODE=true`, `ENABLE_LOCAL_VLC=true` et le runner
`E2E_EXTERNAL_SERVER=true`. Aucun fichier `.env` modifié. Le build a utilisé
`DEPLOYMENT_ENV=local`, les trois drapeaux MVP/VLC à false et
`E2E_ANONYMOUS_MODE=false`. `next start` a servi ce build sur 3001 avec les
mêmes restrictions et Clerk réel. Le runner du test build utilise `CI=true`,
`RADAR_BUILD_TEST=true`, `E2E_EXTERNAL_SERVER=true`, `--retries=0` et une
sélection unique pour ne pas compter des scénarios dev comme des skips build.

Horloges métier simulées : 2026-10-01T17:30:00Z (et avances contrôlées),
distinctes de l'heure réelle d'exécution. Les températures 24 °C/29 °C et
−2 °C sont des **fixtures**. Fournisseur/transport reçus sous simulation :
Open-Meteo serveur, wttr.in serveur, Open-Meteo navigateur après 503 reconnu.

## Échecs intermédiaires expliqués et réparés

- Premier lancement E2E météo : 16 échecs avant le widget car `/app/live`
  renvoyait 404 depuis un cache `.next/dev` existant incohérent. Après arrêt
  du serveur identifié dans ce checkout, ce seul cache généré a été déplacé
  dans `.local-logs/rw/dev-cache-initial` et régénéré ; aucun fichier source retiré.
- Première réception météo après régénération : 13 réussis, 2 échecs et
  1 non exécuté ; fixtures sensibles au double effet React dev et navigation
  de démontage ajustées. Les 18 scénarios météo finaux passent.
- Premier `npm test` global : 255 recensés, 238 réussis, 3 échecs et 14 ignorés.
  Une attente du libellé de point de référence était ancienne ; le chargeur
  de tests VM rencontrait Zod importé depuis la route. La route valide maintenant
  le code avec l'inventaire pur ; aucune dépendance native supplémentaire
  autorisée dans le chargeur, aucune garde simulée pour masquer le défaut.
- Premier assemblage dev : 45 réussis, 4 échecs, 1 ignoré. Fixtures RSS
  réordonnées pour conserver la preuve de la première dépêche au premier écran,
  en-tête légèrement raccourci ; attentes WebGL réelles et localisation du
  widget rectifiées. Deuxième assemblage : 48 réussis, 1 échec de sélecteur
  ambigu « Abidjan », 1 ignoré ; sélecteur limité à la mesure du widget.
- Test supplémentaire wttr : état attendu « partiel » corrigé vers le libellé
  réellement affiché « données partielles » ; aucune assertion d'état supprimée.
- Premier build servi sous le mode anonyme de test existant : worker réussi,
  nouvelle assertion API négative (500). Ce mode court-circuite le middleware
  Clerk alors que le handler météo appelle `auth()`. Relance avec Clerk réel et
  `E2E_ANONYMOUS_MODE=false` : **401 et test complet réussi**. Gardes inchangées.
  Ce mode anonyme ne doit pas servir à recevoir les handlers Radar avec Clerk.
- Une première restitution dev a été refusée par notre vérification du parent
  de processus (commande shell sans chemin), puis a rencontré le port occupé.
  Le listener `next start` a été vérifié par son chemin absolu et arrêté ;
  le dev a ensuite été relancé. Aucun processus d'un autre checkout arrêté.

Les avertissements Playwright `NO_COLOR`/`FORCE_COLOR` concernent le terminal,
pas ESLint. Aucun timeout gonflé ni skip nouveau pour cacher un échec. Le skip
dev du seul scénario build est préexistant et compensé par sa réussite séparée.
La dernière revue a remplacé les détails Zod du widget par un message public
lisible ; les 18 scénarios météo, TypeScript, ESLint et le build sont revérifiés
sur cette modification. Les refus d'accès conservent leurs messages spécifiques.

## Complément de publication — 2 octobre 2026

La revue suivante a corrigé le rejet non géré de `reader.cancel()` lors de
l'annulation d'un corps fetch natif et ajouté deux tests HTTP réels. Validation
actualisée : **244 unitaires réussis, 14 ignorés, zéro échec**, invariants 4/4,
TypeScript/lint/migrations/build réussis. Les six clés des overlays du lecteur
sont également corrigées. Publication GitHub et Railway staging maintenant
autorisée par le propriétaire et effectuée ; ses preuves figurent dans
le [dossier CLI](publication-cli-2026-10-02.md). Les déclarations de non-publication
ci-dessous décrivent la clôture historique du 1er octobre.

## Fichiers applicatifs et tests du diff local

Météo :

- `src/app/api/live/weather/route.ts`
- `src/app/app/live/LiveRadarDashboard.tsx`
- `src/components/radar/useLiveWeather.ts` (nouveau)
- `src/lib/live-weather.ts`, `src/lib/live-weather-types.ts`
- `src/lib/weather-locations.ts`, `weather-adapters.ts`, `weather-contract.ts`,
  `weather-request.ts`, `weather-client.ts` (nouveaux sous `src/lib`)
- `src/lib/live-weather.test.ts`, `src/lib/radar-access.test.ts`
- `src/lib/weather-adapters.test.ts`, `weather-contract.test.ts`,
  `weather-request.test.ts`, `weather-server.test.ts` (nouveaux sous `src/lib`)

RSS / inventaire partagé :

- `src/lib/radar-countries.ts` (inventaire extrait à l'identique, nouveau)
- `src/lib/live-osint.ts`, `src/lib/live-osint-types.ts`, `src/lib/radar-workspace.ts`
- `src/lib/rss-collector.ts`, `src/lib/rss-collector-types.ts`, `src/lib/rss-collector.test.ts`

Réception navigateur :

- `e2e/radar-weather.spec.ts` (nouveau)
- `e2e/helpers/radar-fixture.ts`, `e2e/radar-workspace.spec.ts`
- `e2e/radar-reliability.spec.ts`, `e2e/dashboard-reception.spec.ts`
- `e2e/tv-workspace.spec.ts` (chemins des nouvelles captures seulement)

Documents : ce dossier (nouveau), backlog RW (document préexistant non suivi),
`docs/production-progress.md`, `docs/non-regression-checklist.md`,
`docs/dashboard-session-handoff.md`, `contextellm.md`,
`docs/production-backlog.md` et `docs/plan-dashboard-backlog.md`.
Le prompt Gemini préexistant non suivi est conservé sans modification.

Compatibilité explicite : `live-weather.ts` réexporte temporairement les
helpers purs pour les consommateurs/tests serveur existants. Le client importe
directement les modules purs. `RadarRssArticle.editorialScope` et
`FeedConfig.editorialScope` sont obligatoires ; le type historique `RadarArticle`
garde ce champ optionnel pour GDELT encore présent côté serveur/bandeau.
Aucun cast de contournement ne remplace un champ RSS ou météo obligatoire.

## Captures, restitution et limites

Nouvelles captures dans `.local-logs/rw/screenshots/` (ignoré par Git) :
desktop/mobile/sources Radar, réception 1366/390/683 px, TV 1366/390/320 px.
Les fichiers `l4-dashboard-real-*` produits par les scénarios historiques sont
désormais des **pannes simulées**, malgré leur nom historique ; ils ne prouvent
pas une réception amont réelle. Les anciennes captures suivies sont préservées.

Le serveur existant sur 3001 a été identifié avant les essais par son chemin
dans ce checkout et sa santé. Les processus dev et build ont été servis
successivement, sans construction de `.next` pendant son service. Le hash privé
de `.env.local` est identique avant/après (valeur non publiée). Le serveur final
est `npm run dev` sans drapeaux MVP ajoutés, avec la configuration Clerk initiale.
Vérification après restitution : santé **HTTP 200**, météo anonyme **401**,
dashboard anonyme **307** vers la connexion Clerk ; fichier privé inchangé.
Résultat consigné dans `.local-logs/rw/restoration.json`, sans URL de session.

Restent hors réception : comptes Clerk authentifiés standard/expiré/suspendu/
administrateur, appareils physiques, VLC/lecture réelle, fournisseurs météo et
21 RSS actuels (dont AIP), zoom natif du navigateur nouvellement contrôlé,
quotas réels Railway, et staging/production. Le reflow 683 px est reçu par E2E ;
il ne remplace pas une nouvelle preuve de zoom natif 200 %.
Les gardes des profils sont couvertes localement par la matrice de handlers,
les parcours TV par fixtures et le refus anonyme par le build réel. Aucune
mutation distante pour fabriquer des comptes ou des droits.

Railway `just-compassion` demeure staging. La version locale corrigée n'y est
pas déployée. La publication et sa réception authentifiée exigent une demande
ultérieure. Un retour applicatif à `54e5696` réintroduit RW-001 ; un repli sûr
doit préserver les gardes et désactiver le secours navigateur non reçu.

Références fournisseurs vérifiées en lecture seule pendant l'implémentation :
[Open-Meteo](https://open-meteo.com/en/docs),
[JSON wttr.in](https://github.com/chubin/wttr.in#json-output),
[codes WorldWeatherOnline](https://www.worldweatheronline.com/weather-api/api/docs/weather-icons.aspx).
L'attribution Open-Meteo reste CC BY 4.0 ; celle de wttr.in nomme wttr.in et ses
codes, sans lui attribuer la licence des données Open-Meteo. La licence du code
wttr.in ne constitue pas une preuve de licence identique pour ses données.
