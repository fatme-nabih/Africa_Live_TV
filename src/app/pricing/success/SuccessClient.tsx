'use client';

import Link from 'next/link';
import { CheckCircle, Clock, XCircle, RefreshCw } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';

export default function SuccessClient() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');

  const [status, setStatus] = useState<string>('pending');
  const [retries, setRetries] = useState(0);
  const maxRetries = 10;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const checkStatus = async () => {
    if (!orderId) return;
    try {
      const res = await fetch(`/api/checkout/status?checkout_attempt_id=${orderId}`);
      if (!res.ok) {
        if (res.status === 401 || res.status === 404) {
          setStatus('error'); // stop polling
          return;
        }
        throw new Error('Server error');
      }
      const data = await res.json();
      setStatus(data.status);
      
      if (data.status === 'completed' || data.status === 'failed' || data.status === 'canceled') {
        // Final state reached
        return;
      }
      
      // Still pending/creating
      if (retries < maxRetries) {
        setRetries(r => r + 1);
        const nextDelay = Math.pow(2, retries) * 1000;
        timerRef.current = setTimeout(checkStatus, nextDelay);
      } else {
        setStatus('timeout');
      }
    } catch {
      if (retries < maxRetries) {
        setRetries(r => r + 1);
        const nextDelay = Math.pow(2, retries) * 1000;
        timerRef.current = setTimeout(checkStatus, nextDelay);
      } else {
        setStatus('timeout');
      }
    }
  };

  useEffect(() => {
    if (orderId && (status === 'pending' || status === 'creating')) {
      checkStatus();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]); // Only run once on mount

  if (!orderId) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-3xl font-black text-white mb-4">Erreur</h1>
        <p className="text-zinc-400 mb-8 leading-relaxed">Identifiant de commande manquant.</p>
        <Link href="/pricing" className="inline-block rounded-lg bg-zinc-800 px-6 py-3 text-sm font-bold text-white transition hover:bg-zinc-700">
          Retour aux offres
        </Link>
      </div>
    );
  }

  if (status === 'completed') {
    return (
      <div className="mx-auto max-w-md text-center">
        <CheckCircle className="mx-auto h-16 w-16 text-yellow-400 mb-6" />
        <h1 className="text-3xl font-black text-white mb-4">Paiement Réussi !</h1>
        <p className="text-zinc-400 mb-8 leading-relaxed">
          Merci pour votre achat. Votre abonnement a bien été activé. Vous avez désormais un accès illimité à Africa Live TV.
        </p>
        <Link href="/app" className="inline-block rounded-lg bg-yellow-400 px-6 py-3 text-sm font-black text-black transition hover:bg-yellow-300 shadow-[0_0_20px_rgba(250,204,21,0.2)]">
          Ouvrir l&apos;application
        </Link>
      </div>
    );
  }

  if (status === 'failed' || status === 'canceled') {
    return (
      <div className="mx-auto max-w-md text-center">
        <XCircle className="mx-auto h-16 w-16 text-red-500 mb-6" />
        <h1 className="text-3xl font-black text-white mb-4">Paiement Échoué</h1>
        <p className="text-zinc-400 mb-8 leading-relaxed">
          Votre paiement n&apos;a pas abouti ou a été annulé.
        </p>
        <Link href="/pricing" className="inline-block rounded-lg bg-yellow-400 px-6 py-3 text-sm font-black text-black transition hover:bg-yellow-300 shadow-[0_0_20px_rgba(250,204,21,0.2)]">
          Retour aux offres
        </Link>
      </div>
    );
  }

  if (status === 'timeout') {
    return (
      <div className="mx-auto max-w-md text-center">
        <Clock className="mx-auto h-16 w-16 text-yellow-400 mb-6" />
        <h1 className="text-3xl font-black text-white mb-4">En attente de confirmation</h1>
        <p className="text-zinc-400 mb-8 leading-relaxed">
          Votre paiement prend plus de temps que prévu à être confirmé par l&apos;opérateur. Ne vous inquiétez pas, il sera validé automatiquement.
        </p>
        <button
          onClick={() => { setRetries(0); setStatus('pending'); checkStatus(); }}
          className="inline-flex items-center rounded-lg bg-zinc-800 px-6 py-3 text-sm font-bold text-white transition hover:bg-zinc-700 mb-4"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Rafraîchir manuellement
        </button>
      </div>
    );
  }

  // pending / creating / error
  return (
    <div className="mx-auto max-w-md text-center">
      <Clock className="mx-auto h-16 w-16 text-yellow-400 mb-6 animate-pulse" />
      <h1 className="text-3xl font-black text-white mb-4">Paiement en cours</h1>
      <p className="text-zinc-400 mb-8 leading-relaxed">
        Votre paiement est en cours de validation. L&apos;accès à votre abonnement sera débloqué d&apos;ici quelques instants.
      </p>
    </div>
  );
}
