import type {Difficulty} from './practice-types';
export type Rating={elo:number;games:number;wins:number;draws:number;losses:number;peak:number;provisional:boolean;placementLeft:number;rank:string;tier:string;nextRank:string|null;nextElo:number|null};
export type RatingChange=Rating&{before:number;after:number;delta:number};
export type BotProfile={id:string;name:string;elo:number;rank:string;difficulty:Difficulty;estimated:boolean};
