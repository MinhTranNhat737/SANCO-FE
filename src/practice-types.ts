import {commanderName,commanderPreview} from './commander-ui.ts';
export type GameKind = 'caro' | 'chess' | 'xiangqi' | 'reversi' | 'connect4' | 'go' | 'ludo' | 'monopoly' | 'checkers' | 'tictactoe' | 'coganh' | 'ataxx' | 'breakthrough' | 'loa' | 'isolation' | 'commander';
export const ABSTRACT_KINDS:GameKind[]=['coganh','ataxx','breakthrough','loa','isolation'];
export const GAME_KINDS:GameKind[]=['monopoly','ludo','commander','caro','chess','xiangqi','reversi','connect4','go','checkers','tictactoe',...ABSTRACT_KINDS];
export const isParty=(kind:GameKind)=>kind==='ludo'||kind==='monopoly';
export const isPlacement=(kind:GameKind)=>['caro','reversi','connect4','go','tictactoe'].includes(kind);
export type PartyPlayer={side:string;active:boolean;tokens:number[];position:number;cash:number;jail:number;laps?:number;jailCards?:number};
export type EstateLoan={id:number;lender:string|null;borrower:string;principal:number;total:number;interest:number;dueLap:number;status:string};
export type EstateDeal={id:number;kind:string;from:string;to:string;principal?:number;interest?:number;term?:number;pay?:number;ask?:number;give?:number[];take?:number[]};
export type EstateEvent={id:number;type:'card'|'tax'|'rent'|'jail'|'loss'|'salary';side:string;title:string;reason:string;amount:number;lot:number;deck?:'chance'|'community';card?:number;creditor?:string|null;at:number};
export type PartyState={sides:string[];players:PartyPlayer[];stage:string;dice:number|null;rolls:number;round:number;property:(string|null)[];houses:number[];message:string;debt:{amount:number;creditor:string|null;reason?:string}|null;edition?:string;diceValues?:number[];mortgaged?:boolean[];bank?:{houses:number;hotels:number};loans?:EstateLoan[];pending?:EstateDeal|null;auction?:{lot:number;bid:number;leader:string|null;passed:string[];returnSide:string;history?:{side:string;action:'bid'|'pass';amount?:number;at:number}[]}|null;lastPurchase?:{lot:number;side:string;price:number;source:'buy'|'auction';at:number}|null;events?:EstateEvent[];eventSeq?:number;ledger?:{id:number;kind:string;message:string;amount:number;at:number}[];movement?:{side:string;from:number;to:number;steps:number;teleport:boolean}};
export type Difficulty = 'easy' | 'medium' | 'hard';
export type PracticeMove = { from: number | null; to: number; promotion?: string; pass?:boolean;action?:string;command?:string;details?:Record<string,unknown> };
export function moveRequest(move:PracticeMove){const {action,...rest}=move;return {...rest,...(action?{command:action}:{})};}
export type PracticePly = PracticeMove & { side: string; piece: string; captured: string | null; label: string; at: number; board: (string | null)[]; check: boolean; checkSquare: number | null; flips?:number[]; passed?:string|null;party?:PartyState;captures?:number[];effects?:{from:number;to:number;unit:string;mode:string;burnt:boolean}[];die?:number;dice?:number[] };
export type PracticeGame = {
  botEngine?:{id:string;name:string;style:string;styleName:string};
  ranked?:boolean;bot?:import('./rating-types').BotProfile;playerElo?:number;ratingChange?:import('./rating-types').RatingChange;
  id: string; kind: GameKind; difficulty: Difficulty; humanSide: string; version: number; rules: string; phase: 'playing' | 'finished';
  turn: string; board: (string | null)[]; initialBoard: (string | null)[]; moves: PracticePly[]; thinking: boolean; legal: PracticeMove[];
  check: boolean; checkSquare: number | null; createdAt: number;
  commander?:{scores:Record<string,number>;pending:unknown[]};
  party?:PartyState;initialParty?:PartyState;passes?:number;prisoners?:Record<string,number>;score?:Record<string,number>;
  result: { winner: string | null; reason: string; at: number; line: number[] } | null;
};
export type PracticeSummary = Pick<PracticeGame, 'id' | 'kind' | 'difficulty' | 'humanSide' | 'phase' | 'createdAt' | 'result' | 'ranked' | 'bot' | 'ratingChange'> & { moves: number };
export const META = {
  commander:{name:'Cờ tư lệnh',subtitle:'Hiệp đồng quân, làm chủ chiến trường.',rows:12,cols:11,first:'r',second:'b',firstName:'Quân Đỏ',secondName:'Quân Xanh',tagline:'',short:'11 × 12 · Tổng lực · 38 quân'},
  caro: { name: 'Caro', subtitle: 'Năm quân liền, một nước hay.', rows: 15, cols: 15, first: 'X', second: 'O', firstName: 'Quân X', secondName: 'Quân O', tagline: 'THÂN QUEN TỪ NHỮNG TRANG VỞ', short: '15 × 15 · Từ 5 quân trở lên' },
  chess: { name: 'Cờ vua', subtitle: 'Một vương quốc trong 64 ô cờ.', rows: 8, cols: 8, first: 'w', second: 'b', firstName: 'Quân Trắng', secondName: 'Quân Đen', tagline: 'TỪNG NƯỚC ĐI, MỘT CHIẾN LƯỢC', short: '8 × 8 · Cờ vua tiêu chuẩn' },
  xiangqi: { name: 'Cờ tướng', subtitle: 'Qua sông, bày thế, tìm nước hay.', rows: 10, cols: 9, first: 'r', second: 'b', firstName: 'Quân Đỏ', secondName: 'Quân Đen', tagline: 'MỘT BÀN CỜ, CẢ MỘT GIANG SƠN', short: '9 × 10 · Luật luyện tập' },
  reversi: { name:'Cờ lật',subtitle:'Đổi một quân, xoay cả thế cờ.',rows:8,cols:8,first:'B',second:'W',firstName:'Quân Đen',secondName:'Quân Trắng',tagline:'MỖI LẦN LẬT, MỘT THẾ CỜ MỚI',short:'8 × 8 · Kẹp và lật quân' },
  connect4: { name:'Nối bốn',subtitle:'Bốn quân nối tiếp, chiến thắng bất ngờ.',rows:6,cols:7,first:'R',second:'Y',firstName:'Quân Đỏ',secondName:'Quân Vàng',tagline:'NHỎ GỌN, NHANH VÀ ĐẦY BẤT NGỜ',short:'7 × 6 · Chọn cột, nối 4 quân' },
  go:{name:'Cờ vây',subtitle:'Vây đất, giữ khí.',rows:9,cols:9,first:'B',second:'W',firstName:'Quân Đen',secondName:'Quân Trắng',tagline:'',short:'9 × 9 · Luật diện tích · Komi 6,5'},
  ludo:{name:'Cá ngựa',subtitle:'Gieo xúc xắc, đưa quân về đích.',rows:15,cols:15,first:'R',second:'G',firstName:'Đỏ',secondName:'Xanh lá',tagline:'',short:'2–4 người · Luật Ludo'},
  monopoly:{name:'Tỷ phú Việt Nam',subtitle:'Đi qua Việt Nam, xây cơ nghiệp.',rows:13,cols:13,first:'R',second:'G',firstName:'Đỏ',secondName:'Xanh lá',tagline:'',short:'2–8 người · Tối đa 30s/lượt · 48 ô'},
  checkers:{name:'Cờ đam',subtitle:'Ăn quân, phong Vua.',rows:8,cols:8,first:'B',second:'W',firstName:'Quân Đen',secondName:'Quân Trắng',tagline:'',short:'8 × 8 · Đam Anh'},
  tictactoe:{name:'Cờ ba quân',subtitle:'Ba quân thẳng hàng.',rows:3,cols:3,first:'X',second:'O',firstName:'Quân X',secondName:'Quân O',tagline:'',short:'3 × 3 · Nối 3 quân'},
  coganh:{name:'Cờ gánh',subtitle:'Gánh đôi, vây kín, đổi phe.',rows:5,cols:5,first:'B',second:'W',firstName:'Quân Đen',secondName:'Quân Trắng',tagline:'',short:'5 × 5 · Gánh, vây và mở'},
  ataxx:{name:'Ataxx',subtitle:'Nhân quân, nhảy bước, đổi màu.',rows:7,cols:7,first:'B',second:'W',firstName:'Quân Đen',secondName:'Quân Trắng',tagline:'',short:'7 × 7 · Nhân quân và đồng hóa'},
  breakthrough:{name:'Đột phá',subtitle:'Vượt hàng cuối để thắng.',rows:8,cols:8,first:'W',second:'B',firstName:'Quân Trắng',secondName:'Quân Đen',tagline:'',short:'8 × 8 · Breakthrough'},
  loa:{name:'Liên quân',subtitle:'Kết nối tất cả quân của bạn.',rows:8,cols:8,first:'B',second:'W',firstName:'Quân Đen',secondName:'Quân Trắng',tagline:'',short:'8 × 8 · Lines of Action'},
  isolation:{name:'Cô lập',subtitle:'Đi quân, khóa đường.',rows:8,cols:8,first:'B',second:'W',firstName:'Quân Đen',secondName:'Quân Trắng',tagline:'',short:'8 × 8 · Isolation bản trượt'},
};
export const SYMBOLS:Record<GameKind,string>={caro:'× ○',chess:'♞',xiangqi:'將',reversi:'◐',connect4:'●',go:'⚫',ludo:'⚄',monopoly:'▣',checkers:'◉',tictactoe:'× ○',coganh:'◈',ataxx:'✣',breakthrough:'⇧',loa:'⬡',isolation:'▧',commander:'★'};
export const RULE_TEXT:Record<GameKind,string>={
  commander:'Tổng lực với đội hình dàn sẵn. Bàn có 132 giao điểm và mỗi bên có 19 quân thuộc 11 loại. Bên Đỏ đi trước. Ván online kết thúc khi một bên mất Tư lệnh hoặc khi hết 30 phút. Khi hết giờ, so điểm quân đã ăn. Chọn quân rồi chọn giao điểm được đánh dấu. Tùy quân và vị trí, có thể thế chỗ, bắn tại chỗ, ném bom hoặc lên quân. Tàu đi biển, ven bờ và đoạn sông sâu phía ngoài ngầm. Công binh cõng quân nặng qua nước sâu. Máy bay đi qua vòng lửa có thể bị bắn rơi. Oanh kích trong vòng lửa thì một đổi một, trừ máy bay anh hùng. Tổ hợp có thể tách ra nhiều hướng trong cùng lượt. Quân được phong anh hùng đi xa thêm một đoạn và có hướng chéo.',
  caro:'X đi trước trên bàn 15 × 15. Đặt quân vào ô trống. Từ 5 quân liên tiếp theo ngang, dọc hoặc chéo thì thắng, không xét chặn hai đầu. Kín bàn không ai thắng thì hòa.',
  chess:'Trắng đi trước. Mỗi nước phải giữ Vua an toàn. Có nhập thành, bắt tốt qua đường và chọn quân phong cấp. Chiếu hết thì thắng; hết nước không bị chiếu, thiếu lực lượng, lặp thế 3 lần hoặc luật 50 nước thì hòa tự động.',
  xiangqi:'Đỏ đi trước. Có cản chân Mã, mắt Tượng, ngòi Pháo, giới hạn cung và sông. Không được để hai Tướng lộ mặt hoặc Tướng bị chiếu. Hết nước hợp lệ thì thua. Quy ước tại Sân Cờ: lặp thế 3 lần hoặc 120 lượt không ăn quân thì hòa; chưa phân xử chiếu dai/đuổi dai theo luật giải đấu.',
  reversi:'Đen đi trước. Đặt quân để kẹp ít nhất một quân đối phương giữa quân mới và quân của mình theo ngang, dọc hoặc chéo; tất cả quân bị kẹp đều được lật. Hết nước hợp lệ tự động bỏ lượt. Khi cả hai hết nước, bên nhiều quân hơn thắng; bằng nhau thì hòa.',
  connect4:'Đỏ đi trước trên lưới 7 cột, 6 hàng. Chọn một cột; quân rơi vào vị trí thấp nhất còn trống. Nối 4 quân ngang, dọc hoặc chéo để thắng.',
  go:'Bàn 9×9, Đen đi trước. Bắt chuỗi quân hết khí; cấm tự sát và lặp lại bất kỳ thế bàn cũ (superko theo vị trí). Hai lần bỏ lượt liên tiếp kết thúc. Đếm quân và vùng trống chỉ giáp một bên, Trắng cộng 6,5 komi. Chưa có đánh dấu quân chết/thỏa thuận điểm: cần dọn quân chết trước khi cả hai bỏ lượt. Bot nội bộ để làm quen, không phải AI thi đấu.',
  ludo:'Biến thể Ludo 2–4 người, mỗi bên 4 quân. Gieo 6 để xuất chuồng và được thêm lượt. Đi vòng 52 ô rồi vào đường về 6 ô; phải đủ số để về đích. Đá quân đối phương về chuồng, trừ 8 ô an toàn đánh dấu sao. Không áp dụng chặn đường hoặc phạt ba lần 6. Ai đưa cả 4 quân về đích trước thắng. Xúc xắc do máy chủ gieo.',
  monopoly:'Bản Việt Nam riêng của Sân Cờ: 48 ô gồm đủ 34 tỉnh/thành, 2–8 người, vốn 3.000 triệu tiền game, qua Xuất phát nhận 400. Gieo 2 xúc xắc; có đôi được thêm lượt, 3 đôi liên tiếp vào tù. Tù tối đa 3 lượt, trả 100 hoặc dùng thẻ để ra. Khi dừng trên đất trống có thể mua ngay, mở đấu giá cho cả phòng hoặc bỏ qua để kết thúc lượt ngay; nếu đấu giá không có ai mua thì cũng bỏ qua lượt luôn. Thuê ga theo số ga sở hữu, tiện ích theo tổng xúc xắc. Đủ nhóm màu, không thế chấp được xây đều tối đa 4 nhà và 1 khách sạn; kho 64 nhà, 16 khách sạn (bàn 5–8 người: 96 nhà, 24 khách sạn). Thế chấp nhận 50% giá đất và ngừng thu thuê; chuộc trả 55%. Bán công trình/đất cho ngân hàng giá 50%. Trao đổi tiền và nhiều đất phải được người nhận đồng ý; đất trao đổi không có thế chấp/công trình trong nhóm. Có tặng tiền và cho vay: 50–2.000 triệu, lãi cố định 0–20%, kỳ hạn 1–5 lần người vay qua Xuất phát, có thể trả sớm đủ cả gốc/lãi. Đến hạn tự thu, thiếu tiền phải xử lý tài sản hoặc phá sản. Người cuối còn chơi thắng; không kết thúc sau 30 vòng. Khi đấu giá hoặc chờ hợp đồng, đồng hồ chạy theo người đang phải phản hồi. Mọi tiền, giá đất và hợp đồng chỉ trong ván chơi.',
  checkers:'Đam Anh 8×8, Đen đi trước. Quân thường đi chéo tiến một ô, nhảy qua một quân đối phương để ăn. Có nước ăn thì bắt buộc ăn; tiếp tục ăn bằng cùng quân đến khi hết nước. Quân thường không ăn lùi. Đến hàng cuối phong Vua và kết thúc lượt; Vua đi/ăn cả hai hướng, mỗi bước một ô. Hết nước hợp lệ thì thua; 80 lượt không ăn/phong Vua thì hòa.',
  tictactoe:'X đi trước trên bàn 3×3. Lần lượt đặt một quân vào ô trống. Nối 3 quân ngang, dọc hoặc chéo để thắng; kín bàn không ai thắng thì hòa.',
  coganh:'Đen đi trước, mỗi bên 8 quân trên 25 giao điểm. Đi một bước theo đường kẻ đến điểm trống. Gánh: sau khi đi, hai quân địch đối xứng qua quân vừa đi bị đổi phe. Vây: cả nhóm quân địch không còn điểm trống kề bị đổi phe. Có luật Mở: sau nước không bắt, nếu đối phương có thể vào điểm vừa bỏ trống để gánh thì bắt buộc đi vào đó. Đổi phe hết quân hoặc khiến đối phương hết nước thì thắng. Lặp thế ba lần hòa.',
  ataxx:'Bàn 7×7, Đen đi trước. Chọn quân rồi chọn ô trống: cách một ô thì nhân thêm quân, cách hai ô thì nhảy và bỏ vị trí cũ; tính cả đường chéo. Tất cả quân địch ở 8 ô sát đích đổi màu. Hết nước tự bỏ lượt. Khi cả hai hết nước, bên nhiều quân hơn thắng; hết quân thua. 100 thao tác nhảy liên tiếp không nhân hay đổi màu, hoặc lặp thế ba lần, thì hòa.',
  breakthrough:'Trắng đi trước, mỗi bên 16 quân ở hai hàng đầu. Đi một ô thẳng tiến hoặc chéo tiến tới ô trống; chỉ ăn quân bằng chéo tiến, không bắt buộc ăn. Không đi lùi hay nhảy hai ô. Đưa bất kỳ quân nào đến hàng cuối đối phương trước thì thắng. Hết quân hoặc hết nước thì thua.',
  loa:'Đen đi trước trên bàn 8×8. Quân đi ngang, dọc hoặc chéo đúng số ô bằng tổng số quân hai màu trên toàn bộ đường đó. Có thể nhảy qua quân mình, không qua quân địch; được ăn quân địch ở đích. Kết nối tất cả quân mình thành một nhóm, kể cả tiếp xúc chéo, để thắng. Một quân là một nhóm. Khi một nước nối cả hai bên, người vừa đi thắng theo luật tại đây. Hết nước tự bỏ lượt; lặp thế ba lần hòa.',
  isolation:'Bản trượt 8×8: Đen đi trước, mỗi bên một quân ở hai góc đối diện. Quân đi như Hậu: trượt ngang, dọc hoặc chéo qua các ô trống. Ô vừa rời bị khóa vĩnh viễn; không được đi qua hoặc dừng trên ô khóa hay quân khác. Người không còn nước đi khi đến lượt thua.'
};
export function sideSymbol(kind:GameKind,side:string){return kind==='commander'?(side==='r'?'🔴':'🔵'):kind==='caro'||kind==='tictactoe'?side:kind==='chess'?side==='w'?'♔':'♚':kind==='xiangqi'?side==='r'?'帥':'將':side==='B'?'●':side==='W'?'○':side==='R'?'🔴':side==='G'?'🟢':'🟡';}
export function previewBoard(kind:GameKind):(string|null)[]{
  if(kind==='commander')return commanderPreview();
  const {cols,rows}=META[kind],board:(string|null)[]=Array(cols*rows).fill(null);
  if(kind==='reversi'){board[27]='W';board[28]='B';board[35]='B';board[36]='W';}
  else if(kind==='ataxx'){board[0]=board[48]='B';board[6]=board[42]='W';}
  else if(kind==='breakthrough'){for(let i=0;i<16;i++){board[i]='B';board[63-i]='W';}}
  else if(kind==='loa'){for(let i=1;i<7;i++){board[i]=board[56+i]='B';board[i*8]=board[i*8+7]='W';}}
  else if(kind==='isolation'){board[0]='B';board[63]='W';}
  else if(kind==='coganh'){for(const i of[20,21,22,23,24,15,19,14])board[i]='B';for(const i of[0,1,2,3,4,5,9,10])board[i]='W';}
  else if(kind==='checkers'){for(let r=0;r<8;r++)for(let c=0;c<8;c++)if((r+c)%2&&(r<3||r>4))board[r*8+c]=(r<3?'W':'B')+'M';}
  else if(kind==='chess'||kind==='xiangqi'){
    const back=kind==='chess'?['R','N','B','Q','K','B','N','R']:['R','N','B','A','K','A','B','N','R'];
    for(let c=0;c<cols;c++){board[c]='b'+back[c];board[(rows-1)*cols+c]=(kind==='chess'?'w':'r')+back[c];}
    if(kind==='chess')for(let c=0;c<8;c++){board[8+c]='bP';board[48+c]='wP';}
    else{for(const c of[1,7]){board[18+c]='bC';board[63+c]='rC';}for(const c of[0,2,4,6,8]){board[27+c]='bP';board[54+c]='rP';}}
  }
  return board;
}
export const LEVELS: Record<Difficulty, { name: string; description: string }> = { easy: { name: 'Dễ', description: 'Làm quen, thử những nước đầu.' }, medium: { name: 'Vừa', description: 'Một đối thủ để cùng tiến bộ.' }, hard: { name: 'Khá', description: 'Suy nghĩ kỹ hơn trước mỗi nước.' } };
export const X_LABELS: Record<string, string> = { rK: '帥', bK: '將', rA: '仕', bA: '士', rB: '相', bB: '象', rN: '馬', bN: '馬', rR: '俥', bR: '車', rC: '炮', bC: '砲', rP: '兵', bP: '卒' };
export const X_NAMES: Record<string, string> = { K: 'Tướng', A: 'Sĩ', B: 'Tượng', N: 'Mã', R: 'Xe', C: 'Pháo', P: 'Tốt' };
export const CHESS_LABELS: Record<string, string> = { wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙', bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟' };
export const CHESS_NAMES: Record<string, string> = { K: 'Vua', Q: 'Hậu', R: 'Xe', B: 'Tượng', N: 'Mã', P: 'Tốt' };
export function squareName(kind: GameKind, index: number) { const m = META[kind]; if(kind==='commander')return `${11-Math.floor(index/11)},${index%11}`; return index<0?'Bỏ lượt':`${(kind==='go'?'ABCDEFGHJ':'ABCDEFGHIJKLMNO')[index % m.cols]}${kind === 'caro' ? Math.floor(index / m.cols) + 1 : m.rows - Math.floor(index / m.cols)}`; }
export function pieceName(kind: GameKind, piece: string | null) { if(kind==='commander')return piece?`${commanderName(piece)} ${piece[0]==='r'?'Đỏ':'Xanh'}`:'Giao điểm trống';if(piece==='#')return 'Ô đã khóa';if(ABSTRACT_KINDS.includes(kind))return !piece?'Ô trống':piece==='B'?'Quân Đen':'Quân Trắng'; return !piece ? 'Ô trống' : kind==='checkers'?`${piece[1]==='K'?'Vua':'Quân'} ${piece[0]==='B'?'Đen':'Trắng'}`:isPlacement(kind)?kind==='caro'||kind==='tictactoe'?`Quân ${piece}`:piece===META[kind].first?META[kind].firstName:META[kind].secondName : `${kind === 'chess' ? CHESS_NAMES[piece[1]] : X_NAMES[piece[1]]} ${piece[0] === META[kind].first ? kind === 'chess' ? 'Trắng' : 'Đỏ' : 'Đen'}`; }
