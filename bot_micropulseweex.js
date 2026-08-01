// bot_micropulseweex.js — MICRO‑PULSE (patrons + ATR + tracking + ordres)

import cron from "node-cron";
import { client, initDB } from "./db/client.js";
import { alreadySent2 } from "./db/alreadySent2.js";
import { saveSignal2 } from "./db/saveSignal2.js";
import { detectMSES } from "./core/patterns.js";
import { fetchAndStoreCandles } from "./core/fetchcandles.js";
import { calculateRSI } from "./core/rsi.js";
import { ACTIVE_CRYPTO_LIST, UNIVERSE } from "./core/activeCryptos.js";
import { getPerformance48h } from "./core/stats.js";

function shouldProcess(symbol) {
  return ACTIVE_CRYPTO_LIST.includes(symbol);
}

// -------------------------------------------------------------
// FILTRES MICRO‑PULSE (abans FIAT‑PRO)
// -------------------------------------------------------------
function applyMicroPulseFilters(candles, candleIndex, atrManual, type, timeframe) {
  const atr = atrManual[candleIndex];
  const slopeLen = timeframe === "15m" ? 40 : 20;
  //if (!atr || candleIndex - 20 < 0) {
  if (!atr || candleIndex - slopeLen < 0) {
    return {
      isGood: false,
      slope: null,
      wicksBoth: false,
      color: "blue"
    };
  }

  //const slopeLen = 20;
 

  const slope = candles[candleIndex].close - candles[candleIndex - slopeLen].close;
  const slopeOk = Math.abs(slope) < atr * 3.5;

  const o = candles[candleIndex].open;
  const c = candles[candleIndex].close;
  const h = candles[candleIndex].high;
  const l = candles[candleIndex].low;

  const wickUp   = h - Math.max(o, c);
  const wickDown = Math.min(o, c) - l;

  const wicksBoth = (wickUp > atr * 0.05) && (wickDown > atr * 0.05);

  const isGood = slopeOk && wicksBoth;

  let color;
  if (!isGood) {
    color = "blue";
  } else {
    color = type === "M" ? "green" : "red";
  }

  return {
    isGood,
    slope,
    wicksBoth,
    color
  };
}

// -------------------------------------------------------------
// CONFIG
// -------------------------------------------------------------

const TIMEFRAMES = ["1H"];
//const TIMEFRAMES = ["1H","15m"];

// -------------------------------------------------------------
// TIMEFRAME → MS
// -------------------------------------------------------------
function timeframeToMs(tf) {
  if (tf === "1H") return 60 * 60 * 1000;
  if (tf === "15m") return 15 * 60 * 1000;
  throw new Error("Timeframe no suportat: " + tf);
}

// -------------------------------------------------------------
// LLEGIR VELAS DE LA DB
// -------------------------------------------------------------
async function getCandlesFromDB(symbol, timeframe, limit, untilTimestamp = null) {
  if (untilTimestamp === null) {
    const res = await client.query(`
      SELECT *
      FROM candles_weex
      WHERE symbol = $1 AND timeframe = $2
      ORDER BY timestamp DESC
      LIMIT $3
    `, [symbol, timeframe, limit]);

    return res.rows.reverse();
  }

  const nextTs = Number(untilTimestamp) + Number(timeframeToMs(timeframe));

  const res = await client.query(`
    SELECT *
    FROM candles_weex
    WHERE symbol = $1 AND timeframe = $2
    AND timestamp <= $3
    ORDERORDER BY timestamp DESC
    LIMIT $4
  `, [symbol, timeframe, nextTs, limit]);

  return res.rows.reverse();
}

// -------------------------------------------------------------
// ATRSeries SIMPLE
// -------------------------------------------------------------
function calcATRManualSeries(candles, atrLen = 10) {
  const atrManual = new Array(candles.length).fill(null);

  for (let i = atrLen; i < candles.length; i++) {
    let trSum = 0;

    for (let j = 0; j < atrLen; j++) {
      const cur  = candles[i - j];
      const prev = candles[i - j - 1];

      const highLow   = cur.high - cur.low;
      const highClose = Math.abs(cur.high - prev.close);
      const lowClose  = Math.abs(cur.low  - prev.close);

      const tr = Math.max(highLow, highClose, lowClose);
      trSum += tr;
    }

    atrManual[i] = trSum / atrLen;
  }

  return atrManual;
}

// -------------------------------------------------------------
// TP/SL MICRO‑PULSE (abans FIAT‑PRO)
// -------------------------------------------------------------
function tpSlMicroPulse(isLong, entry, atr) {
  const tpMult = 0.4;
  const slMult = 1.0;

  const tp = isLong ? entry + atr * tpMult : entry - atr * tpMult;
  const sl = isLong ? entry - atr * slMult : entry + atr * slMult;

  return { tp, sl };
}

// -------------------------------------------------------------
// PROCESSAR UN SÍMBOL (MICRO‑PULSE)
// -------------------------------------------------------------
export async function processSymbol(symbol, timeframe) {

  if (!shouldProcess(symbol)) return;

  //const candles = await getCandlesFromDB(symbol, timeframe, 120);
  //const candles = await getCandlesFromDB(symbol, timeframe, 25);
  let candles = await getCandlesFromDB(symbol, timeframe, 120);
  if (!candles || candles.length < 20) return;

  candles.sort((a, b) => a.timestamp - b.timestamp);

  // NORMALITZACIÓ PEPE (una sola vegada, per tot el bot)
  if (symbol === "PEPE-USDT") {
    const k = 1000;
    candles = candles.map(c => ({
      ...c,
      open:  c.open  * k,
      high:  c.high  * k,
      low:   c.low   * k,
      close: c.close * k
    }));
  }

  const atrManual = calcATRManualSeries(candles, 10);
  if (!atrManual || atrManual.every(v => v === null)) return;

  const { signals } = await detectMSES(candles, symbol, timeframe);
  if (!signals || signals.length === 0) return;

  for (const sig of signals) {
    if (sig.type !== "M" && sig.type !== "E") continue;

    const exists = await alreadySent2(symbol, timeframe, sig.timestamp);
    if (exists) continue;

    const candleIndex = candles.findIndex(c => c.timestamp === sig.timestamp);
    if (candleIndex === -1) continue;

    const { isGood, slope, wicksBoth, color } =
      applyMicroPulseFilters(candles, candleIndex, atrManual, sig.type, timeframe);

    sig.isGood = isGood;
    sig.slope = slope;
    sig.wicksBoth = wicksBoth;
    sig.color = color;

    // -------------------------------------------------------------
    // ENTRYR MICRO‑PULSE (20–40% del cos de la 3a vela)
    // -------------------------------------------------------------
    const body = Math.abs(sig.thirdCandle.close - sig.thirdCandle.open);

    const entryR = sig.type === "M"
      ? sig.thirdCandle.close - body * 0.40
      : sig.thirdCandle.close + body * 0.40;

    sig.entryr = entryR;

    // -------------------------------------------------------------
    // TP/SL amb ENTRYR
    // -------------------------------------------------------------
    const atrEv = atrManual[candleIndex];
    const { tp, sl } = tpSlMicroPulse(sig.type === "M", entryR, atrEv);

    sig.tp = tp;
    sig.sl = sl;

    // -------------------------------------------------------------
    // ENTRY original del patró (no es toca)
    // -------------------------------------------------------------
    sig.entry = candles[candleIndex].close;

    // -------------------------------------------------------------
    // RSI
    // -------------------------------------------------------------
    const q = await client.query(`
      SELECT close
      FROM candles_weex
      WHERE symbol=$1 AND timeframe=$2
      ORDER BY timestamp DESC
      LIMIT 15
    `, [symbol, timeframe]);

    const closes = q.rows.map(r => Number(r.close)).reverse();
    sig.rsi = calculateRSI(closes);

    const perf = await getPerformance48h(symbol);
    sig.tps48h = perf.tps;
    sig.percent48h = perf.percent;
    
    // -------------------------------------------------------------
    // GUARDAR SENYAL
    // -------------------------------------------------------------
    await saveSignal2({
      symbol:   sig.symbol,
      timeframe:sig.timeframe,
      type:     sig.type,
      entry:    sig.entry,
      entryr:   sig.entryr,
      tp:       sig.tp,
      sl:       sig.sl,
      timestamp:sig.timestamp,
      color:    sig.color,
      isGood:   sig.isGood,
      slope:    sig.slope,
      wicksBoth:sig.wicksBoth,
      rsi:      sig.rsi,
       // 🔥 nous camps del panell
      tps48h:     sig.tps48h,
      percent48h: sig.percent48h
    });
  }
}

// -------------------------------------------------------------
// LOOP PRINCIPAL MICRO‑PULSE
// -------------------------------------------------------------
async function mainLoop() {

  for (const symbol of UNIVERSE) {
    for (const timeframe of TIMEFRAMES) {
      await fetchAndStoreCandles(symbol, timeframe);
    }
  }

  for (const symbol of ACTIVE_CRYPTO_LIST) {
    for (const timeframe of TIMEFRAMES) {
      try {
        await processSymbol(symbol, timeframe);
      } catch (err) {
        console.log("Error processant", symbol, timeframe, err.message);
      }
    }
  }
}

// -------------------------------------------------------------
// START BOT
// -------------------------------------------------------------
async function startBot() {
  await initDB();
  console.log("Bot MICRO‑PULSE en marxa (patrons + ATR + tracking + ordres)");
  cron.schedule("* * * * *", mainLoop);
}

startBot();
