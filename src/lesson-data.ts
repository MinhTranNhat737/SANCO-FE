import {META,previewBoard} from './practice-types.ts';

export type LessonKind = 'chess' | 'xiangqi';
type LessonMove = {from:string;to:string;label:string;note:string;rook?:[string,string];check?:string};
export type Lesson = {
  id:string; title:string; theme:string; summary:string; tip:string; task:string;
  position?:Record<string,string>; moves:LessonMove[]; ending?:'mate';
};

export const LESSONS:Record<LessonKind,Lesson[]> = {
  chess:[
    {
      id:'khai-cuoc',title:'Mở trung tâm, đưa quân ra',theme:'Khai cuộc',
      summary:'Đưa Tốt vào trung tâm, phát triển Mã và Tượng rồi nhập thành để bảo vệ Vua.',
      tip:'Khi chưa có mục tiêu cụ thể, ưu tiên phát triển một quân còn ở hàng đầu. Giữ đường nhập thành thông thoáng.',
      task:'Thử đẩy Tốt e2 lên e4 để bắt đầu.',
      moves:[
        {from:'e2',to:'e4',label:'e4',note:'Tốt Trắng chiếm trung tâm và mở đường cho Tượng f1.'},
        {from:'e7',to:'e5',label:'…e5',note:'Đen đáp lại bằng cách chiếm ô trung tâm tương ứng.'},
        {from:'g1',to:'f3',label:'Mf3',note:'Mã Trắng ra quân và tấn công Tốt e5.'},
        {from:'b8',to:'c6',label:'…Mc6',note:'Mã Đen phát triển và bảo vệ Tốt e5.'},
        {from:'f1',to:'c4',label:'Tc4',note:'Tượng phát triển, hướng về f7 và dọn đường nhập thành.'},
        {from:'f8',to:'c5',label:'…Tc5',note:'Đen cũng đưa Tượng ra để chuẩn bị nhập thành.'},
        {from:'e1',to:'g1',rook:['h1','f1'],label:'O-O',note:'Trắng nhập thành ngắn. Vua sang g1 và Xe sang f1.'},
      ],
    },
    {
      id:'ma-chia-nia',title:'Mã chĩa nĩa Vua và Hậu',theme:'Chiến thuật',
      summary:'Mã dùng một nước để đe dọa hai mục tiêu. Khi một trong hai là Vua, đối thủ phải xử lý chiếu trước.',
      tip:'Nhìn các ô Mã có thể nhảy tới và kiểm tra xem từ đó Mã có chiếu Vua đồng thời đánh quân giá trị cao hay không.',
      task:'Tìm một nước Mã vừa chiếu Vua vừa tấn công Hậu.',
      position:{g1:'wK',e5:'wN',h8:'bK',d8:'bQ'},
      moves:[
        {from:'e5',to:'f7',check:'h8',label:'Mf7+',note:'Từ f7, Mã chiếu Vua h8 và đồng thời tấn công Hậu d8.'},
        {from:'h8',to:'g8',label:'…Vg8',note:'Vua Đen rời ô bị chiếu. Hậu d8 vẫn nằm trong tầm Mã.'},
        {from:'f7',to:'d8',label:'Mxd8',note:'Mã ăn Hậu, hoàn thành đòn chĩa nĩa.'},
      ],
    },
    {
      id:'ghim-quan',title:'Ghim Mã trước Vua',theme:'Chiến thuật',
      summary:'Xe Trắng và Vua Đen cùng cột e. Mã Đen ở e7 che đường chiếu nên không thể rời ô.',
      tip:'Trước khi ăn quân bị ghim, kiểm tra ô đích có được bảo vệ hay đối thủ có thể bắt lại.',
      task:'Tìm cách ăn Mã e7 khiến Vua Đen không thể bắt lại.',
      position:{g1:'wK',e1:'wR',b4:'wB',e8:'bK',e7:'bN'},
      moves:[{from:'e1',to:'e7',check:'e8',label:'Xxe7+',note:'Xe ăn Mã và chiếu Vua. Tượng b4 bảo vệ e7 nên Vua Đen không được bắt Xe.'}],
    },
    {
      id:'chieu-het-hang-cuoi',title:'Chiếu hết ở hàng cuối',theme:'Kết liễu',
      summary:'Vua Đen bị ba Tốt của chính mình che lối thoát. Xe Trắng chỉ cần chiếm hàng 8.',
      tip:'Khi Vua đứng sau hàng Tốt, đừng bỏ qua các nước Xe hoặc Hậu chiếu dọc hàng cuối.',
      task:'Tìm nước chiếu hết trong một nước.',
      position:{g1:'wK',a1:'wR',g8:'bK',f7:'bP',g7:'bP',h7:'bP'},
      moves:[{from:'a1',to:'a8',check:'g8',label:'Xa8#',note:'Xe khống chế hàng 8. Vua Đen không có ô thoát, không thể chặn và không thể bắt Xe.'}],
      ending:'mate',
    },
  ],
  xiangqi:[
    {
      id:'phao-dau',title:'Pháo đầu và Mã giữ trung lộ',theme:'Khai cuộc',
      summary:'Đưa Pháo vào trung lộ để gây sức ép lên Tốt giữa. Sau đó lên Mã và mở đường cho Xe.',
      tip:'Đánh Pháo đầu không có nghĩa phải ăn Tốt ngay. Phát triển Mã và Xe trước khi bước vào trao đổi.',
      task:'Đưa Pháo từ H3 sang E3. Tọa độ theo chữ và số trên bàn.',
      moves:[
        {from:'H3',to:'E3',label:'Pháo H3–E3',note:'Pháo vào cột giữa. Tốt Đỏ E4 đang làm ngòi để Pháo gây sức ép lên Tốt Đen E7.'},
        {from:'H10',to:'G8',label:'…Mã H10–G8',note:'Đen lên Mã, từ G8 Mã có thể kiểm soát E7 nếu chân Mã thông thoáng.'},
        {from:'H1',to:'G3',label:'Mã H1–G3',note:'Đỏ phát triển Mã và giải phóng H1 cho Xe.'},
        {from:'B10',to:'C8',label:'…Mã B10–C8',note:'Đen phát triển Mã còn lại và chuẩn bị ra Xe.'},
        {from:'I1',to:'H1',label:'Xe I1–H1',note:'Xe vào cột H, nơi Pháo và Mã đã rời đi.'},
      ],
    },
    {
      id:'chan-ma',title:'Nhìn chân Mã trước khi đi',theme:'Thế quân',
      summary:'Một quân ngay sát Mã theo hướng đi thẳng sẽ chặn các nước Mã đi về phía đó.',
      tip:'Từ E4 lên F6 phải qua chân E5. Sang G5 phải qua chân F4. Hãy kiểm tra chân Mã trước khi nhìn điểm đến.',
      task:'Tốt Đỏ E5 đang cản Mã. Hãy thử nước sang G5 qua chân F4.',
      position:{E1:'rK',D10:'bK',E4:'rN',E5:'rP'},
      moves:[{from:'E4',to:'G5',label:'Mã E4–G5',note:'F4 trống nên Mã đi được đến G5. Mã không thể lên F6 qua chân E5 đang bị chặn.'}],
    },
    {
      id:'ngoi-phao',title:'Dùng ngòi để bắt Xe',theme:'Chiến thuật',
      summary:'Pháo đi thẳng qua các điểm trống. Khi ăn quân, Pháo phải nhảy qua đúng một quân trên đường đi.',
      tip:'Ngòi có thể là quân của bất kỳ bên nào. Ở đây, Tốt Đỏ E5 là ngòi duy nhất giữa Pháo E3 và Xe Đen E8.',
      task:'Dùng Pháo E3 ăn Xe Đen E8.',
      position:{D1:'rK',F10:'bK',E3:'rC',E5:'rP',E8:'bR'},
      moves:[{from:'E3',to:'E8',label:'Pháo E3×E8',note:'Pháo vượt đúng một ngòi ở E5 và bắt Xe ở E8. Tốt làm ngòi vẫn ở nguyên vị trí.'}],
    },
    {
      id:'xe-ma-bo-cung',title:'Xe và Mã bó cung',theme:'Kết liễu',
      summary:'Xe đánh ngang hàng cuối, Mã khóa cửa cung và Tướng Đỏ ngăn Tướng Đen bắt Xe.',
      tip:'Hai Tướng không được đối mặt trên cùng cột nếu giữa chúng không có quân. Ở thế này luật đó bảo vệ Xe khi Xe lên D10.',
      task:'Tìm một nước Xe chiếu hết Tướng Đen.',
      position:{D1:'rK',E10:'bK',D9:'rR',G8:'rN'},
      moves:[{from:'D9',to:'D10',check:'E10',label:'Xe D9–D10',note:'Xe giữ hàng 10, Mã G8 giữ E9. Bắt Xe ở D10 sẽ để hai Tướng đối mặt nên Đen hết cách đỡ.'}],
      ending:'mate',
    },
  ],
};

export function lessonSquare(kind:LessonKind,coordinate:string){
  const {cols,rows}=META[kind];
  return (rows-Number(coordinate.slice(1)))*cols+coordinate.toUpperCase().charCodeAt(0)-65;
}

export function lessonFrames(kind:LessonKind,lesson:Lesson){
  const board=previewBoard(kind);
  if(lesson.position){
    board.fill(null);
    for(const [square,piece] of Object.entries(lesson.position))board[lessonSquare(kind,square)]=piece;
  }
  return lesson.moves.reduce<(string|null)[][]>((frames,move)=>{
    const next=[...frames.at(-1)!];
    const transfer=(from:string,to:string)=>{
      const source=lessonSquare(kind,from),target=lessonSquare(kind,to);
      next[target]=next[source];next[source]=null;
    };
    transfer(move.from,move.to);
    if(move.rook)transfer(...move.rook);
    frames.push(next);
    return frames;
  },[board]);
}
