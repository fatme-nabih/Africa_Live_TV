# Administration avec Clerk

Le rôle est géré dans les métadonnées publiques Clerk, sans Organizations.
La conversation jointe « AI de clerk.txt » est une référence et n'autorise pas
l'exécution automatique de ses exemples de modification des rôles.

## Configuration du propriétaire

Dans Users → votre compte → Public metadata :

```json
{ "role": "admin" }
```

Dans Configure → Sessions → Customize session token → Claims, fusionner ceci
avec les autres claims éventuels, puis enregistrer :

```json
{ "metadata": "{{user.public_metadata}}" }
```

La chaîne vide montrée dans la capture et l'échange de l'IA ne transmet pas le rôle.
Après correction, déconnectez-vous puis reconnectez-vous pour renouveler la session.
Ces réglages sont propres à chaque instance : les captures concernent Development,
pas l'instance Production. Ne pas recopier les clés de développement en production.

## Comportement

- `/admin` vérifie la session, le rôle du jeton, puis le rôle actuel chez Clerk.
- Un compte Clerk bloqué/verrouillé ou une identité interne non active est refusé.
- Une panne Clerk/DB n'accorde jamais l'accès.
- Le compte technique du MVP local n'est pas administrateur : `/admin` répond 403
  dans ce mode. Conserver la configuration locale existante jusqu'à préparation
  d'une session Clerk dédiée et valide.
- Le lien Administration est affiché selon le jeton ; la page revérifie les droits
  côté serveur, même si le lien est absent ou obsolète.
- L'espace actuel confirme l'accès administrateur. Il ne comporte pas encore
  d'outils de modification des utilisateurs ou du catalogue.
- Le rôle administrateur ne contourne pas les règles d'abonnement ou de lecture.
- Toute future API ou Server Action administrative doit appeler le contrôle serveur
  avant de lire des données sensibles ou d'effectuer une mutation. Le proxy seul
  ne suffit pas. Aucun endpoint d'attribution de rôle n'est ajouté.

## Vérification

Tests automatisés : refus local/anonyme, rôles absents et invalides, révocation
du rôle malgré un jeton ancien, compte bloqué, erreur fournisseur/DB, admin actif.
Vérification à réaliser avec une instance Clerk réelle : propriétaire connecté →
`/admin`, utilisateur ordinaire → refus, retrait du rôle → refus, et reconnexion
après ajout du claim. Les tests unitaires ne valident pas la configuration du Dashboard.

Référence : https://clerk.com/docs/guides/secure/basic-rbac
