**Africa Live — plan d'exécution pour l'agent codeur, 9 octobre 2026**

Ce document est une consigne d'implémentation destinée au LLM qui prendra les corrections en charge. Il couvre B01–B20 de l'[audit du 9 octobre](<C:/Users/GAMER PC/Africa_Live_TV/docs/audit-bugs-2026-10-09.md>) et A1. **Le propriétaire a décidé le 9 octobre : après remboursement intégral, conserver les jours d'essai restants à leur échéance d'origine.** A1 est donc désormais une correction à réaliser, et non une décision en attente. Le total à recevoir est **21 défauts**.

L'état de référence est `e4ff28f`, avec un arbre volontairement sale. Le présent travail prépare les documents ; aucune correction applicative n'a commencé. Utilise le [backlog opérationnel](<C:/Users/GAMER PC/Africa_Live_TV/docs/backlog-correctifs-bugs-2026-10-09.md>) pour suivre les 39 tickets et le [prompt de démarrage](<C:/Users/GAMER PC/Africa_Live_TV/docs/prompt-agent-correctifs-bugs-2026-10-09.md>) pour transmettre le dossier à un agent.

**0. Mandat, règles et preuves à lire avant de coder**

Ton objectif est de corriger les causes, ajouter les tests qui rendent les défauts détectables et livrer un résultat local vérifié. Une suite générale verte ne ferme pas un bug si son scénario précis n'a pas été reçu. Le périmètre est une remédiation ciblée, sans refonte du produit, renouvellement des dépendances ni ajout de fonctionnalités sans rapport avec les constats.

Lis d'abord [AGENTS.md](<C:/Users/GAMER PC/Africa_Live_TV/AGENTS.md>), [contextellm.md](<C:/Users/GAMER PC/Africa_Live_TV/contextellm.md>), le rapport d'audit, ce plan et le backlog. Consulte ensuite les documents d'exploitation cités par AGENTS.md, notamment la matrice d'environnement et la checklist de non-régression. Les anciens tickets COR du 4 octobre restent un historique distinct ; ne les rouvrir que si une reproduction actuelle démontre une régression.

Avant chaque lot, relève `git status --short`, vérifie les changements arrivés depuis ta dernière lecture et conserve ceux du propriétaire. Aucun `reset`, `clean`, restauration globale ou remplacement du checkout. Aucun travail dans `C:/Users/GAMER PC/IPTV`.

La base locale est exclusivement `africa_live_dev`, sur une connexion de boucle locale ; le serveur applicatif reste sur localhost:3001. Ne lis pas les fichiers `.env*` dans des sorties de chat et ne les réécris pas pour faire passer un test. Les drapeaux de test doivent être portés par le processus concerné. Ne relance pas `setup:local` sur une installation existante : son contrat de création et ses refus sont documentés dans le handoff.

Avant d'écrire du code Next.js, lis les guides installés correspondant à ce que tu modifies : `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`, `16-proxy.md`, `02-guides/data-security.md`, `02-guides/server-and-client-boundary.md` et `02-guides/testing/playwright.md`, selon le lot. Vérifie les chemins présents avec `rg --files` plutôt que de supposer une ancienne API. Next installé : 16.3.8 ; Clerk installé : 7.5.7 ; utilise leurs types locaux.

Le navigateur et VLC téléchargent directement chez le fournisseur. Aucun relais média, transcodage, téléchargement intégral ou stockage média serveur. Le vérificateur de flux peut contrôler de petits échantillons bornés en mémoire : cette activité de contrôle n'est pas un transport vidéo pour les utilisateurs. Ne retourne ni clés de déchiffrement ni URL de ressources sensibles dans les API publiques ou les journaux.

Maintiens les gardes d'authentification, les droits, quotas, règles de source publique, contrôles localhost et l'exclusion de `e2e/fixtures` de TypeScript/ESLint. Le catalogue local complet reste visible ; une relance locale d'une source historique ne doit jamais enregistrer cette source comme saine.

Railway `just-compassion` demeure staging, même si son tableau de bord dit « production ». Cette demande documentaire n'autorise aucun déploiement, changement distant, DNS, configuration Clerk, activation des paiements, modification de tâche Windows, abonnement, achat, commit ou push. Une future demande d'implémentation locale autorisera le travail local nécessaire ; ne demander pas un nouveau feu vert à chaque choix technique réversible déjà couvert par cette demande. La publication distante restera une opération distincte.

Les preuves de l'audit se trouvent dans `.local-logs/audit-2026-10-09/` : `browser-results.json`, `database-results.json`, `pure-results.json`, leurs scripts et les journaux des contrôles. Elles sont ignorées par Git. Si elles manquent dans un autre checkout, recrée les scénarios à partir des fiches ci-dessous ; ne fais pas dépendre la CI de ce dossier personnel.

Référence de validation : 375 tests unitaires réussis, 23 intégrations réussies dans un passage séparé, TypeScript/ESLint/build/migrations verts, audit npm de production sans alerte et 9 E2E `auth-entry`/`payment` réussis. Les 23 intégrations ignorées dans `npm test` ne sont pas 23 succès supplémentaires. Le banc de composants a reçu 13 scénarios pour 11 bugs distincts ; les trois états terminaux de B01 ne comptent que pour un bug. Aucun appareil physique ni parcours membre/admin complet n'a été reçu par cet audit.

**1. Ordre des lots et méthode de travail**

| Lot | Tickets | Résultat à livrer avant de passer au suivant |
| --- | --- | --- |
| L0 — Préparation | BUG-000, BUG-010 | Référence préservée, reproductions transportables, matrice de tests |
| L1 — Paiement et essai | BUG-101 à BUG-104 | Nouvelle tentative possible après fin ; essai restant préservé après remboursement |
| L2 — Lecteur | BUG-201 à BUG-204 | Fin des attentes infinies ; Éco natif effectif ; popup bloquée sans perte de lecture |
| L3 — Vérification des flux | BUG-301 à BUG-306 | Qualification fondée sur les ressources effectivement indispensables |
| L4 — Identité et retraits | BUG-401 à BUG-406 | Horloges cohérentes, suppression terminale, retrait durable et transactions reçues |
| L5 — Synchronisation | BUG-501 à BUG-507 | Stockage facultatif, préférences par compte, suppressions durables, files bornées par lot |
| L6 — Radar et parsing | BUG-601 à BUG-606 | Dernière réponse conservée ; erreurs par pays ; pays/liens/titres corrects |
| L7 — Réception | BUG-901 à BUG-904 | Bilan local traçable ; limites humaines et publication future séparées |

Exécute ces lots séquentiellement pour éviter des modifications concurrentes des mêmes fichiers. Tu n'es pas chargé de déléguer ce travail à d'autres agents. Les unités et sous-tests indépendants peuvent être exécutés ensemble, sans faire se concurrencer plusieurs serveurs sur 3001 ou plusieurs processus qui modifient le même jeu de fixtures.

Pour chaque défaut : reproduis le symptôme avec le code actuel ; ajoute un test qui échoue pour la cause observée ; applique le correctif minimum cohérent ; fais réussir ce test et les contrôles du lot ; note les preuves et risques résiduels. L0 prépare les bancs, fixtures et emplacements de tests transportables ; ajoute la version rouge de chaque test au début du ticket concerné, sans imposer que tous les correctifs futurs soient déjà présents pour recevoir un premier lot. Les scripts de l'audit qui attendent un bug doivent être transformés en tests du comportement attendu, et non conservés comme tests censés réussir après correction.

N'introduis pas de nouvelle route publique de banc de test, de paramètre utilisateur qui donne des droits, ou de composant de diagnostic présent en production. Les mocks d'authentification et de fournisseur doivent rester dans les tests. Si les tests existants utilisaient un faux segment vidéo constitué de zéros, remplace cette fixture par une vraie structure synthétique pertinente lorsque le contrôle de contenu devient plus strict ; ne détends pas le correctif pour garder une fixture invalide.

**2. L1 — Paiement et maintien de l'essai**

**B01 / BUG-101, BUG-102, BUG-104 — cycle de vie des tentatives de paiement.** Fichiers principaux : [tarifs](<C:/Users/GAMER PC/Africa_Live_TV/src/app/(clerk)/pricing/page.tsx>), [succès](<C:/Users/GAMER PC/Africa_Live_TV/src/app/(clerk)/pricing/success/SuccessClient.tsx>), [création](<C:/Users/GAMER PC/Africa_Live_TV/src/app/api/checkout/naboopay/route.ts>), [contrats](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/payment-contracts.ts>), [réservation](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/payment-creation-store.ts>).

Le client réutilise une clé par forfait en session, et suit toute URL reçue sans traiter d'abord le statut. Les commandes `completed`, `failed` et `canceled` peuvent conserver leur URL ; le même onglet revient alors systématiquement sur l'ancienne commande. La reproduction a reçu deux requêtes avec la même clé pour chacun de ces trois statuts.

Implémente une politique pure distinguant les tentatives **incertaines** (`creating`, `pending`, `reconciliation_required`) des **terminées** (`completed`, `failed`, `canceled`, `refunded`). Le statut doit décider de l'action avant la présence de `checkout_url`. Une URL seule n'est pas un état de commande.

Pour une tentative incertaine, conserve la clé, l'identifiant local et le suivi après rechargement, perte de réponse ou remontage. `pending` avec une URL validée peut ouvrir la caisse ; sans URL, affiche le suivi et empêche une création concurrente. Une erreur HTTP ou un corps invalide ne prouve pas que la création fournisseur a échoué : conserve l'incertitude et les protections actuelles.

Pour une commande terminée, cesse de suivre son URL, retire uniquement la clé de cette tentative et annonce son résultat. Le prochain geste explicite de souscription crée une nouvelle clé. Ne déclenche pas automatiquement un nouveau paiement à la réception du statut terminal : le second achat doit venir d'un nouveau clic. Ne transforme pas un ancien `pending` en échec local pour libérer une clé.

Sur le serveur, une requête utilisant une ancienne clé doit continuer à renvoyer la commande correspondante : l'idempotence garantit justement qu'elle ne crée pas un second achat. Tu peux supprimer l'URL actionnable du DTO terminal sans modifier sa valeur historique en base. Maintiens l'appartenance de la commande au compte, le conflit de forfait pour une même clé, les réservations atomiques et les contrôles de destination NabooPay.

La page de confirmation peut nettoyer la clé correspondant au forfait et à la tentative réellement confirmée ; elle ne doit pas effacer les autres tentatives incertaines. Stocke assez de métadonnées de tentative pour effectuer cette comparaison. En stockage indisponible, utilise une clé en mémoire stable pour le montage et conserve l'idempotence serveur ; ne promet pas une persistance après fermeture de l'onglet si elle n'a pas eu lieu.

Tests attendus : chacun des quatre statuts terminaux avec et sans ancienne URL ; deuxième clic avec une clé différente ; commande incertaine conservée après rechargement ; double clic pendant un fetch ; terminal A reçu alors qu'une autre tentative B existe ; réponse invalide/réseau coupé ; commande appartenant à un autre compte. Étendre `payment.test.ts`, les intégrations NabooPay et `e2e/payment.spec.ts`, avec appels fournisseur interceptés.

Acceptation : renouvellement mensuel/annuel possible après une commande terminée, aucun retour automatique à une caisse terminale, et aucune double création pendant une issue incertaine. Ni montant, durée, signature webhook, paiement activé ni état réel de droits ne doit changer pour recevoir ce ticket.

**A1 / BUG-103, BUG-104 — conserver l'essai restant après remboursement intégral.** Fichiers : [accès](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/access-policy.ts>), [construction de la décision](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/access-control.ts>), [paiement vérifié](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/naboopay-payment.ts>), [calcul des achats](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/payment-entitlements.ts>).

Le remboursement sans achat restant reconstruit l'échéance jusqu'à `user.trialEndsAt`, mais laisse une ligne d'abonnement `expired`. La politique rejette toute présence d'abonnement expiré avant d'examiner l'essai. Le scénario utilisateur encore à quatre jours d'essai aboutit donc à `expired` au lieu de `trial`.

La décision métier est fixée : **utilisateur actif, achat intégralement remboursé et essai original encore valide → accès `trial` jusqu'à la date originale**. Le remboursement ne recrée pas cinq jours, ne prolonge pas l'essai, n'efface pas l'historique et n'accorde aucun jour payant.

Évite de déplacer globalement le test d'essai devant tous les abonnements : cela changerait les cas `past_due`, les autres fournisseurs et la matrice existante. Recommandation : transmettre à la politique pure un contexte de repli issu du serveur, par exemple `verifiedNabooPayRefundWithoutCompletedPurchase`, faux par défaut. Calcule-le à partir d'une preuve de remboursement vérifié, de l'absence d'achats NabooPay `completed` restants et du contexte des autres abonnements. Un booléen reçu du navigateur, un abonnement `expired` seul ou une tentative `failed` ne constituent pas cette preuve.

Applique ce repli seulement lorsqu'il n'existe aucun accès payé/grâce prioritaire ni situation d'un autre fournisseur qui impose le refus conservé. Les comptes `blocked`/`deleted` restent refusés avant toute évaluation d'essai. Une lecture agrégée supplémentaire, seulement dans le cas sans accès avec essai non expiré, suffit ; évite une requête par abonnement. La reconstruction des autres achats conserve leurs dates d'origine et les protections des droits historiques du lot COR.

Tests : paiement puis remboursement intégral à J1 → essai jusqu'à J5 ; instant exact de J5 → refus ; remboursement après J5 → refus ; remboursement partiel du portefeuille avec un autre achat `completed` → droits restants reconstruits ; doublon du remboursement → même échéance ; `pending`/`failed` seuls → aucune nouvelle autorisation ; comptes bloqué/supprimé → refus ; état `past_due` d'un autre fournisseur → comportement existant conservé. Utilise des charges fournisseur valides au sens du schéma, dans les schémas temporaires d'intégration.

Acceptation : le cas A1 retourne `trial` et l'échéance initiale, sans réparation automatique des abonnements ou dates réels. Une éventuelle correction de lignes historiques fera l'objet d'un diagnostic et d'une opération distincts.

**3. L2 — Fin de tentative, Éco natif et fenêtres**

**B02 / BUG-201, BUG-204 — erreur fatale de manifeste et délai de préparation.** Fichiers : [cycle média](<C:/Users/GAMER PC/Africa_Live_TV/src/components/player/useMediaLifecycle.ts>), [lecteur](<C:/Users/GAMER PC/Africa_Live_TV/src/components/Player.tsx>), [erreurs](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/playback-errors.ts>), [machine](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/playback-machine.ts>).

Une erreur fatale de manifeste est absorbée par un appel `hls.startLoad()` qui ne relance pas ce manifeste. Le délai initial est uniquement local. Reproduction réelle hls.js : 404, `manifestLoadError`, une requête seulement et attente toujours présente après 60 secondes simulées.

Sépare les erreurs de manifeste/variantes initiales des erreurs de segments d'une lecture déjà chargée. hls.js dispose déjà de ses relances internes : une erreur **fatale** de manifeste doit terminer la tentative ou utiliser une relance explicite correctement bornée. Le chemin minimal recommandé est de conclure cette tentative et laisser l'orchestration existante choisir une autre source admissible ; ne remplacer pas le manifeste en boucle. Un 401/403/404 ne doit pas déclencher un redémarrage aveugle des segments.

Ajoute un délai de préparation dans tous les environnements. Point de départ recommandé : 15 secondes, distinct du délai de résolution API et du délai de démarrage de l'image. Ajuste seulement si les tests et la configuration hls.js installée justifient une autre valeur, puis documente-la. Le délai part quand le chargement média commence ; pour une source native différée en mode Éco, il ne doit pas s'écouler pendant l'attente volontaire du clic.

À la fin d'une tentative, nettoie timeout, listeners et chargements concernés. Une callback tardive, après zapping ou démontage, ne peut plus appliquer `READY`/`PLAYING` à une nouvelle tentative. Conserve la déduplication des événements, les limites de tentatives, la résolution serveur et les gardes d'accès. Une erreur d'autoplay continue à demander un geste ; elle n'autorise pas un lancement externe automatique de remplacement.

Tests avec le vrai hls.js : manifeste 404/403, corps qui ne termine pas, 503 puis réussite selon son budget interne, réponse tardive après zapping, source suivante saine, limites atteintes, préparation abandonnée et un seul événement d'échec par tentative. Exécute le cas avec les drapeaux locaux désactivés : un test MVP seul ne couvre pas B02.

Acceptation : aucun chargement involontaire n'attend sans limite ; le lecteur propose une issue explicite ou un secours admissible dans le budget reçu. Le vrai lien iOS déjà publié, la détection iPadOS et le lancement Android/bureau restent reçus par `mobile-vlc`.

**B06 / BUG-202, BUG-204 — ne pas charger le média natif avant le clic Éco.** Le même hook affecte `video.src` et appelle `load()` immédiatement pour MP4 ou HLS natif. La fixture existante a reçu une requête de 37 696 octets alors que la vidéo était encore en pause et « Lire maintenant » visible.

En mode Éco, sépare « URL préparée » de « données média chargées ». Ne compte pas seulement sur `preload=none` après avoir affecté `src` : le choix doit précéder tout chargement natif. Le geste de lecture doit affecter la source puis démarrer le chargement/`play()` dans son chemin synchrone, sans nouveau fetch de résolution entre le geste et `play()`.

Conserve le comportement hls.js de préparation de manifeste sans segments, `autoStartLoad:false` et `enableInterstitialPlayback:false`. Pour le natif, le libellé peut annoncer une lecture préparée avant que les métadonnées soient reçues, mais ne pas émettre de télémétrie « started » ou déclarer un décodage réussi à ce stade. Hors Éco, garde le démarrage actuel et les contraintes d'autoplay.

Teste zéro requête MP4 avant clic, zéro requête de segment HLS natif avant clic, puis chargement réel après clic ; activation initiale par stockage et Save-Data ; changement de source en attente ; pause/reprise ; démontage ; timeout seulement après le démarrage effectif. Une simulation de user-agent Safari dans Chromium n'active pas le moteur natif de Safari : utiliser un moteur réellement disponible ou marquer la réception physique comme distincte.

Acceptation : pas de média natif téléchargé avant le choix en Éco, préparation et boutons cohérents, reprise sans nouvelle lecture parasite, aucun changement de source saine enregistré par le client.

**B12 / BUG-203, BUG-204 — conserver le dock si la popup est refusée.** Fichiers : [dock](<C:/Users/GAMER PC/Africa_Live_TV/src/components/player/PlayerDock.tsx>), [résultat du lancement](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/player-window.ts>), page TV et `useRadarPlayer.ts` pour les rappels.

Le chemin générique du dock ignore `PlayerLaunchResult` puis ferme le lecteur. Il se rencontre après navigation, lorsque le rappel de la page d'origine a été oublié. La reproduction `window.open() → null` fait disparaître dialogue et mini-lecteur.

Fais remonter le résultat du lancement aussi pour les rappels de page : un callback `void` ne permet pas au dock de connaître le refus. Ne ferme/transfère le lecteur que pour un lancement réussi ou une navigation dans l'onglet réussie. Pour `blocked`, conserve la même instance vidéo, son état et sa liste de zapping ; affiche un message français et une possibilité de réessayer. N'arrête pas le dock en amont de la vérification du résultat dans le callback TV.

Teste le dock encore sur la TV, le chemin générique après passage TV→Radar, ouverture qui renvoie `null`, ouverture qui lève une exception, ouverture réussie et parcours mobile. Le cas refusé doit conserver l'identité de l'élément vidéo et sa lecture, pas simplement recréer un nouveau lecteur. Conserve une seule source active après un transfert réussi.

**4. L3 — Ressources HLS, preuves média et propagation de la qualification**

Fichiers : [vérificateur](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/stream-verification.ts>), [fetch amont sécurisé](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/safe-upstream-fetch.ts>), [worker](<C:/Users/GAMER PC/Africa_Live_TV/src/scripts/verify-streams.ts>), [politique des échecs](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/stream-verification-policy.ts>), [éligibilité](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/direct-eligibility.ts>).

**Socle / BUG-301.** Remplace la sélection « première ligne sans # » par une représentation testable de la variante média, de son segment, de sa clé éventuelle et de son initialisation `EXT-X-MAP`. Lis les attributs HLS en respectant les valeurs entre guillemets et les virgules à l'intérieur des URI ; résous les références relatives sur l'URL finale du manifeste qui les contient. Les URI, redirections, tailles et profondeurs doivent rester bornées.

Réutilise `safeUpstreamFetch` pour chaque ressource et ses redirections : pinning DNS, refus des adresses privées/identifiants et limites existantes restent actifs. Aucun raccourci via `fetch` général pour la clé ou l'initialisation. Maintiens un délai par requête et ajoute un budget total de sonde incluant lectures et relances ; choisis ses valeurs à partir de la configuration actuelle et note-les dans le dossier. Une ressource qui ne termine pas ne doit pas immobiliser un worker indéfiniment.

**B03 / BUG-302 — calculer le contenu mixte sur la chaîne effective.** Cause : seul le schéma de l'URL initiale décide. Reproduction : manifeste HTTPS, segment HTTP avec CORS `*`, résultat `BROWSER_OK` et résolution autorisée.

Agrège les protocoles des URL effectivement requises, après redirections, pour manifeste, variante, segment, clé et initialisation. Une ressource HTTP interdit la qualification navigateur depuis HTTPS. Si le reste de la sonde est positivement valide pour VLC, `VLC_ONLY` peut rester approprié ; du contenu mixte seul ne prouve pas que le média est hors ligne. Les règles localhost propres au lecteur local ne s'appliquent pas à la classification publique.

Tests : HTTPS→HTTP par redirection sur chacune des ressources, segment HTTP direct, chaîne entièrement HTTPS positive, CORS absent sur une ressource seulement, manifeste HTTP avec redirection finale HTTPS selon la politique définie. Tout chemin contenant un chargement HTTP requis échoue à la qualification web.

**B04 / BUG-303 — contrôler un échantillon de segment.** Cause : tout statut HTTP réussi non HTML est accepté ; le corps est annulé sans lecture. Reproduction : 200 JSON contenant un message d'indisponibilité → `available=true` et `BROWSER_OK`.

Lis un échantillon plafonné, par exemple 4 KiB, puis annule immédiatement le corps, même si le serveur ignore `Range`. Refuse JSON, HTML/XML d'erreur, texte d'erreur, réponse vide ou structure clairement invalide, y compris sous un Content-Type trompeur. Accepte les MIME génériques seulement si un format positif pris en charge est identifiable. Mets les signatures TS/fMP4 et les formats audio réellement pris en charge dans une politique pure avec fixtures appropriées, sans prétendre effectuer un décodage complet.

Ne cherche pas une signature TS dans un segment AES-128 chiffré. Son chemin de preuve doit tenir compte du chiffrement et du résultat du ticket suivant. Un format ou une preuve incomplets conduisent à une revue, pas à une déclaration « sain » ni à un OFFLINE arbitraire. Ne télécharger/déchiffrer jamais une vidéo complète pour ce contrôle. Un éventuel échantillon chiffré dont la preuve reste insuffisante doit être conservativement non qualifié, sans ajouter de conversion vidéo serveur.

Tests : JSON avec MIME JSON et MIME vidéo, texte, XML, 204, 200 vide, octet-stream valide/invalide, segment TS/fMP4 valide, serveur qui envoie sans fin ou ignore Range, annulation sur dépassement, corps fragmenté et rejet de lecture. Les contrôles positifs doivent réellement avoir la structure média annoncée.

**B05 / BUG-304 — vérifier clé et initialisation requises.** Cause confirmée : `EXT-X-KEY` est ignoré ; le vérificateur ne demande jamais une clé qui répond 403. `EXT-X-MAP` présente la même lacune de sélection, sans reproduction séparée dans l'audit.

Pour `METHOD=NONE`, aucune clé n'est nécessaire. Pour AES-128 avec format pris en charge, contrôle l'URI effective, HTTP, CORS et taille d'une clé AES-128 — 16 octets. Ne publie ni ne conserve sa valeur. Vérifie aussi la ressource d'initialisation quand le segment en dépend, y compris les byte-ranges annoncés avec des lectures plafonnées. Les méthodes/KEYFORMAT nécessitant un DRM ou non reçues ne doivent pas devenir « navigateur sain » à partir d'un segment 200 : représente cette preuve comme incomplète et à revoir.

Tests : clé 403/404, vide, taille invalide, lente, HTTP ou sans CORS ; clé relative valide ; `METHOD=NONE` ; initialisation 403 ou invalide ; byte-range valide ; format de clé non pris en charge. Teste aussi une vraie construction synthétique positive et la fermeture des corps. Le contrôle des clés ne doit jamais rendre leur téléchargement disponible via une API de l'application.

**Propagation / BUG-305, BUG-306.** Teste la sortie du vérificateur jusqu'à la politique d'éligibilité et l'écriture du worker. Un segment JSON ou une ressource indispensable refusée ne doit pas renouveler `lastSuccessAt`, conserver `verificationState=HEALTHY` comme résultat du nouveau contrôle, ou être promu `PUBLIC_DIRECT_WEB`.

Distingue échec réseau transitoire, invalidité de contenu et preuve incomplète. Les règles de confirmation historiques ne doivent pas transformer une preuve techniquement invalide en succès neuf. Vérifie explicitement la conservation éventuelle d'un dernier succès : pour une incompatibilité déterministe web, retire immédiatement la qualification web utilisable, tout en préservant la date historique et la possibilité de repli local. Pour une panne transitoire, conserve seulement les règles historiques déjà justifiées. N'efface pas l'historique et ne confonds pas REVIEW_REQUIRED avec OFFLINE.

La réception du code se fait avec fournisseurs simulés et PostgreSQL isolé. **Ne lancer pas un nouveau contrôle global du catalogue**, la tâche Windows de 15 jours ou une synchronisation Railway au titre de cette correction. Les classifications déjà enregistrées ne sont pas corrigées par magie : produire une procédure et un inventaire de recontrôle ciblé en lecture seule, sans l'exécuter automatiquement. Un futur recontrôle réel et sa copie distante seront autorisés séparément.

Acceptation L3 : les trois reproductions négatives ne produisent plus de source web saine ; les contrôles positifs restent qualifiés ; ressources et erreurs sensibles non exposées ; tests d'annulation/tailles/SSRF verts ; worker et résolveur cohérents avec les nouvelles preuves.

**5. L4 — Identité, suppressions et retrait du catalogue**

**B15 / BUG-401, BUG-403, BUG-406 — séparer révision fournisseur et heure de traitement.** Fichiers : [identité](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/identity.ts>), [webhook Clerk](<C:/Users/GAMER PC/Africa_Live_TV/src/app/api/webhooks/clerk/route.ts>), [schéma](<C:/Users/GAMER PC/Africa_Live_TV/src/db/schema.ts>).

Le repli `ensureInternalUser` transmet `createdAt` sans `updatedAt` ; `clerkSyncedAt` prend l'heure locale. Un webhook réellement plus récent que le profil initial est ensuite rejeté parce que son horodatage fournisseur est antérieur à cette heure locale. La reproduction a conservé `active` et l'ancien e-mail au lieu de l'état bloqué et du nouvel e-mail.

Tous les producteurs doivent transmettre une date de révision fournisseur valide : SDK `updatedAt`, webhook `data.updated_at`, et utilisateur inclus dans un événement de session. Utilise séparément `processedAt` pour les journaux/temps de traitement. Le tri ne doit pas dépendre de la zone ou de l'horloge du poste.

Les anciennes valeurs de `clerkSyncedAt` sont ambiguës : certaines sont locales, d'autres fournisseur. N'effectue pas un backfill qui suppose que toutes ont la même provenance. Recommandation : ajouter une colonne nullable dédiée à la révision du profil fournisseur et préserver la colonne historique comme heure/trace de synchronisation, avec une migration additive. Les dates d'essai/création existantes restent immuables.

Pour une ligne historique sans révision fiable, définis un traitement conservateur, reçu par test : soit revalidation d'un instantané courant par le SDK serveur avant application, soit refus contrôlé/retry tant qu'une révision fiable n'est pas disponible. Un webhook ancien ne doit pas simplement écraser un état plus restrictif. Le webhook n'a pas de session utilisateur : utilise le client serveur Clerk approprié pour une éventuelle lecture de profil, pas `currentUser()` supposant une requête connectée. Fais cette lecture avant la transaction et simule-la en tests ; aucun appel réel à Clerk pour « réparer » les comptes pendant la remédiation.

Tests : événement plus récent après première création ; ancien événement ignoré ; replay identique ; horloges locales en avance/retard ; profil de session embarqué ; dates invalides ; ligne historique sans révision ; indisponibilité de revalidation ; compte bloqué/supprimé jamais réactivé par défaut. Les preuves de code ne certifient pas un contournement d'une véritable session Clerk bannie : conserve cette distinction dans le dossier.

**B16 / BUG-402, BUG-403, BUG-406 — suppression terminale même sans utilisateur local.** La suppression actuelle est un UPDATE sans insertion. `delete(id)` reçu avant `create(id)` est oublié, puis l'ancienne création conserve un e-mail et un statut actif.

Enregistre une trace durable de suppression par identifiant Clerk même si la ligne `users` manque. Recommandation : petite table de traces terminales, clé unique sur l'identifiant, date fournisseur de l'événement si disponible et heure de réception séparée ; aucun e-mail ou profil dans cette trace. Vérifie l'enveloppe réelle de `verifyWebhook` installée pour la date d'événement et ne lui invente pas un champ.

Une suppression reçue et vérifiée reste terminale pour cet identifiant ; un compte recréé avec un nouvel identifiant est distinct. `syncClerkUser`, `ensureInternalUser` et la synchronisation des utilisateurs embarqués dans les sessions doivent consulter cette trace. Quand un événement ancien vise un identifiant supprimé, le webhook doit l'acquitter comme ignoré de façon contrôlée, sans boucle de retry ni création de profil. Une requête applicative visant une identité supprimée doit donner un refus cohérent, sans inventer un utilisateur actif pour satisfaire un type.

Une simple lecture de l'absence de trace suivie d'un INSERT est insuffisante sous concurrence. Sérialise création/mise à jour/suppression pour le même identifiant, par verrou transactionnel partagé ou mécanisme atomique équivalent. Un verrou sur `users` seulement ne protège pas un identifiant encore absent. L'ordre de verrouillage doit être identique sur tous les chemins, et aucune requête réseau ne doit garder un verrou SQL ouvert.

Lorsqu'un utilisateur existe, conserve l'effacement d'e-mail, l'état supprimé et la révocation des droits déjà réalisés. Ne permets pas à un événement de session actif ultérieur d'annuler la suppression. Tests : delete→create, create→delete, delete→session contenant un ancien profil, doublons, et les deux ordres de concurrence avec points de synchronisation déterministes. Le dernier état doit être supprimé ou absence protégée par la trace, avec aucun e-mail réintroduit.

**Migrations / BUG-403.** Le journal possède 20 migrations, jusqu'à `0019_followed_countries`, au départ. Génère la migration suivante à partir de l'état courant ; ne réutilise pas un numéro ni ne modifie les anciennes migrations ou leurs empreintes. La révision fournisseur nullable et la table terminale sont des changements additifs recommandés ; une alternative plus petite est recevable si elle traite réellement la provenance historique et la concurrence, sans fabriquer des dates d'essai.

Reçois les migrations d'abord dans les schémas temporaires via le runner. Toute application future sur `africa_live_dev` doit être précédée d'une sauvegarde locale vérifiée et ne modifier que le schéma requis. Les profils historiques ne sont pas réparés automatiquement. Avant un futur déploiement Railway avec migration : sauvegarde restaurable, `npm run db:migrate:deploy`, vérification du journal ; un rollback du code ne défait pas une migration. Documente aussi la compatibilité de l'ancien code avec les ajouts et l'ordre de publication.

**B17 / BUG-404, BUG-405, BUG-406 — retrait durable.** Fichiers : [API administrative](<C:/Users/GAMER PC/Africa_Live_TV/src/app/api/admin/contact-requests/[id]/route.ts>), [import](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/catalog-import.ts>), `support-request-contracts.ts`, `catalog-takedown.integration.test.ts`.

Une transition API valide `sources_disabled → in_review` fait disparaître la demande des protections de l'import ; l'import suivant remet la source active. Le bouton est masqué aujourd'hui, mais cette transition doit être refusée côté serveur. La reproduction de statut et d'import réels a enregistré `active=true` et `REACTIVATED_SOURCE`.

Commence par la correction minimale : une politique explicite de transitions administratives interdit le retour simple en revue d'une demande dont les sources ont été désactivées. Retourne une erreur 409 contrôlée ; transaction sans changement de statut, de source ni faux événement de traitement. Préserve une décision distincte et autorisée de levée de retrait si cette action existe, avec note et audit ; ne l'expose pas implicitement par le bouton de revue.

Reçois aussi l'invariant entre import et retrait concurrent. Les deux opérations doivent partager un ordre de sérialisation qui protège le calcul de suppression et l'écriture des sources ; une lecture du statut avant que l'autre transaction ne conclue ne suffit pas. Un verrou transactionnel commun aux publications de catalogue/retraits est une option simple, à acquérir avant leurs verrous de lignes. Mesure sa portée ; il ne doit pas couvrir le téléchargement de playlist.

Tests : transition interdite puis import → sources toujours inactives ; levée explicite reçue selon le contrat existant → requalification obligatoire et aucun statut sain fabriqué ; import/disable dans les deux ordres ; autre demande de retrait encore active sur la source → pas de réactivation ; absence de session ou rôle admin révoqué → refus existant. Ne touche pas au retrait public particulier de Canal+.

**6. L5 — Stockage facultatif et synchronisation par compte**

Fichiers communs : [clés](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/storage-keys.ts>), [coquille](<C:/Users/GAMER PC/Africa_Live_TV/src/components/shell/AppShell.tsx>), [layout connecté](<C:/Users/GAMER PC/Africa_Live_TV/src/app/(clerk)/app/layout.tsx>), [hooks TV](<C:/Users/GAMER PC/Africa_Live_TV/src/components/tv/hooks.ts>), [synchronisation des pays](<C:/Users/GAMER PC/Africa_Live_TV/src/components/shell/FollowedCountriesSync.tsx>), [favoris](<C:/Users/GAMER PC/Africa_Live_TV/src/components/tv/useFavorites.ts>).

**B08 / BUG-501, BUG-506, BUG-507 — couche de stockage qui peut échouer.** Le hook protège quelques lectures mais laisse `publish()` écrire dans une microtâche sans catch. Une `QuotaExceededError` produit une exception non gérée et peut empêcher le premier appel serveur. Le snapshot de notice VLC de la TV a aussi une lecture non protégée.

Créer un petit adaptateur de lecture/écriture/suppression JSON validé avec résultat explicite de persistance. Protège aussi l'accès à l'objet `window.localStorage`/`sessionStorage`, qui peut lui-même lever une erreur. État en mémoire et notification React doivent rester utilisables si la persistance échoue. Un simple catch qui laisse le snapshot relire toujours une ancienne valeur ne constitue pas un repli en mémoire effectif.

Applique-le aux chemins touchés de favoris, pays suivis, migration et notice VLC, sans réécrire arbitrairement toutes les préférences du produit. Distingue « choix conservé sur cet appareil » de « choix conservé pour cette page » dans les messages. Ne place pas des appels API derrière une écriture locale obligatoire.

Tests : getter de Storage refusé, `getItem`/`setItem`/`removeItem` qui lèvent, JSON invalide, quota plein, réussite API malgré absence de stockage, remontage et SSR/hydratation sans `window`. Aucune exception globale ni panne du catalogue, des boutons ou de la synchronisation en mémoire.

**B10 / BUG-501, BUG-502, BUG-506, BUG-507 — propriétaire explicite des préférences synchronisées.** Les clés communes ne disent pas à quel utilisateur appartiennent les intentions. Stockage A `[SN]` pending et compte B `[CI]` provoquent un PUT `[SN]` sous B.

Introduis un contexte minimal d'identité pour les préférences, provenant d'une identité de compte connue et stable ; les API continuent à utiliser l'identité serveur, jamais celle envoyée par le client pour autoriser. Inclure seulement le DTO d'identité nécessaire. En mode local validé, un propriétaire technique local distinct peut être utilisé ; il ne peut pas créer un accès de production.

Les listes canonique/cachée, intentions en attente et marqueurs de migration des **pays et favoris** doivent être indexés par propriétaire. Le transfert des favoris n'avait pas été reproduit séparément dans l'audit, mais il utilise la même file commune : le correctif partagé doit le prévenir et le recevoir. Les préférences réellement d'appareil, telles que Éco, ne doivent pas devenir des réglages de compte par accident.

Tant que l'identité est indéterminée, n'effectue aucune écriture de préférences au serveur. Sur A→déconnexion→B, invalide la génération des callbacks, interrompt/ignore les réponses anciennes, change de store et de file, et ne publie ni ne rejoue les intentions A sous B. Sépare les sérialisations par propriétaire. Un abort client ne garantit pas qu'un PUT déjà envoyé n'a pas conclu côté serveur : les tests doivent vérifier l'attribution réelle, pas seulement la présence du signal abort.

Les anciennes clés partagées n'ont **pas de propriétaire prouvable**. Ne les attribue pas automatiquement au premier compte trouvé. Conserve-les dans un espace de migration local, sans les effacer ni les envoyer aveuglément. Une reprise explicite de ces choix sur le compte courant peut être proposée, avec aperçu compréhensible et import dédupliqué ; ne montre pas d'identifiants techniques dans l'interface. Ce cas exceptionnel de migration n'est pas un nouveau dialogue à afficher à chaque connexion.

Tests : A pending puis B connecté, retour vers A, réponse de A après montage de B, deux onglets, identité en chargement, sortie/retour du mode local, anciennes clés sans propriétaire, et stockage indisponible. Aucun choix de A n'est modifié ou envoyé sous B. Les données inconnues restent récupérables, sans traverser automatiquement la frontière du compte.

**B09 / BUG-503, BUG-506, BUG-507 — compte canonique, suppressions durables et conflit de version.** Cause : fusion account+device à chaque montage. Compte `[CI]` et appareil ancien `[SN,CI]` font renaître SN via PUT `[CI,SN]`.

Après la migration reconnue, le compte est canonique : une ancienne copie d'appareil sans intention neuve ne doit pas produire un PUT. Enregistre une base canonique et des intentions de modification du propriétaire, par exemple ajouter/retirer un code avec état désiré et choisir le pays principal. N'envoie pas simplement toute une ancienne liste comme vérité ; une intention idempotente est préférable à un toggle rejoué deux fois.

Pour éviter qu'une file hors connexion écrase des modifications récentes d'un autre appareil, ajoute une précondition de version au contrat. Une option sans nouvelle table est une version opaque calculée sur la liste canonique ordonnée : GET `{countries, version}`, PUT `{countries, baseVersion}`. Le serveur verrouille l'utilisateur comme aujourd'hui, relit la liste courante et compare la version **dans la transaction**, avant de remplacer. Retourne un conflit contrôlé avec l'état canonique à jour si elle diffère. La version est un mécanisme de concurrence, pas une autorisation.

Sur conflit, le client rebase ses seules intentions encore actives sur la liste nouvelle puis réessaie dans un budget limité. Une suppression récente d'un autre appareil, non visée par une nouvelle intention locale, reste supprimée. N'essaie pas de contourner la limite de cinq pays : un ajout devenu impossible doit produire une issue explicite et résoudre ou conserver l'intention sans boucle infinie. Maintiens l'ordre et le pays principal.

Mets à jour les schémas, réponses, fixtures et tous les consommateurs. Prévois les onglets anciens pendant une future publication : absence de version → réponse contrôlée invitant à recharger, sans remplacement inconditionnel qui réintroduit le bug. Les données en attente restent conservées. Un déploiement atomique client/serveur et ce contrat doivent être décrits dans le dossier.

Tests : suppression sur A puis ouverture d'un B obsolète ; aucun PUT avec un cache seul ; ajout/retour hors ligne ; conflit de baseVersion ; rebase de retrait/ajout/principal ; limite de cinq sous concurrence ; liste vide qui retire tout ; lecture sur appareil neuf ; relance après remontage sans ancienne intention réintroduite.

**B11 / BUG-504, BUG-507 — échéance de quota séparée du refus d'accès.** `blocked=true` est aujourd'hui définitif pour 429, au même titre que 401/403 ; le premier GET 429 avec `Retry-After:1` a empêché tout nouvel appel après 90 secondes simulées et retour en ligne.

Distingue refus d'identité/droits et échéance de débit. Analyse `Retry-After` en secondes et date HTTP, avec valeur de repli bornée si absent/invalide. Conserve l'échéance à travers les remontages de l'opération pour le même propriétaire, sans transmettre le quota de A à B. Ne requête pas avant l'échéance ; ensuite, planifie une reprise de la synchronisation pendante ou autorise un retry/online/changement explicitement reçu.

Une nouvelle intention pendant le quota ne doit pas repousser indéfiniment l'échéance de reprise. Pas de retry pendant un vrai 401/403 sans rétablissement d'identité/droits. Reste prudent après plusieurs 429 : respect de chaque nouvelle échéance, budget et message contrôlés, sans rafale de requêtes.

Tests : secondes/date/absence/valeur invalide, zéro appel avant échéance, reprise après, 429 en GET et en PUT, remontage, changement de propriétaire, 401/403 conservés, callbacks tardifs et nettoyage des timers.

**B07 / BUG-505, BUG-507 — envoi par lots des favoris.** [Mutation](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/api-contracts.ts:163>) : 100 ajouts et 100 retraits maximum. Le hook envoie tout ; 101 ajouts sont refusés et restent bloqués.

Expose la limite commune depuis un module de contrat léger utilisé par la validation et le client. Valide/déduplique les intentions avant l'envoi, mais **ne tronque pas la file à 100**. Construis des lots de taille autorisée et sérialise-les pour le propriétaire courant. Prends un instantané de révisions pour chaque lot ; acquitte seulement les intentions réellement envoyées et non remplacées depuis. Un clic intervenu pendant l'envoi doit rester dans le lot suivant ou annuler correctement l'ancien souhait.

Si le lot 1 réussit et le lot 2 échoue, conserve les intentions du lot 2 et les suivantes, sans rejouer aveuglément les intentions déjà reçues. Utilise la réponse canonique du serveur pour publier le résultat plus les intentions neuves. L'absence de Storage ne doit pas empêcher ce calcul. Conserve la limite serveur et les quotas ; pas de Promise.all sur 50 lots, ni de boucle qui ignore 429.

Tests : 0/100/101/250 ajouts, 101 retraits, mélange des deux, doublons, échec du deuxième lot, clic inversé sur un favori pendant le premier lot, identifiant invalide isolé, remontage, serveur qui filtre une chaîne inconnue et changement de compte au milieu de la série. Plus de 100 intentions valides peuvent toutes être reçues, sans perte ni mélange entre propriétaires.

**7. L6 — Radar, géolocalisation et parsing RSS/Atom**

**B13 / BUG-601, BUG-606 — ordonner les réponses RSS.** [Hook de données](<C:/Users/GAMER PC/Africa_Live_TV/src/components/radar/useRadarData.ts>). Deux chargements périodiques partagent un contrôleur ; `New` est remplacé par `Old` lorsque la première requête finit après la seconde.

Donne un identifiant/génération à chaque chargement et n'applique que le résultat courant, y compris erreurs et `finally`. Réutilise la logique existante de requête récente si son contrat convient, avec un contrôleur par demande et un délai qui couvre lecture du corps. Le déclenchement périodique ne doit pas créer une accumulation de demandes ; tu peux ignorer un tick pendant un chargement ou annuler/remplacer la demande, avec un comportement manuel explicitement reçu.

Le rafraîchissement manuel invalide aussi l'ancien résultat. Le marqueur `refreshing` ne s'arrête pas sur le `finally` d'une demande dépassée. Les dates de collecte/fraîcheur proviennent du snapshot reçu et de la fenêtre, sans rajeunir les articles anciens. Conserve le rafraîchissement doux qui ne décale pas le fil tant que les nouvelles dépêches n'ont pas été libérées.

Tests : les deux ordres de réponses ; succès nouveau puis erreur ancienne ; timeout du corps ; tick pendant chargement ; refresh manuel ; démontage/retour ; refus 401/403/429 sans contournement ni appels fournisseur directs. Si tu corriges le même motif dans le résumé des chaînes, le recevoir séparément, sans compter un nouveau bug déjà démontré.

**B14 / BUG-602, BUG-606 — rattacher erreurs et résultats de chaînes au pays.** Fichiers : le hook ci-dessus, [hook du lecteur Radar](<C:/Users/GAMER PC/Africa_Live_TV/src/components/radar/useRadarPlayer.ts>) et `LiveRadarDashboard.tsx`.

Après une erreur SN, une demande CI voit encore `playlistError` de SN au premier rendu ; elle est annulée avant que l'effet de changement de pays ne nettoie cet état. La chaîne CI est ensuite chargée mais jamais ouverte.

Représente une ressource de pays avec sa clé, génération, état et erreur ; ou ajoute une clé d'erreur équivalente qui ne disparaît pas simplement parce que la liste est vide. Le hook de lecture ne réagit qu'aux résultats/erreurs appartenant au pays `wanted` et à sa demande courante. Un résultat SN après sélection CI, ou après abandon de la demande, ne peut lancer une chaîne.

Un effacement dans un effet uniquement ne suffit pas : le rendu qui change de pays doit déjà considérer les anciennes données comme non applicables. Conserve l'annulation volontaire quand l'utilisateur choisit un autre pays et le choix par `pickLiveChannel`.

Tests : SN échoue puis CI réussit et lance ; CI échoue réellement et affiche son erreur ; ancien succès/échec après changement ; liste CI vide ; multiples changements ; utilisateur abandonne avant réponse ; réception du dock et sélection mise en avant cohérentes.

**B18 / BUG-603, BUG-606 — pays spécifiques avant homonymes.** [Détecteur RSS](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/rss-collector.ts:291>). La première entrée de la table gagne : Guinée-Bissau et Guinée équatoriale → GN, Soudan du Sud → SD, Côte d’Ivoire à apostrophe courbe → null.

Normalise accents, espaces, apostrophes droites/courbes et variantes de tiret de façon cohérente entre texte et alias. Cherche des expressions spécifiques avant les termes génériques, avec limites de mots explicites ; évite de classer Nigeria comme Niger ou une sous-chaîne d'un autre mot. Définis un ordre déterministe et documenté pour une dépêche qui parle réellement de plusieurs pays : le DTO n'en représente qu'un aujourd'hui, ne refonds pas cette limitation en réseau de pays.

Conserve le `defaultCountry` de la rédaction comme repli lorsque le sujet n'est pas identifiable et la distinction `countryBasis=media/inferred_topic`. Teste les quatre reproductions, versions sans accents/tirets alternatifs, vrais GN/SD, Nigeria/Niger, absence de correspondance, repli rédaction et ambiguïtés multi-pays. Ne remplace pas les alias par des personnalités ajoutées arbitrairement ; ne change pas le périmètre Afrique/International.

**B19 / BUG-604, BUG-606 — choisir le lien humain Atom.** [Extraction de lien](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/rss-collector.ts:350>). `rel=self` avant `rel=alternate type=text/html` fait retenir `/api/entry`.

Analyse les liens d'une entrée, puis choisis un lien alternate destiné à la lecture HTML, ou sans rel conformément au contrat Atom reçu. N'utilise pas un lien self, enclosure, edit ou replies comme substitut d'article. Traite l'ordre des attributs, les entités, URI relatives et `xml:base` si supporté ; documente une absence de support au lieu d'inventer une base. L'URL retenue doit continuer à passer la validation HTTP(S), sans identifiants, puis la canonicalisation utilisée pour l'identité et la déduplication.

Tests : self avant/après alternate ; rel absent ; alternate HTML/XHTML et liens techniques mélangés ; attributs réordonnés ; URL relative avec base ; aucun lien humain ; javascript/file/identifiants rejetés ; les flux RSS existants restent identiques. Aucun nouveau parseur XML lourd n'est requis par principe : utiliser une politique testable adaptée au parseur présent, ou justifier une dépendance si elle devient nécessaire.

**B20 / BUG-605, BUG-606 — points Unicode valides.** [Décodeur](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/rss-collector.ts:308>). `String.fromCharCode` tronque les entités au-delà de U+FFFF : `&#128680;` devient U+F6A8 au lieu de 🚨.

Utilise `String.fromCodePoint` après validation d'un entier dans l'intervalle Unicode autorisé, exclusion des surrogates isolés et politique explicite pour zéro/valeurs invalides. Décimal et hexadécimal ont le même comportement. Conserve le nettoyage du HTML et le rendu React échappé : le décodage de `&lt;script&gt;` ne doit jamais devenir un `dangerouslySetInnerHTML`. Ne fais pas d'une séquence encodée deux fois un lien exécutable en multipliant des passes de décodage.

Tests : émoji décimal/hexadécimal, accents BMP, plusieurs entités, limite U+10FFFF, surrogates, trop grand/invalide, CDATA, balises encodées affichées comme texte et absence d'injection. Vérifie la limite de longueur des titres sans couper une paire de surrogates si le chemin modifié la touche.

**8. Réception de chaque lot et réception finale**

Un ticket n'est « Vérifié localement » que si le scénario d'échec d'origine ne se produit plus, le scénario positif existe, les régressions pertinentes passent, les limites sont écrites et les changements ont été revus. Le statut d'une réception physique ou distante ne se déduit jamais d'un mock. Ne marque pas « Clos » parce que le code compile.

| Lot | Contrôles ciblés nécessaires |
| --- | --- |
| L1 | politiques paiement/accès, intégrations NabooPay/refund/concurrence, E2E payment sans achat réel |
| L2 | politiques machine/erreurs, lecteurs réel hls.js/natif selon moteur, dock/zapping/Éco, E2E mobile-vlc existants |
| L3 | sondes réseau simulées, limites/annulations/SSRF, positives média, politique et persistance isolées |
| L4 | migrations, identité et suppression concurrentes, API retrait réelle avec dépendances de test, imports isolés, gardes admin |
| L5 | stockage refusé, codec propriétaire/migration, lots et révisions, conflits multi-appareils, E2E followed-countries/favorites |
| L6 | tests parsing/country, hooks retardés, E2E Radar et dock, absence de réponse dépassée appliquée |

Les intégrations écrivent uniquement dans un schéma `africa_live_test_<32 caractères hexadécimaux>` créé et supprimé par le runner dans `africa_live_dev`. Utilise `assertIntegrationTarget` dans chaque nouveau test qui écrit. Ne lance pas un `.integration.test.ts` isolé avec des flags manuels qui le feraient viser le schéma public. Les tests ne doivent pas supprimer une table, un compte ou un quota dont ils n'ont pas créé l'identifiant. Les nouveaux tests sont intégrés à la découverte existante `src/lib/*.test.ts` et `*.integration.test.ts`.

La réception finale BUG-901 comprend :

```text
npm test
npm run test:integration
npm run test:invariants
npx tsc --noEmit --incremental false
npm run lint
npm run db:check:migrations
npm run build
npm audit --omit=dev
```

Ajoute la vérification de dérive du schéma dans l'environnement local au bon moment, si une migration a été appliquée. Contrôle les commandes que tu exécutes : certaines commandes d'exploitation importent ou requalifient effectivement le catalogue. Ne lance pas un worker de production pour « tester » une fonction pure.

E2E de build local : `auth-entry` et `payment` avec serveur de build sur 3001, `DEPLOYMENT_ENV=local`, MVP désactivé et requêtes de paiement interceptées. E2E des interfaces protégées : profils/fixtures contrôlés selon le handoff et CI, ou banc de composants clairement identifié. Vérifie les modes réels : le MVP redirige `/pricing`, le mode anonyme CI ne reçoit pas les handlers Clerk connectés, et un user-agent iPhone ne devient pas un véritable Safari iOS.

Une compilation et un serveur dev qui utilisent simultanément le même `.next` peuvent se perturber. Repère le serveur et son checkout avant de l'arrêter ; sauvegarde son mode et le rétablis après tes propres tests, sans toucher à un serveur non détenu. Le port 3001 ne doit pas être réutilisé depuis un autre projet. Ne réécris pas les captures existantes du propriétaire pour prouver ta correction.

Crée un dossier `docs/validation-correctifs-bugs-2026-10-09.md` au démarrage de l'implémentation, avec journal de lots, fichiers, tests et commandes, durées/budgets retenus, décisions de schéma/API, empreintes préservées, scénarios non reçus et erreurs restantes. Les données sensibles et journaux bruts restent hors Git et sont expurgés avant toute sortie. Mettre à jour le backlog et le handoff suffit pour poursuivre sans recommencer les lots déjà reçus.

BUG-903 distingue la réception humaine : CNews/iPhone réel et relance VLC, Android, Safari natif Éco, popup dans les navigateurs usuels, changement de compte et essai/remboursement vus sur profils de test autorisés. L'accès à de vrais comptes ou un paiement réel ne doit pas être improvisé. Si un profil/appareil manque, documente la limite et poursuis les corrections et tests indépendants ; ne désactive pas les gardes pour simuler une réception réelle.

BUG-904 est une préparation **conditionnelle**, pas un ordre de publier : revue du diff final, sauvegarde restaurable si schéma changé, compatibilité des anciens onglets et migrations, restauration possible, liste des contrôles sur staging et sources à recontrôler. Rien de cela n'autorise aujourd'hui un commit, push, déploiement, requalification massive, modification de droits historiques ou activation des paiements. À la réception locale, rapporte ce qui est corrigé, vérifié, encore limité et publiable après demande distincte.

**9. Correspondance exhaustive et définition de fin**

| Défaut | Tickets de correction et réception |
| --- | --- |
| B01 | BUG-101, BUG-102, BUG-104 |
| A1 — décision confirmée | BUG-103, BUG-104 |
| B02 | BUG-201, BUG-204 |
| B03 | BUG-301, BUG-302, BUG-305, BUG-306 |
| B04 | BUG-301, BUG-303, BUG-305, BUG-306 |
| B05 | BUG-301, BUG-304, BUG-305, BUG-306 |
| B06 | BUG-202, BUG-204 |
| B07 | BUG-505, BUG-507 |
| B08 | BUG-501, BUG-506, BUG-507 |
| B09 | BUG-502, BUG-503, BUG-506, BUG-507 |
| B10 | BUG-501, BUG-502, BUG-506, BUG-507 |
| B11 | BUG-504, BUG-507 |
| B12 | BUG-203, BUG-204 |
| B13 | BUG-601, BUG-606 |
| B14 | BUG-602, BUG-606 |
| B15 | BUG-401, BUG-403, BUG-406 |
| B16 | BUG-402, BUG-403, BUG-406 |
| B17 | BUG-404, BUG-405, BUG-406 |
| B18 | BUG-603, BUG-606 |
| B19 | BUG-604, BUG-606 |
| B20 | BUG-605, BUG-606 |

La remédiation locale est terminée lorsque les 21 lignes disposent de leurs preuves de correction, que BUG-901 et BUG-902 sont reçus, qu'aucune donnée historique n'a été altérée par les tests et que les réserves BUG-903/BUG-904 sont clairement séparées. Les réceptions réelles ouvertes et l'absence de publication ne doivent pas être présentées comme un échec de code, ni comme une réception obtenue. Une découverte nouvelle pendant l'implémentation reçoit un ticket séparé, un scénario et un impact ; elle ne doit pas changer silencieusement ce total ou faire disparaître un bug non corrigé.
