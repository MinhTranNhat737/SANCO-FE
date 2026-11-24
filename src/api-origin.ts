export function apiOrigin(value:string){
  const text=value.trim().replace(/\/+$/,'');
  if(!text)return '';
  const url=new URL(text);
  if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new Error('VITE_API_URL must be a backend HTTP(S) origin without /api, query or credentials.');
  return url.origin;
}
