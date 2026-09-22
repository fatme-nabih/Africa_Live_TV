# Progression — préparation production

## Journal des lots opérationnels 0 et 1 — 22 septembre 2026

Périmètre : documentation de l'état Railway existant et stabilisation des deux
modes locaux. Aucun commit, push, déploiement, changement Railway, migration de
données métier ou modification du projet source IPTV n'est autorisé par ce lot.

### DOC-001 — état Railway

Statut : terminé. Le backlog ne présente plus Railway comme inexistant. Le projet
`just-compassion`, son service applicatif, PostgreSQL, le commit actif, le rôle
staging, le catalogue de 30 éléments et la fermeture de la lecture ont été
consignés. Fichier : `docs/production-backlog.md`. Vérification : comparaison de
l'interface Railway, du déploiement actif et du catalogue authentifié. Risque :
absence de healthcheck, de tâche planifiée et de restauration démontrée. Retour
arrière : restaurer seulement la section documentaire ; aucun état externe changé.

### DOC-002 — matrice des environnements

Statut : terminé. `docs/environment-matrix.md` distingue Local Clerk, Local MVP,
Staging Railway et Production pour les flags, URLs, DB, Clerk, VLC, éligibilité
et proxy. Vérification : cohérence avec le validateur serveur et la configuration
Railway observée. Risque : les secrets et leur validité fournisseur sont
volontairement non affichés. Retour arrière : suppression du document uniquement.

### DOC-003 — journal par ticket

Statut : terminé. Ce chapitre enregistre résultat, fichiers, tests, risques et
retour arrière pour chaque ticket. Aucun journal ne
contient de secret ni d'URL média.

### DOC-004 — non-régression

Statut : terminé. `docs/non-regression-checklist.md` couvre configuration, base,
auth, catalogue, recherche, filtres, favoris, lecture web, VLC et Railway. Retour
arrière : suppression du document ; aucune exécution ni donnée modifiée.

### LOC-001 — horloge Windows

Statut : terminé. Le premier essai sans élévation de
`w32tm /resync /force` a été refusé (0x80070005). L'utilisateur a ensuite exécuté
la commande depuis PowerShell administrateur le 22 septembre ; Windows a répondu
que la commande s'était terminée correctement. Trois mesures suivantes contre
`time.windows.com` donnent environ 0,10 s de dérive, compatible avec Clerk et
confirmée par la reconnexion réussie. L'utilisateur a ensuite configuré le
service en démarrage automatique, l'a démarré et a relancé la synchronisation.
Le contrôle final montre `w32time` Running/Automatic, strate 5, source
`time.windows.com,0x9`, dernière synchronisation réussie à 18:37:37 et trois
mesures de dérive autour de +0,143 s. Fichier associé :
`src/scripts/diagnose-local.ts`. Risque résiduel : contrôler de nouveau après un
redémarrage Windows. Retour arrière système : remettre le type de démarrage
précédent uniquement si nécessaire, depuis un terminal administrateur.

### LOC-002 — session Clerk locale

Statut : terminé. L'ancienne session locale a été explicitement déconnectée et
l'application est revenue à l'accueil anonyme. L'utilisateur a effectué la
reconnexion Clerk interactive ; le catalogue affiche l'avatar du compte et 30
chaînes. Aucun mot de passe, cookie ou gestionnaire de secrets n'a été automatisé.
Retour arrière : déconnexion depuis le menu Clerk.

### LOC-003 — API authentifiées

Statut : terminé. Après reconnexion, les journaux Next.js confirment
`GET /api/filters 200`, `POST /api/channels 200` et `GET /api/favorites 200`.
L'interface a chargé les options de filtre et 30 chaînes sans erreur lisible ni
HTML Clerk. Les mutations de favori ont également répondu 200.

### LOC-004 — réponses HTML/404 d'authentification

Statut : terminé. `src/lib/api-contracts.ts`
convertit les HTML 401/404 en « Votre session a expiré. Reconnectez-vous pour
continuer. » avec le code `AUTHENTICATION_REQUIRED`. Les HTML 403 et 5xx ont
également des messages explicites. `src/lib/catalog-api.test.ts` couvre le 404
Clerk et le 503 HTML. Les 127 tests unitaires passent (123 réussis, 4 intégrations
exécutées séparément). Ce changement ne modifie ni le proxy ni les règles d'accès.
Retour arrière : retirer uniquement les branches de diagnostic et leurs tests.

### LOC-005 — mode Clerk et lecture locale

Statut : terminé. Les flags privés observés sont ceux du mode Clerk avec lecture
locale : modes sans auth à `false`, lecture locale et VLC à `true`, éligibilité à
`false`. Le catalogue affiche 30 chaînes. La recherche `.sci-fi` retourne une
chaîne et le filtre Russie une chaîne. `.sci-fi` a été ajouté aux favoris, est
resté favori après rechargement, puis a été retiré pour laisser la base propre.
La lecture a obtenu une première résolution web en 200 et affiché le mode
Navigateur ; après épuisement, la résolution suivante a répondu 409 et le secours
VLC 200. Le processus VLC créé a été fermé après vérification. Les médias sont
toujours téléchargés directement depuis l'amont. Retour arrière : aucun état de
test persistant ; favori nettoyé.

### LOC-006 — mode MVP sans Clerk

Statut : terminé. Les 13 E2E `local-mvp`, `local-playback` et
`local-playback-api` passent avec les flags MVP injectés sans modifier
`.env.local`. Ils couvrent accès sans compte, première réponse de 30 chaînes,
pagination, pays, favori persistant, HLS/MP4 directs, reprises bornées et garde-
fous VLC. Les fixtures créées ont été nettoyées et les empreintes du catalogue
restent inchangées. Retour arrière : aucun, les flags n'existaient que dans le
processus de test.

### LOC-007 — VLC réel

Statut : terminé. L'exécutable `C:/Program Files/VideoLAN/VLC/vlc.exe` est
présent. En mode MVP, `/api/channels` a renvoyé 30 chaînes, puis un appel autorisé
à `/api/open-vlc` avec uniquement un `channelId` et un `launchId` a répondu 200.
Le nombre de processus VLC est passé de 0 à 1 ; la réponse ne contenait aucune
URL source. Le processus créé pour la vérification a ensuite été fermé. Les E2E
confirment séparément que le clic UI transmet ces identifiants, et que les URL
arbitraires/origines étrangères sont refusées. Aucune URL amont n'est consignée.
Retour arrière : aucun changement persistant.

### LOC-008 — diagnostic local

Statut : terminé. `npm run diagnose:local`
affiche sans secrets : version Node, origine, flags, modes de clés Clerk, cible
et compteurs DB, fraîcheur, VLC, état et dérive de l'horloge. Premier résultat :
11 778 chaînes, 12 396 sources, base `africa_live_dev`, VLC trouvé. Après la
correction LOC-001, la source horaire réseau est détectée et la dérive finale
mesurée est d'environ 0,14 s. Fichiers : `package.json`
et `src/scripts/diagnose-local.ts`. La commande termine avec succès et n'affiche
aucune valeur de clé ni mot de passe DB. Retour arrière : retirer la commande et
le script ; lecture seule sur la base et le système.

### Contrôles automatisés du lot local

| Contrôle | Résultat du 22 septembre 2026 |
|---|---|
| `npm test` | 123 réussis, 4 ignorés car exécutés par le lanceur d'intégration |
| `npm run test:integration` | 4/4 réussis ; témoin et catalogue préservés |
| `npx tsc --noEmit --incremental false` | Réussi |
| `npm run lint` | 0 erreur, 2 avertissements préexistants dans `SeparatePlayerPage.tsx` |
| `npm run db:check:migrations` | Réussi |
| `npm run config:check` | Réussi |
| `npm run build` | Réussi, Next.js 16.3.5 |
| E2E locaux ciblés | 13/13 réussis sur Edge |
| `npm run diagnose:local` | Réussi ; source réseau et dérive 0,145 s, avec avertissement attendu sur la fraîcheur des sources |

### Clôture des lots opérationnels 0 et 1

Statut : terminé le 22 septembre 2026. La première page affiche 30 chaînes ;
recherche, filtres et favori persistant ont été validés ; une source web a été
tentée directement ; VLC a été lancé en modes MVP et Clerk ; les erreurs
d'authentification sont compréhensibles ; la base locale dédiée et les données
du projet IPTV source sont restées intactes. Railway est documenté comme staging
logique existant et n'a pas été modifié. Aucun commit, push ou déploiement n'a
été effectué.

## Journal du lot opérationnel 2 — 22 septembre 2026

Périmètre : préparer Railway comme préproduction fiable sans commit, push,
déploiement, achat, changement de région, abonnement à une notification ou
activation de domaine. Runbook :
`docs/railway-preproduction-runbook.md`.

### RLY-001 — qualification de la préproduction

Statut : terminé. Le projet Railway `just-compassion` conserve le nom
d'environnement visible `production`, mais son rôle est explicitement staging
grâce à `DEPLOYMENT_ENV=staging`. Le backlog, la matrice et le runbook indiquent
que ce nom ne constitue ni une promotion ni une cible de production. Risque :
confusion opérateur dans le tableau de bord. Retour arrière : documentaire
uniquement ; aucune variable Railway modifiée.

### RLY-002 — route de santé

Statut : terminé localement, livraison Railway en attente. `GET /api/health`
contrôle le processus et exécute `select 1`. Il retourne 200 avec
`process=ok/database=ok`, ou 503 avec `database=error`, sans exception, hôte,
mot de passe ni URL. La route est publique, dynamique et non mise en cache.
Fichiers : `src/app/api/health/route.ts`, `src/lib/healthcheck.ts` et test associé.
Preuve : requête réelle locale 200, JSON attendu et `Cache-Control: no-store` ;
tests succès/échec et absence de secret. Risque : Railway ne surveille cette
route qu'au démarrage du déploiement. Retour arrière : retirer la route et son
helper avant activation du healthcheck, jamais après sans supprimer d'abord le
réglage Railway.

### RLY-003 — healthcheck Railway

Statut : à valider. L'audit du service confirme qu'aucun chemin n'est configuré.
La cible est `/api/health` avec délai 120 s, à saisir après livraison de la route.
Un ancien `railway.json` préparé pendant le lot a été retiré immédiatement :
Railway indique que Config as Code est déprécié, indisponible pour un nouveau
service et arrêté le 1er décembre 2026. Une future IaC doit être importée depuis
l'existant avant édition. Risque : configurer le chemin avant que le code soit
livré ferait échouer le prochain déploiement, tout en laissant normalement
l'ancien actif. Retour arrière : supprimer le chemin dans Settings → Deploy.

### RLY-004 — sauvegarde et restauration PostgreSQL

Statut : terminé pour la sauvegarde logique et la restauration isolée ; les
sauvegardes natives/PITR restent dépendantes du plan. Le 22 septembre 2026,
`npm run backup:restore-drill:railway` a exporté PostgreSQL Railway avec le client
18.6 au format custom, chiffré le dump en AES-256-GCM et protégé sa clé avec
Windows DPAPI pour l'utilisateur courant. Le script a déchiffré cette copie,
créé une base Railway isolée au nom aléatoire, restauré puis comparé 21 tables,
11 000 chaînes, 11 000 sources, 1 utilisateur, 0 favori et 10 migrations en
78,1 s. La base temporaire et le proxy TCP temporaire ont été supprimés ; le
dump chiffré, sa clé DPAPI et ses métadonnées restent dans `backups/railway`,
ignoré par Git et hors du volume Railway. Aucun secret ni URL DB n'a été affiché.

Limite : la clé DPAPI est liée à ce compte Windows ; cette copie protège le
pré-déploiement mais ne constitue pas encore une sauvegarde durable hors du
poste. L'interface Railway affiche toujours « No Backups » et réserve
sauvegardes/PITR au plan Pro ; aucune dépense n'a été engagée. Le RPO de 24 h et
le RTO de 2 h restent donc des objectifs provisoires. Fichiers : `package.json`
et `src/scripts/backup-restore-railway.ts`. Retour arrière : supprimer uniquement
les trois fichiers de sauvegarde après décision explicite ; le script ne laisse
aucune base de restauration ni accès PostgreSQL public actif.

### RLY-005 — migrations de déploiement

Statut : à valider sur Railway. La commande `npm run db:migrate:deploy` refuse
les environnements non Railway, localhost et `africa_live_dev`, acquiert un
verrou consultatif, limite attente de verrou à 10 s et requêtes à 240 s, puis
exécute les migrations Drizzle transactionnelles. Le test d'intégration provoque
une erreur après création/insertion et confirme l'absence de table résiduelle.
Fichiers : `src/lib/deploy-migration.ts`, son test,
`src/scripts/migrate-deploy.ts`, `src/scripts/test-integration.ts` et
`package.json`. Le tableau de bord utilise encore `npm run db:migrate` sans
délai ; cible future : nouvelle commande et délai Railway 300 s. Risque : un
rollback applicatif n'annule pas un schéma destructif ; stratégie expand/contract
obligatoire. Retour arrière : remettre la commande précédente seulement si
aucune migration nouvelle ne la requiert ; ne jamais employer `db:push`.

### RLY-006 — rollback applicatif

Statut : terminé pour la procédure. Le runbook décrit déclencheurs, action
Deployments → Rollback, vérifications post-retour et séparation stricte entre
rollback du code et restauration des données. La rétention Trial/Free documentée
est de 24 h. Risque : une migration destructive rend le simple rollback
insuffisant. Retour arrière de la documentation : aucun effet externe.

### RLY-007 — région

Statut : terminé pour la décision, déplacement non exécuté. Le service observé
est en US West. Railway ne propose pas de région Afrique ; EU West Amsterdam est
retenu comme cible provisoire pour Dakar, à confirmer par mesures. Application
et DB devront migrer ensemble après sauvegarde et pendant une fenêtre de
maintenance. Risque : interruption et coût/latence inconnus tant que non mesurés.
Retour arrière : aucune région n'a changé.

### RLY-008 — budget

Statut : bloqué par le plan d'essai. Le bandeau indique 25 jours ou 4,86 USD de
crédit. Le seuil minimal documenté d'une alerte souple est 5 USD : elle ne peut
pas prévenir utilement l'épuisement actuel. Aucune alerte e-mail ni limite dure
n'a été créée. Après choix du plan, définir une alerte avec destinataire confirmé ;
une limite dure peut arrêter les services et exige une procédure dédiée.

### RLY-009 — domaine personnalisé

Statut : en cours. Le propriétaire a acquis `africatv.sn` chez OVHcloud le 22
septembre 2026 ; l'interface fournie confirme aussi la présence de la zone DNS.
Aucune donnée de compte, de paiement ou de messagerie n'est reprise dans le
dossier. Le plan réserve `staging.africatv.sn` à la préproduction Railway et
conserve `africatv.sn` ainsi que `www.africatv.sn` pour la production future.
Aucun enregistrement DNS, domaine Railway, certificat ou réglage Clerk n'a été
modifié. Prochaines validations : valeurs CNAME/TXT fournies par Railway, HTTPS,
healthcheck, repli par le domaine Railway, puis URLs Clerk/app et parcours
authentifié. Retour arrière futur : conserver le domaine Railway, revenir aux
URLs précédentes, puis retirer le lien Railway et les enregistrements DNS du
sous-domaine staging. L'acquisition du domaine n'est pas annulée.

### Contrôles automatisés du lot Railway

| Contrôle | Résultat du 22 septembre 2026 |
|---|---|
| `npm test` | 127 réussis, 4 intégrations réservées au lanceur dédié |
| `npx tsc --noEmit --incremental false` | Réussi |
| `npm run lint` | 0 erreur, 2 avertissements préexistants |
| `npm run test:integration` | 4/4 réussis ; rollback transactionnel, témoin et catalogue préservés |
| `npm run backup:restore-drill:local` | Réussi en 2,8 s ; inventaire identique, nettoyage réussi |
| `npm run backup:restore-drill:railway` | Réussi en 78,1 s ; dump chiffré, inventaire identique, base isolée et proxy temporaire supprimés |
| `GET http://127.0.0.1:3001/api/health` | 200 ; processus et DB `ok`, réponse non cachée |

### État de sortie du lot 2

Statut : partiel. RLY-001, RLY-002 local, RLY-006 et RLY-007 décision sont
terminés. RLY-009A/B sont terminés grâce à l'acquisition de `africatv.sn` et à
la réservation des noms ; RLY-009C à F restent à exécuter. RLY-003 et RLY-005
attendent livraison et activation Railway ; RLY-004 est terminé pour la preuve
logique, mais les sauvegardes natives/PITR restent dépendantes du plan ; RLY-008
est bloqué par l'essai. Depuis
la précédente clôture, le seul changement externe constaté est l'acquisition du
domaine par le propriétaire ; l'assistant n'a modifié ni Railway, ni OVHcloud.

## Périmètre autorisé

17 septembre 2026 : exécution des étapes 0 et 1, tickets PROD-001/002/003 et
PROD-010/011/012. Aucun déploiement, commit, push ou changement de fournisseur.
La conversation Grok a été lue pendant les travaux ; les pistes Railway et
Better Auth sont consignées dans architecture-options.md pour décision avant le lot 2.

## Référence initiale — PROD-001

Statut : terminé.

- Next.js 16.2.11, React 19.2.4, Clerk 7.5.7, Drizzle ORM 0.45.2.
- Node 22.16.0, npm 11.12.0, Windows, base locale africa_live_dev.
- 12 fichiers suivis comportaient déjà des modifications : public/africa-live.svg,
  public/favicon.ico, src/app/app/page.tsx, src/app/favicon.ico,
  src/app/globals.css, src/app/layout.tsx, src/components/CategoryTabs.tsx,
  ChannelGrid.tsx, FilterSidebar.tsx, InlinePlayerModal.tsx, Player.tsx et
  SeparatePlayerPage.tsx. Des images/icônes, manifestes, BrandLogo.tsx et le plan
  de production étaient également non suivis.
- Copies et empreintes SHA-256 de cet état, ainsi que package.json et son lockfile,
  enregistrées sous .local-logs/production-phase01/before et baseline.json,
  ignorés par Git. Aucun fichier .env ou secret n'a été inclus.
- Référence de l'audit initial : 109 tests réussis, 4 intégrations ignorées,
  lint/types/build/check des migrations réussis.

## Sécurisation des essais — PROD-002

Statut : terminé.

- Nouveau lanceur test:integration : schéma jetable dans africa_live_dev,
  quatre suites séquentielles, aucune résolution de table vers public.
- Contrôles de cible avant connexion/écriture et contrôle du schéma réellement actif.
- Suppression globale des quotas retirée ; IDs uniques et suppression des seules clés du test.
- Témoin indépendant des quotas et empreintes du catalogue public avant/après.
- Schéma de l'exécution supprimé en finally ; migrations d'origine inchangées.
- Garde-fous pour les E2E locaux accédant à la base.
- Import de currentUser retardé au seul chemin de requête qui l'utilise : les tests
  de synchronisation DB n'initialisent plus les composants React de Clerk.
- Playwright ne réutilise plus automatiquement un serveur déjà présent.

Les premières tentatives ont révélé le conflit React/Clerk en mode react-server,
puis la perte du search_path du lanceur après renouvellement d'une connexion inactive.
Les deux ont été corrigés. La suite a ensuite passé ses quatre tests et conservé
le compteur témoin. Les résultats finaux seront inscrits ci-dessous.

## Référence exécutée — PROD-003

Statut : terminé ; résultats finaux du checkout courant ci-dessous.

Avant mise à jour des dépendances : 110 tests réussis (dont un nouveau garde-fou),
4 intégrations ignorées dans la commande unitaire ; lint et build réussis après
correction d'une annotation TypeScript du nouveau lanceur ; migrations cohérentes.

Les 13 premiers E2E ont réussi mais réutilisaient le serveur lancé depuis
C:/Users/GAMER PC/Africa_TV. Ce résultat n'est pas retenu comme validation du
checkout courant. Ce serveur a été arrêté ; les essais finaux démarrent le
serveur du workspace sur 3001. Aucun fichier de cette autre copie n'a été modifié.

## Dépendances — PROD-010

Statut : terminé, avec risque résiduel modéré de développement documenté ci-dessous.

- Next.js, @next/env et eslint-config-next alignés sur 16.3.5 ; versions explicites.
- @next/env déclaré comme dépendance directe puisqu'il est importé par les scripts.
- Types Node alignés sur la branche 22 ; dépendances transitives corrigées dans le lockfile.
- Mises à jour ciblées : Tailwind/PostCSS, baseline-browser-mapping, nanoid,
  browserslist, brace-expansion, js-yaml et dépendances entraînées.
- Pas de npm audit fix --force ni de régression forcée de drizzle-kit.

Audit complet avant : 13 paquets affectés (1 critique, 6 élevés, 6 modérés).
Après mises à jour : 4 alertes modérées dans la chaîne de développement
drizzle-kit → @esbuild-kit/esm-loader → core-utils → esbuild.
Audit de production final : zéro alerte, toutes sévérités confondues.

L'avis restant concerne le serveur de développement esbuild, pas l'API Next.js.
Drizzle Kit est un outil de développement/migration ; aucune utilisation de
serve() esbuild n'est ajoutée. Ne pas exposer Drizzle Studio ou ces outils.
La solution automatique proposée par npm est un retour incompatible de
drizzle-kit 0.31.10 vers 0.18.1 : non appliquée. Réexaminer à la prochaine
version stable compatible de Drizzle Kit. Ce risque résiduel est explicite.

Sources consultées :
- https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36
- https://github.com/vercel/next.js/releases/tag/v16.3.5
- https://github.com/evanw/esbuild/security/advisories/GHSA-67mh-4wv8-2f99

## Configuration — PROD-011

Statut : terminé.

Validation centrale pure, tests négatifs, commande config:check et hook serveur
instrumentation. Les valeurs factices, modes locaux en production, secrets
faibles connus, combinaisons Clerk incohérentes et cibles DB locales en déploiement
sont rejetés. La préproduction autorise les clés Clerk de test tout en conservant
NODE_ENV=production et les mêmes règles d'accès. La lecture peut rester fermée.
Le validateur n'atteste pas la validité effective des identifiants chez le fournisseur.

Contrat complet et commandes : deployment-configuration.md.

L'essai réel a montré que Next 16 maintenait le listener après un rejet du hook.
L'instrumentation quitte donc explicitement avec le code 1 pour une configuration
de production invalide. Le démarrage a été retesté : sortie 1, diagnostics sans secrets.

## Reproductibilité — PROD-012

Statut : terminé.

Node 22 indiqué dans .nvmrc ; minimum 22.16.0 et npm 10/11 déclarés.
npm ci reconstruit l'installation depuis le lockfile. npm run dev reste sur
127.0.0.1:3001 ; npm start respecte PORT de l'hébergeur ; start:local sert à
tester le démarrage d'un build sur 3001 avec les contraintes de production.

Le nouveau diagnostic Turbopack signalait le traçage global du projet depuis
spawn(command) dans le lanceur VLC. Le commentaire turbopackIgnore documenté
exclut cet exécutable externe du traçage, sans changer son lancement local.
Le build final ne présente plus cet avertissement ; la trace de la route VLC
ne contient ni .env, ni .local-logs, ni fixtures E2E.
Les sauvegardes .local-logs sont également exclues d'ESLint et TypeScript.

## Résultats finaux du 17 septembre 2026

| Contrôle | Résultat |
|---|---|
| npm ci --no-fund | Réussi, installation reconstruite depuis le lockfile |
| npm test | 115 réussis ; les 4 intégrations sont exécutées séparément ci-dessous |
| npm run test:integration | 4 réussis, 0 ignoré ; témoin quota et empreintes catalogue préservés |
| npx tsc --noEmit --incremental false | Réussi ; également validé par le build final |
| npm run lint | 0 erreur, 2 avertissements de navigation dans SeparatePlayerPage.tsx |
| npm run db:check:migrations | Réussi ; préparation des dix migrations en schéma jetable également réussie |
| npm run build | Réussi avec Next.js 16.3.5, aucun avertissement Turbopack restant |
| E2E local-mvp/local-playback/local-playback-api | 13 réussis, Edge, serveur du checkout courant |
| npm audit --omit=dev | 0 vulnérabilité |
| npm audit complet | 4 alertes modérées de développement, 0 élevée/critique |
| npm run config:check | Configuration locale acceptée |
| npm run config:check:production | Configuration locale refusée, code 1 attendu |
| npm run start:local avec configuration MVP | Démarrage de production refusé, processus terminé avec code 1 |
| Activation directe L3_INTEGRATION_TEST sans schéma | Refus avant initialisation de la DB |
| SHA-256 des fichiers utilisateur préexistants | Inchangés, hors package/plan intentionnellement édités |

Les deux avertissements ESLint proviennent d'une nouvelle règle Next 16.3 pour
window.location.assign sur des routes internes. Le fichier utilisateur a été
préservé ; ce point d'interface est à traiter avec le parcours lecteur du lot 3.
Les traces locales sont dans .local-logs/production-phase01 (ignoré par Git).
La sécurité d'une véritable instance Clerk et de son endpoint webhook n'est
pas démontrée par des clés synthétiques et reste à valider en préproduction.

Les six tickets des étapes 0 et 1 sont terminés. Les étapes suivantes n'ont pas
été exécutées. Aucun secret existant modifié, aucune migration publique appliquée,
aucun commit, push ou déploiement effectué.

Contrôle DB après tous les essais : 11 778 chaînes, 12 396 sources et aucun schéma
de test restant. Next dev 16.3.5 a actualisé automatiquement son bloc balisé dans
AGENTS.md ; les règles propres au MVP restent intactes.

## Retour arrière et limites

Les changements de ces lots n'appliquent aucune migration aux tables publiques
et ne changent pas les données métier. Restaurer uniquement les fichiers du lot
depuis la référence locale, puis npm ci, si une régression l'exige ; préserver
les modifications utilisateur préexistantes. Ne pas exposer une version Next
vulnérable pour effectuer un retour arrière public.

Restent hors périmètre : vrais comptes Clerk et paiements, correction de l'ordre
Billing, migration Better Auth éventuelle, choix Railway, tests de charge,
sauvegarde/restauration et migrations non réécrites sur base vierge.
