import assert from 'node:assert/strict';
import test from 'node:test';
import {usesLocalPlaybackPolicy} from './local-playback-request';
test('F2/F11: local flags never authorize staging/production or an untrusted request',()=>{
  const env=process.env as Record<string,string|undefined>;
  const keys=['NODE_ENV','DEPLOYMENT_ENV','NEXT_PUBLIC_LOCAL_PLAYBACK','LOCAL_DEV_MODE'];
  const old=Object.fromEntries(keys.map(key=>[key,env[key]]));
  try {
    env.NODE_ENV='development';env.DEPLOYMENT_ENV='local';env.LOCAL_DEV_MODE='false';env.NEXT_PUBLIC_LOCAL_PLAYBACK='true';
    const headers={host:'localhost:3001',origin:'http://localhost:3001'};
    const request=new Request('http://localhost:3001/api/playback/resolutions',{method:'POST',headers});
    assert.equal(usesLocalPlaybackPolicy(request),true);
    for(const deployment of ['staging','production']){env.DEPLOYMENT_ENV=deployment;assert.equal(usesLocalPlaybackPolicy(request),false);}
    env.DEPLOYMENT_ENV='local';env.NODE_ENV='production';assert.equal(usesLocalPlaybackPolicy(request),false);
    env.NODE_ENV='development';
    const untrustedHeaders: Record<string,string>[] = [{origin:'https://foreign.test'},{'x-forwarded-for':'203.0.113.1'},{'x-forwarded-host':'foreign.test'},{forwarded:'for=127.0.0.1'},{'sec-fetch-site':'cross-site'}];
    for(const extra of untrustedHeaders) {
      assert.equal(usesLocalPlaybackPolicy(new Request(request.url,{method:'POST',headers:{...headers,...extra}})),false);
    }
    assert.equal(usesLocalPlaybackPolicy(),false);
  }finally{for(const key of keys){if(old[key]===undefined)delete env[key];else env[key]=old[key];}}
});
