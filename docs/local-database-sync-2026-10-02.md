# Copie Railway vers PostgreSQL local — 2 octobre 2026

Le propriétaire a demandé de mettre le local à jour depuis Railway, en
interdisant toute modification de la base Railway. La copie est terminée à
19:39 UTC (Africa/Dakar). Railway reste le staging `just-compassion`.

| Données | Local avant | Local après / snapshot Railway |
|---|---:|---:|
| Chaînes | 11 778 | 14 505 |
| Sources | 12 396 | 15 646 |
| Tables publiques | 22 | 22 |
| Migrations Drizzle | 19 | 19 |
| Utilisateurs | 2 | 2 |
| Favoris | 0 | 29 |

La copie inclut l'ensemble des tables applicatives et le journal Drizzle.
Elle ne synchronise pas les variables, clés Clerk, services ou paramètres
Railway : `DATABASE_URL` reste local et le serveur utilise localhost:3001.
Les bases restent indépendantes ; les modifications futures ne se répliquent
pas automatiquement.

## Protection de Railway et déroulement

- Accès explicite au service Postgres existant par SSH CLI. Les requêtes SQL
  et `pg_dump` utilisent `default_transaction_read_only=on` ; aucune création,
  restauration, suppression, migration ou configuration distante exécutée.
- Sauvegarde custom du local, chiffrement AES-256-GCM et clé protégée par
  Windows DPAPI. Restauration dans une base temporaire **locale**, comparaison
  des effectifs et empreintes de toutes les lignes, puis suppression de cette
  base temporaire.
- Export custom Railway par stdout SSH, sans écrire de dump distant.
  Restauration et vérification dans une seconde base temporaire **locale**.
  PostgreSQL Railway 18.6, serveur local 17.5 : restauration réellement réussie
  avec les outils locaux PostgreSQL 17, sans mise à niveau du serveur.
- Arrêt bref du serveur Next de ce checkout, contrôle que les données locales
  importantes n'ont pas changé depuis la sauvegarde, restauration transactionnelle
  exclusivement dans `africa_live_dev`, puis redémarrage de `npm run dev`.
- Toutes les tables et leurs empreintes correspondent au snapshot restauré.
  Quatorze tables stables, dont catalogue, imports, migrations, utilisateurs,
  favoris, accès, paiements et demandes de support, correspondent aussi aux
  lectures Railway avant et après. Les compteurs et sessions opérationnels
  du staging peuvent continuer d'évoluer avec son trafic normal.

## Sauvegardes et preuves locales

Sauvegardes conservées sous `backups/local-sync/`, ignorées par Git :

- `local-before-2026-10-02T19-37-02-783Z` : ancien local récupérable ;
- `railway-source-2026-10-02T19-37-02-783Z` : snapshot utilisé pour la copie.

Chaque préfixe possède un `.dump.aes256gcm`, une `.key.dpapi` et des métadonnées
`.json`. La récupération des clés DPAPI et le déchiffrement authentifié ont
été vérifiés avec comparaison SHA-256. Les clés sont liées au compte Windows
actuel. Les dumps temporaires non chiffrés ont été supprimés après réception.

Preuves et scripts ponctuels ignorés sous `.local-logs/db-sync-2026-10-02/` :
`before.json`, `prepared.json`, `result.json`. Ils contiennent les inventaires
et empreintes, sans identifiants de connexion ni URLs de flux.

## Réception

- `GET http://127.0.0.1:3001/api/health` : **200**, processus/base `ok`.
- Accès anonyme `/api/channels` et `/app/live` : **307** vers Clerk.
- Aucun changement du code applicatif, des fichiers `.env`, de la source IPTV,
  de GitHub, de Railway, d'OVHcloud ou de Clerk ; aucun commit/push/déploiement.
- Aucun rescan média : les qualifications copiées conservent leur date et
  ne constituent pas une nouvelle preuve de santé des sources.

Le parcours Clerk connecté et la lecture média n'ont pas été rejoués pour
cette opération de copie. Le local conserve ses règles de catalogue complet
et de retentative de lecture ; le staging conserve ses règles d'éligibilité.
