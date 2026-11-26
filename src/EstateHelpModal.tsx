import { useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Building2, Compass, Dice5, Gavel, HelpCircle, Landmark, ArrowLeftRight, Sparkles, X, Search } from 'lucide-react';
import type { PartyState } from './practice-types';
import { estateTurnHint } from './EstateTutorial';

type Tab = 'rules' | 'buttons' | 'faq';

const BUTTON_GUIDE = [
  { icon: <Dice5 size={17} />, name: 'Gieo xúc xắc', desc: 'Tung 2 xúc xắc để di chuyển quân theo chiều kim đồng hồ (hoặc nhấn giữ và kéo thả xúc xắc trực tiếp trên mặt bàn). Ra số đôi sẽ được đi thêm lượt; 3 đôi liên tiếp vào Trại giam.' },
  { icon: <Building2 size={17} />, name: 'Xây cả dãy', desc: 'Tự động xuất hiện ngay khi bạn sở hữu trọn 1 dãy ô cùng màu (không thế chấp). Bấm 1 lần sẽ xây nhà đồng loạt trên TẤT CẢ các ô của dãy đó (C1 → C2 → C3 → C4 → ★KS Khách sạn).' },
  { icon: <Gavel size={17} />, name: 'Mua ngay / Không mua · Đấu giá', desc: 'Khi dừng ở ô đất trống: bấm Mua để sở hữu theo giá niêm yết, hoặc bấm Không mua · Đấu giá để cả bàn trả giá công khai (tối thiểu giá gốc + 10 tr, người thắng nộp cho ngân hàng).' },
  { icon: <Sparkles size={17} />, name: 'Mua lại / Bỏ qua', desc: 'Sau khi trả tiền thuê trên đất người khác, bạn có thể bấm Mua lại để mua đứt ô đất đó (bằng giá đất gốc + chi phí nhà hiện có) hoặc Bỏ qua.' },
  { icon: <Landmark size={17} />, name: 'Tài sản (Thế chấp · Chuộc · Bán)', desc: 'Quản lý các ô bạn đang nắm giữ: Thế chấp nhận 50% giá đất, Chuộc lại với 55% giá đất, Bán bớt nhà hoặc Thanh lý đất cho ngân hàng khi cần tiền trả nợ.' },
  { icon: <ArrowLeftRight size={17} />, name: 'Giao dịch (Đổi đất · Tặng · Cho vay)', desc: 'Thương lượng đổi đất kèm tiền mặt để gom đủ dãy màu nhanh hơn, tặng tiền hỗ trợ hoặc lập hợp đồng cho vay có lãi suất cố định.' },
  { icon: <Compass size={17} />, name: 'Menu góc nhìn (3D / 2D · Toàn bàn)', desc: 'Mở mục Menu ở cuối HUD để đổi bàn 3D / 2D, bấm Toàn bàn hoặc Quân của bạn, chỉnh Sáng / Tối, Toàn màn hình hoặc kéo cạnh trái HUD để phóng rộng bảng điều khiển.' }
];

const FAQ_ITEMS = [
  { q: 'Khi nào ván đấu kết thúc? Ai là người chiến thắng?', a: 'Ván chơi không giới hạn số vòng — chơi đến bao giờ hết tiền! Ai không còn khả năng trả nợ sẽ phá sản rời bàn; người trụ lại cuối cùng giành chiến thắng.' },
  { q: 'Tại sao tôi mua đất rồi nhưng chưa thấy nút Xây nhà?', a: 'Theo luật xây cả dãy, bạn cần gom đủ TẤT CẢ các ô cùng một màu (và không có ô nào đang thế chấp). Ngay khi đủ dãy màu, nút "Xây cả dãy" sẽ hiện ngay ở cụm nút chính để bạn nâng cấp toàn bộ dãy cùng lúc!' },
  { q: 'Xây nhà cả dãy tính tiền như thế nào?', a: 'Mỗi lần bấm "Xây cả dãy", mọi ô trong nhóm màu đó cùng tăng thêm 1 bậc (từ C1 lên tới C4 rồi ★KS Khách sạn). Tổng chi phí bằng tổng giá xây 1 cấp của các ô trong dãy cộng lại.' },
  { q: 'Ô Cơ hội và ô Khí vận vận hành ra sao?', a: 'Khi dừng chân tại ô Cơ hội (bộ bài đỏ ?) hoặc ô Khí vận (bộ bài ngọc ★), hệ thống sẽ rút và lật mở ngẫu nhiên 1 lá bài từ chồng bài giữa bàn: có thể nhận thưởng, nộp phí bảo trì, nhận thẻ ra tù, về Xuất phát hoặc đi chuyến tàu.' },
  { q: 'Làm sao để ra khỏi Trại giam?', a: 'Đến lượt khi đang ở Trại giam, bạn có 3 cách: bấm "Trả 100 để ra tù", bấm "Dùng thẻ ra tù" (nếu đã rút được thẻ), hoặc bấm "Gieo xúc xắc" chờ ra số đôi. Hết 3 lượt hệ thống tự thu 100 tr để đi tiếp.' },
  { q: 'Thiếu tiền trả thuê hoặc nộp thuế thì xử lý thế nào?', a: 'Hệ thống sẽ chuyển sang trạng thái Cần trả nợ. Hãy mở mục "Tài sản" để Bán nhà, Thế chấp hoặc Bán đất. Ngay khi số dư đủ trả khoản nợ, hệ thống tự động thanh toán để bạn chơi tiếp; chỉ khi hết sạch tài sản mới phải bấm Phá sản.' }
];

export default function EstateHelpModal({ open, onClose, state, mySide, turn, busy = false, live = true }: { open: boolean; onClose: () => void; state: PartyState; mySide: string; turn?: string; busy?: boolean; live?: boolean }) {
  const [tab, setTab] = useState<Tab>('rules');
  const [query, setQuery] = useState('');

  if (!open || typeof document === 'undefined') return null;

  const qNorm = query.trim().toLowerCase();
  const filteredFaq = qNorm
    ? FAQ_ITEMS.filter(item => item.q.toLowerCase().includes(qNorm) || item.a.toLowerCase().includes(qNorm))
    : FAQ_ITEMS;

  const modal = <div className="estate-help-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <section className="estate-help-modal" role="dialog" aria-modal="true" aria-label="Hướng dẫn cách vận hành và các nút Tỷ phú">
      <header className="estate-help-head">
        <div>
          <span className="estate-help-kicker"><HelpCircle size={13} /> Trợ giúp Tỷ phú Việt Nam</span>
          <h3>Cách vận hành & Giải thích các nút</h3>
        </div>
        <button type="button" className="estate-card-close" aria-label="Đóng hướng dẫn" onClick={onClose}><X size={16} /></button>
      </header>

      <div className="estate-help-live-hint" role="status">
        <strong>Trạng thái hiện tại:</strong> <span>{estateTurnHint(state, mySide, turn, busy, live)}</span>
      </div>

      <div className="estate-help-tabs" role="tablist" aria-label="Chuyên mục hướng dẫn">
        <button type="button" role="tab" aria-selected={tab === 'rules'} className={tab === 'rules' ? 'is-active' : ''} onClick={() => setTab('rules')}><BookOpen size={14} /> Cách vận hành</button>
        <button type="button" role="tab" aria-selected={tab === 'buttons'} className={tab === 'buttons' ? 'is-active' : ''} onClick={() => setTab('buttons')}><Compass size={14} /> Các nút điều khiển</button>
        <button type="button" role="tab" aria-selected={tab === 'faq'} className={tab === 'faq' ? 'is-active' : ''} onClick={() => setTab('faq')}><HelpCircle size={14} /> Hỏi nhanh (?)</button>
      </div>

      <div className="estate-help-body">
        {tab === 'rules' && <div className="estate-help-rules-grid">
          <article className="estate-help-card">
            <strong>1. Chơi đến bao giờ hết tiền</strong>
            <p>Mỗi người khởi đầu với <b>3.000 triệu</b>, không giới hạn số vòng. Ai cạn tiền không trả nổi nợ sẽ phá sản; người trụ lại cuối cùng thắng cuộc!</p>
          </article>
          <article className="estate-help-card">
            <strong>2. Đủ dãy màu → Xây nhà luôn cả dãy</strong>
            <p>Sở hữu trọn bộ các ô cùng 1 màu (không thế chấp) sẽ mở khóa ngay nút <b>Xây cả dãy</b>: bấm 1 lần nâng cấp đồng loạt mọi ô trong dãy lên <b>C1 → C4 → ★KS</b>.</p>
          </article>
          <article className="estate-help-card">
            <strong>3. Bốn góc bàn & Mua / Đấu giá</strong>
            <p>Qua <b>Xuất phát +500 tr</b> · Dừng <b>Nghỉ chân +100 tr</b> · <b>Thăm tù</b> an toàn · <b>Vào tù</b> tối đa 3 lượt. Ô trống không mua sẽ mở đấu giá cho cả bàn.</p>
          </article>
          <article className="estate-help-card">
            <strong>4. Rút bài Cơ hội & Khí vận</strong>
            <p>Dừng ở ô <b>Cơ hội</b> (đỏ <b>?</b>) hoặc <b>Khí vận</b> (ngọc <b>★</b>) sẽ rút 1 lá bài từ bộ bài giữa bàn với hiệu ứng lật thẻ thưởng/phạt trực tiếp.</p>
          </article>
        </div>}

        {tab === 'buttons' && <div className="estate-help-btn-list">
          {BUTTON_GUIDE.map(item => <article key={item.name} className="estate-help-btn-row">
            <span className="estate-help-btn-icon">{item.icon}</span>
            <div>
              <strong>{item.name}</strong>
              <p>{item.desc}</p>
            </div>
          </article>)}
        </div>}

        {tab === 'faq' && <div className="estate-help-faq">
          <label className="estate-help-search">
            <Search size={14} />
            <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm nhanh câu hỏi (ví dụ: xây nhà, đấu giá, hết tiền, ra tù)…" aria-label="Tìm câu hỏi hướng dẫn" />
          </label>
          {filteredFaq.length > 0 ? filteredFaq.map(item => <details key={item.q} className="estate-help-qa" open={Boolean(qNorm)}>
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>) : <p className="estate-help-empty">Không tìm thấy câu hỏi khớp từ khóa. Hãy chuyển sang tab "Cách vận hành" hoặc "Các nút điều khiển" để xem đầy đủ.</p>}
        </div>}
      </div>
    </section>
  </div>;

  return createPortal(modal, document.body);
}
