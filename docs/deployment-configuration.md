# Configuration et commandes — étapes 0 et 1

## Environnements

Le mode local utilise exclusivement africa_live_dev et http://localhost:3001.
Les fichiers .env.local existants restent privés. Ne pas utiliser les valeurs factices
de .env.example pour un déploiement.

Le serveur valide sa configuration au démarrage via src/instrumentation.ts, avant
d'accepter les requêtes. Les diagnostics ne contiennent que les noms des variables
et des messages fixes, jamais leurs valeurs. Les contrôles de format ne prouvent
pas que les clés sont reconnues par Clerk ni que la connexion DB fonctionne.

| Variable | Local | Déploiement |
|---|---|---|
| NODE_ENV | development (Next dev) | production (Next start), y compris préproduction |
| DEPLOYMENT_ENV | inutile | staging ou production ; production par défaut |
| DATABASE_URL | PostgreSQL /africa_live_dev | PostgreSQL séparé ; africa_live_dev refusée au démarrage déployé |
| LOCAL_DEV_MODE | true | false explicite |
| NEXT_PUBLIC_LOCAL_DEV_MODE | true | false explicite |
| NEXT_PUBLIC_APP_URL | http://localhost:3001 | origine HTTPS sans chemin, paramètres ni identifiants |
| ENABLE_LOCAL_VLC | true si VLC installé | false explicite |
| VLC_PATH | facultatif | inutilisé |
| PLAYBACK_ELIGIBILITY_READY | false autorisé | false explicite jusqu'à validation du catalogue ; true seulement après cette validation |
| ABUSE_HASH_SECRET | secret local | au moins 32 caractères aléatoires, sans valeur factice |
| CATALOG_CURSOR_SECRET | secret local | secret distinct, mêmes exigences |
| ABUSE_TRUSTED_PROXY_HEADER | disabled | disabled par défaut ; cf-connecting-ip, x-real-ip ou x-forwarded-for seulement si l'infrastructure garantit leur remplacement |
| BROWSER_TEST_ORIGIN | http://localhost:3001 | si défini, identique à NEXT_PUBLIC_APP_URL pour la vérification CORS |
| NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY | factice tolérée, non utilisée en mode local | pk_live en production ; test ou live en staging |
| CLERK_SECRET_KEY | factice tolérée, non utilisée en mode local | sk du même mode que la clé publique ; aucune valeur factice |
| CLERK_WEBHOOK_SIGNING_SECRET | facultatif | secret whsec de l'endpoint Clerk configuré |
| CLERK_BILLING_PLAN_SLUG / CLERK_BILLING_PLAN_ID | facultatifs | au moins un identifiant de plan explicite |
| PORT | 3001 fixé par npm run dev | fourni par la plateforme à npm start |

## Origines réservées

Le domaine `africatv.sn` est acquis. L'origine personnalisée de préproduction
`https://staging.africatv.sn` est active, avec CNAME/TXT validés, certificat TLS
Let's Encrypt et healthcheck opérationnel. La production future utilisera
`https://africatv.sn`; `https://www.africatv.sn` sera un alias ou une redirection
canonique décidé au lancement. Ne jamais utiliser l'apex pour la préproduction
ni inscrire les deux environnements dans les mêmes variables ou identifiants
Clerk.

Toute modification de `NEXT_PUBLIC_APP_URL` ou d'une autre variable
`NEXT_PUBLIC_*` nécessite un nouveau build. Ajouter d'abord l'origine et les
redirections exactes dans l'instance Clerk correspondante, puis effectuer le
smoke test complet décrit dans `non-regression-checklist.md`.

L'environnement staging n'active aucun accès local et ne contourne aucune règle
d'abonnement ou d'éligibilité. Il autorise seulement les clés Clerk de test.
L'état actuel de Clerk Billing sera réévalué avant le lot 2 si une migration
Better Auth est retenue ; ces contrôles protègent l'application telle qu'elle existe.

## Vérifier sans publier

```powershell
npm run config:check
npm run config:check:production
npm run config:check:staging
```

Les deux dernières commandes vérifient les variables chargées sous les contraintes
du déploiement choisi. Elles doivent échouer avec la configuration actuelle du MVP.
Elles ne modifient ni les variables enregistrées ni les données et n'appellent pas Clerk.

Les NEXT_PUBLIC_* sont intégrées au build Next.js. Fournir les bonnes valeurs
publiques avant le build de déploiement ; les changer uniquement au démarrage
ne reconstruit pas les ressources du navigateur. L'instrumentation vérifie les
valeurs publiques incorporées dans le build. Un build local reste un contrôle
de compilation ; il n'est pas un artefact prêt à publier.

## Runtime et installation

Branche Node.js 22 déclarée dans .nvmrc et package.json (minimum 22.16.0),
npm 10 ou 11. La validation locale utilise Node 22.16.0/npm 11.12.0.
Utiliser un correctif de sécurité à jour de Node 22 pour l'hébergement et
le revalider en préproduction ; la version de cette machine n'est pas une
certification de sécurité du runtime de production.

```powershell
npm ci
npm run dev
```

`npm start` démarre le serveur de production et respecte PORT fourni par la
plateforme (3000 par défaut Next.js). `npm run start:local` fixe 127.0.0.1:3001
pour contrôler localement un build de production avec une configuration de
déploiement valide ; ce n'est pas un mode sans authentification.

## Tests d'intégration sûrs

```powershell
npm run test:integration
```

Le lanceur utilise uniquement une connexion locale à africa_live_dev. Il crée
un schéma africa_live_test_<UUID> propre à l'exécution, prépare les tables depuis
les migrations avec déplacement des références de schéma pour les tests, puis
exécute les quatre suites séquentiellement. La recherche de tables n'a aucun
repli vers public. Les fichiers de migration originaux ne sont pas modifiés.

Un compteur témoin doit rester intact ; les nombres et empreintes des chaînes
et sources de public sont comparés avant/après. Le nettoyage supprime uniquement
le schéma créé par l'exécution, même si un test échoue. Les tests d'identité
suppriment uniquement leurs propres compteurs et utilisent des identifiants uniques.

Ne pas activer directement les anciens drapeaux *_INTEGRATION_TEST : sans cible
isolée, ils font échouer l'initialisation avant toute écriture. Les variables
INTEGRATION_TEST_* sont internes au lanceur, pas à enregistrer dans .env.local.
Une interruption forcée du processus parent peut laisser un schéma jetable :
identifier précisément celui de l'exécution avant tout nettoyage manuel.

Cette préparation vérifie les migrations dans un schéma isolé. Elle ne remplace
pas le futur essai des migrations inchangées sur une base vierge de préproduction.

```powershell
npx playwright test e2e/local-mvp.spec.ts e2e/local-playback.spec.ts e2e/local-playback-api.spec.ts
```

Par défaut Playwright démarre le checkout courant sur 3001 et refuse un port
occupé. E2E_REUSE_SERVER=true est un choix explicite après vérification de la
copie servie ; E2E_EXTERNAL_SERVER=true reste réservé aux essais maîtrisés.
Les suites locales qui accèdent à la DB refusent une autre base, un serveur
distant et un runtime de production avant d'effectuer leurs écritures.
Les tests authentifiés du futur lot 6 restent distincts des E2E locaux.
