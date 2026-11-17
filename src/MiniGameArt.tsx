import {previewBoard,META,type GameKind} from './practice-types';

export default function MiniGameArt({kind,className=''}:{kind:GameKind;className?:string}){
  const {cols}=META[kind],board=previewBoard(kind),cell=124/cols;
  return <svg className={`game-emblem mini-game-art art-${kind} ${className}`} viewBox="0 0 160 160" aria-hidden="true" focusable="false">
    <rect x="8" y="8" width="144" height="144" fill={kind==='coganh'?'#cbb389':kind==='ataxx'?'#32686a':kind==='isolation'?'#555570':'#416551'}/>
    <rect x="15" y="15" width="130" height="130" fill={kind==='coganh'?'#efdfb7':'#c5d2b8'} stroke="#112f26" strokeWidth="2"/>
    {kind==='coganh'?<g fill="none" stroke="#665234" strokeWidth="1.5">{Array.from({length:5},(_,i)=><path key={i} d={`M${30+i*25} 30V130M30 ${30+i*25}H130`}/>)}<path d="M30 30L130 130M130 30L30 130M80 30L130 80L80 130L30 80Z"/></g>:
      board.map((_,i)=><rect key={i} x={18+i%cols*cell} y={18+Math.floor(i/cols)*cell} width={cell} height={cell} fill={(Math.floor(i/cols)+i%cols)%2?'#618272':'#dce3c9'} stroke="#33564b" strokeWidth=".5"/>)}
    {board.map((piece,i)=>piece&&<g key={i}>
      <circle cx={kind==='coganh'?30+i%5*25:18+(i%cols+.5)*cell} cy={kind==='coganh'?30+Math.floor(i/5)*25:18+(Math.floor(i/cols)+.5)*cell+1.5} r={kind==='coganh'?9:cell*.34} fill="#0b211e55"/>
      <circle cx={kind==='coganh'?30+i%5*25:18+(i%cols+.5)*cell} cy={kind==='coganh'?30+Math.floor(i/5)*25:18+(Math.floor(i/cols)+.5)*cell} r={kind==='coganh'?8.5:cell*.33} fill={piece==='B'?'#162d2b':'#fff6da'} stroke={piece==='B'?'#7d9b8c':'#8e7d50'} strokeWidth="1.4"/>
    </g>)}
    {kind==='ataxx'&&<path d="M61 80H99M80 61V99" stroke="#f4eac3" strokeWidth="6"/>}
    {kind==='breakthrough'&&<path d="M64 89L80 68L96 89M80 70V105" fill="none" stroke="#ad4d2f" strokeWidth="5"/>}
    {kind==='loa'&&<path d="M58 68L80 56L102 68V93L80 105L58 93Z" fill="none" stroke="#ad4d2f" strokeWidth="4"/>}
    {kind==='isolation'&&<g fill="#343b50" stroke="#c9d4cf" strokeWidth="1">{[18,27,28,36,37].map(i=><rect key={i} x={18+i%8*cell+1} y={18+Math.floor(i/8)*cell+1} width={cell-2} height={cell-2}/>)}</g>}
  </svg>;
}
