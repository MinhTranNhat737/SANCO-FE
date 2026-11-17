import type {Socket} from 'socket.io-client';
import {api,ApiError} from './api';
export {mergeLive} from './live-state';
export async function gameAction(socket:Socket|null,type:'room'|'practice',id:string,body:object){
  if(socket?.connected){
    try{
      const result=await socket.timeout(4000).emitWithAck(`${type}-action`,{id,body});
      if(result.error)throw new ApiError(result.error,result.status||400);
      return result;
    }catch(error){if(error instanceof ApiError)throw error;}
  }
  // Reuse actionId on timeout: durable receipts make a socket/HTTP race safe.
  try{return await api(`/${type==='room'?'rooms':'practice'}/${id}/actions`,body);}
  catch(error){if(error instanceof TypeError)return api(`/${type==='room'?'rooms':'practice'}/${id}/actions`,body);throw error;}
}
