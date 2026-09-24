# Railway — runbook de préproduction

Référence : 24 septembre 2026. Le projet Railway `just-compassion` est une
**préproduction**, même si l'environnement porte encore le nom d'interface
`production`. La valeur applicative qui fait foi est `DEPLOYMENT_ENV=staging`.
Il ne doit pas être promu en production par simple renommage.

## État vérifié

| Élément | État observé | Cible du lot 2 |
|---|---|---|
| Service | `Africa_Live_TV`, en ligne, domaine Railway | Conserver comme staging |
| PostgreSQL | En ligne, volume persistant, 21 tables | Sauvegarde démontrée avant changement de schéma |
| Région | US West, une réplique | EU West proposé après sauvegarde et fenêtre de maintenance |
| Pré-déploiement | Actif et validé : `npm run db:migrate:deploy`, 300 s | Conserver ; ne jamais revenir à `db:push` |
| Healthcheck | Actif et validé : `/api/health`, 120 s | Conserver public et sans fuite |
| Sauvegardes natives | Aucune ; l'interface les réserve au plan Pro | Ne pas activer sans décision de plan et de coût |
| Domaine | `staging.africatv.sn` actif en HTTPS (Let's Encrypt), DNS OVHcloud validé | Conserver `staging.africatv.sn` pour la préproduction, apex/`www` réservés à la production |
| Lecture streaming | Active (`PLAYBACK_ELIGIBILITY_READY=true`), 8 911 flux HTTPS et 2 089 HTTP qualifiés | Streaming 100 % direct amont sans proxy ni transcodage |

Railway indique aussi que `railway.json` est déprécié, que ce service ne peut
plus l'adopter, et que le mécanisme cessera le 1er décembre 2026. Les réglages
du présent lot restent donc dans le tableau de bord. Une future migration vers
`.railway/railway.ts` devra commencer par `railway config pull`, puis un
`railway config plan` sans changement ; ne jamais écrire un graphe incomplet à
la main, car une ressource omise peut être supprimée lors de l'application.

Références Railway :

- [Healthchecks](https://docs.railway.com/deployments/healthchecks)
- [Pre-deploy command](https://docs.railway.com/deployments/pre-deploy-command)
- [Infrastructure as Code](https://docs.railway.com/infrastructure-as-code)
- [Sauvegarde et restauration PostgreSQL](https://docs.railway.com/guides/postgres-backups-restores)
- [Actions de déploiement et rollback](https://docs.railway.com/deployments/deployment-actions)
- [Régions](https://docs.railway.com/deployments/regions)
- [Contrôle des coûts](https://docs.railway.com/pricing/cost-control)
- [Domaines personnalisés](https://docs.railway.com/networking/domains/working-with-domains)

## Référence de la première livraison sûre

La séquence suivante a été exécutée et validée les 22 et 23 septembre 2026. Elle
reste la référence pour reproduire une livraison ou auditer sa configuration ;
elle ne décrit plus des actions en attente.

1. Vérifier que la sauvegarde logique PostgreSQL chiffrée et sa preuve de
   restauration isolée sont encore disponibles. Ne jamais afficher l'URL ou le
   mot de passe dans les logs.
2. Pousser la branche de livraison, relire/fusionner selon le flux GitHub convenu,
   puis livrer la route publique `GET /api/health`. Elle retourne `200` uniquement si
   le processus répond et si `select 1` réussit ; sinon elle retourne `503`, sans
   détail de connexion.
3. Relire le lot Railway préparé : **Pre-deploy Command**
   `npm run db:migrate:deploy`, **Pre-deploy Timeout** `300`, **Healthcheck Path**
   `/api/health` et **Healthcheck Timeout** `120`.
4. Appliquer ces quatre changements avec la révision contenant la route ; ne pas
   les appliquer seuls sur l'ancien code.
5. Déployer une seule révision. Un échec de migration doit arrêter le
   déploiement ; un healthcheck non-2xx doit laisser la version précédente active.
6. Vérifier `GET /api/health`, connexion Clerk, catalogue de 30 éléments,
   recherche, filtres et favori persistant. Lors de la première livraison, le
   refus explicite de lecture a été vérifié avec
   `PLAYBACK_ELIGIBILITY_READY=false`; depuis le 24 septembre, la valeur staging
   est `true` et la lecture directe doit être testée sur PC et mobile.
7. Consigner l'identifiant du déploiement, les durées, les tests et l'emplacement
   protégé de la sauvegarde. Ne pas activer la production à cette occasion.

Railway n'utilise le healthcheck qu'au démarrage d'un déploiement ; ce n'est pas
une surveillance continue. Une sonde externe reste nécessaire avant production.

## Migrations sûres

`npm run db:migrate:deploy` ajoute quatre barrières : cible Railway staging ou
production obligatoire, refus de localhost et de `africa_live_dev`, verrou
consultatif PostgreSQL empêchant deux migrations concurrentes, et délais de
verrou/requête. Drizzle PostgreSQL exécute les migrations en attente dans une
transaction ; le test d'intégration provoque un échec après création d'une table
et confirme qu'aucune modification ne subsiste.

Règles de schéma :

- employer **expand → migrate/backfill → contract** ; ne pas supprimer ou
  renommer une colonne encore utilisée par la version active ;
- sauvegarder avant tout changement non trivial ;
- ne jamais utiliser `db:push` en préproduction ;
- traiter une migration réussie comme un changement de données indépendant :
  un rollback applicatif n'annule pas automatiquement le schéma ;
- si la migration échoue, ne pas la contourner et ne pas lancer l'application.

## Sauvegarde et restauration

Objectifs provisoires de préproduction : RPO 24 h et RTO 2 h. Ils ne sont pas
encore garantis par Railway : l'essai actuel ne fournit ni sauvegarde de volume
ni PITR et l'interface exige le plan Pro. Aucune mise à niveau ne doit être
effectuée sans décision explicite.

Stratégie à trois niveaux :

1. **Avant chaque migration** : `pg_dump` au format custom, chiffré et stocké
   hors du volume Railway, avec date, commit et empreinte SHA-256.
2. **Quotidien** : sauvegarde logique automatisée avec rétention proposée de
   7 quotidiennes et 4 hebdomadaires, après choix d'une destination et de son coût.
3. **Quand le plan le permet** : sauvegardes de volume et PITR Railway, sans
   remplacer les dumps logiques exportables.

Une restauration n'est validée que dans une base isolée, jamais par-dessus la
préproduction. Vérifier au minimum les tables, migrations, chaînes, sources,
utilisateurs et favoris, puis exécuter la checklist de non-régression. Le test
local `npm run backup:restore-drill:local` applique exactement ce principe sur
une base temporaire nommée aléatoirement et la supprime en fin d'essai. Le 22
septembre 2026, il a restauré 21 tables, 11 778 chaînes, 12 396 sources, 2
utilisateurs et 10 migrations en 2,8 s ; aucun dump n'a été conservé.

La preuve Railway a ensuite été exécutée avec
`npm run backup:restore-drill:railway`. Le dump custom a été chiffré en
AES-256-GCM, sa clé protégée par Windows DPAPI, puis la copie chiffrée a été
déchiffrée et restaurée dans une base Railway isolée. L'inventaire comparé est
de 21 tables, 11 000 chaînes, 11 000 sources, 1 utilisateur, 0 favori et 10
migrations ; durée 78,1 s. La base temporaire et le proxy TCP temporaire ont été
supprimés. Les trois fichiers locaux sont sous `backups/railway`, ignoré par Git.
Cette clé étant liée au compte Windows courant, une destination durable et sa
gestion de clé restent à décider avant de revendiquer un véritable plan de
reprise hors poste.

## Rollback applicatif

Déclencheurs : échec du healthcheck, erreurs 5xx nouvelles, authentification
impossible, catalogue indisponible ou corruption fonctionnelle. Dans
**Deployments**, sélectionner le dernier déploiement connu comme sain et choisir
**Rollback** (ou exécuter la mutation GraphQL Railway `deploymentRollback(id: "<deploymentId>")`).
Railway réutilise son image et ses variables ; selon la documentation, la rétention Trial/Free est de 24 h.
La bascule a été validée le 23 septembre 2026 vers l'image `531275ef` (déploiement `6a13140b`).

Après rollback : vérifier `/api/health`, les trois API catalogue/favoris et Clerk.
Ne pas restaurer la base si la migration est additive et compatible. Pour une
modification destructive ou des données corrompues, arrêter les écritures,
conserver les preuves, restaurer dans une nouvelle base, comparer les inventaires,
puis basculer seulement après validation. Le retour au code précédent ne suffit
jamais à annuler une migration destructive.

## Région, budget et domaine

Railway ne propose pas de région Afrique. **EU West (Amsterdam)** est la cible
provisoire recommandée pour Dakar, à confirmer par des mesures de latence depuis
les utilisateurs visés. Application et PostgreSQL doivent rester dans la même
région. Le passage depuis US West exige sauvegarde, test de restauration et
fenêtre de maintenance ; aucun déplacement n'est engagé dans ce lot.

La décision A8 du 23 septembre conserve le plan actuel sans surcoût. La
consommation observée était d'environ 0,24 USD sur la période. Aucune alerte
inadaptée au crédit restant ni limite dure susceptible d'éteindre les workloads
n'a été activée. Réévaluer le budget, le seuil et le destinataire avant le
passage en production.

Le domaine `africatv.sn` est acquis et sa zone DNS est gérée chez OVHcloud. Cette
acquisition ne vaut pas publication. Le découpage retenu est :

- `staging.africatv.sn` : préproduction Railway actuelle ;
- `africatv.sn` : origine canonique de production future ;
- `www.africatv.sn` : alias ou redirection future vers l'origine canonique.

### Référence de la procédure staging exécutée

1. Livrer et valider d'abord RLY-003/RLY-005 sur le domaine Railway existant.
2. Dans Railway, ajouter uniquement `staging.africatv.sn`, sans supprimer le
   domaine `*.up.railway.app`.
3. Copier exactement les valeurs CNAME et TXT de vérification affichées par
   Railway dans la zone OVHcloud. Ne pas deviner la cible et ne pas modifier les
   enregistrements de messagerie.
4. Employer un TTL court, proposé à 300 secondes pendant la bascule, puis le
   relever après stabilité. Attendre propagation et certificat automatique.
5. Vérifier certificat, redirections et
   `https://staging.africatv.sn/api/health` avant de changer l'application.
6. Ajouter l'origine et les URLs de redirection staging dans Clerk, puis définir
   `NEXT_PUBLIC_APP_URL=https://staging.africatv.sn` et
   `BROWSER_TEST_ORIGIN=https://staging.africatv.sn`. Ces variables publiques
   exigent un nouveau build.
7. Refaire connexion/déconnexion, catalogue de 30 éléments, recherche, filtres,
   favori persistant et lecture directe sur PC et mobile. Avant le déverrouillage
   du 24 septembre, le refus explicite de lecture constituait le résultat attendu.
8. Conserver le domaine Railway comme voie de diagnostic pendant toute la
   préproduction.

Retour arrière : restaurer les URLs applicatives/Clerk précédentes, vérifier le
domaine Railway, retirer le domaine personnalisé de Railway puis supprimer
uniquement ses CNAME/TXT dans OVHcloud. L'apex, `www`, les enregistrements MX et
le reste de la zone ne doivent pas être touchés.

L'activation de `africatv.sn` ou `www.africatv.sn` reste une opération du lot de
lancement. Pour l'apex, confirmer à ce moment-là si OVHcloud fournit le mécanisme
ALIAS/flattening demandé par Railway ; sinon utiliser `www` comme cible CNAME et
une redirection HTTPS de l'apex. Ne pas choisir ce mécanisme avant le test réel.
