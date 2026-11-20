import { t } from './language.ts';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Scan, LocateFixed } from 'lucide-react';
import { estateBounds, estateBoardSize, VN_SQUARE, type EstateLayout } from './three/party-layout.ts';

export default function EstateBoardViewport({ children, position, movingPosition = null, isWalking = false, busy, view, topView, onFocusPiece, immersive = false, toolsTarget, layout = VN_SQUARE }: { children: ReactNode; position: number; movingPosition?: number | null; isWalking?: boolean; busy: boolean; view: '2d' | '3d'; topView: boolean; onFocusPiece: () => void; immersive?: boolean; toolsTarget?: HTMLElement | null; layout?: EstateLayout }) {
  const [size, setSize] = useState(() => immersive ? 0 : 1560);
  const viewport = useRef<HTMLDivElement>(null);
  const lastFocus = useRef('');
  const board = estateBoardSize(layout), aspect = board.width / board.height;
  const focusCell = (targetPos: number, smooth = false) => {
    const host = viewport.current, surface = host?.firstElementChild as HTMLElement | null;
    if (!host || !surface || !host.clientWidth) return;
    if (!size) { host.scrollLeft = 0; host.scrollTop = 0; return; }
    const b = estateBounds(targetPos, layout), spanX = view === '3d' ? board.width / (board.width + 21.6) : 1, spanY = view === '3d' ? board.height / (board.height + 21.6) : 1;
    const insetX = (1 - spanX) / 2, insetY = (1 - spanY) / 2;
    const left = Math.max(0, Math.min(surface.clientWidth - host.clientWidth, (insetX + (b.x + b.width / 2) / board.width * spanX) * surface.clientWidth - host.clientWidth / 2));
    const top = Math.max(0, Math.min(surface.clientHeight - host.clientHeight, (insetY + (b.y + b.height / 2) / board.height * spanY) * surface.clientHeight - host.clientHeight / 2));
    if (smooth && typeof host.scrollTo === 'function') { host.scrollTo({ left, top, behavior: 'smooth' }); }
    else { host.scrollLeft = left; host.scrollTop = top; }
  };
  const focusPiece = () => focusCell(position, false);
  useEffect(() => {
    if (isWalking && movingPosition != null && size > 0) {
      focusCell(movingPosition, true);
      return;
    }
    if (busy) return;
    const signature = `${size}:${position}:${view}:${topView}:${layout.cols}`;
    if (lastFocus.current !== signature) { focusPiece(); lastFocus.current = signature; }
    if (typeof ResizeObserver === 'undefined' || !viewport.current) return;
    const host = viewport.current;
    let width = host.clientWidth, height = host.clientHeight;
    const observer = new ResizeObserver(() => {
      if (width === host.clientWidth && height === host.clientHeight) return;
      width = host.clientWidth; height = host.clientHeight; focusPiece();
    }); observer.observe(host);
    return () => observer.disconnect();
  }, [size, position, movingPosition, isWalking, busy, view, topView, layout.cols]);

  const walkZoom2D = Boolean(view === '2d' && !size && isWalking && movingPosition != null);
  const surfaceStyle: React.CSSProperties & Record<string, string | number> = { '--vn-aspect': aspect, ...(size ? { width: size } : {}) } as React.CSSProperties & Record<string, string | number>;
  if (walkZoom2D && movingPosition != null) {
    const b = estateBounds(movingPosition, layout);
    const nx = (b.x + b.width / 2) / board.width, ny = (b.y + b.height / 2) / board.height;
    const zoom = 1.82;
    const tx = Math.max(-44, Math.min(44, (0.5 - nx) * 100 * zoom));
    const ty = Math.max(-44, Math.min(44, (0.5 - ny) * 100 * zoom));
    surfaceStyle.transform = `translate3d(${tx.toFixed(2)}%, ${ty.toFixed(2)}%, 0) scale(${zoom})`;
  }
  const tools = <div className="estate-zoom-tools" role="group" aria-label={t('Kích thước bàn Tỷ phú')}>
    <button type="button" aria-pressed={size === 0} onClick={() => setSize(0)}><Scan size={18} />{t('Toàn bàn')}</button>
    <button type="button" onClick={() => { onFocusPiece(); focusPiece(); }}><LocateFixed size={18} />{t('Quân của bạn')}</button>
    <span>{t('Cuộn để xem các phía')}</span>
  </div>;
  return <>
    {immersive ? (toolsTarget ? createPortal(tools, toolsTarget) : null) : tools}
    <div ref={viewport} className={`estate-board-viewport${size ? '' : ' is-fit'}`} role="region" aria-label={t('Bàn Tỷ phú một vòng, có thể cuộn')} tabIndex={0} onWheelCapture={event => { if (!event.ctrlKey && !event.metaKey) event.stopPropagation(); }}>
      <div className="estate-board-surface" data-board-size={size} data-walking-zoom={walkZoom2D ? 'true' : undefined} style={surfaceStyle}>{children}</div>
    </div>
  </>;
}
