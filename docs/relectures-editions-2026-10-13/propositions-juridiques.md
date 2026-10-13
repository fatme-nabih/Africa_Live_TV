# Propositions de texte — brouillons FR · EN · AR, 13 octobre 2026

**À valider par le propriétaire ; aucun texte ci-dessous appliqué à l'application.** Les propositions couvrent les faits vérifiés dans le code. Elles ne règlent pas à elles seules l'identité de l'exploitant, les durées de conservation, les transferts ou les conditions contractuelles signalées dans la [pré-relecture](juridique-prerelecture.md).

Les traductions EN/AR sont proposées en regard du français, qui fait foi. Les passages arabes nouveaux sont à inclure dans votre validation native D7 ; les noms techniques latins doivent rester lisibles dans le sens approprié lors de leur rendu.

## A — Confidentialité : stockage et édition (JUR-01)

Emplacement proposé : remplacer `legal.privacy.s3Text`. Les autres choix de conservation du compte restent à préciser au titre de JUR-02.

**FR**

Nous utilisons le stockage local de votre navigateur pour conserver vos favoris et certaines préférences sur votre appareil. Le cookie fonctionnel al_edition mémorise l'édition choisie pendant 365 jours ; il est envoyé à Africa Live lorsque votre navigateur accède au service. La fermeture d'une suggestion de langue est mémorisée uniquement dans votre navigateur, sans expiration fixée par l'application et sans transmission de ce repère au serveur. Des repères temporaires de session assurent la présentation et l'application de votre choix d'édition.

Lorsque vous êtes connecté, un choix explicite d'édition peut également être enregistré avec votre compte, afin de servir de choix par défaut à un autre appareil sans cookie d'édition. Le choix déjà présent sur un appareil, ou celui d'un lien partagé, reste prioritaire. Vous pouvez changer d'édition avec le sélecteur et supprimer les données locales dans les réglages du navigateur. Cette suppression locale n'efface pas la préférence enregistrée dans votre compte ; vous pouvez adresser une demande relative à cette préférence via le formulaire de contact.

**EN**

We use your browser's local storage to keep your favourites and certain preferences on your device. The functional al_edition cookie remembers your chosen edition for 365 days; it is sent to Africa Live when your browser accesses the service. Dismissing a language suggestion is remembered only in your browser, with no expiry set by the application and without sending that marker to the server. Temporary session markers support the presentation and application of your edition choice.

When you are signed in, an explicit edition choice may also be saved with your account, so it can serve as the default on another device that has no edition cookie. An existing device choice, or the choice carried by a shared link, takes priority. You can change editions using the selector and remove local data in your browser settings. Removing local data does not erase the preference saved with your account; you can send a request about that preference through the contact form.

**AR — à relire D7**

نستخدم التخزين المحلي في متصفحك لحفظ مفضّلتك وبعض تفضيلاتك على جهازك. يتذكّر ملف تعريف الارتباط الوظيفي al_edition النسخة التي اخترتها لمدة 365 يومًا، ويُرسل إلى Africa Live عندما يصل متصفحك إلى الخدمة. يُحفَظ إغلاق اقتراح اللغة في متصفحك فقط، من دون مدة انتهاء يحددها التطبيق، ومن دون إرسال هذا المؤشر إلى الخادم. وتساعد مؤشرات مؤقتة خاصة بالجلسة على عرض اختيارك للنسخة وتطبيقه.

عندما تكون مسجّل الدخول، يمكن أيضًا حفظ اختيارك الصريح للنسخة مع حسابك، ليكون الاختيار الافتراضي على جهاز آخر لا يملك ملف تعريف ارتباط للنسخة. وتبقى الأولوية للاختيار الموجود على الجهاز أو للاختيار الذي يحمله رابط مشترك. يمكنك تغيير النسخة عبر أداة الاختيار، وحذف البيانات المحلية من إعدادات المتصفح. ولا يؤدي حذف هذه البيانات المحلية إلى محو التفضيل المحفوظ مع حسابك؛ ويمكنك إرسال طلب بشأن هذا التفضيل عبر نموذج الاتصال.

## B — CGU : prestataire et moyens de paiement (JUR-04)

Emplacement proposé : `legal.cgu.s3Methods`, en l'absence de justificatif de la qualification actuelle « agréée ».

**FR**

**Moyens de paiement :** Les transactions sont traitées par le prestataire de paiement **NabooPay**. Les moyens proposés comprennent la carte bancaire internationale (Visa, Mastercard), ainsi que Wave et Orange Money, notamment au Sénégal et dans la zone UEMOA, selon leur disponibilité lors du paiement.

**EN**

**Payment methods:** Transactions are processed by the payment provider **NabooPay**. The available methods include international bank cards (Visa, Mastercard), as well as Wave and Orange Money, notably in Senegal and the WAEMU region, subject to availability at checkout.

**AR — à relire D7**

**وسائل الدفع:** تُعالَج المعاملات عبر مزوّد خدمات الدفع **NabooPay**. وتشمل الوسائل المقترحة البطاقات المصرفية الدولية (Visa وMastercard)، وكذلك Wave وOrange Money، ولا سيما في السنغال ومنطقة الاتحاد الاقتصادي والنقدي لغرب أفريقيا، بحسب توفرها عند الدفع.

## C — CGU : sécurité du paiement (JUR-04)

Emplacement proposé : `legal.cgu.s3Security`, en l'absence d'attestation précise pour la mention actuelle PCI-DSS. Si une attestation est fournie et validée, le texte pourra indiquer son périmètre exact.

**FR**

**Sécurité du paiement :** Africa Live ne conserve aucun numéro de carte bancaire ni code secret de paiement. Les opérations de paiement sont réalisées dans l'environnement du prestataire NabooPay, auquel vous accédez par une connexion chiffrée.

**EN**

**Payment security:** Africa Live does not retain any bank card number or secret payment code. Payment operations take place in the NabooPay provider's environment, which you access over an encrypted connection.

**AR — à relire D7**

**أمان الدفع:** لا تحتفظ Africa Live بأي رقم بطاقة مصرفية ولا بأي رمز دفع سري. وتُنفَّذ عمليات الدفع في بيئة مزوّد الخدمة NabooPay، التي تصل إليها عبر اتصال مشفّر.

## D — Confidentialité : parcours des données de paiement (JUR-05)

Emplacement proposé : `legal.privacy.billingText`. Ne pas élargir cette proposition en promesse de non-traitement du téléphone ou de suppression automatique.

**FR**

Lorsque vous demandez un paiement, Africa Live traite le prénom, le nom et le numéro de téléphone que vous saisissez pour créer la transaction auprès de NabooPay par une connexion chiffrée. Les informations nécessaires au suivi de la commande, notamment sa référence, le forfait, le montant, la devise, le statut et les dates de paiement, sont conservées par Africa Live. Africa Live ne conserve aucun numéro de carte bancaire ni code secret de paiement.

**EN**

When you request a payment, Africa Live processes the first name, last name and phone number you enter to create the transaction with NabooPay over an encrypted connection. Africa Live retains the information needed to track the order, including its reference, plan, amount, currency, status and payment dates. Africa Live does not retain any bank card number or secret payment code.

**AR — à relire D7**

عندما تطلب إجراء دفع، تعالج Africa Live البيانات التي تدخلها، وهي الاسم واسم العائلة ورقم الهاتف، لإنشاء المعاملة لدى NabooPay عبر اتصال مشفّر. وتحتفظ Africa Live بالمعلومات اللازمة لمتابعة الطلب، ومنها مرجعه والباقة والمبلغ والعملة والحالة وتواريخ الدفع. ولا تحتفظ Africa Live بأي رقم بطاقة مصرفية ولا بأي رمز دفع سري.

## Décisions restantes

Renseigner JUR-02/03/06/07/08 dans la [fiche](validation-proprietaire.md) avant de choisir la rédaction définitive correspondante. Aucune modification des prix, de NabooPay, de l'éligibilité, de la durée accordée par le code ni des modes de lecture n'est proposée ici.
