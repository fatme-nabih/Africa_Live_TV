'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { favoritesResponseSchema, messageForApiError, readApiResponse } from '@/lib/api-contracts';
import { acknowledgeFavoriteIntents, mergeFavoriteIntents, serializeFavoriteRequest, type FavoriteIntent } from '@/lib/favorite-sync';
import { migrateLegacyStorageOnce, STORAGE_KEYS } from '@/lib/storage-keys';

function readStored<T>(key:string,fallback:T):T {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback; } catch {return fallback;}
}
export function useFavorites() {
  const [favorites,setFavorites]=useState<string[]>([]);
  const [favoriteError,setFavoriteError]=useState<string|null>(null);
  const [favoritesRevision,setFavoritesRevision]=useState(0);
  const displayed=useRef<string[]>([]);
  const intents=useRef<Record<string,FavoriteIntent>>({});
  const revision=useRef(0);
  const active=useRef(false);
  const busy=useRef(false);
  const repeat=useRef(false);
  const publish=useCallback((canonical:string[])=>{
    const value=mergeFavoriteIntents(canonical,intents.current);
    displayed.current=value;
    localStorage.setItem(STORAGE_KEYS.favorites,JSON.stringify(value));
    localStorage.setItem(STORAGE_KEYS.favoritesPending,JSON.stringify(Object.fromEntries(Object.entries(intents.current).map(([id,i])=>[id,i.desired]))));
    if(active.current) setFavorites(value);
  },[]);
  const synchronizeFavorites=useCallback(async()=>{
    repeat.current=true;
    if(busy.current) return;
    busy.current=true;
    try {
      do {
        repeat.current=false;
        await serializeFavoriteRequest(async()=>{
          if(!active.current) return;
          const response=await fetch('/api/favorites',{cache:'no-store',signal:AbortSignal.timeout(15_000)});
          let canonical=(await readApiResponse(response,favoritesResponseSchema)).favorites;
          if(!active.current) return;
          const sent={...intents.current};
          const add=Object.entries(sent).filter(([,i])=>i.desired).map(([id])=>id);
          const remove=Object.entries(sent).filter(([,i])=>!i.desired).map(([id])=>id);
          publish(canonical);
          if(add.length||remove.length) {
            const result=await fetch('/api/favorites',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({add,remove}),signal:AbortSignal.timeout(15_000)});
            canonical=(await readApiResponse(result,favoritesResponseSchema)).favorites;
            if(!active.current) return; // retained device intents will replay after remount
            intents.current=acknowledgeFavoriteIntents(intents.current,sent);
          }
          localStorage.setItem(STORAGE_KEYS.favoritesMigrated,'true');
          publish(canonical);
          if(active.current) {setFavoriteError(null);setFavoritesRevision(r=>r+1);}
          if(Object.keys(intents.current).length) repeat.current=true;
        });
      } while(repeat.current&&active.current);
    } catch(error) {
      if(active.current) setFavoriteError(`${messageForApiError(error,'La synchronisation des favoris a échoué.')} Le choix reste conservé localement.`);
    } finally {busy.current=false;}
  },[publish]);
  useEffect(()=>{
    active.current=true;
    queueMicrotask(()=>{
      if(!active.current) return;
      migrateLegacyStorageOnce();
      const stored=readStored<unknown>(STORAGE_KEYS.favorites,[]);
      const device=Array.isArray(stored)?stored.filter((v):v is string=>typeof v==='string'):[];
      const rawPending=readStored<unknown>(STORAGE_KEYS.favoritesPending,{});
      const pending=rawPending&&typeof rawPending==='object'&&!Array.isArray(rawPending)?rawPending:{};
      for(const [id,desired] of Object.entries(pending)) if(typeof desired==='boolean') intents.current[id]={desired,revision:++revision.current};
      if(localStorage.getItem(STORAGE_KEYS.favoritesMigrated)!=='true') for(const id of device) intents.current[id]??={desired:true,revision:++revision.current};
      publish(device);void synchronizeFavorites();
    });
    const onOnline=()=>void synchronizeFavorites();
    window.addEventListener('online',onOnline);
    return ()=>{active.current=false;window.removeEventListener('online',onOnline);};
  },[publish,synchronizeFavorites]);
  const toggleFavorite=useCallback((id:string)=>{
    intents.current[id]={desired:!displayed.current.includes(id),revision:++revision.current};
    publish(displayed.current);
    void synchronizeFavorites();
  },[publish,synchronizeFavorites]);
  return {favorites,favoriteError,favoritesRevision,toggleFavorite,synchronizeFavorites};
}
