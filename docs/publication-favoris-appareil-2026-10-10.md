# Reprise des favoris de l’appareil — publiée sur staging le 10 octobre 2026

Le propriétaire a demandé commit, push et mise à jour de Railway après la réception locale. Cible : service Africa_Live_TV du projet `just-compassion`, rôle **staging**, domaine `staging.africatv.sn`.

## Résultat

Le bandeau compare les anciens choix avec ceux du compte, annonce seulement les éléments manquants et attend les réponses serveur avant de confirmer l’import. Les erreurs, les ajouts partiels et la limite de cinq pays restent visibles ; les choix non ajoutés sont conservés pour une reprise explicite. « Plus tard » conserve les choix sur l’appareil. Le résultat du contrôle connecté ne présente plus le bandeau redondant dans la session du propriétaire.

Implémentation et essais initiaux : [dossier du correctif](favoris-appareil-correctif-2026-10-10.md). Les modifications locales indépendantes de la grille des pays n’ont pas été incluses ; leurs fichiers ont été conservés, y compris les changements de son banc dans `entry.tsx`.

## GitHub et CI

- Correctif initial [`f9ddb95`](https://github.com/fatme-nabih/Africa_Live_TV/commit/f9ddb9535aff87ef58dbbba3c6bd83281251db36), puis complément [`60c307d`](https://github.com/fatme-nabih/Africa_Live_TV/commit/60c307ddb6895730a6034cc7125b051ece4ee7ed), poussés sur main.
- La première CI a révélé un double affichage de l’erreur sur TV : la page et la coquille présentaient le même message. Le complément garde un seul message sur TV et conserve l’erreur globale sur Radar/Compte. Un test de composants supplémentaire couvre cette distinction ; le test TV existant ayant révélé le défaut reste intact. Les deux scénarios ciblés ont été reçus en local avant le second push.
- CI finale [38089047128](https://github.com/fatme-nabih/Africa_Live_TV/actions/runs/38089047128) **SUCCESS** : **427 unités**, **41/41 intégrations PostgreSQL isolées**, **16 E2E de build**, **88 composants** et **68 parcours d’interface** réussis. Les 41 intégrations ignorées dans `npm test` ont été exécutées séparément et ne sont pas comptées comme succès dans ce premier mode.
- Types, lint, build et audit des dépendances de production réussis. **Snyk Code indisponible pour l’organisation** : le succès du job ne certifie pas un scan SAST exécuté.

## Railway et réception

- Dernier runtime précédent : `474301eb`. Aucun déploiement automatique après les pushes ; envoi par CLI d’un snapshot de **620 fichiers Git**, fichiers privés et médias de test exclus, fondé sur `60c307d`.
- **Un seul envoi.** Le CLI a renvoyé une erreur réseau ; Railway avait néanmoins reçu le dossier et a poursuivi la même tentative, de INITIALIZING à BUILDING puis SUCCESS. Aucun second upload ni changement de configuration n’a été effectué. Le résultat du CLI et sa récupération depuis l’état Railway sont conservés séparément.
- Railway **`7c44e966-531e-4445-a888-f431477b1dcd` SUCCESS** ; **475/475 fichiers applicatifs SHA-256 identiques** au commit. Le bundle contient la confirmation, l’attente, le résultat partiel et la reprise des favoris ; les anciens libellés du bandeau et du bouton d’import sont absents.
- Next 16.3.8, rôle **staging**, NODE_ENV production ; modes locaux, lecture locale, VLC desktop et accès anonyme CI désactivés. Mur TV conservé.
- **21/21 migrations**, aucun fichier différent, aucune migration en attente ni nouvelle modification SQL. La sauvegarde chiffrée restaurable du jour a été revérifiée : clé disponible, chiffrement/déchiffrement et empreintes conformes, sans dump en clair.
- Santé **HTTP 200** sur `staging.africatv.sn` et le domaine Railway de diagnostic ; protections anonymes conservées ; **14/14 E2E distants** réussis.
- Inventaires et empreintes avant/après identiques : **14 505 chaînes, 15 646 sources, 56 favoris et zéro pays suivi côté serveur**. Aucune importation ou suppression de favoris réels par les essais de publication.
- Réception dans un nouvel onglet connecté Edge : compte chargé, ancien bandeau absent, aucun bandeau d’import ni erreur de préférences dans cette session. L’onglet temporaire est fermé ; l’onglet TV initial n’a pas été rechargé.

## Conservation et limites

Aucun changement Railway/Clerk/OVHcloud/DNS, de plan, de droits, de paiement ou de transport média. Aucun recontrôle des flux ni modification du projet source IPTV. Les autres changements locaux de grille/Radar et `.claude/` restent hors des commits de cette livraison.

La CI et les bancs couvrent les échecs, quotas, comptes multiples, stockage refusé et imports partiels avec des profils ou fournisseurs isolés. Le contrôle connecté sur staging est une réception en lecture : les boutons d’import/report n’ont pas été exercés sur les favoris réels du propriétaire. Un onglet ouvert avant la publication conserve son ancien client jusqu’à son rechargement.

Preuves privées : `.local-logs/publication-favoris-2026-10-10/`. Le commit documentaire de clôture ne change pas les fichiers applicatifs ; aucun nouveau déploiement n’est nécessaire pour cette seule documentation.
