'use client';

import { useEffect, useReducer } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Clock, RefreshCw, XCircle } from 'lucide-react';

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
      <div className="mx-auto max-w-md text-center">
        <XCircle className="mx-auto mb-6 h-16 w-16 text-red-500" />
        <h1 className="mb-4 text-3xl font-black text-white">Statut indisponible</h1>
        <p className="mb-8 leading-relaxed text-zinc-400">
          Cette transaction ne peut pas être affichée depuis votre compte.
        </p>
        <Link href="/pricing" className="inline-block rounded-lg bg-zinc-800 px-6 py-3 text-sm font-bold text-white">
          Retour aux offres
        </Link>
      </div>
    );
  }

  if (displayStatus === 'completed') {
    return (
      <div className="mx-auto max-w-md text-center">
        <CheckCircle className="mx-auto mb-6 h-16 w-16 text-yellow-400" />
        <h1 className="mb-4 text-3xl font-black text-white">Paiement réussi</h1>
        <p className="mb-8 leading-relaxed text-zinc-400">Votre abonnement est actif.</p>
        <Link href="/app" className="inline-block rounded-lg bg-yellow-400 px-6 py-3 text-sm font-black text-black">
          Ouvrir l&apos;application
        </Link>
      </div>
    );
  }

  if (displayStatus === 'failed' || displayStatus === 'canceled') {
    return (
      <div className="mx-auto max-w-md text-center">
        <XCircle className="mx-auto mb-6 h-16 w-16 text-red-500" />
        <h1 className="mb-4 text-3xl font-black text-white">Paiement non abouti</h1>
        <p className="mb-8 leading-relaxed text-zinc-400">Le paiement a échoué ou a été annulé.</p>
        <Link href="/pricing" className="inline-block rounded-lg bg-yellow-400 px-6 py-3 text-sm font-black text-black">
          Retour aux offres
        </Link>
      </div>
    );
  }

  if (displayStatus === 'timeout') {
    return (
      <div className="mx-auto max-w-md text-center">
        <Clock className="mx-auto mb-6 h-16 w-16 text-yellow-400" />
        <h1 className="mb-4 text-3xl font-black text-white">Confirmation en attente</h1>
        <p className="mb-8 leading-relaxed text-zinc-400">
          Ne recommencez pas le paiement. La vérification automatique continue en arrière-plan.
        </p>
        <button
          onClick={() => dispatch({ type: 'manual_retry' })}
          className="inline-flex items-center rounded-lg bg-zinc-800 px-6 py-3 text-sm font-bold text-white"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Vérifier maintenant
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md text-center">
      <Clock className="mx-auto mb-6 h-16 w-16 animate-pulse text-yellow-400" />
      <h1 className="mb-4 text-3xl font-black text-white">Paiement en cours</h1>
      <p className="mb-8 leading-relaxed text-zinc-400">La confirmation est en cours de vérification.</p>
    </div>
  );
}
