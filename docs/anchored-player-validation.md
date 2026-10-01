# AL-T05 — lecteur ancré et zapping, réception locale L5

Date : 1er octobre 2026, Africa/Dakar. Base de départ : `main`, `15d6b4a`,
état Git initial propre. Expérimentation explicitement retenue par le propriétaire.
Prototype réalisé et évalué localement ; **recommandation : ajuster avant
généralisation**. La réception locale a précédé la publication autorisée ensuite :
code L5 poussé et livré sur Railway staging, prototype toujours réservé au dev.
Aucune nouvelle migration ni modification des variables, rôles ou configuration des services.
L6 n'est pas commencé ; briefing toujours désactivé.

## Utilisation et périmètre

Dans le serveur de développement du checkout, sur `http://localhost:3001/app` :

1. Arrêter VLC et les lecteurs ouverts indépendamment du catalogue.
2. Cocher « VLC et mes autres lecteurs sont arrêtés », puis « Activer le lecteur ancré ».
3. Choisir une chaîne dans le catalogue, puis « Lire maintenant » ou « Lire ».
4. Utiliser les cartes ou « Chaîne précédente/suivante » dans les résultats chargés.
5. « Arrêter la lecture » détruit le lecteur ; « Désactiver le lecteur ancré »
   retourne au parcours historique. Recharger désactive aussi l'expérimentation.

Disponible uniquement avec `NODE_ENV=development`, désactivé par défaut, sans
persistance, variable distante ni modification de `.env.local`. Les builds de
production, dont Railway staging, ne proposent pas l'activation du prototype.
La lecture passe toujours par la résolution serveur existante : authentification,
droits, quotas, éligibilité et exclusions du catalogue conservés. Aucun import,
filtre serveur, favori, rôle ou abonnement n'est changé. `canPlay=false`
interdit tous les lecteurs de cette page, y compris l'ancré.

## Contrats reçus

- Un seul lecteur web géré par ce catalogue : ancien `Player` démonté au
  zapping grâce à sa clé de chaîne ; HLS détruit, vidéo en pause, `src`
  retiré puis `load()`, timers arrêtés et requêtes annulées. Réponse tardive
  ignorée. L'arrêt fonctionne aussi pour MP4 natif et pendant une résolution.
- Chaque chaîne attend une action de lecture ; aucune tentative autoplay dans
  l'ancré, aucun lancement automatique VLC, aucun secours qui reprend tout seul.
  Le refus du navigateur propose une nouvelle action explicite.
- Pause/reprise, volume au clavier, volume conservé entre chaînes, contrôles
  natifs vidéo et bouton plein écran. L'arrêt démonte réellement le player.
- Les filtres ne relancent pas la chaîne choisie. Si elle sort des résultats,
  son nom et cet état restent visibles ; précédent/suivant sont désactivés.
  Aucun bouclage automatique ni chargement massif de chaînes pour zapper.
- La modale et la fenêtre séparée restent disponibles. Le lecteur ancré est
  détruit avant leur lecture. Le retour vers l'ancré ferme la fenêtre connue.
  Le parcours historique garde sa fenêtre nommée réutilisable ; le catalogue
  lui demande de démonter son player lors du retour en modale. Cette commande
  exige l'origine locale exacte et `event.source === window.opener`.
- La modale est retirée immédiatement de l'arbre à la fermeture ; une animation
  de sortie ne peut donc plus conserver un lecteur pendant le transfert.
- Une source nécessitant VLC affiche un choix explicite. Ce choix détruit
  l'ancré, désactive le prototype et ouvre le lecteur historique, qui conserve
  son mécanisme VLC existant. Réactivation soumise à la déclaration d'arrêt.
- Desktop : lecteur à côté de la liste et ancré au défilement, grille réduite
  à deux colonnes. Mobile : lecteur dans le flux de page, sans superposition
  fixe qui masque définitivement les chaînes ; liste accessible en défilant.
- Les médias des fixtures sont interceptés dans le navigateur sur une origine
  synthétique HTTPS ; aucun handler Africa Live ne relaie playlist ou segment.

Correction connexe nécessaire à la preuve d'arrêt : `PlaybackAttemptTelemetry`
transmettait aussi `engine` et `startedAt` depuis l'objet interne du player.
Le schéma strict rejetait ces événements avant leur envoi. Il ne reçoit désormais
que l'identité publique de tentative et les champs autorisés ; test de contrat
avec un objet réel du player ajouté. Les événements `opened/started/stopped`
restent dédupliqués. Aucune nouvelle route ni changement de garde.

## Preuves de test

| Contrôle | Résultat |
|---|---|
| `npm test` | 220 réussis, 14 intégrations réservées au runner isolé |
| `npm run test:integration` | 14 réussies ; témoin de quota, effectifs et empreintes du catalogue préservés ; schéma jetable nettoyé |
| `e2e/anchored-player.spec.ts` | 13 scénarios reçus sur Edge/Chromium en développement MVP local |
| Régressions TV/catalogue/lecture/API/MVP | 24 scénarios reçus ; favori de test restitué, fixtures de lecture nettoyées |
| Radar : pays, URL, clavier et briefing désactivé | 1 scénario reçu |
| TypeScript et ESLint avec zéro avertissement | Réussis |
| Cohérence migrations | Réussie ; aucune migration nouvelle |
| Build Next hors MVP, `DEPLOYMENT_ENV=local` | Réussi, 25/25 pages ; zéro chunk contenant le contrôle d'activation ancré |
| Build servi, `e2e/auth-entry.spec.ts` | 3 réussis : landing, widgets Clerk et refus anonymes pages/API |

Les 13 scénarios L5 couvrent HLS réellement décodé, MP4 réellement décodé et
nettoyé, absence d'autoplay même après 13 secondes d'attente, refus de lecture,
pause/reprise, volume et conservation au zapping ; changements rapides avec
résolution tardive, flux unique, filtres/résultats vides, source indisponible,
refus serveur après ouverture de catalogue, accès expiré simulé, sortie VLC
interceptée sans double lancement ; plein écran entrée/sortie et refus explicite,
1366/390/320 px sans débordement, Enter/slider/Échap/focus de modale ; fenêtre
réellement décodée, arrêt par message et origine étrangère refusée ; annulation
de résolution pendant navigation et démontage.

Les premiers essais ont détecté puis permis de corriger la télémétrie rejetée
et la perte de réutilisation de la fenêtre séparée. Le test historique catalogue
attend maintenant spécifiquement la requête `favoritesOnly=true`, au lieu de
confondre un retour de recherche encore en cours avec le clic favoris.
Une erreur de test ajoutait un second clic sur Arrêter déjà désactivé ; retirée,
scénario relancé avec succès. Les succès comptent des scénarios distincts,
pas les relances. Logs expurgés de synthèse sous `.local-logs/l5-*`, ignorés.

Total : **234 tests unitaires/intégration et 41 E2E distincts reçus**, zéro
échec final non résolu. Les relances ciblées sont explicites : 23/24 régressions
initiales, puis les 3 catalogue reçues après correction ; 12/13 L5 sur le dernier
passage complet, puis activation/arrêt et zapping natif reçus après correction
du test. La suite de 13 L5 a aussi été reçue en étapes au fur et à mesure de ses
ajouts. Pas de prétention à un passage unique intégral de toute configuration.

Après tests : `africa_live_dev`, **11 778 chaînes et 12 396 sources**, zéro
chaîne `lot2-*` ni schéma `africa_live_test_*` restant. Les anciennes captures L3
réécrites par leur suite ont été restituées à leurs octets initiaux, distinctes
des trois nouvelles captures L5. Serveur remis en développement **Clerk local**
avec lecture locale/VLC permis sur ce poste ; MVP désactivé, `.env.local` intact.
Contrôle après restitution : santé processus/base HTTP 200, Radar anonyme 401 ;
TV et résolution anonyme interceptées par Clerk en 404, sans lecture accordée.
Le parcours de redirection/widgets a été reçu dans les trois E2E du build,
distinctement de ces requêtes HTTP locales sans navigateur.

Reproduction (flags processuels, jamais enregistrés sur Railway) :

```powershell
# Dans un terminal dédié, serveur MVP de ce checkout sur 3001.
$env:LOCAL_DEV_MODE='true'
$env:NEXT_PUBLIC_LOCAL_DEV_MODE='true'
$env:NEXT_PUBLIC_LOCAL_PLAYBACK='true'
npm run dev
# Dans un second terminal avec les mêmes flags, serveur vérifié ci-dessus :
$env:E2E_EXTERNAL_SERVER='true'
npx playwright test e2e/anchored-player.spec.ts --workers=1
npx playwright test e2e/local-playback.spec.ts e2e/local-playback-api.spec.ts e2e/tv-workspace.spec.ts e2e/tv-contract.spec.ts e2e/catalogue.spec.ts e2e/local-mvp.spec.ts --workers=1
npm test
npm run test:integration
npx tsc --noEmit --incremental false
npx eslint . --max-warnings=0
npm run db:check:migrations
# Arrêter le dev avant build/start sur ce même port.
$env:LOCAL_DEV_MODE='false'
$env:NEXT_PUBLIC_LOCAL_DEV_MODE='false'
$env:NEXT_PUBLIC_LOCAL_PLAYBACK='false'
$env:ENABLE_LOCAL_VLC='false'
$env:DEPLOYMENT_ENV='local'
npm run build
npm run start:local
# Autre terminal, mêmes flags hors MVP :
npx playwright test e2e/auth-entry.spec.ts --workers=1
```

Captures de fixtures : [desktop](screenshots/l5-anchored-1366.png),
[390 px](screenshots/l5-anchored-390.png), [320 px](screenshots/l5-anchored-320.png).
Elles montrent des médias synthétiques, sans garantir un diffuseur amont.

## Limites et recommandation

**Ajuster.** Le prototype mérite d'être conservé pour une réception produit locale
du parcours web. Ne pas généraliser ni remplacer les lecteurs existants maintenant.

La garantie d'un seul flux porte sur les lecteurs web gérés par ce catalogue
et sa fenêtre connue. Le navigateur ne peut ni vérifier ni arrêter le VLC
historique, ni les onglets indépendants. La case d'arrêt est une déclaration
utilisateur, pas une preuve technique. Aucun zapping piloté dans VLC, arrêt VLC
ou volume VLC depuis l'ancré n'est annoncé. Une exclusivité automatique englobant
VLC nécessiterait une conception locale distincte et sa réception ; le critère
global « un seul flux tous lecteurs externes inclus » n'est donc pas reçu.

VLC est intercepté dans ces essais : aucun lancement/processus/décodage VLC réel
n'est validé par L5. Les médias décodés sont des fixtures ; disponibilité réelle
actuelle des diffuseurs non qualifiée. Comptes Clerk ordinaires essai/actif/expiré
indisponibles, non reçus ; administrateur inchangé. Pas de nouvelle réception
Clerk connectée L5. Gardes et refus testés séparément, sans les confondre avec
ces comptes. Appareils physiques, Safari/HLS natif, lecteur d'écran et plein écran
mobile système non reçus ; tailles mobiles et Fullscreen API sont simulées dans
Edge. Le petit écran exige du défilement : mesurer ce compromis avec les utilisateurs.

Retour arrière fonctionnel immédiat : désactiver/recharger. Pour une revue de
code, isoler les changements de ce lot ; aucune restauration de DB nécessaire.
Ne pas supprimer les gardes AL-C01/C02 ni employer un nettoyage Git destructif.
Suite : décider de l'ajustement et de la réception humaine de L5. La publication
de cette session est autorisée et reçue ci-dessous ; toute publication future
exige une nouvelle autorisation. Le briefing reste différé ; aucune reprise L6 implicite.

## Publication GitHub et Railway staging

Le propriétaire a ensuite autorisé explicitement commit, push et déploiement.
Commit applicatif `9326fc096e0a7f65b1e40a0b861bbc365b2cc40b`, poussé sur `main`.
Deux uploads CLI du même paquet isolé ont expiré avant build :
`e6572025-166b-45d6-8049-14c3f5ee8710` et
`8b91e9e4-68ac-4f69-962b-ba8035d86bb4`. Aucune livraison réussie
n'est attribuée à ce paquet préparé (338 fichiers, SHA-256
`b8f21ef3e767718b6974f474f54ae6d2cc2551407359ea3bf6a8e294bcf5d8c4`).
Le premier upload est FAILED. Le retry CLI est resté INITIALIZING sans build
associé après expiration du client. Une tentative GitHub
`9b0ee9e9-8dd8-46f2-932a-bcd0aae302b9` a alors coexisté avec lui : le
propriétaire l'a retirée. Le retry CLI a ensuite été retiré par son identifiant
exact, après vérification de son service/environnement et de son état bloqué.
La version active L0–L4 a été conservée. La livraison finale a été lancée
seulement après confirmation des deux retraits ; aucun doublon encore en cours.
La livraison reçue utilise **la source GitHub déjà configurée**, via
`railway redeploy --from-source`, sans changement de configuration :
Railway confirme le commit complet ci-dessus dans sa métadonnée `commitHash`.
Aucun fichier privé ignoré (.env, cookies, backups, traces) n'est commité.

Les fichiers de migrations, le schéma et les dépendances sont inchangés
par rapport à `15d6b4a`. Le registre distant a été lu par SSH avant puis
après livraison : **19 appliquées, zéro en attente**. Deux empreintes
historiques différaient déjà des fichiers du conteneur précédent, avec dates
enregistrées ; Drizzle utilise la dernière date appliquée, pas une réexécution
de ces migrations. Aucune migration nouvelle ni altération de ce registre.
Après livraison, les 19 dates et empreintes concordent avec les fichiers du
conteneur GitHub ; la dernière date appliquée est identique à celle d'avant.
Pas de sauvegarde/restauration nouvelle, ce déploiement ne changeant pas le schéma.

Déploiement `dc557ad8-8288-4872-863d-7a2b6396014c` **SUCCESS et instance active** à
**20:08 UTC** ; build Next réussi, hook existant
`npm run db:migrate:deploy` terminé, démarrage reçu. Aucun changement de
configuration, DNS, plan, rôle ou abonnement. Cible : projet `just-compassion`,
environnement Railway nommé `production`, rôle **`DEPLOYMENT_ENV=staging`**.
Modes MVP/public MVP/lecture locale/VLC désactivés, éligibilité active.

- `GET /api/health` : **200, processus/base sains** sur
  [staging.africatv.sn](https://staging.africatv.sn) et
  [domaine Railway de secours](https://africalivetv-production.up.railway.app).
- Radar anonyme : **401** sur les deux domaines, sans données de catalogue ni URL média.
- **9 E2E distants reçus** : landing/mobile, widgets Clerk connexion/inscription,
  refus anonymes pages/API, cinq parcours de paiement sans transaction réelle,
  worker MapLibre réel et protection dashboard. Logs privés ignorés.
- Lecture SSH des chunks produits : **zéro chunk contenant le contrôle
  « Activer le lecteur ancré »** ; disponibilité du prototype exclusivement locale.
- Aucun nouveau parcours Clerk connecté L5 reçu sur staging, aucun compte
  ordinaire ni média amont/VLC réel validé par cette publication. Les preuves
  locales de lecture et leurs limites ci-dessus restent applicables.

Reproduction des neuf E2E, avec variables seulement dans le processus local :

```powershell
$env:LOCAL_DEV_MODE='false'
$env:NEXT_PUBLIC_LOCAL_DEV_MODE='false'
$env:NEXT_PUBLIC_LOCAL_PLAYBACK='false'
$env:ENABLE_LOCAL_VLC='false'
$env:DEPLOYMENT_ENV='local'
$env:E2E_EXTERNAL_SERVER='true'
$env:E2E_BASE_URL='https://staging.africatv.sn'
$env:RADAR_BUILD_TEST='true'
npx playwright test e2e/auth-entry.spec.ts e2e/payment.spec.ts e2e/radar-reliability.spec.ts --grep 'Build servi|anonymous visitors|landing page|Clerk sign|Page de paiement' --workers=2
```

Un commit documentaire de réception est poussé après ces contrôles ; aucun
code n'y change. Le déploiement reste celui du commit applicatif ci-dessus.
Tout prochain déploiement ou changement distant nécessite une nouvelle demande.
