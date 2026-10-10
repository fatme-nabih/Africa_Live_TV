import { test, expect } from '@playwright/test';
const snapshot = (title:string) => ({ articles:[{ id:title,title,url:'https://news.fixture.test/' + title,publishedAt:new Date().toISOString(),countryCode:'SN',sourceName:'Fixture',editorialScope:'africa' }],sources:[],updatedAt:new Date().toISOString(),stale:false });
test.beforeEach(async ({ page }) => {
  await page.route('**/api/live/channels?summary=true',route => route.fulfill({ json:{ countries:[] } }));
  await page.route('**/api/live/channels?country=*',route => route.fulfill({ json:{ channels:[] } }));
});
test('B13: the newer periodic response survives a late old response', async ({ page }) => {
  await page.addInitScript(() => {
    const intervals: { fn:()=>void; ms:number }[] = []; Object.assign(window,{ testIntervals:intervals });
    const original = window.setInterval;
    window.setInterval = ((fn:()=>void,ms:number) => { intervals.push({ fn,ms }); return original(fn,ms); }) as typeof window.setInterval;
  });
  let reads = 0, release!:()=>void, oldServed!:()=>void; const held = new Promise<void>(resolve => { release = resolve; });
  const oldDone = new Promise<void>(resolve => { oldServed = resolve; });
  await page.route('**/api/live/rss',async route => { const index = ++reads; if (index === 1) await held; await route.fulfill({ json:snapshot(index === 1 ? 'Old' : 'New') }).catch(() => {}); if (index === 1) oldServed(); });
  await page.goto('/?kind=radar');
  await page.waitForFunction(() => (window as unknown as { testIntervals:{fn:()=>void;ms:number}[] }).testIntervals.some(interval => interval.ms === 300000));
  await page.evaluate(() => (window as unknown as { testIntervals:{fn:()=>void;ms:number}[] }).testIntervals.find(interval => interval.ms === 300000)!.fn());
  await expect(page.getByTestId('radar-state')).toContainText('New'); release();
  await oldDone;
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expect(page.getByTestId('radar-state')).not.toContainText('Old');
});
test('B14: an error in SN cannot cancel the later successful CI watch', async ({ page }) => {
  await page.route('**/api/live/rss',route => route.fulfill({ json:snapshot('News') }));
  await page.route('**/api/live/channels?country=*',route => new URL(route.request().url()).searchParams.get('country') === 'SN' ? route.fulfill({ status:500,json:{ error:'SN error' } }) : route.fulfill({ json:{ channels:[{ id:'ci-channel',name:'CI fixture',countryCode:'CI',playbackMode:'BROWSER',availabilityStatus:'READY',logoUrl:null,groupTitle:null }] } }));
  await page.goto('/?kind=radar'); await expect(page.getByTestId('radar-state')).toContainText('Impossible de charger');
  await page.getByRole('button',{ name:'Watch CI' }).click(); await expect(page.getByTestId('radar-state')).toContainText('ci-channel');
});

test('B13: manual refresh invalidates old failure and old finally without replacing current news', async ({ page }) => {
  let reads = 0, release!:()=>void; const held = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/live/rss',async route => { const index = ++reads; if (index === 1) await held; await route.fulfill(index === 1 ? { status:500,json:{ error:'old failure' } } : { json:snapshot('New') }).catch(() => {}); });
  await page.goto('/?kind=radar'); await expect.poll(() => reads).toBe(1);
  await page.getByRole('button',{ name:'Refresh news' }).click(); await expect(page.getByTestId('radar-state')).toContainText('New');
  release(); await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expect(page.getByTestId('radar-state')).toContainText('New'); await expect(page.getByTestId('radar-state')).toContainText('"refreshing":false');
});
for (const outcome of ['error','empty','abandon']) test(`B14: current country ${outcome} produces no late playback`, async ({ page }) => {
  let release!:()=>void; const held = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/live/rss',route => route.fulfill({ json:snapshot('News') }));
  await page.route('**/api/live/channels?country=*',async route => {
    const country = new URL(route.request().url()).searchParams.get('country');
    if (country === 'CI' && outcome === 'abandon') await held;
    await route.fulfill(country === 'CI' && outcome === 'error' ? { status:503,json:{ error:'CI unavailable' } } : { json:{ channels:country === 'CI' && outcome === 'abandon' ? [{ id:'late-ci',name:'Late CI',countryCode:'CI',playbackMode:'BROWSER',availabilityStatus:'READY' }] : [] } }).catch(() => {});
  });
  await page.goto('/?kind=radar'); await page.getByRole('button',{ name:'Watch CI' }).click();
  if (outcome === 'abandon') { await page.getByRole('button',{ name:'Abandon' }).click(); release(); }
  else await expect(page.getByTestId('radar-state')).toContainText('"failed":"CI"');
  await expect(page.getByTestId('radar-state')).toContainText('"loaded":"CI"');
  await expect(page.getByTestId('radar-state')).not.toContainText('"channel":');
});
test('B13 companion: summary generation also ignores an older error after a current success', async ({ page }) => {
  let reads = 0, release!:()=>void; const held = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/live/rss',route => route.fulfill({ json:snapshot('News') }));
  await page.route('**/api/live/channels?summary=true',async route => { const index = ++reads; if (index === 1) await held; await route.fulfill(index === 1 ? { status:500,json:{ error:'old summary' } } : { json:{ countries:[{ code:'CI',name:'CI fixture',totalChannels:1 }] } }).catch(() => {}); });
  await page.goto('/?kind=radar'); await expect.poll(() => reads).toBe(1);
  await page.getByRole('button',{ name:'Refresh news' }).click(); await expect(page.getByTestId('radar-state')).toContainText('CI fixture');
  release(); await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expect(page.getByTestId('radar-state')).toContainText('"summaryError":false');
});
