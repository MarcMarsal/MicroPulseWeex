// db/saveSignal2.js — MicroPulseWeex (patrons + ATR + tracking + entryR)

import { client } from "./client.js";
import { splitSpainDate } from "../core/utils.js";
import { fmt } from "../core/activeCryptos.js";

//import { sendTelegram } from "../telegram/send.js";

export async function saveSignal2({
  symbol,
  timeframe,
  type,
  entry,
  entryr,     // 🟩 AFEGIT FIAT‑PRO v2.4
  tp,
  sl,
  timestamp,

  color,
  isGood,
  slope,
  wicksBoth,

  rsi
}) {

  const tsMs = Number(timestamp);
  const createdAt = Date.now();

  const { date_es, hora_es, timestamp_es } = splitSpainDate(tsMs);
  entry  = fmt(entry,  symbol);
  entryr = fmt(entryr, symbol);
  tp     = fmt(tp,     symbol);
  sl     = fmt(sl,     symbol);


  await client.query(
    `
    INSERT INTO signals_weex (
      symbol,
      timeframe,
      type,
      color,
      entry,
      entryr,        -- 🟩 AFEGIT
      tp,
      sl,
      timestamp,
      timestamp_ms,
      timestamp_es,
      date_es,
      hora_es,
      created_at,
      closed,
      is_good,
      slope,
      wicks_both,
      rsi
    )
    VALUES (
      $1,$2,$3,
      $4,
      $5,$6,         -- entry, entryR
      $7,$8,
      $9,$10,$11,$12,$13,
      $14,
      false,
      $15,$16,$17,
      $18
    )
    ON CONFLICT DO NOTHING
    `,
    [
      symbol,
      timeframe,
      type,
      color,
      entry,
      entryr,        // 🟩 AFEGIT
      tp,
      sl,
      tsMs,
      tsMs,
      timestamp_es,
      date_es,
      hora_es,
      createdAt,
      isGood,
      slope,
      wicksBoth,
      rsi
    ]
  );

  // ALERTA TELEGRAM (desactivada)
  // await sendTelegram({...});
}
