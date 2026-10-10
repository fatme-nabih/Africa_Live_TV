# Reprise des choix de l’appareil — correctif reçu en local le 10 octobre 2026

Le bandeau propose seulement les pays et favoris absents du compte, après lecture du serveur. L’import conserve ses intentions jusqu’à confirmation, annonce les ajouts réellement enregistrés et présente les choix restant à reprendre. Un échec ne disparaît plus silencieusement sur le Radar.

## Comportement livré

- Pendant la lecture initiale, le bandeau vérifie les choix déjà enregistrés ; un cache local ne suffit pas pour proposer un import ou annoncer sa réussite.
- Les favoris et pays déjà présents sont exclus du nombre proposé. Aucun import implicite ; aucune suppression d’un favori ou pays déjà présent au compte.
- Après « Ajouter à mon compte », une attente visible remplace l’offre. Le résultat est confirmé seulement lorsque les réponses serveur ont acquitté les intentions de cet import.
- Le synchroniseur compare les ajouts demandés à la liste canonique retournée par l’API. Un HTTP 200 seul ne constitue plus une preuve d’enregistrement de chaque favori : ceux absents de la réponse sont conservés comme choix refusés, sans boucle automatique infinie. Le message ne prétend pas connaître la raison précise du refus.
- Les erreurs des favoris sont visibles dans la coquille commune, y compris sur le Radar. Une nouvelle tentative respecte les quotas et ne débloque jamais un refus d’accès ; la reconnexion/recharge reste nécessaire après 401/403 ou changement de propriétaire.
- Un résultat partiel indique le nombre de chaînes encore à ajouter et les noms des pays conservés hors compte. La limite de cinq pays est expliquée ; elle ne tronque plus silencieusement le résultat annoncé. Les anciennes clés restent intactes.
- « Plus tard » garde les choix sur l’appareil et masque l’offre. « Reprendre les choix de cet appareil », dans Compte, repropose uniquement les choix encore manquants. Le bouton n’est pas affiché quand tout est déjà enregistré.
- Les états d’import et de rejet sont enregistrés dans le namespace du propriétaire. Un rechargement reprend les intentions en attente ; une réponse tardive de A ne peut pas confirmer un import pour B.
- Un résultat partiel se met à jour si les choix sont ensuite ajoutés par un autre contrôle de préférences. Le refus du stockage local est annoncé explicitement ; le suivi reste alors en mémoire pour la page.
- Les boutons restent lisibles et utilisables à 360 px ; la marge du bandeau garde les actions au-dessus de la navigation mobile fixe.

## Implémentation

`src/lib/legacy-preferences.ts` contient la comparaison avec l’état confirmé et le calcul du résultat. `preference-store.ts` conserve le suivi et les choix rejetés. Les indicateurs de lecture serveur sont remis à faux lors d’un nouveau chargement, même si un ancien cache les contient. `preference-sync-client.ts` acquitte les réponses et conserve les ajouts non acceptés. Le hook de nouvelle tentative protège les opérations bloquées.

`FollowedCountriesSync.tsx` conserve la reformulation et la mise en page préexistantes ; il ajoute les états de vérification, attente, succès et résultat partiel. `useFavorites.ts` présente aussi les choix refusés dans la TV. L’API existante reste compatible ; aucun changement SQL, contrat serveur, migration ou configuration n’est nécessaire.

## Validation

| Contrôle | Résultat |
| --- | --- |
| Suite générale `npm test` | 426 réussites, zéro échec, 41 intégrations ignorées dans ce mode — non comptées comme succès |
| Préférences unitaires, dernier passage | 8/8, y compris la mise à jour d’un résultat partiel et les identifiants correspondant à un nom de méthode Object |
| Préférences navigateur existantes | 16/16 |
| Nouveaux scénarios du bandeau | 13/13 ; premier passage avec les 10 premiers, puis reprise des 13 après les derniers changements |
| Intégrations ciblées PostgreSQL | 3/3 dans un schéma jetable de africa_live_dev ; vrai synchroniseur, vrais handlers et vraie persistance, frontière d’autorisation simulée uniquement dans le test |
| TypeScript et ESLint | Réussis ; lint complet puis contrôle des fichiers finaux |
| `npm run build` | Réussi, Next 16.3.8, 28/28 pages générées |
| Présentation | Captures mobile 360 px et bureau 1366 px inspectées ; aucun débordement horizontal |
| Conservation | Empreintes du catalogue public et témoin de quota inchangés ; schéma de test supprimé |

Les scénarios couvrent les doublons, la lecture initiale lente, une réponse d’import retenue, le report/rechargement/reprise, une panne 503, un refus 403, des choix rejetés puis réessayés, la limite des pays, un changement de compte pendant une requête, le refus du stockage, une identité inconnue et un import de 250 favoris par lots de 100/100/50.

Preuves privées : `.local-logs/legacy-fix-2026-10-10/`, dont le runner ciblé conservant les protections du runner du projet et les captures `partial-mobile.png` / `partial-desktop.png`. Le composant, le banc et le test des pays ont été sauvegardés avant édition pour préserver leurs modifications préexistantes.

## État de livraison

Correction locale uniquement, non committée, non poussée et non déployée. Le staging conserve le dernier runtime publié décrit dans `contextellm.md`. Aucun favori réel du propriétaire n’a été importé ni supprimé pendant les essais. Aucun changement Railway/Clerk/OVHcloud/DNS, de plan, de droits, de paiement, de média ou du projet source IPTV.

Le serveur de développement du propriétaire sur localhost:3001 (PID 29736) a été conservé. Le banc indépendant de composants sur 3002 a été arrêté à la fin des essais. Les autres modifications préexistantes de la grille des pays, de son test et du Radar ont été conservées.
