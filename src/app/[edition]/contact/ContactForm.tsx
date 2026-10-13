'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  MessageSquare,
  HelpCircle,
  Tv,
  CreditCard,
  Send,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import BrandBackdrop from '@/components/brand/BrandBackdrop';
import BrandMark from '@/components/brand/BrandMark';
import RichText, { YearText } from '@/components/marketing/RichText';
import { Button, ErrorState } from '@/components/ui';
import { useI18n } from '@/i18n/client';
import { editionHref } from '@/lib/edition-routing';

const SUBJECTS = ['playback', 'billing', 'channel', 'removal', 'partnership', 'other'] as const;

export default function ContactForm() {
  const { t: dictionary, edition } = useI18n();
  const t = dictionary.contact;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('playback');
  const [message, setMessage] = useState('');
  const [channelName, setChannelName] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [website, setWebsite] = useState('');
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;

    setLoading(true);
    setSubmitError(null);
    try {
      const response = await fetch('/api/contact-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message, channelName, sourceUrl, website }),
      });
      const result = await response.json() as { requestId?: string; error?: string };
      if (!response.ok) {
        // Le message d'erreur du serveur est français : les autres éditions affichent le leur.
        setSubmitError(edition === 'fr' ? result.error ?? t.saveFailed : t.saveFailed);
        return;
      }
      setSubmitted(result.requestId ?? '');
    } catch {
      setSubmitError(t.network);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen bg-black text-text selection:bg-al-yellow selection:text-black overflow-hidden">
      <BrandBackdrop variant="app" />

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Navigation Bar */}
        <nav className="mb-10 flex items-center justify-between border-b border-line pb-5">
          <BrandMark />

          <Link
            href={editionHref('/', edition)}
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-white/[0.04] px-3.5 py-1.5 text-xs font-semibold text-text transition hover:border-white/20 hover:bg-white/[0.08] hover:text-text"
          >
            <ArrowLeft className="rtl:-scale-x-100" size={14} />
            <span>{t.home}</span>
          </Link>
        </nav>

        {/* Header */}
        <header className="mb-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-al-gold/30 bg-al-gold/10 px-3 py-1 text-xs font-semibold text-al-gold">
            <MessageSquare size={14} />
            <span>{t.badge}</span>
          </div>
          <h1 className="font-display mt-4 text-3xl font-bold tracking-tight text-text sm:text-4xl">
            {t.title}
          </h1>
          <p className="mt-3 text-xs sm:text-sm leading-relaxed text-text-muted">
            {t.lead}
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
            {/* Intake route & Quick help */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-line bg-surface-1/80 p-6 shadow-xl shadow-black/40">
              <h2 className="text-base font-bold text-text flex items-center gap-2">
                <MessageSquare size={16} className="text-al-gold" /> {t.processingTitle}
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-text-muted">
                {t.processingText}
              </p>
            </div>

            {/* Quick answers pills */}
            <div className="rounded-2xl border border-line bg-surface-1/80 p-6 shadow-xl shadow-black/40">
              <h2 className="text-base font-bold text-text flex items-center gap-2">
                <HelpCircle size={16} className="text-al-gold" /> {t.quickTitle}
              </h2>
              <div className="mt-4 space-y-3 text-xs text-text">
                <div className="flex items-start gap-3">
                  <Tv className="mt-0.5 h-4 w-4 shrink-0 text-al-gold" />
                  <div>
                    <p className="font-semibold text-text">{t.webTitle}</p>
                    <p className="mt-0.5 text-text-muted">
                      {t.webText}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 pt-3 border-t border-line">
                  <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-al-gold" />
                  <div>
                    <p className="font-semibold text-text">{t.paymentTitle}</p>
                    <p className="mt-0.5 text-text-muted">
                      <RichText text={t.paymentText} edition={edition} linkClassName="text-al-gold underline" />
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact form */}
          <div className="rounded-2xl border border-line bg-surface-1/80 p-6 sm:p-8 shadow-xl shadow-black/40">
            <h2 className="font-display text-lg font-bold text-text">{t.formTitle}</h2>
            <p className="mt-1 text-xs text-text-muted">
              {t.formLead}
            </p>

            {submitted !== null ? (
              <div className="mt-8 rounded-xl border border-al-green/30 bg-al-green/10 p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-al-green/20 text-al-green border border-al-green/30">
                  <CheckCircle2 size={24} />
                </div>
                <h3 className="mt-4 text-base font-bold text-text">{t.doneTitle}</h3>
                <p className="mt-2 text-xs leading-relaxed text-text">
                  <RichText text={t.doneText} edition={edition} values={{ name }} />
                  {submitted && <RichText text={t.reference} edition={edition} values={{ id: submitted }} />}
                </p>
                <button
                  type="button"
                  onClick={() => { setSubmitted(null); setMessage(''); setChannelName(''); setSourceUrl(''); }}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] hover:bg-white/[0.1] px-4 py-2 text-xs font-semibold text-text transition"
                >
                  {t.another}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-xs">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="name" className="block font-medium text-text">
                      {t.name}
                    </label>
                    <input
                      id="name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t.namePlaceholder}
                      className="mt-1.5 w-full rounded-xl border border-line bg-white/[0.03] px-3.5 py-2 text-xs text-text placeholder:text-text-muted focus:border-al-gold focus:outline-none focus:ring-1 focus:ring-al-gold transition"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block font-medium text-text">
                      {t.email}
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      // Adresse e-mail : toujours de gauche à droite, y compris dans l'édition arabe.
                      dir="ltr"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t.emailPlaceholder}
                      className="mt-1.5 w-full rounded-xl border border-line bg-white/[0.03] px-3.5 py-2 text-xs text-text placeholder:text-text-muted focus:border-al-gold focus:outline-none focus:ring-1 focus:ring-al-gold transition"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="subject" className="block font-medium text-text">
                    {t.subject}
                  </label>
                  <select
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-line bg-black/60 px-3.5 py-2 text-xs text-text focus:border-al-gold focus:outline-none focus:ring-1 focus:ring-al-gold transition"
                  >
                    {SUBJECTS.map(id => <option key={id} value={id}>{t.subjects[id]}</option>)}
                  </select>
                </div>

                {subject === 'removal' && (
                  <>
                    <div>
                      <label htmlFor="channelName" className="block font-medium text-text">{t.channelName}</label>
                      <input id="channelName" type="text" required maxLength={200} value={channelName}
                        onChange={(e) => setChannelName(e.target.value)} placeholder={t.channelPlaceholder}
                        className="mt-1.5 w-full rounded-xl border border-line bg-white/[0.03] px-3.5 py-2 text-xs text-text placeholder:text-text-muted focus:border-al-gold focus:outline-none focus:ring-1 focus:ring-al-gold transition" />
                    </div>
                    <div>
                      <label htmlFor="sourceUrl" className="block font-medium text-text">{t.sourceUrl}</label>
                      <input id="sourceUrl" type="url" maxLength={2048} value={sourceUrl} dir="ltr"
                        onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://…"
                        className="mt-1.5 w-full rounded-xl border border-line bg-white/[0.03] px-3.5 py-2 text-xs text-text placeholder:text-text-muted focus:border-al-gold focus:outline-none focus:ring-1 focus:ring-al-gold transition" />
                      <p className="mt-1 text-xs text-text-muted">{t.sourceHelp}</p>
                    </div>
                  </>
                )}

                <div>
                  <label htmlFor="message" className="block font-medium text-text">
                    {t.message}
                  </label>
                  <textarea
                    id="message"
                    required
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t.messagePlaceholder}
                    className="mt-1.5 w-full rounded-xl border border-line bg-white/[0.03] px-3.5 py-2 text-xs text-text placeholder:text-text-muted focus:border-al-gold focus:outline-none focus:ring-1 focus:ring-al-gold transition"
                  />
                </div>

                <div className="hidden" aria-hidden="true">
                  <label htmlFor="website">{t.honeypot}</label>
                  <input id="website" type="text" autoComplete="off" tabIndex={-1} value={website} onChange={(e) => setWebsite(e.target.value)} />
                </div>

                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <AlertCircle size={13} className="shrink-0" />
                  <span>{t.notice}</span>
                </div>

                {submitError && <ErrorState title={t.errorTitle} description={submitError} />}

                <Button type="submit" variant="primary" block disabled={loading} icon={<Send size={14} aria-hidden="true" />}>
                  <span>{loading ? t.sending : t.send}</span>
                </Button>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 border-t border-line pt-6 text-center text-xs text-text-muted">
          <p><YearText template={t.footer} /></p>
        </div>
      </div>
    </main>
  );
}
