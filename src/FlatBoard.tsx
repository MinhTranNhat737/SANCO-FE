import {useBoardTheme} from './BoardAppearance';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {META,CHESS_LABELS,X_LABELS,squareName,pieceName,type GameKind,type PracticeMove} from './practice-types';
import {playMoveSound} from './sound-effects';
import './xiangqi.css';
import './abstract.css';
import CommanderPiece from './CommanderPiece';

export default function FlatBoard({kind,board,selected,targets,last,checkSquare,winning=[],flipped,enabled,onSquare}:{kind:GameKind;board:(string|null)[];selected:number|null;targets:number[];last:PracticeMove|null;checkSquare:number|null;winning?:number[];flipped:boolean;enabled:boolean;onSquare:(index:number)=>void}){
  const [boardTheme]=useBoardTheme();
  const meta=META[kind],ref=useRef<HTMLDivElement>(null),[focus,setFocus]=useState(0);
  const lastKey=last?`${kind}:${last.from}:${last.to}:${last.action||''}`:'';
  const prevKeyRef=useRef(lastKey);
  const prevBoardRef=useRef<(string|null)[]>(board);
  useEffect(()=>{
    const prevBoard=prevBoardRef.current;
    prevBoardRef.current=board;
    if(!lastKey||lastKey===prevKeyRef.current){prevKeyRef.current=lastKey;return;}
    prevKeyRef.current=lastKey;
    if(!last)return;
    const prevCount=prevBoard.filter(Boolean).length,nextCount=board.filter(Boolean).length;
    const hadTargetPiece=Boolean(prevBoard[last.to]&&prevBoard[last.to]!=='#');
    const captured=hadTargetPiece||nextCount<prevCount;
    playMoveSound(kind,{
      from:last.from??undefined,
      to:last.to,
      action:last.action,
      piece:(board[last.to]??(last.from!==null?prevBoard[last.from]:null))||undefined,
      captures:captured?[last.to]:[],
      check:checkSquare!==null
    });
  },[lastKey,kind,board,last,checkSquare]);
  return <div data-board-theme={boardTheme} className={`practice-flat-board flat-${kind}`} ref={ref} role="grid" aria-label={`Bàn ${meta.name} ${meta.cols} cột ${meta.rows} hàng`} style={{'--columns':meta.cols} as CSSProperties}>
    {kind==='commander'&&<svg className="flat-go-lines ctl-terrain" viewBox="0 0 11 12" aria-hidden="true"><g transform={flipped?'rotate(180 5.5 6)':undefined}>
      <rect width="2.5" height="12" fill="var(--ctl-sea)"/><rect x="2.5" y="5.5" width="8.5" height="1" fill="var(--ctl-river)"/>
      <g fill="#b6ad72" stroke="#716b40" strokeWidth=".03">{[5,7].map(c=><rect key={c} x={c+.29} y="5.48" width=".42" height="1.04"/>)}</g>
      <g stroke="var(--ctl-ink)" strokeWidth=".018" opacity=".7">{Array.from({length:12},(_,i)=><path key={`r${i}`} d={`M.5 ${i+.5}H10.5`}/>)}{Array.from({length:11},(_,i)=><path key={`c${i}`} d={i<3?`M${i+.5} .5V11.5`:`M${i+.5} .5V5.5M${i+.5} 6.5V11.5`}/>)}</g>
      <path d="M2.5 .5V11.5" stroke="var(--ctl-ink)" strokeWidth=".05"/>
    </g></svg>}
    {kind==='coganh'&&<svg className="flat-go-lines" viewBox="0 0 5 5" aria-hidden="true"><g stroke="var(--board-ink)" strokeWidth=".03" fill="none">{Array.from({length:5},(_,i)=><path key={i} d={`M${i+.5} .5V4.5M.5 ${i+.5}H4.5`}/>)}<path d="M.5 .5L4.5 4.5M4.5 .5L.5 4.5M2.5 .5L4.5 2.5L2.5 4.5L.5 2.5Z"/></g></svg>}
    {kind==='go'&&<svg className="flat-go-lines" viewBox="0 0 9 9" aria-hidden="true" preserveAspectRatio="xMidYMid meet"><g stroke="var(--board-ink, #4b5135)" strokeWidth=".025">{Array.from({length:9},(_,i)=><g key={i}><line x1={i+.5} y1=".5" x2={i+.5} y2="8.5"/><line x1=".5" y1={i+.5} x2="8.5" y2={i+.5}/></g>)}</g>{[[2,2],[2,6],[6,2],[6,6],[4,4]].map(([r,c])=><circle key={r+':'+c} cx={c+.5} cy={r+.5} r=".065" fill="var(--board-ink, #4b5135)"/>)}</svg>}
    {kind==='xiangqi'&&<svg className="flat-xiangqi-lines" viewBox="0 0 9 10" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <rect x=".5" y="4.5" width="8" height="1" fill="var(--board-river, #ead4aa)"/>
      <g fill="var(--board-palace, #edd4a2)"><rect x="3.5" y=".5" width="2" height="2"/><rect x="3.5" y="7.5" width="2" height="2"/></g>
      <g stroke="var(--board-ink, #493322)" strokeWidth=".035" strokeLinecap="square" fill="none">{Array.from({length:10},(_,r)=><line key={r} x1=".5" y1={r+.5} x2="8.5" y2={r+.5}/>)}{Array.from({length:9},(_,c)=><g key={c}>{c===0||c===8?<line x1={c+.5} y1=".5" x2={c+.5} y2="9.5"/>:<><line x1={c+.5} y1=".5" x2={c+.5} y2="4.5"/><line x1={c+.5} y1="5.5" x2={c+.5} y2="9.5"/></>}</g>)}<path d="M3.5 .5L5.5 2.5M5.5 .5L3.5 2.5M3.5 7.5L5.5 9.5M5.5 7.5L3.5 9.5"/>
        {[[2,1],[2,7],[7,1],[7,7],[3,0],[3,2],[3,4],[3,6],[3,8],[6,0],[6,2],[6,4],[6,6],[6,8]].map(([r,c])=><g key={`${r}-${c}`}>{[-1,1].filter(sign=>c+sign>=0&&c+sign<=8).map(sign=><path key={sign} d={`M${c+.5+sign*.17} ${r+.5-.07}h${-sign*.1}v-.1M${c+.5+sign*.17} ${r+.5+.07}h${-sign*.1}v.1`}/>)}</g>)}
        <rect x=".5" y=".5" width="8" height="9" strokeWidth=".055"/>
      </g><g fill="var(--board-ink, #493322)" fontSize=".38" fontWeight="700" fontFamily="'SimSun','Noto Serif SC',serif" textAnchor="middle"><text x="2.5" y="5.13">楚 河</text><text x="6.5" y="5.13">漢 界</text></g>
    </svg>}
    {Array.from({length:meta.rows},(_,sr)=><div role="row" key={sr} className="flat-row">{Array.from({length:meta.cols},(_,sc)=>{
      const row=flipped?meta.rows-sr-1:sr,col=flipped?meta.cols-sc-1:sc,index=row*meta.cols+col,piece=board[index];
      return <button key={index} role="gridcell" tabIndex={focus===index?0:-1} data-square={index} aria-label={`${squareName(kind,index)}: ${pieceName(kind,piece)}`} aria-selected={selected===index} aria-disabled={!enabled||piece==='#'} className={`flat-cell ${piece==='#'?'blocked-square':''} ${(row+col)%2?'dark-square':''} ${selected===index?'chosen':''} ${targets.includes(index)?'legal':''} ${last?.to===index||last?.from===index?'last':''} ${checkSquare===index?'in-check':''} ${winning.includes(index)?'winning-cell':''}`} onFocus={()=>setFocus(index)} onClick={()=>onSquare(index)} onKeyDown={event=>{
        const sign=flipped?-1:1,delta:Record<string,number>={ArrowLeft:-sign,ArrowRight:sign,ArrowUp:-meta.cols*sign,ArrowDown:meta.cols*sign};
        if(!(event.key in delta))return;event.preventDefault();const next=Math.max(0,Math.min(board.length-1,index+delta[event.key]));setFocus(next);ref.current?.querySelector<HTMLButtonElement>(`[data-square="${next}"]`)?.focus();
      }}>{piece==='#'?<span className="blocked-mark"/>:piece?kind==='commander'?<CommanderPiece cell={piece}/>:kind==='caro'||kind==='tictactoe'?<span className={`flat-piece piece-${piece}`}>{piece==='X'?'×':'○'}</span>:kind==='chess'?<span className={`flat-piece piece-${piece[0]}`}>{CHESS_LABELS[piece]}</span>:kind==='xiangqi'?<span className={`flat-piece piece-${piece[0]}`}>{X_LABELS[piece]}</span>:<span className={`flat-disc disc-${piece[0]}`}>{kind==='checkers'&&piece[1]==='K'&&<span className="disc-crown">♛</span>}</span>:targets.includes(index)?<i className="legal-dot"/>:null}{sr===meta.rows-1&&<small className="flat-file">{kind==='commander'?col:(kind==='go'?'ABCDEFGHJ':'ABCDEFGHIJKLMNO')[col]}</small>}{sc===0&&<small className="flat-rank">{kind==='commander'?11-row:kind==='caro'?row+1:meta.rows-row}</small>}</button>;
    })}</div>)}
  </div>;
}
