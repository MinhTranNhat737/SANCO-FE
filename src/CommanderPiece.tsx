import {COMMANDER_UNITS,commanderUnits} from './commander-ui';
const paths:Record<string,string>={
  K:'M12 3l2.6 5.4 6 .8-4.3 4.2 1 6-5.3-2.8-5.3 2.8 1-6L3.4 9.2l6-.8Z',
  I:'M8 3h8v5H8zM7 11h10v5H7zM9 16l-2 6m8-6 2 6M7 12l-4 5m14-5 4 5',
  E:'M4 6l5 5m6 2 5 5M16 3l-3 3 5 5 3-3M3 20l9-9m-3 8 10-10',
  T:'M3 13h18v6H3zM8 9h8v4H8zM14 9V6h8M6 19v2m4-2v2m4-2v2m4-2v2',
  A:'M4 20h16M8 20v-7h8v7M10 13 5 3m9 10L9 3M6 16h12',
  P:'M3 20h18M7 18l4-8 10-6M9 10l3 4 10-7M5 17h10v4',
  M:'M4 20h16M8 19l4-8m0 0 6-8 3 3-8 8-3-3M8 14l5 4',
  F:'M12 2v20m0-13L3 15v3l9-4 9 4v-3l-9-6M8 21l4-3 4 3',
  N:'M3 15h18l-4 6H7zM7 15V9h10v6M12 9V3m0 0 6 3-6 2M2 23h20',
  H:'M3 21V11l9-6 9 6v10H3zm6 0v-8h6v8M18 9V2m0 0h4',
  D:'M12 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6M7 22l2-10h6l2 10M5 15l4-3m6 0 4 3M16 6l5 3'
};
export default function CommanderPiece({cell}:{cell:string}){
  const units=commanderUnits(cell),unit=units[0],meta=COMMANDER_UNITS[unit[1]];
  return <span className={`ctl-piece ctl-${unit[0]}`}><svg viewBox="0 0 24 26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[unit[1]]}/></svg><b>{meta?.label}</b>{units.some(u=>u.endsWith('*'))&&<i className="ctl-hero">★</i>}{units.length>1&&<span className="ctl-stack">{units.slice(1).map((u,i)=><small key={i}>{COMMANDER_UNITS[u[1]]?.label}</small>)}</span>}</span>;
}
