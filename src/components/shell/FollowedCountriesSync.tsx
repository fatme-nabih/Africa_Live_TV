'use client';
import { useEffect } from 'react';
import { writeFollowedCountries } from '@/components/tv/hooks';
import { FOLLOWED_COUNTRIES_EVENT, mergeFollowedCountries, parseFollowedCountries, sameFollowedCountries } from '@/lib/followed-countries';
import { AFRICAN_COUNTRIES } from '@/lib/radar-countries';
import { STORAGE_KEYS } from '@/lib/storage-keys';

const AFRICAN_CODES=new Set(AFRICAN_COUNTRIES.map(c=>c.code));
let accountQueue:Promise<unknown>=Promise.resolve();
function serialize<T>(task:()=>Promise<T>) {const next=accountQueue.catch(()=>{}).then(task);accountQueue=next.catch(()=>{});return next;}
function readDevice() {
  try {return parseFollowedCountries(localStorage.getItem(STORAGE_KEYS.followedCountries),AFRICAN_CODES);} catch {return [];}
}
class SyncResponseError extends Error {constructor(readonly status:number){super('COUNTRIES_SYNC_FAILED');}}
async function requestCountries(countries?:string[]) {
  const init:RequestInit=countries ? {method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({countries})} : {cache:'no-store'};
  const response=await fetch('/api/followed-countries',{...init,signal:AbortSignal.timeout(15_000)});
  if(!response.ok) throw new SyncResponseError(response.status);
  const body:unknown=await response.json();
  if(!body||typeof body!=='object'||!('countries' in body)||!Array.isArray(body.countries)) throw new Error('INVALID_COUNTRIES_RESPONSE');
  return parseFollowedCountries(JSON.stringify(body.countries),AFRICAN_CODES);
}

export default function FollowedCountriesSync() {
  useEffect(()=>{
    let stopped=false, busy=false, initialized=false, publishing=false, blocked=false;
    let revision=0, retries=0;
    let account:string[]=[];
    let timer:ReturnType<typeof setTimeout>|undefined;
    const schedule=(delay=800)=>{clearTimeout(timer);if(!stopped&&!blocked) timer=setTimeout(()=>void synchronize(),delay);};
    const synchronize=async()=>{
      if(stopped||busy||blocked)return;
      busy=true;
      try {
        await serialize(async()=>{
          if(stopped)return;
          if(!initialized) {
            const before=revision;
            account=await requestCountries();
            if(stopped)return;
            initialized=true;
            const device=readDevice();
            const hasPending=localStorage.getItem(STORAGE_KEYS.followedCountriesPending)==='true';
            const merged=hasPending||before!==revision ? device : mergeFollowedCountries(account,device);
            if(!sameFollowedCountries(merged,device)) {publishing=true;writeFollowedCountries(merged);publishing=false;}
          }
          while(!stopped) {
            const device=readDevice();
            if(sameFollowedCountries(device,account)) {localStorage.removeItem(STORAGE_KEYS.followedCountriesPending);break;}
            const sentRevision=revision;
            account=await requestCountries(device);
            if(stopped)return;
            if(sentRevision===revision&&sameFollowedCountries(readDevice(),account)) localStorage.removeItem(STORAGE_KEYS.followedCountriesPending);
          }
        });
        retries=0;
      } catch(error) {
        blocked=error instanceof SyncResponseError && [401,403,429].includes(error.status);
        if(!blocked&&++retries<=3) schedule(1_000*2**(retries-1));
      } finally {busy=false;}
    };
    const onChange=()=>{if(publishing)return;revision++;localStorage.setItem(STORAGE_KEYS.followedCountriesPending,'true');schedule();};
    const onOnline=()=>{if(blocked)return;retries=0;schedule(0);};
    schedule(0);
    window.addEventListener(FOLLOWED_COUNTRIES_EVENT,onChange);
    window.addEventListener('online',onOnline);
    return ()=>{stopped=true;clearTimeout(timer);window.removeEventListener(FOLLOWED_COUNTRIES_EVENT,onChange);window.removeEventListener('online',onOnline);};
  },[]);
  return null;
}
