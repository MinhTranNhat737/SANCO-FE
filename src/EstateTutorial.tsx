import {useId,useState} from 'react';
import {BookOpen,ChevronLeft,ChevronRight,Check} from 'lucide-react';
import type {PartyState} from './practice-types';

const LESSONS=[
  {title:'1. Nhận vốn, chọn chiến lược',text:'Đọc tên chế độ và giới hạn vòng trên bảng luật. Nếu chế độ có đất khởi nghiệp, đất được chia ngẫu nhiên và trừ tiền đúng giá, nên mọi người có cùng tổng vốn. Mục tiêu là giữ dòng tiền và tăng tài sản ròng.'},
  {title:'2. Gieo và đi đúng lượt',text:'Bấm Gieo 2 xúc xắc, hoặc kéo rồi thả xúc xắc trên bàn. Chờ xúc xắc dừng và quân đi đến ô mới. Đôi được thêm lượt; ba đôi liên tiếp vào tù. Sau khi xử lý ô đến, kết thúc lượt để bàn tiếp tục.'},
  {title:'3. Mua đất hoặc đấu giá',text:'Ô chưa có chủ: kiểm tra giá, giữ tiền dự phòng rồi mua. Trong luật mới, không mua sẽ mở đấu giá cho cả bàn. Giá tăng ít nhất 10 triệu mỗi lần; người trả cao nhất còn lại mua đúng giá đã trả. Ô vừa nhận sẽ phát sáng theo màu chủ mới.'},
  {title:'4. Thuê, mua lại và xây dựng',text:'Vào đất người khác phải trả thuê trước, rồi có thể mua lại theo giá hiển thị hoặc bỏ qua. Bấm vào ô để xem chi tiết. Gom đủ nhóm màu, chuộc hết thế chấp và xây đều từng cấp. Chi phí xây và tiền thuê hiện tại có thể đổi theo thị trường.'},
  {title:'5. Thương lượng hai chiều',text:'Mở Giao dịch với người chơi, chọn đối tác, tiền và các lô đất rồi xem lại đề nghị. Người nhận được chấp nhận, từ chối hoặc đưa giá ngược tối đa ba lần. Chỉ chấp nhận mới chuyển tiền và đất cùng lúc; mỗi lượt tối đa hai hợp đồng mới.'},
  {title:'6. Sự kiện và xử lý nợ',text:'Thẻ sự kiện có thể thưởng, thu phí, di chuyển hoặc chia tiền giữa các đối tác. Đọc thông báo thị trường để biết hệ số và thời hạn. Thiếu tiền thì thế chấp, bán công trình hoặc thanh lý đất; nếu không trả được mới phá sản. Vay có lãi cố định, đáo hạn theo số lần qua Xuất phát của người vay.'},
  {title:'7. Chốt tài sản và thắng ván',text:'Người cuối còn chơi thắng ngay. Luật sáng tạo còn chốt sau số vòng của chế độ: so tiền mặt + giá trị tài sản + khoản cho vay, trừ thế chấp và nợ phải trả. Bằng điểm cao nhất thì hòa. Cổ điển không giới hạn vòng. Đồng hồ của người đang phản hồi vẫn chạy khi mở hướng dẫn.'},
];

export function estateTurnHint(state:PartyState,mySide:string,turn?:string,busy=false,live=true){
  if(state.started===false)return 'Chờ mọi người sẵn sàng; chủ phòng có thể bắt đầu từ 2 người.';
  if(!live)return 'Đang xem bàn: hướng dẫn chỉ giải thích luật, không thực hiện thao tác.';
  if(busy)return 'Chờ xúc xắc dừng và quân đến nơi; các quyết định sẽ mở sau đó.';
  if(!state.players.find(player=>player.side===mySide)?.active)return 'Bạn đã dừng chơi; có thể tiếp tục theo dõi bàn.';
  if(turn&&turn!==mySide)return state.stage==='deal'?'Chờ đối tác phản hồi hợp đồng. Tiền và đất chưa chuyển.':state.stage==='auction'?'Đang đấu giá: chờ đến lượt trả giá của bạn.':'Đang là lượt người khác. Bạn có thể xem các ô đất.';
  const hints:Record<string,string>={roll:'Lượt của bạn: gieo 2 xúc xắc. Có thể quản lý tài sản trước khi gieo.',buy:'Chọn mua ô này hoặc đưa ra đấu giá. Kiểm tra tiền dự phòng trước khi quyết định.',buyout:'Tiền thuê đã được xử lý. Xem giá mua lại hoặc bỏ qua để tiếp tục.',end:'Xử lý xong ô đến: bấm Kết thúc lượt. Nếu vừa gieo đôi, bạn được gieo tiếp.',auction:'Đến lượt đấu giá: trả ít nhất giá hiện tại +10 triệu, hoặc bỏ đấu giá.',deal:'Bạn đang nhận đề nghị: đọc cả tiền và đất, rồi chấp nhận, từ chối hoặc trả giá ngược.',debt:'Bạn đang nợ: thế chấp, bán công trình hoặc thanh lý đất để trả. Không đủ khả năng thì phá sản.'};
  return hints[state.stage]||'Theo dõi thông báo và các thao tác hợp lệ ở bảng điều khiển.';
}

export default function EstateTutorial({state,mySide,turn,busy,live}:{state:PartyState;mySide:string;turn?:string;busy:boolean;live:boolean}){
  const id=useId(),[open,setOpen]=useState(()=>{try{return localStorage.getItem('sc-estate-tutorial-v3')!=='done';}catch{return true;}}),[step,setStep]=useState(0);
  const legacy:Record<number,string>={2:'Ván cũ: ô chưa có chủ có thể mua ngay hoặc chủ động mở đấu giá. Bấm Bỏ qua sẽ kết thúc lượt ngay. Bấm vào ô để kiểm tra giá trước khi quyết định.',4:'Mở Giao dịch với người chơi, chọn đối tác, tiền và đất rồi xem lại. Người nhận chấp nhận hoặc từ chối; ván cũ không có bước trả giá ngược. Chỉ chấp nhận mới chuyển tiền và đất cùng lúc.',5:'Ván cũ giữ bộ 6 thẻ sự kiện và không có chu kỳ thị trường. Thiếu tiền thì thế chấp, bán công trình hoặc thanh lý đất; nếu không trả được mới phá sản. Vay đến hạn theo số lần người vay qua Xuất phát.',6:'Ván cũ không chốt theo vòng: người cuối còn chơi thắng. Mỗi ván có giới hạn an toàn số thao tác. Đồng hồ của người đang phản hồi vẫn chạy khi mở hướng dẫn.'};
  const text=!state.profile&&legacy[step]?legacy[step]:LESSONS[step].text;
  const finish=()=>{try{localStorage.setItem('sc-estate-tutorial-v3','done');}catch{/* Storage is optional. */}setOpen(false);};
  return <section className="estate-tutorial" aria-label="Hướng dẫn chơi Tỷ phú">
    <div className="estate-tutorial-header"><p>{estateTurnHint(state,mySide,turn,busy,live)}</p><button type="button" className="text-button" aria-expanded={open} aria-controls={id} onClick={()=>setOpen(value=>!value)}><BookOpen size={15}/>{open?'Thu gọn':'Hướng dẫn'}</button></div>
    {open&&<div id={id} className="estate-tutorial-lesson"><small>Hướng dẫn {step+1}/{LESSONS.length} · Không tạm dừng đồng hồ</small><h3>{LESSONS[step].title}</h3><p>{text}</p><nav aria-label="Các bước hướng dẫn"><button type="button" className="button button-secondary button-small" disabled={step===0} onClick={()=>setStep(value=>value-1)}><ChevronLeft size={14}/>Trước</button>{step<LESSONS.length-1?<button type="button" className="button button-small" onClick={()=>setStep(value=>value+1)}>Tiếp<ChevronRight size={14}/></button>:<button type="button" className="button button-small" onClick={finish}><Check size={14}/>Đã hiểu</button>}</nav></div>}
  </section>;
}
