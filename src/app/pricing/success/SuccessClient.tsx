'use client';

import { useEffect, useReducer } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Clock, RefreshCw, XCircle } from 'lucide-react';

import { checkoutStatusResponseSchema } from '@/lib/payment-contracts';

const MAX_ATTEMPTS = 12;
const POLL_DELAY_MS = 3_000;

type TerminalStatus = 'completed' | 'failed' | 'canceled' | 'timeout' | 'error';

type State =
  | { tag: 'polling'; attempt: number }
  | { tag: 'done'; status: TerminalStatus };

type Action =
  | { type: 'terminal'; status: TerminalStatus }
  | { type: 'retry' }
  | { type: 'manual_retry' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'terminal':
      return { tag: 'done', status: action.status };
    case 'retry':
      if (state.tag !== 'polling') return state;
      return { tag: 'polling', attempt: state.attempt + 1 };
    case 'manual_retry':
      return { tag: 'polling', attempt: 0 };
    default:
      return state;
  }
}

function init(orderId: string | null): State {
  return orderId ? { tag: 'polling', attempt: 0 } : { tag: 'done', status: 'error' };
}

export default function SuccessClient() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');

  const [state, dispatch] = useReducer(reducer, orderId, init);

  useEffect(() => {
    if (state.tag !== 'polling') return;
    const { attempt } = state;
    const controller = new AbortController();

    const timer = setTimeout(() => {
      void fetch(
        `/api/checkout/status?checkout_attempt_id=${encodeURIComponent(orderId ?? '')}`,
        { cache: 'no-store', signal: controller.signal },
      ).then(async (response) => {
        if (controller.signal.aborted) return;
        if (!response.ok) {
          dispatch({ type: 'terminal', status: 'error' });
          return;
        }
        const parsed = checkoutStatusResponseSchema.safeParse(await response.json());
        if (controller.signal.aborted) return;
        if (!parsed.success) {
          dispatch({ type: 'terminal', status: 'error' });
          return;
        }
        const s = parsed.data.status;
        if (s === 'completed' || s === 'failed' || s === 'canceled') {
          dispatch({ type: 'terminal', status: s });
          return;
        }
        if (attempt + 1 >= MAX_ATTEMPTS) {
          dispatch({ type: 'terminal', status: 'timeout' });
          return;
        }
        dispatch({ type: 'retry' });
      }).catch(() => {
        if (controller.signal.aborted) return;
        if (attempt + 1 >= MAX_ATTEMPTS) {
          dispatch({ type: 'terminal', status: 'timeout' });
        } else {
          dispatch({ type: 'retry' });
        }
      });
    }, attempt === 0 ? 0 : POLL_DELAY_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  // Re-run each time a new polling attempt starts.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.tag === 'polling' ? state.attempt : -1, orderId]);

  const displayStatus = state.tag === 'done' ? state.status : 'pending';

  if (!orderId || displayStatus === 'error') {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-xl p-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-400">
          <XCircle className="h-8 w-8" />
        </div>
        <h1 className="mb-2 text-2xl font-black text-white">Statut indisponible</h1>
        <p className="mb-6 text-xs text-zinc-400 leading-relaxed">
          Cette transaction ne peut pas être affichée depuis votre compte.
        </p>
        <Link href="/pricing" className="inline-block rounded-xl border border-white/15 bg-white/[0.05] hover:bg-white/[0.1] px-5 py-2.5 text-xs font-semibold text-white transition backdrop-blur-md">
          Retour aux offres
        </Link>
      </div>
    );
  }

  if (displayStatus === 'completed') {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-black/40 backdrop-blur-xl p-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="mb-2 text-2xl font-black text-white">Paiement réussi</h1>
        <p className="mb-6 text-xs text-zinc-300 leading-relaxed">Votre abonnement Africa Live est désormais actif.</p>
        <Link
          href="/app"
          className="inline-block rounded-xl border border-amber-400/40 bg-gradient-to-r from-emerald-500/25 via-amber-400/30 to-rose-500/25 hover:from-emerald-500/35 hover:via-amber-400/40 hover:to-rose-500/35 px-6 py-2.5 text-xs sm:text-sm font-bold text-amber-100 shadow-md backdrop-blur-md transition active:scale-[0.99]"
        >
          Ouvrir l&apos;application
        </Link>
      </div>
    );
  }

  if (displayStatus === 'failed' || displayStatus === 'canceled') {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-xl p-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-400">
          <XCircle className="h-8 w-8" />
        </div>
        <h1 className="mb-2 text-2xl font-black text-white">Paiement non abouti</h1>
        <p className="mb-6 text-xs text-zinc-400 leading-relaxed">Le paiement a échoué ou a été annulé.</p>
        <Link
          href="/pricing"
          className="inline-block rounded-xl border border-white/15 bg-white/[0.05] hover:bg-white/[0.1] px-5 py-2.5 text-xs font-semibold text-white transition backdrop-blur-md"
        >
          Retour aux offres
        </Link>
      </div>
    );
  }

  if (displayStatus === 'timeout') {
    return (
      <div className="rounded-2xl border border-amber-400/30 bg-black/40 backdrop-blur-xl p-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10 text-amber-400">
          <Clock className="h-8 w-8" />
        </div>
        <h1 className="mb-2 text-2xl font-black text-white">Confirmation en attente</h1>
        <p className="mb-6 text-xs text-zinc-400 leading-relaxed">
          Ne recommencez pas le paiement. La vérification automatique continue en arrière-plan.
        </p>
        <button
          onClick={() => dispatch({ type: 'manual_retry' })}
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] hover:bg-white/[0.1] px-5 py-2.5 text-xs font-semibold text-white transition backdrop-blur-md"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Vérifier maintenant</span>
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-xl p-8 text-center shadow-2xl">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10 text-amber-400 animate-pulse">
        <Clock className="h-8 w-8" />
      </div>
      <h1 className="mb-2 text-2xl font-black text-white">Paiement en cours</h1>
      <p className="text-xs text-zinc-400 leading-relaxed">La confirmation est en cours de vérification automatique...</p>
    </div>
  );
}
