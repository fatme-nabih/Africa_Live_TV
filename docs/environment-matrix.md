# Matrice des environnements — revue du 1er octobre 2026

Complément COR du 4 octobre : [état courant](etat-courant.md), [réception locale](correctifs-audit-validation-2026-10-04.md).
Next 16.3.8 local, aucune migration ou variable distante supplémentaire. Drapeaux MVP temporairement définis uniquement dans
les processus de tests, refusés en production ; build servi strict avec Clerk de développement. `.env*` conservés ;
staging non revérifié pendant COR. Les relevés distants ci-dessous restent datés.

Complément L5 local : AL-T05 disponible exclusivement en développement,
opt-in désactivé par défaut et au rechargement. Aucun flag `.env` supplémentaire,
aucune variable distante, aucune migration ; contrôle d'activation absent du
build de production vérifié. Le lecteur historique conserve les capacités
VLC existantes. L'ancré web ne contrôle pas VLC et le quitte explicitement.
[Preuves et limites](anchored-player-validation.md). Code L5 livré sur staging
après autorisation ; activation du prototype toujours locale seulement.

Relevé complémentaire à 18:09 UTC : L0–L4 déployé après autorisation,
`b0d52c0c-3bca-4600-8a3e-fb1f2709dada` SUCCESS/actif. Variables lues sans afficher
de secret : rôle staging, MVP/public MVP/lecture locale/VLC desktop désactivés,
origine staging correcte. [Réception réelle et limites](dashboard-auth-staging-reception.md).
Les paragraphes historiques ci-dessous décrivent l’état avant cette livraison.

Les capacités dashboard L0–L4 sont implémentées/testées localement et livrées
sur staging après autorisation : [preuves et limites](dashboard-release-validation.md).
Les variables listées comme vérifiées dans le relevé du 1er octobre ont été
contrôlées ; les autres valeurs restent des attentes ou des observations datées.
[État de reprise et validations restantes](dashboard-session-handoff.md).

Cette matrice décrit les valeurs attendues, sans recopier aucun secret. Le nom
Railway de l'environnement actuel est `production`, alors que son rôle applicatif
est bien **staging** grâce à `DEPLOYMENT_ENV=staging`.

| Variable / capacité | Local avec Clerk | Local MVP sans Clerk | Staging Railway actuel | Production future |
|---|---|---|---|---|
| `NODE_ENV` | `development` | `development` | `production` | `production` |
| `DEPLOYMENT_ENV` | absent | absent | `staging` | `production` |
| `DATABASE_URL` | PostgreSQL local, base `africa_live_dev` | PostgreSQL local, base `africa_live_dev` | référence privée vers PostgreSQL Railway | PostgreSQL de production, jamais `africa_live_dev` |
| `LOCAL_DEV_MODE` | `false` | `true` | `false` | `false` |
| `NEXT_PUBLIC_LOCAL_DEV_MODE` | `false` | `true` | `false` | `false` |
| `NEXT_PUBLIC_LOCAL_PLAYBACK` | `true` pour retenter localement les contrôles anciens | `true` recommandé ; le mode MVP l'implique aussi | `false` | `false` |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3001` | `http://localhost:3001` | `https://staging.africatv.sn` | `https://africatv.sn` uniquement après lancement autorisé |
| `BROWSER_TEST_ORIGIN` | `http://localhost:3001` | `http://localhost:3001` | `https://staging.africatv.sn`, identique à `NEXT_PUBLIC_APP_URL` | `https://africatv.sn` après bascule production |
| `ENABLE_LOCAL_VLC` | `true` sur ce poste | `true` sur ce poste | `false` | `false` |
| `VLC_PATH` | facultatif ; chemin local seulement | facultatif ; chemin local seulement | absent | absent |
| `PLAYBACK_ELIGIBILITY_READY` | `false` | `false` | `true`, après validation du catalogue staging | `true` uniquement après validation et décision de lancement |
| Clés Clerk | paire Development (`test`) cohérente | non requises par le parcours, mais formats locaux tolérés | paire `test` ou `live` cohérente ; `test` observé | paire `live` cohérente |
| Webhook Clerk | facultatif pour le catalogue local | non requis | secret réel de l'endpoint staging | secret réel de l'endpoint production |
| Plan Clerk Billing | facultatif | non requis | slug ou ID staging explicite | slug ou ID production explicite |
| `ABUSE_HASH_SECRET` / `CATALOG_CURSOR_SECRET` | secrets locaux distincts | secrets locaux distincts | secrets Railway distincts, ≥ 32 caractères | secrets production distincts, ≥ 32 caractères |
| `ABUSE_TRUSTED_PROXY_HEADER` | `disabled` | `disabled` | `x-real-ip` (Railway documente cet en-tête comme adresse client) | `disabled` jusqu'à vérification de l'en-tête remplacé par l'infrastructure choisie |
| `PORT` | `3001` via `npm run dev` | `3001` via `npm run dev` | fourni par Railway | fourni par la plateforme |
| Authentification | obligatoire | contournement local explicite uniquement | obligatoire | obligatoire |
| Lecture média | navigateur/VLC téléchargent directement depuis l'amont | idem | navigateur direct uniquement ; fermée tant que l'éligibilité n'est pas prête | navigateur direct selon éligibilité validée |
| Santé | `/api/health` vérifie processus + DB | idem | `/api/health` actif, délai 120 s | healthcheck de déploiement + surveillance continue externe |
| Migration de déploiement | `db:migrate` seulement sur la base locale autorisée | idem | `db:migrate:deploy`, garde-fous Railway, verrou et délais | même garde-fou, avec sauvegarde et stratégie expand/contract |
| Sauvegarde | dump/restauration locale de validation | idem | dump logique avant migration ; sauvegarde/PITR natifs indisponibles sur l'essai | dump exportable + politique native/PITR selon plan validé |
| Région | poste local à Dakar | poste local à Dakar | US West observé ; EU West proposé après sauvegarde | région décidée par mesures, application et DB colocalisées |

## Contrôles associés

```powershell
npm run config:check
npm run diagnose:local
npm run config:check:staging
npm run config:check:production
```

Les deux dernières commandes utilisent les variables de l'environnement où elles
sont exécutées. Elles valident la cohérence et les formats, pas l'existence réelle
des comptes fournisseurs. Les variables `NEXT_PUBLIC_*` sont intégrées au build :
une modification Railway exige un nouveau build pour atteindre le navigateur.

## État Railway observé le 29 septembre 2026 — historique

- Projet : `just-compassion`, environnement Railway nommé `production`.
- Rôle applicatif : staging (`DEPLOYMENT_ENV=staging`).
- Services : `Africa_Live_TV` et `Postgres`, tous deux en ligne.
- Déploiement actif : `dfa1da5f-36d2-402f-887a-228d5b1e7e57` (`SUCCESS`, commit `2f19e38`).
- Runtime observé : Node.js 22.23.3, Railpack 0.40.0, une réplique US West.
- Pré-déploiement actif et validé : `npm run db:migrate:deploy`, délai 300 s.
- Healthcheck actif et validé : `/api/health`, délai 120 s (200 OK).
- PostgreSQL : volume persistant, 22 tables publiques et 19 migrations consignées
  après `0018_support_requests`. Les inventaires historiques de catalogue divergent
  entre documents ; aucun effectif staging actuel n'est certifié par L4.
  Sauvegarde/PITR natif non disponible sur le plan alors observé.
- Lecture : `PLAYBACK_ELIGIBILITY_READY=true` consigné historiquement. Les anciens
  décomptes de sources qualifiées ne prouvent pas leur santé actuelle. Lancement
  VLC selon compatibilité de l'appareil ; aucune garantie universelle sur mobile.
  Transport direct amont, sans relais média serveur.
- Domaine staging : `staging.africatv.sn` actif avec DNS OVHcloud et certificat
  Let's Encrypt validé. Le domaine Railway reste disponible en repli.
- Nommage retenu : `staging.africatv.sn` pour cette préproduction ; apex et
  `www.africatv.sn` restent réservés à une production future.
- Exploitation détaillée :
  [railway-preproduction-runbook.md](railway-preproduction-runbook.md).

Ces constats décrivent la préproduction après le déploiement staging autorisé du
29 septembre 2026. L'environnement visible `production` reste de rôle applicatif
`staging` ; aucun lancement ou changement de domaine de production n'a eu lieu.
