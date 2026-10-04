export class BoundedTtlCache<K,V> {
  private entries=new Map<K,{value:V;expiresAt:number}>();
  constructor(readonly capacity:number,private ttlMs:number) {}
  get size(){return this.entries.size;}
  clear(){this.entries.clear();}
  prune(now=Date.now()){for(const [key,entry] of this.entries)if(entry.expiresAt<=now)this.entries.delete(key);}
  get(key:K,now=Date.now()) {
    this.prune(now);const entry=this.entries.get(key);if(!entry)return undefined;
    this.entries.delete(key);this.entries.set(key,entry);return entry.value;
  }
  set(key:K,value:V,now=Date.now()) {
    this.prune(now);this.entries.delete(key);
    while(this.entries.size>=this.capacity)this.entries.delete(this.entries.keys().next().value!);
    this.entries.set(key,{value,expiresAt:now+this.ttlMs});
  }
}
