// stats.js Micro Pulse Weex

import { client } from "../db/client.js";

export async function getPerformance48h(symbol, timeframe) {

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
    AND timeframe = $2
    AND timestamp >= (EXTRACT(EPOCH FROM NOW()) * 1000 - 48 * 60 * 60 * 1000);
  `, [symbol, timeframe]);

  return {
    tps: Number(res.rows[0].tps48h),
    sls: Number(res.rows[0].sls48h),
    percent: Number(res.rows[0].percent48h)
  };
}
