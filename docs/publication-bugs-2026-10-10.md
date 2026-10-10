# Publication GitHub et Railway staging — 10 octobre 2026

Publication explicitement demandée par le propriétaire après les corrections
B01–B20/A1 et BUG-905 (hydratation Clerk). Périmètre : code/tests/documentation
reçus localement, migration additive 0020. Railway `just-compassion` reste staging.

## Préparation reçue avant publication

- Référence GitHub/main et checkout : `e4ff28f`, aucune divergence distante.
- Service : `Africa_Live_TV`, projet `9df8bf76-5198-475d-a2db-9c72d0912b60`,
  environnement `f2fe6411-f8ca-47fd-991a-81fcfb1db585` nommé `production` dans
  l'interface, rôle applicatif **staging**. Déploiement précédent `738d71b8`.
- Runtime revérifié : Next 16.3.8, NODE_ENV production ; MVP, public MVP,
  lecture locale et VLC desktop false, mode CI anonyme absent. Pré-déploiement
  `npm run db:migrate:deploy` (300 s), santé `/api/health` (120 s).
- Aucun repoTrigger Railway : le push GitHub ne déclenche pas une seconde
  livraison ; upload CLI d'un snapshot Git prévu. Configurations conservées.
- Les vingt migrations distantes correspondent aux anciennes locales ;
  migration 0020 prête, additive, sans backfill ni changement de droits.
- Réception locale : 404 unités, 40 intégrations isolées, 53 composants, E2E
  applicatifs ciblés, trois SSR/hydratation ; types/lint/build/migrations/invariants
  et audit production reçus. [Dossier](validation-correctifs-bugs-2026-10-09.md),
  [complément Clerk](hydratation-clerk-2026-10-10.md). Réserves physiques maintenues.
- Vérification des chemins/secret avant commit : aucun fichier privé ni secret
  détecté dans les fichiers destinés à Git ; `.env*`, backups, logs et états
  d'authentification privés restent exclus. Sources IPTV inchangées.

## Sauvegarde pré-migration reçue

Préfixe privé :
`backups/railway/railway-before-bugs-0020-2026-10-10T13-56-23-053Z`.
Dump custom chiffré AES-256-GCM, clé DPAPI Windows. Déchiffrement et SHA-256
reçus, restauration dans une base locale temporaire unique, puis comparaison des
empreintes de huit tables métier et du journal de migrations : **identiques**.
24 tables public/drizzle restaurées, 20 migrations, 14 505 chaînes,
15 646 sources, six comptes, 56 favoris ; zéro achat/abonnement/pays suivi/retrait.
Base temporaire et dumps temporaires en clair supprimés ; trois fichiers de
sauvegarde chiffrée/métadonnées/clé protégée conservés hors Git.

## Livraison et réception

- Code publié sur GitHub/main : [`69d41ce`](https://github.com/fatme-nabih/Africa_Live_TV/commit/69d41ce).
  Snapshot de 602 fichiers Git, fichiers privés exclus ; 467 fichiers applicatifs.
- Railway : **`4b76c516-b7ad-4646-a3b8-56e1d2576a0b` SUCCESS**. Pré-déploiement
  et migration 0020 reçus : **21/21 migrations**, hashes identiques, rien en attente.
  Rôle staging et tous les modes locaux désactivés revérifiés ; mur TV conservé.
- **467/467 fichiers applicatifs identiques** par SHA-256 sur le runtime.
- Santé **200** (processus/base) sur `staging.africatv.sn` et le domaine Railway ;
  météo anonyme 401 et dashboard/mur/pays suivis 307 vers la connexion. **14/14 E2E
  distants**, ≈36,6 s : auth/paiement simulé/worker réel et parcours publics,
  sans achat réel ni session authentifiée de test.
- Données : empreintes catalogue/favoris/pays/droits/transactions/retraits
  inchangées, effectifs conservés. La table users a changé pendant la réception :
  comparaison du dump restauré avec la base active, champ par champ via hashes,
  **un profil avec seulement `clerk_synced_at`/`updated_at` changés** ; rôle,
  statut, email, création et échéance d'essai identiques. Une révision fournisseur
  est désormais renseignée par la synchronisation Clerk ; ce n'est pas un backfill
  de la migration. Six comptes, 56 favoris, zéro achat/abonnement/retrait, aucune
  trace terminale ajoutée par le passage. Seconde base de comparaison nettoyée.
- Première CI [38057820630](https://github.com/fatme-nabih/Africa_Live_TV/actions/runs/38057820630) :
  unités/intégrations/build/E2E build/composants réussis ; UI : 67 réussis, un ignoré,
  un échec dans l'ancien test catalogue. Il utilisait un manifeste introuvable
  tout en exigeant des IDs vides à chaque requête : la fin de manifeste corrigée
  déclenche désormais une vraie relance avec IDs de session/tentative.
- Correctif de **test seulement** [`6059818`](https://github.com/fatme-nabih/Africa_Live_TV/commit/6059818) :
  la fixture HLS valide existante est servie dans le catalogue et la fenêtre
  séparée ; assertions de confidentialité/IDs conservées. Application identique
  à 69d41ce ; aucun second déploiement Railway nécessaire.
- CI relancée [38058708112](https://github.com/fatme-nabih/Africa_Live_TV/actions/runs/38058708112) :
  **SUCCESS** sur 6059818 : **404 unités, 40 intégrations isolées, 16 E2E de build
  (10 ignorés), 53 composants, 68 UI (un ignoré)** ; fixture utilisateur/catalogue
  supprimée par le runner. Types/lint/build/audit production réussis. Les cas
  ignorés dépendent du mode de serveur/session et ne sont pas des succès ; le
  worker de build et les refus anonymes sont reçus par les E2E distants dédiés.
  Snyk Code reste indisponible (organisation non activée), audit des dépendances
  production obligatoire réussi. Aucune activation de service ou changement de
  plan pour lever cette réserve.

**Publication reçue**, avec les réserves d'appareils/profils de BUG-903. Les
commits ultérieurs de clôture ne changent que la documentation ; l'applicatif
Railway est identique au code actuel de GitHub. Aucun arrêt/redémarrage du serveur
local par les commandes de publication ; observé actif pendant le passage,
port 3001 libre au constat final (cause non établie). Fichiers `.env*` intacts.
Aucun changement de rôle staging,
plan, DNS, Clerk, paiement activé ou tâche Windows.

Preuves privées : `.local-logs/publication-bugs-2026-10-10/` : `preflight.json`,
`runtime.json`, `health.json`, `remote-source.json`, `database-after.json`,
`users-comparison.json`, journaux E2E/build/CI et résultat de sauvegarde.

Les anciens clients checkout sans protocole 2 et préférences sans propriétaire
ou version sont refusés 409 avant mutation ; recharger l'application pour recevoir
le nouveau client. Les réserves d'appareils/profils réels restent distinctes.

Rollback : le retour à l'image précédente conserve l'ajout SQL mais réouvre les
anciens défauts d'identité/synchronisation. La migration est additive ; aucune
restauration par-dessus des comptes ou droits réels n'est incluse dans la livraison.
Les qualifications historiques n'ont pas été recontrôlées ; aucune tâche Windows,
copie du catalogue, activation des paiements, configuration Clerk/DNS ou
promotion en production n'est incluse.
