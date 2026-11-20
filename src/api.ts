import { t } from './language.ts';
export const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
export class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }
export async function api<T = any>(path: string, body?: object, method?: string): Promise<T> {
  const response = await fetch(`${API}/api${path}`, { signal:AbortSignal.timeout(12000),credentials: 'include', method: method || (body ? 'POST' : 'GET'), headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
  let data;
  try { data = await response.json(); } catch { throw new ApiError(t('Chưa kết nối được máy chủ. Kiểm tra backend đang chạy.'), 503); }
  if (!response.ok) throw new ApiError(data.error || t('Không thực hiện được thao tác.'), response.status);
  return data;
}
