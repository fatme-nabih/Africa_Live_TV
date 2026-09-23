# Africa Live — contexte de reprise de session

Dernière mise à jour : 23 septembre 2026, fuseau Africa/Dakar.

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
- Branche actuelle : `codex/railway-phase-a`.
- Commit local Phase A contenant le code et les preuves A1/A2 : `66a903a`.
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

Le mode Railway est une préproduction authentifiée. La lecture publique reste
fermée avec `PLAYBACK_ELIGIBILITY_READY=false`. Le domaine, le healthcheck ou
un déploiement réussi ne constituent pas une validation des droits média.

État local vérifié :

- 11 778 chaînes ;
- 12 396 sources ;
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

## 5. Railway : état réel observé

- Projet : `just-compassion`.
- Environnement visible Railway : `production`.
- Rôle réel de l'application : staging via `DEPLOYMENT_ENV=staging`.
- Services : `Africa_Live_TV` et `Postgres`, observés en ligne.
- Domaine technique : `africalivetv-production.up.railway.app`.
- Déploiement actif observé : commit
  `fb566d373c9237b12465908638a875280a78d00b`.
- Runtime observé : Node.js 22.23.2, Railpack 0.39.0.
- Région : US West, une réplique.
- PostgreSQL : volume persistant, 21 tables.
- Pré-déploiement actuel dans le dashboard : `npm run db:migrate`.
- Healthcheck dashboard actuel : aucun chemin configuré.
- Sauvegardes : aucune. L'interface indique que sauvegardes de volume et PITR
  nécessitent le plan Pro.
- Budget d'essai observé le 22 septembre : 25 jours ou 4,86 USD restants.
  Le seuil minimal documenté d'alerte souple est 5 USD, donc il ne prévient pas
  utilement l'épuisement de ce crédit. Aucune alerte n'a été créée.
- La lecture reste fermée, ce qui est attendu.

Aucun état Railway n'a été modifié pendant les lots 0 à 2. Aucun déploiement,
changement de région, abonnement, limite budgétaire ou mise à niveau de plan n'a
été déclenché.

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
dashboard de 300 s ont été ajoutés au lot de changements Railway préparé. Ils
ne sont pas encore appliqués : l'ancien déploiement reste actif.

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
- Healthcheck futur : `/api/health`, délai 120 s, à activer seulement après que
  la route a été livrée et vérifiée sur le domaine Railway.
- Rollback documenté : utiliser le dernier déploiement sain ; la rétention
  Trial/Free est annoncée à 24 h. Un rollback de code ne restaure pas la DB.
- Région proposée pour Dakar : EU West Amsterdam, à confirmer par mesure. Ne pas
  déplacer application ou volume avant sauvegarde et fenêtre de maintenance.
- Objectifs provisoires staging : RPO 24 h, RTO 2 h. Ils ne sont pas garantis
  tant qu'une sauvegarde Railway et sa restauration ne sont pas démontrées.
- RLY-008 reste bloqué par le plan d'essai et le seuil d'alerte.

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
- RLY-009C, ajouter `staging.africatv.sn` à Railway et reporter exactement ses
  CNAME/TXT chez OVHcloud : à faire après healthcheck/migrations ;
- RLY-009D, vérifier propagation, certificat, healthcheck et repli : à faire ;
- RLY-009E, aligner Clerk, `NEXT_PUBLIC_APP_URL` et `BROWSER_TEST_ORIGIN`, puis
  refaire le parcours authentifié : à faire ;
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
| RLY-002 | Terminé localement, livraison Railway en attente |
| RLY-003 | Chemin `/api/health` et délai 120 s préparés dans Railway ; application et validation en attente |
| RLY-004 | Sauvegarde logique Railway chiffrée et restauration isolée terminées ; sauvegarde native/PITR dépendante du plan |
| RLY-005 | Implémenté/testé localement ; commande et délai préparés dans Railway, application et validation en attente |
| RLY-006 | Runbook de rollback terminé |
| RLY-007 | Décision EU West proposée ; migration non exécutée |
| RLY-008 | Bloqué par le plan d'essai actuel |
| RLY-009A/B | Terminés |
| RLY-009C/D/E | À faire après RLY-003/004/005 |
| RLY-009F | Différé au lancement production |

Le lot 2 n'est donc pas entièrement clôturé. Les fichiers et preuves locales
sont prêts. Railway contient quatre changements préparés, non appliqués et sans
nouveau déploiement ; la livraison GitHub puis les validations réelles restent à
faire.

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

Les deux avertissements ESLint concernent `window.location.assign()` dans
`src/components/SeparatePlayerPage.tsx` et préexistaient au lot 2. Ne pas les
masquer dans le rapport d'une future validation.

## 10. État Git à préserver

La branche locale `codex/railway-phase-a` contient le commit `66a903a`, qui
regroupe le code, les tests, les runbooks et la preuve A2. Les sauvegardes sous
`backups/railway` restent ignorées par Git. La tentative de push n'a pas abouti,
car Git Credential Manager attendait la sélection interactive d'un compte ;
aucune branche distante ni PR n'a été créée.

Toujours refaire `git status --short` avant une modification. Ne pas restaurer,
nettoyer ou remplacer les changements existants avec une commande Git
destructive.

## 11. Prochaine séquence sûre

La prochaine session ne doit pas commencer par le DNS. L'ordre est :

1. Reprendre l'authentification GitHub interactive, pousser la branche
   `codex/railway-phase-a` puis ouvrir/relire la PR avant fusion selon le flux
   convenu. Le commit local est `66a903a` ; aucun push n'a encore abouti.
2. Vérifier la copie logique Railway chiffrée et sa preuve de restauration déjà
   obtenues. Si un plan Pro est envisagé pour sauvegarde/PITR, demander la
   décision de coût ; ne jamais l'activer automatiquement.
3. Livrer le code, puis vérifier `/api/health` sur le domaine Railway existant.
4. Relire puis appliquer ensemble les quatre changements déjà préparés dans
   Railway : `npm run db:migrate:deploy`, 300 s, `/api/health` et 120 s. Ne pas
   les appliquer tant que la source déployée ne contient pas la route.
5. Déployer une seule révision et exécuter la checklist : santé, Clerk, 30
   chaînes, recherche, filtres, favori, lecture fermée attendue.
6. Ajouter `staging.africatv.sn` à Railway ; relever les valeurs exactes.
7. Avec autorisation d'écriture DNS, ajouter uniquement CNAME/TXT staging chez
   OVHcloud. Attendre le certificat, tester HTTPS et conserver le domaine Railway.
8. Mettre à jour l'origine et les redirections de l'instance Clerk staging, puis
   `NEXT_PUBLIC_APP_URL` et `BROWSER_TEST_ORIGIN`. Rebuild et smoke tests.
9. Documenter chaque preuve, durée, risque et retour arrière dans
   `docs/production-progress.md`.

Ne pas déplacer la région dans cette même fenêtre. La migration US West vers EU
West doit être un changement séparé, après sauvegarde et mesure de latence.

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

## 13. Critère de clôture du lot 2

Le lot 2 sera réellement terminé lorsque :

- le healthcheck Railway bloque un déploiement défaillant et accepte la version
  saine ;
- la commande sécurisée de migration est active et un échec ne corrompt rien ;
- une sauvegarde Railway a été restaurée sur une cible isolée et comparée ;
- le rollback applicatif est reproductible ;
- la stratégie de coût est compatible avec le plan choisi ;
- `staging.africatv.sn` possède DNS et HTTPS valides, Clerk fonctionne, les API
  et le catalogue passent la checklist, et le domaine Railway reste disponible ;
- aucune dépense ou activation de production non autorisée n'a été engagée.
