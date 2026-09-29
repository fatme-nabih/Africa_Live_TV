import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, ShieldCheck, Lock, Database, UserCheck, EyeOff, MessageSquare } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import BrandWatermark from '@/components/BrandWatermark';

export const metadata: Metadata = {
  title: 'Politique de Confidentialité — Africa Live',
  description: 'Protection de votre vie privée, des données personnelles et règles de confidentialité sur la plateforme Africa Live.',
};

export default function PrivacyPage() {
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
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300 backdrop-blur-md">
            <ShieldCheck size={14} />
            <span>Protection des données personnelles</span>
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
            Politique de Confidentialité
          </h1>
          <p className="mt-3 text-xs sm:text-sm text-zinc-400">
            Dernière mise à jour : 27 septembre 2026 • africatv.sn
          </p>
        </header>

        {/* Content sections */}
        <article className="space-y-8 text-xs sm:text-sm leading-relaxed text-zinc-300">
          {/* Section 1 */}
          <section className="rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-xl p-6 sm:p-8 shadow-xl shadow-black/40">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-amber-400/30 bg-amber-400/20 text-xs font-bold text-amber-300">1</span>
              Engagement de transparence
            </h2>
            <p className="mt-3">
              Chez <strong>Africa Live</strong>, la protection de vos données personnelles et le respect de votre vie privée
              sont au cœur de notre architecture. Nous traitons les informations nécessaires au fonctionnement de votre compte,
              à la validation de votre abonnement, à la sécurité de l&apos;infrastructure et au suivi des demandes que vous nous envoyez.
            </p>
          </section>

          {/* Section 2 */}
          <section className="rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-xl p-6 sm:p-8 shadow-xl shadow-black/40">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-amber-400/30 bg-amber-400/20 text-xs font-bold text-amber-300">2</span>
              Données traitées et Finalités
            </h2>
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-white/[0.08] bg-black/50 p-4">
                <p className="font-semibold text-white flex items-center gap-2">
                  <UserCheck size={16} className="text-amber-400" /> Données de compte & authentification
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  Votre adresse e-mail, prénom et nom sont gérés de façon sécurisée par notre tiers d&apos;authentification <strong>Clerk</strong>.
                  Ces données permettent de vous identifier de manière unique, de sauvegarder vos favoris et de gérer votre session.
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-black/50 p-4">
                <p className="font-semibold text-white flex items-center gap-2">
                  <Lock size={16} className="text-amber-400" /> Données de facturation et de paiement
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  Lors de votre souscription via <strong>NabooPay</strong>, votre numéro de téléphone (utilisé pour les règlements
                  Wave ou Orange Money) et les données relatives à la transaction sont transmis directement à NabooPay via protocole chiffré.
                  Africa Live ne stocke <strong>aucun numéro de carte bancaire</strong> ni aucun code secret de paiement.
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-black/50 p-4">
                <p className="font-semibold text-white flex items-center gap-2">
                  <Database size={16} className="text-amber-400" /> Données techniques et de navigation
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  Votre adresse IP et votre User-Agent sont temporairement analysés pour assurer la protection contre les requêtes abusives
                  (Rate Limiting) et pour adapter le lecteur multimédia (détection de compatibilité Web HLS ou lecteur externe VLC).
                </p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-black/50 p-4">
                <p className="font-semibold text-white flex items-center gap-2">
                  <MessageSquare size={16} className="text-amber-400" /> Demandes envoyées via Contact
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  Votre nom, votre adresse e-mail, le sujet et le contenu de votre demande sont enregistrés dans la base d&apos;Africa Live pour permettre son traitement par les administrateurs actifs. Pour une demande de retrait, le nom de chaîne est également conservé. Si vous fournissez une URL de source, ses paramètres et son fragment sont supprimés avant l&apos;enregistrement.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-xl p-6 sm:p-8 shadow-xl shadow-black/40">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-amber-400/30 bg-amber-400/20 text-xs font-bold text-amber-300">3</span>
              Zéro pistage publicitaire & Stockage local
            </h2>
            <div className="flex items-start gap-3 text-emerald-300">
              <EyeOff className="mt-0.5 h-5 w-5 shrink-0" />
              <p>
                Africa Live n&apos;utilise <strong>aucun cookie publicitaire tiers</strong> et ne revend aucune donnée à des régies publicitaires.
              </p>
            </div>
            <p className="mt-3">
              Nous utilisons le stockage local de votre navigateur (<code>localStorage</code>) pour conserver vos favoris et vos
              préférences de façon immédiate et optimisée, garantissant une navigation instantanée même en cas d&apos;intermittence réseau.
            </p>
          </section>

          {/* Section 4 */}
          <section className="rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-xl p-6 sm:p-8 shadow-xl shadow-black/40">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-amber-400/30 bg-amber-400/20 text-xs font-bold text-amber-300">4</span>
              Vos droits
            </h2>
            <p className="mt-3">
              Vous disposez à tout moment d&apos;un droit d&apos;accès, de rectification, de portabilité et de suppression de vos données personnelles.
              Vous pouvez à tout moment :
            </p>
            <ul className="mt-3 list-disc pl-5 space-y-1 text-xs text-zinc-400">
              <li>Modifier votre profil et vos informations depuis votre espace <Link href="/account" className="text-amber-400 underline">Mon compte</Link>.</li>
              <li>Adresser une demande relative à vos données depuis le <Link href="/contact" className="text-amber-400 underline">formulaire de contact</Link>, en choisissant « Autre demande ».</li>
              <li>Consulter le journal de vos paiements via la référence de commande fournie lors de chaque transaction NabooPay.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-xl p-6 sm:p-8 shadow-xl shadow-black/40">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-amber-400/30 bg-amber-400/20 text-xs font-bold text-amber-300">5</span>
              Contact pour la protection des données
            </h2>
            <p className="mt-3">
              Pour toute question relative à cette politique ou pour exercer vos droits, utilisez le formulaire de <Link href="/contact" className="text-amber-400 underline">contact</Link> en précisant votre demande.
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              Adresse : Plateforme Africa Live • Domaine africatv.sn • Dakar, Sénégal
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
