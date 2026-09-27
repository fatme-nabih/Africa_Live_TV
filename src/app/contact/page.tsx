'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Mail,
  MessageSquare,
  HelpCircle,
  Tv,
  CreditCard,
  Send,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import BrandWatermark from '@/components/BrandWatermark';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('playback');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 600);
  };

  return (
    <main className="relative min-h-screen bg-black text-zinc-100 selection:bg-amber-400 selection:text-black overflow-hidden">
      <BrandWatermark />

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
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
        <header className="mb-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300 backdrop-blur-md">
            <MessageSquare size={14} />
            <span>Assistance & Support Client</span>
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
            Comment pouvons-nous vous aider ?
          </h1>
          <p className="mt-3 text-xs sm:text-sm leading-relaxed text-zinc-400">
            Une question sur votre abonnement NabooPay, un problème de lecture sur une chaîne, ou une suggestion d&apos;ajout ?
            Notre équipe vous répond sous 24h ouvrées.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
          {/* Direct channels & Quick help */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-xl p-6 shadow-xl shadow-black/40">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Mail size={16} className="text-amber-400" /> Contacts directs
              </h2>
              <p className="mt-2 text-xs text-zinc-400">
                Vous pouvez également nous joindre directement par courrier électronique :
              </p>

              <div className="mt-4 space-y-3 text-xs">
                <div className="rounded-xl border border-white/[0.08] bg-black/50 p-4">
                  <p className="font-bold text-white">Support Technique & Streaming</p>
                  <a href="mailto:support@africatv.sn" className="mt-1 block text-amber-400 hover:underline">
                    support@africatv.sn
                  </a>
                  <p className="mt-1 text-[11px] text-zinc-500">Pour tout souci d&apos;ouverture Web ou VLC</p>
                </div>

                <div className="rounded-xl border border-white/[0.08] bg-black/50 p-4">
                  <p className="font-bold text-white">Facturation & Abonnements NabooPay</p>
                  <a href="mailto:billing@africatv.sn" className="mt-1 block text-amber-400 hover:underline">
                    billing@africatv.sn
                  </a>
                  <p className="mt-1 text-[11px] text-zinc-500">Confirmation de paiement Wave / Orange Money</p>
                </div>
              </div>
            </div>

            {/* Quick answers pills */}
            <div className="rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-xl p-6 shadow-xl shadow-black/40">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <HelpCircle size={16} className="text-amber-400" /> Réponses rapides
              </h2>
              <div className="mt-4 space-y-3 text-xs text-zinc-300">
                <div className="flex items-start gap-3">
                  <Tv className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <div>
                    <p className="font-semibold text-white">Un flux ne démarre pas sur le Web ?</p>
                    <p className="mt-0.5 text-zinc-400">
                      Certains flux utilisent des codecs vidéo non pris en charge nativement par les navigateurs.
                      Cliquez sur &quot;Relancer dans VLC&quot; pour ouvrir directement le flux dans VLC Media Player.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 pt-3 border-t border-white/[0.06]">
                  <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <div>
                    <p className="font-semibold text-white">Paiement validé mais accès en attente ?</p>
                    <p className="mt-0.5 text-zinc-400">
                      La confirmation NabooPay est quasi instantanée. Si votre statut n&apos;est pas actualisé dans les 2 minutes,
                      rechargez la page ou vérifiez votre espace <Link href="/account" className="text-amber-400 underline">Mon compte</Link>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact form */}
          <div className="rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-xl p-6 sm:p-8 shadow-xl shadow-black/40">
            <h2 className="text-lg font-bold text-white">Envoyez-nous un message</h2>
            <p className="mt-1 text-xs text-zinc-400">
              Remplissez le formulaire ci-dessous et nous traiterons votre requête dans les meilleurs délais.
            </p>

            {submitted ? (
              <div className="mt-8 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 size={24} />
                </div>
                <h3 className="mt-4 text-base font-bold text-white">Message bien reçu !</h3>
                <p className="mt-2 text-xs leading-relaxed text-zinc-300">
                  Merci <strong>{name}</strong>. Votre demande a été enregistrée avec succès. Notre équipe vous répondra à l&apos;adresse <strong>{email}</strong> sous 24h ouvrées.
                </p>
                <button
                  type="button"
                  onClick={() => { setSubmitted(false); setMessage(''); }}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] hover:bg-white/[0.1] px-4 py-2 text-xs font-semibold text-white transition backdrop-blur-md"
                >
                  Envoyer un autre message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-xs">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="name" className="block font-medium text-zinc-300">
                      Votre nom complet *
                    </label>
                    <input
                      id="name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Fatou Diop"
                      className="mt-1.5 w-full rounded-xl border border-white/[0.1] bg-white/[0.03] px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 transition"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block font-medium text-zinc-300">
                      Votre adresse e-mail *
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Ex: fatou@example.com"
                      className="mt-1.5 w-full rounded-xl border border-white/[0.1] bg-white/[0.03] px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 transition"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="subject" className="block font-medium text-zinc-300">
                    Sujet de votre demande *
                  </label>
                  <select
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-white/[0.1] bg-black/60 px-3.5 py-2 text-xs text-white focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 transition"
                  >
                    <option value="playback">Problème de lecture ou de lecteur VLC</option>
                    <option value="billing">Question sur un paiement NabooPay (Wave / Orange Money)</option>
                    <option value="channel">Suggestion d&apos;ajout ou de correction de chaîne</option>
                    <option value="partnership">Partenariat diffuseur ou demande commerciale</option>
                    <option value="other">Autre demande</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block font-medium text-zinc-300">
                    Votre message *
                  </label>
                  <textarea
                    id="message"
                    required
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Décrivez votre demande avec le maximum de détails (nom de la chaîne, type d'appareil, numéro de transaction éventuel)..."
                    className="mt-1.5 w-full rounded-xl border border-white/[0.1] bg-white/[0.03] px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 transition"
                  />
                </div>

                <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                  <AlertCircle size={13} className="shrink-0" />
                  <span>Vos données sont strictement utilisées pour répondre à votre demande.</span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-amber-400/40 bg-gradient-to-r from-emerald-500/25 via-amber-400/30 to-rose-500/25 hover:from-emerald-500/35 hover:via-amber-400/40 hover:to-rose-500/35 py-2.5 text-xs sm:text-sm font-bold text-amber-100 shadow-md backdrop-blur-md transition active:scale-[0.99] disabled:opacity-50"
                >
                  <Send size={14} />
                  <span>{loading ? 'Envoi en cours...' : 'Envoyer mon message'}</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 border-t border-white/[0.08] pt-6 text-center text-xs text-zinc-500">
          <p>© {new Date().getFullYear()} Africa Live (africatv.sn) • Service client dédié.</p>
        </div>
      </div>
    </main>
  );
}
