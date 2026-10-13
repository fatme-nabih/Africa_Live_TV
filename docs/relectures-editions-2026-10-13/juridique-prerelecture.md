# Pré-relecture juridique FR · EN · AR — 13 octobre 2026

**Constats et propositions soumis au propriétaire, qui validera la relecture.** Cette fiche compare les textes actuels aux comportements du code et prépare les décisions ; elle ne prononce pas une conformité juridique ni une validation déjà obtenue. Les dictionnaires applicatifs restent inchangés.

Le [CSV comparatif](juridique-fr-en-ar.csv) contient **65 clés** : CGU, confidentialité, métadonnées et mention selon laquelle le français fait foi. Les traductions reprennent les principales modalités FR (essai de cinq jours, 990/9 900 FCFA, compte requis, lecture sous abonnement, sources tierces et absence de relais). Leur relecture native reste D7. Les points ci-dessous portent sur le texte commun et ses traductions.

| Point | Constat vérifié | Décision / correction proposée |
| --- | --- | --- |
| **JUR-01 — Choix d'édition** | `legal.privacy.s3Text` décrit seulement le stockage local générique. Le code utilise aussi le cookie `al_edition` (365 jours), la fermeture locale de la suggestion sans expiration applicative, la préférence du compte et deux marques de session. | Ajouter l'information précise, l'effet du choix de l'appareil et les moyens de modifier/retirer les données locales. Brouillon A dans les [propositions](propositions-juridiques.md). |
| **JUR-02 — Conservation / effacement** | Aucune durée de conservation de la préférence au compte dans la politique. `markClerkUserDeleted` passe le compte en `deleted`, retire l'e-mail et expire les abonnements ; il ne vide pas `preferred_edition`. | Décider de la durée et du traitement après suppression. Ne pas promettre un effacement automatique absent du code. Ne pas changer ce comportement dans un lot documentaire ; une modification éventuelle doit être demandée et testée. |
| **JUR-03 — Exploitant** | `legal.privacy.s5Address` donne une marque, un domaine et « Dakar, Sénégal », sans identifier la personne ou l'entité responsable. | Fournir l'identité exacte et les coordonnées effectives ; vérifier les informations nécessaires au service auprès du validateur juridique. Le domaine acquis ne remplace pas l'identité de l'exploitant. |
| **JUR-04 — Qualifications NabooPay** | `legal.cgu.s3Methods` dit « agréée » ; `s3Security` dit « certifié PCI-DSS ». Les pages officielles consultées présentent les moyens de paiement, mais aucune attestation précise justifiant ces deux formulations n'a été établie dans cette relecture. | Fournir les justificatifs applicables ou approuver les formulations factuelles B/C. Ce constat ne signifie pas que le prestataire ne dispose d'aucune certification. |
| **JUR-05 — Données du paiement** | `billingText` évoque une transmission directe à NabooPay. Le prénom, nom et téléphone passent par la route Africa Live `/api/checkout/naboopay`, puis par l'API HTTPS de NabooPay. Les confirmations persistées sont sélectionnées et n'enregistrent pas le client brut ni un numéro de carte. | Décrire le passage par le serveur Africa Live et les données de transaction conservées, sans prétendre que les informations ne sont jamais traitées par Africa Live. Brouillon D. |
| **JUR-06 — Prestataires / transferts** | Clerk est nommé, mais les lieux de traitement, le cadre des transferts et les durées ne sont pas décrits. Le DPA public de Clerk permet des traitements là où Clerk/ses sous-traitants disposent d'installations ; il ne renseigne pas à lui seul la situation contractuelle d'Africa Live. L'hébergement effectif du staging doit être relevé lors de la publication, pas supposé à partir d'un ancien runbook. | Compléter à partir des contrats et des pays effectifs, et vérifier le cadre applicable. Ne pas inventer une résidence sénégalaise des données ni appliquer automatiquement un mécanisme européen à tous les flux. |
| **JUR-07 — Droit / remboursement** | `legal.cgu.s7Text` renvoie simplement au « droit applicable ». `s4Text1` renvoie aux conditions présentées lors du paiement sans fixer ici les règles de remboursement/rétractation. | Préciser les choix et les conditions réellement communiquées au client ; vérifier leur portée. Aucune modification des paiements, montants, droits ou remboursements automatiques dans cette préparation. |
| **JUR-08 — Durée annuelle** | Le contrat parle d'un an /12 mois ; le code `NABOOPAY_PLANS` accorde **365 jours**, et 30 jours pour le mensuel. Les prix restent 990/9 900 FCFA. | Confirmer une rédaction cohérente avec la durée effective, notamment quand l'année calendaire compte 366 jours. Il s'agit d'une clarification du texte, pas d'un changement de plan. |
| **JUR-09 — Version** | Les trois dictionnaires affichent encore le 27/09/2026. | Lors de l'application de corrections approuvées, inscrire la véritable date/version et aligner FR/EN/AR. Ne pas présenter les brouillons comme une version déjà en vigueur. |

## Éléments juridiques vérifiés pour orienter la validation

La loi sénégalaise n°2008-12 comporte des obligations d'information sur le responsable, les finalités, les données, les destinataires, la conservation et les transferts (article 58), ainsi qu'un encadrement de l'accès au terminal avec des exceptions pour certains usages nécessaires (article 61). Les transferts internationaux ont un régime spécifique (articles 49–51). Ces références appuient les questions de la fiche ; l'applicabilité et les démarches propres à Africa Live restent à valider. [Texte de la loi](https://www.archives.sn/api/fichiers/b1d86a17-d452-4546-a8a4-3fff87c1b05a?download=1), [répertoire de la CDP](https://www.cdp.sn/legislation/textes-legislatifs).

Le contrat public de Clerk distingue les traitements pour son client et certains traitements propres, et précise ses conditions d'utilisation de sous-traitants et de transfert. Les engagements applicables à Africa Live doivent être établis à partir de son contrat, et non de la seule politique générale du site Clerk. [DPA Clerk, notamment §§3–5 et 11](https://clerk.com/legal/dpa).

Le site officiel de NabooPay présente Wave, Orange Money, Visa et Mastercard. Ce relevé confirme les moyens affichés ; il ne prouve pas une attestation PCI-DSS ou un agrément déterminé. [Site NabooPay](https://www.naboopay.com/), [documentation](https://docs.naboopay.com/).

Consultation le **13 octobre 2026**. Aucune citation longue reproduite, aucune démarche administrative, contrat, demande de certification ou message envoyé à un prestataire.

## Sources applicatives inspectées

- `src/i18n/{fr,en,ar}.ts` : textes actuels et référence FR.
- `src/lib/editions.ts`, `edition-client.ts`, `edition-preference-store.ts`, `edition-halo.ts` : cookie, compte et marque de session.
- `src/components/shell/EditionSuggestion.tsx`, `AccountPreferences.tsx` : fermeture locale et application du compte.
- `src/lib/identity.ts` : suppression Clerk et compte local conservé.
- `src/app/api/checkout/naboopay/route.ts`, `src/lib/naboopay.ts`, `naboopay-payment.ts`, `src/app/api/webhooks/naboopay/route.ts` : création de paiement, données reçues, filtrage et stockage des confirmations.

Les propositions A–D sont prêtes à être examinées. Pour les autres points, la [fiche de validation](validation-proprietaire.md) attend vos faits et décisions. Toute formulation arabe ajoutée ou corrigée devra être couverte par D7 avant la publication autorisée.
