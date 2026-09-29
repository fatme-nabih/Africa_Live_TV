# Radar Afrique — périmètre de la première version

## Intention

Le Radar Live ajoute une porte d’entrée de veille médiatique au catalogue Africa Live. Il associe des titres d’articles indexés, leur média source et une carte des pays de publication connus. Un emplacement météo à Dakar est réservé pour un futur fournisseur compatible. Le catalogue reste accessible depuis le bouton « Ouvrir l’app des chaînes ».

## Sources et interprétation

- **GDELT DOC 2.0** fournit les articles repérés sur les dernières 24 heures. Son opérateur `sourcecountry` cible les médias publiant dans un pays ; GDELT autorise l’usage commercial sans frais sous réserve de citation et d’un lien vers le projet ([API](https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/), [conditions d’utilisation](https://www.gdeltproject.org/about.html)). La requête filtre les pays d’origine des médias africains, et non le lieu où se déroulerait l’événement raconté. Seuls le titre, le domaine source et l’heure d’indexation sont affichés ; les liens mènent à la publication d’origine.
- **Météo Dakar** n’affiche pas encore de données. L’API gratuite Open-Meteo est réservée à un usage non commercial et ses conditions nomment les applications avec abonnement comme usage commercial ; son offre commerciale implique un abonnement ([conditions](https://open-meteo.com/en/terms), [offres](https://open-meteo.com/en/pricing)). Le connecteur attend une source autorisée et la validation du coût éventuel.
- La carte 2D est un schéma vectoriel léger. Chaque point représente le pays du média source. Elle ne localise pas un événement et ne constitue pas un fond cartographique de précision.

Les compteurs indiquent le nombre de résultats retournés par la requête. Ils ne mesurent ni la gravité, ni la véracité, ni l’exhaustivité d’une situation. Les titres ne sont pas présentés comme des alertes vérifiées.

## Architecture

- Interface protégée sous `/app/live`, dans la même zone d’accès que le catalogue.
- `GET /api/live/news` passe par l’autorisation de consultation existante et un quota dédié.
- Les appels serveur visent des hôtes fixes. Les paramètres de requête et les limites de réponse sont bornés ; les réponses amont sont normalisées avant affichage.
- Cache mémoire de cinq minutes pour GDELT, avec affichage explicite des réponses de cache de secours.
- La carte est un SVG local : aucune tuile distante, bibliothèque de globe ou collecte de média n’est requise.
- Aucun flux vidéo/audio n’est relayé ou stocké. La lecture continue dans le catalogue actuel, directement depuis les sources amont.

## Périmètre différé

Les flux RSS individuels, un briefing généré, météo en direct, AIS/navires, trafic aérien, feux NASA FIRMS, vidéo PiP dans le radar et globe Cesium ne sont pas simulés dans cette version. Ils nécessitent chacun une vérification des conditions d’accès, des quotas et de la provenance avant d’être présentés comme des données actives. Le mode 2D léger est le point de départ pour les connexions mobiles.

## Suite proposée

Le backlog détaillé et les critères d’acceptation sont décrits dans la [feuille de route du Radar OSINT](radar-afrique-roadmap.md).
