import type {GameKind} from './practice-types';

const slugs: Record<GameKind, string> = {
  caro:'caro', chess:'co-vua', xiangqi:'co-tuong', reversi:'co-lat', connect4:'noi-bon',
  go:'co-vay', ludo:'ca-ngua', monopoly:'ty-phu-viet-nam', checkers:'co-dam', tictactoe:'co-ba-quan',
  coganh:'co-ganh', ataxx:'ataxx', breakthrough:'dot-pha', loa:'lien-quan', isolation:'co-lap', commander:'co-tu-lenh'
};

export const gamePage = (kind: GameKind) => `/choi/${slugs[kind]}`;
