import { t } from './language.ts';
import {useId,useState} from 'react';
import {BookOpen,ChevronLeft,ChevronRight,Check} from 'lucide-react';
import type {PartyState} from './practice-types';

const LESSONS=[
  {get title() { return t('1. Chơi đến bao giờ hết tiền'); },get text() { return t('Mỗi người khởi đầu với 3.000 triệu vốn ngang nhau, không giới hạn số vòng. Mục tiêu rất đơn giản: quản lý tiền mặt và đầu tư đất thông minh để trụ lại đến cuối cùng khi các đối thủ hết tiền.'); }},
  {get title() { return t('2. Gieo và đi đúng lượt'); },get text() { return t('Bấm Gieo xúc xắc, hoặc kéo rồi thả xúc xắc trên bàn. Qua Xuất phát nhận +500 triệu, dừng Nghỉ chân nhận +100 triệu. Ra đôi được thêm lượt; ba đôi liên tiếp vào Trại giam.'); }},
  {get title() { return t('3. Mua đất hoặc đấu giá'); },get text() { return t('Ô chưa có chủ: bấm Mua ngay hoặc chọn Không mua · Đấu giá để mở phiên đấu giá cho cả bàn. Giá đấu tối thiểu bằng giá gốc + 10 triệu, tăng ít nhất 10 triệu mỗi lần và nộp cho ngân hàng.'); }},
  {get title() { return t('4. Đủ 1 dãy màu → Xây nhà cả dãy'); },get text() { return t('Vào đất người khác trả thuê trước rồi có thể Mua lại. Ngay khi bạn sở hữu đủ tất cả các ô của một dãy màu (không thế chấp), nút Xây cả dãy sẽ mở khóa ngay để nâng cấp toàn bộ dãy cùng lúc (C1 → C4 → ★KS).'); }},
  {get title() { return t('5. Bài Cơ hội, Khí vận & Thương lượng'); },get text() { return t('Dừng tại ô Cơ hội hoặc Khí vận sẽ rút 1 lá bài từ bộ bài giữa bàn. Bạn cũng có thể mở mục Giao dịch để đổi đất gom dãy màu, tặng tiền hoặc cho vay. Bấm nút ? bất cứ lúc nào để tra cứu các nút điều khiển.'); }},
];

export function estateTurnHint(state:PartyState,mySide:string,turn?:string,busy=false,live=true){
  if(state.stage==='finished')return t('Ván đã kết thúc. Bạn có thể xem kết quả, xem lại lượt chơi hoặc mời đấu lại.');
  if(state.started===false)return t('Chờ mọi người sẵn sàng; chủ phòng có thể bắt đầu từ 2 người.');
  if(!live)return t('Đang xem bàn: hướng dẫn chỉ giải thích luật, không thực hiện thao tác.');
  if(busy)return t('Chờ xúc xắc dừng và quân đến nơi; các quyết định sẽ mở sau đó.');
  if(!state.players.find(player=>player.side===mySide)?.active)return t('Bạn đã dừng chơi; có thể tiếp tục theo dõi bàn.');
  if(turn&&turn!==mySide)return state.stage==='deal'?t('Chờ đối tác phản hồi hợp đồng. Tiền và đất chưa chuyển.'):state.stage==='auction'?t('Đang đấu giá: chờ đến lượt trả giá của bạn.'):t('Đang là lượt người khác. Bạn có thể xem các ô đất.');
  const hints:Record<string,string>={roll:t('Lượt của bạn: gieo 2 xúc xắc. Nếu đã đủ dãy màu, bạn có thể bấm Xây cả dãy ngay!'),draw_card:t('Bạn vừa dừng ở ô rút bài: bấm vào Bộ thẻ trên bàn để rút 1 lá bài và xem hiệu ứng!'),buy:t('Chọn Mua ô này hoặc bấm Không mua · Đấu giá để cả bàn trả giá.'),buyout:t('Tiền thuê đã xử lý xong. Xem giá Mua lại hoặc bấm Bỏ qua để tiếp tục.'),end:t('Xử lý xong ô đến: có thể Xây cả dãy (nếu đủ màu) rồi bấm Kết thúc lượt.'),auction:t('Đến lượt đấu giá: tổng giá = giá gốc + phần trả thêm, tăng ít nhất 10 triệu mỗi lần, nộp cho ngân hàng.'),deal:t('Bạn đang nhận đề nghị: đọc kỹ tiền và đất rồi Đồng ý, Từ chối hoặc Đề nghị giá khác.'),debt:t('Bạn đang thiếu tiền trả nợ: mở Tài sản để bán nhà, thế chấp hoặc thanh lý đất; hết khả năng mới Phá sản.')};
  return hints[state.stage]||t('Theo dõi thông báo và các thao tác hợp lệ ở bảng điều khiển.');
}

export default function EstateTutorial({state,mySide,turn,busy,live}:{state:PartyState;mySide:string;turn?:string;busy:boolean;live:boolean}){
  const id=useId(),[open,setOpen]=useState(()=>{try{return localStorage.getItem('sc-estate-tutorial-v3')!=='done';}catch{return true;}}),[step,setStep]=useState(0);
  const finish=()=>{try{localStorage.setItem('sc-estate-tutorial-v3','done');}catch{/* Storage is optional. */}setOpen(false);};
  return <section className="estate-tutorial" aria-label={t('Hướng dẫn chơi Tỷ phú')}>
    <div className="estate-tutorial-header"><p>{estateTurnHint(state,mySide,turn,busy,live)}</p><button type="button" className="text-button" aria-expanded={open} aria-controls={id} onClick={()=>setOpen(value=>!value)}><BookOpen size={15}/>{open?t('Thu gọn'):t('Hướng dẫn')}</button></div>
    {open&&<div id={id} className="estate-tutorial-lesson"><small>{t('Hướng dẫn') + ' '}{step+1}/{LESSONS.length}{' ' + t('· Không tạm dừng đồng hồ')}</small><h3>{LESSONS[step].title}</h3><p>{LESSONS[step].text}</p><nav aria-label={t('Các bước hướng dẫn')}><button type="button" className="button button-secondary button-small" disabled={step===0} onClick={()=>setStep(value=>value-1)}><ChevronLeft size={14}/>{t('Trước')}</button>{step<LESSONS.length-1?<button type="button" className="button button-small" onClick={()=>setStep(value=>value+1)}>{t('Tiếp')}<ChevronRight size={14}/></button>:<button type="button" className="button button-small" onClick={finish}><Check size={14}/>{t('Đã hiểu')}</button>}</nav></div>}
  </section>;
}
