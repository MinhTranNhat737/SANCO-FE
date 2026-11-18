import {useId} from 'react';
import type {GameKind} from './practice-types';
import './game-emblem.css';

const CROP:Record<GameKind,{x:number;y:number;s:number}>={
  caro:{x:-12,y:-12,s:184},
  chess:{x:8,y:8,s:144},
  xiangqi:{x:8,y:8,s:144},
  reversi:{x:-8,y:-8,s:176},
  connect4:{x:8,y:6,s:144},
  go:{x:8,y:8,s:144},
  ludo:{x:6,y:6,s:148},
  monopoly:{x:8,y:8,s:144},
  checkers:{x:10,y:10,s:140},
  tictactoe:{x:-10,y:-10,s:180},
  coganh:{x:-8,y:-8,s:176},
  ataxx:{x:-10,y:-10,s:180},
  breakthrough:{x:-8,y:-8,s:176},
  loa:{x:-10,y:-10,s:180},
  isolation:{x:-10,y:-10,s:180},
  commander:{x:8,y:8,s:144}
};

/** AI-generated 3D luxury game emblems framed in Sân Cờ's hexagonal gold seal. */
export default function GameEmblem({kind,className=''}:{kind:GameKind;className?:string}){
  const id=useId().replace(/:/g,'');
  const gold=`url(#${id}-gold)`,vignette=`url(#${id}-vig)`,clip=`url(#${id}-clip)`;
  const {x,y,s}=CROP[kind]||CROP.chess;
  return <svg className={`game-emblem emblem-${kind} ${className}`} viewBox="0 0 160 160" fill="none" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={`${id}-gold`} x1="30" y1="18" x2="130" y2="144" gradientUnits="userSpaceOnUse">
        <stop stopColor="#fff2ca"/>
        <stop offset=".48" stopColor="#d8b66c"/>
        <stop offset="1" stopColor="#8d632e"/>
      </linearGradient>
      <radialGradient id={`${id}-vig`} cx="80" cy="80" r="68" gradientUnits="userSpaceOnUse">
        <stop offset=".72" stopColor="#0d231b" stopOpacity="0"/>
        <stop offset="1" stopColor="#081711" stopOpacity=".58"/>
      </radialGradient>
      <clipPath id={`${id}-clip`}>
        <path d="M80 13 138 46.5v67L80 147 22 113.5v-67Z"/>
      </clipPath>
    </defs>
    <path className="emblem-halo" d="M80 7 143 43v74l-63 36-63-36V43Z" fill="#10271f" stroke="#73916c" strokeOpacity=".45"/>
    <g clipPath={clip}>
      <rect x="16" y="10" width="128" height="140" fill="#0d231b"/>
      <image className="emblem-ai-art" href={`/thumbs/${kind}.jpg`} x={x} y={y} width={s} height={s} preserveAspectRatio="xMidYMid slice"/>
      <path d="M80 13 138 46.5v67L80 147 22 113.5v-67Z" fill={vignette}/>
    </g>
    <path d="M80 13 138 46.5v67L80 147 22 113.5v-67Z" stroke={gold} strokeWidth="2.2"/>
    <path d="M80 18 133.5 49v62L80 142 26.5 111V49Z" stroke={gold} strokeOpacity=".42" strokeWidth=".9"/>
    <path className="emblem-ornament" d="m72 14 8 5 8-5M22 66l5 3v22l-5 3m116-28-5 3v22l5 3m-66 52 8-5 8 5" stroke={gold} strokeWidth="1.2" opacity=".8"/>
    <path className="emblem-ornament" d="m76 135 4-3 4 3-4 3Z" fill={gold}/>
  </svg>;
}
