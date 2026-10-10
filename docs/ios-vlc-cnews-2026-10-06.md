# VLC sur iPhone — CNews, 6 octobre 2026

## Signalement et diagnostic

Le propriétaire indique que VLC fonctionne sur Samsung/Android, mais s’ouvre sur
la médiathèque vide sur iPhone après le choix de **CNews**. La capture ne permet
pas de confirmer si VLC a reçu le lien, si son démarrage à froid a perdu la
demande, ou si le flux a échoué ensuite. Version de VLC/iOS et lecture sur
appareil réel initialement non reçues. **Après publication, le propriétaire
confirme VLC 3.7.3 (475) et la lecture CNews sur le vrai iPhone.**
[Retour et diagnostic des autres sources](diagnostic-vlc-flux-2026-10-06.md).

Le lien construit utilise déjà le format attendu par le
[gestionnaire officiel de VideoLAN](https://github.com/videolan/vlc-ios/blob/master/Sources/Helpers/Network/URLHandler.swift) :
`vlc-x-callback://x-callback-url/stream?url=<URL encodée>`.
Ce format est conservé. La fragilité constatée côté site est le clic synthétique
sur un lien caché après une résolution asynchrone. Selon
[WebKit](https://webkit.org/blog/13862/the-user-activation-api/), l’activation
utilisateur peut expirer pendant une attente réseau ; c’est une piste de
fiabilisation, pas une preuve de la cause exacte de la capture.

Lecture seule de `africa_live_dev` : la source active de CNews est `VLC_ONLY`,
`HEALTHY`, `PUBLIC_DIRECT_VLC`, contrôlée le 4 octobre. Son manifeste HLS et la
première variante HTTPS répondent HTTP 206 depuis le poste le 6 octobre.
Ce contrôle ne confirme pas le décodage vidéo ni l’accès depuis la 4G de
l’iPhone. Aucun statut de source n’a été modifié.

## Changement livré

- Sur iPhone/iPad, résolution habituelle autorisée par `/api/playback/resolutions`,
  puis état `external-ready` et vrai lien **Ouvrir dans VLC**. Aucun lancement
  automatique iOS, aucun fetch ni clic synthétique entre le toucher et la
  navigation native. URL et paramètres de la source conservés.
- Après le toucher, **Ouverture de VLC demandée** : le navigateur ne peut pas
  attester la lecture dans VLC. **Réessayer dans VLC** conserve le même lien et
  n’effectue pas une nouvelle résolution. Conseil si l’accueil vide persiste :
  ouvrir VLC d’abord, revenir dans Safari, puis réessayer.
- Android conserve son `intent://` et son lancement automatique. Le bureau
  conserve son lancement automatique ; `/api/open-vlc` reste limité au poste
  local. Une détection mobile utilise le parcours direct même en build de test
  local, sans demander au serveur de lancer VLC sur le poste.
- iPadOS avec agent Macintosh et plusieurs points de toucher est reconnu.
  Construction des liens : validation HTTP/HTTPS partagée Android/iOS.
- Résolutions externes annulées lors d’un changement de chaîne ou démontage,
  délai de 15 secondes, demandes simultanées bloquées. Sélection d’une autre
  chaîne efface le lien préparé.

Fichiers : `Player.tsx`, `player/PlayerOverlays.tsx`, `external-playback.ts`,
`playback-machine.ts` et tests associés ; nouvelle spec `e2e/mobile-vlc.spec.ts`.

## Réception locale

- `npm test` : **398 tests, 375 réussis, 23 intégrations ignorées, 0 échec**.
- `npx tsc --noEmit --incremental false` : réussi. Un fichier généré
  `.next/dev/types/routes.d.ts` contenait une fin dupliquée/corrompue avant la
  réception ; types régénérés par `next typegen`, copie générée saine reportée
  dans le cache dev. Aucun fichier source de configuration changé.
- ESLint sur les sept fichiers applicatifs/de test touchés : réussi, zéro
  avertissement. `npm run build` Next 16.3.8 : réussi.
- **7 tests Playwright réussis** sur le composant réel bundlé, exécuté dans Edge
  avec agents iPhone/iPad/Android : préparation sans lancement, clic natif
  `isTrusted`, flux complet et relance sans nouvelle résolution, refus d’accès,
  réponse lente, protocole interdit, bureau automatique unique, iPadOS et Android.
  L’ouverture de l’application native est interceptée ; **ce n’est pas une
  réception Safari/VLC sur iPhone**. WebKit n’est pas installé sur ce poste.
- Composant isolé en localhost:3001, avec routes simulées : pas de session Clerk
  ni de données de test à créer, pas de changement du serveur dev ou des `.env*`.
  La spec utilise facultativement `E2E_PLAYER_COMPONENT_BUNDLE` pour ce mode.
  Scripts ignorés : `.local-logs/ios-vlc/build-component.cjs`,
  `playwright.config.cjs`, `cnews-check.cjs`.

## État et suite

**Publié sur GitHub et Railway staging le 6 octobre, à la demande expresse du
propriétaire.** Code VLC `5eff6c0`, dépendances corrigées `8fcfbda`, Railway
`738d71b8` SUCCESS, 442/442 fichiers applicatifs identiques, santé 200 sur les deux
domaines, 10/10 E2E distants, CI réussie. [Dossier de publication](publication-ios-vlc-2026-10-06.md).
Audit production zéro vulnérabilité après mise à jour ciblée de sharp et
source-map-js ; 20 migrations inchangées. Aucune configuration
Railway/OVHcloud/Clerk/DNS modifiée, aucun relais/conversion/stockage média,
projet source IPTV conservé. Railway reste staging.

Réception CNews confirmée sur le vrai iPhone. Les autres conditions restent à vérifier : recharger le site dans Safari,
choisir CNews et toucher **Ouvrir dans VLC**, VLC fermé puis déjà ouvert, retour/relance, autre
chaîne VLC et comparaison Wi-Fi/4G si l’échec persiste. La cause exacte du
signalement reste à confirmer sur l’appareil.
