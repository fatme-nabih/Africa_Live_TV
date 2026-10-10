'use client';

import { useEffect, useReducer } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Clock, RefreshCw, XCircle } from 'lucide-react';

import { checkoutStatusResponseSchema } from '@/lib/payment-contracts';
import { isTerminalCheckout } from '@/lib/payment-attempt-policy';
import { confirmCheckoutAttempt } from '@/lib/checkout-attempt';

const MAX_ATTEMPTS = 12;
const POLL_DELAY_MS = 3_000;

type TerminalStatus = 'completed' | 'failed' | 'canceled' | 'refunded' | 'timeout' | 'error';

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
  return <SuccessAttempt key={orderId ?? 'missing'} orderId={orderId} />;
}

function SuccessAttempt({ orderId }: { orderId: string|null }) {

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
        if (isTerminalCheckout(s)) {
          if (parsed.data.checkout_attempt_id !== orderId) {
            dispatch({ type: 'terminal', status: 'error' }); return;
          }
          confirmCheckoutAttempt(parsed.data.plan, parsed.data.checkout_attempt_id);
          dispatch({ type: 'terminal', status: s as TerminalStatus });
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
      <div className="rounded-2xl border border-line bg-surface-1/80 p-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-al-red/20 bg-al-red/10 text-al-red-soft">
          <XCircle className="h-8 w-8" />
        </div>
        <h1 className="font-display mb-2 text-2xl font-bold text-text">Statut indisponible</h1>
        <p className="mb-6 text-xs text-text-muted leading-relaxed">
          Cette transaction ne peut pas être affichée depuis votre compte.
        </p>
        <Link href="/pricing" className="inline-block rounded-xl border border-white/15 bg-white/[0.05] hover:bg-white/[0.1] px-5 py-2.5 text-xs font-semibold text-text transition">
          Retour aux offres
        </Link>
      </div>
    );
  }

  if (displayStatus === 'completed') {
    return (
      <div className="rounded-2xl border border-al-green/30 bg-black/40 p-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-al-green/20 bg-al-green/10 text-al-green">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="font-display mb-2 text-2xl font-bold text-text">Paiement réussi</h1>
        <p className="mb-6 text-xs text-text leading-relaxed">Votre abonnement Africa Live est désormais actif.</p>
        <Link
          href="/app/live"
          className="inline-block rounded-xl border border-transparent bg-al-yellow hover:brightness-110 px-6 py-2.5 text-xs sm:text-sm font-bold text-black shadow-md transition active:scale-[0.99]"
        >
          Ouvrir le dashboard
        </Link>
      </div>
    );
  }

  if (displayStatus === 'failed' || displayStatus === 'canceled' || displayStatus === 'refunded') {
    return (
      <div className="rounded-2xl border border-line bg-surface-1/80 p-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-al-red/20 bg-al-red/10 text-al-red-soft">
          <XCircle className="h-8 w-8" />
        </div>
        <h1 className="font-display mb-2 text-2xl font-bold text-text">{displayStatus === 'refunded' ? 'Paiement remboursé' : 'Paiement non abouti'}</h1>
        <p className="mb-6 text-xs text-text-muted leading-relaxed">{displayStatus === 'refunded' ? 'Le remboursement a été confirmé.' : 'Le paiement a échoué ou a été annulé.'}</p>
        <Link
          href="/pricing"
          className="inline-block rounded-xl border border-white/15 bg-white/[0.05] hover:bg-white/[0.1] px-5 py-2.5 text-xs font-semibold text-text transition"
        >
          Retour aux offres
        </Link>
      </div>
    );
  }

  if (displayStatus === 'timeout') {
    return (
      <div className="rounded-2xl border border-al-gold/30 bg-black/40 p-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-al-gold/20 bg-al-gold/10 text-al-gold">
          <Clock className="h-8 w-8" />
        </div>
        <h1 className="font-display mb-2 text-2xl font-bold text-text">Confirmation en attente</h1>
        <p className="mb-6 text-xs text-text-muted leading-relaxed">
          Ne recommencez pas le paiement. La vérification automatique continue en arrière-plan.
        </p>
        <button
          onClick={() => dispatch({ type: 'manual_retry' })}
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] hover:bg-white/[0.1] px-5 py-2.5 text-xs font-semibold text-text transition"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Vérifier maintenant</span>
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-surface-1/80 p-8 text-center shadow-2xl">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-al-gold/20 bg-al-gold/10 text-al-gold animate-pulse">
        <Clock className="h-8 w-8" />
      </div>
      <h1 className="font-display mb-2 text-2xl font-bold text-text">Paiement en cours</h1>
      <p className="text-xs text-text-muted leading-relaxed">La confirmation est en cours de vérification automatique...</p>
    </div>
  );
}
