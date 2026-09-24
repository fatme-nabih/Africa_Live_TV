# Matrice des environnements — 22 septembre 2026

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
| `ABUSE_TRUSTED_PROXY_HEADER` | `disabled` | `disabled` | seulement l'en-tête garanti par Railway, sinon `disabled` | seulement l'en-tête garanti par l'infrastructure |
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

## État Railway observé

- Projet : `just-compassion`, environnement Railway nommé `production`.
- Rôle applicatif : staging (`DEPLOYMENT_ENV=staging`).
- Services : `Africa_Live_TV` et `Postgres`, tous deux en ligne.
- Déploiement actif : `ddc78ef6-f449-4b46-a23f-b725b5ae8271` (commit `3a325ab`).
- Runtime observé : Node.js 22.23.3, Railpack 0.40.0, une réplique US West.
- Pré-déploiement actif et validé : `npm run db:migrate:deploy`, délai 300 s.
- Healthcheck actif et validé : `/api/health`, délai 120 s (200 OK).
- PostgreSQL : volume persistant et 21 tables ; sauvegarde/PITR non disponible sur le plan observé.
- Lecture : `PLAYBACK_ELIGIBILITY_READY=true` ; 6 825 flux sains certifiés (4 385 flux web direct BROWSER_OK et 2 440 flux VLC_ONLY) sur 12 396 flux. Lancement VLC 100 % automatique sans affichage d'URL ni bouton de copie M3U8. Lecture directe validée sur PC et mobile, sans relais média serveur.
- Domaine staging : `staging.africatv.sn` actif avec DNS OVHcloud et certificat
  Let's Encrypt validé. Le domaine Railway reste disponible en repli.
- Nommage retenu : `staging.africatv.sn` pour cette préproduction ; apex et
  `www.africatv.sn` restent réservés à une production future.
- Exploitation détaillée :
  [railway-preproduction-runbook.md](railway-preproduction-runbook.md).

Ces constats sont un inventaire, pas une autorisation de déployer ni de modifier
les variables Railway.
