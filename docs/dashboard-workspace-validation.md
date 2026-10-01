# Dashboard — réception locale L2

Date : 30 septembre 2026 · Africa/Dakar. AL-W01 à AL-W06.
Livraison locale, sans déploiement, migration, commit ou push.

## Comportements livrés

| Ticket | Résultat |
|---|---|
| AL-W01 | En-tête court, KPI compacts en deux colonnes sur mobile, aide et bandeau dans des panneaux dépliables. Début du fil et de la carte visible à 1366×768. |
| AL-W02 | Sélecteur natif nommé, code et nom du pays, saisie clavier native, Afrique/tous pays et remise à zéro. Indépendant de la carte. Le pays sans dépêche conserve météo et accès TV. |
| AL-W03 | `country` validé dans l’URL, paramètres supplémentaires et fragment conservés. Carte et contrôle utilisent la même sélection. Liens directs, rechargement et historique restaurent le contexte ; code inconnu signalé avec vue Afrique. Réponses météo/TV obsolètes ignorées. |
| AL-W04 | Pays puis fil avant la carte dans le DOM et l’ordre visuel. Carte automatique à partir de 1280 px ; bouton afficher/masquer en dessous, sans worker ni couche demandés avant activation. Contrôles accessibles en paysage et sur connexion lente. |
| AL-W05 | Feux FIRMS et risques USGS/GDACS désactivés par défaut. Chargement borné, annulation, retry, cache propre à la couche, erreur isolée. Dates de collecte et d’observation/événement, légendes et limites distinctes. Coordonnées/mesures invalides exclues sans point fictif. Popups échappés et liens validés. Médias/TV, 2D/3D et clics après réactivation conservés. |
| AL-W06 | Résumé de couverture avec annonces stables, tableau par fournisseur/périmètre : état, dernier succès, date des données, expiration du cache, volume et limites. États chargement, à la demande, vide valide, partiel, périmé, non configuré et panne explicites. Cadence individuelle selon `cacheExpiresAt`, distincte de la date d’une séance financière. |

Le bouton Actualiser recharge aussi les métadonnées du bandeau. L’horloge
reste distincte des annonces de disponibilité ; elle ne prouve aucun succès
fournisseur. Les couches non demandées ne diminuent pas la couverture.
Le tableau défile dans son propre conteneur au clavier sans élargir la page.
Le briefing reste désactivé jusqu’à L6 ; aucune nouvelle API payante.

## Vérifications

- `npm test` : **211 réussis, 14 intégrations optionnelles ignorées**, zéro échec.
- TypeScript sans incrémental, ESLint avec zéro avertissement et build Next réussis.
- E2E Edge dev : **21 réussis** : 12 L2, 6 non-régressions Radar L0/L1 et
  3 catalogue/favoris. Le test réservé au build est exécuté séparément.
- L2 : 320×844, 390×844, 844×390 et 683×384 ; clavier, lien direct, reset,
  paramètres/fragments, rechargement, retour/précédent, carte synchronisée,
  SN→CI avec réponses TV/météo retardées ; connexion lente, absence de carte
  puis worker bloqué, aucun débordement horizontal ni exception JS attendue.
- Couches : zéro requête avant activation, panne isolée et reprise, géométrie
  invalide, activations concurrentes, cache réutilisé, popup daté après
  désactivation/réactivation, réponse tardive après masquage ignorée.
- Sources : panne totale, source non configurée, reprise, annonces stables et
  avance de l’horloge montrant RSS/GDELT périmés avant le résumé TV.
- Build servi avec MVP désactivé : **3 réussis** : worker ESM réel et dépendance
  sous CSP depuis une page publique, landing et protections pages/API anonymes.

683×384 vérifie le repli CSS correspondant à un écran 1366×768 à 200 % ;
le geste de zoom natif du navigateur n’est pas automatisé. Le nom des
contrôles, l’ordre clavier et les régions annoncées sont vérifiés, sans
revendiquer une session manuelle avec lecteur d’écran.

Le dashboard complet est testé en développement local MVP. Aucune nouvelle
session Clerk authentifiée n’a été créée sur le build servi : le contrôle
worker et les gardes anonymes ne remplacent pas cette réception authentifiée.
Les intégrations optionnelles, fournisseurs réels et paiements ne sont pas
simulés comme des succès universels. Le serveur est restitué en mode Clerk local.

## Captures

Fixtures déterministes pour la réception :

- [Desktop](screenshots/l2-dashboard-desktop.png)
- [Mobile 390 px](screenshots/l2-dashboard-mobile.png)
- [Tableau de sources en état partiel](screenshots/l2-dashboard-mobile-sources.png)

Observations locales avec les fournisseurs et le catalogue réels, sans
modifier leur état :

- [Desktop, Sénégal](screenshots/l2-dashboard-desktop-real.png)
- [Mobile, Sénégal](screenshots/l2-dashboard-mobile-real.png)

La suite du plan est L3 — navigation et filtres TV, AL-T01 à AL-T04.
