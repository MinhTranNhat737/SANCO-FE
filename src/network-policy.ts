export const SOCKET_POLICY={withCredentials:true,transports:['websocket','polling'],tryAllTransports:true,
  reconnectionDelay:1000,reconnectionDelayMax:30000,randomizationFactor:0.5,reconnectionAttempts:8,timeout:10000};

export function retryDelay(base:number,failures:number,random=Math.random){
  return failures?Math.min(60000,base*2**Math.min(failures,6))*(0.8+random()*0.4):base*(1+random()*0.1);
}
export function terminalNetworkError(error:unknown){
  return [401,403,404,410].includes((error as {status?:number})?.status??0);
}
// Completion-driven scheduling prevents slow responses from overlapping ticks.
export function startPolling(work:()=>Promise<unknown>,options:{delay:()=>number;enabled?:()=>boolean;immediate?:boolean}){
  let stopped=false,running=false,failures=0,retryAfter=0,timer:ReturnType<typeof setTimeout>;
  const schedule=()=>{if(!stopped){timer=setTimeout(()=>void tick(),Math.max(retryAfter,retryDelay(options.delay(),failures)));retryAfter=0;}};
  const tick=async()=>{
    if(stopped||running)return;
    clearTimeout(timer);
    if(document.hidden||navigator.onLine===false||options.enabled?.()===false){schedule();return;}
    running=true;
    try{await work();failures=0;}
    catch(error){failures++;if(terminalNetworkError(error))stopped=true;
      retryAfter=(error as {retryAfter?:number})?.retryAfter||0;}
    finally{running=false;schedule();}
  };
  const wake=()=>{if(!document.hidden&&navigator.onLine!==false)void tick();};
  document.addEventListener('visibilitychange',wake);window.addEventListener('online',wake);
  if(options.immediate)void tick();else schedule();
  return {wake,stop(){stopped=true;clearTimeout(timer);document.removeEventListener('visibilitychange',wake);window.removeEventListener('online',wake);}};
}
