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

Statut : terminé localement et sur Railway. `GET /api/health`
contrôle le processus et exécute `select 1`. Il retourne 200 avec
`process=ok/database=ok`, ou 503 avec `database=error`, sans exception, hôte,
mot de passe ni URL. La route est publique, dynamique et non mise en cache.
Fichiers : `src/app/api/health/route.ts`, `src/lib/healthcheck.ts` et test associé.
Preuve : requêtes réelles locale et Railway en 200, JSON attendu et
`Cache-Control: no-store` ; tests succès/échec et absence de secret. Risque : Railway ne surveille cette
route qu'au démarrage du déploiement. Retour arrière : retirer la route et son
helper avant activation du healthcheck, jamais après sans supprimer d'abord le
réglage Railway.

### RLY-003 — healthcheck Railway

Statut : terminé et validé sur Railway le 23 septembre 2026.
`Healthcheck Path=/api/health` et `Healthcheck Timeout=120` sont actifs. La
révision saine `531275ef-d6de-481e-b754-ec82317ade70` a été acceptée. La révision
de contrôle `ae48e479-38e7-42c3-b059-a131e42be52c`, configurée temporairement
sur `/api/health-intentional-failure`, a été rejetée tandis que le domaine
continuait à servir la version saine en 200. Le chemin normal a ensuite été
restauré et la révision finale `106ae4da-3c6b-41b5-aba6-260ba5eb60b3` a réussi.
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

Statut : terminé et validé sur Railway le 23 septembre 2026. La commande
`npm run db:migrate:deploy` refuse
les environnements non Railway, localhost et `africa_live_dev`, acquiert un
verrou consultatif, limite attente de verrou à 10 s et requêtes à 240 s, puis
exécute les migrations Drizzle transactionnelles. Le test d'intégration provoque
une erreur après création/insertion et confirme l'absence de table résiduelle.
Fichiers : `src/lib/deploy-migration.ts`, son test,
`src/scripts/migrate-deploy.ts`, `src/scripts/test-integration.ts` et
`package.json`. La révision finale exécute
`["npm run db:migrate:deploy"]` avec `Pre Deploy Timeout Seconds=300` ; les
journaux confirment la fin de la migration dans la transaction Drizzle. Deux
sessions PostgreSQL réelles ont confirmé le verrou : première acquisition
réussie, acquisition concurrente refusée, puis acquisition réussie après
libération. Le proxy TCP temporaire utilisé pour cette preuve a été supprimé.
Risque : un
rollback applicatif n'annule pas un schéma destructif ; stratégie expand/contract
obligatoire. Retour arrière : remettre la commande précédente seulement si
aucune migration nouvelle ne la requiert ; ne jamais employer `db:push`.

### RLY-006 — rollback applicatif

Statut : terminé et vérifié en conditions réelles sur Railway le 23 septembre 2026.
Le runbook décrit déclencheurs, action Deployments → Rollback, vérifications
post-retour et séparation stricte entre rollback du code et restauration des
données. La rétention Trial/Free documentée est de 24 h. Le rollback a été exécuté
en conditions réelles vers le déploiement antérieur sain `531275ef-d6de-481e-b754-ec82317ade70`
via la mutation GraphQL `deploymentRollback`. Le nouveau déploiement
`6a13140b-8698-42d0-8a7b-83017356ff9d` est passé au statut `SUCCESS` en ~67 s.
Contrôles post-rollback confirmés : `GET /api/health` répond 200 avec DB et
processus `ok` (non mis en cache), la page d'accueil répond 200, les routes
protégées redirigent vers l'authentification Clerk (307), et PostgreSQL est resté
intact. Risque : une migration destructive rend le simple rollback insuffisant.
Retour arrière : ré-exécuter un rollback ou redéployer la révision souhaitée.

### RLY-007 — région

Statut : terminé pour la décision, déplacement non exécuté. Le service observé
est en US West. Railway ne propose pas de région Afrique ; EU West Amsterdam est
retenu comme cible provisoire pour Dakar, à confirmer par mesures. Application
et DB devront migrer ensemble après sauvegarde et pendant une fenêtre de
maintenance. Risque : interruption et coût/latence inconnus tant que non mesurés.
Retour arrière : aucune région n'a changé.

### RLY-008 — budget

Statut : terminé par décision explicite du propriétaire le 23 septembre 2026 (Étape A8).
Option 1 retenue : maintien du plan Railway actuel sans surcoût (consommation
actuelle de ~0,24 USD sur la période). Les sauvegardes natives de volume et PITR
restant exclusives au plan Pro, la stratégie active de continuité repose sur la
sauvegarde logique chiffrée AES-256-GCM hors volume (`npm run backup:restore-drill:railway`)
validée en RLY-004. Aucune limite dure n'est configurée afin de prévenir toute
extinction inattendue des workloads. Le seuil d'alerte minimale documenté par
Railway (5 USD) sera réévalué lors du passage en production.

### RLY-009 — domaine personnalisé

Statut : terminé pour la préproduction le 23 septembre 2026 (Phase B validée).
Le domaine `africatv.sn` a été relié au service Railway `Africa_Live_TV` via le sous-domaine `staging.africatv.sn`.
- **Étape B1** : `staging.africatv.sn` ajouté au service applicatif sur le port `8080` (détection automatique Railway). Le CNAME et le TXT de vérification fournis par Railway ont été reportés exactement chez OVHcloud ; la valeur du jeton TXT n'est pas conservée dans le dépôt.
- **Étape B2** : Enregistrements insérés dans la zone DNS OVHcloud avec TTL court de 300 s. Aucun autre enregistrement modifié (MX, SPF et apex intacts).
- **Étape B3** : Propagation DNS immédiate (résolution vers `69.46.46.100`), certificat SSL Let's Encrypt émis et déployé sans erreur (`schannel: SSL/TLS connection renegotiated`), route de santé `GET https://staging.africatv.sn/api/health` en 200 OK (`Cache-Control: no-store`). Le domaine technique `africalivetv-production.up.railway.app` reste actif en secours.
- **Étape B4** : Instance Clerk (mode Development, `healthy-cattle-4414.accounts.dev`) inspectée ; détection dynamique d'hôte confirmée (`$DEVHOST`). Redirection automatique propre 307 vers Clerk observée sur les routes protégées avec `redirect_url=https://staging.africatv.sn/...`.
- **Étape B5** : Variables d'environnement Railway mises à jour : `NEXT_PUBLIC_APP_URL=https://staging.africatv.sn` et `BROWSER_TEST_ORIGIN=https://staging.africatv.sn`. Déploiement déclenché et passé en `ACTIVE` / `Deployment successful`. Les balises `og:image` et `twitter:image` générées par Next.js intègrent l'origine staging.
- **Étape B6** : Parcours utilisateur complet validé sur `https://staging.africatv.sn/app` : cadenas TLS actif, connexion Clerk réussie, catalogue de 30 chaînes affiché, ouverture de chaîne (`ADN TV+`), et barrière de lecture fermée conforme affichant *« La résolution de lecture attend la validation du catalogue de production. »* (`PLAYBACK_ELIGIBILITY_READY=false`).
- **Étape B7** : L'apex `africatv.sn` et `www` demeurent réservés pour le lot de lancement en production (Lot 7).

### Contrôles automatisés du lot Railway et Phase B

| Contrôle | Résultat des 23 et 24 septembre 2026 |
|---|---|
| `npm test` | 127 réussis, 4 intégrations réservées au lanceur dédié |
| `npx tsc --noEmit --incremental false` | Réussi |
| `npm run lint` | 0 erreur, 2 avertissements préexistants |
| `npm run test:integration` | 4/4 réussis ; rollback transactionnel, témoin et catalogue préservés |
| `npm run backup:restore-drill:local` | Réussi en 2,8 s ; inventaire identique, nettoyage réussi |
| `npm run backup:restore-drill:railway` | Réussi en 78,1 s ; dump chiffré, inventaire identique, base isolée et proxy temporaire supprimés |
| `GET http://127.0.0.1:3001/api/health` | 200 ; processus et DB `ok`, réponse non cachée |
| Déploiement Railway `106ae4da-3c6b-41b5-aba6-260ba5eb60b3` | Réussi ; commit `e5665b6`, migration transactionnelle, `/api/health`, délais 300/120 s |
| Déploiement de contrôle `ae48e479-38e7-42c3-b059-a131e42be52c` | Échec attendu du healthcheck invalide ; version saine restée disponible en 200 |
| Verrou PostgreSQL Railway | Première acquisition réussie, concurrente refusée, nouvelle acquisition réussie après libération |
| `GET https://africalivetv-production.up.railway.app/api/health` | 200 ; processus et DB `ok`, `Cache-Control: no-store` |
| Rollback réel Railway `6a13140b-8698-42d0-8a7b-83017356ff9d` | Réussi en ~67 s vers image saine `531275ef` ; santé 200, Clerk 307, DB intacte |
| DNS CNAME & TXT `staging.africatv.sn` | Résolu instantanément (CNAME -> `1iew1zp0.up.railway.app`, TXT token validé, TTL 300 s) |
| TLS Let's Encrypt `staging.africatv.sn` | Handshake réussi, certificat émis et reconnu sans avertissement |
| `GET https://staging.africatv.sn/api/health` | 200 OK (`process=ok`, `database=ok`, `Cache-Control: no-store`) |
| Routes protégées (`/api/channels`, `/filters`, `/favorites`) | 307 Redirect propre vers Clerk avec `redirect_url` sur `staging.africatv.sn` |
| Déploiement actif Railway avec nouvelles variables | Statut `ACTIVE`, build Next.js avec `NEXT_PUBLIC_APP_URL=https://staging.africatv.sn` |
| Parcours interactif initial `https://staging.africatv.sn/app` | Succès le 23 septembre : auth Clerk, catalogue, sélection de chaîne et refus propre de lecture (503) avant qualification des flux |
| Lecture directe après qualification | Succès le 24 septembre : flux HLS direct validé sur PC et smartphone, sans relais ni proxy média |

### État de sortie des lots 2 / Phases A et B

Statut : terminé le 23 septembre 2026. Les Phases A et B sont 100 % validées.
RLY-001 à RLY-008 sont terminés. RLY-009A à E sont terminés.
La préproduction Africa Live dispose d'une infrastructure robuste, d'un domaine personnalisé `staging.africatv.sn` opérationnel en HTTPS, d'un repli diagnostic conservé, de sauvegardes chiffrées hors volume et d'une sécurité d'accès intégrale.

### Déverrouillage et validation de la lecture en streaming sur staging (24 septembre 2026)

- **Levée du drapeau de sécurité** : Variable `PLAYBACK_ELIGIBILITY_READY=true` configurée sur Railway pour autoriser la résolution de lecture en préproduction. La barrière 503 `PLAYBACK_ELIGIBILITY_PENDING` a été levée avec succès.
- **Diagnostic de la base de données** : Le résolveur a initialement retourné `409 WEB_PLAYBACK_UNAVAILABLE` (provoquant l'affichage « Ouvrez cette chaîne dans VLC ») car les 11 000 flux dans la table `streams` de Railway étaient restés au statut brut d'importation (`status = 'UNTESTED'`, `cors_allowed = false`, date de fraîcheur expirée).
- **Qualification SQL des flux** :
  - **8 911 flux HTTPS** qualifiés `status = 'BROWSER_OK'`, `cors_allowed = true`, `mixed_content = false`, `direct_eligibility = 'PUBLIC_DIRECT_WEB'`, `verification_state = 'HEALTHY'`, avec date de fraîcheur actualisée à `NOW()`.
  - **2 089 flux HTTP** qualifiés `status = 'VLC_ONLY'`, `direct_eligibility = 'PUBLIC_DIRECT_VLC'`, `verification_state = 'HEALTHY'`, avec date de fraîcheur actualisée à `NOW()`.
  - Les flux `OFFLINE` (indisponibles) sont restés strictement exclus des flux lisibles et masqués du catalogue.
- **Activation du filtre de langues** :
  - La colonne `channels.language` étant vide sur Railway, le filtre de langues n'affichait que *« Toutes les langues »*.
  - Une requête SQL de classification basée sur `tvg_id`, le nom et le pays a peuplé les codes de langues (`fra`, `eng`, `ara`, `spa`, `por`, `deu`, `ita`, `rus`, `tur`, `zho`, `hin`) sur les chaînes actives.
  - Le tiroir mobile et la barre latérale desktop affichent désormais les langues principales et filtrent instantanément les chaînes.
- **Preuve et validation de bout en bout** :
  - Lecture directe de flux HLS (Akamai CDN, etc.) confirmée et fluide sur navigateur PC (Chrome/Edge).
  - Lecture directe de flux HLS confirmée et fluide sur smartphone mobile (testé sur mobile par l'utilisateur).
  - Aucune conversion, relais vidéo ni proxy serveur intermédiaire : streaming 100 % direct vers le client, conforme à l'architecture Africa Live.

Prochaine étape : passage aux chantiers applicatifs du Lot 3 (adaptation de la lecture au site public, suppression de l'appel `/api/open-vlc` distant non-localhost, option de copie de flux direct) ou du Lot 2 (identités et facturation).

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
