// core/activeCryptos.js — MicroPulse

export const ACTIVE_CRYPTO_LIST = [
  "APT-USDT","ASTER-USDT","ATOM-USDT","AVAX-USDT",
  "DOT-USDT","FET-USDT","HBAR-USDT","LTC-USDT",
  "OP-USDT","PEPE-USDT","SEI-USDT","SUI-USDT","TRUMP-USDT",
  "ADA-USDT","SOL-USDT","NEAR-USDT","RENDER-USDT","ONDO-USDT","LINK-USDT",
];


export const UNIVERSE = [
  "APT-USDT","LINK-USDT","OP-USDT","SOL-USDT","BTC-USDT","FET-USDT",
  "RENDER-USDT","XRP-USDT","ARB-USDT","ATOM-USDT","BNB-USDT","DOT-USDT",
  "ETH-USDT","INJ-USDT","PEPE-USDT","TRUMP-USDT","ADA-USDT","ASTER-USDT",
  "AVAX-USDT","BCH-USDT","HBAR-USDT","NEAR-USDT","SEI-USDT","SUI-USDT",
  "VIRTUAL-USDT","LTC-USDT","ONDO-USDT"
];

// -------------------------------------------------------------
// DECIMALS PER SIMBOL (FIAT)
// -------------------------------------------------------------
export const DECIMALS = {
  "ADA-USDT": 4,
  "APT-USDT": 4,
  "ARB-USDT": 5,
  "ASTER-USDT": 4,
  "ATOM-USDT": 3,
  "AVAX-USDT": 3,
  "BCH-USDT": 2,
  "BNB-USDT": 2,
  "BTC-USDT": 1,
  
  "DOT-USDT": 4,

  "ETH-USDT": 2,
  "FET-USDT": 4,
  "HBAR-USDT": 5,
  "INJ-USDT": 3,
  "LINK-USDT": 3,
  "LTC-USDT": 2,
  "ONDO-USDT":4,
  "OP-USDT": 4,
 
  "PEPE-USDT": 7,
   
  
  "NEAR-USDT": 3,
  "RENDER-USDT": 3,
  "SEI-USDT": 5,
  "SOL-USDT": 2,
  "SUI-USDT": 4,
  
  
  "TRUMP-USDT": 3,
  "VIRTUAL-USDT": 4,
  "XRP-USDT": 4 
};

// -------------------------------------------------------------
// FORMATAR NÚMEROS SEGONS EL SIMBOL
// -------------------------------------------------------------
export function fmt(n, symbol) {
  const d = DECIMALS[symbol] ?? 4;
  return Number(n).toFixed(d);
}
