export type FavoriteIntent = { desired:boolean; revision:number|string };
export function mergeFavoriteIntents(canonical:string[],intents:Record<string,FavoriteIntent>) {
  const result = new Set(canonical);
  for (const [id,intent] of Object.entries(intents)) { if(intent.desired) result.add(id); else result.delete(id); }
  return [...result];
}
export function acknowledgeFavoriteIntents(current:Record<string,FavoriteIntent>,sent:Record<string,FavoriteIntent>) {
  const pending={...current};
  for(const [id,intent] of Object.entries(sent)) if(pending[id]?.revision===intent.revision) delete pending[id];
  return pending;
}
// Includes startup reads/migration and writes, across remounts in this process.
let queue:Promise<unknown>=Promise.resolve();
export function serializeFavoriteRequest<T>(action:()=>Promise<T>):Promise<T> {
  const next=queue.catch(()=>{}).then(action);
  queue=next.catch(()=>{});
  return next;
}
