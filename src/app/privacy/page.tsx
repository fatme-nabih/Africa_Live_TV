import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, ShieldCheck, Lock, Database, UserCheck, EyeOff, MessageSquare } from 'lucide-react';
import BrandBackdrop from '@/components/brand/BrandBackdrop';
import BrandMark from '@/components/brand/BrandMark';

export const metadata: Metadata = {
  title: 'Politique de Confidentialité — Africa Live',
  description: 'Protection de votre vie privée, des données personnelles et règles de confidentialité sur la plateforme Africa Live.',
};

export default function PrivacyPage() {
  return (
    <main className="relative min-h-screen bg-black text-text selection:bg-al-yellow selection:text-black overflow-hidden">
      <BrandBackdrop variant="quiet" />

      <div className="relative z-10 mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Navigation Bar */}
        <nav className="mb-10 flex items-center justify-between border-b border-line pb-5">
          <BrandMark />

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-white/[0.04] px-3.5 py-1.5 text-xs font-semibold text-text transition hover:border-white/20 hover:bg-white/[0.08] hover:text-text"
          >
            <ArrowLeft size={14} />
            <span>Accueil</span>
          </Link>
        </nav>

        {/* Header */}
        <header className="mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-al-green/30 bg-al-green/10 px-3 py-1 text-xs font-semibold text-al-green">
            <ShieldCheck size={14} />
            <span>Protection des données personnelles</span>
          </div>
          <h1 className="font-display mt-4 text-3xl font-bold tracking-tight text-text sm:text-4xl">
            Politique de Confidentialité
          </h1>
          <p className="mt-3 text-xs sm:text-sm text-text-muted">
            Dernière mise à jour : 27 septembre 2026 • africatv.sn
          </p>
        </header>

        {/* Content sections */}
        <article className="space-y-8 text-xs sm:text-sm leading-relaxed text-text">
          {/* Section 1 */}
          <section className="rounded-2xl border border-line bg-surface-1/80 p-6 sm:p-8 shadow-xl shadow-black/40">
            <h2 className="text-base sm:text-lg font-bold text-text flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-al-gold/30 bg-al-gold/20 text-xs font-bold text-al-gold">1</span>
              Engagement de transparence
            </h2>
            <p className="mt-3">
              Chez <strong>Africa Live</strong>, la protection de vos données personnelles et le respect de votre vie privée
              sont au cœur de notre architecture. Nous traitons les informations nécessaires au fonctionnement de votre compte,
              à la validation de votre abonnement, à la sécurité de l&apos;infrastructure et au suivi des demandes que vous nous envoyez.
            </p>
          </section>

          {/* Section 2 */}
          <section className="rounded-2xl border border-line bg-surface-1/80 p-6 sm:p-8 shadow-xl shadow-black/40">
            <h2 className="text-base sm:text-lg font-bold text-text flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-al-gold/30 bg-al-gold/20 text-xs font-bold text-al-gold">2</span>
              Données traitées et Finalités
            </h2>
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-line bg-surface-1/80 p-4">
                <p className="font-semibold text-text flex items-center gap-2">
                  <UserCheck size={16} className="text-al-gold" /> Données de compte & authentification
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  Votre adresse e-mail, prénom et nom sont gérés de façon sécurisée par notre tiers d&apos;authentification <strong>Clerk</strong>.
                  Ces données permettent de vous identifier de manière unique, de sauvegarder vos favoris et de gérer votre session.
                </p>
              </div>

              <div className="rounded-xl border border-line bg-surface-1/80 p-4">
                <p className="font-semibold text-text flex items-center gap-2">
                  <Lock size={16} className="text-al-gold" /> Données de facturation et de paiement
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  Lors de votre souscription via <strong>NabooPay</strong>, votre numéro de téléphone (utilisé pour les règlements
                  Wave ou Orange Money) et les données relatives à la transaction sont transmis directement à NabooPay via protocole chiffré.
                  Africa Live ne stocke <strong>aucun numéro de carte bancaire</strong> ni aucun code secret de paiement.
                </p>
              </div>

              <div className="rounded-xl border border-line bg-surface-1/80 p-4">
                <p className="font-semibold text-text flex items-center gap-2">
                  <Database size={16} className="text-al-gold" /> Données techniques et de navigation
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  Votre adresse IP et votre User-Agent sont temporairement analysés pour assurer la protection contre les requêtes abusives
                  (Rate Limiting) et pour adapter le lecteur multimédia (détection de compatibilité Web HLS ou lecteur externe VLC).
                </p>
              </div>
              <div className="rounded-xl border border-line bg-surface-1/80 p-4">
                <p className="font-semibold text-text flex items-center gap-2">
                  <MessageSquare size={16} className="text-al-gold" /> Demandes envoyées via Contact
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  Votre nom, votre adresse e-mail, le sujet et le contenu de votre demande sont enregistrés dans la base d&apos;Africa Live pour permettre son traitement par les administrateurs actifs. Pour une demande de retrait, le nom de chaîne est également conservé. Si vous fournissez une URL de source, ses paramètres et son fragment sont supprimés avant l&apos;enregistrement.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="rounded-2xl border border-line bg-surface-1/80 p-6 sm:p-8 shadow-xl shadow-black/40">
            <h2 className="text-base sm:text-lg font-bold text-text flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-al-gold/30 bg-al-gold/20 text-xs font-bold text-al-gold">3</span>
              Zéro pistage publicitaire & Stockage local
            </h2>
            <div className="flex items-start gap-3 text-al-green">
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
          <section className="rounded-2xl border border-line bg-surface-1/80 p-6 sm:p-8 shadow-xl shadow-black/40">
            <h2 className="text-base sm:text-lg font-bold text-text flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-al-gold/30 bg-al-gold/20 text-xs font-bold text-al-gold">4</span>
              Vos droits
            </h2>
            <p className="mt-3">
              Vous disposez à tout moment d&apos;un droit d&apos;accès, de rectification, de portabilité et de suppression de vos données personnelles.
              Vous pouvez à tout moment :
            </p>
            <ul className="mt-3 list-disc pl-5 space-y-1 text-xs text-text-muted">
              <li>Modifier votre profil et vos informations depuis votre espace <Link href="/account" className="text-al-gold underline">Mon compte</Link>.</li>
              <li>Adresser une demande relative à vos données depuis le <Link href="/contact" className="text-al-gold underline">formulaire de contact</Link>, en choisissant « Autre demande ».</li>
              <li>Consulter le journal de vos paiements via la référence de commande fournie lors de chaque transaction NabooPay.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="rounded-2xl border border-line bg-surface-1/80 p-6 sm:p-8 shadow-xl shadow-black/40">
            <h2 className="text-base sm:text-lg font-bold text-text flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-al-gold/30 bg-al-gold/20 text-xs font-bold text-al-gold">5</span>
              Contact pour la protection des données
            </h2>
            <p className="mt-3">
              Pour toute question relative à cette politique ou pour exercer vos droits, utilisez le formulaire de <Link href="/contact" className="text-al-gold underline">contact</Link> en précisant votre demande.
            </p>
            <p className="mt-1 text-xs text-text-muted">
              Adresse : Plateforme Africa Live • Domaine africatv.sn • Dakar, Sénégal
            </p>
          </section>
        </article>

        {/* Footer link */}
        <div className="mt-12 border-t border-line pt-6 text-center text-xs text-text-muted">
          <p>© {new Date().getFullYear()} Africa Live (africatv.sn) • Tous droits réservés.</p>
        </div>
      </div>
    </main>
  );
}
