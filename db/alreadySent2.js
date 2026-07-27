// db/alreadySent2.js
import { client } from "./client.js";

export async function alreadySent2(symbol, timeframe, timestampMs) {
  const tsMs = Number(timestampMs);

  const query = `
    SELECT 1 FROM signals_weex
    WHERE symbol = $1
      AND timeframe = $2
      AND timestamp_ms = $3
    LIMIT 1
  `;

  const params = [symbol, timeframe, tsMs];

  const q = await client.query(query, params);

  return q.rowCount > 0;
}
