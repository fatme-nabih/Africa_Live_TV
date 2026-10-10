**Prompt à transmettre à l'agent codeur lorsque le propriétaire demande de commencer les corrections**

Le texte ci-dessous est prêt à être copié dans une demande d'implémentation. Sa préparation documentaire ne lance pas les corrections dans la session actuelle.

---

Tu es l'agent codeur chargé de corriger et recevoir localement les bugs d'Africa Live dans `C:/Users/GAMER PC/Africa_Live_TV`.

Commence par lire, dans cet ordre :

1. [AGENTS.md](<C:/Users/GAMER PC/Africa_Live_TV/AGENTS.md>) et [contextellm.md](<C:/Users/GAMER PC/Africa_Live_TV/contextellm.md>).
2. [Audit B01–B20/A1 du 9 octobre](<C:/Users/GAMER PC/Africa_Live_TV/docs/audit-bugs-2026-10-09.md>).
3. [Plan détaillé d'exécution](<C:/Users/GAMER PC/Africa_Live_TV/docs/plan-correctifs-bugs-2026-10-09.md>).
4. [Backlog BUG de 39 tickets](<C:/Users/GAMER PC/Africa_Live_TV/docs/backlog-correctifs-bugs-2026-10-09.md>).
5. Les guides de Next.js installés dans `node_modules/next/dist/docs/` pour les API, composants et tests concernés.

Ta mission est d'**implémenter les corrections locales**, pas de produire un autre plan général. Exécute L0 puis L1 à L6 et la réception locale L7, séquentiellement. Vérifie la situation réelle du checkout ; la référence de l'audit était `e4ff28f`, mais ne replace jamais le dépôt à cette révision. Lis `git status --short` avant toute édition et conserve intégralement les modifications préexistantes.

Il y a **21 défauts à recevoir** :

- B01 : clé de paiement réutilisée après une commande terminée ; traiter le statut avant l'URL, permettre une nouvelle commande sur un nouveau clic, conserver toute issue incertaine et l'idempotence serveur.
- A1 : remboursement intégral pendant l'essai ; **décision explicite du propriétaire : conserver les jours d'essai restants à leur échéance d'origine**, sans nouvel essai ni droits payants supplémentaires. Ce point ne nécessite plus de question métier.
- B02 : erreur fatale de manifeste absorbée par `startLoad()` ; conclure la tentative et borner la préparation aussi hors local, avec callbacks/télémétrie reçus.
- B03 : HTTP dans les ressources d'un manifeste HTTPS ; agréger protocoles et CORS des URL finales requises, refuser la qualification web incompatible.
- B04 : segment JSON accepté comme vidéo ; contrôler un petit échantillon positif, borné et immédiatement annulé après lecture.
- B05 : clé requise jamais vérifiée ; contrôler clé/init indispensables, reconnaître le chiffrement et classer une preuve incomplète en revue.
- B06 : chargement MP4/HLS natif avant clic Éco ; différer réellement le chargement tout en conservant le geste synchrone de lecture.
- B07 : plus de 100 favoris en attente bloquent toute la file ; envoyer des lots conformes, acquitter par révision, préserver les échecs partiels.
- B08 : Storage indisponible provoque une exception ; persistance facultative et repli mémoire effectif.
- B09 : pays supprimé réajouté par un cache ancien ; compte canonique, intentions attribuées et conflit de version reçu.
- B10 : intentions de A écrasent B ; stores/files/migrations par propriétaire, callbacks invalidés au changement de compte, anciennes clés inconnues conservées sans import aveugle.
- B11 : 429 bloque les pays jusqu'au remontage ; distinguer refus d'accès et échéance de quota, respecter Retry-After puis reprendre sans rafale.
- B12 : popup refusée ferme le dock ; propager le résultat et conserver la même vidéo tant que le transfert n'a pas réussi.
- B13 : réponse RSS ancienne remplace la nouvelle ; contrôler génération, deadline, succès/erreur/finally et chevauchement.
- B14 : erreur SN annule une demande CI ; erreur et résultat rattachés au pays et à la demande.
- B15 : date locale comparée à la révision Clerk ; séparer les horloges et traiter l'historique ambigu sans réactivation hasardeuse.
- B16 : delete avant create oublié ; trace terminale durable et sérialisation sur l'identifiant même absent.
- B17 : retrait remis en revue réactivé par import ; transitions serveur explicites, protection atomique et concurrence import/retrait reçue.
- B18 : GN/GW/GQ et SD/SS mal classés, apostrophe CI manquée ; normaliser et faire prévaloir les expressions spécifiques.
- B19 : Atom retient self au lieu d'alternate ; choisir une URL humaine sûre indépendamment de l'ordre.
- B20 : entités numériques Unicode tronquées ; utiliser les points de code valides sans relâcher l'échappement du rendu.

Les détails de mise en œuvre, fichiers, comportements attendus et matrices de tests sont dans le plan ; ne remplace pas ces fiches par cette seule liste abrégée. L'audit n'affirme pas avoir trouvé tous les bugs possibles. Une découverte nouvelle doit être reproduite et recevoir un ticket séparé.

Respecte les contraintes suivantes pendant tout le travail :

- Projet source `C:/Users/GAMER PC/IPTV` intact, base locale `africa_live_dev`, serveur applicatif localhost:3001.
- Aucun secret affiché, aucune réécriture de `.env*`, aucun Git destructif.
- Aucun relais, conversion ou stockage média serveur ; navigateur/VLC téléchargent directement à l'amont.
- Aucun affaiblissement des gardes Clerk, quotas, refus d'accès, éligibilité publique ou restrictions du VLC desktop local.
- Fixtures binaires toujours exclues de TypeScript/ESLint ; aucun banc de test public livré en production.
- Intégrations uniquement dans les schémas temporaires détenus par le runner, avec assertion de cible et nettoyage. Jamais de suppression de données historiques pour faire passer un test.
- Migrations additives si nécessaires, d'abord reçues en schéma isolé ; journal historique inchangé. Avant une application locale nécessaire, sauvegarde locale vérifiée. Pas de réparation automatique de profils, droits, sources ou préférences réels.
- Aucun nouveau scan global des flux, aucune tâche Windows relancée ou modifiée, aucune copie de catalogue distante.
- Aucun commit, push, déploiement, activation de paiement, état Railway/OVHcloud/Clerk/DNS ou coût supplémentaire sans une demande distincte du propriétaire. Railway demeure staging.

La mission locale déjà autorisée ne nécessite pas un nouveau feu vert entre chaque lot ou choix technique réversible. Poursuis les travaux indépendants si un appareil réel ou un profil manque ; reporte cette limite avec précision sans inventer de réception et sans contourner une garde.

Pour chaque ticket, produis une reproduction avant, un test de non-régression, un correctif ciblé, un contrôle positif et les tests pertinents. Vérifie que le test échoue pour la cause du bug, pas pour un mock mal construit. Les scripts `.local-logs/audit-2026-10-09` sont des reproducteurs personnels, à convertir en tests versionnés ; ne leur fais pas dépendre la CI.

Crée dès le démarrage `docs/validation-correctifs-bugs-2026-10-09.md`. Mets à jour le backlog et ce dossier après les lots, avec état réel, commandes/modes/résultats, cas ignorés, fichiers, décisions de schéma/API, données détenues nettoyées et limites. Garde les journaux sensibles hors Git. Rétablis le mode du serveur initial après tes tests.

La référence précédente avait 375 unités réussies, 23 intégrations reçues séparément et 9 E2E de build, avec TypeScript, lint, build et migrations verts. Ce sont des repères historiques, pas tes résultats à recopier. À la fin, exécute les contrôles globaux du plan et les réceptions ciblées des 21 défauts ; rapporte le total réel et la correspondance défaut→test.

Arrête la mission après la réception locale et le bilan des réserves. Les tickets de réception physique et de publication future restent explicitement distincts ; ne publie pas parce que les tests passent. Dans ton bilan final, explique ce qui est corrigé, comment c'est vérifié, les migrations nécessaires, les limites restantes et ce qui attend une autorisation de publication.
