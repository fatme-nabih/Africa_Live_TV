# Railway — runbook de préproduction

Référence : 22 septembre 2026. Le projet Railway `just-compassion` est une
**préproduction**, même si l'environnement porte encore le nom d'interface
`production`. La valeur applicative qui fait foi est `DEPLOYMENT_ENV=staging`.
Il ne doit pas être promu en production par simple renommage.

## État vérifié

| Élément | État observé | Cible du lot 2 |
|---|---|---|
| Service | `Africa_Live_TV`, en ligne, domaine Railway | Conserver comme staging |
| PostgreSQL | En ligne, volume persistant, 21 tables | Sauvegarde démontrée avant changement de schéma |
| Région | US West, une réplique | EU West proposé après sauvegarde et fenêtre de maintenance |
| Pré-déploiement | `npm run db:migrate` | `npm run db:migrate:deploy`, délai 300 s |
| Healthcheck | Aucun chemin configuré | `/api/health`, délai 120 s |
| Sauvegardes natives | Aucune ; l'interface les réserve au plan Pro | Ne pas activer sans décision de plan et de coût |
| Crédit d'essai | 25 jours ou 4,86 USD restants | Ne pas engager de dépense automatiquement |
| Domaine | `africatv.sn` acquis chez OVHcloud, zone DNS disponible ; aucun lien Railway | `staging.africatv.sn` pour la préproduction, apex/`www` réservés à la production |

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

## Ordre d'activation du prochain déploiement

L'activation externe est volontairement différée : aucun commit, push ou
déploiement n'a été demandé. Au prochain créneau autorisé, respecter cet ordre.

1. Vérifier que la sauvegarde logique PostgreSQL chiffrée et sa preuve de
   restauration isolée sont encore disponibles. Ne jamais afficher l'URL ou le
   mot de passe dans les logs.
2. Livrer la route publique `GET /api/health`. Elle retourne `200` uniquement si
   le processus répond et si `select 1` réussit ; sinon elle retourne `503`, sans
   détail de connexion.
3. Dans **Africa_Live_TV → Settings → Deploy**, remplacer le pré-déploiement par
   `npm run db:migrate:deploy` et fixer **Pre-deploy Timeout** à `300` secondes.
4. Dans le même écran, définir **Healthcheck Path** sur `/api/health` et un délai
   de `120` secondes.
5. Déployer une seule révision. Un échec de migration doit arrêter le
   déploiement ; un healthcheck non-2xx doit laisser la version précédente active.
6. Vérifier `GET /api/health`, connexion Clerk, catalogue de 30 éléments,
   recherche, filtres, favori persistant et refus explicite de lecture tant que
   `PLAYBACK_ELIGIBILITY_READY=false`.
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
**Rollback**. Railway réutilise son image et ses variables ; selon la
documentation, la rétention Trial/Free est de 24 h.

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

L'alerte souple Railway a un seuil minimal documenté de 5 USD, supérieur au
crédit restant de 4,86 USD. Elle ne peut donc pas prévenir utilement l'épuisement
de cet essai. Le bandeau actuel « 25 jours ou 4,86 USD » est le seul contrôle
immédiat. Reconfigurer une alerte après choix du plan et confirmation du
destinataire ; ne pas activer de limite dure sans procédure d'arrêt, car elle
éteint les workloads.

Le domaine `africatv.sn` est acquis et sa zone DNS est gérée chez OVHcloud. Cette
acquisition ne vaut pas publication. Le découpage retenu est :

- `staging.africatv.sn` : préproduction Railway actuelle ;
- `africatv.sn` : origine canonique de production future ;
- `www.africatv.sn` : alias ou redirection future vers l'origine canonique.

### Procédure staging, après autorisation de déploiement

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
   favori persistant et refus attendu de lecture publique.
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
