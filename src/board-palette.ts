export type BoardTheme = 'light' | 'dark';
export const BOARD_PALETTES = {
  light: {
    board:'#f4e3bd', ink:'#493322', grid:'#8c716d', frame:'#725132',
    squareLight:'#f0e6cf', squareDark:'#80615d', field:'#ddc9af', hole:'#ead8c6',
    river:'#ead4aa', palace:'#edd4a2', center:'#eadcc8', centerInk:'#442d3e',
    lot:'#f1e8ce', special:'#dcd0ae', lotInk:'#442d3e', home:'#f6efda',
    marker:'#704787', last:'#935000', check:'#c32332',
    markX:'#174e3a',markO:'#a03925',
  },
  dark: {
    board:'#382a37', ink:'#f2e0ce', grid:'#bba5ac', frame:'#211822',
    squareLight:'#b39a91', squareDark:'#604653', field:'#523e4a', hole:'#2b1e2c',
    river:'#483541', palace:'#503846', center:'#362734', centerInk:'#ede0c8',
    lot:'#533f4d', special:'#624d55', lotInk:'#f5e8d9', home:'#443342',
    marker:'#e4b9ee', last:'#f4c66b', check:'#ff8994',
    markX:'#b4e6c2',markO:'#e7b585',
  },
} as const;
