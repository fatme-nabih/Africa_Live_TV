# Africa Live — contexte de reprise de session

Dernière mise à jour : 24 septembre 2026, fuseau Africa/Dakar.

Ce document permet à une nouvelle session de reprendre le travail sans
réinterpréter l'historique. Il ne contient volontairement aucun secret, cookie,
mot de passe, identifiant de paiement, clé Clerk ou URL de flux média.

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
- Branche locale : `codex/railway-phase-a` (contenant le commit documentaire `8cb1f90`).
- Branche distante : `main` (commit `e5665b6`, PR #1 fusionnée avec succès).
- Déploiement Railway actif : `6a13140b-8698-42d0-8a7b-83017356ff9d` (commit `e5665b6`).
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

## 5. Railway : état réel observé (24 septembre 2026)

- Projet : `just-compassion`.
- Environnement visible Railway : `production`.
- Rôle réel de l'application : staging via `DEPLOYMENT_ENV=staging`.
- Services : `Africa_Live_TV` et `Postgres`, en ligne et sains.
- Domaine principal staging : `https://staging.africatv.sn` (SSL Let's Encrypt actif, DNS OVHcloud).
- Domaine technique de repli : `africalivetv-production.up.railway.app`.
- Déploiement actif : commit `e5665b699686a2f9f8065a3d098e11c04e7edc71` (PR #1).
- Runtime : Node.js 22.23.2, Railpack 0.39.0.
- Région : US West (sfo), 1 réplique.
- PostgreSQL : volume persistant, 21 tables, 6 396 chaînes actives, 6 825 sources actives certifiées HEALTHY (11 778 chaînes et 12 396 sources au total en base).
- Pré-déploiement actif : `npm run db:migrate:deploy` avec timeout 300 s.
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

La Phase A et la Phase B sont 100 % validées et clôturées.
Le domaine de staging `https://staging.africatv.sn` est pleinement opérationnel.
La validation du streaming direct sur staging est également achevée et vérifiée sur PC et mobile.
Prochaine séquence recommandée :
- **Lot 3 (PROD-030..032)** : Adaptation de l'UX de lecture au site public (gestion propre des flux VLC sur mobile/web distant sans appel localhost `/api/open-vlc`, bouton de copie de flux direct M3U8, UX des formats externes).
- **Lot 2 (PROD-020..022)** : Synchronisation des identités Clerk et gestion des abonnements.

## 9. Validations déjà obtenues

Dernière batterie complète après l'implémentation du lot 2 :

| Contrôle | Résultat |
|---|---|
| `npm test` | 131 tests : 127 réussis, 4 intégrations ignorées ici |
| `npm run test:integration` | 4/4 réussis ; rollback transactionnel, témoin et catalogue préservés |
| `npx tsc --noEmit --incremental false` | Réussi |
| `npm run lint` | 0 erreur, 2 avertissements préexistants dans `SeparatePlayerPage.tsx` |
| `npm run db:check:migrations` | Réussi |
| `npm run config:check` | Réussi |
| `npm run build` | Réussi avec Next.js 16.3.5 ; route `/api/health` présente |
| `npm run backup:restore-drill:local` | Réussi, inventaire identique et nettoyage complet |
| `npm run backup:restore-drill:railway` | Réussi en 78,1 s ; 21 tables, 11 000 chaînes/sources, base temporaire et proxy supprimés |
| Healthcheck local réel | HTTP 200, JSON attendu, non caché |
| E2E locaux ciblés des lots 0/1 | 13/13 réussis sur Edge |
| Streaming direct staging | Validé sur `https://staging.africatv.sn/app` sur PC et mobile (flux HTTPS direct HLS) |

Les deux avertissements ESLint concernent `window.location.assign()` dans
`src/components/SeparatePlayerPage.tsx` et préexistaient au lot 2. Ne pas les
masquer dans le rapport d'une future validation.

## 10. État Git à préserver

La branche locale `codex/railway-phase-a` est suivie par
`origin/codex/railway-phase-a`. Le commit `f5a2bc9` est présent sur la branche
distante et le commit documentaire `8cb1f90` est présent localement avant la
publication du présent lot. La PR #1 a été fusionnée dans `origin/main` au
commit `e5665b6`. Les sauvegardes sous `backups/railway` restent ignorées par
Git.

Toujours refaire `git status --short` avant une modification. Ne pas restaurer,
nettoyer ou remplacer les changements existants avec une commande Git
destructive.

## 11. Prochaine séquence sûre — Adaptation de la lecture (Lot 3) ou Abonnements (Lot 2)

Les Phases A, B et la validation du streaming staging sont terminées. L'ordre recommandé pour la suite est :

1. **Lot 3 — Adaptation de la lecture en production (PROD-030..032)** :
   - PROD-030 : Sur le site déployé (distant), `/api/open-vlc` rejette à juste titre les requêtes non-localhost. Adapter l'interface pour ne pas proposer un lancement local inopérant, mais offrir un lien direct ou une commande de copie pour lecteur externe (VLC mobile/desktop).
   - PROD-031 : Affiner les fallbacks vidéo HLS et la gestion des flux non compatibles navigateur.
   - PROD-032 : Télémétrie d'erreur de lecture sécurisée.
2. **Lot 2 — Identités et abonnements (PROD-020..022)** :
   - Webhook Clerk et synchronisation des utilisateurs.
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
- [x] UX de lecture distante fiabilisée (Player.tsx) : budget de récupération réseau réinitialisé par tentative, copie sécurisée de l'URL M3U8 avec instructions pas-à-pas, pas d'appel local à `/api/open-vlc` sur staging.
- [x] Interface publique épurée : retrait du filtre technique de statut dans `FilterSidebar.tsx` ; aucun badge technique brut exposé publiquement.
- [x] Parcours complet de lecture web en direct validé avec succès sur ordinateur (PC) et téléphone mobile.
