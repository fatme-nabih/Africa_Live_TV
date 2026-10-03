import { ChevronDown } from 'lucide-react';
import { cn } from '@/components/ui';

export type FaqId = 'what' | 'trial' | 'price' | 'install' | 'source';

/** Cinq questions courtes, ton factuel : aucune promesse de délai, de qualité ou de disponibilité garantie. */
export const FAQ: Record<FaqId, { q: string; a: string }> = {
  what: {
    q: 'Qu’est-ce qu’Africa Live ?',
    a: 'Un espace pour suivre l’actualité africaine pays par pays (dépêches, carte, météo) et regarder des chaînes de télévision en direct, dans votre navigateur ou dans VLC.',
  },
  trial: {
    q: 'Comment fonctionne l’essai de 5 jours ?',
    a: 'À la création de votre compte, vous avez 5 jours d’accès complet, sans carte bancaire. Ensuite, vous choisissez de vous abonner ou non : rien n’est prélevé automatiquement.',
  },
  price: {
    q: 'Combien ça coûte et comment payer ?',
    a: '990 FCFA pour 30 jours ou 9 900 FCFA pour 12 mois (2 mois offerts). Vous payez par Wave, Orange Money ou carte bancaire via NabooPay ; l’accès s’active dès que le paiement est confirmé.',
  },
  install: {
    q: 'Faut-il installer une application ?',
    a: 'Non pour la plupart des chaînes : elles se lisent dans le navigateur. Certaines sources ne s’ouvrent que dans VLC, un lecteur gratuit, proposé d’un clic sur ordinateur.',
  },
  source: {
    q: 'Africa Live héberge-t-il les vidéos ?',
    a: 'Non. Votre navigateur ou VLC se connecte directement à la source du diffuseur ; Africa Live ne stocke ni ne convertit aucune vidéo. Une chaîne peut donc être momentanément indisponible.',
  },
};

export const FAQ_ORDER: readonly FaqId[] = ['what', 'trial', 'price', 'install', 'source'];

export default function Faq({ ids = FAQ_ORDER, className }: { ids?: readonly FaqId[]; className?: string }) {
  return (
    <div className={cn('space-y-3', className)}>
      {ids.map(id => (
        <details key={id} className="group rounded-card border border-line bg-surface-1/90 transition-colors open:border-line-gold">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-bold text-text [&::-webkit-details-marker]:hidden">
            <span className="text-base">{FAQ[id].q}</span>
            <ChevronDown size={18} aria-hidden="true" className="shrink-0 text-text-muted transition-transform group-open:rotate-180 group-open:text-al-gold" />
          </summary>
          <p className="px-5 pb-5 text-sm leading-relaxed text-text-muted">{FAQ[id].a}</p>
        </details>
      ))}
    </div>
  );
}
