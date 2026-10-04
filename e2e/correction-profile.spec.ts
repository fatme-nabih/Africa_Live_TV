import {writeFile,mkdir} from 'node:fs/promises';
import {test,expect} from '@playwright/test';
import {fixtureCatalog,FIXTURE_CHANNELS,mockResolutions,mockVlc,serveVideo} from './helpers/tv-fixture';
test('COR-506 : coût local avec 1, 2 et 4 lectures synthétiques',async({browser})=>{
  test.setTimeout(90_000);
  const results: Array<{count:number;readyMs:number;mediaRequests:number;decodedFrames:number[];jsHeapBytes:number;taskSeconds:number}>=[];
  for(const count of [1,2,4,1,2,4,1,2,4]) {
    const context=await browser.newContext({viewport:{width:1366,height:900}});const page=await context.newPage();
    const list=FIXTURE_CHANNELS.filter(c=>c.playbackMode==='BROWSER').slice(0,count);
    await fixtureCatalog(page);await mockVlc(page);const media=await serveVideo(page);await mockResolutions(page);
    await page.addInitScript(channels=>localStorage.setItem('al_recent_channels',JSON.stringify(channels)),list);
    const started=performance.now();
    await page.goto(count===1?'/app?country=SN':'/app/mur');
    if(count===1)await page.locator('#catalogue').getByRole('button',{name:'Regarder Alpha Sénégal',exact:true}).click();
    await expect(page.locator('video')).toHaveCount(count);
    await expect.poll(()=>page.locator('video').evaluateAll(videos=>videos.every(video=>(video as HTMLVideoElement).currentTime>0))).toBe(true);
    const readyMs=performance.now()-started;
    const client=await context.newCDPSession(page);await client.send('Performance.enable');
    const before=await client.send('Performance.getMetrics');
    await expect.poll(()=>page.locator('video').first().evaluate(video=>(video as HTMLVideoElement).currentTime)).toBeGreaterThan(2);
    const after=await client.send('Performance.getMetrics');
    const metrics=Object.fromEntries(after.metrics.map(m=>[m.name,m.value]));
    const startMetrics=Object.fromEntries(before.metrics.map(m=>[m.name,m.value]));
    const decoded=await page.locator('video').evaluateAll(videos=>videos.map(video=>(video as HTMLVideoElement).getVideoPlaybackQuality().totalVideoFrames));
    const audible=await page.locator('video').evaluateAll(videos=>videos.filter(video=>!(video as HTMLVideoElement).muted).length);
    expect(audible).toBeLessThanOrEqual(1);
    results.push({count,readyMs,mediaRequests:media.length,decodedFrames:decoded,jsHeapBytes:metrics.JSHeapUsedSize,taskSeconds:metrics.TaskDuration-startMetrics.TaskDuration});
    await context.close();
  }
  const summary=[1,2,4].map(count=>{const values=results.filter(r=>r.count===count).map(r=>r.readyMs).sort((a,b)=>a-b);return {count,samples:values.length,p50ReadyMs:values[1],p95ReadyMs:values[2]};});
  await mkdir('.local-logs',{recursive:true});await writeFile('.local-logs/corrections-browser-profile.json',JSON.stringify({at:new Date().toISOString(),results,summary,note:'Three samples per configuration; synthetic direct media on local dev runtime, not hardware/mobile or upstream bandwidth capacity.'},null,2));
});
