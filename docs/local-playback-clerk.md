# Lecture locale avec Clerk — 18 septembre 2026

Les flags `LOCAL_DEV_MODE=false` et `NEXT_PUBLIC_LOCAL_DEV_MODE=false`
conservent l'authentification Clerk. Ils désactivaient aussi les essais de
lecture locale : les boutons du catalogue étaient désactivés pour les sources
OFFLINE ou REVIEW_REQUIRED, et la résolution excluait les contrôles anciens.

`NEXT_PUBLIC_LOCAL_PLAYBACK=true` permet désormais la lecture locale
indépendamment de l'identité. La configuration privée de ce poste active ce
flag et `ENABLE_LOCAL_VLC=true`, avec la base africa_live_dev et le port 3001.
Les flags d'authentification restent false.

- Les API conservent l'authentification, les droits et les quotas.
- La résolution ne réessaie les sources historiques que pour une requête
  localhost de même origine en développement. Aucun statut de santé n'est changé.
- Le nouveau flag est interdit en production, et limité par la validation de
  configuration à africa_live_dev et http://localhost:3001.
- Le navigateur et VLC téléchargent toujours directement depuis l'amont.

Vérification : dans la session Clerk existante sur Edge, le clic sur BFM TV
ouvre le lecteur intégré. La vidéo est non pausée, readyState=4,
videoWidth=320 et currentTime supérieur à 60 secondes. Quinze tests ciblés
réussissent ; TypeScript et ESLint ciblé passent. Aucun commit ni push.

En production, laisser NEXT_PUBLIC_LOCAL_PLAYBACK absent ou false ; conserver
les règles d'éligibilité et la validation du catalogue habituelles.
