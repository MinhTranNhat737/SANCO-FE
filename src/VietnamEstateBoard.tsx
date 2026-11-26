import { t } from './language.ts';
import type { PartyState, PracticeMove } from './practice-types';
import { VN_CELLS, VN_GROUP_COLORS, SIDE_NAMES, cash, estateRent, ownable } from './estate-data';
import { estateBounds, estateCenterBounds, estateBoardSize, estateEdge, isEstateCorner, estateTitleLines, VN_RECT, PARTY_COLORS, CITIES, GROUP_COLORS, groupOf, type EstateLayout } from './three/party-layout.ts';
import { PROVINCE_LANDMARKS, type LandmarkKind } from './vietnam-landmarks';
import { useId } from 'react';
import './estate.css';
import { estateBuildCost, estateGroupBuildPlan, estateSalary } from './estate-rules';

const TYPE_LABELS: Record<string, string> = {
  property: 'Tỉnh / Thành phố',
  station: 'Bến xe / Nhà ga',
  utility: 'Công trình tiện ích',
  start: 'Ô Xuất phát',
  tax: 'Ô Thuế',
  chance: 'Ô Cơ hội',
  community: 'Ô Khí vận',
  gotojail: 'Vào Trại giam',
  jail: 'Trại giam / Thăm tù',
  rest: 'Bến nghỉ chân'
};

export function EstateInspector({
  state,
  selected,
  onClose,
  legal = [],
  enabled = false,
  onAction
}: {
  state: PartyState;
  selected: number;
  onClose?: () => void;
  legal?: PracticeMove[];
  enabled?: boolean;
  onAction?: (move: PracticeMove) => void;
}) {
  const vietnam = state.edition === 'vn-v2';
  if (!vietnam) {
    const name = CITIES[selected];
    if (!name) return null;
    const owner = state.property[selected], special = [0, 3, 5, 8, 10, 13, 15, 18].includes(selected), grp = groupOf(selected), price = 100 + selected * 20, houses = state.houses[selected] || 0;
    const cellActions = legal.filter(m => m.to === selected || ((m.action || m.command) === 'buy' && state.players.some(p => p.position === selected)));
    return <article className="estate-inspector estate-cell-card" role="region" aria-label={`Thông tin ô ${name}`}>
      <div className="estate-card-header" style={{ '--cell-accent': special ? '#9aa175' : GROUP_COLORS[grp] || '#a39c78' } as React.CSSProperties}>
        <i style={{ background: special ? '#9aa175' : GROUP_COLORS[grp] || '#a39c78' }} />
        <div>
          <span className="estate-card-kicker">Ô #{selected + 1} · {special ? 'Ô sự kiện' : `Nhóm màu ${grp + 1}`}</span>
          <strong>{name}</strong>
          <small>{owner ? `Chủ sở hữu: ${SIDE_NAMES[owner] || owner}` : special ? 'Ô đặc biệt' : 'Chưa có chủ'}</small>
        </div>
        {onClose && <button type="button" className="estate-card-close" onClick={onClose} aria-label="Đóng thông tin ô">×</button>}
      </div>
      <div className="estate-inspect-facts">
        {!special ? <>
          <div className="estate-fact-grid">
            <span>Giá mua<strong>{price}</strong></span>
            <span>Nhà hiện tại<strong>{houses} nhà</strong></span>
            <span>Xây nhà<strong>100 / căn</strong></span>
            <span>Tiền thuê<strong>{Math.round(price * .35) + houses * 45}</strong></span>
          </div>
        </> : <p>{selected === 0 ? 'Đi qua hoặc dừng nhận +200 tiền.' : selected === 5 ? 'Nộp thuế −120 tiền.' : selected === 10 ? 'Nghỉ 1 lượt tại đây.' : selected === 15 ? 'Bến đỗ tự do, không mất phí.' : 'Rút thẻ Cơ hội ngẫu nhiên.'}</p>}
      </div>
      {enabled && cellActions.length > 0 && <div className="estate-card-actions">
        {cellActions.map(m => { const act = m.action || m.command || ''; return <button key={act + ':' + m.to} type="button" className="button button-small" onClick={() => onAction?.(m)}>{act === 'buy' ? `Mua ${name}` : act === 'build' ? 'Xây thêm nhà' : act === 'sell' ? 'Bán tài sản' : act}</button>; })}
      </div>}
    </article>;
  }

  const c = VN_CELLS[selected], owner = state.property[selected];
  if (!c) return null;
  const houses = state.houses[selected] || 0, mortgaged = Boolean(state.mortgaged?.[selected]);
  const accent = c.group !== undefined ? VN_GROUP_COLORS[c.group] : '#a39c78';
  const groupLots = c.type === 'property' ? VN_CELLS.filter(v => v.type === 'property' && v.group === c.group) : [];
  const groupUnitCost = groupLots.reduce((sum, v) => sum + estateBuildCost(state, v.buildCost), 0);
  const groupPlan = estateGroupBuildPlan(state, selected);
  const currentPos = state.players.find(p => p.active && legal.some(m => (m.action || m.command) === 'buy'))?.position;
  const cellMoves = legal.filter(m => {
    const act = m.action || m.command || '';
    if (act === 'buy') return currentPos === selected || m.to === selected;
    return m.to === selected && ['build', 'mortgage', 'redeem', 'sell_building', 'sell'].includes(act);
  });
  const actionLabels: Record<string, string> = {
    buy: `Mua ${c.name} (${cash(c.price)})`,
    auction: 'Mở đấu giá',
    build: groupPlan ? `Xây cả dãy → ${groupPlan.targetLevel === 5 ? '★KS' : `C${groupPlan.targetLevel}`} (${cash(groupPlan.cost)})` : `Xây cả dãy (${cash(groupUnitCost)})`,
    mortgage: `Thế chấp (+${cash(Math.floor(c.price / 2))})`,
    redeem: `Chuộc đất (${cash(Math.ceil(c.price * .55))})`,
    sell_building: 'Bán nhà',
    sell: `Bán đất (+${cash(Math.floor(c.price / 2))})`
  };

  return <article className="estate-inspector estate-cell-card" role="region" aria-label={`Thông tin ô ${c.name}`}>
    <div className="estate-card-header" style={{ '--cell-accent': accent } as React.CSSProperties}>
      <i style={{ background: accent }} />
      <div>
        <span className="estate-card-kicker">Ô #{c.index + 1} · {TYPE_LABELS[c.type] || 'Ô bàn cờ'}</span>
        <strong>{c.name}</strong>
        {PROVINCE_LANDMARKS[c.name] && <span className="estate-landmark-tag">★ {PROVINCE_LANDMARKS[c.name].title}</span>}
        <small>
          {owner ? `Chủ: ${SIDE_NAMES[owner]}` : ownable(c) ? 'Chưa có chủ · Có thể mua' : 'Ô sự kiện chung'}
          {mortgaged ? ' · Đang thế chấp' : ''}
          {ownable(c) && c.type === 'property' ? ` · ${houses === 5 ? '1 Khách sạn' : houses ? `${houses} nhà` : 'Đất trống'}` : ''}
        </small>
      </div>
      {onClose && <button type="button" className="estate-card-close" onClick={onClose} aria-label="Đóng thông tin ô">×</button>}
    </div>
    <div className="estate-inspect-facts">
      {ownable(c) ? <>
        <div className="estate-fact-grid">
          <span>Giá mua<strong>{cash(c.price)}</strong></span>
          <span>Thuê hiện tại<strong>{mortgaged ? '0 (Thế chấp)' : owner ? cash(estateRent(state, selected)) : 'Chưa có chủ'}</strong></span>
          {c.buildCost > 0 && <span>Xây cả dãy ({groupLots.length} ô)<strong>{cash(groupPlan ? groupPlan.cost : groupUnitCost)} / cấp</strong></span>}
          <span>Thế chấp / Chuộc<strong>{cash(Math.floor(c.price / 2))} / {cash(Math.ceil(c.price * .55))}</strong></span>
        </div>
        {c.type === 'property' && c.rent.length >= 6 && <div className="estate-rent-tiers">
          <span>Đất trống: <b>{cash(c.rent[0])}</b></span>
          <span>1 nhà: <b>{cash(c.rent[1])}</b></span>
          <span>2 nhà: <b>{cash(c.rent[2])}</b></span>
          <span>3 nhà: <b>{cash(c.rent[3])}</b></span>
          <span>4 nhà: <b>{cash(c.rent[4])}</b></span>
          <span>Khách sạn: <b>{cash(c.rent[5])}</b></span>
        </div>}
        {c.type === 'property' && <p className="estate-special-note">Đủ trọn dãy màu ({groupLots.map(v => v.name).join(', ')}) sẽ được xây nhà đồng loạt cả dãy.</p>}
        {state.market && <p className="estate-special-note">Thị trường: {state.market.description}. Tiền thuê hiện tại đã áp dụng hệ số; bảng cấp nhà là giá cơ bản.</p>}
        {c.type === 'station' && <p className="estate-special-note">Tiền thuê cơ bản theo số bến/ga cùng chủ: 1 ga 50 tr · 2 ga 100 tr · 3 ga 200 tr · 4 ga 400 tr.</p>}
        {c.type === 'utility' && <p className="estate-special-note">Sở hữu 1 tiện ích: thuê = 5× tổng 2 xúc xắc · Sở hữu đủ 2 tiện ích: thuê = 12× tổng 2 xúc xắc.</p>}
      </> : <p className="estate-special-note">{c.type === 'start' ? `Đi qua hoặc dừng tại Xuất phát nhận +${estateSalary(state)} triệu.` : c.type === 'tax' ? `Nộp ngân sách nhà nước ${cash(c.amount || 0)}.` : c.type === 'gotojail' ? 'Di chuyển thẳng vào Trại giam trong tối đa 3 lượt.' : c.type === 'jail' ? 'Thăm tù tự do (hoặc trả 100 tr / dùng thẻ để ra tù).' : c.type === 'rest' ? 'Dừng tại ô Nghỉ chân nhận thưởng +100 triệu.' : c.type === 'chance' ? 'Dừng tại ô Cơ hội để rút 1 lá bài từ chồng bài Cơ hội đỏ.' : 'Dừng tại ô Khí vận để rút 1 lá bài từ chồng bài Khí vận ngọc.'}</p>}
    </div>
    {enabled && cellMoves.length > 0 && <div className="estate-card-actions">
      {cellMoves.map(m => { const act = m.action || m.command || ''; return <button key={act + ':' + m.to} type="button" className="button button-small" onClick={() => onAction?.(m)}>{actionLabels[act] || act}</button>; })}
    </div>}
  </article>;
}

const CLASSIC_GROUP_COLORS = [
  '#7b2cbf', // Nhóm 0: Tím đậm
  '#4cc9f0', // Nhóm 1: Xanh da trời
  '#f72585', // Nhóm 2: Hồng cánh sen
  '#fb8500', // Nhóm 3: Cam
  '#e63946', // Nhóm 4: Đỏ tươi
  '#facc15', // Nhóm 5: Vàng tươi
  '#16a34a', // Nhóm 6: Xanh lá
  '#1d4ed8', // Nhóm 7: Xanh lam đậm
  '#0d9488', // Nhóm 8: Ngọc lam
  '#9333ea', // Nhóm 9: Tím hoàng gia
  '#dc2626'  // Nhóm 10: Đỏ đô (Hà Nội / TP.HCM)
];

const TOKEN_STYLES: Record<string, { fill: string; dark: string; label: string }> = {
  R: { fill: '#ef233c', dark: '#9b0a1e', label: 'ĐỎ' },
  G: { fill: '#10b981', dark: '#065f46', label: 'XANH' },
  Y: { fill: '#f59e0b', dark: '#92400e', label: 'VÀNG' },
  B: { fill: '#2563eb', dark: '#1e3a8a', label: 'LAM' },
  P: { fill: '#9333ea', dark: '#581c87', label: 'TÍM' },
  O: { fill: '#f97316', dark: '#9a3412', label: 'CAM' },
  C: { fill: '#06b6d4', dark: '#155e75', label: 'NGỌC' },
  K: { fill: '#ec4899', dark: '#9d174d', label: 'HỒNG' }
};

const OWNER_BG: Record<string, string> = { R: '#ffe3e6', G: '#d8f8eb', Y: '#fef3c7', B: '#dbeafe', P: '#f3e8ff', O: '#ffedd5', C: '#cffafe', K: '#fce7f3' };

function SvgLandmark({ cx, cy, kind, accent }: { cx: number; cy: number; kind: LandmarkKind; accent: string }) {
  return <g aria-hidden="true" transform={`translate(${cx} ${cy}) scale(1.08) translate(${-cx} ${-cy})`}>
    <circle cx={cx} cy={cy} r="6.8" fill="#fffbeb" stroke={accent} strokeWidth="1" />
    {kind === 'hanoi' ? <>
      <path d={`M${cx - 5} ${cy + 2.2}H${cx + 5}A6 6 0 0 1 ${cx - 5} ${cy + 2.2}Z`} fill="#2b7e9c" />
      <rect x={cx - 3} y={cy - 1} width="6" height="3" fill="#c99f5e" />
      <path d={`M${cx - 3.8} ${cy - 1}H${cx + 3.8}L${cx + 2.4} ${cy - 3.1}H${cx - 2.4}Z`} fill="#9e3328" />
      <path d={`M${cx - 2.2} ${cy - 3.1}L${cx} ${cy - 5.3}L${cx + 2.2} ${cy - 3.1}Z`} fill="#9e3328" />
    </> : kind === 'hcm' ? <>
      <rect x={cx + 1} y={cy - 4.8} width="2" height="9.2" fill="#2d658a" />
      <rect x={cx - 4.6} y={cy + .2} width="5" height="4.4" fill="#d9c391" />
      <rect x={cx - 2.8} y={cy - 2.2} width="1.8" height="2.4" fill="#a84432" />
    </> : kind === 'halong' ? <>
      <path d={`M${cx - 5} ${cy + 2.2}H${cx + 5}A6 6 0 0 1 ${cx - 5} ${cy + 2.2}Z`} fill="#1f7a91" />
      <path d={`M${cx - 4.8} ${cy + 2.2}L${cx - 2.5} ${cy - 3.5}L${cx - .3} ${cy + 2.2}Z`} fill="#3e6352" />
      <path d={`M${cx - .5} ${cy + 2.2}L${cx + 2} ${cy - 4.2}L${cx + 4.6} ${cy + 2.2}Z`} fill="#2f5243" />
    </> : kind === 'hue' ? <>
      <rect x={cx - 3.2} y={cy + 1} width="6.4" height="2.8" fill="#6c3063" />
      <rect x={cx - 2.3} y={cy - 1.4} width="4.6" height="2.4" fill="#7e3b73" />
      <path d={`M${cx - 2.8} ${cy - 1.4}L${cx} ${cy - 5}L${cx + 2.8} ${cy - 1.4}Z`} fill="#d9b25f" />
    </> : kind === 'danang' ? <>
      <path d={`M${cx - 5} ${cy + 2.2}H${cx + 5}A6 6 0 0 1 ${cx - 5} ${cy + 2.2}Z`} fill="#247291" />
      <path d={`M${cx - 4.8} ${cy + 2}Q${cx - 1.8} ${cy - 3.5} ${cx} ${cy}Q${cx + 2.2} ${cy - 3.2} ${cx + 4.6} ${cy + 1.6}`} fill="none" stroke="#d4911e" strokeWidth="1.6" />
    </> : kind === 'lotus' ? <>
      <ellipse cx={cx} cy={cy - .2} rx="1.8" ry="4.2" fill="#d95b7d" />
      <ellipse cx={cx - 2.2} cy={cy + .5} rx="1.5" ry="3.4" transform={`rotate(-28 ${cx - 2.2} ${cy + .5})`} fill="#d95b7d" />
      <ellipse cx={cx + 2.2} cy={cy + .5} rx="1.5" ry="3.4" transform={`rotate(28 ${cx + 2.2} ${cy + .5})`} fill="#d95b7d" />
    </> : kind === 'coffee' ? <>
      <rect x={cx - 3.2} y={cy - 1} width="6.4" height="4.8" rx="1.3" fill="#5c331b" />
      <path d={`M${cx - 1.4} ${cy - 2.2}V${cy - 4.2}M${cx + 1.2} ${cy - 2.2}V${cy - 4.2}`} stroke="#8c593b" strokeWidth="1" />
    </> : kind === 'tea' || kind === 'dalat' || kind === 'rice' ? <>
      <path d={`M${cx - 5.4} ${cy + 4}A5 5 0 0 1 ${cx + 1} ${cy + 4}Z`} fill="#4aa366" />
      <path d={`M${cx - 1} ${cy + 4}A5 5 0 0 1 ${cx + 5.4} ${cy + 4}Z`} fill="#2b7546" />
    </> : kind === 'fansipan' || kind === 'mountain' ? <>
      <path d={`M${cx - 5} ${cy + 4}L${cx - .8} ${cy - 4.2}L${cx + 3.2} ${cy + 4}Z`} fill={accent} />
      <path d={`M${cx - 2} ${cy - 1.6}L${cx - .8} ${cy - 4.2}L${cx + .2} ${cy - 1.6}Z`} fill="#fff" />
    </> : <>
      <path d={`M${cx - 4.5} ${cy - .4}L${cx} ${cy - 4.2}L${cx + 4.5} ${cy - .4}Z`} fill={accent} />
      <rect x={cx - 3.2} y={cy - .4} width="6.4" height="4" fill="#d4ae60" />
      <rect x={cx - 1} y={cy + 1} width="2" height="2.6" fill="#4a311c" />
    </>}
  </g>;
}

function SpecialCellArt({ type, name, cx, cy }: { type: string; name: string; cx: number; cy: number }) {
  if (type === 'chance') {
    return <g className="vn-cell-card-deck vn-cell-deck-chance" aria-hidden="true">
      <rect x={cx - 9} y={cy - 10} width="18" height="22" rx="3" fill="#e7dcc0" stroke="#78350f" strokeWidth=".9" transform={`translate(2.4 2.2) rotate(-7 ${cx} ${cy})`} />
      <rect x={cx - 9} y={cy - 10} width="18" height="22" rx="3" fill="#b42b38" stroke="#f5d57a" strokeWidth="1.4" transform={`rotate(-7 ${cx} ${cy})`} />
      <rect x={cx - 6.4} y={cy - 7.4} width="12.8" height="16.8" rx="1.8" fill="none" stroke="#fde68a99" strokeWidth=".8" strokeDasharray="2 1.5" transform={`rotate(-7 ${cx} ${cy})`} />
      <text x={cx} y={cy + 6} textAnchor="middle" fontSize="14.5" fontWeight="900" fill="#fde68a">?</text>
    </g>;
  }
  if (type === 'community') {
    return <g className="vn-cell-card-deck vn-cell-deck-community" aria-hidden="true">
      <rect x={cx - 9} y={cy - 10} width="18" height="22" rx="3" fill="#e7dcc0" stroke="#78350f" strokeWidth=".9" transform={`translate(-2.4 2.2) rotate(7 ${cx} ${cy})`} />
      <rect x={cx - 9} y={cy - 10} width="18" height="22" rx="3" fill="#1b6b50" stroke="#f5d57a" strokeWidth="1.4" transform={`rotate(7 ${cx} ${cy})`} />
      <rect x={cx - 6.4} y={cy - 7.4} width="12.8" height="16.8" rx="1.8" fill="none" stroke="#fde68a99" strokeWidth=".8" strokeDasharray="2 1.5" transform={`rotate(7 ${cx} ${cy})`} />
      <text x={cx} y={cy + 5.5} textAnchor="middle" fontSize="13.5" fontWeight="900" fill="#fde68a">★</text>
    </g>;
  }
  if (type === 'station') {
    return <g aria-hidden="true">
      <rect x={cx - 10} y={cy - 6} width="20" height="12" rx="3" fill="#22c55e" stroke="#111" strokeWidth="1.1" />
      <rect x={cx - 7} y={cy - 4} width="6" height="5" rx="1" fill="#e0f2fe" />
      <rect x={cx + 1} y={cy - 4} width="6" height="5" rx="1" fill="#e0f2fe" />
      <circle cx={cx - 5.5} cy={cy + 7} r="2.6" fill="#111" />
      <circle cx={cx + 5.5} cy={cy + 7} r="2.6" fill="#111" />
    </g>;
  }
  if (type === 'utility') {
    const water = name.toLowerCase().includes('nước');
    return water ? <g aria-hidden="true">
      <path d={`M${cx} ${cy - 8}C${cx - 7} ${cy} ${cx - 7} ${cy + 7} ${cx} ${cy + 7}C${cx + 7} ${cy + 7} ${cx + 7} ${cy} ${cx} ${cy - 8}Z`} fill="#38bdf8" stroke="#111" strokeWidth="1.1" />
    </g> : <g aria-hidden="true">
      <circle cx={cx} cy={cy - 2} r="6.5" fill="#fde047" stroke="#111" strokeWidth="1.1" />
      <rect x={cx - 3} y={cy + 4} width="6" height="3.5" rx="1" fill="#94a3b8" stroke="#111" strokeWidth=".9" />
    </g>;
  }
  if (type === 'tax') {
    return <g aria-hidden="true">
      <polygon points={`${cx},${cy - 8} ${cx + 9},${cy - 2} ${cx},${cy + 8} ${cx - 9},${cy - 2}`} fill="#38bdf8" stroke="#111" strokeWidth="1.1" />
      <polygon points={`${cx},${cy - 8} ${cx + 4},${cy - 2} ${cx},${cy + 8} ${cx - 4},${cy - 2}`} fill="#bae6fd" />
    </g>;
  }
  if (type === 'start') {
    return <g aria-hidden="true">
      <path d={`M${cx - 16} ${cy + 2}A16 14 0 0 1 ${cx + 16} ${cy + 2}`} fill="none" stroke="#ef4444" strokeWidth="3" />
      <path d={`M${cx - 13} ${cy + 2}A13 11 0 0 1 ${cx + 13} ${cy + 2}`} fill="none" stroke="#facc15" strokeWidth="2.6" />
      <path d={`M${cx - 10} ${cy + 2}A10 8 0 0 1 ${cx + 10} ${cy + 2}`} fill="none" stroke="#3b82f6" strokeWidth="2.4" />
      <path d={`M${cx + 14} ${cy + 9}H${cx - 12}L${cx - 7} ${cy + 5}M${cx - 12} ${cy + 9}L${cx - 7} ${cy + 13}`} fill="none" stroke="#dc2626" strokeWidth="2.2" strokeLinecap="round" />
    </g>;
  }
  if (type === 'jail') {
    return <g aria-hidden="true">
      <polygon points={`${cx},${cy - 11} ${cx + 13},${cy} ${cx},${cy + 11} ${cx - 13},${cy}`} fill="#fb923c" stroke="#111" strokeWidth="1.2" />
      <circle cx={cx} cy={cy + 1} r="4.5" fill="#fde68a" stroke="#111" strokeWidth=".9" />
      <line x1={cx - 6} y1={cy - 7} x2={cx - 6} y2={cy + 7} stroke="#111" strokeWidth="1.3" />
      <line x1={cx} y1={cy - 10} x2={cx} y2={cy + 10} stroke="#111" strokeWidth="1.3" />
      <line x1={cx + 6} y1={cy - 7} x2={cx + 6} y2={cy + 7} stroke="#111" strokeWidth="1.3" />
    </g>;
  }
  if (type === 'rest') {
    return <g aria-hidden="true">
      <path d={`M${cx - 11} ${cy + 3}L${cx + 10} ${cy - 5}L${cx + 13} ${cy - 2}L${cx - 8} ${cy + 6}Z`} fill="#c084fc" stroke="#111" strokeWidth="1" />
      <path d={`M${cx - 2} ${cy - 2}L${cx - 9} ${cy - 9}L${cx - 5} ${cy - 10}L${cx + 3} ${cy - 3}Z`} fill="#e9d5ff" stroke="#111" strokeWidth="1" />
      <path d={`M${cx + 1} ${cy + 1}L${cx + 6} ${cy + 9}L${cx + 9} ${cy + 8}L${cx + 5} ${cy}Z`} fill="#e9d5ff" stroke="#111" strokeWidth="1" />
    </g>;
  }
  if (type === 'gotojail') {
    return <g aria-hidden="true">
      <circle cx={cx} cy={cy + 1} r="7.5" fill="#fde68a" stroke="#111" strokeWidth="1.1" />
      <path d={`M${cx - 9} ${cy - 3}Q${cx} ${cy - 12} ${cx + 9} ${cy - 3}Z`} fill="#1d4ed8" stroke="#111" strokeWidth="1.1" />
      <rect x={cx - 9} y={cy - 4} width="18" height="2.4" rx="1" fill="#111" />
      <circle cx={cx} cy={cy - 6.5} r="1.5" fill="#facc15" />
    </g>;
  }
  return null;
}

function FlatBuilding({ x, y, level, color }: { x: number; y: number; level: number; color: string }) {
  const lvl = Math.max(1, Math.min(5, level));
  const isHotel = lvl === 5;
  const cx = x + 30, baseY = y + 52;
  const w = isHotel ? 38 : 18 + lvl * 4.5, h = isHotel ? 27 : 10 + lvl * 3.6, bx = cx - w / 2, by = baseY - h;
  const roofFill = isHotel ? '#d97706' : color;
  const wallFill = isHotel ? '#fef3c7' : '#fffbeb';
  const rows = Math.min(4, lvl), cols = isHotel ? 4 : Math.min(4, lvl + 1);
  return <g className="vn-flat-building" data-building-level={lvl} aria-label={isHotel ? 'Khách sạn' : `Nhà cấp ${lvl}`}>
    {/* Stepped foundation plinth */}
    <rect x={bx - 3} y={baseY - 2} width={w + 6} height="4" rx="1.2" fill={roofFill} stroke="#111111" strokeWidth="1" />
    {/* Side wings for Level 3+ */}
    {lvl >= 3 && <>
      <rect x={bx - 5.5} y={baseY - h * .65} width="5.5" height={h * .65} rx="1" fill={wallFill} stroke="#111111" strokeWidth="1.1" />
      <rect x={bx + w} y={baseY - h * .65} width="5.5" height={h * .65} rx="1" fill={wallFill} stroke="#111111" strokeWidth="1.1" />
      <path d={`M${bx - 6.5} ${baseY - h * .65}L${bx - 2.75} ${baseY - h * .65 - 4}L${bx + 1} ${baseY - h * .65}Z`} fill={roofFill} stroke="#111111" strokeWidth=".9" />
      <path d={`M${bx + w - 1} ${baseY - h * .65}L${bx + w + 2.75} ${baseY - h * .65 - 4}L${bx + w + 6.5} ${baseY - h * .65}Z`} fill={roofFill} stroke="#111111" strokeWidth=".9" />
    </>}
    {/* Main multi-story body */}
    <rect x={bx} y={by} width={w} height={h} rx="1.8" fill={wallFill} stroke="#111111" strokeWidth="1.4" />
    {/* Glowing story windows */}
    {Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => {
      const ww = Math.max(2.6, (w - 6) / (cols * 1.45)), wh = Math.max(2.4, (h - 5) / (rows * 1.55));
      const wx = bx + 3 + c * ((w - 6) / cols) + ((w - 6) / cols - ww) / 2;
      const wy = by + 2.5 + r * ((h - 5) / rows);
      return <rect key={`${r}-${c}`} x={wx} y={wy} width={ww} height={wh} rx=".6" fill={isHotel ? '#f59e0b' : '#fbbf24'} stroke="#78350f" strokeWidth=".55" />;
    }))}
    {/* Pitched roof for C1-C4, imperial gold crown + star for Level 5 Hotel */}
    {isHotel ? <>
      <rect x={bx - 2} y={by - 4.5} width={w + 4} height="5" rx="1.2" fill="#d97706" stroke="#111111" strokeWidth="1.1" />
      <path d={`M${cx - 10} ${by - 4.5}L${cx - 7} ${by - 11}L${cx - 2.5} ${by - 7}L${cx} ${by - 13}L${cx + 2.5} ${by - 7}L${cx + 7} ${by - 11}L${cx + 10} ${by - 4.5}Z`} fill="#facc15" stroke="#111111" strokeWidth="1.1" />
    </> : <path d={`M${bx - 3} ${by + .5}L${cx} ${by - 6 - lvl * 1.1}L${bx + w + 3} ${by + .5}Z`} fill={roofFill} stroke="#111111" strokeWidth="1.2" />}
  </g>;
}

function FlatPlayerToken({ cx, cy, side, cell, index, isMine, isTurn, compact = false, crowded = false }: { cx: number; cy: number; side: string; cell: number; index: number; isMine: boolean; isTurn: boolean; compact?: boolean; crowded?: boolean }) {
  const style = TOKEN_STYLES[side] || { fill: PARTY_COLORS[side] || '#ef233c', dark: '#7f1d1d', label: `P${index + 1}` };
  const scale = crowded ? .24 : compact ? .34 : .5;
  return <g className="flat-player-token" data-token-side={side} data-token-cell={cell} transform={`translate(${cx} ${cy}) scale(${scale}) translate(${-cx} ${-cy})`} aria-label={`Nhân vật ${SIDE_NAMES[side] || side}${isMine ? ' (Bạn)' : ''}`}>
    {isTurn && <circle cx={cx} cy={cy} r="17.5" fill="none" stroke="#111111" strokeWidth="2.2" strokeDasharray="3 2" />}
    {isMine && <circle cx={cx} cy={cy} r="15.5" fill="none" stroke="#facc15" strokeWidth="2.8" />}
    {/* Drop shadow */}
    <ellipse cx={cx} cy={cy + 11.5} rx="11" ry="4" fill="#00000055" />
    {/* Big high-contrast white shield halo so token never blends into the board */}
    <circle cx={cx} cy={cy} r="13" fill="#ffffff" stroke="#111111" strokeWidth="2.4" />
    <circle cx={cx} cy={cy} r="10.4" fill={style.fill} stroke="#ffffff" strokeWidth="1.4" />
    {/* Character bust silhouette (head + shoulders + crown) */}
    <path d={`M${cx - 6.2} ${cy + 6.8} C${cx - 6.2} ${cy + 2.2} ${cx + 6.2} ${cy + 2.2} ${cx + 6.2} ${cy + 6.8} Z`} fill="#ffffff" />
    <circle cx={cx} cy={cy - 1.6} r="3.8" fill="#ffffff" />
    {/* Crown on top of token */}
    <path d={`M${cx - 5.5} ${cy - 9.5} L${cx - 3} ${cy - 14} L${cx} ${cy - 11} L${cx + 3} ${cy - 14} L${cx + 5.5} ${cy - 9.5} Z`} fill="#facc15" stroke="#111111" strokeWidth="1" />
    {/* Clear player badge pill at bottom of token */}
    <rect x={cx - 11} y={cy + 5.2} width="22" height="9.2" rx="4.6" fill="#111111" stroke="#ffffff" strokeWidth="1.1" />
    <text x={cx} y={cy + 12.1} textAnchor="middle" fontSize="6.8" fontWeight="900" fill="#fde047">{isMine ? 'BẠN' : `${index + 1}·${style.label}`}</text>
  </g>;
}

export default function VietnamEstateBoard({ state, mySide, selected, onSelect, layout = VN_RECT, justPurchasedLot = null, justPurchasedKey = 0, justPurchasedLots, auctionLot = null, tileFx = null, drawingCardLot = null }: { state: PartyState; mySide: string; selected: number; onSelect: (index: number) => void; layout?: EstateLayout; justPurchasedLot?: number | null; justPurchasedKey?: number; justPurchasedLots?: number[]; auctionLot?: number | null; tileFx?: { lot: number; type: string; amount: number; key: number } | null; drawingCardLot?: number | null }) {
  const activePlayers = state.players.filter(v => v.active);
  const turnSide = (state as { turn?: string }).turn;
  const glowId = useId().replaceAll(':', '');
  const glowLots = justPurchasedLots ?? (justPurchasedLot != null ? [justPurchasedLot] : []);
  const board = estateBoardSize(layout, 780), bounds = (index: number) => estateBounds(index, layout, 780), center = estateCenterBounds(layout, 780);
  const mx = board.width / 2, my = board.height / 2, stripDepth = Math.min(18, Math.max(14, Math.round(board.unit * .27)));
  const occupiedByCell = new Map<number, typeof activePlayers>();
  for (const p of activePlayers) {
    const arr = occupiedByCell.get(p.position) || [];
    arr.push(p);
    occupiedByCell.set(p.position, arr);
  }
  return <div className="party-board estate-board vn-estate-flat" data-layout={`${layout.cols}x${layout.rows}`}><svg viewBox={`0 0 ${board.width} ${board.height}`} role="img" aria-label={t('Bàn Tỷ phú Việt Nam 48 ô, 34 tỉnh thành')} preserveAspectRatio="xMidYMid meet">
    <defs><filter id={glowId} x="-45%" y="-45%" width="190%" height="190%"><feGaussianBlur stdDeviation="4" /></filter></defs>
    <rect className="board-svg-base" width={board.width} height={board.height} fill="#fff" stroke="#111827" strokeWidth="3" />
    <rect className="board-svg-center" x={center.x} y={center.y} width={center.width} height={center.height} fill="#f5f3eb" stroke="#111827" strokeWidth="2" />
    <g aria-hidden="true">
      <text className="board-svg-label" x={mx} y={my - 23} textAnchor="middle" fill="#172d24" fontSize="46" fontWeight="900">{t('TỶ PHÚ')}</text>
      <text x={mx} y={my + 15} textAnchor="middle" fill="#475b50" fontSize="24" fontWeight="800">{t('VIỆT NAM')}</text>
      <text x={mx} y={my + 54} textAnchor="middle" fill="#475b50" fontSize="20" fontWeight="700">{t('Vòng') + ' '}{state.round}</text>
    </g>
    {VN_CELLS.map(c => {
      const cell = bounds(c.index), w = cell.width, h = cell.height, owned = state.property[c.index], lvl = state.houses[c.index] || 0;
      const physCorner = isEstateCorner(c.index, layout), specialCorner = ['start', 'jail', 'rest', 'gotojail'].includes(c.type), edge = estateEdge(c.index, layout), vertical = edge === 1 || edge === 3;
      const rows = estateTitleLines(c.name, true), occupied = occupiedByCell.has(c.index);
      const color = owned ? TOKEN_STYLES[owned]?.fill || PARTY_COLORS[owned] : '#111827';
      const accent = c.group !== undefined ? CLASSIC_GROUP_COLORS[c.group] || VN_GROUP_COLORS[c.group] : c.type === 'station' ? '#475569' : c.type === 'utility' ? '#b45309' : c.type === 'tax' ? '#b91c1c' : '#64748b';
      const selectedHere = selected === c.index, auction = auctionLot === c.index, landmark = PROVINCE_LANDMARKS[c.name];
      const price = ownable(c) ? String(c.price) : c.type === 'start' ? '+' + estateSalary(state) + ' tr' : c.type === 'rest' ? '+100 tr' : c.type === 'tax' ? '−' + c.amount : '';
      const hasStrip = !physCorner && Boolean(price || c.type === 'property');
      const s = hasStrip ? stripDepth : 0;
      const bx = physCorner ? 0 : edge === 3 ? s : 0, by = physCorner ? 0 : edge === 0 ? s : 0, bw = physCorner || !vertical ? w : w - s, bh = physCorner || vertical ? h : h - s;
      const tx = bx + bw / 2, fs = physCorner ? 13.5 : 10.8, ty = by + (physCorner ? 15.5 : rows.length > 1 ? 11.5 : 14.5);
      const artX = tx, artY = by + bh * (physCorner ? (price ? .54 : .58) : (rows.length > 1 ? .68 : .64));
      return <g key={c.index} data-cell-index={c.index} data-corner={physCorner ? 'true' : undefined} data-house-level={lvl > 0 ? lvl : undefined} transform={`translate(${cell.x} ${cell.y})`} data-owned={Boolean(owned) || selectedHere} role="button" tabIndex={0} aria-label={'Xem ' + c.name} aria-pressed={selectedHere} onClick={() => onSelect(c.index)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(c.index); } }}>
        <rect className={auction ? 'board-svg-lot vn-auction-lot-pulse' : selectedHere ? 'board-svg-selected' : 'board-svg-lot'} x={0} y={0} width={w} height={h} fill={auction || selectedHere ? '#fef08a' : owned ? OWNER_BG[owned] || '#fff' : specialCorner ? '#fff2d6' : '#fff'} stroke={auction ? '#d97706' : selectedHere ? '#dc2626' : owned ? color : specialCorner ? '#b58b3c' : '#111827'} strokeWidth={selectedHere || owned || auction ? 3 : specialCorner ? 2.2 : 1.5} />
        {hasStrip && <>
          {edge === 0 && <rect x={1} y={1} width={w - 2} height={s} fill={accent} />}
          {edge === 2 && <rect x={1} y={h - s - 1} width={w - 2} height={s} fill={accent} />}
          {edge === 1 && <rect x={w - s - 1} y={1} width={s} height={h - 2} fill={accent} />}
          {edge === 3 && <rect x={1} y={1} width={s} height={h - 2} fill={accent} />}
          {price && (edge === 0 ? <text x={w / 2} y={s / 2 + 4.3} textAnchor="middle" fontSize="11.2" fontWeight="900" fill="#ffffff">{price}</text>
            : edge === 2 ? <text x={w / 2} y={h - s / 2 + 3.3} textAnchor="middle" fontSize="11.2" fontWeight="900" fill="#ffffff">{price}</text>
              : edge === 1 ? <text x={w - s / 2 - 1} y={h / 2} textAnchor="middle" dominantBaseline="central" fontSize="11.2" fontWeight="900" fill="#ffffff" transform={`rotate(90 ${w - s / 2 - 1} ${h / 2})`}>{price}</text>
                : <text x={s / 2 + 1} y={h / 2} textAnchor="middle" dominantBaseline="central" fontSize="11.2" fontWeight="900" fill="#ffffff" transform={`rotate(-90 ${s / 2 + 1} ${h / 2})`}>{price}</text>)}
        </>}
        {rows.map((line, i) => <text key={i} x={tx} y={ty + i * (fs + .9)} textAnchor="middle" fontSize={fs} fontWeight="900" fill="#111827" textLength={line.length > 7 ? bw - 3.5 : undefined} lengthAdjust="spacingAndGlyphs">{line}</text>)}
        {(!occupied || ['chance', 'community'].includes(c.type)) && (lvl > 0 ? <g transform={`translate(${artX} ${artY}) scale(.76) translate(-30 -38)`}><FlatBuilding x={0} y={0} level={lvl} color={color} /></g> : landmark ? <g transform={`translate(${artX} ${artY}) scale(${physCorner ? 2.3 : 1.85})`}><SvgLandmark cx={0} cy={0} kind={landmark.kind} accent={accent} /></g> : <g opacity={occupied ? .55 : 1} transform={`translate(${artX} ${artY}) scale(${physCorner ? 1.55 : 1.05})`}><SpecialCellArt type={c.type} name={t(c.name ?? '')} cx={0} cy={0} /></g>)}
        {lvl > 0 && <g className="vn-house-level-badge" aria-label={lvl === 5 ? t('Khách sạn') : t('Nhà cấp {0}', lvl)}>
          <rect x={bx + bw - 26} y={by + 1.5} width="24.5" height="13.5" rx="3.2" fill={lvl === 5 ? '#d97706' : color} stroke="#ffffff" strokeWidth="1.1" />
          <text x={bx + bw - 13.75} y={by + 11.1} textAnchor="middle" fontSize="8.4" fontWeight="900" fill="#ffffff">{lvl === 5 ? '★KS' : `C${lvl}`}</text>
        </g>}
        {physCorner && price && <text x={tx} y={h - 7} textAnchor="middle" fontSize="12.2" fontWeight="900" fill={c.type === 'start' || c.type === 'rest' ? '#15803d' : ownable(c) ? '#11281f' : '#b91c1c'}>{price}</text>}
        {owned && <rect x={1} y={h - 3} width={w - 2} height={2.5} fill={color} />}
        {state.mortgaged?.[c.index] && <path d={`M5 ${h - 7}L${w - 5} 9`} stroke="#dc2626" strokeWidth="3" opacity=".85" />}
      </g>;
    })}
    {activePlayers.map((p, i) => {
      const b = bounds(p.position), cellmates = activePlayers.filter(other => other.position === p.position), slot = cellmates.findIndex(other => other.side === p.side), many = cellmates.length > 4;
      const ox = b.width * (cellmates.length === 1 ? .5 : many ? .16 + (slot % 4) * .225 : .3 + (slot % 2) * .4);
      const oy = b.height * (cellmates.length <= 2 ? .62 : many ? .56 + Math.floor(slot / 4) * .18 : .56 + Math.floor(slot / 2) * .18);
      return <g key={p.side} transform={`translate(${b.x + ox} ${b.y + oy}) scale(${Math.min(b.width, b.height) / 60})`}><FlatPlayerToken cx={0} cy={0} side={p.side} cell={p.position} index={i} isMine={p.side === mySide} isTurn={p.side === turnSide} compact={cellmates.length > 1} crowded={many} /></g>;
    })}
    {[...occupiedByCell.entries()].map(([cellIdx, standers]) => {
      const c = VN_CELLS[cellIdx]; if (!c) return null;
      const b = bounds(cellIdx), edge = estateEdge(cellIdx, layout);
      const lvl = state.houses[cellIdx] || 0;
      const sub = lvl > 0 ? (lvl === 5 ? '★KS' : `C${lvl}`) : (ownable(c) ? `${c.price} tr` : c.type === 'start' ? `+${estateSalary(state)} tr` : c.type === 'rest' ? '+100 tr' : c.type === 'tax' ? `−${c.amount} tr` : '');
      const label = sub ? `${c.name} · ${sub}` : c.name;
      const pillW = Math.min(185, Math.max(82, label.length * 6.6 + 26)), pillH = 24;
      const leadSide = standers.find(p => p.side === turnSide)?.side || standers[0].side;
      const dotColor = TOKEN_STYLES[leadSide]?.fill || PARTY_COLORS[leadSide] || '#f59e0b';
      let px = b.x + b.width / 2 - pillW / 2, py = b.y + b.height / 2 - pillH / 2;
      let arrow = '';
      if (edge === 0) {
        py = center.y + center.height - pillH - 7;
        px = Math.max(center.x + 6, Math.min(center.x + center.width - pillW - 6, b.x + b.width / 2 - pillW / 2));
        const ax = Math.max(px + 10, Math.min(px + pillW - 10, b.x + b.width / 2));
        arrow = `M${ax - 5} ${py + pillH}L${ax} ${py + pillH + 6}L${ax + 5} ${py + pillH}Z`;
      } else if (edge === 2) {
        py = center.y + 7;
        px = Math.max(center.x + 6, Math.min(center.x + center.width - pillW - 6, b.x + b.width / 2 - pillW / 2));
        const ax = Math.max(px + 10, Math.min(px + pillW - 10, b.x + b.width / 2));
        arrow = `M${ax - 5} ${py}L${ax} ${py - 6}L${ax + 5} ${py}Z`;
      } else if (edge === 1) {
        px = center.x + 7;
        py = Math.max(center.y + 6, Math.min(center.y + center.height - pillH - 6, b.y + b.height / 2 - pillH / 2));
        const ay = Math.max(py + 7, Math.min(py + pillH - 7, b.y + b.height / 2));
        arrow = `M${px} ${ay - 5}L${px - 6} ${ay}L${px} ${ay + 5}Z`;
      } else {
        px = center.x + center.width - pillW - 7;
        py = Math.max(center.y + 6, Math.min(center.y + center.height - pillH - 6, b.y + b.height / 2 - pillH / 2));
        const ay = Math.max(py + 7, Math.min(py + pillH - 7, b.y + b.height / 2));
        arrow = `M${px + pillW} ${ay - 5}L${px + pillW + 6} ${ay}L${px + pillW} ${ay + 5}Z`;
      }
      return <g key={`callout-${cellIdx}`} className="vn-occupied-callout" data-callout-cell={cellIdx} style={{ pointerEvents: 'none' }}>
        <path d={arrow} fill="#f5d57a" />
        <rect x={px} y={py} width={pillW} height={pillH} rx="6" fill="#14110de8" stroke="#f5d57a" strokeWidth="1.5" />
        <circle cx={px + 11} cy={py + pillH / 2} r="4.2" fill={dotColor} stroke="#ffffff" strokeWidth="1.1" />
        <text x={px + 20} y={py + pillH / 2 + 3.6} textAnchor="start" fontSize="10.2" fontWeight="900" fill="#fffbeb">{label}</text>
      </g>;
    })}
    {glowLots.filter(lot => lot >= 0 && lot < 48).map(lot => {
      const b = bounds(lot), side = state.property[lot]; return <g key={justPurchasedKey + ':' + lot} className="vn-ownership-glow" data-glow-lot={lot} aria-hidden="true">
        <rect x={b.x + 4} y={b.y + 4} width={b.width - 8} height={b.height - 8} fill="none" stroke={PARTY_COLORS[side || 'R']} strokeWidth="8" filter={'url(#' + glowId + ')'} />
        <rect x={b.x + 3} y={b.y + 3} width={b.width - 6} height={b.height - 6} fill="none" stroke={PARTY_COLORS[side || 'R']} strokeWidth="3" />
      </g>;
    })}
    {drawingCardLot != null && drawingCardLot >= 0 && drawingCardLot < 48 && (() => {
      const b = bounds(drawingCardLot), cell = VN_CELLS[drawingCardLot], isComm = cell?.type === 'community';
      const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
      return <g className="vn-tile-card-pop" data-card-pop-lot={drawingCardLot} aria-hidden="true" style={{ pointerEvents: 'none' }}>
        <rect x={b.x - 3} y={b.y - 3} width={b.width + 6} height={b.height + 6} rx="5" fill="none" stroke="#fde047" strokeWidth="4" />
        <g className="vn-tile-card-eject">
          <rect x={cx - 16} y={cy - 22} width="32" height="44" rx="5" fill={isComm ? '#1b6b50' : '#b42b38'} stroke="#fde047" strokeWidth="2" />
          <text x={cx} y={cy + 6} textAnchor="middle" fontSize="20" fontWeight="900" fill="#fde68a">{isComm ? '★' : '?'}</text>
        </g>
      </g>;
    })()}
    {tileFx && tileFx.lot >= 0 && tileFx.lot < 48 && (() => {
      const b = bounds(tileFx.lot), cx = b.x + b.width / 2, cy = b.y + b.height / 2, isGain = tileFx.amount > 0, label = tileFx.type === 'jail' ? 'Vào tù' : tileFx.amount ? (isGain ? '+' : '−') + Math.abs(tileFx.amount) + ' tr' : '';
      return label && <g key={tileFx.key} className="vn-tile-fx" aria-hidden="true"><g className="vn-fx-float"><rect x={cx - 31} y={cy - 12} width="62" height="24" rx="12" fill={isGain ? '#14532d' : '#7f1d1d'} stroke="#fff" strokeWidth="1.5" /><text x={cx} y={cy + 4} textAnchor="middle" fontSize="12" fontWeight="800" fill="#fff">{label}</text></g></g>;
    })()}
  </svg></div>;
}
