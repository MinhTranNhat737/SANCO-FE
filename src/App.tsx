import { Suspense, useState, useEffect, useRef, useId, type ReactNode, type FormEvent } from 'react';
import { io, type Socket } from 'socket.io-client';
import { ArrowRight, ArrowUpRight, BookOpen, Check, CheckCheck, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, CircleHelp, Clock3, Copy, DoorOpen, Eye, EyeOff, Flag, Handshake, History, Home, Leaf, Link2, LoaderCircle, LockKeyhole, LogOut, Menu, MessageCircle, Plus, RotateCcw, Send, ShieldCheck, Sparkles, UserRound, Volume2, VolumeX, Wifi, WifiOff, X as Close } from 'lucide-react';
import { api, API, ApiError } from './api';
import {mergeLive,gameAction} from './live';
import type { Room, User, AuthProviders } from './types';
import { Bot } from 'lucide-react';
import {META,RULE_TEXT,GAME_KINDS,sideSymbol,isParty,moveRequest,type GameKind,type PracticeMove} from './practice-types';
import GameCatalog from './GameCatalog';
import GameEmblem from './GameEmblem';
import RoomView from './RoomView';
import Practice from './Practice';

type Page = 'home' | 'rooms' | 'rules' | 'history' | 'practice';
type Modal = 'choose' | 'invite' | 'create' | 'join' | 'login' | 'register' | 'profile' | 'feedback' | 'resign' | null;
const phaseLabel = (room: Room) => ({ waiting: 'Đang chờ', playing: 'Đang chơi', finished: 'Đã kết thúc' }[room.game.phase]);
const dateLabel = (at: number) => new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }).format(at);
function Logo({ small = false }: { small?: boolean }) { return <span className={`brand ${small ? 'brand-small' : ''}`}><span className="brand-icon"><i/><i/><i/><i/></span><span>Sân Cờ<span className="brand-dot">.</span></span></span>; }
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
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><div ref={panel} className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={id}><button className="icon-button modal-close" onClick={onClose} aria-label="Đóng"><Close size={20}/></button><h2 id={id}>{title}</h2>{children}</div></div>;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null), [providers, setProviders] = useState<AuthProviders>({ google: false, facebook: false }), [page, setPage] = useState<Page>(() => new URL(window.location.href).searchParams.has('practice') ? 'practice' : 'home');
  const [practiceKind, setPracticeKind] = useState<GameKind>('chess');
  const [createKind,setCreateKind]=useState<GameKind>('caro'),[roomSide,setRoomSide]=useState('random'),[capacity,setCapacity]=useState(2),[latency,setLatency]=useState<number|null>(null);
  const [modal, setModal] = useState<Modal>(null), [pendingCreate, setPendingCreate] = useState(false), [authNotice, setAuthNotice] = useState(''), [room, setRoom] = useState<Room | null>(null), [archived, setArchived] = useState(false);
  const [recent, setRecent] = useState<Room[]>([]), [matches, setMatches] = useState<Room[]>([]), [loading, setLoading] = useState(true);
  const [error, setError] = useState(''), [toast, setToast] = useState(''), [busy, setBusy] = useState(false), [connected, setConnected] = useState(false);
  const [name, setName] = useState(''), [email, setEmail] = useState(''), [password, setPassword] = useState(''), [showPassword, setShowPassword] = useState(false);
  const [minutes, setMinutes] = useState(5), [inviteText, setInviteText] = useState(''), [feedback, setFeedback] = useState(''), [mobileNav, setMobileNav] = useState(false);
  const [sound, setSound] = useState(() => localStorage.getItem('sc-sound') !== 'off');
  const socket = useRef<Socket | null>(null), roomRef = useRef<Room | null>(null), archivedRef = useRef(false), audio = useRef<AudioContext | null>(null);
  const initialUrl = useRef(window.location.href);
  useEffect(() => { roomRef.current = room; archivedRef.current = archived; }, [room, archived]);
  useEffect(() => { setError(''); }, [modal]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 5000); return () => clearTimeout(t); }, [toast]);
  const notifyError = (e: unknown) => setError(e instanceof Error ? e.message : 'Không thực hiện được thao tác.');
  const acceptRoom=(packet:Room)=>{if(roomRef.current?.id!==packet.id||archivedRef.current)return;const next=mergeLive(roomRef.current,packet);if(next){roomRef.current=next;setRoom(next);}else if(roomRef.current?.id===packet.id)api('/rooms/'+packet.id).then(d=>acceptRoom(d.room)).catch(notifyError);};
  async function refreshLists() {
    try { const [a, b] = await Promise.all([api('/rooms?summary=1'), api('/history?summary=1')]); setRecent(a.rooms); setMatches(b.matches); } catch (e) { notifyError(e); }
  }
  async function loadSession() {
    setLoading(true); setError('');
    try {
      const data = await api('/me'); setUser(data.user); setName(data.user.name);
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
    } catch (e) { notifyError(e); } finally { setLoading(false); }
  }
  useEffect(() => { void loadSession(); }, []);
  useEffect(() => {
    if (!user) return;
    void refreshLists();
    const s = io(API || window.location.origin, { withCredentials:true,transports:['websocket','polling'],tryAllTransports:true,reconnectionDelay:400,reconnectionDelayMax:3000,timeout:10000 }); socket.current = s;
    s.on('connect', () => { setConnected(true); if (roomRef.current && !archivedRef.current) { s.timeout(5000).emit('watch-room',roomRef.current.id,(error:Error|null,data:any)=>{if(!error&&data?.room)acceptRoom(data.room);}); } });
    const ping=async()=>{if(!s.connected)return;const started=performance.now();try{await s.timeout(4000).emitWithAck('net-ping');setLatency(Math.round(performance.now()-started));}catch{setLatency(null);}};s.on('connect',ping);const pingTimer=setInterval(ping,15000);void ping();
    s.on('disconnect', () => {setConnected(false);setLatency(null);}); s.on('connect_error', () => setConnected(false));
    s.on('room', (next: Room) => { if (!archivedRef.current && roomRef.current?.id === next.id) acceptRoom(next); });
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
    return () => {clearInterval(pingTimer);s.disconnect();socket.current=null;};
  }, [user?.id, user?.account]);
  useEffect(() => {
    if (!room || archived) return;
    socket.current?.timeout(5000).emit('watch-room',room.id,(error:Error|null,data:any)=>{if(!error&&data?.room)acceptRoom(data.room);});
    const t = setInterval(() => { api(`/rooms/${room.id}`).then(d => acceptRoom(d.room)).catch(e => { if (e instanceof ApiError && e.status === 401) setError('Phiên đã hết hạn. Hãy đăng nhập lại.'); else if (e instanceof ApiError && (e.status === 404 || e.status === 410)) { roomRef.current = null; setRoom(null); setPage('rooms'); history.replaceState(null, '', '/'); setToast(e.message || 'Bàn đã bị hủy và xóa do không hoạt động quá 5 phút.'); } }); }, connected?30000:5000);
    return () => clearInterval(t);
  }, [room?.id,archived,connected]);
  useEffect(() => {
    const onPop = () => { const currentUrl = new URL(window.location.href); if (currentUrl.searchParams.has('practice')) { setRoom(null); setPage('practice'); return; } const replayId=currentUrl.searchParams.get('replay');if(replayId&&user){api(`/matches/${encodeURIComponent(replayId)}`).then(d=>{setRoom(d.room);setArchived(true);roomRef.current=d.room;archivedRef.current=true;}).catch(notifyError);return;} const id = currentUrl.searchParams.get('room'); if (!id) { setRoom(null); setArchived(false); setPage('home'); } else if (user) api(`/rooms/${encodeURIComponent(id)}`).then(d => { setRoom(d.room); setArchived(false); }).catch(notifyError); };
    window.addEventListener('popstate', onPop); return () => window.removeEventListener('popstate', onPop);
  }, [user]);
  function chooseCreateKind(kind:GameKind){setCreateKind(kind);setMinutes(kind==='monopoly'?60:5);}
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
  function goPractice(kind: GameKind) { setPracticeKind(kind); navigate('practice'); }
  function enter(next: Room, past = false) { setRoom(next); roomRef.current = next; setArchived(past); archivedRef.current = past; setModal(null); setError(''); history.pushState(null, '', past ? `?replay=${next.game.id}` : `?room=${next.id}`); window.scrollTo(0, 0); }
  async function openRoom(id: string) { setBusy(true); setError(''); try { const data = await api(`/rooms/${id}`); enter(data.room); } catch (e) { notifyError(e); } finally { setBusy(false); } }
  async function saveName() { if (name.trim() !== user?.name) { const data = await api('/me', { name }, 'PATCH'); setUser(data.user); } }
  async function submitCreate(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try { await saveName(); const data = await api('/rooms', { minutes,kind:createKind,side:roomSide,capacity:isParty(createKind)?capacity:2 }); localStorage.setItem(`sc-invite-${data.room.id}`, data.token); enter(data.room); setToast('Đã tạo phòng. Mời bạn để chơi.'); } catch (e) { notifyError(e); } finally { setBusy(false); }
  }
  async function submitJoin(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      await saveName(); const input = inviteText.trim();
      if (/^[a-f0-9]{8}$/i.test(input)) { const data = await api(`/rooms/${input.toUpperCase()}`); enter(data.room); }
      else {
        let url: URL; try { url = new URL(input); } catch { throw new Error('Hãy dán đầy đủ liên kết mời do bạn của bạn gửi.'); }
        const id = url.searchParams.get('room'), token = new URLSearchParams(url.hash.slice(1)).get('invite');
        if (!id || !/^[a-f0-9]{8}$/i.test(id) || !token) throw new Error('Liên kết chưa có lời mời hợp lệ. Hãy xin bạn gửi lại.');
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
    if (!room || busy || archived) return;
    setBusy(true); setError('');
    const body = { actionId: crypto.randomUUID(), version: room.version, ...(typeof move==='number'?{cell:move}:move?moveRequest(move):{}), action };
    try {
      const data=await gameAction(socket.current,'room',room.id,body);
      acceptRoom(data.room); setModal(null);
      if (action === 'move' && sound) { try { audio.current ||= new AudioContext(); await audio.current.resume(); const osc = audio.current.createOscillator(), gain = audio.current.createGain(); osc.connect(gain); gain.connect(audio.current.destination); osc.frequency.value = 620; gain.gain.setValueAtTime(0.035, audio.current.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audio.current.currentTime + 0.07); osc.start(); osc.stop(audio.current.currentTime + 0.08); } catch {} }
    } catch (e) { notifyError(e); try { const data = await api(`/rooms/${room.id}`); acceptRoom(data.room); } catch {} } finally { setBusy(false); }
  }
  const nav = [{ page: 'home' as Page, label: 'Chơi cờ', icon: Home }, { page: 'practice' as Page, label: 'Chơi với máy', icon: Bot }, { page: 'rooms' as Page, label: 'Phòng của tôi', icon: DoorOpen }, { page: 'history' as Page, label: 'Lịch sử', icon: History }, { page: 'rules' as Page, label: 'Luật', icon: BookOpen }];
  const errorBox = error ? <div className="error-box" role="alert">{error}</div> : null;
  return <div className={`app-shell compact-interface ${room || page === 'practice' ? 'board-focus-shell' : ''} ${!room&&page==='home'?'home-interface':''}`}>
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}><button className="logo-button" onClick={() => navigate('home')} aria-label="Sân Cờ - trang chủ"><Logo/></button><nav>{nav.map(({ page: p, label, icon: Icon }) => <button key={p} className={`nav-item ${page === p && !room ? 'active' : ''}`} onClick={() => navigate(p)}><Icon size={19}/><span>{label}</span>{p === 'home' && <span className="nav-tiny-dot"/>}</button>)}</nav>
      <div className="sidebar-bottom"><button className="help-button" onClick={() => openModal('feedback')}><CircleHelp size={17}/>Góp ý<ArrowUpRight size={15}/></button></div>
    </aside>{mobileNav && <button className="nav-overlay" aria-label="Đóng điều hướng" onClick={() => setMobileNav(false)}/>}
    <div className="main-shell"><header className="topbar"><div className="topbar-left"><button className="icon-button mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Mở điều hướng"><Menu size={22}/></button><span className="topbar-title">{room ? 'Bàn cờ của bạn' : nav.find(n => n.page === page)?.label}</span></div><div className="topbar-right">{!user?.account && <button className="button button-secondary button-small" disabled={loading||!user} onClick={()=>openModal('register')}>Tạo tài khoản</button>}<button className="account-button" onClick={() => openModal(user?.account ? 'profile' : 'login')}><span className="avatar">{user?.name?.slice(0, 1).toUpperCase() || <UserRound size={17}/>}</span><span>{user?.account ? user.name : 'Đăng nhập'}<small>{user?.account ? 'Tài khoản của bạn' : 'Lưu phòng và lịch sử'}</small></span><ChevronRight size={15}/></button></div></header>
    <main className={`content ${room ? 'content-game' : ''}`}>
      {!modal && errorBox}{!user && !loading && <button className="button button-small" onClick={loadSession}><RotateCcw size={16}/>Kết nối lại máy chủ</button>}
      {room ? <Suspense fallback={<div className="empty-state"><LoaderCircle className="spin"/><p>Đang mở bàn cờ…</p></div>}><RoomView key={`${room.game.id}-${archived}`} room={room} busy={busy} connected={connected} latency={latency} archived={archived} sound={sound} onSound={()=>{setSound(!sound);localStorage.setItem('sc-sound',sound?'off':'on');}} onBack={() => navigate('rooms')} onAction={act} onInvite={copyInvite} onResign={() => openModal('resign')}/></Suspense>
      : page === 'practice' ? <Suspense fallback={<div className="empty-state"><LoaderCircle className="spin"/><p>Đang bày bàn luyện tập…</p></div>}><Practice initialKind={practiceKind} user={user} socket={socket.current} onBack={() => navigate('home')}/></Suspense>
      : page === 'home' ? <>
        <section className="quick-lobby"><h1>Hôm nay, chơi gì?</h1><div className="quick-lobby-actions"><button className="button" disabled={!user} onClick={openCreateRoom}><Plus size={25}/>Tạo phòng</button><button className="button button-secondary" disabled={!user} onClick={()=>goPractice('chess')}><Bot size={25}/>Chơi với máy</button><button className="text-button" disabled={!user} onClick={()=>openModal('join')}><Link2 size={25}/>Vào phòng</button></div></section>
        {recent.length>0&&<section className="recent-section compact-recent"><div className="section-heading"><h2>Phòng gần đây</h2><button className="text-button" onClick={()=>navigate('rooms')}>Tất cả<ArrowRight size={15}/></button></div>{loading?<div className="empty-state"><LoaderCircle className="spin"/><p>Đang tải…</p></div>:recent.length?<RoomList rooms={recent.slice(0,3)} onOpen={openRoom}/>:<div className="compact-empty"><DoorOpen size={23}/><span>Chưa có phòng</span><button className="text-button" disabled={!user} onClick={openCreateRoom}><Plus size={16}/>Tạo phòng</button></div>}</section>}
        <GameCatalog disabled={!user} onSelect={kind=>{chooseCreateKind(kind);openModal('choose');}}/>
      </> : page === 'rooms' ? <><PageHeading title="Phòng của tôi"/>{!user?.account&&<div className="info-box"><ShieldCheck size={19}/><span>Đăng nhập bằng Email, Google hoặc Facebook để tạo phòng mới. Bạn vẫn có thể vào phòng qua lời mời.</span><button className="text-button" onClick={() => openModal('login')}>Đăng nhập<ArrowRight size={15}/></button></div>}<div className="page-actions"><button className="button" disabled={!user} onClick={openCreateRoom}><Plus size={18}/>Tạo phòng</button><button className="button button-secondary" disabled={!user} onClick={() => openModal('join')}><Link2 size={17}/>Vào phòng</button></div><section className="panel">{recent.length ? <RoomList rooms={recent} onOpen={openRoom}/> : <div className="empty-state tall"><DoorOpen size={34}/><h3>Chưa có cuộc hẹn nào</h3><p>Đăng nhập để tạo phòng, hoặc dán liên kết mời để tham gia cùng bạn bè.</p></div>}</section><p className="privacy-note"><LockKeyhole size={15}/>Phòng mới cần liên kết mời.</p></>
      : page === 'history' ? <><PageHeading title="Lịch sử"/>{!user?.account && <div className="info-box"><ShieldCheck size={19}/><span>Đăng ký để xem lịch sử trên nhiều thiết bị.</span><button className="text-button" onClick={() => openModal('register')}>Đăng ký<ArrowRight size={15}/></button></div>}<section className="panel">{matches.length ? matches.map(match => <button className="history-row" key={match.game.id} onClick={() => enter(match, true)}><span className="room-list-icon"><History size={22}/></span><span><strong>{match.owner.name} <span className="versus">với</span> {match.guest?.name}</strong><small>{META[match.kind||'caro'].name} · {match.game.moves.length} nước · {dateLabel(match.game.result!.at)}</small></span><span className={`result-tag ${match.game.result?.winner === match.me.mark ? 'win' : ''}`}>{!match.game.result?.winner ? 'Hòa' : match.game.result.winner === match.me.mark ? 'Bạn thắng' : 'Bạn thua'}</span><ChevronRight size={18}/></button>) : <div className="empty-state tall"><History size={34}/><h3>Chưa có ván nào hoàn thành</h3><p>Ván đã kết thúc sẽ tự lưu tại đây để bạn xem lại.</p><button className="text-button" onClick={() => navigate('home')}>Bắt đầu một ván<ArrowRight size={15}/></button></div>}</section></>
      : <Rules onPlay={openCreateRoom} canPlay={!!user}/>}
      {!room && page !== 'practice' && <footer className="footer"><Logo small/><span>Chơi đẹp. Chơi vui.</span></footer>}
    </main></div>
    {modal && <ModalFrame title={{ choose:META[createKind].name, invite:'Mời bạn', create:'Tạo phòng', join:'Vào phòng', login:'Đăng nhập', register:'Đăng ký', profile:'Tài khoản', feedback:'Góp ý', resign: 'Dừng ván cờ ở đây?' }[modal]} onClose={() => { if (!busy) { setPendingCreate(false); setAuthNotice(''); setModal(null); } }}>
      {errorBox}
      {modal==='choose'&&<><div className="mode-choices"><button disabled={!user} onClick={openCreateRoom}><span className="mode-icon"><DoorOpen size={27}/></span><span><strong>Chơi với bạn</strong><small>{user?.account ? 'Phòng riêng qua lời mời' : 'Cần đăng nhập để tạo phòng'}</small></span><ArrowRight size={19}/></button><button disabled={!user} onClick={()=>{setModal(null);goPractice(createKind);}}><span className="mode-icon"><Bot size={27}/></span><span><strong>Chơi với máy</strong><small>3 độ khó · Không tính giờ</small></span><ArrowRight size={19}/></button></div><details className="compact-details"><summary>Luật {META[createKind].name}</summary><p>{RULE_TEXT[createKind]}</p></details><button className="text-button" onClick={()=>openModal('join')}><Link2 size={15}/>Có lời mời? Vào phòng</button></>}
      {modal==='invite'&&<><p className="modal-description">Sao chép liên kết và gửi cho bạn.</p><label>Liên kết mời<input readOnly value={inviteText} onFocus={e=>e.currentTarget.select()}/></label><button className="button full" onClick={()=>setModal(null)}>Đã xong<Check size={17}/></button></>}
      {modal === 'create' && <form onSubmit={submitCreate}><label>Môn cờ<select value={createKind} onChange={event=>chooseCreateKind(event.target.value as GameKind)}>{GAME_KINDS.map(kind=><option key={kind} value={kind}>{META[kind].name}</option>)}</select></label><details className="compact-details name-details"><summary>Tên hiển thị <span>{name}</span></summary><label>Tên<input value={name} onChange={e=>setName(e.target.value)} required minLength={2} maxLength={30} autoComplete="nickname"/></label></details>{isParty(createKind)&&<><label>Số người</label><div className="time-options">{[2,3,4].map(n=><button type="button" key={n} className={capacity===n?'selected':''} aria-pressed={capacity===n} onClick={()=>setCapacity(n)}>{n} người</button>)}</div></>}<label>Thời gian mỗi bên</label><div className="time-options">{(createKind==='monopoly'?[15,30,60,120]:[3,5,10,15]).map(n=><button type="button" key={n} className={minutes===n?'selected':''} aria-pressed={minutes===n} onClick={()=>setMinutes(n)}><Clock3 size={16}/>{n} phút{minutes===n&&<Check size={14}/>}</button>)}</div><label>Bên quân</label><div className="room-side-options">{['first','second','random'].map(value=><button type="button" key={value} className={roomSide===value?'selected':''} aria-pressed={roomSide===value} onClick={()=>setRoomSide(value)}><span>{value==='random'?'?':sideSymbol(createKind,value==='first'?META[createKind].first:META[createKind].second)}</span>{value==='random'?'Ngẫu nhiên':value==='first'?META[createKind].firstName:META[createKind].secondName}<small>{value==='first'?'Đi trước':value==='second'?'Đi sau':'Chọn tự động'}</small></button>)}</div><details className="compact-details"><summary>Luật {META[createKind].name}</summary><p>{RULE_TEXT[createKind]}</p></details><button className="button full" disabled={busy||!user}>{busy?<LoaderCircle className="spin" size={18}/>:<Plus size={18}/>}Tạo phòng {META[createKind].name}<ArrowRight size={18}/></button><p className="form-note"><LockKeyhole size={13}/>Phòng riêng · Lời mời 24 giờ</p></form>}
      {modal === 'join' && <form onSubmit={submitJoin}><label>Tên trên bàn cờ<input value={name} onChange={e => setName(e.target.value)} required minLength={2} maxLength={30} autoComplete="nickname"/></label><label>Liên kết mời / Mã phòng cũ<textarea value={inviteText} onChange={e => setInviteText(e.target.value)} placeholder="Dán liên kết mời vào đây…" rows={3} required autoCapitalize="off" spellCheck={false}/></label><p className="form-note">Phòng mới cần đầy đủ liên kết mời.</p><button className="button full" disabled={busy}>{busy ? <LoaderCircle className="spin" size={18}/> : <DoorOpen size={18}/>}Vào phòng<ArrowRight size={18}/></button></form>}
      {(modal === 'login' || modal === 'register') && <><p className="modal-description">{authNotice || (modal === 'register' ? 'Đăng ký giữ nguyên danh tính và lịch sử bạn đang chơi với tư cách khách.' : 'Đăng nhập để tạo phòng và lưu lịch sử trên mọi thiết bị.')}</p><div className="auth-social-group"><button type="button" className="social-button social-google" disabled={busy} onClick={() => startSocialLogin('google')}><GoogleIcon/>Tiếp tục với Google (Gmail)</button><button type="button" className="social-button social-facebook" disabled={busy} onClick={() => startSocialLogin('facebook')}><FacebookIcon/>Tiếp tục với Facebook</button></div><div className="auth-divider"><span>hoặc dùng Email</span></div><form onSubmit={submitAuth}>{modal === 'register' && <label>Tên hiển thị<input value={name} onChange={e => setName(e.target.value)} required minLength={2} maxLength={30} autoComplete="nickname"/></label>}<label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required maxLength={254} placeholder="ban@email.com"/></label><label>Mật khẩu<span className="password-field"><input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} autoComplete={modal === 'register' ? 'new-password' : 'current-password'} minLength={10} maxLength={128} required placeholder="Tối thiểu 10 ký tự"/><button type="button" className="icon-button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></span></label><button className="button full" disabled={busy}>{busy && <LoaderCircle className="spin" size={18}/>} {modal === 'register' ? 'Tạo tài khoản' : 'Đăng nhập'}<ArrowRight size={17}/></button><p className="auth-switch">{modal === 'register' ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'} <button type="button" onClick={() => openModal(modal === 'register' ? 'login' : 'register')}>{modal === 'register' ? 'Đăng nhập' : 'Đăng ký miễn phí'}</button></p></form></>}
      {modal === 'profile' && <form onSubmit={async e => { e.preventDefault(); setBusy(true); try { await saveName(); setModal(null); setToast('Đã lưu tên của bạn cho những ván tiếp theo.'); } catch (e) { notifyError(e); } finally { setBusy(false); } }}><p className="modal-description">{user?.account ? user.email : 'Bạn đang chơi với tư cách khách trên trình duyệt này.'}</p><label>Tên hiển thị<input value={name} onChange={e => setName(e.target.value)} minLength={2} maxLength={30} required/></label><button className="button full" disabled={busy}><Check size={18}/>Lưu tên hiển thị</button>{!user?.account ? <div className="profile-upsell"><ShieldCheck size={24}/><h3>Mang lịch sử theo bạn.</h3><p>Tạo tài khoản để mở lại ván cờ trên thiết bị khác.</p><button type="button" className="button button-secondary full" onClick={() => openModal('register')}>Tạo tài khoản</button><button type="button" className="text-button" onClick={() => openModal('login')}>Tôi đã có tài khoản<ArrowRight size={15}/></button></div> : <button type="button" className="text-button logout-button" disabled={busy || room?.game.phase === 'playing'} onClick={async () => { setBusy(true); try { await api('/auth/logout', {}); roomRef.current=null; archivedRef.current=false; setRoom(null); setArchived(false); setRecent([]); setMatches([]); setUser(null); setModal(null); history.replaceState(null, '', '/'); initialUrl.current = window.location.href; await loadSession(); setToast('Đã đăng xuất. Bạn có thể tiếp tục chơi với tư cách khách.'); } catch (e) { notifyError(e); } finally { setBusy(false); } }}><LogOut size={17}/>Đăng xuất{room?.game.phase === 'playing' ? ' sau khi hoàn tất ván' : ''}</button>}</form>}
      {modal === 'feedback' && <form onSubmit={async e => { e.preventDefault(); setBusy(true); try { await api('/reports', { body: feedback, roomId: room?.id }); setFeedback(''); setModal(null); setToast('Đã nhận góp ý của bạn. Cảm ơn bạn đã giúp Sân Cờ tốt hơn!'); } catch (e) { notifyError(e); } finally { setBusy(false); } }}><p className="modal-description">Bạn gặp lỗi hay có một ý tưởng? Kể cho chúng mình nghe nhé.</p><label>Góp ý của bạn<textarea rows={5} value={feedback} onChange={e => setFeedback(e.target.value)} minLength={10} maxLength={2000} required placeholder="Điều gì đã xảy ra? Bạn mong muốn điều gì?"/></label><button className="button full" disabled={busy || !user}><Send size={17}/>Gửi góp ý</button></form>}
      {modal === 'resign' && <><p className="modal-description">Bạn sẽ thua ván này. Lịch sử vẫn được lưu.</p><div className="confirmation-actions"><button className="button button-secondary" onClick={() => setModal(null)}>Chơi tiếp</button><button className="button button-danger" disabled={busy} onClick={() => act('resign')}><Flag size={17}/>Đầu hàng</button></div></>}
    </ModalFrame>}
    {toast && <div className="toast" role="status"><CheckCheck size={19}/><span>{toast}</span><button className="icon-button" aria-label="Đóng thông báo" onClick={() => setToast('')}><Close size={16}/></button></div>}
  </div>;
}

function PageHeading({eyebrow,title,subtitle}:{eyebrow?:string;title:string;subtitle?:string}){return <div className="page-heading">{eyebrow&&<span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1>{subtitle&&<p>{subtitle}</p>}</div>;}
function RoomList({ rooms, onOpen }: { rooms: Room[]; onOpen: (id: string) => void }) { return <div className="room-list">{rooms.map(room => <button className="room-row" key={room.id} onClick={() => onOpen(room.id)}><span className="room-list-icon"><GameEmblem kind={room.kind||'caro'}/></span><span className="room-list-name"><strong>{room.guest ? `${room.owner.name} & ${room.guest.name}` : `Phòng của ${room.owner.name}`}</strong><small>{META[room.kind||'caro'].name} · {room.duration / 60000} phút/người · {room.id}</small></span><span className={`phase-pill phase-${room.game.phase}`}><i/>{phaseLabel(room)}</span><ChevronRight size={17}/></button>)}</div>; }
function Rules({onPlay,canPlay}:{onPlay:()=>void;canPlay:boolean}){return <><PageHeading title="Luật chơi"/><section className="compact-rules-list">{GAME_KINDS.map(kind=><details className="panel compact-rule-item" key={kind}><summary><span className="rules-game-symbol"><GameEmblem kind={kind}/></span><span><strong>{META[kind].name}</strong><small>{META[kind].cols} × {META[kind].rows}</small></span></summary><p>{RULE_TEXT[kind]}</p></details>)}<details className="panel compact-rule-item"><summary><span className="rules-game-symbol"><DoorOpen size={24}/></span><span><strong>Phòng riêng</strong><small>Lời mời · Đồng hồ · Đấu lại</small></span></summary><p>Gửi link mời cho bạn. Cả hai sẵn sàng thì đồng hồ bắt đầu; mất mạng vẫn tính giờ. Có xin hòa, đầu hàng và xem lại. Đấu lại cần hai bên đồng ý và sẽ đổi bên quân.</p></details></section><button className="button rules-create-action" disabled={!canPlay} onClick={onPlay}><Plus size={17}/>Tạo phòng</button></>;}
function GoogleIcon(){return <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.9 1.5l2.7-2.6C16.9 3.3 14.7 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12S6.7 21.6 12 21.6c6.9 0 9.6-4.8 9.6-7.3 0-.5-.1-.9-.1-1.3H12z"/><path fill="#4285F4" d="M21.5 13c0-.5-.1-.9-.1-1.3H12v3.9h5.5c-.3 1.3-1 2.4-2.1 3.1l3.2 2.5c1.9-1.8 2.9-4.4 2.9-8.2z"/><path fill="#34A853" d="M12 21.6c2.6 0 4.8-.9 6.4-2.4l-3.2-2.5c-.9.6-2 1-3.2 1-2.5 0-4.6-1.7-5.3-4l-3.3 2.5C5 19.4 8.2 21.6 12 21.6z"/><path fill="#FBBC05" d="M6.7 13.7c-.2-.6-.3-1.1-.3-1.7s.1-1.1.3-1.7L3.4 7.8C2.8 9 2.4 10.5 2.4 12s.4 3 1 4.2l3.3-2.5z"/></svg>;}
function FacebookIcon(){return <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#ffffff" d="M13.6 21v-8.2h2.8l.4-3.2h-3.2V7.6c0-.9.3-1.6 1.6-1.6h1.7V3.1c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.2v2.4H7.7v3.2h2.8V21h3.1z"/></svg>;}
