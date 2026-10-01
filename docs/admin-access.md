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
- Depuis L3 local (1er octobre 2026), le lien Administration utilise la capacité
  revérifiée sur le serveur ; la page applique également sa garde. La réception
  locale et ses limites sont dans [le dossier L4](dashboard-release-validation.md).
- L'espace comporte la revue des demandes de contact/retrait et la désactivation
  des sources concernées, livrées avec DOC-006. Aucun outil d'attribution de rôle
  utilisateur n'est fourni. La réception L4 n'effectue aucun retrait réel.
- Un administrateur actif revérifié bénéficie déjà d'un accès applicatif sans
  abonnement via `getCurrentAccessDecision` ; les contrôles d'éligibilité des
  sources et les quotas de lecture restent appliqués. Cette exception existante
  est conservée par AL-C01/AL-C02 ; voir [la matrice](dashboard-access-matrix.md).
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
