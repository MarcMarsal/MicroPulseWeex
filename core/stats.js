// stats.js Micro Pulse Weex

import { client } from "../db/client.js";

export async function getPerformance48h(symbol) {
  const since = Date.now() - 48 * 60 * 60 * 1000;

  const res = await client.query(`
    SELECT result
    FROM signals_weex
    WHERE symbol = $1
    AND timestamp >= $2
  `, [symbol, since]);

  let tps = 0;
  let sls = 0;

  for (const row of res.rows) {
    if (row.result === "TP") tps++;
    if (row.result === "SL") sls++;
  }

  const total = tps + sls;
  const percent = total === 0 ? 0 : Math.round((tps / total) * 100);

  return { tps, sls, percent };
}
