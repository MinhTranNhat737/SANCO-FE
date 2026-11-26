import { t } from './language.ts';
import {estateModePreview} from './estate-rules';
export default function EstateModePicker({count,value,onChange}:{count:number;value:'auto'|'classic';onChange:(value:'auto'|'classic')=>void}){
  const mode=estateModePreview(count,value);
  return <div className="estate-mode-picker"><label>{t('Luật Tỷ phú')}<select aria-label={t('Luật Tỷ phú')} value={value} onChange={event=>onChange(event.target.value as 'auto'|'classic')}><option value="auto">{t('Sáng tạo · Chơi đến khi hết tiền, xây nhà cả dãy')}</option><option value="classic">{t('Cổ điển · Chơi đến người cuối cùng')}</option></select></label><div className="estate-mode-preview"><strong>{mode.name}</strong><p>{mode.description}</p><small>{t('Vốn khởi điểm 3.000 triệu · Gom đủ 1 dãy ô màu sẽ được xây nhà đồng loạt cả dãy.')}</small></div></div>;
}
