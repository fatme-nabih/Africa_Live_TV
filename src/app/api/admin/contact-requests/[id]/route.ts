import { randomUUID } from 'node:crypto';
import { and, eq, inArray, ne } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { db } from '@/db';
import { channels, streams, supportRequestEvents, supportRequests } from '@/db/schema';
import { BadRequestError, ForbiddenError, NotFoundError, ApiError, withApiErrorHandler } from '@/lib/api-errors';
import { readBoundedJson } from '@/lib/bounded-json';
import { requireAdminApiAccess } from '@/lib/require-admin-api';
import { normalizeCatalogSearch } from '@/lib/catalog-query';
import { allowsSupportRequestTransition, canonicalizeStreamUrl, supportRequestAdminActionSchema } from '@/lib/support-request-contracts';
import { lockCatalogPublication } from '@/lib/catalog-publication-lock';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const PATCH = withApiErrorHandler(async (request: Request, context: unknown) => {
  const admin = await requireAdminApiAccess();
  const { id } = await (context as { params: Promise<{ id: string }> }).params;
  const input = await readBoundedJson(request, 4 * 1_024);
  const parsed = supportRequestAdminActionSchema.safeParse(input);
  if (!parsed.success) throw new BadRequestError('Vérifiez l’action et la note de traitement.', 'INVALID_REQUEST_ACTION');

  const now = new Date().toISOString();
  const result = await db.transaction(async (tx) => {
    await lockCatalogPublication(tx);
    const [item] = await tx.select().from(supportRequests)
      .where(eq(supportRequests.id, id)).for('update').limit(1);
    if (!item) throw new NotFoundError('Cette demande est introuvable.', 'REQUEST_NOT_FOUND');
    if (!allowsSupportRequestTransition(item.status, parsed.data.action)) throw new ApiError('Une demande ayant désactivé des sources nécessite une décision explicite de levée du retrait.', 409, 'TAKEDOWN_TRANSITION_CONFLICT');

    let status: string;
    let affectedStreamIds: string[] = [];
    if (parsed.data.action === 'in_review') {
      status = 'in_review';
    } else if (parsed.data.action === 'close_no_action') {
      status = 'closed_no_action';
      if (item.status === 'sources_disabled') {
        const priorDisableEvents = await tx.select({ affectedStreamIds: supportRequestEvents.affectedStreamIds })
          .from(supportRequestEvents)
          .where(and(
            eq(supportRequestEvents.requestId, id),
            eq(supportRequestEvents.eventType, 'sources_disabled'),
          ));
        affectedStreamIds = [...new Set(priorDisableEvents.flatMap((event) => event.affectedStreamIds))];
        if (affectedStreamIds.length > 0) {
          const otherReports = await tx.select().from(supportRequests).where(and(ne(supportRequests.id, id), eq(supportRequests.subject, 'removal'), eq(supportRequests.status, 'sources_disabled')));
          const candidates = await tx.select({ id: streams.id, url: streams.url, normalizedName: channels.normalizedName }).from(streams).innerJoin(channels, eq(streams.channelId, channels.id)).where(inArray(streams.id, affectedStreamIds));
          affectedStreamIds = candidates.filter(source => !otherReports.some(report => report.channelName?.normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim() === source.normalizedName && (!report.sourceUrl || canonicalizeStreamUrl(report.sourceUrl) === canonicalizeStreamUrl(source.url)))).map(source => source.id);
        }
        if (affectedStreamIds.length > 0) {
          await tx.update(streams).set({
            active: true,
            inactiveAt: null,
            directEligibility: 'REVIEW_REQUIRED',
            status: 'UNTESTED', verificationState: 'STALE',
            eligibilityReason: 'TAKEDOWN_REVIEW_CLOSED',
            eligibilityCheckedAt: null,
            updatedAt: now,
          }).where(inArray(streams.id, affectedStreamIds));
        }
      }
    } else {
      if (item.subject !== 'removal' || !item.channelName) {
        throw new ForbiddenError('Seules les demandes de retrait identifiées peuvent désactiver des sources.', 'NOT_A_REMOVAL_REQUEST');
      }
      const normalizedName = normalizeCatalogSearch(item.channelName);
      const matchedChannels = await tx.select({ id: channels.id }).from(channels)
        .where(and(eq(channels.active, true), eq(channels.normalizedName, normalizedName)));
      if (matchedChannels.length === 0) {
        throw new ApiError('Aucune chaîne active ne correspond au nom signalé. Passez la demande en revue et vérifiez le nom.', 409, 'CHANNEL_NOT_FOUND');
      }
      const channelIds = matchedChannels.map((channel) => channel.id);
      const candidates = await tx.select({ id: streams.id, url: streams.url }).from(streams)
        .where(and(eq(streams.active, true), inArray(streams.channelId, channelIds)));
      const reportedUrl = item.sourceUrl ? canonicalizeStreamUrl(item.sourceUrl) : null;
      affectedStreamIds = candidates
        .filter((source) => !reportedUrl || canonicalizeStreamUrl(source.url) === reportedUrl)
        .map((source) => source.id);
      if (affectedStreamIds.length === 0) {
        throw new ApiError('Aucune source active ne correspond à la demande. Vérifiez le nom ou l’adresse de la source.', 409, 'SOURCE_NOT_FOUND');
      }
      await tx.update(streams).set({ active: false, inactiveAt: now, updatedAt: now })
        .where(and(eq(streams.active, true), inArray(streams.id, affectedStreamIds)));
      status = 'sources_disabled';
    }

    await tx.update(supportRequests).set({
      status,
      resolutionNote: parsed.data.note,
      handledByClerkUserId: admin.userId,
      updatedAt: now,
    }).where(eq(supportRequests.id, id));
    await tx.insert(supportRequestEvents).values({
      id: randomUUID(),
      requestId: id,
      eventType: status,
      actorClerkUserId: admin.userId,
      note: parsed.data.note,
      affectedStreamIds,
      createdAt: now,
    });

    return { id, status, disabledSourceCount: affectedStreamIds.length };
  });

  return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
});
