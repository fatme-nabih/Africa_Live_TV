# Pré-relecture arabe — 13 octobre 2026

**Pré-relecture technique réalisée ; validation native D7 attendue du propriétaire.** Les dictionnaires et les annotations n'ont pas été corrigés automatiquement. Le CSV canonique conserve ses 1 175 lignes et ses colonnes de retour.

## Vérifications effectuées

| Contrôle | Résultat |
| --- | --- |
| Chaînes simples FR/AR comparées | 1 111 : clés, types, variables, chiffres occidentaux et séparation des groupes numériques vérifiés |
| Groupes de pluriels | 16 groupes, 88 messages arabes ; 14 groupes à six formes |
| Deux groupes neutres | `shell.legacy.savedMasculine` et `savedFeminine` : « تم حفظ {choices} » dans `one` et `other`. Les autres catégories utilisent le repli `other`, identique et sans nombre écrit dans la phrase. Ce n'est pas une forme manquante de nom compté ; le contexte d'import est à relire |
| Anomalies structurelles | 0 après distinction des deux formulations neutres ; aucun test applicatif affaibli |
| Texte juridique à relire | 65 clés FR/EN/AR exportées ; incluses dans D7, avec validation juridique distincte |
| Textes Clerk personnalisés | 19 lignes, dont les variantes combinées et les deux liens d'action ; l'ancienne notice en comptait 17 |
| Annotations | 228 titres réels +28 pièges synthétiques préparés pour votre retour |

Preuve complète : [rapport d'audit](../../.local-logs/relectures-2026-10-13/audit.json). Les chaînes latines restantes correspondent notamment aux marques, unités, formules monétaires isolées et au message interne de développeur déjà justifié en E4. Aucune preuve de relecture sémantique humaine n'est déduite de ces contrôles.

## Examen linguistique prioritaire

- **Quantités et fragments** : essayer 0, 1, 2, 3, 11, 100 avec canaux, dépêches, favoris, jours restants et accès. Relire les fragments concaténés et la phrase « تم حفظ {choices} » avec seulement des favoris, seulement des pays et les deux ensemble.
- **Pont et préférence** : les six formes de `radar.feed.bridge`, les noms `bridgeLanguages` et `shell.edition.savedInAccount` doivent distinguer l'édition de lecture, le compte et le choix propre à l'appareil. Le texte ne doit pas promettre qu'un cookie local est remplacé par la préférence du compte.
- **Texte long à 360 px** : tuiles Radar, indication météo, pont, note du compte, contact et juridique. Les tests techniques prouvent l'absence de défilement horizontal ; ils ne prouvent pas l'aisance de lecture ou la justesse du vocabulaire.
- **Terminologie** : conserver une formulation cohérente pour النسخة, الرادار, الدليل, المفضّلة, وضع توفير البيانات et المشغّل المثبّت ; confirmer que les formulations conviennent au public visé.
- **D3/D5/D6** : chiffres 0–9, 990 et 9 900 FCFA, carte internationale, Sénégal/UEMOA, RT Arabic avec son origine, الصحراء الغربية au nom neutre. Les chiffres orientaux dans le piège synthétique sont volontaires ; ils ne viennent pas de l'interface.
- **Clerk** : première connexion, inscription, prénom/nom, mot de passe et code de secours ; confirmer les écrans officiels et les textes personnalisés. Le profil connecté arabe n'a pas été reçu en E9.
- **Titres annotés** : pays nommés / pays du média / absence de pays, titres multipays et Congo. Vérifier مصر/مصرع/مصرف, المغرب comme pays ou moment de la journée, مالي dans un mot financier, النيجر/نيجيريا et السودان/جنوب السودان.

Les nouvelles propositions juridiques sont à relire en arabe après leur choix définitif en français. Les colonnes de correction restent vides tant que vous n'avez pas fourni votre retour ; EDI-404 n'est pas clôturé.
