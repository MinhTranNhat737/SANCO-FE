import { guidePath, languageTag, t } from './language.ts';
import { lazy, Suspense, useState, useEffect, useRef, useId, type ReactNode, type FormEvent } from 'react';
import { io, type Socket } from 'socket.io-client';
import { ArrowRight, ArrowUpRight, BookOpen, Check, CheckCheck, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, CircleHelp, Clock3, Copy, DoorOpen, Eye, EyeOff, Flag, Handshake, History, Home, Leaf, Link2, LoaderCircle, LockKeyhole, LogOut, Menu, MessageCircle, Plus, RotateCcw, Send, ShieldCheck, Sparkles, UserRound, Volume2, VolumeX, Wifi, WifiOff, X as Close } from 'lucide-react';
import { api, API, ApiError } from './api';
import {createLiveReceiver,gameAction} from './live';
import {SOCKET_POLICY,startPolling} from './network-policy';
import type { Room, User, AuthProviders } from './types';
import { Bot } from 'lucide-react';
import {META,RULE_TEXT,GAME_KINDS,isParty,moveRequest,type GameKind,type PracticeMove} from './practice-types';
import {playMoveSound} from './sound-effects';
import GameCatalog from './GameCatalog';
import GameEmblem from './GameEmblem';
import {Trophy} from 'lucide-react';
import {gamePage} from './game-links';
import type {RatingPool} from './rating-types';
import {GraduationCap,PanelLeftClose,PanelLeftOpen,Swords} from 'lucide-react';
import SidebarRankings from './SidebarRankings';
import EstateModePicker from './EstateModePicker';
import LanguageSwitch, { useWebsiteLanguage } from './LanguageSwitch';

const RoomView=lazy(()=>import('./RoomView'));
const Practice=lazy(()=>import('./Practice'));
const Rankings=lazy(()=>import('./Rankings'));
const Matchmaking=lazy(()=>import('./Matchmaking'));

type Page = 'home' | 'rooms' | 'rules' | 'history' | 'practice' | 'rankings' | 'matchmaking';
type Modal = 'choose' | 'invite' | 'create' | 'join' | 'login' | 'register' | 'profile' | 'feedback' | 'resign' | null;
function publicGameLink(url:URL){
  const kind=GAME_KINDS.find(game=>game===url.searchParams.get('game'));
  const mode=url.searchParams.get('mode');
  return {kind,ranked:mode==='ranked',friends:mode==='friends'};
}
const phaseLabel = (room: Room) => ({ waiting: t('Đang chờ'), playing: t('Đang chơi'), finished: t('Đã kết thúc') }[room.game.phase]);
const dateLabel = (at: number) => new Intl.DateTimeFormat(languageTag(), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }).format(at);
function Logo({ small = false }: { small?: boolean }) { return <span className={`brand ${small ? 'brand-small' : ''}`}><img className="brand-emblem" src="/thumbs/sanco-brand.jpg" alt="Sân Cờ" width="384" height="384"/></span>; }
function PageLoadingForm({ label, overlay = false }: { label: string; overlay?: boolean }) {
  return <div className={`sanco-loading-wrap ${overlay ? 'sanco-loading-overlay' : 'empty-state'}`} role="status" aria-live="polite">
    <div className="sanco-loading-card">
      <div className="sanco-boot-emblem-wrap">
        <span className="sanco-boot-ring"/>
        <img className="sanco-boot-emblem" src="/thumbs/sanco-brand.jpg" width="84" height="84" alt="Sân Cờ"/>
      </div>
      <strong className="sanco-boot-title">SÂN CỜ</strong>
      <p className="sanco-boot-sub">{label}</p>
      <div className="sanco-boot-bar"><span/></div>
    </div>
  </div>;
}
function ModalFrame({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const panel = useRef<HTMLDivElement>(null), id = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement, old = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const focus = () => Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input,select,textarea,a[href],summary') || []).filter(node=>node.getClientRects().length>0);
    focus()[0]?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); if (e.key === 'Tab') { const nodes = focus(), first = nodes[0], last = nodes[nodes.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); } } };
    window.addEventListener('keydown', key);
    return () => { document.body.style.overflow = old; window.removeEventListener('keydown', key); previous?.focus(); };
  }, []);
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><div ref={panel} className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={id}><button className="icon-button modal-close" onClick={onClose} aria-label={t('Đóng')}><Close size={20}/></button><h2 id={id}>{title}</h2>{children}</div></div>;
}

export default function App() {
  useWebsiteLanguage();
  const initialUrl = useRef(window.location.href);
  const [entry]=useState(()=>publicGameLink(new URL(initialUrl.current)));
  const [user, setUser] = useState<User | null>(null), [providers, setProviders] = useState<AuthProviders>({ google: false, facebook: false }), [page, setPage] = useState<Page>(() => {
    if(new URL(initialUrl.current).searchParams.has('practice'))return 'practice';
    return entry.kind&&!entry.friends?(entry.ranked?'matchmaking':'practice'):'home';
  });
  const [practiceKind, setPracticeKind] = useState<GameKind>(entry.kind||'chess');
  const [practiceRanked,setPracticeRanked]=useState(entry.ranked);
  const [matchKind,setMatchKind]=useState<GameKind>(entry.kind||'chess');
  const [matchPool,setMatchPool]=useState<Exclude<RatingPool,'overall'>>('rapid');
  const [rankingKind,setRankingKind]=useState<GameKind>('chess'),[rankingPool,setRankingPool]=useState<RatingPool>('rapid');
  const [sidebarCollapsed,setSidebarCollapsed]=useState(()=>localStorage.getItem('sc-sidebar-collapsed')==='true');
  const [createKind,setCreateKind]=useState<GameKind>('caro'),[capacity,setCapacity]=useState(2),[latency,setLatency]=useState<number|null>(null);
  const [estateMode,setEstateMode]=useState<'auto'|'classic'>('auto');
  const [modal, setModal] = useState<Modal>(null), [pendingCreate, setPendingCreate] = useState(false), [authNotice, setAuthNotice] = useState(''), [room, setRoom] = useState<Room | null>(null), [archived, setArchived] = useState(false);
  const [recent, setRecent] = useState<Room[]>([]), [matches, setMatches] = useState<Room[]>([]), [loading, setLoading] = useState(true);
  const [error, setError] = useState(''), [toast, setToast] = useState(''), [busy, setBusy] = useState(false), [connected, setConnected] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [name, setName] = useState(''), [email, setEmail] = useState(''), [password, setPassword] = useState(''), [showPassword, setShowPassword] = useState(false);
  const [minutes, setMinutes] = useState(5), [inviteText, setInviteText] = useState(''), [feedback, setFeedback] = useState(''), [mobileNav, setMobileNav] = useState(false);
  const [sound, setSound] = useState(() => localStorage.getItem('sc-sound') !== 'off');
  const socket = useRef<Socket | null>(null), roomRef = useRef<Room | null>(null), archivedRef = useRef(false), audio = useRef<AudioContext | null>(null);
  useEffect(() => { roomRef.current = room; archivedRef.current = archived; }, [room, archived]);
  useEffect(() => { setError(''); }, [modal]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 5000); return () => clearTimeout(t); }, [toast]);
  const notifyError = (e: unknown) => setError(e instanceof Error ? e.message : 'Không thực hiện được thao tác.');
  const receiver=useRef<ReturnType<typeof createLiveReceiver<Room>>|null>(null);
  const actionPending=useRef(false);
  useEffect(()=>()=>{roomRef.current=null;},[]);
  if(!receiver.current)receiver.current=createLiveReceiver<Room>({current:()=>archivedRef.current?null:roomRef.current,apply:next=>{roomRef.current=next;setRoom(next);},load:async id=>(await api('/rooms/'+encodeURIComponent(id))).room,error:notifyError});
  const acceptRoom=(packet:Room,recover=true)=>receiver.current!(packet,recover);
  const watched=useRef('');
  const watchCurrent=()=>{
    const s=socket.current,current=roomRef.current;
    if(!s?.connected||!current||archivedRef.current)return;
    const key=s.id+':'+current.id;if(watched.current===key)return;watched.current=key;
    s.timeout(5000).emit('watch-room',current.id,(error:Error|null,data:any)=>{if(error){watched.current='';return;}if(data?.room)void acceptRoom(data.room);});
  };
  async function refreshLists() {
    try { const [a, b] = await Promise.all([api('/rooms?summary=1'), api('/history?summary=1')]); setRecent(a.rooms); setMatches(b.matches); } catch (e) { notifyError(e); }
  }
  async function loadSession() {
    setLoading(true); setError('');
    try {
      const data = await api('/me'); setUser(data.user); setName(data.user.name);
      setAnnouncement(data.settings?.announcement || '');
      if (data.providers) setProviders(data.providers);
      const url = new URL(initialUrl.current), id = url.searchParams.get('room');
      const authStatus = url.searchParams.get('auth'), authError = url.searchParams.get('auth_error');
      if (authStatus === 'ok') { setToast('Đăng nhập thành công!'); history.replaceState(null, '', url.pathname || '/'); }
      else if (authError) { setError(authError); history.replaceState(null, '', url.pathname || '/'); }
      const replayId=url.searchParams.get('replay');
      if(replayId){const saved=await api(`/matches/${encodeURIComponent(replayId)}`);setRoom(saved.room);setArchived(true);roomRef.current=saved.room;archivedRef.current=true;}
      if (id) {
        try { const data = await api(`/rooms/${encodeURIComponent(id)}`); setRoom(data.room); setArchived(false); history.replaceState(null, '', `?room=${id}`); }
        catch (e) { if (e instanceof ApiError && e.status === 403) { setInviteText(initialUrl.current); setModal('join'); } else notifyError(e); }
      }
      const link=publicGameLink(url);
      if(link.kind&&link.friends&&!id&&!replayId&&!url.searchParams.has('practice')){
        chooseCreateKind(link.kind);
        setPendingCreate(!data.user.account);
        setAuthNotice(data.user.account?'':'Đăng nhập để tạo phòng và gửi lời mời cho bạn.');
        setModal(data.user.account?'create':'login');
      }
    } catch (e) { notifyError(e); } finally { setLoading(false); }
  }
  useEffect(() => { void loadSession(); }, []);
  useEffect(() => {
    if (!user) return;
    void refreshLists();
    const s = io(API || window.location.origin, SOCKET_POLICY); socket.current = s;
    let exhausted=false,authExpired=false,retryAt=0;
    s.io.on('reconnect_failed',()=>{exhausted=true;retryAt=Date.now()+60000;});
    // After a bounded batch, retry only after a quiet minute. A long outage can
    // recover realtime without a reload; tab/online wakeups still obey the cap.
    const recovery=startPolling(async()=>{if(exhausted&&!authExpired&&!s.connected&&Date.now()>=retryAt){exhausted=false;s.connect();}},{delay:()=>60000});
    s.on('connect', () => { setConnected(true);watchCurrent(); });
    const ping=async()=>{if(!s.connected||document.hidden)return;const started=performance.now();try{await s.timeout(4000).emitWithAck('net-ping');setLatency(Math.round(performance.now()-started));}catch{setLatency(null);}};s.on('connect',ping);const pingTimer=setInterval(ping,15000);void ping();
    s.on('disconnect', reason => {setConnected(false);setLatency(null);if(reason==='io server disconnect')authExpired=true;});
    s.on('connect_error', (error:any) => {setConnected(false);
      if([401,403].includes(error.data?.status)){authExpired=true;s.disconnect();setError(error.message);}
      else if(!s.active){exhausted=true;retryAt=Date.now()+60000;}
    });
    s.on('room', (next: Room) => { if (!archivedRef.current && next?.id && roomRef.current?.id === next.id) void acceptRoom(next); });
    s.on('room-closed', (payload: { id?: string; message?: string }) => {
      if (payload?.id) setRecent(prev => prev.filter(r => r.id !== payload.id));
      if (!archivedRef.current && roomRef.current?.id === payload?.id) {
        roomRef.current = null;
        setRoom(null);
        setPage('rooms');
        history.replaceState(null, '', '/');
        setToast(payload?.message || 'Bàn đã bị hủy và xóa do không hoạt động quá 5 phút.');
      }
    });
    return () => {recovery.stop();clearInterval(pingTimer);s.disconnect();socket.current=null;};
  }, [user]);
  useEffect(() => {
    if (!room || archived) return;
    const id=room.id;let stopped=false;
    const poll=startPolling(async()=>{
      try{const data=await api('/rooms/'+encodeURIComponent(id));if(!stopped)await acceptRoom(data.room,false);}
      catch(e){if(!stopped){if(e instanceof ApiError&&e.status===401)setError(e.message);
        else if(e instanceof ApiError&&[403,404,410].includes(e.status)){roomRef.current=null;setRoom(null);setPage('rooms');history.replaceState(null,'','/');setToast(e.message);}}
        throw e;}
    },{delay:()=>socket.current?.connected?30000:5000});
    return()=>{stopped=true;poll.stop();};
  }, [room?.id,archived,connected]);
  useEffect(()=>{watchCurrent();},[room?.id,archived]);
  useEffect(() => {
    const onPop = () => {
      const url=new URL(window.location.href), link=publicGameLink(url);
      if(url.searchParams.has('practice')){setRoom(null);setArchived(false);setPage('practice');return;}
      const replayId=url.searchParams.get('replay'), id=url.searchParams.get('room');
      if(replayId&&user){api(`/matches/${encodeURIComponent(replayId)}`).then(d=>{setRoom(d.room);setArchived(true);roomRef.current=d.room;archivedRef.current=true;}).catch(notifyError);return;}
      if(id&&user){api(`/rooms/${encodeURIComponent(id)}`).then(d=>{setRoom(d.room);setArchived(false);}).catch(notifyError);return;}
      setRoom(null);setArchived(false);setModal(null);
      if(link.kind&&link.ranked){setMatchKind(link.kind);setPage('matchmaking');return;}
      if(link.kind&&!link.friends){setPracticeKind(link.kind);setPracticeRanked(false);setPage('practice');return;}
      setPage('home');
      if(link.kind&&link.friends){chooseCreateKind(link.kind);openCreateRoom();}
    };
    window.addEventListener('popstate', onPop); return () => window.removeEventListener('popstate', onPop);
  }, [user]);
  function chooseCreateKind(kind:GameKind){setCreateKind(kind);setMinutes(kind==='commander'?30:kind==='monopoly'?0:5);setCapacity(prev=>kind==='monopoly'?Math.min(8,Math.max(2,prev)):kind==='ludo'?Math.min(4,Math.max(2,prev)):2);}
  function openModal(value: Modal) { setError(''); setPassword(''); if (value !== 'login' && value !== 'register') { setPendingCreate(false); setAuthNotice(''); } setModal(value); if (user) setName(user.name); }
  function openCreateRoom() {
    if (!user?.account) {
      setPendingCreate(true);
      setAuthNotice('Bạn cần đăng nhập (Email, Google hoặc Facebook) để tạo phòng.');
      setError(''); setPassword(''); setModal('login');
      if (user) setName(user.name);
      return;
    }
    setPendingCreate(false); setAuthNotice(''); openModal('create');
  }
  function startSocialLogin(provider: 'google' | 'facebook') {
    if (!providers[provider]) {
      setError(provider === 'google'
        ? 'Đăng nhập Google (Gmail) chưa được bật trên máy chủ (thiếu GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).'
        : 'Đăng nhập Facebook chưa được bật trên máy chủ (thiếu FACEBOOK_APP_ID / FACEBOOK_APP_SECRET).');
      return;
    }
    window.location.assign(`${API}/api/auth/${provider}?returnTo=${encodeURIComponent(window.location.origin)}`);
  }
  function navigate(next: Page) {roomRef.current=null;setRoom(null); setArchived(false); setPage(next); setMobileNav(false); setError(''); history.pushState(null, '', '/'); if (user) void refreshLists(); }
  function goPractice(kind: GameKind,ranked=false) { setPracticeKind(kind);setPracticeRanked(ranked); navigate('practice'); }
  function goMatchmaking(kind:GameKind,pool:Exclude<RatingPool,'overall'>='rapid'){
    setMatchKind(kind);setMatchPool(pool);setRankingKind(kind);setRankingPool(pool);navigate('matchmaking');
    history.replaceState(null,'',`/?game=${kind}&mode=ranked`);
  }
  function goRankings(kind:GameKind,pool:RatingPool){setRankingKind(kind);setRankingPool(pool);navigate('rankings');}
  function toggleSidebar(){
    setSidebarCollapsed(!sidebarCollapsed);localStorage.setItem('sc-sidebar-collapsed',String(!sidebarCollapsed));
  }
  function enter(next: Room, past = false) { setRoom(next); roomRef.current = next; setArchived(past); archivedRef.current = past; setModal(null); setError(''); history.pushState(null, '', past ? `?replay=${next.game.id}` : `?room=${next.id}`); window.scrollTo(0, 0); }
  async function openRoom(id: string) { setBusy(true); setError(''); try { const data = await api(`/rooms/${id}`); enter(data.room); } catch (e) { notifyError(e); } finally { setBusy(false); } }
  async function saveName() { if (name.trim() !== user?.name) { const data = await api('/me', { name }, 'PATCH'); setUser(data.user); } }
  async function submitCreate(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try { await saveName(); const data = await api('/rooms', { minutes,kind:createKind,side:'random',capacity:isParty(createKind)?capacity:2,ranked:false,...(createKind==='monopoly'?{estateMode}:{}) }); localStorage.setItem(`sc-invite-${data.room.id}`, data.token); enter(data.room); setToast('Đã tạo phòng giải trí. Mời bạn để chơi.'); } catch (e) { notifyError(e); } finally { setBusy(false); }
  }
  async function submitJoin(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      await saveName(); const input = inviteText.trim();
      if (/^[a-f0-9]{8}$/i.test(input)) { const data = await api(`/rooms/${input.toUpperCase()}`); enter(data.room); }
      else {
        let url: URL; try { url = new URL(input); } catch { throw new Error(t('Hãy dán đầy đủ liên kết mời do bạn của bạn gửi.')); }
        const id = url.searchParams.get('room'), token = new URLSearchParams(url.hash.slice(1)).get('invite');
        if (!id || !/^[a-f0-9]{8}$/i.test(id) || !token) throw new Error(t('Liên kết chưa có lời mời hợp lệ. Hãy xin bạn gửi lại.'));
        const data = await api(`/rooms/${id.toUpperCase()}/join`, { token }); enter(data.room);
      }
    } catch (e) { notifyError(e); } finally { setBusy(false); }
  }
  async function submitAuth(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try { const wasRegister = modal === 'register'; const data = await api(`/auth/${wasRegister ? 'register' : 'login'}`, { name, email, password }); setUser(data.user); setName(data.user.name); setPassword(''); setAuthNotice(''); if (!wasRegister) { roomRef.current=null; archivedRef.current=false; setRoom(null); setArchived(false); setRecent([]); setMatches([]); history.replaceState(null, '', '/'); } if (pendingCreate) { setPendingCreate(false); setModal('create'); } else { setModal(null); } setToast(wasRegister ? 'Chào mừng bạn đến với Sân Cờ!' : 'Mừng bạn quay lại!'); } catch (e) { notifyError(e); } finally { setBusy(false); }
  }
  async function copyInvite(rotate = false) {
    if (!room) return; setBusy(true); setError('');
    try {
      let token = localStorage.getItem(`sc-invite-${room.id}`);
      if (!token || rotate || Date.now() > room.inviteExpiresAt) { const data = await api(`/rooms/${room.id}/invite`, {}); token = data.token; localStorage.setItem(`sc-invite-${room.id}`, token!); acceptRoom(data.room); }
      const link = `${window.location.origin}/?room=${room.id}#invite=${token}`;
      try { await navigator.clipboard.writeText(link); setToast(rotate ? 'Đã thay và sao chép lời mời. Liên kết cũ không còn cấp quyền mới.' : 'Đã sao chép lời mời. Gửi cho bạn của bạn nhé!'); }
      catch { setInviteText(link); openModal('invite'); setToast('Trình duyệt chưa cho sao chép. Bạn có thể chọn liên kết trong ô để sao chép thủ công.'); }
    } catch (e) { notifyError(e); } finally { setBusy(false); }
  }
  async function act(action: string, move?: number|PracticeMove) {
    if (!room || busy || archived || actionPending.current) return;
    actionPending.current=true;setBusy(true); setError('');
    const body = { actionId: crypto.randomUUID(), version: room.version, ...(typeof move==='number'?{cell:move}:move?moveRequest(move):{}), action };
    try {
      const data=await gameAction(socket.current,'room',room.id,body);
      acceptRoom(data.room); setModal(null);
      if (action === 'move' && sound && room.kind !== 'monopoly') {
        const latest = (data.room.game.moves as {from?:number|null;to?:number;action?:string;piece?:string;captured?:string|null;captures?:number[];check?:boolean}[] | undefined)?.at(-1);
        const caps = latest?.captures?.length ? latest.captures : (latest?.captured && latest.to != null ? [latest.to] : []);
        playMoveSound(room.kind, {
          from: latest?.from ?? (typeof move === 'object' ? move.from ?? undefined : undefined),
          to: latest?.to ?? (typeof move === 'object' ? move.to : typeof move === 'number' ? move : undefined),
          action: latest?.action ?? (typeof move === 'object' ? move.action : undefined),
          piece: latest?.piece,
          captures: caps,
          check: Boolean(latest?.check || data.room.game.check),
          checkmate: data.room.game.phase === 'finished' && data.room.game.result?.reason === 'checkmate',
        });
      }
    } catch (e) { notifyError(e); try { const data = await api(`/rooms/${room.id}`); await acceptRoom(data.room,false); } catch {} } finally { actionPending.current=false;setBusy(false); }
  }
  const nav = [{page:'matchmaking' as Page,label:t('Tìm trận'),icon:Swords},{page:'rankings' as Page,label:t('Xếp hạng'),icon:Trophy},{ page: 'home' as Page, label: t('Chơi cờ'), icon: Home }, { page: 'practice' as Page, label: t('Chơi với máy'), icon: Bot }, { page: 'rooms' as Page, label: t('Phòng của tôi'), icon: DoorOpen }, { page: 'history' as Page, label: t('Lịch sử'), icon: History }, { page: 'rules' as Page, label: t('Luật'), icon: BookOpen }];
  const errorBox = error ? <div className="error-box" role="alert">{t(error)}</div> : null;
  const boardFocus=!!room||page==='practice';
  return <div className={`app-shell compact-interface ${boardFocus?'board-focus-shell':''} ${!room&&page==='home'?'home-interface':''} ${sidebarCollapsed?'sidebar-collapsed':''}`}>
    <aside id="app-sidebar" className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}><div className="sidebar-heading"><button className="logo-button" onClick={()=>navigate('home')} aria-label={t('Sân Cờ - trang chủ')}><Logo small/></button><button className="icon-button sidebar-toggle" onClick={toggleSidebar} aria-controls="sidebar-navigation" aria-expanded={!sidebarCollapsed} title={sidebarCollapsed?t('Mở rộng thanh bên'):t('Thu gọn thanh bên')} aria-label={sidebarCollapsed?t('Mở rộng thanh bên'):t('Thu gọn thanh bên')}>{sidebarCollapsed?<PanelLeftOpen size={20}/>:<PanelLeftClose size={20}/>}</button></div><nav id="sidebar-navigation" aria-label={t('Điều hướng chính')}>{nav.map(({ page: p, label, icon: Icon }) => <button key={p} className={`nav-item ${page === p && !room ? 'active' : ''}`} onClick={() => navigate(p)} aria-label={label} title={label}><Icon size={19}/><span>{label}</span>{p === 'home' && <span className="nav-tiny-dot"/>}</button>)}<a className="nav-item" href="/bi-kip" aria-label={t('Bí kíp')} title={t('Bí kíp')}><GraduationCap size={19}/><span>{t('Bí kíp')}</span></a></nav>
      {user?.admin && <a className="nav-item" href="/admin" title="Quản trị website"><ShieldCheck size={19}/><span>Quản trị website</span></a>}
      <SidebarRankings kind={rankingKind} pool={rankingPool} playerId={user?.id??null} hidden={!mobileNav&&(sidebarCollapsed||boardFocus)} refresh={matches.length} onOpen={()=>goRankings(rankingKind,rankingPool)}/>
      <div className="sidebar-bottom"><button className="help-button" onClick={() => openModal('feedback')} aria-label={t('Góp ý')} title={t('Góp ý')}><CircleHelp size={17}/><span>{t('Góp ý')}</span><ArrowUpRight size={15}/></button></div>
    </aside>{mobileNav && <button className="nav-overlay" aria-label={t('Đóng điều hướng')} onClick={() => setMobileNav(false)}/>}
    <div className="main-shell"><header className="topbar"><div className="topbar-left"><button className="icon-button mobile-menu" onClick={()=>setMobileNav(!mobileNav)} aria-controls="app-sidebar" aria-expanded={mobileNav} aria-label={mobileNav?t('Đóng điều hướng'):t('Mở điều hướng')}><Menu size={22}/></button></div><div className="topbar-right"><LanguageSwitch/>{!user?.account && <button className="button button-secondary button-small" disabled={loading||!user} onClick={()=>openModal('register')}>{t('Tạo tài khoản')}</button>}<button className="account-button" onClick={() => openModal(user?.account ? 'profile' : 'login')}><span className="avatar">{user?.name?.slice(0, 1).toUpperCase() || <UserRound size={17}/>}</span><span>{user?.account ? user.name : t('Đăng nhập')}<small>{user?.account ? t('Tài khoản của bạn') : t('Lưu phòng và lịch sử')}</small></span><ChevronRight size={15}/></button></div></header>
    <main className={`content ${room ? 'content-game' : ''}`}>
      {announcement && !room && page !== 'practice' && <div className="info-box" role="status" style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}><MessageCircle size={19}/><span>{announcement}</span></div>}
      {!modal && errorBox}{loading && !user && <PageLoadingForm label={t('Đang kết nối máy chủ & tải dữ liệu…')} overlay/>}{!user && !loading && <button className="button button-small" onClick={loadSession}><RotateCcw size={16}/>{t('Kết nối lại máy chủ')}</button>}
      {room ? <Suspense fallback={<PageLoadingForm label={t('Đang mở bàn cờ…')}/>}><RoomView key={`${room.game.id}-${archived}`} room={room} busy={busy} connected={connected} latency={latency} archived={archived} sound={sound} onSound={()=>{setSound(!sound);localStorage.setItem('sc-sound',sound?'off':'on');}} onBack={() => room.matchmaking&&room.game.phase==='finished'&&!archived?goMatchmaking(room.kind,room.matchmaking.pool):navigate('rooms')} onAction={act} onInvite={copyInvite} onResign={() => openModal('resign')}/></Suspense>
      : page === 'practice' ? <Suspense fallback={<PageLoadingForm label={t('Đang bày bàn luyện tập…')}/>}><Practice key={`${practiceKind}-${practiceRanked}`} initialRanked={practiceRanked} initialKind={practiceKind} user={user} socket={socket.current} onBack={() => navigate('home')}/></Suspense>
      : page === 'matchmaking' ? <Suspense fallback={<PageLoadingForm label={t('Đang mở tìm trận…')}/>}><Matchmaking key={`${matchKind}-${matchPool}`} initialKind={matchKind} initialPool={matchPool} user={user} onMatch={enter} onBot={kind=>goPractice(kind,true)} onLogin={()=>openModal('login')} onRankings={goRankings}/></Suspense>
      : page === 'rankings' ? <Suspense fallback={<PageLoadingForm label={t('Đang tải xếp hạng…')}/>}><Rankings user={user} kind={rankingKind} pool={rankingPool} onFilter={(kind,pool)=>{setRankingKind(kind);setRankingPool(pool);}} onPlay={(kind,pool)=>pool==='overall'?goPractice(kind,true):goMatchmaking(kind,pool)}/></Suspense>
      : page === 'home' ? <>
        <section className="quick-lobby"><h1 className="visually-hidden">{t('Chơi cờ online')}</h1><div className="quick-lobby-actions"><button className="button" disabled={!user} onClick={()=>goMatchmaking('chess')}><Swords size={25}/>{t('Tìm trận')}</button><button className="button" disabled={!user} onClick={openCreateRoom}><Plus size={25}/>{t('Tạo phòng')}</button><button className="button button-secondary" disabled={!user} onClick={()=>goPractice('chess')}><Bot size={25}/>{t('Chơi với máy')}</button><button className="text-button" disabled={!user} onClick={()=>openModal('join')}><Link2 size={25}/>{t('Vào phòng')}</button></div></section>
        {recent.length>0&&<section className="recent-section compact-recent"><div className="section-heading"><h2>{t('Phòng gần đây')}</h2><button className="text-button" onClick={()=>navigate('rooms')}>{t('Tất cả')}<ArrowRight size={15}/></button></div>{loading?<div className="empty-state"><LoaderCircle className="spin"/><p>{t('Đang tải…')}</p></div>:recent.length?<RoomList rooms={recent.slice(0,3)} onOpen={openRoom}/>:<div className="compact-empty"><DoorOpen size={23}/><span>{t('Chưa có phòng')}</span><button className="text-button" disabled={!user} onClick={openCreateRoom}><Plus size={16}/>{t('Tạo phòng')}</button></div>}</section>}
        <GameCatalog disabled={!user} onSelect={kind=>{chooseCreateKind(kind);openModal('choose');}}/>
      </> : page === 'rooms' ? <><PageHeading title={t('Phòng của tôi')}/>{!user?.account&&<div className="info-box"><ShieldCheck size={19}/><span>{t('Đăng nhập bằng Email, Google hoặc Facebook để tạo phòng mới. Bạn vẫn có thể vào phòng qua lời mời.')}</span><button className="text-button" onClick={() => openModal('login')}>{t('Đăng nhập')}<ArrowRight size={15}/></button></div>}<div className="page-actions"><button className="button" disabled={!user} onClick={openCreateRoom}><Plus size={18}/>{t('Tạo phòng')}</button><button className="button button-secondary" disabled={!user} onClick={() => openModal('join')}><Link2 size={17}/>{t('Vào phòng')}</button></div><section className="panel">{recent.length ? <RoomList rooms={recent} onOpen={openRoom}/> : <div className="empty-state tall"><DoorOpen size={34}/><h3>{t('Chưa có cuộc hẹn nào')}</h3><p>{t('Đăng nhập để tạo phòng, hoặc dán liên kết mời để tham gia cùng bạn bè.')}</p></div>}</section><p className="privacy-note"><LockKeyhole size={15}/>{t('Phòng mới cần liên kết mời.')}</p></>
      : page === 'history' ? <><PageHeading title={t('Lịch sử')}/>{!user?.account && <div className="info-box"><ShieldCheck size={19}/><span>{t('Đăng ký để xem lịch sử trên nhiều thiết bị.')}</span><button className="text-button" onClick={() => openModal('register')}>{t('Đăng ký')}<ArrowRight size={15}/></button></div>}<section className="panel">{matches.length ? matches.map(match => <button className="history-row" key={match.game.id} onClick={() => enter(match, true)}><span className="room-list-icon"><History size={22}/></span><span><strong>{match.owner.name} <span className="versus">{t('với')}</span> {match.guest?.name}</strong><small>{META[match.kind||'caro'].name} · {match.game.moves.length}{' ' + t('nước ·') + ' '}{dateLabel(match.game.result!.at)}</small></span><span className={`result-tag ${match.game.result?.winner === match.me.mark ? 'win' : ''}`}>{!match.game.result?.winner ? t('Hòa') : match.game.result.winner === match.me.mark ? t('Bạn thắng') : t('Bạn thua')}</span><ChevronRight size={18}/></button>) : <div className="empty-state tall"><History size={34}/><h3>{t('Chưa có ván nào hoàn thành')}</h3><p>{t('Ván đã kết thúc sẽ tự lưu tại đây để bạn xem lại.')}</p><button className="text-button" onClick={() => navigate('home')}>{t('Bắt đầu một ván')}<ArrowRight size={15}/></button></div>}</section></>
      : <Rules onPlay={openCreateRoom} canPlay={!!user}/>}
      {!room && page !== 'practice' && <footer className="footer"><nav className="public-footer-links" aria-label={t('Hướng dẫn chơi cờ')}>{(['caro','chess','xiangqi','monopoly'] as const).map(kind=><a key={kind} href={guidePath(gamePage(kind))}>{META[kind].name}</a>)}<a href="/bi-kip">{t('Bí kíp')}</a></nav></footer>}
    </main></div>
    {modal && <ModalFrame title={{ choose:META[createKind].name, invite:t('Mời bạn'), create:t('Tạo phòng'), join:t('Vào phòng'), login:t('Đăng nhập'), register:t('Đăng ký'), profile:t('Tài khoản'), feedback:t('Góp ý'), resign: t('Dừng ván cờ ở đây?') }[modal]} onClose={() => { if (!busy) { setPendingCreate(false); setAuthNotice(''); setModal(null); } }}>
      {errorBox}
      {modal==='choose'&&<><div className="mode-choices"><button disabled={!user} onClick={()=>{setModal(null);goMatchmaking(createKind);}}><span className="mode-icon"><Trophy size={27}/></span><span><strong>{t('Đấu xếp hạng')}</strong><small>{t('Ghép đối thủ theo môn, thời gian và Elo')}</small></span><ArrowRight size={19}/></button><button disabled={!user} onClick={openCreateRoom}><span className="mode-icon"><DoorOpen size={27}/></span><span><strong>{t('Chơi với bạn')}</strong><small>{user?.account ? t('Phòng riêng qua lời mời') : t('Cần đăng nhập để tạo phòng')}</small></span><ArrowRight size={19}/></button><button disabled={!user} onClick={()=>{setModal(null);goPractice(createKind);}}><span className="mode-icon"><Bot size={27}/></span><span><strong>{t('Chơi với máy')}</strong><small>{t('3 độ khó · Không tính giờ')}</small></span><ArrowRight size={19}/></button></div><details className="compact-details"><summary>{t('Luật') + ' '}{META[createKind].name}</summary><p>{RULE_TEXT[createKind]}</p></details><button className="text-button" onClick={()=>openModal('join')}><Link2 size={15}/>{t('Có lời mời? Vào phòng')}</button></>}
      {modal==='invite'&&<><p className="modal-description">{t('Sao chép liên kết và gửi cho bạn.')}</p><label>{t('Liên kết mời')}<input readOnly value={inviteText} onFocus={e=>e.currentTarget.select()}/></label><button className="button full" onClick={()=>setModal(null)}>{t('Đã xong')}<Check size={17}/></button></>}
      {modal === 'create' && <form onSubmit={submitCreate}><div className="casual-room-badge" role="note"><Sparkles size={15}/><span><strong>{t('Chế độ giải trí')}</strong>{' ' + t('· Chơi vui cùng bạn bè, không tính Elo')}</span></div><label>{t('Môn cờ')}<select value={createKind} onChange={event=>chooseCreateKind(event.target.value as GameKind)}>{GAME_KINDS.map(kind=><option key={kind} value={kind}>{META[kind].name}</option>)}</select></label><details className="compact-details name-details"><summary>{t('Tên hiển thị') + ' '}<span>{name}</span></summary><label>{t('Tên')}<input value={name} onChange={e=>setName(e.target.value)} required minLength={2} maxLength={30} autoComplete="nickname"/></label></details>{isParty(createKind)&&<><label>{t('Số người (')}{createKind==='monopoly'?t('2–8 người'):t('2–4 người')})</label><div className={`time-options ${createKind==='monopoly'?'capacity-grid-8':''}`}>{(createKind==='monopoly'?[2,3,4,5,6,7,8]:[2,3,4]).map(n=><button type="button" key={n} className={capacity===n?'selected':''} aria-pressed={capacity===n} onClick={()=>setCapacity(n)}>{n}{' ' + t('người')}</button>)}</div></>}{createKind==='commander'?<p className="form-note"><Clock3 size={16}/>{t('Tổng lực · 30 phút cho cả ván')}</p>:createKind==='monopoly'?<><label>{t('Thời gian ván')}</label><div className="time-options">{[0,30,60,90].map(n=><button type="button" key={n} className={minutes===n?'selected':''} aria-pressed={minutes===n} onClick={()=>setMinutes(n)}><Clock3 size={16}/>{n===0?t('Không giới hạn'):t('{0} phút', n)}{minutes===n&&<Check size={14}/>}</button>)}</div><label className="estate-custom-time-label">{t('Tự chỉnh thời gian ván (phút · 5–360)')}<input type="number" aria-label={t('Tự chỉnh thời gian ván (phút)')} min={5} max={360} step={5} placeholder={t('Không giới hạn')} value={minutes===0?'':minutes} onChange={e=>{const raw=e.target.value.trim();if(!raw){setMinutes(0);return;}const parsed=Math.floor(Number(raw));if(Number.isFinite(parsed))setMinutes(Math.max(5,Math.min(360,parsed)));}}/></label></>:<><label>{t('Thời gian mỗi bên')}</label><div className="time-options">{[3,5,10,15].map(n=><button type="button" key={n} className={minutes===n?'selected':''} aria-pressed={minutes===n} onClick={()=>setMinutes(n)}><Clock3 size={16}/>{n}{' ' + t('phút')}{minutes===n&&<Check size={14}/>}</button>)}</div></>}{createKind==='monopoly'&&<EstateModePicker count={capacity} value={estateMode} onChange={setEstateMode}/>}<details className="compact-details"><summary>{t('Luật') + ' '}{META[createKind].name}</summary><p>{RULE_TEXT[createKind]}</p></details><button className="button full" disabled={busy||!user}>{busy?<LoaderCircle className="spin" size={18}/>:<Plus size={18}/>}{t('Tạo phòng') + ' '}{META[createKind].name}<ArrowRight size={18}/></button><p className="form-note"><LockKeyhole size={13}/>{t('Phòng giải trí ·') + ' '}{createKind==='monopoly'?t('30 giây suy nghĩ/lượt (không tính lúc tung xúc xắc) · '):''}{t('Chọn bên ngẫu nhiên · Lời mời 24 giờ')}</p></form>}
      {modal === 'join' && <form onSubmit={submitJoin}><label>{t('Tên trên bàn cờ')}<input value={name} onChange={e => setName(e.target.value)} required minLength={2} maxLength={30} autoComplete="nickname"/></label><label>{t('Liên kết mời / Mã phòng cũ')}<textarea value={inviteText} onChange={e => setInviteText(e.target.value)} placeholder={t('Dán liên kết mời vào đây…')} rows={3} required autoCapitalize="off" spellCheck={false}/></label><p className="form-note">{t('Phòng mới cần đầy đủ liên kết mời.')}</p><button className="button full" disabled={busy}>{busy ? <LoaderCircle className="spin" size={18}/> : <DoorOpen size={18}/>}{t('Vào phòng')}<ArrowRight size={18}/></button></form>}
      {(modal === 'login' || modal === 'register') && <><p className="modal-description">{authNotice || (modal === 'register' ? t('Đăng ký giữ nguyên danh tính và lịch sử bạn đang chơi với tư cách khách.') : t('Đăng nhập để tạo phòng và lưu lịch sử trên mọi thiết bị.'))}</p><div className="auth-social-group"><button type="button" className="social-button social-google" disabled={busy} onClick={() => startSocialLogin('google')}><GoogleIcon/>{t('Tiếp tục với Google (Gmail)')}</button><button type="button" className="social-button social-facebook" disabled={busy} onClick={() => startSocialLogin('facebook')}><FacebookIcon/>{t('Tiếp tục với Facebook')}</button></div><div className="auth-divider"><span>{t('hoặc dùng Email')}</span></div><form onSubmit={submitAuth}>{modal === 'register' && <label>{t('Tên hiển thị')}<input value={name} onChange={e => setName(e.target.value)} required minLength={2} maxLength={30} autoComplete="nickname"/></label>}<label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required maxLength={254} placeholder="ban@email.com"/></label><label>{t('Mật khẩu')}<span className="password-field"><input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} autoComplete={modal === 'register' ? 'new-password' : 'current-password'} minLength={10} maxLength={128} required placeholder={t('Tối thiểu 10 ký tự')}/><button type="button" className="icon-button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? t('Ẩn mật khẩu') : t('Hiện mật khẩu')}>{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></span></label><button className="button full" disabled={busy}>{busy && <LoaderCircle className="spin" size={18}/>} {modal === 'register' ? t('Tạo tài khoản') : t('Đăng nhập')}<ArrowRight size={17}/></button><p className="auth-switch">{modal === 'register' ? t('Đã có tài khoản?') : t('Chưa có tài khoản?')} <button type="button" onClick={() => openModal(modal === 'register' ? 'login' : 'register')}>{modal === 'register' ? t('Đăng nhập') : t('Đăng ký miễn phí')}</button></p></form></>}
      {modal === 'profile' && <form onSubmit={async e => { e.preventDefault(); setBusy(true); try { await saveName(); setModal(null); setToast('Đã lưu tên của bạn cho những ván tiếp theo.'); } catch (e) { notifyError(e); } finally { setBusy(false); } }}><p className="modal-description">{user?.account ? user.email : t('Bạn đang chơi với tư cách khách trên trình duyệt này.')}</p><label>{t('Tên hiển thị')}<input value={name} onChange={e => setName(e.target.value)} minLength={2} maxLength={30} required/></label><button className="button full" disabled={busy}><Check size={18}/>{t('Lưu tên hiển thị')}</button>{!user?.account ? <div className="profile-upsell"><ShieldCheck size={24}/><h3>{t('Mang lịch sử theo bạn.')}</h3><p>{t('Tạo tài khoản để mở lại ván cờ trên thiết bị khác.')}</p><button type="button" className="button button-secondary full" onClick={() => openModal('register')}>{t('Tạo tài khoản')}</button><button type="button" className="text-button" onClick={() => openModal('login')}>{t('Tôi đã có tài khoản')}<ArrowRight size={15}/></button></div> : <button type="button" className="text-button logout-button" disabled={busy || room?.game.phase === 'playing'} onClick={async () => { setBusy(true); try { await api('/auth/logout', {}); roomRef.current=null; archivedRef.current=false; setRoom(null); setArchived(false); setRecent([]); setMatches([]); setUser(null); setModal(null); history.replaceState(null, '', '/'); initialUrl.current = window.location.href; await loadSession(); setToast('Đã đăng xuất. Bạn có thể tiếp tục chơi với tư cách khách.'); } catch (e) { notifyError(e); } finally { setBusy(false); } }}><LogOut size={17}/>{t('Đăng xuất')}{room?.game.phase === 'playing' ? t(' sau khi hoàn tất ván') : ''}</button>}</form>}
      {modal === 'feedback' && <form onSubmit={async e => { e.preventDefault(); setBusy(true); try { await api('/reports', { body: feedback, roomId: room?.id }); setFeedback(''); setModal(null); setToast('Đã nhận góp ý của bạn. Cảm ơn bạn đã giúp Sân Cờ tốt hơn!'); } catch (e) { notifyError(e); } finally { setBusy(false); } }}><p className="modal-description">{t('Bạn gặp lỗi hay có một ý tưởng? Kể cho chúng mình nghe nhé.')}</p><label>{t('Góp ý của bạn')}<textarea rows={5} value={feedback} onChange={e => setFeedback(e.target.value)} minLength={10} maxLength={2000} required placeholder={t('Điều gì đã xảy ra? Bạn mong muốn điều gì?')}/></label><button className="button full" disabled={busy || !user}><Send size={17}/>{t('Gửi góp ý')}</button></form>}
      {modal === 'resign' && <><p className="modal-description">{t('Bạn sẽ thua ván này. Lịch sử vẫn được lưu.')}</p><div className="confirmation-actions"><button className="button button-secondary" onClick={() => setModal(null)}>{t('Chơi tiếp')}</button><button className="button button-danger" disabled={busy} onClick={() => act('resign')}><Flag size={17}/>{t('Đầu hàng')}</button></div></>}
    </ModalFrame>}
    {toast && <div className="toast" role="status"><CheckCheck size={19}/><span>{t(toast)}</span><button className="icon-button" aria-label={t('Đóng thông báo')} onClick={() => setToast('')}><Close size={16}/></button></div>}
  </div>;
}

function PageHeading({eyebrow,title,subtitle}:{eyebrow?:string;title:string;subtitle?:string}){return <div className="page-heading">{eyebrow&&<span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1>{subtitle&&<p>{subtitle}</p>}</div>;}
function RoomList({ rooms, onOpen }: { rooms: Room[]; onOpen: (id: string) => void }) { return <div className="room-list">{rooms.map(room => <button className="room-row" key={room.id} onClick={() => onOpen(room.id)}><span className="room-list-icon"><GameEmblem kind={room.kind||'caro'}/></span><span className="room-list-name"><strong>{room.guest ? `${room.owner.name} & ${room.guest.name}` : t('Phòng của {0}', room.owner.name)}</strong><small>{META[room.kind||'caro'].name} · {room.kind==='monopoly'?(room.duration>0?t('Cả ván {0} phút', room.duration/60000):t('Không giới hạn')):t('{0} phút/người', room.duration / 60000)} · {room.id}</small></span><span className={`phase-pill phase-${room.game.phase}`}><i/>{phaseLabel(room)}</span><ChevronRight size={17}/></button>)}</div>; }
function Rules({onPlay,canPlay}:{onPlay:()=>void;canPlay:boolean}){return <><PageHeading title={t('Luật chơi')}/><section className="compact-rules-list">{GAME_KINDS.map(kind=><details className="panel compact-rule-item" key={kind}><summary><span className="rules-game-symbol"><GameEmblem kind={kind}/></span><span><strong>{META[kind].name}</strong><small>{META[kind].cols} × {META[kind].rows}</small></span></summary><p>{RULE_TEXT[kind]}</p><a className="text-button" href={guidePath(gamePage(kind))}>{t('Xem trang {0}', META[kind].name)}<ArrowRight size={15}/></a></details>)}<details className="panel compact-rule-item"><summary><span className="rules-game-symbol"><DoorOpen size={24}/></span><span><strong>{t('Phòng riêng')}</strong><small>{t('Lời mời · Đồng hồ · Đấu lại')}</small></span></summary><p>{t('Gửi link mời cho bạn. Cả hai sẵn sàng thì đồng hồ bắt đầu; mất mạng vẫn tính giờ. Có xin hòa, đầu hàng và xem lại. Đấu lại cần hai bên đồng ý và sẽ đổi bên quân.')}</p></details></section><button className="button rules-create-action" disabled={!canPlay} onClick={onPlay}><Plus size={17}/>{t('Tạo phòng')}</button></>;}
function GoogleIcon(){return <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.9 1.5l2.7-2.6C16.9 3.3 14.7 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12S6.7 21.6 12 21.6c6.9 0 9.6-4.8 9.6-7.3 0-.5-.1-.9-.1-1.3H12z"/><path fill="#4285F4" d="M21.5 13c0-.5-.1-.9-.1-1.3H12v3.9h5.5c-.3 1.3-1 2.4-2.1 3.1l3.2 2.5c1.9-1.8 2.9-4.4 2.9-8.2z"/><path fill="#34A853" d="M12 21.6c2.6 0 4.8-.9 6.4-2.4l-3.2-2.5c-.9.6-2 1-3.2 1-2.5 0-4.6-1.7-5.3-4l-3.3 2.5C5 19.4 8.2 21.6 12 21.6z"/><path fill="#FBBC05" d="M6.7 13.7c-.2-.6-.3-1.1-.3-1.7s.1-1.1.3-1.7L3.4 7.8C2.8 9 2.4 10.5 2.4 12s.4 3 1 4.2l3.3-2.5z"/></svg>;}
function FacebookIcon(){return <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#ffffff" d="M13.6 21v-8.2h2.8l.4-3.2h-3.2V7.6c0-.9.3-1.6 1.6-1.6h1.7V3.1c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.2v2.4H7.7v3.2h2.8V21h3.1z"/></svg>;}
