import type {GameKind,PracticePly,PracticeMove,PartyState} from './practice-types';
export type Mark = string;
export type Move = { cell: number; mark: Mark; at: number };
export type User = { id: string; name: string; account: boolean; email: string | null };
export type AuthProviders = { google: boolean; facebook: boolean };
export type Seat = { name: string; mark: Mark; ready: boolean; rematch: boolean; online: boolean };
export type Room = {
  ranked?:boolean;id: string; kind:GameKind; version: number; duration: number; createdAt: number; inviteExpiresAt: number; serverNow: number;
  owner: Seat; guest: Seat | null; me: { role: 'owner' | 'guest'; mark: Mark; ready: boolean; rematch: boolean };
  players?:Seat[];capacity?:number;
  drawOffer: 'me' | 'opponent' | null;
  game: { ratingChanges?:Record<string,import('./rating-types').RatingChange>;id: string; rules: string; phase: 'waiting' | 'playing' | 'finished'; board: (Mark | null)[]; initialBoard?:(string|null)[]; moves: (Move|PracticePly)[]; turn: Mark; legal?:PracticeMove[]; check?:boolean;checkSquare?:number|null;passed?:string|null;
    party?:PartyState;initialParty?:PartyState;score?:Record<string,number>;passes?:number;prisoners?:Record<string,number>;
    remaining: Record<Mark, number>; turnStartedAt: number | null; result: { winner: Mark | null; reason: string; line: number[]; at: number } | null };
};
