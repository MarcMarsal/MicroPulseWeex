// stats.js Micro Pulse Weex

import { client } from "../db/client.js";

export async function getPerformance48h(symbol,timeframe) {
  //const since = Date.now() - 48 * 60 * 60 * 1000;

  const res = await client.query(`
   SELECT
    COUNT(*) FILTER (WHERE result = 'TP') AS tps48h,
    COUNT(*) FILTER (WHERE result = 'SL') AS sls48h,
    CASE 
        WHEN COUNT(*) = 0 THEN 0
        ELSE ROUND(
            (COUNT(*) FILTER (WHERE result = 'TP')::decimal 
            / COUNT(*)::decimal) * 100
        )
    END AS percent48h
FROM signals_upgraded
WHERE symbol = $1
AND timeframe =$2
AND timestamp >= (EXTRACT(EPOCH FROM NOW()) * 1000 - 48 * 60 * 60 * 1000);

 
  `, [symbol,timeframe]);

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
