const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL Connection Pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'openbravo',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Middleware untuk Basic Auth verification
const verifyAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Progress Query Endpoint
app.post('/api/query/progress', verifyAuth, async (req, res) => {
  const { projectId, dateFrom, dateTo } = req.body;

  const query = `
    WITH total AS (
      SELECT SUM(linenetamt) AS total_amount
      FROM robprj_orab ro
      WHERE ro.c_order_id IN (
        SELECT co2.c_order_id
        FROM c_order co2
        WHERE co2.c_project_id = $1
          AND co2.issotrx = 'Y'
      )
    )

    SELECT
      ROW_NUMBER() OVER (ORDER BY ro.line) AS "no",
      ro.col2 AS "col2",
      cu."name" AS "satuan",
      CASE WHEN ro.qty = 0 THEN '' ELSE TO_CHAR(ro.qty, 'FM999990.########') END AS "boq",
      CASE
        WHEN ROUND((ro.linenetamt / total.total_amount) * 100, 4) = 0 THEN ''
        ELSE TO_CHAR(ROUND((ro.linenetamt / total.total_amount) * 100, 4), 'FM999990.0000') || '%'
      END AS "bobot",

      -- THIS WEEK
      CASE
        WHEN ROUND((COALESCE(real_minggu_ini.total_qty_actual, 0)
          * ro.priceactual / NULLIF(ro.linenetamt, 0)
          * (ro.linenetamt / NULLIF(total.total_amount, 0))
          * CASE WHEN ro.ismaterial = 'Y' THEN
              COALESCE(CASE progress_minggu_ini.ket_progress
                WHEN 'PTV' THEN 20 WHEN 'MOS' THEN 80 WHEN 'INS' THEN 95 WHEN 'TC' THEN 100 ELSE 0 END,0)
            ELSE 100 END), 4) = 0
        THEN '' ELSE TO_CHAR(ROUND((COALESCE(real_minggu_ini.total_qty_actual, 0)
          * ro.priceactual / NULLIF(ro.linenetamt, 0)
          * (ro.linenetamt / NULLIF(total.total_amount, 0))
          * CASE WHEN ro.ismaterial = 'Y' THEN
              COALESCE(CASE progress_minggu_ini.ket_progress
                WHEN 'PTV' THEN 20 WHEN 'MOS' THEN 80 WHEN 'INS' THEN 95 WHEN 'TC' THEN 100 ELSE 0 END,0)
            ELSE 100 END),4),'FM999990.0000') || '%'
      END AS "thisweek",

      -- CUMULATIVE LAST WEEK
      CASE
        WHEN ROUND((COALESCE(real_kumulatif.total_qty_actual, 0)
          * ro.priceactual / NULLIF(ro.linenetamt, 0)
          * (ro.linenetamt / NULLIF(total.total_amount, 0))
          * CASE WHEN ro.ismaterial = 'Y' THEN
              COALESCE(CASE progress_kumulatif.ket_progress
                WHEN 'PTV' THEN 20 WHEN 'MOS' THEN 80 WHEN 'INS' THEN 95 WHEN 'TC' THEN 100 ELSE 0 END,0)
            ELSE 100 END),4) = 0
        THEN '' ELSE TO_CHAR(ROUND((COALESCE(real_kumulatif.total_qty_actual, 0)
          * ro.priceactual / NULLIF(ro.linenetamt, 0)
          * (ro.linenetamt / NULLIF(total.total_amount, 0))
          * CASE WHEN ro.ismaterial = 'Y' THEN
              COALESCE(CASE progress_kumulatif.ket_progress
                WHEN 'PTV' THEN 20 WHEN 'MOS' THEN 80 WHEN 'INS' THEN 95 WHEN 'TC' THEN 100 ELSE 0 END,0)
            ELSE 100 END),4),'FM999990.0000') || '%'
      END AS "cumlastweek",

      -- CUMULATIVE THIS WEEK
      CASE
        WHEN ROUND(((COALESCE(real_kumulatif.total_qty_actual, 0) + COALESCE(real_minggu_ini.total_qty_actual, 0))
          * ro.priceactual / NULLIF(ro.linenetamt, 0)
          * (ro.linenetamt / NULLIF(total.total_amount, 0))
          * CASE WHEN ro.ismaterial = 'Y' THEN
              COALESCE(CASE WHEN progress_minggu_ini.ket_progress IS NOT NULL
                THEN CASE progress_minggu_ini.ket_progress
                  WHEN 'PTV' THEN 20 WHEN 'MOS' THEN 80 WHEN 'INS' THEN 95 WHEN 'TC' THEN 100 ELSE 0 END
                ELSE CASE progress_kumulatif.ket_progress
                  WHEN 'PTV' THEN 20 WHEN 'MOS' THEN 80 WHEN 'INS' THEN 95 WHEN 'TC' THEN 100 ELSE 0 END END,0)
            ELSE 100 END),4) = 0
        THEN '' ELSE TO_CHAR(ROUND(((COALESCE(real_kumulatif.total_qty_actual, 0) + COALESCE(real_minggu_ini.total_qty_actual, 0))
          * ro.priceactual / NULLIF(ro.linenetamt, 0)
          * (ro.linenetamt / NULLIF(total.total_amount, 0))
          * CASE WHEN ro.ismaterial = 'Y' THEN
              COALESCE(CASE WHEN progress_minggu_ini.ket_progress IS NOT NULL
                THEN CASE progress_minggu_ini.ket_progress
                  WHEN 'PTV' THEN 20 WHEN 'MOS' THEN 80 WHEN 'INS' THEN 95 WHEN 'TC' THEN 100 ELSE 0 END
                ELSE CASE progress_kumulatif.ket_progress
                  WHEN 'PTV' THEN 20 WHEN 'MOS' THEN 80 WHEN 'INS' THEN 95 WHEN 'TC' THEN 100 ELSE 0 END END,0)
            ELSE 100 END),4),'FM999990.0000') || '%'
      END AS "cumthisweek"

    FROM robprj_orab ro
    LEFT JOIN c_uom cu ON ro.c_uom_id = cu.c_uom_id
    JOIN total ON 1=1

    -- Realisasi minggu ini
    LEFT JOIN LATERAL (
      SELECT SUM(COALESCE(rp.qty, 0)) AS total_qty_actual
      FROM robprj_parealisasi rp
      JOIN robprj_projectactivity pa ON rp.robprj_projectactivity_id = pa.robprj_projectactivity_id
      WHERE rp.wbscode = ro.wbscode
        AND pa.c_project_id = $1
        AND pa.activitydate BETWEEN $2 AND $3
    ) real_minggu_ini ON TRUE

    -- Progress minggu ini
    LEFT JOIN LATERAL (
      SELECT rp.ket_progress
      FROM robprj_parealisasi rp
      JOIN robprj_projectactivity pa ON rp.robprj_projectactivity_id = pa.robprj_projectactivity_id
      WHERE rp.wbscode = ro.wbscode
        AND pa.c_project_id = $1
        AND pa.activitydate BETWEEN $2 AND $3
      ORDER BY pa.activitydate DESC
      LIMIT 1
    ) progress_minggu_ini ON TRUE

    -- Realisasi kumulatif
    LEFT JOIN LATERAL (
      SELECT SUM(COALESCE(rp.qty, 0)) AS total_qty_actual
      FROM robprj_parealisasi rp
      JOIN robprj_projectactivity pa ON rp.robprj_projectactivity_id = pa.robprj_projectactivity_id
      WHERE rp.wbscode = ro.wbscode
        AND pa.c_project_id = $1
        AND pa.activitydate < $2
    ) real_kumulatif ON TRUE

    -- Progress kumulatif
    LEFT JOIN LATERAL (
      SELECT rp.ket_progress
      FROM robprj_parealisasi rp
      JOIN robprj_projectactivity pa ON rp.robprj_projectactivity_id = pa.robprj_projectactivity_id
      WHERE rp.wbscode = ro.wbscode
        AND pa.c_project_id = $1
        AND pa.activitydate < $2
      ORDER BY pa.activitydate DESC
      LIMIT 1
    ) progress_kumulatif ON TRUE

    WHERE ro.c_order_id IN (
      SELECT co2.c_order_id
      FROM c_order co2
      WHERE co2.c_project_id = $1
        AND co2.issotrx = 'Y'
    )
    ORDER BY ro.line ASC;
  `;

  try {
    const result = await pool.query(query, [projectId, dateFrom, dateTo]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error executing progress query:', error);
    res.status(500).json({ error: 'Database query failed', details: error.message });
  }
});

// Total Query Endpoint
app.post('/api/query/total', verifyAuth, async (req, res) => {
  const { projectId, dateFrom, dateTo } = req.body;

  const query = `
    WITH total AS (
      SELECT SUM(linenetamt) AS total_amount
      FROM robprj_orab ro
      WHERE ro.c_order_id IN (
        SELECT co2.c_order_id
        FROM c_order co2
        WHERE co2.c_project_id = $1
          AND co2.issotrx = 'Y'
      )
    ),

    progress_data AS (
      SELECT
        ROW_NUMBER() OVER (ORDER BY ro.line) AS no,
        ro.col2,
        cu.name AS satuan,
        CASE
          WHEN ro.qty = 0 THEN ''
          ELSE TO_CHAR(ro.qty, 'FM999990.########')
        END AS boq,

        /* ================= BOBOT ================= */
        (ro.linenetamt / NULLIF(total.total_amount,0)) * 100 AS bobot,

        /* ================= THIS WEEK ================= */
        (
          COALESCE(real_minggu_ini.total_qty_actual,0)
          * ro.priceactual / NULLIF(ro.linenetamt,0)
          * (ro.linenetamt / NULLIF(total.total_amount,0))
          * CASE WHEN ro.ismaterial = 'Y' THEN
              COALESCE(CASE progress_minggu_ini.ket_progress
                WHEN 'PTV' THEN 20 WHEN 'MOS' THEN 80 WHEN 'INS' THEN 95 WHEN 'TC' THEN 100 ELSE 0 END,0)
            ELSE 100 END
        ) AS thisweek,

        /* ================= CUM LAST WEEK ================= */
        (
          COALESCE(real_kumulatif.total_qty_actual,0)
          * ro.priceactual / NULLIF(ro.linenetamt,0)
          * (ro.linenetamt / NULLIF(total.total_amount,0))
          * CASE WHEN ro.ismaterial = 'Y' THEN
              COALESCE(CASE progress_kumulatif.ket_progress
                WHEN 'PTV' THEN 20 WHEN 'MOS' THEN 80 WHEN 'INS' THEN 95 WHEN 'TC' THEN 100 ELSE 0 END,0)
            ELSE 100 END
        ) AS cumlastweek,

        /* ================= CUM THIS WEEK ================= */
        (
          (COALESCE(real_kumulatif.total_qty_actual,0) + COALESCE(real_minggu_ini.total_qty_actual,0))
          * ro.priceactual / NULLIF(ro.linenetamt,0)
          * (ro.linenetamt / NULLIF(total.total_amount,0))
          * CASE WHEN ro.ismaterial = 'Y' THEN
              COALESCE(CASE
                WHEN progress_minggu_ini.ket_progress IS NOT NULL THEN
                  CASE progress_minggu_ini.ket_progress
                    WHEN 'PTV' THEN 20 WHEN 'MOS' THEN 80 WHEN 'INS' THEN 95 WHEN 'TC' THEN 100 ELSE 0 END
                ELSE
                  CASE progress_kumulatif.ket_progress
                    WHEN 'PTV' THEN 20 WHEN 'MOS' THEN 80 WHEN 'INS' THEN 95 WHEN 'TC' THEN 100 ELSE 0 END
              END,0)
            ELSE 100 END
        ) AS cumthisweek

      FROM robprj_orab ro
      LEFT JOIN c_uom cu ON ro.c_uom_id = cu.c_uom_id
      JOIN total ON 1=1

      LEFT JOIN LATERAL (
        SELECT SUM(COALESCE(rp.qty,0)) AS total_qty_actual
        FROM robprj_parealisasi rp
        JOIN robprj_projectactivity pa ON rp.robprj_projectactivity_id = pa.robprj_projectactivity_id
        WHERE rp.wbscode = ro.wbscode
          AND pa.c_project_id = $1
          AND pa.activitydate BETWEEN $2 AND $3
      ) real_minggu_ini ON TRUE

      LEFT JOIN LATERAL (
        SELECT rp.ket_progress
        FROM robprj_parealisasi rp
        JOIN robprj_projectactivity pa ON rp.robprj_projectactivity_id = pa.robprj_projectactivity_id
        WHERE rp.wbscode = ro.wbscode
          AND pa.c_project_id = $1
          AND pa.activitydate BETWEEN $2 AND $3
        ORDER BY pa.activitydate DESC
        LIMIT 1
      ) progress_minggu_ini ON TRUE

      LEFT JOIN LATERAL (
        SELECT SUM(COALESCE(rp.qty,0)) AS total_qty_actual
        FROM robprj_parealisasi rp
        JOIN robprj_projectactivity pa ON rp.robprj_projectactivity_id = pa.robprj_projectactivity_id
        WHERE rp.wbscode = ro.wbscode
          AND pa.c_project_id = $1
          AND pa.activitydate < $2
      ) real_kumulatif ON TRUE

      LEFT JOIN LATERAL (
        SELECT rp.ket_progress
        FROM robprj_parealisasi rp
        JOIN robprj_projectactivity pa ON rp.robprj_projectactivity_id = pa.robprj_projectactivity_id
        WHERE rp.wbscode = ro.wbscode
          AND pa.c_project_id = $1
          AND pa.activitydate < $2
        ORDER BY pa.activitydate DESC
        LIMIT 1
      ) progress_kumulatif ON TRUE

      WHERE ro.c_order_id IN (
        SELECT co2.c_order_id
        FROM c_order co2
        WHERE co2.c_project_id = $1
          AND co2.issotrx = 'Y'
      )
    )

    SELECT
      TO_CHAR(LEAST(ROUND(SUM(bobot),4),100),'FM999990.0000') || '%' AS totalbobot,
      TO_CHAR(ROUND(SUM(thisweek),4),'FM999990.0000') || '%' AS totalthisweek,
      TO_CHAR(ROUND(SUM(cumlastweek),4),'FM999990.0000') || '%' AS totalcumlastweek,
      TO_CHAR(ROUND(SUM(cumthisweek),4),'FM999990.0000') || '%' AS totalcumthisweek
    FROM progress_data;
  `;

  try {
    const result = await pool.query(query, [projectId, dateFrom, dateTo]);
    res.json(result.rows[0] || {});
  } catch (error) {
    console.error('Error executing total query:', error);
    res.status(500).json({ error: 'Database query failed', details: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
const server = app.listen(port, () => {
  console.log(`Backend server running on port ${port}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} sudah dipakai. Coba matikan proses lama.`);
    process.exit(1);
  }
});