# Retour iPhone et refus de sources — 6 octobre 2026

## Réception sur appareil

Le propriétaire a confirmé le bouton **Ouvrir dans VLC**, puis VLC
**3.7.3 (475)**. Après plusieurs essais, il confirme explicitement que
**CNews fonctionne**. Une autre capture montre aussi une chaîne avec les logos
Nickelodeon/Pluto TV en lecture ; son nom exact dans le catalogue n’a pas été
confirmé. Le lancement publié fonctionne donc sur cet iPhone pour au moins
CNews ; cela ne constitue pas une réception de tous les flux mobiles.

Une capture noire affiche le fichier d’un flux correspondant à **Naruto
Shippuden** dans le catalogue. Le propriétaire signale aussi **Dragon Ball Z** :
écran noir, puis retour de VLC à Réglages avant une lecture effective.

## Contrôles en lecture seule

| Chaîne | Résultat depuis le poste | Catalogue |
|---|---|---|
| CNews | Manifeste, variante et segment HTTPS 200 ; ffprobe identifie H.264 Constrained Baseline, 512×288, 25 images/s et HE-AAC stéréo. Lecture iPhone confirmée par le propriétaire. | Source active identique en local et sur staging. |
| Naruto Shippuden | Réponse 403 JSON, aucun manifeste HLS, avec agents VLC et Safari iPhone. ffprobe ne trouve aucune piste. | Une seule source enregistrée, aucun secours. |
| Dragon Ball Z | Réponse 403 JSON, aucun manifeste HLS, avec agents VLC et Safari iPhone. Message du fournisseur indiquant que la chaîne n’est pas permise. | Une seule source enregistrée, identique en local et sur staging, aucun secours. |

Ces vérifications sont faites depuis le poste, pas par capture réseau dans VLC
sur l’iPhone. Elles établissent un refus actuel de ces sources depuis le poste,
cohérent avec les symptômes observés. Elles ne démontrent pas une incompatibilité
générale de VLC/iOS. Les événements serveur `opened` confirment une demande
d’ouverture, jamais le décodage dans l’application externe.

Les contrôles historiques du 4 octobre indiquaient ces sources `HEALTHY` et
`VLC_ONLY`. **Aucune qualification, donnée métier ou URL n’a été modifiée pendant
ce diagnostic.** Ne pas présenter l’ancien contrôle comme une preuve actuelle
de lecture de Naruto ou Dragon Ball Z. Une source autorisée fonctionnelle ou un
rétablissement par le fournisseur est nécessaire ; aucun secours n’est
disponible dans le catalogue actuel pour ces deux chaînes.

## Code et état de publication

Le parcours en ligne reste celui de `5eff6c0` + `8fcfbda`, Railway `738d71b8`
SUCCESS. CNews est reçu sur le vrai iPhone ; le diagnostic n’a déclenché aucun
nouveau déploiement, commit ou push.

Un candidat de secours iOS a été préparé pendant l’investigation : autre schéma
VLC, copie manuelle dans l’aide et différé de la mise à jour React après le clic.
Il a passé lint/build, 399 unités (376 réussies, 23 ignorées) et neuf tests de
composant. Le retour utilisateur et les refus 403 ne justifient pas de le
publier comme correctif de ces sources. **Candidat non publié, retiré par patch
ciblé de ses seuls changements, conservé dans
`.local-logs/ios-vlc/r2-candidate.patch`**. Source applicative remise à la version
publiée ; aucun changement préexistant supprimé.

Scripts privés, sans URL de média ni secret dans leurs résultats :
`cnews-deep-check.cjs`, `probe-codecs.cjs`, `naruto-http-check.cjs`,
`compare-staging.cjs` sous `.local-logs/ios-vlc/`. Les lectures SSH ciblent staging
et utilisent une transaction PostgreSQL en lecture seule. Aucun média stocké,
relayé ou converti pour les utilisateurs ; source IPTV conservée.

Le correctif récent de
[VideoLAN pour fermer les écrans de réglages lors d’une ouverture de flux](https://github.com/videolan/vlc-ios/commit/e22153797e7e7263951ad52e8e17aceb21783fa6)
est postérieur à VLC 3.7.3 et traite les sous-écrans de réglages ; ce n’est pas une
preuve de la cause des échecs ci-dessus et il ne supprime pas un refus 403 du
fournisseur. Ne pas recommander une version alpha sur cette seule base.
