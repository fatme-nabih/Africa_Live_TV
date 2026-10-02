# Publication GitHub et Railway staging — 2 octobre 2026

## Périmètre et autorisation

Le propriétaire a demandé la mise à jour GitHub et Railway avec le CLI.
Cette publication reprend RW-001 à RW-010, les six clés distinctes des overlays
du lecteur et la correction du rejet de `reader.cancel()` lors d'une annulation.
Les changements locaux préexistants sont conservés. Le brouillon indépendant
`docs/plan-experience-premium.md` reste local et hors du paquet publié.

GitHub cible `fatme-nabih/Africa_Live_TV`, branche `main`. Railway cible le
service `Africa_Live_TV` du projet `just-compassion`, environnement nommé
`production` dans le dashboard mais rôle applicatif **staging**. Les domaines
existants sont `staging.africatv.sn` et `africalivetv-production.up.railway.app`.
Aucune modification de variable, DNS, plan, schéma ou infrastructure demandée.

## Vérifications avant publication

- Unitaires : **244 réussis, 14 ignorés, zéro échec** (258 tests).
- Invariants : **4/4**. TypeScript, ESLint, migrations et build réussis.
- Régression annulation HTTP native : **5/5** tests du fichier, deux cas
  deadline/annulation parent ; reproducteur sans rejet non géré dans les deux cas.
  Le premier assemblage a révélé un mock fetch persistant dans les nouveaux
  tests ; capture du fetch natif avant les mocks, puis assemblage complet réussi.
- Lecteur : réception de composant avec réseau simulé, quatre cas et zéro
  avertissement de clé dupliquée ; le code initial en produisait quinze.
- Réception RW historique : **51 E2E dev**, **1/1 build servi** ; les **18/18**
  météo sont compris dans ces 51 et ont été revérifiés sur le message final.
- Migrations distantes contrôlées en lecture seule par `railway ssh` :
  **19 fichiers, 19 appliquées, zéro en attente, empreintes identiques**.
  Le pré-déploiement existant reste `npm run db:migrate:deploy` ; aucune
  migration de schéma nouvelle ne nécessite de sauvegarde préalable ici.
- Variables de sécurité lues sans révéler de secrets : `DEPLOYMENT_ENV=staging`,
  quatre drapeaux de lecture/dev/VLC locaux à `false`, éligibilité prête et URL
  publique staging. Aucun changement de variable.
- Build local effectué dans un snapshot ignoré séparé ; le serveur dev sur
  3001 n'a pas servi une arborescence `.next` en cours de construction.

Preuves locales ignorées : `.local-logs/publication-2026-10-02/` (`unit-final.log`,
`types.log`, `lint.log`, `invariants.log`, `migrations.log`, `build.log`,
`weather-request-final.log`, `release.json`). Les preuves lecteur et le
reproducteur natif restent dans `.local-logs/review-2026-10-02/`.

## Livraison et réception distante

Réception effectuée le **2 octobre 2026 à 19:22 UTC** :

- GitHub `main` : applicatif et dossier initial publiés au commit
  [`51c0bc8b8cdbc3697027f298a22823d66e1176a2`](https://github.com/fatme-nabih/Africa_Live_TV/commit/51c0bc8b8cdbc3697027f298a22823d66e1176a2).
  `git ls-remote` confirme ce commit sur `main` après le push.
- Railway livré par `railway up --path-as-root --detach` avec projet, service
  et environnement explicites. Déploiement
  **`f0816583-e6a0-4115-bd54-d4cb0709acb1` : SUCCESS**, instance active RUNNING.
  Le pré-déploiement existant a terminé ; le processus Next est prêt.
- Paquet : **373 fichiers de source/documentation**, sans captures privées ni
  fixtures média ; SHA-256 du manifeste ordonné
  `e7c5062ae9a0b71875136b96ea01d9edf1a0de95f192f817583fb5b2eb19e007`.
  Les fichiers ont été extraits du commit avec Git, sans modification locale
  non committée dans le paquet. Les artefacts build/dependencies sont exclus
  de l'upload par `.railwayignore`.
- Contrôle SHA-256 par SSH CLI sur le conteneur actif : **287 fichiers
  applicatifs/migrations/configuration identiques**, zéro différence ;
  `DEPLOYMENT_ENV=staging`, runtime Node en production.
- Sur [le domaine staging](https://staging.africatv.sn) et
  [le domaine Railway](https://africalivetv-production.up.railway.app) :
  santé **200**, processus et base `ok` ; météo anonyme **401** avec
  `AUTHENTICATION_REQUIRED` ; dashboard **307** vers la connexion.
- **9/9 E2E distants réussis**, zéro ignoré : landing, widgets Clerk réels,
  accès anonyme pages/API, cinq scénarios de paiement sans transaction réelle,
  worker MapLibre réel et protection dashboard/météo. Aucun compte créé ni
  session authentifiée utilisée. Log `e2e-remote.log` (38,7 s).
- Après déploiement : migrations toujours **19/19**, zéro en attente et
  empreintes identiques ; variables de sécurité inchangées.
- Local conservé : port **3001**, santé **200**, météo anonyme **401** et
  dashboard **307** ; fichier `.env.local` identique avant/après.

Preuves supplémentaires ignorées : `remote-source.json`, `health.json` et
`railway-upload.log` dans le dossier de publication. Les journaux CLI build et
runtime sont `.local-logs/l5-f0816583-e6a0-4115-bd54-d4cb0709acb1-build.jsonl`
et `...-deployment.jsonl`. Un commit documentaire de clôture publie ensuite
ces résultats ; il ne change aucun fichier applicatif reçu sur Railway.

## Limites conservées

Les profils Clerk connectés standard/expiré/suspendu, les amonts météo/RSS
actuels, les appareils physiques et la lecture VLC réelle ne sont pas reçus
par cette publication. Les scénarios de paiement n'effectuent aucun paiement.
Les captures privées, fichiers `.env`, journaux, états de session et médias
synthétiques ne font pas partie du paquet Railway. Le projet source IPTV
reste inchangé. Railway demeure staging ; aucune promotion en production.
