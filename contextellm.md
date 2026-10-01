# Africa Live — contexte de reprise de session

Dernière mise à jour : 1er octobre 2026, fuseau Africa/Dakar.

Ce document permet à une nouvelle session de reprendre le travail sans
réinterpréter l'historique. Il ne contient volontairement aucun secret, cookie,
mot de passe, identifiant de paiement, clé Clerk ou URL de flux média.

## État de reprise courant — 1er octobre 2026

**Complément L5 courant : AL-T05 réalisé, testé et évalué localement**, après
demande explicite du propriétaire. Prototype opt-in dans `/app`, désactivé au
chargement, uniquement avec `npm run dev` sur localhost:3001 ; base africa_live_dev.
Lecteur web unique géré, zapping, destruction HLS/vidéo, pause, volume conservé,
plein écran, filtres indépendants et parcours modale/fenêtre reçus.
Recommandation **ajuster avant généralisation** : VLC sort du prototype vers le
lecteur historique ; son arrêt reste manuel et l'exclusivité globale n'est pas
reçue. Voir [la réception L5](docs/anchored-player-validation.md).
220 unitaires + 14 intégrations isolées, 41 scénarios E2E distincts reçus ;
TypeScript/ESLint/build/migrations réussis. Comptes Clerk ordinaires, VLC réel,
amont réel et appareils physiques non reçus en L5. Administrateur inchangé.
Publication L5 autorisée ensuite et reçue le 1er octobre à 20:08 UTC :
commit applicatif `9326fc0` poussé sur GitHub `main`, Railway staging
`dc557ad8-8288-4872-863d-7a2b6396014c` SUCCESS/actif. Santé processus/base 200
sur les deux domaines, **9 E2E distants réussis**. Le contrôle d'activation
ancré reste absent du build production ; le prototype reste local et opt-in.
Briefing inactif, L6 non commencé. [Preuves de publication](docs/anchored-player-validation.md#publication-github-et-railway-staging).
La clôture L0–L4 ci-dessous est un relevé historique.
La prochaine reprise doit traiter l'ajustement/réception humaine L5 selon demande,
sans démarrer L6 implicitement. Serveur restitué en développement Clerk local.

Clôture publiée à la demande du propriétaire : GitHub `main`, applicatif
`22dea98`, puis commit documentaire final ; Railway staging
`4c8a82cc-5b3b-4a0e-86a1-bf922540869a` SUCCESS reçu à 18:44 UTC.
Santé processus/base 200, Radar anonyme 401, neuf E2E distants repassés.
Aucun changement de code depuis les preuves L4, ni nouvelle migration,
variable, DNS, plan ou abonnement. Voir la fiche de reprise pour les empreintes.

**Lire d’abord [la fiche de reprise dashboard](docs/dashboard-session-handoff.md)** :
L0–L4 terminés et déployés staging ; L5 évalué localement, recommandation ajuster ;
L6 reste différé et nécessite une nouvelle demande.
Les sections anciennes ci-dessous conservent l’historique ; leurs « suite » et
« non déployé » ne sont pas les instructions de reprise actuelles.

### Complément local — 1er octobre 2026 : réception L4

Complément staging autorisé à la suite : snapshot L0–L4 déployé le 1er octobre,
`b0d52c0c-3bca-4600-8a3e-fb1f2709dada` SUCCESS/actif vérifié à 18:09 UTC.
Neuf E2E distants réussis, santé processus/base 200 ; parcours administrateur
Clerk réel reçu en local et staging. Pas de commit/push, changement de plan,
variable ou nouvelle migration. Premier upload expiré avant build puis relance
réussie. Preuves : `docs/dashboard-auth-staging-reception.md`.
Le propriétaire ne dispose que du compte administrateur : essai/actif standard/
expiré non reçus en session réelle. Zoom natif 200 % confirmé puis reçu à
18:29 UTC : viewport de l’outil réinitialisé, DPR=2, 937×477 CSS, aucun
débordement ; pays/clavier/filtres TV/Échap/focus vérifiés. Les premiers
relevés DPR=1 étaient masqués par le viewport simulé de l’outil.

AL-Q01, AL-C05 et acceptation locale AL-Q02 : réception intégrée et dossier
dans `docs/dashboard-release-validation.md` et `docs/dashboard-delivery-dossier.md`.
Les lots L0–L3 sont implémentés et testés localement, sans migration supplémentaire.
Dashboard/API et lecture refusés après expiration ; catalogue consultable.
Les statistiques staging historiques divergent : ne pas les reconduire comme
mesure actuelle. À la réception locale initiale, aucun déploiement n’avait eu lieu ; staging a
ensuite été livré avec autorisation. Rôle, domaine et plan inchangés.
Suite : arbitrage L5 sur le lecteur ancré ; briefing désactivé jusqu’à L6.
La réception de comptes Clerk connectés et le zoom natif restent explicitement
distincts des tests automatisés de gardes et de reflow.

### Complément local — 30 septembre 2026 : AL-C01 / AL-C02

Le propriétaire a décidé de refuser l'accès au dashboard après expiration.
Cette règle est implémentée localement sur `/app/live` et les huit API Radar ;
le catalogue TV demeure consultable selon DOC-006. Grâce active et exception
administrateur préexistantes conservées. Matrice, tests et limites dans
`docs/dashboard-access-matrix.md` ; suivi dans `docs/plan-dashboard-backlog.md`
et `docs/production-progress.md`. Aucun déploiement ni changement distant.
Les références plus anciennes ci-dessous ne décrivent pas cette livraison
locale. Préserver les modifications landing/navigation déjà présentes.

### Complément local — 30 septembre 2026 : fin L0 / fiabilité L1

AL-C03/AL-C04 et AL-D02/AL-D03/AL-D05/AL-D06 sont livrés et testés
localement : identités RSS/options/bandeau, worker ESM explicite, fenêtre
commune 24 h, états par fournisseur, candidates TV selon le résolveur et
bandeau daté. Contrats et preuves : `docs/dashboard-reliability-validation.md`.
La réception du worker en build servi passe depuis une page publique sous
CSP ; le dashboard complet est testé en mode MVP de développement. Pas de
nouvelle session Clerk authentifiée sur le build. Serveur restitué en mode
Clerk local, briefing toujours désactivé jusqu’au lot L6. Aucun changement
de schéma, déploiement, commit, push ou état distant. Les autres lots du plan
restent à faire ; ne pas confondre cette livraison avec Railway.

### Complément local — 30 septembre 2026 : L2 terminé

AL-W01 à AL-W06 sont livrés localement : dashboard compact, sélecteur pays
accessible, URL/historique, priorité au fil sur mobile, carte à la demande,
couches optionnelles datées et tableau de disponibilité. Contrats, captures
et limites : `docs/dashboard-workspace-validation.md`. 211 tests unitaires
et 24 E2E réussis, TypeScript/ESLint/build réussis. Serveur Clerk local
restitué ; briefing désactivé jusqu’à L6. Prochain lot : L3, AL-T01 à AL-T04.
Pas de déploiement, migration, commit, push ou modification distante.

### Complément local — 1er octobre 2026 : L3 terminé

AL-T01 à AL-T04 livrés localement : navigation commune et capacité admin
vérifiée sur le serveur, catégories/langues normalisées à la lecture,
URL/sidebar/raccourcis synchronisés, Afrique/Sénégal/Tout/favoris et contexte
pays dashboard→TV. Les imports restent inchangés. Contrats et réception :
`docs/tv-workspace-validation.md` ; 219 unitaires et 42 E2E réussis,
TypeScript/ESLint/build réussis, 14 intégrations optionnelles ignorées.
Serveur remis en mode Clerk local. Briefing désactivé jusqu’à L6.
Prochain lot : L4, AL-Q01/AL-Q02/AL-C05. Aucun déploiement, migration, commit,
push ou changement distant. Les parcours Clerk réels du build restent à recevoir.

## 1. Point de départ obligatoire

1. Lire intégralement `AGENTS.md`, notamment le bloc Next.js auto-généré et les
   règles Africa Live.
2. Exécuter `git status --short` avant toute modification. Le checkout contient
   des changements non commités qui doivent être préservés.
3. Lire, dans cet ordre :
   - `docs/production-backlog.md` ;
   - `docs/production-progress.md` ;
   - `docs/environment-matrix.md` ;
   - `docs/non-regression-checklist.md` ;
   - `docs/railway-preproduction-runbook.md` ;
   - `docs/deployment-configuration.md`.
4. Pour tout changement Next.js, lire d'abord le guide correspondant sous
   `node_modules/next/dist/docs/`. Le projet utilise Next.js 16.3.5, dont les
   conventions peuvent différer des versions connues du modèle.
5. Ne pas supposer que les sessions navigateur, Clerk, Railway ou OVHcloud sont
   encore ouvertes. L'authentification interactive reste à la charge de
   l'utilisateur ; ne jamais automatiser un mot de passe ou un code OTP.

## 2. Dépôt et règles non négociables

- Workspace : `C:/Users/GAMER PC/Africa_Live_TV`.
- Branche locale : `main` (synchronisée avec `origin/main` après mise à jour documentaire du déploiement).
- Applicatif GitHub publié : `22dea98` ; commit documentaire final ensuite.
  Vérifier `git log -1` et `git ls-remote origin refs/heads/main` à la reprise.
- Dernier staging reçu : `4c8a82cc-5b3b-4a0e-86a1-bf922540869a`, SUCCESS
  le 1er octobre à 18:44 UTC ; code identique au premier snapshot L0–L4,
  documentation de reprise incluse. Les autres identifiants sont historiques.
- Un fichier non suivi, `docs/radar-cockpit-backlog.md`, est apparu pendant cette reprise. Il n'a pas été publié ni validé ; le préserver et traiter ses propositions comme un brouillon à comparer à la feuille de route sourcée `docs/radar-afrique-roadmap.md`.
- Dépôt distant : `https://github.com/fatme-nabih/Africa_Live_TV.git`.
- Aucun commit ou push ne doit être créé sans demande explicite de l'utilisateur.
- Le projet source `C:/Users/GAMER PC/IPTV` doit rester entièrement inchangé.
- La base locale autorisée est uniquement PostgreSQL `africa_live_dev`.
- L'application locale écoute sur `127.0.0.1:3001`.
- Ne jamais lancer un test ou une migration destructive sur une autre base.
- Ne jamais utiliser `npm run db:push` sur Railway ou une production.
- Le navigateur et VLC téléchargent les médias directement depuis l'amont.
  Aucun relais, proxy vidéo, conversion, playlist servie ou stockage média ne
  doit être ajouté au serveur Africa Live.
- Le lancement automatique de VLC est une capacité du poste local seulement.
- Les règles d'authentification et d'éligibilité déployées ne doivent jamais être
  affaiblies pour faire passer un test.
- Les fixtures binaires `e2e/fixtures` restent exclues de TypeScript et ESLint.
- Préserver tous les changements déjà présents dans le working tree. Ne pas
  employer `git reset --hard`, `git checkout --` ou une suppression globale.

## 3. Architecture fonctionnelle actuelle

L'application possède deux modes locaux indépendants :

1. **Local avec Clerk** : authentification réelle Development, catalogue,
   recherche, filtres, favoris, lecture web locale et secours VLC.
2. **MVP local sans Clerk** : activé uniquement par les trois flags locaux,
   accès complet au catalogue local, favoris, lecture directe et VLC.

Le mode Railway est une préproduction authentifiée. La lecture directe y est
ouverte avec `PLAYBACK_ELIGIBILITY_READY=true` depuis la validation du catalogue
du 24 septembre 2026. Le domaine, le healthcheck ou un déploiement réussi ne
constituent pas, à eux seuls, une validation des droits média.

Depuis le 29 septembre, staging inclut aussi les demandes de contact/retrait
avec file administrateur privée, la neutralisation persistante des sources
signalées, et le Radar GDELT sous `/app/live`. Le Radar reste derrière l'accès
authentifié au catalogue ; GDACS et la météo ne sont pas activés.

État local vérifié :

- 11 778 chaînes ;
- 12 396 sources (re-qualification intégrale achevée le 24 septembre 2026 : 4 588 BROWSER_OK, 2 446 VLC_ONLY, 4 556 OFFLINE, 806 UNTESTED ; 6 872 flux sains avec succès frais du jour ; 4 539 chaînes web directes) ;
- 21 tables ;
- 10 migrations Drizzle ;
- 2 utilisateurs lors du dernier inventaire ;
- aucun favori de test conservé ;
- première page : 30 chaînes ;
- horloge Windows `w32time` en Running/Automatic, source `time.windows.com`,
  dérive finale observée d'environ 0,14 seconde ;
- VLC installé sous `C:/Program Files/VideoLAN/VLC/vlc.exe`.

La session Clerk locale a été réinitialisée manuellement et validée. Les routes
`/api/filters`, `/api/channels` et `/api/favorites` ont répondu en JSON/200.
Recherche, filtre, favori persistant, tentative web et lancement VLC réel ont
été testés. Le favori et le processus VLC de test ont ensuite été nettoyés.

## 4. Lots 0 et 1 terminés

### Documentation

- DOC-001 : backlog aligné avec Railway existant.
- DOC-002 : matrice Local Clerk / Local MVP / Railway staging / Production.
- DOC-003 : journal par ticket.
- DOC-004 : checklist de non-régression.

### Local

- LOC-001 : horloge Windows compatible Clerk.
- LOC-002 : reconnexion Clerk locale.
- LOC-003 : trois API authentifiées en JSON/200.
- LOC-004 : réponses HTML/404 Clerk traduites en erreur de session claire.
- LOC-005 : parcours Clerk complet avec lecture locale.
- LOC-006 : MVP sans Clerk, 13 E2E réussis.
- LOC-007 : lancement VLC réel vérifié.
- LOC-008 : `npm run diagnose:local` ajouté, lecture seule et sans secrets.

La logique d'erreur client modifiée se trouve dans `src/lib/api-contracts.ts`,
avec ses tests dans `src/lib/catalog-api.test.ts`.

## 5. État Railway historique — 29 septembre 2026

- Projet `just-compassion`, environnement visible `production`, rôle applicatif `staging` (`DEPLOYMENT_ENV=staging`).
- Déploiement applicatif actif : `dfa1da5f-36d2-402f-887a-228d5b1e7e57`, `SUCCESS`, commit `2f19e38` ; domaine `https://staging.africatv.sn`.
- Publication faite avec `railway up` après le push GitHub : aucun déploiement automatique n'était apparu dans la liste Railway au bout d'environ une minute. Ne pas supposer qu'un push seul publie ; vérifier le service avant de conclure.
- Une première tentative CLI (`aeeaa462-10df-42e7-908d-cf2ab5b61e15`) a échoué sur l'envoi de la requête Railway avant le build ; elle n'a pas exécuté de migration. La seconde tentative, avec les IDs explicites projet/service/environnement, a réussi.
- Avant la migration `0018_support_requests`, le dump staging chiffré a été restauré et comparé dans une base temporaire, ensuite supprimée. L'artefact est dans `backups/railway` (ignoré par Git) : `railway-2026-09-29T23-01-49-939Z.dump.aes256gcm`, clé DPAPI Windows, métadonnées `.json`.
- Après migration : 22 tables publiques, 19 migrations Drizzle, 14 505 chaînes et 15 646 sources ; les tables `support_requests` et `support_request_events` existent.
- Vérifié après déploiement : `/api/health` HTTP 200 (`process` et `database` ok), GET anonyme `/api/live/news` HTTP 401 et `/app/live` HTTP 307 vers l'authentification.
- `ABUSE_TRUSTED_PROXY_HEADER=x-real-ip` est défini uniquement dans l'environnement Railway staging. Le réglage de production future reste désactivé jusqu'à vérification de son proxy.
- Aucun domaine de production, service Railway de production, OVHcloud ou plan n'a été modifié.

### État de staging observé le 24 septembre 2026 (historique)

- Projet : `just-compassion`.
- Environnement visible Railway : `production`.
- Rôle réel de l'application : staging via `DEPLOYMENT_ENV=staging`.
- Services : `Africa_Live_TV` et `Postgres`, en ligne et sains.
- Domaine principal staging : `https://staging.africatv.sn` (SSL Let's Encrypt actif, DNS OVHcloud).
- Domaine technique de repli : `africalivetv-production.up.railway.app`.
- Déploiement actif : `ddc78ef6-f449-4b46-a23f-b725b5ae8271` (SUCCESS, commit `3a325ab` : lancement automatique VLC sans affichage d'URL ni bouton de copie M3U8).
- Runtime : Node.js 22.23.3, Railpack 0.40.0.
- Région : US West (sfo), 1 réplique.
- PostgreSQL : volume persistant, 21 tables, 6 396 chaînes actives, 6 825 sources actives certifiées HEALTHY (11 778 chaînes et 12 396 sources au total en base).
- Pré-déploiement actif : `npm run db:migrate:deploy` avec timeout 300 s (exécuté avec succès dans transaction Drizzle).
- Healthcheck actif : `/api/health` avec timeout 120 s (répond 200 OK, `checks: {process: ok, database: ok}`, `Cache-Control: no-store`).
- Sauvegardes : dump logique PostgreSQL chiffré AES-256-GCM + DPAPI stocké hors volume sous `backups/railway`, restauration isolée validée en 78,1 s.
- Consommation relevée : ~0,24 USD sur la période (facture estimée à 0,24 USD). Aucune limite dure.
- Rollback applicatif : vérifié et exécuté en direct via mutation GraphQL `deploymentRollback`.
- Déverrouillage de la lecture de préproduction : `PLAYBACK_ELIGIBILITY_READY=true` configuré sur Railway.
- Qualification réelle des flux et des langues sur PostgreSQL Railway (24 septembre 2026) :
  - Catalogue synchronisé transactionnellement depuis africa_live_dev : 11 778 chaînes et 12 396 sources (2 utilisateurs et favoris préservés).
  - Scan exhaustif en direct avec 15 workers et l'origine réelle https://staging.africatv.sn (durée 49,1 min, écriture par lots de 100 avec réessai) :
    - 11 819 flux soumis à contrôle réseau réel (manifestes HLS, en-têtes CORS staging, statuts HTTP, segments vidéo).
    - 577 flux traités par décisions de sécurité statiques (requêtes sensibles, expiration, URL non prises en charge).
    - 6 825 flux qualifiés sains (`HEALTHY`) avec succès direct certifié :
      - 4 385 flux `PUBLIC_DIRECT_WEB` (`BROWSER_OK`, CORS staging validé, 0 mixed content).
      - 2 440 flux `PUBLIC_DIRECT_VLC` (`VLC_ONLY`).
    - 4 994 flux en échec temporaire protégés (`UNTESTED` / `TEMPORARY_FAILURE` / `REVIEW_REQUIRED`) sans déclaration artificielle d'indisponibilité permanente.
    - 577 flux en revue statique (`UNTESTED` / `NEVER_CHECKED` / `REVIEW_REQUIRED`).
    - 0 flux artificiellement qualifié sain ou hors-ligne par simple protocole.
    - 4 339 chaînes avec au moins un flux direct web opérationnel, 2 103 avec flux externe VLC.
  - Les langues principales des chaînes (`fra`, `eng`, `ara`, `spa`, `por`, `deu`, `ita`, `rus`, `tur`, `zho`, `hin`) sont renseignées dans `channels.language`.
- Streaming direct vérifié et validé avec succès de bout en bout sur navigateur PC (Chrome/Edge) et sur smartphone mobile.

## 6. Lot 2 : ce qui a été implémenté localement

### Route de santé — RLY-002

Fichiers :

- `src/app/api/health/route.ts` ;
- `src/lib/healthcheck.ts` ;
- `src/lib/healthcheck.test.ts`.

`GET /api/health` est public, dynamique, Node.js et non mis en cache. Il exécute
`select 1` sur PostgreSQL. Il retourne :

- HTTP 200, `process=ok` et `database=ok` en succès ;
- HTTP 503 et `database=error` en échec ;
- jamais l'exception, l'hôte, l'utilisateur ou l'URL PostgreSQL.

Preuve locale : `http://127.0.0.1:3001/api/health` a répondu 200 avec
`Cache-Control: no-store, max-age=0`.

### Migrations de déploiement — RLY-005

Fichiers :

- `src/lib/deploy-migration.ts` ;
- `src/lib/deploy-migration.test.ts` ;
- `src/scripts/migrate-deploy.ts` ;
- `src/scripts/test-integration.ts` ;
- script npm `db:migrate:deploy` dans `package.json`.

La commande cible refuse une configuration incomplète, un autre rôle que
staging/production, une cible non Railway, localhost et `africa_live_dev`. Elle
acquiert un verrou consultatif PostgreSQL, borne l'attente du verrou à 10 s et
les requêtes à 240 s, puis utilise les migrations transactionnelles Drizzle.
Le test provoque une migration en échec et vérifie qu'aucune table résiduelle ne
reste. Le 23 septembre 2026, la commande `npm run db:migrate:deploy` et le délai
dashboard de 300 s ont été appliqués et validés sur Railway, y compris le refus
d'un verrou concurrent puis son acquisition après libération.

### Sauvegarde/restauration — RLY-004

Fichier : `src/scripts/test-backup-restore.ts`, commande
`npm run backup:restore-drill:local`.

Le script est volontairement limité à localhost et `africa_live_dev`. Il crée un
dump PostgreSQL custom dans un dossier temporaire, crée une base isolée au nom
aléatoire, restaure, compare l'inventaire, puis supprime base et dump. Il refuse
production, une base distante ou une autre base locale.

Dernier résultat : succès en 2 797 ms, inventaire identique de 21 tables,
11 778 chaînes, 12 396 sources, 2 utilisateurs, 0 favori et 10 migrations.
Aucun dump local n'a été conservé lors de cet essai. La preuve Railway a ensuite
été réalisée le 22 septembre : dump custom PostgreSQL 18.6 chiffré AES-256-GCM,
clé protégée par Windows DPAPI, déchiffrement puis restauration dans une base
Railway isolée. Les inventaires source/restauré concordent : 21 tables, 11 000
chaînes, 11 000 sources, 1 utilisateur, 0 favori et 10 migrations, en 78,1 s.
La base temporaire et le proxy TCP temporaire ont été supprimés. La copie
chiffrée reste dans `backups/railway`, hors volume Railway et ignorée par Git.
Elle reste liée à ce compte Windows et ne remplace pas une sauvegarde durable
hors poste ni le PITR Railway.

### Exploitation — RLY-001/003/006/007/008

- Railway est documenté comme staging malgré le nom visible `production`.
- Healthcheck actif : `/api/health`, délai 120 s, validé sur le domaine Railway
  et sur `staging.africatv.sn`.
- Rollback documenté et exécuté en conditions réelles vers un déploiement sain ;
  la rétention Trial/Free est annoncée à 24 h. Un rollback de code ne restaure
  pas la DB.
- Région proposée pour Dakar : EU West Amsterdam, à confirmer par mesure. Ne pas
  déplacer application ou volume avant sauvegarde et fenêtre de maintenance.
- Objectifs provisoires staging : RPO 24 h, RTO 2 h. La restauration logique
  isolée est démontrée, mais une destination durable hors poste reste à décider.
- RLY-008 est clôturé par la décision de conserver le plan actuel sans surcoût,
  sans limite dure ni alerte inadaptée au crédit restant.

Le fichier `railway.json` a été envisagé puis supprimé : Railway indique que ce
mécanisme est déprécié, indisponible pour ce service et arrêté le 1er décembre
2026. Ne pas le recréer. Le futur mécanisme est `.railway/railway.ts`, mais il
doit être produit par import de l'existant, suivi d'un plan sans changement ; un
graphe écrit à la main peut considérer les ressources omises comme à supprimer.

## 7. Domaine `africatv.sn` et OVHcloud

Le propriétaire a acquis `africatv.sn` chez OVHcloud le 22 septembre 2026. La
capture fournie confirme le domaine et sa zone DNS. Aucune donnée personnelle,
de paiement ou de messagerie de cette capture ne doit être reproduite.

Architecture décidée :

- `staging.africatv.sn` : Railway staging actuel ;
- `africatv.sn` : production canonique future ;
- `www.africatv.sn` : futur alias ou redirection vers l'apex ;
- domaine Railway : accès de diagnostic conservé pendant la préproduction.

État RLY-009 :

- RLY-009A, propriété et zone DNS : terminé ;
- RLY-009B, réservation des noms par environnement : terminé dans le plan ;
- RLY-009C, liaison de `staging.africatv.sn` à Railway et enregistrements DNS
  OVHcloud : terminé ;
- RLY-009D, propagation, certificat, healthcheck et domaine de repli : terminé ;
- RLY-009E, Clerk, `NEXT_PUBLIC_APP_URL`, `BROWSER_TEST_ORIGIN` et parcours
  authentifié : terminé ;
- RLY-009F, apex/`www` de production : différé jusqu'au lancement.

Ne jamais deviner une cible DNS : utiliser exactement les valeurs fournies par
Railway au moment de l'ajout du domaine. Ne pas toucher aux MX, à la messagerie,
à l'apex ou à `www` pendant l'installation du staging. Un TTL de 300 s est
proposé pour la bascule, à relever après stabilité. Valider d'abord
`https://staging.africatv.sn/api/health`, puis Clerk et les variables. Les
variables `NEXT_PUBLIC_*` imposent un nouveau build.

Retour arrière prévu : revenir aux URLs app/Clerk précédentes, vérifier le
domaine Railway, retirer le domaine personnalisé dans Railway, puis supprimer
uniquement les CNAME/TXT staging chez OVHcloud. L'acquisition du domaine reste.

## 8. État précis des tickets

| Ticket | État |
|---|---|
| RLY-001 | Terminé |
| RLY-002 | Terminé et validé sur Railway (route `/api/health` 200/no-store) |
| RLY-003 | Terminé et validé sur Railway (healthcheck 120 s actif, test négatif réussi) |
| RLY-004 | Sauvegarde logique Railway chiffrée et restauration isolée terminées ; sauvegarde native/PITR dépendante du plan |
| RLY-005 | Terminé et validé sur Railway (`db:migrate:deploy`, 300 s, verrou concurrent vérifié) |
| RLY-006 | Terminé : runbook documenté et rollback réel vérifié (`6a13140b`) |
| RLY-007 | Décision EU West proposée ; migration non exécutée |
| RLY-008 | Terminé : décision A8 actée (Option 1 : plan actuel sans surcoût, sauvegardes chiffrées hors volume) |
| RLY-009A/B | Terminés |
| RLY-009C/D/E | Terminés et validés sur `staging.africatv.sn` (DNS OVHcloud, TLS Let's Encrypt, Clerk et garde-fous) |
| RLY-009F | Différé au lancement production |
| PROD-030 | Terminé : UX de lecture distante épurée, suppression de l'URL M3U8, des boutons de copie et des textes techniques |
| PROD-031 | Terminé : Lancement automatique de VLC multi-plateforme (desktop `vlc://`, Android `intent://`, iOS `vlc-x-callback://`, local `/api/open-vlc`) |
| PROD-032 | Terminé : Gestion des transitions, validation sécurisée des protocoles HTTP/HTTPS, scan Snyk SAST 0 vulnérabilité |
| PROD-033 | Terminé : Scan exhaustif Railway (12 396 flux), certification de 6 825 flux sains (4 385 BROWSER_OK, 2 440 VLC_ONLY) et activation exclusive |

Les Phases A, B et le Lot 3 (UX de lecture et qualification des flux) sont 100 % validés et déployés en ligne.
Le domaine de staging `https://staging.africatv.sn` est pleinement opérationnel.
Prochaine séquence recommandée :
- **Lot 2 (PROD-020..022)** : Synchronisation des identités Clerk, webhooks et abonnements Billing.
- **Lot 4 (PROD-040..043)** : Résistance aux pannes et maîtrise de PostgreSQL.

## 9. Validations déjà obtenues

Dernière batterie complète après l'implémentation du lot 3 et déploiement staging (commit `3a325ab`) :

| Contrôle | Résultat |
|---|---|
| `npm test` | 135 tests : 131 réussis, 0 échec, 4 ignorés |
| `npm run test:integration` | 4/4 réussis ; rollback transactionnel, témoin et catalogue préservés |
| `npx tsc --noEmit --incremental false` | 0 erreur |
| `npm run lint` | 0 erreur, 2 avertissements préexistants dans `SeparatePlayerPage.tsx` |
| `npm run build` | Réussi avec Next.js 16.3.5 (Turbopack) ; 15/15 pages générées |
| Snyk SAST (`snyk_code_scan`) | 0 vulnérabilité dans `Player.tsx` ; protocoles et redirections assainis |
| Déploiement Railway | `ddc78ef6-f449-4b46-a23f-b725b5ae8271` SUCCESS avec migrations Drizzle validées |
| Healthcheck staging réel | HTTP 200 `{"status":"ok","checks":{"process":"ok","database":"ok"}}` |
| Streaming direct staging | Validé sur `https://staging.africatv.sn/app` sur PC et mobile |

Les deux avertissements ESLint concernent `window.location.assign()` dans
`src/components/SeparatePlayerPage.tsx` et préexistaient aux modifications. Ne pas les
masquer dans le rapport d'une future validation.

## 10. État Git à préserver

La branche locale `main` est synchronisée avec `origin/main` après le commit
documentaire demandé pour cette reprise. Le runtime staging correspond au commit
applicatif `2f19e38` ; la fiche actuelle et l'ID Railway sont consignés plus haut.
Le seul élément non suivi laissé hors publication est le brouillon
`docs/radar-cockpit-backlog.md` apparu le 29 septembre ; ne pas le supprimer et
valider ses propositions de sources et de droits avant de les reprendre.

Toujours refaire `git status --short` avant une modification. Ne pas restaurer,
nettoyer ou remplacer les changements existants avec une commande Git
destructive.

## 11. Séquence historique — Identités et Abonnements (Lot 2)

Les Phases A, B et le Lot 3 (adaptation de la lecture et qualification des flux) sont terminés et déployés sur staging. L'ordre recommandé pour la suite est :

1. **Lot 2 — Identités et abonnements (PROD-020..022)** :
   - Webhook Clerk et synchronisation des utilisateurs.
   - Abonnements et statut des droits d'accès (plans Billing).
2. **Lot 4 — Résister aux pannes et maîtriser PostgreSQL (PROD-040..043)** :
   - Gestion des erreurs de pool, quotas et contention.
   - Abonnements et statut des droits d'accès.

Ne pas déplacer la région dans cette fenêtre. La migration US West vers EU
West reste un changement séparé, après sauvegarde et mesure de latence.

## 12. Commandes utiles de reprise

Contrôles en lecture ou locaux sûrs :

```powershell
git status --short
npm run diagnose:local
npm test
npm run test:integration
npx tsc --noEmit --incremental false
npm run lint
npm run db:check:migrations
npm run config:check
npm run build
npm run backup:restore-drill:local
```

Le serveur de développement peut déjà être actif. Vérifier
`http://127.0.0.1:3001/api/health` avant de lancer un second processus. La
commande locale habituelle est `npm run dev`.

Commandes ou actions à ne pas exécuter sans l'étape et l'autorisation adéquates :

- `git commit`, `git push`, création de PR ou déploiement ;
- `npm run db:push` ;
- migration ou restauration sur Railway ;
- changement de région ou de plan Railway ;
- création d'une alerte e-mail ou d'une limite budgétaire ;
- modification DNS OVHcloud ;
- modification des domaines/URLs Clerk ;
- activation de `africatv.sn` ou `www.africatv.sn` en production.

## 13. Clôture des Phases A, B et validation Streaming Staging

### Clôture Phase A — Validée le 23 septembre 2026

- [x] Route `/api/health` publique déployée (HTTP 200, no-store).
- [x] Healthcheck Railway configuré (120 s) et test d'échec bloquant validé.
- [x] Migrations sécurisées `npm run db:migrate:deploy` (300 s) et verrou concurrent vérifiés.
- [x] Sauvegarde logique PostgreSQL chiffrée AES-256-GCM et restauration isolée démontrées.
- [x] Rollback applicatif testé et reproductible en direct (`6a13140b` en SUCCESS).
- [x] Décision budgétaire A8 actée (Option 1 : plan actuel sans surcoût, sauvegardes chiffrées hors volume).
- [x] Checklist fonctionnelle complète validée.

### Clôture Phase B (`staging.africatv.sn`) — Validée le 23 septembre 2026

- [x] `staging.africatv.sn` possède ses enregistrements CNAME/TXT validés chez OVHcloud (TTL 300 s) ;
- [x] Le certificat SSL/TLS Let's Encrypt est actif et `https://staging.africatv.sn/api/health` répond 200 (no-store) ;
- [x] L'instance Clerk autorise l'origine et détecte dynamiquement le domaine staging ;
- [x] `NEXT_PUBLIC_APP_URL` et `BROWSER_TEST_ORIGIN` pointent vers `https://staging.africatv.sn` et sont intégrés au build ;
- [x] La checklist complète est rejouée avec succès sur `https://staging.africatv.sn/app` (connexion, catalogue, favoris, barrière 503 conforme) ;
- [x] Le domaine Railway `africalivetv-production.up.railway.app` reste actif en fallback de diagnostic ;
- [x] L'apex `africatv.sn` et `www` restent réservés pour la production future.

### Clôture de la validation de streaming staging — Validée le 24 septembre 2026

- [x] Variable `PLAYBACK_ELIGIBILITY_READY=true` configurée sur Railway et effective.
- [x] Synchronisation transactionnelle du catalogue vers Railway : 11 778 chaînes, 12 396 sources, 2 utilisateurs et favoris préservés, avec activation exclusive des 6 825 flux sains certifiés (6 396 chaînes actives dans l'application).
- [x] Requalification réelle sur PostgreSQL Railway avec 15 workers et l'origine `https://staging.africatv.sn` (2 946 s / 49,1 min) :
  - 11 819 contrôles réseau effectifs (manifestes HLS, segments vidéo, en-têtes CORS pour staging.africatv.sn, statuts HTTP).
  - 577 décisions de sécurité statiques.
  - 6 825 flux qualifiés sains (`HEALTHY`) avec preuve d'accès frais :
    - 4 385 flux `PUBLIC_DIRECT_WEB` (`BROWSER_OK`, CORS staging validé, 0 mixed content).
    - 2 440 flux `PUBLIC_DIRECT_VLC` (`VLC_ONLY`).
  - 4 994 flux en échec temporaire protégés (`UNTESTED` / `TEMPORARY_FAILURE` / `REVIEW_REQUIRED`) sans bascule artificielle en hors-ligne.
  - 577 flux en revue statique (`UNTESTED` / `NEVER_CHECKED` / `REVIEW_REQUIRED`).
  - 4 339 chaînes disposent d'au moins un flux direct web opérationnel, 2 103 d'un flux externe VLC.
- [x] Inférence des langues principales (`channels.language`) appliquée sur PostgreSQL Railway (filtre de langue opérationnel sur mobile et desktop).
- [x] UX de lecture distante fiabilisée et automatisée (Player.tsx) :
  - Lancement 100 % automatique de VLC dès qu'un flux externe est requis (desktop via protocole direct `vlc://`, Android via `intent://`, iOS via `vlc-x-callback://`, local via `/api/open-vlc`).
  - Suppression intégrale de l'exposition d'URL de flux (M3U8), des boutons de copie et des blocs de consignes techniques.
  - Interface sobre : écran "Ouverture de VLC...", écran "VLC lancé", bouton unique "Relancer VLC", mode effectif "Lecteur VLC".
  - Validation et assainissement strict des URL (protocoles `http:`/`https:`) sans Open Redirect ni DOMXSS (Snyk SAST 0 vulnérabilité).
- [x] Interface publique épurée : retrait du filtre technique de statut dans `FilterSidebar.tsx` ; aucun badge technique brut exposé publiquement.
- [x] Parcours complet de lecture web et VLC validé avec succès sur ordinateur (PC) et téléphone mobile.
- [x] Déploiement Railway Staging `ddc78ef6-f449-4b46-a23f-b725b5ae8271` réussi (commit `3a325ab`), migrations Drizzle appliquées et healthcheck HTTP 200 vérifié.

### Clôture de la Phase Lot 2 — Identités, Abonnements et Paiements NabooPay (25 septembre 2026)

- [x] Pivot stratégique : remplacement de Clerk Billing par **NabooPay** pour supporter les paiements locaux (Orange Money, Wave) et internationaux (Visa/Mastercard).
- [x] PROD-020 : Intégration de l'API NabooPay v2 et gestion idempotente des Webhooks (HMAC SHA256) via la table 
aboopay_transactions.
- [x] PROD-021 : Synchronisation du cycle de vie des identités Clerk (suppression d'utilisateur expresse marquant les abonnements existants comme \xpired\).
- [x] PROD-022 : Création de la page \/pricing\ moderne proposant les forfaits Mensuel (990 FCFA) et Annuel (9 900 FCFA), avec redirection sécurisée vers NabooPay Checkout.
- [x] Code mort et logique propre à Clerk Billing supprimés de la base de données (ajout de la contrainte provider \
aboopay\) et du code source.



### Clôture de la Phase Lot 4 - Résister aux pannes et maîtriser PostgreSQL (25 septembre 2026)

- [x] PROD-040 : Gestion des erreurs du pool (limite de 10 max connections configurée dans src/db/index.ts) et bornage des requêtes.
- [x] PROD-041 : Unification de la journalisation et des erreurs API via withApiErrorHandler dans src/lib/api-errors.ts.
- [x] PROD-042 : Ajout et validation des index composites (channels_active_name_id_idx et streams_availability_idx) limitant le temps de réponse du catalogue à ~10ms via Bitmap Index Scan.
- [x] PROD-043 : Remplacement du mécanisme destructif de dérive par drizzle-kit generate (script db:check non destructif) et validation de l'environnement explicite pour le push des migrations.


### Clôture de la Phase Lot 5 - Vérification périodique et jobs (25 septembre 2026)

- [x] PROD-050 : Ajout du worker de vérification avec concurrence bornée, verrou consultatif et reprise automatisée.
- [x] PROD-051 : Consolidation du nettoyage (télémétrie/abus) dans un script \
un-maintenance.ts\ autonome avec lots de suppression, verrou exclusif et sécurité des connexions.
- [x] PROD-052 & PROD-053 : Simulation d'incidents (simulate-incident.ts) pour valider l'observabilité externe des métriques. Ajout des objectifs de sauvegarde/restauration.
