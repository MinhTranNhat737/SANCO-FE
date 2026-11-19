import {estateModePreview} from './estate-rules';
export default function EstateModePicker({count,value,onChange}:{count:number;value:'auto'|'classic';onChange:(value:'auto'|'classic')=>void}){
  const mode=estateModePreview(count,value);
  return <div className="estate-mode-picker"><label>Luật Tỷ phú<select aria-label="Luật Tỷ phú" value={value} onChange={event=>onChange(event.target.value as 'auto'|'classic')}><option value="auto">Sáng tạo · Tự điều chỉnh theo số người</option><option value="classic">Cổ điển · Chơi đến người cuối cùng</option></select></label><div className="estate-mode-preview"><strong>{mode.name}</strong><p>{mode.description}</p><small>Đất khởi nghiệp được trừ vốn đúng giá. Nếu bắt đầu khi chưa đầy phòng, luật sẽ tính theo số người thực tế.</small></div></div>;
}
