import {Award,Crown,Flame,Gem,Shield,ShieldCheck,Sparkles,Star} from 'lucide-react';

const badges={
  'Đồng':{color:'bronze',icon:Shield},
  'Bạc':{color:'silver',icon:ShieldCheck},
  'Vàng':{color:'gold',icon:Star},
  'Bạch kim':{color:'platinum',icon:Award},
  'Kim cương':{color:'diamond',icon:Gem},
  'Cao thủ':{color:'master',icon:Crown},
  'Đại cao thủ':{color:'grandmaster',icon:Flame},
};

export default function RankBadge({rank,small=false}:{rank?:string;small?:boolean}){
  const {icon:Icon,color}=badges[rank as keyof typeof badges]??{color:'unrated',icon:Sparkles};
  return <span aria-hidden="true" className={`rank-badge rank-badge-${color}${small?' rank-badge-small':''}`}><Icon size={small?14:22} strokeWidth={1.8}/></span>;
}
