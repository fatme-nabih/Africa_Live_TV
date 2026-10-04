'use client';
import {useState,useRef,useCallback,useEffect} from 'react';
import {LatestRequestController,SingleFlightGate} from '@/lib/latest-request';
import {catalogRequestSchema,catalogResponseSchema,readApiResponse,messageForApiError,type CatalogRequest} from '@/lib/api-contracts';
import type {Channel} from '@/types/channel';
export function useCatalog(catalogRequest:CatalogRequest,favoritesRevision:number){
 const catalogRequestsRef=useRef(new LatestRequestController());
 const loadingMoreGateRef=useRef(new SingleFlightGate());
 const [channels,setChannels]=useState<Channel[]>([]);
 const [canPlay,setCanPlay]=useState(true);
 const [loading,setLoading]=useState(false);
 const [nextCursor,setNextCursor]=useState<string|null>(null);
 const [catalogError,setCatalogError]=useState<string|null>(null);
  const fetchChannels = useCallback(async (requestInput: CatalogRequest, append = false) => {
    if (append && !loadingMoreGateRef.current.enter()) return;
    const request = catalogRequestsRef.current!.begin();
    setLoading(true);
    setCatalogError(null);
    try {
      const body = catalogRequestSchema.parse(requestInput);
      const response = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: request.signal,
      });
      const data = await readApiResponse(response, catalogResponseSchema);
      if (!catalogRequestsRef.current!.isCurrent(request.id)) return;
      setCanPlay(data.canPlay);
      const visibleChannels = data.channels;
      setChannels((current) => {
        if (!append) return visibleChannels;
        const merged = new Map(current.map((channel) => [channel.id, channel]));
        for (const channel of visibleChannels) merged.set(channel.id, channel);
        return [...merged.values()];
      });
      setNextCursor(data.nextCursor);
    } catch (error) {
      if (request.signal.aborted || !catalogRequestsRef.current!.isCurrent(request.id)) return;
      setCatalogError(messageForApiError(error, 'Impossible de charger le catalogue.'));
    } finally {
      if (append) loadingMoreGateRef.current.leave();
      if (catalogRequestsRef.current!.isCurrent(request.id)) {
        setLoading(false);
        catalogRequestsRef.current!.finish(request.id);
      }
    }
  }, []);

  const handleLoadMore = useCallback(() => {
    if (!nextCursor || loading || loadingMoreGateRef.current.isActive()) return;
    void fetchChannels({ ...catalogRequest, cursor: nextCursor }, true);
  }, [catalogRequest, fetchChannels, loading, nextCursor]);

  useEffect(() => {
    let active = true;
    const requests=catalogRequestsRef.current;
    queueMicrotask(() => { if (active) { setChannels([]); setNextCursor(null); setLoading(true); } });
    const timer = window.setTimeout(() => {
      if (!active) return;
      loadingMoreGateRef.current.leave();
      void fetchChannels(catalogRequest, false);
    }, catalogRequest.search ? 300 : 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
      requests.abort();
    };
  }, [catalogRequest, catalogRequest.search, favoritesRevision, fetchChannels]);

  const retryCatalog = useCallback(() => {
    void fetchChannels(catalogRequest, false);
  }, [catalogRequest, fetchChannels]);



 return {channels,canPlay,loading,nextCursor,catalogError,handleLoadMore,retryCatalog};
}
