import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, ShieldCheck, Lock, Database, UserCheck, EyeOff, MessageSquare } from 'lucide-react';
import BrandBackdrop from '@/components/brand/BrandBackdrop';
import BrandMark from '@/components/brand/BrandMark';
import RichText, { YearText } from '@/components/marketing/RichText';
import { getEdition } from '@/i18n/edition';
import { getI18n } from '@/i18n/server';
import { getDictionary } from '@/i18n/dictionary';
import { publicPageMetadata } from '@/i18n/metadata';
import { editionHref } from '@/lib/edition-routing';

export async function generateMetadata(): Promise<Metadata> {
  const edition = await getEdition();
  const t = getDictionary(edition).legal.privacy;
  return publicPageMetadata(edition, '/privacy', { title: t.metaTitle, description: t.metaDescription });
}

// Textes du dictionnaire (EDI-504) : la version française fait foi, les traductions le signalent en tête.
export default async function PrivacyPage() {
  const { edition, t: dictionary } = await getI18n();
  const t = dictionary.legal.privacy;
  const rich = (text: string) => <RichText text={text} edition={edition} linkClassName="text-al-gold underline" />;
  return (
    <main className="relative min-h-screen bg-black text-text selection:bg-al-yellow selection:text-black overflow-hidden">
      <BrandBackdrop variant="quiet" />

      <div className="relative z-10 mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Navigation Bar */}
        <nav className="mb-10 flex items-center justify-between border-b border-line pb-5">
          <BrandMark />

          <Link
            href={editionHref('/', edition)}
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-white/[0.04] px-3.5 py-1.5 text-xs font-semibold text-text transition hover:border-white/20 hover:bg-white/[0.08] hover:text-text"
          >
            <ArrowLeft className="rtl:-scale-x-100" size={14} />
            <span>{dictionary.legal.home}</span>
          </Link>
        </nav>

        {/* Header */}
        <header className="mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-al-green/30 bg-al-green/10 px-3 py-1 text-xs font-semibold text-al-green">
            <ShieldCheck size={14} />
            <span>{t.badge}</span>
          </div>
          <h1 className="font-display mt-4 text-3xl font-bold tracking-tight text-text sm:text-4xl">
            {t.title}
          </h1>
          <p className="mt-3 text-xs sm:text-sm text-text-muted">
            {t.updated}
          </p>
          {edition !== 'fr' && <p className="mt-2 text-xs sm:text-sm font-semibold text-al-gold">{dictionary.legal.frenchPrevails}</p>}
        </header>

        {/* Content sections */}
        <article className="space-y-8 text-xs sm:text-sm leading-relaxed text-text">
          {/* Section 1 */}
          <section className="rounded-2xl border border-line bg-surface-1/80 p-6 sm:p-8 shadow-xl shadow-black/40">
            <h2 className="text-base sm:text-lg font-bold text-text flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-al-gold/30 bg-al-gold/20 text-xs font-bold text-al-gold">1</span>
              {t.s1Title}
            </h2>
            <p className="mt-3">
              {rich(t.s1Text)}
            </p>
          </section>

          {/* Section 2 */}
          <section className="rounded-2xl border border-line bg-surface-1/80 p-6 sm:p-8 shadow-xl shadow-black/40">
            <h2 className="text-base sm:text-lg font-bold text-text flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-al-gold/30 bg-al-gold/20 text-xs font-bold text-al-gold">2</span>
              {t.s2Title}
            </h2>
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-line bg-surface-1/80 p-4">
                <p className="font-semibold text-text flex items-center gap-2">
                  <UserCheck size={16} className="text-al-gold" /> {t.accountTitle}
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  {rich(t.accountText)}
                </p>
              </div>

              <div className="rounded-xl border border-line bg-surface-1/80 p-4">
                <p className="font-semibold text-text flex items-center gap-2">
                  <Lock size={16} className="text-al-gold" /> {t.billingTitle}
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  {rich(t.billingText)}
                </p>
              </div>

              <div className="rounded-xl border border-line bg-surface-1/80 p-4">
                <p className="font-semibold text-text flex items-center gap-2">
                  <Database size={16} className="text-al-gold" /> {t.techTitle}
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  {t.techText}
                </p>
              </div>
              <div className="rounded-xl border border-line bg-surface-1/80 p-4">
                <p className="font-semibold text-text flex items-center gap-2">
                  <MessageSquare size={16} className="text-al-gold" /> {t.requestsTitle}
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  {t.requestsText}
                </p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="rounded-2xl border border-line bg-surface-1/80 p-6 sm:p-8 shadow-xl shadow-black/40">
            <h2 className="text-base sm:text-lg font-bold text-text flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-al-gold/30 bg-al-gold/20 text-xs font-bold text-al-gold">3</span>
              {t.s3Title}
            </h2>
            <div className="flex items-start gap-3 text-al-green">
              <EyeOff className="mt-0.5 h-5 w-5 shrink-0" />
              <p>
                {rich(t.s3Alert)}
              </p>
            </div>
            <p className="mt-3">
              {rich(t.s3Text)}
            </p>
          </section>

          {/* Section 4 */}
          <section className="rounded-2xl border border-line bg-surface-1/80 p-6 sm:p-8 shadow-xl shadow-black/40">
            <h2 className="text-base sm:text-lg font-bold text-text flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-al-gold/30 bg-al-gold/20 text-xs font-bold text-al-gold">4</span>
              {t.s4Title}
            </h2>
            <p className="mt-3">
              {t.s4Text}
            </p>
            <ul className="mt-3 list-disc ps-5 space-y-1 text-xs text-text-muted">
              {t.s4Items.map(item => <li key={item}>{rich(item)}</li>)}
            </ul>
          </section>

          {/* Section 5 */}
          <section className="rounded-2xl border border-line bg-surface-1/80 p-6 sm:p-8 shadow-xl shadow-black/40">
            <h2 className="text-base sm:text-lg font-bold text-text flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-al-gold/30 bg-al-gold/20 text-xs font-bold text-al-gold">5</span>
              {t.s5Title}
            </h2>
            <p className="mt-3">
              {rich(t.s5Text)}
            </p>
            <p className="mt-1 text-xs text-text-muted">
              {t.s5Address}
            </p>
          </section>
        </article>

        {/* Footer link */}
        <div className="mt-12 border-t border-line pt-6 text-center text-xs text-text-muted">
          <p><YearText template={dictionary.legal.rights} /></p>
        </div>
      </div>
    </main>
  );
}
