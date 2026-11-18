import {useEffect,useRef,useState} from 'react';
import {ArrowRight,Bot,Clock3,LoaderCircle,Search,Swords,Trophy} from 'lucide-react';
import {api} from './api';
import {GAME_KINDS,META,type GameKind} from './practice-types';
import {POOL_LABELS,type MatchPreset,type MatchTicket,type Rating} from './rating-types';
import type {Room,User} from './types';

type Props={
  initialKind:GameKind;initialPool:MatchPreset['pool'];user:User|null;onMatch:(room:Room)=>void;onBot:(kind:GameKind)=>void;
  onLogin:()=>void;onRankings:(kind:GameKind,pool:MatchPreset['pool'])=>void;
};
const IDLE:MatchTicket={status:'idle'};

export default function Matchmaking({initialKind,initialPool,user,onMatch,onBot,onLogin,onRankings}:Props){
  const [kind,setKind]=useState(initialKind);
  const [presets,setPresets]=useState<Partial<Record<GameKind,MatchPreset[]>>>({});
  const [presetId,setPresetId]=useState(initialPool==='rapid'?'10-0':initialPool==='classical'?'30-0':'5-0');
  const [ticket,setTicket]=useState<MatchTicket>(IDLE);
  const [rating,setRating]=useState<Rating>();
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const selected=presets[kind]?.find(p=>p.id===presetId)??presets[kind]?.[0];
  const mounted=useRef(false),request=useRef(0),current=useRef<MatchTicket>(IDLE),polling=useRef(false),submitting=useRef(false);
  const matchCallback=useRef(onMatch);matchCallback.current=onMatch;

  const updateTicket=(next:MatchTicket)=>{
    current.current=next;setTicket(next);
    if(next.status!=='idle'){setKind(next.kind);setPresetId(next.preset);}
  };
  function report(error:unknown){setError(error instanceof Error?error.message:'Chưa kết nối được máy chủ.');}

  useEffect(()=>{
    mounted.current=true;
    submitting.current=false;setBusy(false);
    if(!user)return ()=>{mounted.current=false;};
    const id=++request.current;
    setLoading(true);
    api<{presets:Record<GameKind,MatchPreset[]>;ticket:MatchTicket}>('/matchmaking').then(data=>{
      if(mounted.current&&id===request.current){setPresets(data.presets);updateTicket(data.ticket);}
    }).catch(error=>{if(mounted.current&&id===request.current)report(error);}).finally(()=>{
      if(mounted.current&&id===request.current)setLoading(false);
    });
    return ()=>{
      mounted.current=false;request.current++;
      if(current.current.status==='searching')void api('/matchmaking',{action:'cancel'}).catch(()=>{});
    };
  },[user?.id,user?.account]);

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
    catch(error){if(mounted.current)report(error);}
    finally{if(mounted.current)setBusy(false);}
  }
  useEffect(()=>{if(roomId)void openMatch(roomId);},[roomId]);

  async function playBot(){
    const next=ticket.status==='searching'?await send('cancel'):IDLE;
    if(next?.status==='idle')onBot(kind);
  }

  return <div className="rankings-page match-page">
    <div className="page-heading"><h1><Swords size={28}/> Tìm trận xếp hạng</h1><p>Chọn môn và thời gian để gặp người chơi gần Elo của bạn.</p></div>
    <div className="match-grid">
      <section className="panel match-settings" aria-label="Thiết lập trận">
        <label>Môn cờ<select disabled={busy||ticket.status!=='idle'} value={kind} onChange={e=>{setKind(e.target.value as GameKind);setPresetId('10-0');}}>{GAME_KINDS.map(k=><option key={k} value={k}>{META[k].name}</option>)}</select></label>
        <h2><Clock3 size={18}/> Thời gian mỗi bên</h2>
        <div className="match-presets" aria-label="Thời gian mỗi bên">{presets[kind]?.map(preset=><button type="button" key={preset.id} disabled={busy||ticket.status!=='idle'} aria-pressed={selected?.id===preset.id} onClick={()=>setPresetId(preset.id)}><strong>{preset.minutes}{preset.increment?` + ${preset.increment}`:' phút'}</strong><small>{POOL_LABELS[preset.pool]}</small></button>)}</div>
        {rating&&selected&&<p className="match-personal">{POOL_LABELS[selected.pool]} · <strong>{rating.elo} Elo</strong> · {rating.provisional?`${rating.games}/10 ván phân hạng`:rating.rank}</p>}
        {selected&&<button className="text-button" onClick={()=>onRankings(kind,selected.pool)}><Trophy size={17}/>Xem hạng của tôi</button>}
      </section>
      <section className="panel match-status" aria-label="Trạng thái tìm trận">
        {error&&<p className="error-box" role="alert">{error}</p>}
        {ticket.status==='searching'?<>
          <div role="status"><h2><LoaderCircle className="spin" size={21}/> Đang tìm đối thủ</h2><p>Đã chờ {Math.floor(ticket.waitedMs/1000)} giây · Phạm vi ±{ticket.eloWindow} Elo</p></div>
          <button className="button button-secondary full" disabled={busy} onClick={()=>void send('cancel')}>Hủy tìm trận</button>
          {ticket.botAvailable&&<button className="text-button" disabled={busy} onClick={()=>void playBot()}><Bot size={17}/>Chuyển sang đấu bot</button>}
        </>:ticket.status==='matched'?<>
          <h2 role="status">Đã tìm thấy đối thủ</h2><button className="button full" disabled={busy} onClick={()=>void openMatch(ticket.roomId)}>Vào bàn cờ<ArrowRight size={17}/></button>
        </>:<>
          <h2>Đấu với người chơi</h2><p>Cùng môn, cùng thời gian. Khoảng Elo mở dần khi bạn chờ.</p>
          {user&&!user.account?<button className="button full" onClick={onLogin}>Đăng nhập để tìm trận<ArrowRight size={17}/></button>:<button className="button full" disabled={loading||busy||!selected} onClick={()=>void send('search')}><Search size={18}/> Tìm trận</button>}
          <button className="text-button" disabled={!user} onClick={()=>void playBot()}><Bot size={17}/>Đấu bot</button>
          <p className="rank-mode-note">Ván bot tính vào Elo chung. Đấu người tính Elo theo nhóm thời gian.</p>
        </>}
      </section>
    </div>
  </div>;
}
