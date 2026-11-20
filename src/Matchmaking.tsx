import { languageTag, t } from './language.ts';
import {useEffect,useId,useRef,useState} from 'react';
import {ArrowRight,Bot,ChevronDown,LoaderCircle,RotateCcw,Search,Trophy} from 'lucide-react';
import {api,ApiError} from './api';
import {GAME_KINDS,META,type GameKind} from './practice-types';
import {rankName,POOL_LABELS,type MatchPreset,type MatchTicket,type Rating} from './rating-types';
import type {Room,User} from './types';
import RankBadge from './RankBadge';

type Props={
  initialKind:GameKind;initialPool:MatchPreset['pool'];user:User|null;onMatch:(room:Room)=>void;onBot:(kind:GameKind)=>void;
  onLogin:()=>void;onRankings:(kind:GameKind,pool:MatchPreset['pool'])=>void;
};
const IDLE:MatchTicket={status:'idle'};

export default function Matchmaking({initialKind,initialPool,user,onMatch,onBot,onLogin,onRankings}:Props){
  const gameSelectId=useId();
  const [kind,setKind]=useState(initialKind);
  const [presets,setPresets]=useState<Partial<Record<GameKind,MatchPreset[]>>>({});
  const [presetId,setPresetId]=useState(initialPool==='rapid'?'10-0':initialPool==='classical'?'30-0':'5-0');
  const [ticket,setTicket]=useState<MatchTicket>(IDLE);
  const [rating,setRating]=useState<Rating>();
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [loadAttempt,reload]=useState(0),[loadFailed,setLoadFailed]=useState(false);
  const selected=presets[kind]?.find(p=>p.id===presetId)??presets[kind]?.[0];
  const mounted=useRef(false),request=useRef(0),current=useRef<MatchTicket>(IDLE),polling=useRef(false),submitting=useRef(false);
  const matchCallback=useRef(onMatch);matchCallback.current=onMatch;

  const updateTicket=(next:MatchTicket)=>{
    current.current=next;setTicket(next);
    if(next.status!=='idle'){setKind(next.kind);setPresetId(next.preset);}
  };
  function report(error:unknown,queue=true){
    const message=queue&&error instanceof ApiError&&error.status===404?t('Máy chủ tìm trận chưa sẵn sàng. Hãy thử tải lại.'):
      error instanceof Error?error.message:t('Chưa kết nối được máy chủ.');
    setError(message);
  }

  useEffect(()=>{
    mounted.current=true;
    submitting.current=false;setBusy(false);
    if(!user)return ()=>{mounted.current=false;};
    const id=++request.current;
    setLoading(true);setLoadFailed(false);setError('');
    api<{presets:Record<GameKind,MatchPreset[]>;ticket:MatchTicket}>('/matchmaking').then(data=>{
      if(mounted.current&&id===request.current){setPresets(data.presets);updateTicket(data.ticket);}
    }).catch(error=>{if(mounted.current&&id===request.current){setLoadFailed(true);report(error);}}).finally(()=>{
      if(mounted.current&&id===request.current)setLoading(false);
    });
    return ()=>{
      mounted.current=false;request.current++;
      if(current.current.status==='searching')void api('/matchmaking',{action:'cancel'}).catch(()=>{});
    };
  },[user?.id,user?.account,loadAttempt]);

  useEffect(()=>{
    setRating(undefined);
    if(!user||!selected)return;
    let active=true;
    api<{ratings:Record<GameKind,Rating>}>(`/ratings?pool=${selected.pool}`).then(data=>{if(active)setRating(data.ratings[kind]);}).catch(()=>{});
    return ()=>{active=false;};
  },[user?.id,kind,selected?.pool]);

  async function send(action:'search'|'poll'|'cancel'){
    if(submitting.current)return;
    const id=++request.current;
    if(action!=='poll'){submitting.current=true;setBusy(true);}
    try{
      setError('');
      const {ticket:next}=await api<{ticket:MatchTicket}>('/matchmaking',{action,...(action==='search'?{kind,preset:selected?.id}:{})});
      if(!mounted.current||id!==request.current)return;
      updateTicket(next);
      return next;
    }catch(error){if(mounted.current&&id===request.current)report(error);}
    finally{if(mounted.current&&id===request.current&&action!=='poll'){submitting.current=false;setBusy(false);}}
  }

  useEffect(()=>{
    if(ticket.status!=='searching'||busy)return;
    const timer=setInterval(async()=>{
      if(document.hidden||polling.current)return;
      polling.current=true;
      try{await send('poll');}finally{polling.current=false;}
    },1800);
    return ()=>clearInterval(timer);
  },[ticket.status,busy]);

  const roomId=ticket.status==='matched'?ticket.roomId:null;
  async function openMatch(id:string){
    setBusy(true);setError('');
    try{const {room}=await api<{room:Room}>(`/rooms/${id}`);if(mounted.current)matchCallback.current(room);}
    catch(error){if(mounted.current)report(error,false);}
    finally{if(mounted.current)setBusy(false);}
  }
  useEffect(()=>{if(roomId)void openMatch(roomId);},[roomId]);

  async function playBot(){
    const next=ticket.status==='searching'?await send('cancel'):IDLE;
    if(next?.status==='idle')onBot(kind);
  }

  return <div className="rankings-page match-page">
    <div className="page-heading"><h1>{t('Tìm trận')}</h1></div>
    <form className="panel match-form" aria-label={t('Tìm trận xếp hạng')} onSubmit={e=>{e.preventDefault();if(user?.account&&selected&&ticket.status==='idle'&&!loading&&!busy&&!loadFailed)void send('search');}}>
      <div className="match-settings">
        <label className="match-kind-label" htmlFor={gameSelectId}>{t('Môn cờ')}</label>
        <div className="match-kind-select">
          <img src={`/thumbs/${kind}.jpg`} width="30" height="30" alt="" aria-hidden="true"/>
          <select id={gameSelectId} disabled={busy||ticket.status!=='idle'} value={kind} onChange={e=>{setKind(e.target.value as GameKind);setPresetId('10-0');}}>
            {GAME_KINDS.map(game=><option key={game} value={game}>{META[game].name}</option>)}
          </select>
          <ChevronDown className="match-kind-chevron" size={18} aria-hidden="true"/>
        </div>
        {presets[kind]&&<fieldset><legend>{kind==='commander'?t('Thời gian cả ván'):t('Thời gian mỗi bên')}</legend>
          <div className="match-presets">{presets[kind]?.map(preset=><button type="button" key={preset.id} disabled={busy||ticket.status!=='idle'} aria-pressed={selected?.id===preset.id} onClick={()=>setPresetId(preset.id)}><strong>{preset.minutes}{preset.increment?` + ${preset.increment}`:t(' phút')}</strong><small>{kind==='commander'?t('Tổng lực'):POOL_LABELS[preset.pool]}</small></button>)}</div>
        </fieldset>}
        {selected&&<div className="match-rating-strip">
          {rating&&<div className="match-personal"><RankBadge rank={rating.rank} small/><span><strong>{rating.elo} Elo</strong><small>{rating.provisional?t('{0}/10 ván phân hạng', rating.games):rankName(rating.rank)}</small></span></div>}
          <button type="button" className="text-button" disabled={ticket.status!=='idle'||busy} onClick={()=>onRankings(kind,selected.pool)}><Trophy size={16}/>{t('Hạng của tôi')}</button>
        </div>}
      </div>
      <section className="match-status" aria-label={t('Trạng thái tìm trận')}>
        {error&&<p className="error-box" role="alert">{t(error)}</p>}
        {ticket.status==='searching'?<>
          <div role="status"><h2><LoaderCircle className="spin" size={21}/>{' ' + t('Đang tìm đối thủ')}</h2><p>{t('Đã chờ') + ' '}{Math.floor(ticket.waitedMs/1000)}{' ' + t('giây · Phạm vi ±')}{ticket.eloWindow} Elo</p></div>
          <button type="button" className="button button-secondary full" disabled={busy} onClick={()=>void send('cancel')}>{t('Hủy tìm trận')}</button>
          {ticket.botAvailable&&<button type="button" className="text-button" disabled={busy} onClick={()=>void playBot()}><Bot size={17}/>{t('Chuyển sang đấu bot')}</button>}
        </>:ticket.status==='matched'?<>
          <h2 role="status">{t('Đã tìm thấy đối thủ')}</h2><button type="button" className="button full" disabled={busy} onClick={()=>void openMatch(ticket.roomId)}>{t('Vào bàn cờ')}<ArrowRight size={17}/></button>
        </>:<div className="match-actions">
          {loadFailed?<button type="button" className="button" onClick={()=>reload(n=>n+1)}><RotateCcw size={17}/>{t('Tải lại')}</button>:
            user&&!user.account?<button type="button" className="button" onClick={onLogin}>{t('Đăng nhập để tìm trận')}<ArrowRight size={17}/></button>:
            <button type="submit" className="button" disabled={loading||busy||!selected}>{loading||busy?<LoaderCircle className="spin" size={18}/>:<Search size={18}/>}{t('Tìm trận')}</button>}
          <button type="button" className="button button-secondary" disabled={!user||busy} onClick={()=>void playBot()}><Bot size={17}/>{t('Đấu bot')}</button>
        </div>}
      </section>
    </form>
  </div>;
}
