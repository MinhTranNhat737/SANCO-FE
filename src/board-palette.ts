export type BoardTheme = 'light' | 'dark';
export const BOARD_PALETTES = {
  light: {
    board:'#f4e3bd', ink:'#493322', grid:'#866d4e', frame:'#725132',
    squareLight:'#f0e6cf', squareDark:'#805f44', field:'#ddc9af', hole:'#ead8c6',
    river:'#ead4aa', palace:'#edd4a2', center:'#eadcc8', centerInk:'#493221',
    lot:'#f1e8ce', special:'#dcd0ae', lotInk:'#493221', home:'#f6efda',
    marker:'#77431a', last:'#935000', check:'#c32332',
    markX:'#174e3a',markO:'#a03925',
  },
  dark: {
    board:'#503a26', ink:'#f2e0ce', grid:'#c3aa85', frame:'#291c12',
    squareLight:'#c2a582', squareDark:'#6d4b32', field:'#6a4b33', hole:'#302216',
    river:'#5d422d', palace:'#62442c', center:'#3e2c20', centerInk:'#ede0c8',
    lot:'#624630', special:'#735139', lotInk:'#f5e8d9', home:'#563d2a',
    marker:'#ffdd9d', last:'#f4c66b', check:'#ff8994',
    markX:'#b4e6c2',markO:'#e7b585',
  },
} as const;
