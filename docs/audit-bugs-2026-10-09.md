**Africa Live — audit approfondi des bugs, 9 octobre 2026**

L'audit identifie **20 bugs reproduits**, dont **2 P1, 16 P2 et 2 P3**, ainsi qu'une incohérence de droits après remboursement à arbitrer. Les contrôles existants réussissent : ces défauts concernent principalement des transitions, des entrées particulières et des situations de réseau ou de synchronisation absentes de leur couverture.

Il ne s'agit pas d'une garantie que tous les bugs du projet ont été trouvés. La revue porte sur le code actuel, les parcours principaux et leurs cas limites. Aucun constat ancien du 4 octobre n'est reconduit simplement parce qu'il figurait dans le précédent audit.

Révision examinée : `e4ff28f`. Inventaire : 391 fichiers TypeScript/TSX sous `src`, dont 305 fichiers d'implémentation et 86 fichiers de tests. Le travail préexistant dans `contextellm.md`, les notes VLC et les documents de suivi a été conservé. Aucun code applicatif n'a été corrigé, aucun commit, push ou déploiement effectué. Le projet source IPTV et les fichiers `.env*` n'ont pas été modifiés.

Les parcours examinés comprennent les accès et droits, Clerk, NabooPay, la résolution de lecture, le lecteur HLS/VLC, le catalogue, les favoris et pays suivis, le Radar/RSS/météo/marchés, les retraits de sources, les vérifications de flux, les caches, les tâches de fond et les configurations de build/CI. Certains modules historiques du Radar sont exposés par API mais absents de l'interface actuelle ; leur présence ne signifie pas qu'ils ont été reçus en conditions réelles.

P1 désigne ici un blocage important à traiter avant de considérer le parcours fiable, notamment avant l'ouverture des paiements ou le lancement de production. P2 désigne un défaut fonctionnel ou de résilience. P3 désigne un défaut secondaire ou un chemin actuellement peu exposé.

| ID | Priorité | Bug confirmé | Preuve principale |
| --- | --- | --- | --- |
| B01 | P1 | Une ancienne commande terminée empêche une nouvelle tentative ou un renouvellement | Composant réel, trois statuts terminaux simulés |
| B02 | P1 | Une erreur fatale de manifeste laisse le lecteur bloqué indéfiniment | Composant réel et véritable hls.js |
| B03 | P2 | Un flux HTTPS avec des segments HTTP est déclaré compatible navigateur | Vérificateur réel, fournisseur simulé |
| B04 | P2 | Un segment JSON est accepté comme vidéo saine | Vérificateur réel, fournisseur simulé |
| B05 | P2 | Une clé de déchiffrement inaccessible n'empêche pas une validation positive | Vérificateur réel, fournisseur simulé |
| B06 | P2 | Le mode Éco télécharge le média natif avant « Lire maintenant » | Composant réel, MP4 synthétique existant |
| B07 | P2 | 101 favoris en attente bloquent toute la synchronisation | Hook réel et contrat serveur |
| B08 | P2 | Un stockage navigateur indisponible provoque une exception non gérée | Hook réel, `QuotaExceededError` simulée |
| B09 | P2 | Un pays supprimé du compte est réajouté depuis un appareil ancien | Composant réel |
| B10 | P2 | Des modifications de pays en attente peuvent écraser celles d'un autre compte | Composant réel, stockage d'un compte précédent |
| B11 | P2 | Une réponse 429 bloque définitivement la synchronisation des pays jusqu'au remontage | Composant réel, horloge contrôlée |
| B12 | P2 | Une fenêtre séparée bloquée ferme malgré tout le lecteur intégré | Composant réel |
| B13 | P2 | Une réponse RSS ancienne peut remplacer un rafraîchissement plus récent | Hooks réels, réponses livrées dans le désordre |
| B14 | P2 | Une erreur du pays précédent annule le lancement du nouveau pays | Hooks réels |
| B15 | P2 | La première synchronisation Clerk peut rendre des événements valides artificiellement anciens | Fonction réelle, PostgreSQL isolé |
| B16 | P2 | Une suppression Clerk reçue avant la création peut être oubliée | Fonctions réelles, PostgreSQL isolé |
| B17 | P2 | Remettre un retrait en revue permet à l'import de réactiver les sources | Import réel, PostgreSQL isolé, transition de l'API |
| B18 | P2 | Plusieurs pays sont mal attribués aux dépêches | Détecteur réel, quatre titres |
| B19 | P3 | Un flux Atom peut ouvrir son URL technique au lieu de l'article | Parseur réel |
| B20 | P3 | Les entités XML au-delà de U+FFFF corrompent les titres | Décodeur réel |

**B01 — Ancienne commande réutilisée après sa fin.** [Page des tarifs](<C:/Users/GAMER PC/Africa_Live_TV/src/app/(clerk)/pricing/page.tsx:29>), [retour d'une commande existante](<C:/Users/GAMER PC/Africa_Live_TV/src/app/api/checkout/naboopay/route.ts:49>).

La page conserve une clé par forfait dans `sessionStorage`. Elle ne la retire pour `failed` ou `canceled` que si `checkout_url` est absente, et ne la retire jamais pour `completed`. Or une commande créée garde normalement son URL après un échec, une annulation ou un paiement réussi. Revenir aux tarifs dans le même onglet réutilise donc la commande précédente ; le serveur renvoie son ancienne URL au lieu de créer une nouvelle commande.

Reproduction : deux clics successifs sur le mensuel, avec des réponses `completed`, puis séparément `canceled` et `failed`, contenant une URL. Dans chacun des trois cas, les deux requêtes utilisent exactement la même clé. Les navigations vers NabooPay ont été interceptées ; aucun paiement réel. Impact : nouvelle tentative ou renouvellement bloqué tant que cette clé persiste. Correction attendue : distinguer les tentatives incertaines, dont la clé doit rester, des commandes terminées ; traiter le statut avant de suivre l'URL et renouveler la clé après une issue terminale.

**B02 — Attente infinie après échec du manifeste.** [Gestion HLS](<C:/Users/GAMER PC/Africa_Live_TV/src/components/player/useMediaLifecycle.ts:70>), [délai limité au mode local](<C:/Users/GAMER PC/Africa_Live_TV/src/components/player/useMediaLifecycle.ts:33>).

Sur une erreur réseau fatale, le lecteur appelle `hls.startLoad()` puis sort du gestionnaire. Une erreur de chargement du manifeste nécessite de relancer ce chargement ou de conclure la tentative : `startLoad()` ne produit pas ici une nouvelle requête de manifeste. Le délai de préparation est, lui, réservé au mode local. Le build de staging/production peut donc rester dans `loading` sans atteindre le secours ou un état d'erreur.

Reproduction avec le vrai hls.js installé, mode local désactivé et manifeste 404 : une seule résolution, une seule requête de manifeste, événement fatal `manifestLoadError`, toujours « Veuillez patienter » après 60 secondes d'horloge contrôlée. Correction attendue : différencier la reprise d'un manifeste de celle des segments et borner la préparation dans tous les environnements, sans modifier l'éligibilité serveur.

**B03 — Contenu mixte non détecté dans les ressources HLS.** [Calcul du contenu mixte](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/stream-verification.ts:365>).

Le vérificateur calcule `mixedContent` à partir de l'URL initiale uniquement. Il ne tient pas compte des URL finales après redirection ni des protocoles des variantes ou segments. Un manifeste HTTPS qui référence un segment HTTP, avec CORS autorisé, est enregistré `BROWSER_OK`, `mixedContent=false`. La politique de résolution accepte ensuite cette source alors que le navigateur d'un site HTTPS ne peut pas charger ce segment HTTP dans hls.js.

Reproduction : manifeste HTTPS, segment HTTP ; le vérificateur renvoie `available=true`, `BROWSER_OK`, et la politique de lecture accepte le résultat. Correction attendue : agréger les protocoles effectifs de toute la chaîne de ressources contrôlée, y compris les redirections.

**B04 — Un corps JSON est considéré comme un segment vidéo.** [Contrôle du segment](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/stream-verification.ts:344>).

Après le manifeste, le vérificateur accepte toute réponse de segment réussie qui n'annonce pas `text/html`. Il annule le corps sans vérifier qu'il contient du média. Une réponse 200 `application/json` contenant un message d'indisponibilité est donc considérée saine et compatible navigateur.

Reproduction : segment `{"error":"stream unavailable"}`, statut 200 et CORS `*` ; résultat `available=true`, `BROWSER_OK`. Impact : des sources inutilisables peuvent être promues saines et visibles. Correction attendue : contrôler un petit échantillon borné et le type du segment, sans téléchargement complet ni stockage de média, et distinguer un contrôle HTTP d'une preuve de lecture.

**B05 — Clé HLS requise jamais vérifiée.** [Sélection des ressources HLS](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/stream-verification.ts:195>).

Les lignes de manifeste commençant par `#` sont ignorées pour sélectionner les ressources à vérifier. Une déclaration `EXT-X-KEY` AES-128 est donc ignorée. Un segment peut répondre 200 tandis que la clé requise répond 403 ; le lecteur ne peut alors pas déchiffrer le flux, mais le contrôle annonce une source saine.

Reproduction : manifeste avec `URI="key.bin"`, fournisseur simulé qui refuse cette clé. Le vérificateur demande seulement le manifeste et le segment, jamais la clé, et renvoie `BROWSER_OK`. Correction attendue : vérifier les ressources indispensables au décodage, leurs accès, leurs protocoles et leur CORS. Les ressources d'initialisation `EXT-X-MAP` sont également absentes de la sélection actuelle, mais n'ont pas fait l'objet d'une reproduction distincte dans cet audit.

**B06 — Éco data charge le média natif avant le clic.** [Branche native](<C:/Users/GAMER PC/Africa_Live_TV/src/components/player/useMediaLifecycle.ts:155>), [élément vidéo](<C:/Users/GAMER PC/Africa_Live_TV/src/components/Player.tsx:803>).

L'économie de chargement repose sur `autoStartLoad:false` pour hls.js. La branche MP4/HLS natif affecte immédiatement `video.src` et appelle `load()`, même en mode Éco. Le navigateur peut donc télécharger du média pour préparer les métadonnées avant « Lire maintenant ».

Reproduction : `al_eco=true`, MP4 synthétique existant ; une requête média est effectuée avant tout clic, la fixture de 37 696 octets est renvoyée, la vidéo est toujours en pause et son `preload` effectif vaut `metadata`. Ceci ne mesure pas un téléchargement complet de tous les gros fichiers réels. Correction attendue : définir une préparation native compatible avec la promesse Éco et différer le chargement média jusqu'au geste de lecture.

**B07 — Trop de favoris en attente rendent la file impossible à envoyer.** [Construction de la mutation](<C:/Users/GAMER PC/Africa_Live_TV/src/components/tv/useFavorites.ts:40>), [limite du contrat](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/api-contracts.ts:165>).

Le client envoie toutes ses intentions dans une seule mutation ; le serveur accepte au plus 100 ajouts et 100 retraits par requête. Une ancienne liste migrée ou une file hors connexion de 101 ajouts est systématiquement refusée. Un nouvel essai renvoie la même file trop grande.

Reproduction : 101 intentions locales ; une mutation de 101 éléments est envoyée, HTTP 400, les 101 intentions restent en attente. Correction attendue : fractionner selon les limites du contrat et n'acquitter que les intentions du lot réussi.

**B08 — Exception non gérée lorsque le stockage est indisponible.** [Publication des favoris](<C:/Users/GAMER PC/Africa_Live_TV/src/components/tv/useFavorites.ts:23>), [initialisation](<C:/Users/GAMER PC/Africa_Live_TV/src/components/tv/useFavorites.ts:61>).

Les lectures initiales sont en partie protégées, mais `publish()` écrit dans `localStorage` sans protection. Cette fonction est appelée depuis une microtâche d'initialisation et depuis le clic sur un favori. Une exception de quota ou de permission interrompt le traitement et peut empêcher le lancement de la synchronisation serveur.

Reproduction : `Storage.setItem` lève `QuotaExceededError` ; le navigateur remonte l'exception non gérée « Storage unavailable ». La page TV possède aussi une lecture non protégée de la notice VLC dans son snapshot : [page TV](<C:/Users/GAMER PC/Africa_Live_TV/src/app/(clerk)/app/page.tsx:41>). Correction attendue : rendre la persistance facultative et conserver un état en mémoire utilisable, sans laisser une exception de stockage interrompre la page.

**B09 — Une suppression de pays est ressuscitée par un autre appareil.** [Fusion au démarrage](<C:/Users/GAMER PC/Africa_Live_TV/src/components/shell/FollowedCountriesSync.tsx:44>).

À chaque montage, sans intention locale en attente, le composant fusionne la liste du compte avec celle de l'appareil. Il ne distingue pas une première migration d'une ancienne copie déjà synchronisée. Après suppression d'un pays sur un appareil, un autre appareil possédant l'ancienne liste le renvoie au compte.

Reproduction : compte `[CI]`, appareil ancien `[SN,CI]` ; un PUT `[CI,SN]` est effectué automatiquement. Correction attendue : limiter la fusion à une migration explicite, puis adopter un mécanisme qui conserve les suppressions et la version de synchronisation.

**B10 — Intentions locales transférées à un autre compte.** [Lecture des intentions de pays](<C:/Users/GAMER PC/Africa_Live_TV/src/components/shell/FollowedCountriesSync.tsx:43>), [clés communes](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/storage-keys.ts:10>).

Le stockage des pays et son indicateur `pending` ne portent aucune identité de compte. Après une modification hors connexion sous A puis une connexion sous B sur le même navigateur, `pending=true` force l'envoi de la liste de A au compte B, en remplacement de sa liste canonique.

Reproduction : compte B `[CI]`, stockage en attente de A `[SN]` ; le composant envoie PUT `[SN]`. Il s'agit d'une corruption de préférences, pas d'un contournement de l'authentification serveur : le PUT est correctement attribué au compte connecté. La file des favoris utilise également des clés sans identité ; son transfert entre deux comptes n'a pas été reproduit séparément. Correction attendue : rattacher les intentions synchronisées au compte propriétaire et gérer explicitement le changement de compte.

**B11 — Un 429 rend la synchronisation des pays définitivement inactive.** [Blocage des réponses](<C:/Users/GAMER PC/Africa_Live_TV/src/components/shell/FollowedCountriesSync.tsx:58>).

Le code classe 429 avec 401 et 403 dans un blocage permanent. Dès lors, ni une modification de pays ni l'événement `online` ne planifient un nouvel essai. L'expiration du quota et `Retry-After` ne sont pas utilisés.

Reproduction : premier GET 429 avec `Retry-After:1`, attente simulée de 90 secondes, changement de pays et retour en ligne ; toujours un seul GET et aucun PUT. Le choix reste en attente jusqu'au remontage du composant. Correction attendue : représenter une échéance de quota, distincte d'un refus d'accès, puis autoriser la reprise après cette échéance.

**B12 — Popup bloquée : le lecteur intégré est fermé quand même.** [Ouverture générique du dock](<C:/Users/GAMER PC/Africa_Live_TV/src/components/player/PlayerDock.tsx:103>).

Le chemin générique, utilisé lorsque le dock a oublié le rappel de sa page d'origine, ignore le résultat de `launchPlayer()` puis appelle toujours `onClose()`. Un navigateur qui bloque la nouvelle fenêtre provoque donc la fermeture du lecteur existant sans nouvelle fenêtre et sans explication.

Reproduction : vrai dock, `window.open()` renvoie `null`, clic « Ouvrir dans une fenêtre séparée » ; plus aucun dialogue ni mini-lecteur. Correction attendue : garder le lecteur ouvert lorsque le lancement est bloqué et annoncer le refus. Le parcours de la TV possédant encore son rappel sait déjà afficher un état `blocked` ; ce constat vise le chemin générique.

**B13 — Réponses RSS appliquées dans le désordre.** [Chargement RSS](<C:/Users/GAMER PC/Africa_Live_TV/src/components/radar/useRadarData.ts:46>), [rafraîchissement périodique](<C:/Users/GAMER PC/Africa_Live_TV/src/components/radar/useRadarData.ts:68>).

Toutes les requêtes périodiques d'un montage partagent un contrôleur et le même booléen `active`, sans numéro de requête ni exclusion mutuelle. Si une requête lente reste en attente pendant le rafraîchissement suivant, sa réponse peut remplacer celle, plus récente, déjà affichée. L'indicateur d'actualisation peut aussi être arrêté alors qu'une autre demande est encore en cours.

Reproduction : première requête retenue, invocation du callback réel de l'intervalle pour lancer la seconde ; celle-ci affiche `New`, puis la première est libérée et remplace le fil par `Old`. Aucun délai de cinq minutes réel n'était nécessaire pour reproduire l'ordre d'arrivée. Correction attendue : empêcher le chevauchement ou n'accepter que la dernière demande, et borner les délais réseau du client.

**B14 — L'erreur du pays précédent annule une nouvelle demande de lecture.** [Choix du pays à lancer](<C:/Users/GAMER PC/Africa_Live_TV/src/components/radar/useRadarPlayer.ts:41>).

Au changement de pays, le hook du lecteur regarde `playlistError` avant de vérifier à quel pays elle appartient. L'effet qui efface les données du pays précédent n'a pas encore tourné lors de ce rendu. L'erreur de A fait donc échouer immédiatement la demande de B, qui est oubliée même si B se charge ensuite correctement.

Reproduction avec les deux hooks réels : Sénégal 500, demande de lecture de Côte d'Ivoire, réponse CI réussie avec une chaîne prête ; `countryChannelsCountry=CI`, mais le lecteur reste vide et `failedCountry=CI`. Correction attendue : rattacher chaque erreur à son pays ou invalider l'ancien résultat dès le rendu qui change de pays.

**B15 — Les horloges locale et fournisseur sont mélangées dans la synchronisation Clerk.** [Valeur par défaut](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/identity.ts:53>), [garde chronologique](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/identity.ts:80>), [première création depuis Clerk](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/identity.ts:99>).

`ensureInternalUser()` transmet `createdAt` mais pas `clerkUser.updatedAt`. La synchronisation utilise donc l'heure locale de traitement comme `clerkSyncedAt`. Les webhooks emploient en revanche `data.updated_at`. Un événement fournisseur plus récent que le profil lu, mais antérieur à l'heure locale d'enregistrement, est rejeté comme ancien.

Reproduction PostgreSQL : création comme le chemin de repli, puis mise à jour fournisseur avec un nouvel e-mail et un état bloqué, datée après le profil initial mais avant la synchronisation locale. L'utilisateur reste `active` et garde l'ancien e-mail. Ce test ne prouve pas un accès avec une véritable session Clerk bannie : aucun contournement de Clerk n'est revendiqué. Correction attendue : comparer des révisions provenant de la même horloge et conserver séparément l'heure du traitement.

**B16 — Suppression Clerk avant création : réapparition d'une identité supprimée.** [Traitement de la suppression](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/identity.ts:107>), [webhooks](<C:/Users/GAMER PC/Africa_Live_TV/src/app/api/webhooks/clerk/route.ts:50>).

La suppression ne fait qu'un UPDATE d'une ligne existante. Si aucune ligne n'existe encore, elle n'enregistre rien. Une ancienne création livrée ensuite peut insérer un utilisateur actif et son e-mail, alors que sa suppression avait déjà été reçue.

Reproduction PostgreSQL : `markClerkUserDeleted(id)` avant `syncClerkUser()` d'un événement antérieur ; ligne finale `active`, e-mail conservé. Impact : état interne et effacement incohérents. Ceci ne recrée pas un compte dans Clerk et ne constitue pas une preuve de connexion possible à ce compte. Correction attendue : conserver une trace terminale de suppression et empêcher les événements antérieurs de la remplacer.

**B17 — Un retrait remis en revue n'est plus protégé contre l'import.** [Transition administrative](<C:/Users/GAMER PC/Africa_Live_TV/src/app/api/admin/contact-requests/[id]/route.ts:31>), [sélection des retraits](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/catalog-import.ts:392>).

L'API autorise `sources_disabled → in_review` sans lever explicitement le retrait. Le prochain import ne protège que les demandes encore `sources_disabled`, et réactive donc les sources couvertes par cette demande. Un changement de suivi administratif annule indirectement un retrait lors de l'import suivant.

Reproduction : demande `sources_disabled`, import réel qui laisse la source inactive ; transition de statut identique à celle de l'API vers `in_review`, second import ; source `active=true`, motif `REACTIVATED_SOURCE`. Le bouton de revue est actuellement masqué pour une demande déjà traitée : le déclencheur vise un appel valide de l'API administrative, pas un clic ordinaire aujourd'hui. Correction attendue : séparer la protection de retrait du statut de traitement, ou interdire cette transition tant qu'une décision de remise en service n'a pas été enregistrée.

**B18 — Attribution erronée de pays dans le Radar.** [Recherche de mots-clés](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/rss-collector.ts:296>).

La première correspondance gagne, dans l'ordre des pays. « Guinée » correspond avant « Guinée-Bissau » ou « Guinée équatoriale » ; « Soudan » correspond avant « Soudan du Sud ». Les apostrophes typographiques ne sont pas normalisées, ce qui fait aussi manquer « Côte d’Ivoire ».

Reproductions : Guinée-Bissau → `GN` au lieu de `GW`, Soudan du Sud → `SD` au lieu de `SS`, Guinée équatoriale → `GN` au lieu de `GQ`, Côte d’Ivoire → `null` au lieu de `CI`. Impact : dépêches absentes du bon filtre et mauvais comptage sur la carte. Correction attendue : normaliser la ponctuation et faire prévaloir les expressions les plus spécifiques.

**B19 — Premier lien Atom pris pour l'article.** [Extraction Atom](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/rss-collector.ts:350>).

Le parseur prend le premier `href` d'un `<link>` sans regarder `rel` ni `type`. Un lien `rel=self` placé avant `rel=alternate type=text/html` devient donc l'URL de la dépêche. Le lecteur ouvre une ressource technique au lieu de l'article et la déduplication utilise une identité inadaptée.

Reproduction : entrée Atom avec `/api/entry` en self puis `/article` en alternate ; le parseur retient `/api/entry`. Les flux configurés portent actuellement principalement des URL RSS ; ce défaut concerne le support Atom du parseur, sans preuve d'un fournisseur actuellement affecté. Correction attendue : choisir le lien destiné à la lecture humaine avant les liens techniques.

**B20 — Entités numériques XML tronquées.** [Décodage Unicode](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/rss-collector.ts:321>).

Le code accepte des points Unicode au-delà de U+FFFF, mais utilise `String.fromCharCode`, qui tronque à une unité UTF-16. Des symboles ou émojis correctement encodés sous forme d'entités numériques sont affichés sous un autre caractère.

Reproduction : `Alerte &#128680;` produit `Alerte ` au lieu de `Alerte 🚨`, point retourné U+F6A8 au lieu de U+1F6A8. Correction attendue : décoder avec `String.fromCodePoint` et valider les points Unicode autorisés.

**A1 — Incohérence métier à arbitrer : remboursement intégral pendant l'essai gratuit.** [Reconstruction après remboursement](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/naboopay-payment.ts:166>), [priorité des abonnements expirés sur l'essai](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/access-policy.ts:125>).

Le comportement est reproduit, mais la règle après remboursement mérite une confirmation explicite : un nouvel utilisateur ayant encore quatre jours d'essai paie puis reçoit un remboursement intégral. L'abonnement NabooPay demeure présent en état `expired`. `evaluateAccess()` refuse alors l'accès, avant de consulter la date d'essai, alors que ce même utilisateur sans cette ligne obtient toujours `trial` et quatre jours d'accès.

La reconstruction des achats donne bien l'échéance de l'essai lorsqu'il ne reste aucun achat ; la politique d'accès n'utilise cependant plus cette échéance. Si les cinq jours offerts doivent survivre à ce remboursement, c'est un 21e bug à corriger. Si un remboursement doit consommer définitivement l'essai, cette règle doit être explicite et couverte par un test. Ce point n'est pas inclus dans le total des 20 bugs confirmés contre une intention suffisamment établie.

Les vérifications exécutées donnent les résultats suivants :

| Contrôle | Résultat |
| --- | --- |
| `npm test` | 398 tests déclarés : 375 réussis, 23 intégrations ignorées, aucun échec |
| `npm run test:integration` | 23/23 réussis ; schéma temporaire nettoyé ; catalogue public et témoin de quota préservés |
| TypeScript, `--noEmit --incremental false` | Réussi |
| ESLint | Réussi |
| `npm run build` | Build Next.js 16.3.8 réussi |
| `npm run db:check:migrations` | Réussi |
| `npm audit --omit=dev` | Aucune vulnérabilité connue déclarée par cet outil |
| `GET /api/health` sur le build local | HTTP 200, processus et base opérationnels |
| Playwright `auth-entry` et `payment` sur le vrai build local | 9/9 réussis, widgets Clerk de développement chargés, paiement intercepté |
| Banc de reproduction navigateur | 13 scénarios réussis, représentant 11 bugs distincts ; les trois statuts de B01 comptent pour un seul bug |
| Reproductions PostgreSQL complémentaires | B15, B16, B17 et A1 ; schéma temporaire nettoyé, empreintes de toutes les tables publiques inchangées |
| Reproductions pures complémentaires | B03–B05 et B18–B20 réussies, aucun appel réel aux fournisseurs |

Les bancs de composants utilisent les composants et hooks applicatifs, avec des adaptateurs de navigation/coquille et des API simulées. Le hls.js du lecteur est réel. Ce banc permet de contrôler les erreurs et l'ordre des réponses ; il ne remplace pas une session membre/admin Clerk complète ni un appareil iOS/Android physique. Le callback d'intervalle RSS a été invoqué directement pour reproduire son chevauchement, et les délais du lecteur et des quotas ont été contrôlés dans le navigateur.

Preuves et reproducteurs, conservés hors Git dans le projet : [résultats navigateur](<C:/Users/GAMER PC/Africa_Live_TV/.local-logs/audit-2026-10-09/browser-results.json>), [résultats PostgreSQL](<C:/Users/GAMER PC/Africa_Live_TV/.local-logs/audit-2026-10-09/database-results.json>), [résultats purs](<C:/Users/GAMER PC/Africa_Live_TV/.local-logs/audit-2026-10-09/pure-results.json>), [banc navigateur](<C:/Users/GAMER PC/Africa_Live_TV/.local-logs/audit-2026-10-09/browser-audit.cjs>), [banc PostgreSQL](<C:/Users/GAMER PC/Africa_Live_TV/.local-logs/audit-2026-10-09/database-audit.ts>), [banc pur](<C:/Users/GAMER PC/Africa_Live_TV/.local-logs/audit-2026-10-09/pure-audit.ts>). Les journaux des contrôles sont dans ce même répertoire. Ces scripts reproduisent les défauts actuels ; ils ne sont pas encore des tests de non-régression destinés à réussir après correction.

L'audit n'a exécuté aucun paiement, aucune réparation de droits réels, aucune modification de Clerk/Railway/OVHcloud/DNS et aucune nouvelle vérification exhaustive des 12 000+ sources amont. Il n'a pas reçu les parcours connectés sur appareils réels, toute la suite E2E, la charge concurrente de production, un scan SAST indépendant ou la configuration distante actuelle. Les indisponibilités amont telles qu'un flux qui répond réellement 403 restent distinctes des bugs de code ci-dessus. Les médias de test sont les fixtures synthétiques existantes ; aucun relais média, conversion serveur ou stockage média applicatif n'a été ajouté.

L'ordre de correction recommandé est B01–B02, puis la fiabilité du contrôle des flux B03–B05 et les problèmes d'identité/retrait B15–B17, puis la synchronisation B07–B11 et les transitions du lecteur/Radar B06/B12–B14/B18. B19–B20 peuvent suivre. Les corrections peuvent rester ciblées et doivent ajouter des tests portant sur ces scénarios précis ; les contrôles généraux verts ne suffisent pas à les recevoir.
