> **Validation reçue le 13/10/2026 :** le propriétaire confirme « Relectures validées, publier les textes actuels ». D7 et la relecture juridique sont acceptés pour la version actuelle ; EDI-404 est reçu. Les propositions juridiques ne sont pas appliquées et les constats JUR restent documentés. Voir la [validation consignée](validation-proprietaire.md).

# Relectures FR · EN · AR — dossier soumis au propriétaire, 13 octobre 2026

**Validateur désigné : le propriétaire** (réponse dans le chat du 13/10). Les deux validations sont reçues sur les textes actuels. Le propriétaire a autorisé **la publication EDI-903 et `EDITIONS=fr,en,ar` après validation des relectures**. Aucun déploiement n'est engagé par la préparation de ce dossier.

## Arabe — D7

1. Relire le [CSV canonique de 1 175 textes](../relecture-arabe-e4-2026-10-12.csv). Compléter `correction` et `commentaire`, conserver les clés, variables `{…}`, espaces insécables et marques bidi. Une cellule vide ne prouve pas à elle seule que le texte a été examiné : confirmer explicitement le périmètre relu dans la fiche de validation.
2. Relire les [19 textes personnalisés de Clerk](clerk-ar-personnalise.csv), y compris les variantes de titre/sous-titre et les deux liens d'action. Ce fichier complète les écrans officiels `arSA` ; il ne remplace pas leur examen en contexte.
3. Relire les [228 titres réels annotés](titres-ar-reels.csv), puis les [28 pièges synthétiques](titres-ar-pieges-synthetiques.csv). Vérifier pays, replis, régions et titres multipays. Les titres des éditeurs restent inchangés ; seule l'annotation peut être corrigée.
4. Examiner les pluriels (0/1/2/3/11/100), les phrases d'import des favoris/pays, le pont FR/EN/AR, les montants 990 et 9 900 FCFA, les intitulés neutres de D6 et les écrans à 360 px.

[Pré-relecture arabe](arabe-prerelecture.md) : contrôles structurels et points linguistiques prioritaires. [Manifest des sources](manifest.json) : empreintes des versions examinées. Les captures existantes sont dans `.local-logs/editions-e9/visual/current`, `.local-logs/editions-e9/captures` et `.local-logs/editions-e4/captures-ar/clerk-ar-*.jpg` ; [galerie E9](../../.local-logs/editions-e9/captures.md).

## Juridique

Relire les [65 textes FR/EN/AR côte à côte](juridique-fr-en-ar.csv), puis les [constats et décisions](juridique-prerelecture.md) et les [corrections proposées](propositions-juridiques.md). Les propositions sont des brouillons séparés : les dictionnaires applicatifs ne sont pas modifiés.

Renseigner les décisions sur les durées de conservation, l'identité de l'exploitant, les prestataires/transferts et les conditions de remboursement. Les formulations définitives dépendront de ces réponses ; aucune durée ou qualification réglementaire n'est inventée. La version française fait foi pour les traductions.

## Retour attendu

Utiliser la [fiche de validation](validation-proprietaire.md) : arabe accepté / corrections demandées, juridique accepté / corrections demandées, éléments examinés, décisions et éventuels points non relus. Un simple accord sur le calendrier ne clôture pas D7.

Après votre retour : intégrer seulement les corrections validées, contrôler les traductions et les gabarits, recevoir les pages concernées, mettre à jour la preuve EDI-404 et le dossier de publication. Toute nouvelle phrase arabe issue des corrections juridiques devra aussi être incluse dans votre validation D7. Les contrôles Clerk connectés réels restent distincts et à recevoir ; ils ne sont pas déclarés faits par la lecture du CSV.

La sauvegarde Railway restaurable et `db:migrate:deploy` avant le code restent les prérequis d'EDI-903. L'accord pour les trois éditions est enregistré ; les opérations Git devront respecter la demande explicite de commit/push prévue dans AGENTS.md. La tâche Windows et `run-cycle.cjs` restent inchangés.

**État : 43/43 tickets reçus ; EDI-404 validé par le propriétaire, EDI-903 publié sur staging.** Aucun envoi à un tiers, coût, changement de base ou action distante dans cette préparation.
