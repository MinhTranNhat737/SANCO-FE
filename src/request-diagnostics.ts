// Local counters only: no URLs, credentials, identifiers or telemetry requests.
const buckets=new Map<string,{count:number;started:number;warned:boolean}>();
export function recordRequest(path:string){
  const key=path.split('?')[0].replace(/\/(rooms|practice|matches)\/[^/]+/,'/$1/:id');
  let bucket=buckets.get(key);
  if(!bucket||Date.now()-bucket.started>=60000){bucket={count:0,started:Date.now(),warned:false};if(buckets.size>=64)buckets.delete(buckets.keys().next().value!);buckets.set(key,bucket);}
  if(++bucket.count>60&&!bucket.warned){bucket.warned=true;console.warn('[network] request burst',key,bucket.count);}
}
