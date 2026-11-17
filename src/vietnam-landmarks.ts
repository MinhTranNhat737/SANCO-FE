export type LandmarkKind =
  | 'hanoi' | 'hcm' | 'hue' | 'danang' | 'halong' | 'fansipan' | 'ninhbinh'
  | 'camau' | 'cantho' | 'dienbien' | 'haiphong' | 'nhatrang' | 'dalat'
  | 'tea' | 'coffee' | 'lotus' | 'cave' | 'mountain' | 'temple' | 'beach'
  | 'fruit' | 'rice' | 'bridge' | 'island';

export interface ProvinceLandmark {
  title: string;
  kind: LandmarkKind;
  accent: string;
}

export const PROVINCE_LANDMARKS: Record<string, ProvinceLandmark> = {
  'Lai Châu':      { title: 'Đỉnh Pu Ta Leng · Đồi chè', kind: 'mountain', accent: '#2f6b4f' },
  'Điện Biên':     { title: 'Đồi A1 · Hoa Ban trắng', kind: 'dienbien', accent: '#9e3b2e' },
  'Sơn La':        { title: 'Cao nguyên Mộc Châu', kind: 'tea', accent: '#3d7a52' },
  'Cao Bằng':      { title: 'Thác Bản Giốc', kind: 'mountain', accent: '#2d757a' },
  'Lạng Sơn':      { title: 'Thành nhà Mạc · Na Chi Lăng', kind: 'temple', accent: '#7a5a32' },
  'Tuyên Quang':   { title: 'Khu di tích Tân Trào', kind: 'temple', accent: '#3b6b47' },
  'Lào Cai':       { title: 'Đỉnh Fansipan · Ruộng bậc thang', kind: 'fansipan', accent: '#36688a' },
  'Thái Nguyên':   { title: 'Đồi chè Tân Cương', kind: 'tea', accent: '#2e7044' },
  'Phú Thọ':       { title: 'Đền Hùng · Đất Tổ', kind: 'temple', accent: '#9c4b32' },
  'Bắc Ninh':      { title: 'Dân ca Quan họ · Chùa Dâu', kind: 'temple', accent: '#8c4238' },
  'Hưng Yên':      { title: 'Nhãn lồng Phố Hiến', kind: 'fruit', accent: '#b87628' },
  'Ninh Bình':     { title: 'Quần thể Tràng An · Hang Múa', kind: 'ninhbinh', accent: '#2d6b56' },
  'Quảng Ninh':    { title: 'Vịnh Hạ Long · Hòn Trống Mái', kind: 'halong', accent: '#1d6978' },
  'Thanh Hóa':     { title: 'Thành nhà Hồ · Cầu Hàm Rồng', kind: 'bridge', accent: '#70603c' },
  'Nghệ An':       { title: 'Làng Sen Kim Liên', kind: 'lotus', accent: '#b84a62' },
  'Hà Tĩnh':       { title: 'Núi Hồng Lĩnh · Kẹo Cu Đơ', kind: 'mountain', accent: '#446b4b' },
  'Quảng Trị':     { title: 'Động Phong Nha · Thành cổ', kind: 'cave', accent: '#2a6b6e' },
  'Huế':           { title: 'Kinh thành Huế · Chùa Thiên Mụ', kind: 'hue', accent: '#7a3b6e' },
  'Đà Nẵng':       { title: 'Cầu Rồng · Cầu Vàng Bà Nà', kind: 'danang', accent: '#c98a22' },
  'Quảng Ngãi':    { title: 'Đảo Lý Sơn · Tỏi Lý Sơn', kind: 'island', accent: '#266e85' },
  'Gia Lai':       { title: 'Biển Hồ Pleiku · Nhà Rông', kind: 'mountain', accent: '#8c5332' },
  'Đắk Lắk':       { title: 'Cà phê Buôn Ma Thuột', kind: 'coffee', accent: '#6b3e26' },
  'Khánh Hòa':     { title: 'Tháp Trầm Hương · Vịnh Nha Trang', kind: 'nhatrang', accent: '#1c7894' },
  'Lâm Đồng':      { title: 'Đà Lạt ngàn hoa · Hồ Xuân Hương', kind: 'dalat', accent: '#2f7048' },
  'Đồng Nai':      { title: 'Vườn Quốc gia Cát Tiên', kind: 'tea', accent: '#366e46' },
  'Tây Ninh':      { title: 'Núi Bà Đen · Tòa Thánh', kind: 'fansipan', accent: '#5a5e85' },
  'Vĩnh Long':     { title: 'Vườn cây trái · Cù lao An Bình', kind: 'fruit', accent: '#3d7a3c' },
  'Đồng Tháp':     { title: 'Đồng sen Tháp Mười', kind: 'lotus', accent: '#c25270' },
  'An Giang':      { title: 'Rừng tràm Trà Sư · Núi Cấm', kind: 'rice', accent: '#4d7a36' },
  'Cà Mau':        { title: 'Mũi Cà Mau · Cực Nam Tổ quốc', kind: 'camau', accent: '#9e442c' },
  'Cần Thơ':       { title: 'Chợ nổi Cái Răng · Bến Ninh Kiều', kind: 'cantho', accent: '#2c757a' },
  'Hải Phòng':     { title: 'Cảng Hải Phòng · Hoa Phượng đỏ', kind: 'haiphong', accent: '#b8392e' },
  'Hà Nội':        { title: 'Hồ Gươm · Tháp Rùa · Văn Miếu', kind: 'hanoi', accent: '#b3362b' },
  'TP. Hồ Chí Minh': { title: 'Chợ Bến Thành · Landmark 81', kind: 'hcm', accent: '#b58424' }
};
