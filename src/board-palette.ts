export type BoardTheme = 'light' | 'dark';
export const BOARD_PALETTES = {
  light: {
    board:'#f4e3bd', ink:'#493322', grid:'#657563', frame:'#725132',
    squareLight:'#f0e6cf', squareDark:'#587262', field:'#bdd2ba', hole:'#e5ecdf',
    river:'#ead4aa', palace:'#edd4a2', center:'#e6eadb', centerInk:'#234434',
    lot:'#f1e8ce', special:'#dcd0ae', lotInk:'#233d2c', home:'#f6efda',
    marker:'#006778', last:'#935000', check:'#c32332',
    markX:'#174e3a',markO:'#a03925',
  },
  dark: {
    board:'#263b32', ink:'#e5dbb6', grid:'#a8c0a8', frame:'#101f19',
    squareLight:'#789183', squareDark:'#2b493b', field:'#204c3a', hole:'#122b25',
    river:'#365347', palace:'#3c5140', center:'#142e23', centerInk:'#e7dfbc',
    lot:'#344c3e', special:'#42533e', lotInk:'#edf0d7', home:'#293f35',
    marker:'#93e1ec', last:'#f4c66b', check:'#ff8994',
    markX:'#b4e6c2',markO:'#e7b585',
  },
} as const;
