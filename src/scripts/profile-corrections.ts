import { cpus, totalmem, platform } from 'node:os';
import { mkdir,writeFile } from 'node:fs/promises';
import { pool } from '../db';

function statistics(values:number[]) {const sorted=[...values].sort((a,b)=>a-b);return {samples:values.length,p50Ms:sorted[Math.floor(sorted.length*.5)],p95Ms:sorted[Math.min(sorted.length-1,Math.floor(sorted.length*.95))]};}
async function run(){
  const dbTarget=new URL(process.env.DATABASE_URL??'');
  const origin=new URL(process.env.E2E_BASE_URL??'http://127.0.0.1:3001');
  if(!['localhost','127.0.0.1','[::1]'].includes(dbTarget.hostname)||dbTarget.pathname!=='/africa_live_dev'||!['localhost','127.0.0.1'].includes(origin.hostname)||origin.port!=='3001')throw new Error('LOCAL_PROFILE_REQUIRED');
  const queries={
    auditSample:`select c.id,c.name from channels c where c.active and c.country_code='SN' and c.normalized_name !~* '(^|[^[:alnum:]])canal[[:space:]]*([+]|plus)([^[:alnum:]]|$)' order by c.name,c.id limit 120`,
    exactList:`select c.id,c.name from channels c where c.active and c.country_code='SN' and c.normalized_name !~* '(^|[^[:alnum:]])canal[[:space:]]*([+]|plus)([^[:alnum:]]|$)' and exists(select 1 from streams s where s.channel_id=c.id and s.active and s.status in ('BROWSER_OK','VLC_ONLY','UNTESTED') and s.direct_eligibility!='OFFLINE') order by c.name,c.id limit 40`,
    exactCount:`select count(*)::int from channels c where c.active and c.country_code='SN' and c.normalized_name !~* '(^|[^[:alnum:]])canal[[:space:]]*([+]|plus)([^[:alnum:]]|$)' and exists(select 1 from streams s where s.channel_id=c.id and s.active and s.status in ('BROWSER_OK','VLC_ONLY','UNTESTED') and s.direct_eligibility!='OFFLINE')`,
  };
  const sql:Record<string,ReturnType<typeof statistics>>={};
  for(const [name,query] of Object.entries(queries)){await pool.query(query);const values:number[]=[];for(let i=0;i<30;i++){const start=performance.now();await pool.query(query);values.push(performance.now()-start);}sql[name]=statistics(values);}
  const api=[];
  await fetch(new URL('/api/health',origin));
  for(const concurrency of [1,5,10]){const values:number[]=[];let failures=0;const startAll=performance.now();
    for(let wave=0;wave<5;wave++) await Promise.all(Array.from({length:concurrency},async()=>{const start=performance.now();const response=await fetch(new URL('/api/health',origin),{signal:AbortSignal.timeout(10_000)});await response.json();if(!response.ok)failures++;values.push(performance.now()-start);}));
    api.push({concurrency,...statistics(values),failures,elapsedMs:performance.now()-startAll});
  }
  const inventory=(await pool.query('select (select count(*)::int from channels) channels,(select count(*)::int from streams) streams')).rows[0];
  const result={at:new Date().toISOString(),node:process.version,platform:platform(),cpu:cpus()[0]?.model,logicalCpus:cpus().length,totalMemoryBytes:totalmem(),inventory,sql,api,profilerMemory:process.memoryUsage(),notes:['Read-only SQL on africa_live_dev; bounded public health requests only.','auditSample reproduces old sampling query structure; not a recorded HTTP before/after.','Local build/runtime specified by the caller; no staging traffic or upstream media.']};
  await mkdir('.local-logs',{recursive:true});await writeFile('.local-logs/corrections-profile.json',JSON.stringify(result,null,2));
  console.log(JSON.stringify({sql,api}));
}
run().catch(()=>{console.error('Local profiling failed.');process.exitCode=1;}).finally(()=>pool.end());
