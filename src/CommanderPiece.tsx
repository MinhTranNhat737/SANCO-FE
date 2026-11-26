import {COMMANDER_SYMBOLS,commanderUnits} from './commander-ui';
export default function CommanderPiece({cell}:{cell:string}){
  const units=commanderUnits(cell),unit=units[0];
  return <span className={`ctl-piece ctl-${unit[0]}`}><svg viewBox="0 0 24 26" fill="none" stroke="currentColor" strokeWidth="2.05" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={COMMANDER_SYMBOLS[unit[1]]?.path}/></svg>{units.some(u=>u.endsWith('*'))&&<i className="ctl-hero">★</i>}{units.length>1&&<span className="ctl-stack">{units.slice(1).map((u,i)=><small key={i}>{COMMANDER_SYMBOLS[u[1]]?.notation}</small>)}</span>}</span>;
}
