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

Publication en cours au moment de ce premier commit. Les identifiants Git et
Railway, la santé distante, les contrôles d'accès anonyme et les E2E distants
seront consignés après leur résultat effectif.

## Limites conservées

Les profils Clerk connectés standard/expiré/suspendu, les amonts météo/RSS
actuels, les appareils physiques et la lecture VLC réelle ne sont pas reçus
par cette publication. Les scénarios de paiement n'effectuent aucun paiement.
Les captures privées, fichiers `.env`, journaux, états de session et médias
synthétiques ne font pas partie du paquet Railway. Le projet source IPTV
reste inchangé. Railway demeure staging ; aucune promotion en production.
