# Progression — préparation production

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
