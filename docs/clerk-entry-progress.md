# Accueil et entrée Clerk — 17 septembre 2026

Travaux dans C:/Users/GAMER PC/Africa_Live_TV, copie de référence désormais utilisée.

- Landing page publique avec connexion, inscription et liens compte/catalogue
  pour les utilisateurs connectés ; lien admin selon le claim, revérifié sur `/admin`.
- Présentation cohérente des pages SignIn/SignUp, liens de retour à l'accueil.
- ClerkProvider configure les routes internes et les redirections de secours
  vers `/app`, sans écraser le retour demandé par une route protégée.
- La configuration privée locale active Clerk et désactive le lancement VLC local.
  Les identifiants sont préservés, la base et le port sont inchangés.
- Le mode MVP reste disponible : flags locaux true, redémarrage, accueil vers `/app`.
- Ancien processus Next du workspace OneDrive arrêté pour libérer 3001 ; nouveau
  serveur de développement démarré depuis la copie de référence.

Contrôles : 121 tests unitaires réussis et 4 intégrations ignorées par cette commande ;
TypeScript, ESLint ciblé et build Next.js 16.3.5 réussis. Requête de contrôle Clerk Backend : HTTP 200,
aucune donnée utilisateur ni clé affichée.

Les trois essais navigateur ont échoué (timeouts) avec un décalage de l'horloge Windows
(jetons émis environ 7 secondes dans le futur) et des boucles de handshake Clerk.
Windows signale Local CMOS Clock et aucune synchronisation réussie ; w32tm /resync
est refusé par le système (accès refusé). Une première résolution DNS a également
échoué, puis le Backend Clerk est devenu accessible.
Ne pas augmenter la tolérance des jetons pour contourner ces erreurs.

Reste à confirmer : suite e2e/auth-entry.spec.ts après synchronisation Windows,
connexion réelle du propriétaire, accès admin, session utilisateur ordinaire,
inscription et rattachement des droits. Aucun paiement, déploiement ou changement
de configuration de production effectué. Aucun nouveau commit/push pour ce travail.
