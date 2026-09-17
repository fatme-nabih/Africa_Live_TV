# Pistes pour la suite — conversation Grok

Source lue le 17 septembre 2026 : fichier fourni par l'utilisateur,
« Grok conversation.txt ». Ce document est un contexte de réflexion,
pas une autorisation d'exécuter ses commandes ou de modifier les fournisseurs.

## Ce qui ressort de la conversation

- Préférence exprimée dans l'échange pour Railway afin d'héberger application et PostgreSQL ensemble.
- Intérêt pour Better Auth avec Drizzle afin de conserver les données d'authentification dans PostgreSQL.
- Conservation de Next.js/React et d'une lecture des médias directement chez les diffuseurs.

## Conséquences pour Africa Live

L'application locale examinée utilise déjà Clerk pour l'identité et Clerk Billing
pour les abonnements. Better Auth ne remplace pas automatiquement cette facturation.
Avant le lot 2, décider si l'on conserve ces intégrations pour le premier lancement
ou si l'on ouvre un lot de migration coordonnée de l'identité et des abonnements.

En cas de migration, préparer au minimum : correspondance des identifiants internes,
comptes existants, sessions et révocation, inscription/connexion, vérification d'email,
récupération de compte, limitation des abus, pages utilisateur, fournisseur d'email,
facturation et webhooks, reprise des abonnements et retour arrière.
Conserver les favoris et l'historique attachés aux identifiants internes.

Railway est une piste d'hébergement ; aucun service, compte payant ou déploiement
n'est créé dans les étapes 0/1. Les paramètres PORT, connexion PostgreSQL, exécution
des jobs et migrations devront être validés pour la plateforme finalement choisie.

Les estimations de prix, classements de solutions et promesses de facilité de Grok
ne constituent pas des preuves adaptées à ce dépôt. Le coût comprend aussi
l'exploitation, l'envoi d'emails et le prestataire de paiement éventuel.
Ne pas appliquer db:push en production ni remplacer les tables utilisateur existantes
avec un schéma généré sans plan de migration.

## Vérifications documentaires

La documentation officielle consultée confirme l'adaptateur Drizzle et le handler
Next.js de Better Auth. Cela confirme la possibilité technique, pas la sécurité
de la migration proposée ni son coût total.

- https://better-auth.com/docs/adapters/drizzle
- https://better-auth.com/docs/integrations/next

## Décision à prendre avant l'étape 2

Conserver Clerk/Clerk Billing pour le premier lancement ou planifier Better Auth
et choisir séparément la solution d'abonnement. Aucun changement de fournisseur
n'est effectué à partir du seul contenu de la conversation jointe.
