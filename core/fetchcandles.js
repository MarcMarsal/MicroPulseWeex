import axios from "axios";
import { client } from "../db/client.js";

// Variables d'entorn
const API_WEEX = process.env.API_WEEX;

// -------------------------------------------------------------
// PATCH INTEGRAT WEEX — neteja duplicats, snapshots incompletes i valors buits
// -------------------------------------------------------------
function fixWeexCandles(candles) {
  const seen = new Set();
  const clean = [];

  for (const c of candles) {
    // Dedup O(n)
    if (seen.has(c.timestamp)) continue;
    seen.add(c.timestamp);

    // Ignorar veles incompletes
    if (
      c.open === "" ||
      c.close === "" ||
      c.high === "" ||
      c.low === ""
    ) continue;

    // Corregir valors buits i parsejar
    clean.push({
      timestamp: Number(c.timestamp),
      open: parseFloat(c.open || c.close),
      high: parseFloat(c.high || c.open),
      low: parseFloat(c.low || c.open),
      close: parseFloat(c.close || c.open),
      volume: parseFloat(c.volume || 0)
    });
  }

  return clean;
}

// -------------------------------------------------------------
// NORMALITZAR TIMESTAMP
// -------------------------------------------------------------
function normalizeTimestamp_WEEX(raw) {
  if (raw === undefined || raw === null) return null;

  const ts = Number(raw);
  if (!Number.isFinite(ts)) return null;

  // Si és en segons (10 dígits), convertir a ms
  if (ts < 1000000000000) return ts * 1000;

  // Si és en ms (13 dígits), acceptar-lo
  if (ts >= 1600000000000) return ts;

  return null;
}

// -------------------------------------------------------------
// NORMALITZAR SYMBOL PER EXCHANGE
// -------------------------------------------------------------
function normalizeSymbolFor(exchange, symbol) {
  if (exchange === "OKX") return symbol;       // BTC-USDT
  return symbol.replace("-", "");              // BTCUSDT
}

// -------------------------------------------------------------
// NORMALITZAR TIMEFRAME PER EXCHANGE
// -------------------------------------------------------------
function normalizeTimeframeFor(exchange, timeframe) {
  if (exchange === "OKX") return timeframe;    // 1H
  return timeframe.toLowerCase();              // 1h
}

// -------------------------------------------------------------
// FORMAT INTERN MICRO‑PULSE
// -------------------------------------------------------------
function toInternal(ts, o, h, l, c, v) {
  return {
    timestamp: ts,
    open: o,
    high: h,
    low: l,
    close: c,
    volume: v
  };
}

// -------------------------------------------------------------
// GUARDAR A TAULA
// -------------------------------------------------------------
async function storeCandle(table, symbol, timeframe, c) {

  const timestamp_es = new Date(
    new Date(c.timestamp).toLocaleString("en-US", {
      timeZone: "Europe/Madrid"
    })
  ).getTime();

  const date_es = new Date(c.timestamp).toLocaleString("es-ES", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).replace(",", "");

  await client.query(
    `
    INSERT INTO ${table} (symbol, timeframe, timestamp, open, high, low, close, volume, timestamp_es, date_es)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    ON CONFLICT (symbol, timeframe, timestamp)
    DO UPDATE SET
      open=$4, high=$5, low=$6, close=$7, volume=$8,
      timestamp_es=$9, date_es=$10;
    `,
    [
      symbol,
      timeframe,
      c.timestamp,
      c.open,
      c.high,
      c.low,
      c.close,
      c.volume,
      timestamp_es,
      date_es
    ]
  );
}

// -------------------------------------------------------------
// FETCH WEEX → TAULA candles_weex
// -------------------------------------------------------------
async function fetchWeex(symbol, timeframe) {
  try {
    const sym = normalizeSymbolFor("WEEX", symbol);
    const tf  = normalizeTimeframeFor("WEEX", timeframe);

    // LIMIT 5 → consum mínim
    const url = `${API_WEEX}?symbol=${sym}&interval=${tf}&limit=5`;
    //const url = `${API_WEEX}?symbol=${sym}&interval=${tf}&limit=50`;


    const res = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
      }
    });

    const data = res.data;
    if (!data || data.length === 0) return [];

    // Convertir a format intern
    let candles = data.map(k => {
      const ts = normalizeTimestamp_WEEX(k[0]);
      if (!ts) return null;

      return toInternal(
        ts,
        parseFloat(k[1]),
        parseFloat(k[2]),
        parseFloat(k[3]),
        parseFloat(k[4]),
        parseFloat(k[5])
      );
    }).filter(Boolean);

    // 🔥 Aplicar patch FIAT optimitzat
    candles = fixWeexCandles(candles);

    return candles;

  } catch (err) {
    console.log("❌ Error WEEX:", symbol, timeframe, err.message);
    return [];
  }
}

// -------------------------------------------------------------
// FETCH + STORE
// -------------------------------------------------------------
export async function fetchAndStoreCandles(symbol, timeframe) {
  try {
    const weex = await fetchWeex(symbol, timeframe);

    // Guardar en paral·lel → consum mínim
    await Promise.all(
      weex.map(c =>
        storeCandle("candles_weex", symbol, timeframe, c)
      )
    );

  } catch (err) {
    console.log("❌ Error general descarregant veles:", symbol, timeframe, err.message);
  }
}
