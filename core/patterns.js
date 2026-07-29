// core/patterns.js — MicroPulseWeex

//import { isBull, isBear } from "./utils.js";
//import { client } from "../db/client.js";

// -------------------------------------------------------------
// detectMSES — només detecció de patrons MS / ES
// -------------------------------------------------------------

export function detectMSES(candles, symbol, timeframe) {
  const signals = [];

  if (!candles || candles.length < 4) {
    return { signals };
  }

  for (let i = 3; i < candles.length; i++) {

    let c1 = candles[i - 3];
    let c2 = candles[i - 2];
    let c3 = candles[i - 1];

    // ============================
    // NORMALITZACIÓ PEPE (igual que Pine)
    // ============================
    //if (symbol === "PEPE-USDT") {
    //  const k = 1000;

    //  c1 = { ...c1, open: c1.open * k, high: c1.high * k, low: c1.low * k, close: c1.close * k };
    //  c2 = { ...c2, open: c2.open * k, close: c2.close * k };
    //  c3 = { ...c3, open: c3.open * k, high: c3.high * k, low: c3.low * k, close: c3.close * k };
    //}

    // ============================
    // RAW BASE (igual que Pine)
    // ============================
    const rawMS =
      c1.close < c1.open &&
      Math.abs(c2.close - c2.open) <= (c1.high - c1.low) * 0.3 &&
      c3.close > c3.open;

    const rawES =
      c1.close > c1.open &&
      Math.abs(c2.close - c2.open) <= (c1.high - c1.low) * 0.3 &&
      c3.close < c3.open;

    // ============================
    // MICRO-PULSE (cos + metxes)
    // ============================
    const body3 = Math.abs(c3.close - c3.open);
    const range3 = c3.high - c3.low;

    const wickUp = c3.high - Math.max(c3.open, c3.close);
    const wickDn = Math.min(c3.open, c3.close) - c3.low;

    const cosOK = body3 > range3 * 0.35;
    const wicksOK = wickUp < range3 * 0.4 && wickDn < range3 * 0.4;

    const msCond = rawMS && cosOK && wicksOK;
    const esCond = rawES && cosOK && wicksOK;

    if (!msCond && !esCond) continue;

    const type = msCond ? "M" : "E";

    // ============================
    // FIAT‑PRO: càlculs de la 3a vela
    // ============================
    const range1 = c1.high - c1.low;
    const ratio = range1 !== 0 ? body3 / range1 : 0;

    // ============================
    // FIAT‑PRO: GOOD / DISCARD
    // ============================
    const isGood = body3 > range1 * 0.25;

    // ============================
    // FIAT‑PRO: color
    // ============================
    const color = isGood
      ? (type === "M" ? "green" : "red")
      : "blue";

    // ============================
    // Timestamp
    // ============================
    const ts = c3.timestamp;

    // ============================
    // Retorn FIAT‑PRO complet
    // ============================
    signals.push({
      symbol,
      timeframe,
      type,
      timestamp: ts,

      thirdCandle: {
        open: c3.open,
        close: c3.close,
        high: c3.high,
        low: c3.low
      },

      body3,
      range1,
      ratio,
      isGood,
      color
    });
  }

  return { signals };
}

