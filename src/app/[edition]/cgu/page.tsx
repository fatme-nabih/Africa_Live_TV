import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
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
  const t = getDictionary(edition).legal.cgu;
  return publicPageMetadata(edition, '/cgu', { title: t.metaTitle, description: t.metaDescription });
}

// Textes du dictionnaire (EDI-504) : la version française fait foi, les traductions le signalent en tête.
export default async function CguPage() {
  const { edition, t: dictionary } = await getI18n();
  const t = dictionary.legal.cgu;
  const rich = (text: string) => <RichText text={text} edition={edition} linkClassName="text-al-gold underline hover:text-al-gold" />;
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
          <div className="inline-flex items-center gap-2 rounded-full border border-al-gold/30 bg-al-gold/10 px-3 py-1 text-xs font-semibold text-al-gold">
            <FileText size={14} />
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
            <div className="mt-4 rounded-xl border border-al-green/20 bg-al-green/10 p-4 text-xs text-al-green">
              <p className="font-semibold flex items-center gap-2">
                <CheckCircle2 size={16} /> {t.s1BoxTitle}
              </p>
              <p className="mt-1 text-text">
                {t.s1BoxText}
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="rounded-2xl border border-line bg-surface-1/80 p-6 sm:p-8 shadow-xl shadow-black/40">
            <h2 className="text-base sm:text-lg font-bold text-text flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-al-gold/30 bg-al-gold/20 text-xs font-bold text-al-gold">2</span>
              {t.s2Title}
            </h2>
            <p className="mt-3">
              {rich(t.s2Text)}
            </p>
            <div className="mt-4 rounded-xl border border-al-gold/30 bg-al-gold/10 p-4 text-xs text-text">
              <p className="font-semibold flex items-center gap-2">
                <CheckCircle2 size={16} className="text-al-gold" /> {t.s2BoxTitle}
              </p>
              <p className="mt-1 text-text">
                {t.s2BoxText}
              </p>
            </div>
          </section>

          {/* Section 3 */}
          <section className="rounded-2xl border border-line bg-surface-1/80 p-6 sm:p-8 shadow-xl shadow-black/40">
            <h2 className="text-base sm:text-lg font-bold text-text flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-al-gold/30 bg-al-gold/20 text-xs font-bold text-al-gold">3</span>
              {t.s3Title}
            </h2>
            <p className="mt-3">
              {t.s3Text}
            </p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              <li className="rounded-xl border border-line bg-surface-1/80 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-al-gold">{t.monthlyName}</p>
                <p className="font-display mt-1 text-2xl font-bold text-text">{t.monthlyPrice} <span className="text-xs font-normal text-text-muted">{t.monthlyPeriod}</span></p>
                <p className="mt-2 text-xs text-text-muted">{t.monthlyText}</p>
              </li>
              <li className="rounded-xl border border-al-gold/30 bg-al-gold/5 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-al-gold">{t.annualName}</p>
                <p className="font-display mt-1 text-2xl font-bold text-text">{t.annualPrice} <span className="text-xs font-normal text-text-muted">{t.annualPeriod}</span></p>
                <p className="mt-2 text-xs text-text-muted">{t.annualText}</p>
              </li>
            </ul>
            <div className="mt-6 space-y-3">
              <p>
                {rich(t.s3Methods)}
              </p>
              <p>
                {rich(t.s3Security)}
              </p>
            </div>
          </section>

          {/* Section 4 */}
          <section className="rounded-2xl border border-line bg-surface-1/80 p-6 sm:p-8 shadow-xl shadow-black/40">
            <h2 className="text-base sm:text-lg font-bold text-text flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-al-gold/30 bg-al-gold/20 text-xs font-bold text-al-gold">4</span>
              {t.s4Title}
            </h2>
            <p className="mt-3">
              {t.s4Text1}
            </p>
            <p className="mt-3">
              {t.s4Text2}
            </p>
          </section>

          {/* Section 5 */}
          <section className="rounded-2xl border border-line bg-surface-1/80 p-6 sm:p-8 shadow-xl shadow-black/40">
            <h2 className="text-base sm:text-lg font-bold text-text flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-al-gold/30 bg-al-gold/20 text-xs font-bold text-al-gold">5</span>
              {t.s5Title}
            </h2>
            <div className="mt-3 flex items-start gap-3 text-text/90">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-al-gold" />
              <p>
                {t.s5Alert}
              </p>
            </div>
            <p className="mt-3">
              {t.s5Text}
            </p>
          </section>

          {/* Section 6 */}
          <section className="rounded-2xl border border-line bg-surface-1/80 p-6 sm:p-8 shadow-xl shadow-black/40">
            <h2 className="text-base sm:text-lg font-bold text-text flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-al-gold/30 bg-al-gold/20 text-xs font-bold text-al-gold">6</span>
              {t.s6Title}
            </h2>
            <p className="mt-3">
              {t.s6Text}
            </p>
          </section>

          {/* Section 7 */}
          <section className="rounded-2xl border border-line bg-surface-1/80 p-6 sm:p-8 shadow-xl shadow-black/40">
            <h2 className="text-base sm:text-lg font-bold text-text flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-al-gold/30 bg-al-gold/20 text-xs font-bold text-al-gold">7</span>
              {t.s7Title}
            </h2>
            <p className="mt-3">
              {rich(t.s7Text)}
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
