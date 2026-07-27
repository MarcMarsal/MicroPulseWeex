// panell_micropulseweex.js — micropulse (upgraded)

import http from "http";
import { initDB, client } from "./db/client.js";
import { formatSpainTime } from "./core/utils.js";

// Formatador numèric
function fmt(n) {
  return n !== null && n !== undefined ? Number(n).toFixed(4) : "-";
}

// 🟩 FIAT — DETECTOR D’ESTAT DEL MERCAT
async function getMarketState() {
  try {
    const q = await client.query(`
      SELECT open, high, low, close, volume
      FROM candles
      WHERE symbol='BTC-USDT' AND timeframe='1H'
      ORDER BY timestamp DESC
      LIMIT 24
    `);

    const candles = q.rows;
    if (!candles || candles.length === 0) return "MORT";

    const avgVolume =
      candles.reduce((a, c) => a + Number(c.volume || 0), 0) / candles.length;

    const avgBody =
      candles.reduce((a, c) => a + Math.abs((c.close || 0) - (c.open || 0)), 0) /
      candles.length;

    const highs = candles.map(c => Number(c.high || 0));
    const lows = candles.map(c => Number(c.low || 0));
    const maxHigh = Math.max(...highs);
    const minLow = Math.min(...lows);
    const range = maxHigh - minLow;

    const avgWick =
      candles.reduce((a, c) => {
        const upper = (c.high || 0) - Math.max(c.open || 0, c.close || 0);
        const lower = Math.min(c.open || 0, c.close || 0) - (c.low || 0);
        return a + (upper + lower);
      }, 0) / candles.length;

    let score = 0;
    if (avgVolume > 150) score++;
    if (avgBody > 80) score++;
    if (range > 150) score++;
    if (avgWick > 40) score++;

    if (score >= 3) return "VIU";
    if (score === 2) return "RECONSTRUCCIO";
    return "MORT";

  } catch (err) {
    console.error("❌ Error getMarketState:", err);
    return "ERROR";
  }
}

// Llegir últimes 20 alertes FIAT‑PRO
async function getActiveSignals() {
  const q = await client.query(`
    SELECT
      id,
      symbol,
      timeframe,
      type,
      entry,
      entryr,          -- 🟩 AFEGIT FIAT‑PRO v2.4
      tp,
      sl,
      color,
      rsi,
      timestamp_ms,
      date_es,
      hora_es,
      created_at
    FROM signals_upgraded
    ORDER BY created_at DESC
    LIMIT 20
  `);

  return q.rows;
}

function renderActiveSignalsTable(signals) {
  let rows = "";

  for (const s of signals) {
    let color = s.color || "#00ff00";
    if (color.toLowerCase() === "blue") color = "cyan";

    rows += `
      <tr style="color: ${color}">
        <td>${s.id}</td>
        <td>${s.symbol}</td>
        <td>${s.timeframe}</td>
        <td>${s.type}</td>
        <td>${fmt(s.entry)}</td>
        <td>${fmt(s.entryr)}</td>     <!-- 🟩 AFEGIT -->
        <td>${fmt(s.tp)}</td>
        <td>${fmt(s.sl)}</td>
        <td>${fmt(s.rsi)}</td>
        <td>${s.date_es}</td>
        <td>${s.hora_es}</td>
        <td>${formatSpainTime(s.created_at)}</td>
      </tr>
    `;
  }

  return `
    <h2>Últimes 20 alertes FIAT‑PRO</h2>
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Symbol</th>
          <th>Timeframe</th>
          <th>Tipus</th>
          <th>Entrada</th>
          <th>EntradaR</th>     <!-- 🟩 AFEGIT -->
          <th>TP</th>
          <th>SL</th>
          <th>RSI</th>
          <th>Data vela</th>
          <th>Hora vela</th>
          <th>Creat (ES)</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

// Servidor HTTP
async function startPanel() {
  await initDB();

  http.createServer(async (req, res) => {
    if (req.url === "/") {
      const signals = await getActiveSignals();
      const signalsHTML = renderActiveSignalsTable(signals);
      const lastUpdate = formatSpainTime(Date.now());

      const marketState = await getMarketState();

      const html = `
      <html>
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="refresh" content="5">
        <style>
          body {
            background-color: #000;
            color: #00ff00;
            font-family: Consolas, monospace;
            padding: 20px;
          }
          table {
            border-collapse: collapse;
            width: 100%;
            margin-bottom: 40px;
          }
          th, td {
            border: 1px solid #00ff00;
            padding: 6px;
            text-align: center;
          }
          th {
            background-color: #003300;
          }
        </style>
      </head>
      <body>
        <h1>Panell Microimpulsos FIAT‑PRO</h1>
        <p><b>Última actualització:</b> ${lastUpdate}</p>

        <h2>Estat del Mercat BTC (1H)</h2>
        <p><b>${marketState}</b></p>

        ${signalsHTML}

      </body>
      </html>
      `;

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
      return;
    }

    res.writeHead(200);
    res.end("Panell FIAT‑PRO OK");
  }).listen(process.env.PORT || 3000);

  console.log("Panell Microimpulsos FIAT‑PRO en marxa");
}

startPanel();
