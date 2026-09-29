# Africa Live — note interne de positionnement technique et juridique

Dernière mise à jour : 29 septembre 2026
Audience : équipe produit, technique et conseil juridique. Ce document n’est pas destiné à l’interface utilisateur et ne constitue pas un avis juridique.

## 1. Description vérifiable du produit

Africa Live structure un catalogue importé de chaînes et de sources, normalise certaines métadonnées et contrôle des caractéristiques techniques des URL, notamment leur disponibilité et leur compatibilité avec les lecteurs pris en charge.

Le chemin d’import par défaut du script actuel est la playlist publique IPTV-org (`https://iptv-org.github.io/iptv/index.m3u`). Le script accepte aussi une autre URL HTTP(S) ou un fichier M3U local. Les données du catalogue ne prouvent pas que chaque URL a été fournie par un diffuseur ou qu’une autorisation de référencement ou de lecture existe. Ne pas décrire le catalogue comme exclusivement fourni par des diffuseurs ou opérateurs sans preuve vérifiable par entrée.

Pour la lecture prise en charge, le serveur résout une source et renvoie son adresse au client. Le navigateur ou VLC récupère ensuite le média directement depuis l’amont. Africa Live ne doit pas ajouter de relais vidéo, de transcodage ni de stockage de programmes. Les contrôles automatisés font toutefois des requêtes réseau vers les sources et peuvent recevoir des manifestes ou des données de test limitées : ne pas affirmer que les serveurs ne reçoivent jamais de données média ni que leur trafic média est nul.

Les contrôles techniques décrivent un état observé à un instant donné. Ils ne déterminent pas l’identité du titulaire des droits, le territoire autorisé, les conditions d’utilisation de la source ou l’autorisation d’inclure la source dans une offre payante.

## 2. Modèle d’accès et facturation

- Un nouveau compte bénéficie d’une période d’essai de cinq jours.
- Après l’essai, un utilisateur connecté peut consulter le catalogue, mais un abonnement valide est requis pour lancer une source et utiliser les fonctions de lecture.
- Le paiement correspond à un abonnement à l’application Africa Live, qui inclut ses fonctions et le lancement des sources techniquement compatibles. Ne pas le décrire comme portant uniquement sur l’embellissement ou des fonctions sans rapport avec la lecture.
- Ne pas présenter l’abonnement comme une preuve d’autorisation des chaînes. Le fait qu’une URL réponde publiquement ne permet pas, à lui seul, de conclure qu’elle est libre de droits ou que son référencement et sa lecture sont autorisés.

Les tarifs, le checkout NabooPay, les CGU, la page Compte et le comportement des API doivent rester cohérents. Toute modification des droits d’accès nécessite de préserver les gardes de lecture et de revalider les parcours d’essai, d’expiration et d’abonnement.

## 3. Demandes de retrait et traçabilité

Le formulaire public `/contact` enregistre les demandes dans `support_requests`. Les administrateurs actifs peuvent les consulter dans l’espace `/admin`; les changements de statut et les décisions sont historisés dans `support_request_events`. Les demandes de retrait demandent le nom de la chaîne et acceptent une URL facultative dont les paramètres de requête et le fragment sont retirés avant stockage.

Pour une demande de retrait suffisamment identifiable, un administrateur désactive les sources associées et consigne sa décision. Une désactivation empêche les nouvelles résolutions et retire les sources du catalogue. Comme la lecture est directe entre le client et la source amont, Africa Live ne peut pas interrompre à distance une connexion déjà établie à une URL communiquée au client.

Les imports futurs doivent respecter les demandes de retrait toujours actives et ne pas réactiver automatiquement une source désactivée. Si une demande est clôturée sans retrait après vérification, les sources concernées peuvent être réactivées avec une requalification technique requise. Aucun délai de traitement public n’est promis dans l’application.

Le responsable opérationnel de la file est l’administrateur actif désigné par le propriétaire du compte. Avant le lancement, l’équipe doit désigner la personne chargée de consulter cette file et prévoir sa continuité en cas d’absence. La file interne ne fournit pas, à elle seule, une notification par e-mail.

## 4. Communication destinée aux utilisateurs

Ne pas afficher la présente note interne, le terme « harness », ni un argument de « zone grise » dans l’application. Les textes utilisateurs doivent exposer les faits utiles :

- l’application organise un catalogue de chaînes et de sources tierces ;
- certains contrôles vérifient la disponibilité et la compatibilité technique ;
- la lecture prise en charge se fait directement depuis la source amont ;
- l’essai dure cinq jours; après l’essai, le catalogue reste consultable avec un compte, mais l’abonnement est nécessaire pour lire ;
- les sources peuvent devenir indisponibles ou être retirées ;
- une demande relative à une chaîne peut être déposée via le formulaire Contact.

Ne pas qualifier toutes les sources de publiques, officielles, légitimes, autorisées ou fournies par leurs diffuseurs si ces faits ne sont pas établis pour les entrées concernées. Ne pas promettre qu’un retrait, une clause CGU ou l’architecture directe exclut une responsabilité juridique.

## 5. Revue avant ouverture commerciale

La loi sénégalaise n° 2008-09 traite du droit d’auteur et des droits voisins. L’Accord de Bangui comprend une Annexe VII consacrée à la propriété littéraire et artistique. Leur application au produit, à l’indexation, à la lecture directe, au modèle d’abonnement et aux territoires visés doit être analysée par un conseil local; cette note n’en tire aucune conclusion de conformité ou d’exemption.

- [Loi sénégalaise n° 2008-09 — WIPO Lex](https://www.wipo.int/wipolex/fr/legislation/results?countryOrgs=SN&subjectMatters=5)
- [Accord de Bangui — OAPI](https://oapi.int/cadre-juridique/accord-de-bangui/)

Avant l’ouverture commerciale, faire examiner par un conseil au Sénégal la chaîne de provenance du catalogue, les droits de référencement et de lecture, les contraintes territoriales, les CGU, les mentions tarifaires et le processus de traitement des signalements. Une extension à d’autres États d’Afrique de l’Ouest nécessite une vérification pays par pays.
