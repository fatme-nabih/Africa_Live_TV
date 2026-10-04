# Africa Live — état courant au 4 octobre 2026

**Correctifs COR reçus localement ; publication GitHub et Railway staging expressément demandée le 4 octobre 2026, en cours.** [Publication et contrôles](publication-correctifs-2026-10-04.md), [backlog et statuts](backlog-correctifs-audit-2026-10-04.md), [règles, preuves et limites](correctifs-audit-validation-2026-10-04.md).

- 26 tickets reçus localement. COR-506 : profilage partiel, comparaison du parcours authentifié sur build et budget encore ouverts. COR-900 : réception globale avec réserves. COR-901 : publication autorisée, en cours.
- Next / `@next/env` / eslint-config-next 16.3.8 ; aucune nouvelle migration (journal existant de 20 migrations). Paiement simulé uniquement ; aucune réparation de droits réels.
- Remboursement validé par le propriétaire : retirer l’achat et reconstruire les achats restants à leurs dates d’origine. Dates d’achat conservées ; pending/failed n’accordent aucun jour.
- Contrôles : 364 unités sans réseau, 23 intégrations PostgreSQL isolées ; typage/lint/migrations/build et audit production réussis. E2E, mesures et cas ignorés détaillés dans le dossier de preuves.
- Local : PostgreSQL `africa_live_dev`, localhost:3001, fichiers `.env*` conservés avec Clerk de développement. Drapeaux MVP utilisés uniquement dans les processus de test. Le compte synthétique détenu est nettoyé après les tests.
- Staging revérifié avant publication : rôle `DEPLOYMENT_ENV=staging`, Railway `490d48be` SUCCESS actif ; 20 migrations appliquées sans différence ni migration en attente. MVP, lecture locale et VLC desktop désactivés ; pré-déploiement `db:migrate:deploy`, healthcheck `/api/health` (120 s). Aucun changement de configuration Clerk/OVHcloud/DNS.
- Production future : lancement non effectué. IPTV source conservé ; médias toujours téléchargés directement par navigateur/VLC.

Reste : réception COR-506/COR-900, sessions membre/admin et appareils réels ; terminer et vérifier la publication COR-901. Les décisions Premium encore ouvertes (dont logos officiels D-6 et briefing UX-507) restent dans leur backlog d’origine.
