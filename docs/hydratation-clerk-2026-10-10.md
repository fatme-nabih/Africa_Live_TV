# BUG-905 — hydratation du bouton de compte Clerk

Signalement et réception locale : 10 octobre 2026, Africa/Dakar. Complément aux
21 défauts du plan du 9 octobre ; leur numérotation et leurs preuves restent
distinctes. Code non committé, non publié.

Le propriétaire a rencontré l'overlay « Hydration failed » sur
`http://localhost:3001/app/live`. La trace de sa session locale pointe
`LocalAccountControls → ClerkAccountControls → UserButton → ClerkHostRenderer` :
un `div data-clerk-component="UserButton"` présent au premier rendu navigateur
est absent de l'HTML serveur. La version Clerk installée rend ce conteneur si
`clerk.loaded` ; son instance serveur et une instance navigateur déjà prête ne
partagent pas nécessairement cette valeur initiale.

`src/components/LocalAccountControls.tsx` attend maintenant la fin de
l'hydratation avec `useSyncExternalStore`. Le serveur et le premier rendu du
navigateur partagent un espace réservé à l'avatar, puis le véritable UserButton
est monté. Le badge MVP local garde sa condition développement existante. Le
provider, l'authentification, les rôles et les droits serveur ne changent pas.

Non-régression transportable : `e2e/account-controls-hydration.spec.ts` compile
le vrai composant, produit son HTML serveur, puis l'hydrate avec React dans Edge.
Seule la frontière Clerk est remplacée pour reproduire son chargement initial
différent. Trois scénarios : Clerk déjà prêt dans le navigateur, badge MVP en
développement, flag public local présent en production où le compte Clerk reste
affiché. Le menu reste interactif après hydratation. Aucun serveur de fixture,
appel réseau, profil ou base de données n'est nécessaire à ces tests.

- Rouge avant correctif : deux erreurs d'hydratation, un scénario MVP déjà vert.
- Vert : **3/3**, ≈2,1 s, zéro erreur récupérable/page ; même test ajouté à la CI.
- ESLint ciblé et `npx tsc --noEmit --incremental false` : codes retour 0.
- Session Clerk réelle du propriétaire : ouverture directe du Radar, bouton de
  compte visible, puis rechargement complet ; **zéro erreur d'hydratation**.
  Capture et logs privés : `.local-logs/hydration-2026-10-10/`.
- Serveur de développement du propriétaire conservé sur 3001, onglet de test
  séparé puis fermé ; onglet initial laissé ouvert. Aucun redémarrage imposé,
  changement `.env*`, intervention manuelle BDD/Clerk, commit ou publication.

Cette preuve réelle reçoit le bouton de compte et le chargement du Radar dans
une session locale. Les autres profils, refus d'accès, paiement/remboursement et
appareils physiques de BUG-903 restent à recevoir selon leur propre matrice.
