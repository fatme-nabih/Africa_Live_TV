// Unit tests must supply their external providers. Loopback media test servers
// are allowed; real PostgreSQL and external sockets are not.
// CommonJS is required by Node's --require preload, before tsx imports tests.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const net = require('node:net');
const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  const first = Array.isArray(args[0]) ? args[0][0] : args[0];
  const options = typeof first === 'object' ? first : { port: first, host: typeof args[1] === 'string' ? args[1] : 'localhost' };
  if (!options.path && (Number(options.port) === 5432 || (options.host && !['localhost','127.0.0.1','::1'].includes(options.host)))) {
    process.exitCode = 1;
    throw new Error('UNMOCKED_UNIT_NETWORK_DENIED');
  }
  return connect.apply(this,args);
};
const fetchOriginal=globalThis.fetch;
globalThis.fetch=(input,init)=>{
  const url=new URL(typeof input==='string'||input instanceof URL?input:input.url);
  if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname)){
    process.exitCode=1;throw new Error('UNMOCKED_UNIT_FETCH_DENIED');
  }
  return fetchOriginal(input,init);
};
