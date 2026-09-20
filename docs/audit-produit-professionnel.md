# Audit produit — Africa Live

Date : 20 septembre 2026

## Positionnement observé

Africa Live est plus proche d’un **catalogue de télévision en direct avec lecture adaptative** que d’un service de vidéo à la demande. Son avantage est la profondeur du catalogue, la recherche multicritère et le choix entre lecteur web et VLC, sans relais média côté serveur.

La comparaison pertinente n’est donc pas seulement Netflix. Les références les plus proches sont les expériences « Live » de YouTube TV, Plex Live TV et Pluto TV : navigation immédiate, favoris, recherche, guide clair, continuité entre appareils et retour explicite sur l’état du contenu.

## Ce qui est déjà au niveau d’un produit sérieux

- Un catalogue complet, paginé et filtrable par pays, langue, catégorie et compatibilité.
- Une recherche rapide avec raccourci clavier.
- Des favoris optimistes, conservés localement puis synchronisés avec le compte.
- Une lecture directe depuis la source, avec repli vers VLC sans relayer ni stocker la vidéo.
- Des états d’erreur, des nouvelles tentatives et une télémétrie de lecture déjà structurés.
- Une base technique testée : contrôle d’accès, quotas, politiques de lecture et invariants de sécurité.

## Écarts avec les plateformes professionnelles

### 1. Confiance avant le clic

Les anciens libellés « disponible », « live » ou « vérifié » pouvaient être interprétés comme une garantie en temps réel alors que le catalogue contient aussi des contrôles historiques ou expirés. Un produit mature distingue clairement :

- la compatibilité connue avec le navigateur ;
- le besoin probable de VLC ;
- une source encore à tester ;
- une indisponibilité connue.

Cette distinction est désormais visible directement sur chaque carte.

### 2. Hiérarchie orientée contenu

Les services de télévision aboutis placent le contenu avant les réglages. L’ancienne grille ressemblait davantage à un panneau d’administration : petit logo, beaucoup de bordures, état peu lisible. La nouvelle grille donne davantage d’espace aux chaînes, réduit le bruit visuel et fait apparaître l’action de lecture au survol.

### 3. Cohérence de marque

La vitrine et le catalogue utilisaient deux logos, deux traitements typographiques et deux signatures différentes. L’en-tête du catalogue reprend désormais le même composant de marque et la même tonalité que la page publique.

### 4. Localisation

L’interface française contenait des catégories anglaises (`News`, `Entertainment`, `Movies`, `Series`) et mettait « France » en avant dans les raccourcis d’un produit panafricain. Les raccourcis sont désormais localisés et organisés par usage : direct, favoris, actualités, divertissement, cinéma, sports et séries.

### 5. États de chargement et accessibilité

Une grille vide pendant le chargement donne l’impression d’une application lente ou cassée. Des skeletons donnent maintenant une structure immédiate. Le lecteur modal conserve également le focus clavier, rend le bouton de fermeture prioritaire et restitue le focus à la fermeture.

## Améliorations livrées dans ce lot

- Refonte des cartes en modes grille et liste.
- Badges de compatibilité lisibles et cohérents.
- Skeletons de chargement et état vide plus utile.
- En-tête et logo unifiés.
- Navigation rapide entièrement en français.
- Message VLC moins intrusif et plus exact.
- Promesses de la landing page rendues vérifiables.
- Avertissement clair : un statut historique n’est pas une garantie de disponibilité instantanée.
- Focus clavier sécurisé dans le lecteur modal.

## Prochaines priorités recommandées

### Priorité 1 — « Reprendre » et historique récent

Ajouter une courte rangée locale des dernières chaînes regardées. C’est le gain d’usage le plus important après les favoris et cela rapproche l’accueil des habitudes des produits de streaming.

### Priorité 2 — Guide « maintenant / ensuite »

Ajouter des données EPG lorsqu’une source légitime et maintenable est disponible. Sans programme en cours, une plateforme TV reste un catalogue de chaînes ; avec un EPG, elle devient un véritable guide de télévision.

### Priorité 3 — Mesure de qualité côté utilisateur

Suivre le taux de démarrage réussi, le temps avant première image, le recours à VLC et les erreurs par famille de source. Ces indicateurs doivent piloter le classement et les badges, sans transformer un ancien succès en garantie actuelle.

### Priorité 4 — Personnalisation du guide

Permettre de masquer ou réordonner les chaînes favorites. YouTube TV propose précisément ce type de personnalisation dans son onglet Live ; c’est une évolution naturelle une fois les favoris stabilisés.

### Priorité 5 — Cadre éditorial et légal

Documenter plus explicitement la provenance des sources, la procédure de signalement et la date du dernier contrôle. C’est indispensable pour renforcer la confiance et préparer une diffusion au-delà du MVP local.

## Références produit

- YouTube TV Help — organisation Home / Live / Library, recherche et personnalisation du guide : https://support.google.com/youtubetv/answer/7067974
- YouTube TV Help — historique de visionnage et reprise : https://support.google.com/youtubetv/answer/7311339

