import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import BrandWatermark from '@/components/BrandWatermark';

export const metadata: Metadata = {
  title: 'Conditions Générales d’Utilisation et de Vente — Africa Live',
  description: 'Conditions d’utilisation de la plateforme Africa Live, modalités d’accès au catalogue et politique de facturation NabooPay.',
};

export default function CguPage() {
  return (
    <main className="relative min-h-screen bg-black text-zinc-100 selection:bg-amber-400 selection:text-black overflow-hidden">
      <BrandWatermark />

      <div className="relative z-10 mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Navigation Bar */}
        <nav className="mb-10 flex items-center justify-between border-b border-white/[0.08] pb-5">
          <Link href="/" className="group flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/10 border border-amber-400/25 p-1">
              <BrandLogo className="h-full w-full" />
            </div>
            <span className="text-base font-bold tracking-tight text-white group-hover:text-amber-300 transition">
              Africa Live
            </span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-semibold text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white backdrop-blur-sm"
          >
            <ArrowLeft size={14} />
            <span>Accueil</span>
          </Link>
        </nav>

        {/* Header */}
        <header className="mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300 backdrop-blur-md">
            <FileText size={14} />
            <span>Document contractuel • Version en vigueur</span>
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
            Conditions Générales d’Utilisation & de Vente
          </h1>
          <p className="mt-3 text-xs sm:text-sm text-zinc-400">
            Dernière mise à jour : 27 septembre 2026 • Plateforme éditée sur le domaine africatv.sn
          </p>
        </header>

        {/* Content sections */}
        <article className="space-y-8 text-xs sm:text-sm leading-relaxed text-zinc-300">
          {/* Section 1 */}
          <section className="rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-xl p-6 sm:p-8 shadow-xl shadow-black/40">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-amber-400/30 bg-amber-400/20 text-xs font-bold text-amber-300">1</span>
              Objet du service
            </h2>
            <p className="mt-3">
              <strong>Africa Live</strong> est une application qui organise un catalogue de chaînes et de sources, normalise certaines métadonnées et vérifie des caractéristiques techniques de disponibilité et de compatibilité. Les informations et sources affichées peuvent provenir de tiers; leur présence dans le catalogue ne signifie pas qu&apos;Africa Live est affiliée au diffuseur ni que celui-ci a autorisé leur référencement.
            </p>
            <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-300 backdrop-blur-md">
              <p className="font-semibold flex items-center gap-2">
                <CheckCircle2 size={16} /> Transmission directe sans relais
              </p>
              <p className="mt-1 text-zinc-300">
                Pour les sources qui le permettent, le lecteur de votre terminal se connecte directement à la source. Africa Live ne fournit pas de relais vidéo ni de conversion du flux. Les contrôles techniques de disponibilité peuvent toutefois effectuer des requêtes auprès des sources et recevoir des réponses limitées.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-xl p-6 sm:p-8 shadow-xl shadow-black/40">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-amber-400/30 bg-amber-400/20 text-xs font-bold text-amber-300">2</span>
              Création de compte & Accès
            </h2>
            <p className="mt-3">
              La consultation du catalogue et les fonctions liées au compte nécessitent la création d&apos;un compte personnel. L&apos;authentification est opérée par notre
              partenaire <strong>Clerk</strong>. L&apos;utilisateur s&apos;engage à fournir des informations véridiques et à préserver
              la stricte confidentialité de ses identifiants.
            </p>
            <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-xs text-amber-200 backdrop-blur-md">
              <p className="font-semibold flex items-center gap-2">
                <CheckCircle2 size={16} className="text-amber-400" /> Période d&apos;essai gratuit de 5 jours
              </p>
              <p className="mt-1 text-zinc-300">
                Tout nouvel utilisateur bénéficie automatiquement à compter de son inscription d&apos;une période d&apos;essai de cinq (5) jours. Pendant cette période, l&apos;application et la lecture sont accessibles. Après l&apos;essai, le catalogue reste consultable avec un compte, mais un abonnement actif est requis pour lancer une source et utiliser les fonctions de lecture.
              </p>
            </div>
          </section>

          {/* Section 3 */}
          <section className="rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-xl p-6 sm:p-8 shadow-xl shadow-black/40">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-amber-400/30 bg-amber-400/20 text-xs font-bold text-amber-300">3</span>
              Tarifs et Paiements NabooPay
            </h2>
            <p className="mt-3">
              L&apos;abonnement donne accès à l&apos;application et à ses fonctions pendant la période choisie, notamment au lancement des sources techniquement disponibles et compatibles. Il s&apos;agit d&apos;un abonnement au service Africa Live; l&apos;application ne vend pas les chaînes à l&apos;unité. Le catalogue reste consultable avec un compte même sans abonnement actif, mais le lancement des sources nécessite un abonnement.
            </p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              <li className="rounded-xl border border-white/[0.08] bg-black/50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-400">Forfait Mensuel</p>
                <p className="mt-1 text-2xl font-black text-white">990 FCFA <span className="text-xs font-normal text-zinc-400">TTC / 30 jours</span></p>
                <p className="mt-2 text-xs text-zinc-400">Accès à l’application et à ses fonctions, y compris la lecture des sources compatibles.</p>
              </li>
              <li className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-300">Forfait Annuel</p>
                <p className="mt-1 text-2xl font-black text-white">9 900 FCFA <span className="text-xs font-normal text-zinc-400">TTC / an</span></p>
                <p className="mt-2 text-xs text-zinc-400">12 mois d&apos;accès à l’application et à la lecture des sources compatibles, pour le tarif de 10 mois (2 mois offerts).</p>
              </li>
            </ul>
            <div className="mt-6 space-y-3">
              <p>
                <strong>Moyens de paiement acceptés :</strong> Les transactions sont traitées par la passerelle agréée <strong>NabooPay</strong>.
                L&apos;utilisateur peut régler ses abonnements via les solutions de Mobile Money locales (Wave, Orange Money) ou
                par carte bancaire internationale (Visa, Mastercard).
              </p>
              <p>
                <strong>Sécurité bancaire :</strong> Africa Live ne stocke aucune coordonnée bancaire. Toutes les opérations de paiement
                sont exécutées sur l&apos;environnement chiffré et sécurisé de NabooPay (certifié PCI-DSS).
              </p>
            </div>
          </section>

          {/* Section 4 */}
          <section className="rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-xl p-6 sm:p-8 shadow-xl shadow-black/40">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-amber-400/30 bg-amber-400/20 text-xs font-bold text-amber-300">4</span>
              Droit de rétractation et Résiliation
            </h2>
            <p className="mt-3">
              Les modalités de résiliation, de remboursement et, le cas échéant, de rétractation sont celles présentées au moment de la souscription et du paiement, sous réserve des règles impératives applicables.
            </p>
            <p className="mt-3">
              Chaque période souscrite (mensuelle ou annuelle) est acquise pour sa durée totale. L&apos;abonnement n&apos;est pas
              soumis à reconduction tacite obligatoire : l&apos;utilisateur renouvelle librement son forfait à échéance s&apos;il
              souhaite maintenir son accès.
            </p>
          </section>

          {/* Section 5 */}
          <section className="rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-xl p-6 sm:p-8 shadow-xl shadow-black/40">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-amber-400/30 bg-amber-400/20 text-xs font-bold text-amber-300">5</span>
              Disponibilité des flux & Responsabilité
            </h2>
            <div className="mt-3 flex items-start gap-3 text-amber-200/90">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <p>
                La disponibilité, la compatibilité et la qualité d&apos;une source tierce peuvent changer sans préavis et dépendent de facteurs qu&apos;Africa Live ne contrôle pas.
              </p>
            </div>
            <p className="mt-3">
              Africa Live vérifie périodiquement des caractéristiques techniques des sources. Un résultat de contrôle reflète l&apos;état observé au moment du test et ne garantit ni la disponibilité future ni les droits associés à la source. Une source peut être désactivée ou retirée du catalogue après vérification ou signalement.
            </p>
          </section>

          {/* Section 6 */}
          <section className="rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-xl p-6 sm:p-8 shadow-xl shadow-black/40">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-amber-400/30 bg-amber-400/20 text-xs font-bold text-amber-300">6</span>
              Usage loyal et Propriété intellectuelle
            </h2>
            <p className="mt-3">
              Le service est strictement réservé à un usage privé, personnel et non commercial. L&apos;utilisateur s&apos;interdit
              tout acte d&apos;aspiration automatisée (scraping), d&apos;extraction massive de flux, de rétro-ingénierie, ou de rediffusion
              publique non autorisée. Les marques, logos et flux demeurent la propriété exclusive de leurs diffuseurs respectifs.
            </p>
          </section>

          {/* Section 7 */}
          <section className="rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-xl p-6 sm:p-8 shadow-xl shadow-black/40">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-amber-400/30 bg-amber-400/20 text-xs font-bold text-amber-300">7</span>
              Droit applicable & Litiges
            </h2>
            <p className="mt-3">
              Les présentes conditions sont soumises au droit applicable. Pour toute question ou demande relative à une chaîne ou une source, utilisez le formulaire de <Link href="/contact" className="text-amber-400 underline hover:text-amber-300">contact et de signalement</Link>. La demande est enregistrée dans un espace privé réservé aux administrateurs actifs; son envoi ne préjuge pas de la décision de traitement.
            </p>
          </section>
        </article>

        {/* Footer link */}
        <div className="mt-12 border-t border-white/[0.08] pt-6 text-center text-xs text-zinc-500">
          <p>© {new Date().getFullYear()} Africa Live (africatv.sn) • Tous droits réservés.</p>
        </div>
      </div>
    </main>
  );
}
