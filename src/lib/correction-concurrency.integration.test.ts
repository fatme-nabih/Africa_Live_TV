import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import { Pool } from 'pg';
import { eq, inArray } from 'drizzle-orm';
import { db, pool } from '@/db';
import { users, channels, streams, naboopayTransactions, userFollowedCountries } from '@/db/schema';
import { assertIntegrationTarget } from './integration-test-safety';
import { replaceAccountCountries } from './followed-countries-store';
import {reservePaymentCreation} from './payment-creation-store';
import { claimPaymentReconciliation } from './payment-reconciliation';
import { withWorkerLock } from './worker-lock';
import { usesLocalPlaybackPolicy } from './local-playback-request';
import { getChannelsForAfricanCountry,_clearLiveChannelsCache } from './live-channels';

const enabled=process.env.L3_INTEGRATION_TEST==='1';
const ids:string[]=[];const channelIds:string[]=[];
before(async()=>{if(enabled)await assertIntegrationTarget(pool);});
after(async()=>{if(!enabled)return;if(ids.length)await db.delete(users).where(inArray(users.id,ids));if(channelIds.length)await db.delete(channels).where(inArray(channels.id,channelIds));await pool.end();});
async function user(){const id=randomUUID();ids.push(id);await db.insert(users).values({id,clerkUserId:'fixture-'+id});return id;}
test('F3/F4: concurrent creation keys and reloads share the uncertain reservation',{skip:!enabled},async()=>{
  const userId=await user();
  const values=()=>({id:randomUUID(),userId,checkoutAttemptId:randomUUID(),idempotencyKey:randomUUID(),planCode:'lumina_all_access_monthly',amount:990,status:'creating'});
  const a=values(),b=values();const results=await Promise.all([reservePaymentCreation(a),reservePaymentCreation(b)]);
  assert.equal(results.filter(r=>r.created).length,1);assert.equal(results[0].transaction.id,results[1].transaction.id);
  await db.update(naboopayTransactions).set({status:'reconciliation_required'}).where(eq(naboopayTransactions.id,results[0].transaction.id));
  assert.equal((await reservePaymentCreation(values())).created,false);
  await db.delete(naboopayTransactions).where(eq(naboopayTransactions.userId,userId));
});
test('F6: concurrent country replacements are atomic and return their own snapshots', {skip:!enabled},async()=>{
  const id=await user();
  const lists=[['SN','CI'],['ML','GN'],[],['NG']];
  const result=await Promise.all(lists.map(list=>replaceAccountCountries(id,list)));
  assert.deepEqual(result,lists);
  const rows=await db.select().from(userFollowedCountries).where(eq(userFollowedCountries.userId,id));
  assert.ok(lists.some(list=>JSON.stringify(list)===JSON.stringify(rows.sort((a,b)=>a.position-b.position).map(r=>r.countryCode))));
  await replaceAccountCountries(id,['SN']);
  await assert.rejects(replaceAccountCountries(id,['CI','CI']));
  assert.deepEqual((await db.select().from(userFollowedCountries).where(eq(userFollowedCountries.userId,id))).map(r=>r.countryCode),['SN']);
});
test('F4: ambiguous creations cannot starve 121 identifiable orders; leases rotate and expire', {skip:!enabled},async()=>{
  const id=await user();const now=new Date('2026-10-04T12:00:00Z');const old='2026-10-04T10:00:00Z';
  const values=Array.from({length:242},(_,i)=>({id:randomUUID(),userId:id,checkoutAttemptId:randomUUID(),idempotencyKey:randomUUID(),planCode:'lumina_all_access_monthly',amount:990,status:i<121?'creating':'pending',providerOrderId:i<121?null:'fixture-'+randomUUID(),updatedAt:old}));
  await db.insert(naboopayTransactions).values(values);
  const [a,b]=await Promise.all([claimPaymentReconciliation(now),claimPaymentReconciliation(now)]);
  assert.equal(a.orders.length+b.orders.length,121);assert.equal(new Set([...a.orders,...b.orders].map(o=>o.id)).size,121);
  assert.equal(a.ambiguousCreations,121);assert.equal((await claimPaymentReconciliation(now)).orders.length,0);
  assert.equal((await claimPaymentReconciliation(new Date(now.getTime()+60*60_000))).orders.length,100);
});
test('F10: a reserved connection holds its lock beyond pool idle time, releases after failure', {skip:!enabled},async()=>{
  const lockPool=new Pool({connectionString:process.env.DATABASE_URL,max:2,idleTimeoutMillis:10});
  const key='fixture-'+randomUUID();let release!:()=>void,started!:()=>void;
  const gate=new Promise<void>(resolve=>{release=resolve;});const ready=new Promise<void>(resolve=>{started=resolve;});
  try {
    const first=withWorkerLock(lockPool,key,async()=>{started();await gate;});await ready;
    await new Promise(resolve=>setTimeout(resolve,30));
    assert.equal(await withWorkerLock(lockPool,key,async()=>true),undefined);release();await first;
    await assert.rejects(withWorkerLock(lockPool,key,async()=>{throw new Error('fixture');}),/fixture/);
    assert.equal(await withWorkerLock(lockPool,key,async()=>true),true);
  }finally{release();await lockPool.end();}
});
test('F2/F11: UNTESTED and historical OFFLINE denied strictly, retried only through trusted local requests', {skip:!enabled},async()=>{
  const {resolvePlaybackAttempt}=await import('./playback-resolution');
  const id=await user();const channelId=randomUUID();channelIds.push(channelId);
  await db.insert(channels).values({id:channelId,name:'Fixture Audit',normalizedName:'fixture audit',countryCode:'SN'});
  const streamId=randomUUID();await db.insert(streams).values({id:streamId,channelId,url:'https://media.fixture.test/sample.mp4',status:'UNTESTED',directEligibility:'REVIEW_REQUIRED'});
  const args={userId:id,channelId,destination:'web' as const,playbackSessionId:null,previousAttemptId:null,accessExpiresAt:null};
  await assert.rejects(resolvePlaybackAttempt(args),{code:'WEB_PLAYBACK_UNAVAILABLE'});
  await db.update(streams).set({status:'OFFLINE',directEligibility:'OFFLINE'}).where(eq(streams.id,streamId));
  const [before]=await db.select().from(streams).where(eq(streams.id,streamId));
  const old=process.env.NEXT_PUBLIC_LOCAL_PLAYBACK;process.env.NEXT_PUBLIC_LOCAL_PLAYBACK='true';
  try {
    const request=new Request('http://localhost:3001/api/playback/resolutions',{method:'POST',headers:{host:'localhost:3001',origin:'http://localhost:3001'}});
    assert.equal(usesLocalPlaybackPolicy(request),true);
    assert.equal((await resolvePlaybackAttempt({...args,request})).source.id,streamId);
    const spoof=new Request(request.url,{method:'POST',headers:{host:'localhost:3001',origin:'http://localhost:3001','x-forwarded-for':'198.51.100.1'}});
    await assert.rejects(resolvePlaybackAttempt({...args,request:spoof}),{code:'WEB_PLAYBACK_UNAVAILABLE'});
    assert.deepEqual((await db.select().from(streams).where(eq(streams.id,streamId)))[0],before);
    const cached=await getChannelsForAfricanCountry('SN',true,40,db,true);
    assert.ok(cached.channels.some(channel=>channel.id===channelId));
    await db.update(streams).set({active:false}).where(eq(streams.id,streamId));
    assert.ok((await getChannelsForAfricanCountry('SN',true,40,db,true)).channels.some(channel=>channel.id===channelId));
    await assert.rejects(resolvePlaybackAttempt({...args,request}),{code:'WEB_PLAYBACK_UNAVAILABLE'});
    await db.update(channels).set({active:false}).where(eq(channels.id,channelId));
    await assert.rejects(resolvePlaybackAttempt({...args,request}),{code:'CHANNEL_NOT_FOUND'});
  }finally{if(old===undefined)delete process.env.NEXT_PUBLIC_LOCAL_PLAYBACK;else process.env.NEXT_PUBLIC_LOCAL_PLAYBACK=old;}
  assert.deepEqual((await db.select().from(streams).where(eq(streams.id,streamId)))[0],{...before,active:false});
});
test('Radar exact total and limit-specific cache: 121 visible at 10/40/80, canPlay is per request', {skip:!enabled},async()=>{
  const rows=Array.from({length:121},(_,i)=>({id:randomUUID(),name:`Fixture ${String(i).padStart(3,'0')}`,normalizedName:'fixture '+i,countryCode:'KM'}));
  channelIds.push(...rows.map(r=>r.id));await db.insert(channels).values(rows);
  await db.insert(streams).values(rows.map(ch=>({id:randomUUID(),channelId:ch.id,url:'https://media.fixture.test/sample.mp4',status:'UNTESTED',directEligibility:'REVIEW_REQUIRED'})));
  _clearLiveChannelsCache();
  for(const limit of [10,40,80]){const result=await getChannelsForAfricanCountry('KM',true,limit);assert.equal(result.channels.length,limit);assert.equal(result.total,121);}
  assert.equal((await getChannelsForAfricanCountry('KM',false,40)).canPlay,false);
});
