import { t } from './language.ts';
import {recordRequest} from './request-diagnostics';
import {apiOrigin} from './api-origin';
export const API = apiOrigin(import.meta.env.VITE_API_URL || '');
export class ApiError extends Error { constructor(message: string, public status: number,public retryAfter=0) { super(message); } }
const reads=new Map<string,Promise<any>>();
export function api<T = any>(path: string, body?: object, method?: string): Promise<T> {
  const read=!body&&(!method||method==='GET');
  if(read&&reads.has(path))return reads.get(path)!;
  const request=requestApi<T>(path,body,method);
  if(read){reads.set(path,request);void request.finally(()=>{if(reads.get(path)===request)reads.delete(path);}).catch(()=>{});}
  else reads.clear();
  return request;
}
async function requestApi<T>(path:string,body?:object,method?:string):Promise<T>{
  recordRequest(path);
  const response = await fetch(`${API}/api${path}`, { signal:AbortSignal.timeout(12000),credentials: 'include', method: method || (body ? 'POST' : 'GET'), headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
  let data;
  try { data = await response.json(); } catch { throw new ApiError(t('Chưa kết nối được máy chủ. Kiểm tra backend đang chạy.'), response.ok?502:response.status); }
  if (!response.ok) throw new ApiError(data?.error || t('Không thực hiện được thao tác.'), response.status,Math.min(300000,Number(response.headers.get('Retry-After')||0)*1000));
  return data;
}
