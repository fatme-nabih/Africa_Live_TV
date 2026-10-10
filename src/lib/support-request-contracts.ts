import { z } from 'zod';

export const supportRequestSubjectSchema = z.enum([
  'playback',
  'billing',
  'channel',
  'removal',
  'partnership',
  'other',
]);

const reportedSourceUrlSchema = z.string().trim().max(2_048).optional().transform((value, context) => {
  if (!value) return null;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    context.addIssue({ code: 'custom', message: 'Indiquez une URL http ou https valide.' });
    return z.NEVER;
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    context.addIssue({ code: 'custom', message: 'Seules les URL http ou https sans identifiants sont acceptées.' });
    return z.NEVER;
  }
  // Do not retain query parameters or fragments: stream URLs can carry temporary credentials.
  return `${parsed.origin}${parsed.pathname}`;
});

export const supportRequestSubmissionSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().max(320).pipe(z.email()).transform((value) => value.toLowerCase()),
  subject: supportRequestSubjectSchema,
  message: z.string().trim().min(1).max(5_000),
  channelName: z.string().trim().max(200).nullable().optional().transform((value) => value || null),
  sourceUrl: reportedSourceUrlSchema,
  website: z.string().max(200).optional(),
}).strict().superRefine((value, context) => {
  if (value.subject === 'removal' && !value.channelName) {
    context.addIssue({ code: 'custom', path: ['channelName'], message: 'Le nom de la chaîne est obligatoire pour une demande de retrait.' });
  }
});

export const supportRequestAdminActionSchema = z.object({
  action: z.enum(['in_review', 'disable_reported_sources', 'close_no_action']),
  note: z.string().trim().max(1_000).optional().transform((value) => value || null),
}).strict().superRefine((value, context) => {
  if (value.action !== 'in_review' && (!value.note || value.note.length < 5)) {
    context.addIssue({ code: 'custom', path: ['note'], message: 'Ajoutez une note de décision d’au moins 5 caractères.' });
  }
});

export function allowsSupportRequestTransition(status: string, action: z.infer<typeof supportRequestAdminActionSchema>['action']) {
  return !(status === 'sources_disabled' && action === 'in_review');
}

export function canonicalizeStreamUrl(value: string) {
  try {
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return null;
  }
}
