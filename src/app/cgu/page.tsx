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
              <strong>Africa Live</strong> est une plateforme technologique d’agrégation et d’organisation de programmes
              audiovisuels linéaires. Elle propose une interface moderne permettant d’accéder directement, depuis un navigateur
              ou un lecteur externe compatible (tel que VLC Media Player), à des flux télévisuels publics et légitimes émis
              par leurs diffuseurs d&apos;origine respectifs.
            </p>
            <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-300 backdrop-blur-md">
              <p className="font-semibold flex items-center gap-2">
                <CheckCircle2 size={16} /> Transmission directe sans relais
              </p>
              <p className="mt-1 text-zinc-300">
                Africa Live n&apos;héberge, ne stocke, ne convertit et ne retransmet aucun flux vidéo ou média sur ses serveurs.
                La connexion s&apos;établit exclusivement entre le terminal de l&apos;utilisateur et la source amont officielle du diffuseur.
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
              L&apos;accès au catalogue complet et aux fonctionnalités personnalisées (gestion des favoris, reprise de lecture)
              nécessite la création d&apos;un compte personnel. L&apos;authentification est opérée de manière sécurisée par notre
              partenaire <strong>Clerk</strong>. L&apos;utilisateur s&apos;engage à fournir des informations véridiques et à préserver
              la stricte confidentialité de ses identifiants.
            </p>
            <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-xs text-amber-200 backdrop-blur-md">
              <p className="font-semibold flex items-center gap-2">
                <CheckCircle2 size={16} className="text-amber-400" /> Période d&apos;essai gratuit de 5 jours
              </p>
              <p className="mt-1 text-zinc-300">
                Tout nouvel utilisateur bénéficie automatiquement dès son inscription d&apos;une période d&apos;essai sans engagement de cinq (5) jours consécutifs, sans obligation de renseigner un moyen de paiement. À l&apos;expiration de ces 5 jours, l&apos;accès aux flux directs requiert la souscription de l&apos;un des forfaits prévus à l&apos;article 3.
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
              L&apos;accès à la plateforme est proposé sous forme d&apos;abonnements forfaitaires sans engagement de durée :
            </p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              <li className="rounded-xl border border-white/[0.08] bg-black/50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-400">Forfait Mensuel</p>
                <p className="mt-1 text-2xl font-black text-white">990 FCFA <span className="text-xs font-normal text-zinc-400">TTC / 30 jours</span></p>
                <p className="mt-2 text-xs text-zinc-400">Accès intégral au catalogue et à toutes les fonctionnalités.</p>
              </li>
              <li className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-300">Forfait Annuel</p>
                <p className="mt-1 text-2xl font-black text-white">9 900 FCFA <span className="text-xs font-normal text-zinc-400">TTC / an</span></p>
                <p className="mt-2 text-xs text-zinc-400">12 mois d&apos;accès pour le tarif de 10 mois (2 mois offerts).</p>
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
              Conformément aux règles applicables aux contenus numériques fournis sur support immatériel et exécutés immédiatement
              après accord du client, l&apos;utilisateur renonce expressément à son droit de rétractation dès la première activation
              du service suite à la validation du paiement.
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
                La disponibilité, la pérennité et la qualité d&apos;image d&apos;un flux dépendent exclusivement de l&apos;infrastructure
                et des décisions éditoriales du diffuseur d&apos;origine.
              </p>
            </div>
            <p className="mt-3">
              Africa Live déploie un système continu de surveillance automatisée pour qualifier la santé des flux (compatibilité Web HLS
              ou lecteur externe VLC). Néanmoins, l&apos;interruption temporaire ou définitive d&apos;une source par son émetteur
              ne constitue pas un défaut du service Africa Live dès lors que l&apos;infrastructure de catalogage et d&apos;indexation
              demeure opérationnelle.
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
              Les présentes conditions sont soumises à la législation en vigueur. En cas de réclamation ou de litige, l&apos;utilisateur
              est invité à contacter en priorité notre assistance à l&apos;adresse <strong>contact@africatv.sn</strong> ou via notre
              page de <Link href="/contact" className="text-amber-400 underline hover:text-amber-300">support client</Link> afin
              de rechercher une solution amiable.
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
