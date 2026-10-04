import assert from 'node:assert/strict';
import test from 'node:test';
import { createNabooPayTransaction, NabooPayApiError, type NabooPayTransactionRequest } from './naboopay';
import { paymentCreationFailureStatus } from './payment-creation-policy';
import { SupervisedBatchWriter } from './supervised-batch-writer';
import { SearchArticlesCache, SEARCH_ARTICLES_TTL_MS } from './search-articles-cache';
import { BoundedTtlCache } from './bounded-ttl-cache';
import { acknowledgeFavoriteIntents, mergeFavoriteIntents, serializeFavoriteRequest } from './favorite-sync';

const request:NabooPayTransactionRequest={method_of_payment:['wave'],products:[{name:'test',price:990,quantity:1}],customer:{first_name:'A',last_name:'B',phone:'+221770000000'},success_url:'https://fixture.test/success',error_url:'https://fixture.test/error'};
for(const partial of [false,true]) test(`F3: timeout includes ${partial?'partial':'empty'} stalled response body and cancels it`,async()=>{
  const previous=process.env.NABOOPAY_API_KEY;process.env.NABOOPAY_API_KEY='fixture';
  let canceled=false,calls=0;
  try {
    await assert.rejects(createNabooPayTransaction(request,{timeoutMs:20,fetch:async()=>{
      calls++;return new Response(new ReadableStream<Uint8Array>({start(controller){if(partial)controller.enqueue(new TextEncoder().encode('{'));},cancel(){canceled=true;}}));
    }}),error=>error instanceof NabooPayApiError&&error.type==='timeout');
    assert.equal(calls,1);assert.equal(canceled,true);
  } finally {if(previous===undefined)delete process.env.NABOOPAY_API_KEY;else process.env.NABOOPAY_API_KEY=previous;}
});
test('F3: successful, malformed, oversized and absent provider bodies are bounded',async()=>{
  const previous=process.env.NABOOPAY_API_KEY;process.env.NABOOPAY_API_KEY='fixture';
  try {
    const result=await createNabooPayTransaction(request,{fetch:async()=>Response.json({order_id:'order',checkout_url:'https://checkout.naboopay.com/test'})});
    assert.equal(result.order_id,'order');
    for(const body of ['no json','x'.repeat(65537),null]) await assert.rejects(createNabooPayTransaction(request,{fetch:async()=>new Response(body)}),error=>error instanceof NabooPayApiError&&error.type==='invalide');
  }finally{if(previous===undefined)delete process.env.NABOOPAY_API_KEY;else process.env.NABOOPAY_API_KEY=previous;}
});
test('F3/F4: uncertain acceptance never becomes a definite failure',()=>{
  for(const type of ['timeout','indisponibilite','invalide'] as const)assert.equal(paymentCreationFailureStatus(new NabooPayApiError('',503,type)),'reconciliation_required');
  assert.equal(paymentCreationFailureStatus(new Error('crash')),'reconciliation_required');
  assert.equal(paymentCreationFailureStatus(new NabooPayApiError('',400,'validation')),'failed');
});
test('worker writes are supervised and failed batches remain outstanding',async()=>{
  let calls=0;const writer=new SupervisedBatchWriter<number>(2,async()=>{if(++calls===2)throw new Error('SQL_FAILURE');});
  writer.add(1);writer.add(2);await writer.flush();assert.equal(writer.written,2);
  writer.add(3);writer.add(4);await assert.rejects(writer.flush(),/SQL_FAILURE/);
  assert.equal(writer.remaining,2);assert.equal(writer.written,2);assert.throws(()=>writer.add(5),/SQL_FAILURE/);
});
test('F8: search TTL, coalescence, empty success and error recovery use controlled clock',async()=>{
  const cache=new SearchArticlesCache();let now=0,calls=0;
  const load=async()=>{calls++;return [];};
  await Promise.all([cache.load(load,()=>now),cache.load(load,()=>now)]);assert.equal(calls,1);
  now=SEARCH_ARTICLES_TTL_MS-1;await cache.load(load,()=>now);assert.equal(calls,1);
  now++;await assert.rejects(cache.load(async()=>{throw new Error('offline');},()=>now));
  await cache.load(load,()=>now);assert.equal(calls,2);
});
test('weather memory is bounded, evicts LRU and expired entries',()=>{
  const cache=new BoundedTtlCache<number,number>(256,100);
  for(let i=0;i<10000;i++)cache.set(i,i,0);
  assert.equal(cache.size,256);assert.equal(cache.get(0,0),undefined);assert.equal(cache.get(9999,100),undefined);assert.equal(cache.size,0);
});
test('F5: serial snapshots preserve pending intentions and same-value newer revision',async()=>{
  const order:number[]=[];await Promise.all([serializeFavoriteRequest(async()=>{order.push(1);}),serializeFavoriteRequest(async()=>{order.push(2);})]);
  assert.deepEqual(order,[1,2]);
  const sent={a:{desired:true,revision:1}};const current={a:{desired:true,revision:3},b:{desired:true,revision:2}};
  assert.deepEqual(mergeFavoriteIntents(['a'],acknowledgeFavoriteIntents(current,sent)),['a','b']);
});
