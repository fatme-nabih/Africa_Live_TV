import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { and, eq } from 'drizzle-orm';
import { db, pool } from '../db';
import { channels, playbackSessions, streams, users } from '../db/schema';
import { LOCAL_USER_ID } from '../lib/local-dev';
const marker='.local-logs/correction-ui-user.json';
async function run(){
  const url=new URL(process.env.DATABASE_URL??'');
  if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||url.pathname!=='/africa_live_dev'||process.env.DEPLOYMENT_ENV==='staging'||process.env.DEPLOYMENT_ENV==='production')throw new Error('LOCAL_DATABASE_REQUIRED');
  if(process.argv.includes('--cleanup')){
    const state=JSON.parse(await readFile(marker,'utf8')) as {clerkUserId:string;channelId?:string};
    if(!/^correction-ui-[0-9a-f-]+$/.test(state.clerkUserId))throw new Error('INVALID_FIXTURE_MARKER');
    if(state.channelId&&state.channelId!==state.clerkUserId+'-channel')throw new Error('INVALID_CATALOG_FIXTURE_MARKER');
    await db.transaction(async tx=>{
      if(state.channelId){
        await tx.delete(playbackSessions).where(eq(playbackSessions.channelId,state.channelId));
        await tx.delete(channels).where(eq(channels.id,state.channelId));
      }
      await tx.delete(users).where(and(eq(users.id,LOCAL_USER_ID),eq(users.clerkUserId,state.clerkUserId)));
    });
    await unlink(marker);console.log('Owned UI fixture user and catalogue removed.');return;
  }
  const [existing]=await db.select({id:users.id}).from(users).where(eq(users.id,LOCAL_USER_ID));
  if(existing)throw new Error('EXISTING_LOCAL_USER_PRESERVED');
  const clerkUserId='correction-ui-'+randomUUID();
  const channelId=process.argv.includes('--catalog')?clerkUserId+'-channel':undefined;
  await mkdir('.local-logs',{recursive:true});await writeFile(marker,JSON.stringify({clerkUserId,channelId}),{flag:'wx'});
  try{
    await db.transaction(async tx=>{
      await tx.insert(users).values({id:LOCAL_USER_ID,clerkUserId});
      if(channelId){
        await tx.insert(channels).values({id:channelId,name:'COR UI Senegal',normalizedName:'cor ui senegal',countryCode:'SN',groupTitle:'Test',language:'French'});
        await tx.insert(streams).values({id:channelId+'-stream',channelId,url:'https://media.invalid/cor-ui/live.m3u8'});
      }
    });
  }catch(error){await unlink(marker);throw error;}
  console.log('Owned UI fixture user prepared'+(channelId?' with synthetic catalogue.':'.'));
}
run().catch(error=>{console.error(error instanceof Error?error.message:'Fixture preparation failed');process.exitCode=1;}).finally(()=>pool.end());
