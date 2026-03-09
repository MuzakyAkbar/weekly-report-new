package com.tatahuy.report.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class QueryService {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    // =============================================
    // SQL: Progress per item
    // Sama persis dengan server.js — pakai $1,$2,$3
    // Di Java, tiap ? diisi satu per satu sesuai urutan
    // =============================================
    private static final String PROGRESS_SQL =
        "WITH total AS (\n" +
        "  SELECT SUM(linenetamt) AS total_amount\n" +
        "  FROM robprj_orab ro\n" +
        "  WHERE ro.c_order_id IN (\n" +
        "    SELECT co2.c_order_id FROM c_order co2\n" +
        "    WHERE co2.c_project_id = ? AND co2.issotrx = 'Y'\n" +
        "  )\n" +
        ")\n" +
        "SELECT\n" +
        "  ROW_NUMBER() OVER (ORDER BY ro.line) AS \"no\",\n" +
        "  ro.col2 AS \"col2\",\n" +
        "  cu.\"name\" AS \"satuan\",\n" +
        "  CASE WHEN ro.qty = 0 THEN '' ELSE TO_CHAR(ro.qty, 'FM999990.########') END AS \"boq\",\n" +
        "  CASE\n" +
        "    WHEN ROUND((ro.linenetamt / total.total_amount) * 100, 4) = 0 THEN ''\n" +
        "    ELSE TO_CHAR(ROUND((ro.linenetamt / total.total_amount) * 100, 4), 'FM999990.0000') || '%'\n" +
        "  END AS \"bobot\",\n" +

        // THIS WEEK
        "  CASE\n" +
        "    WHEN ROUND((COALESCE(real_minggu_ini.total_qty_actual, 0)\n" +
        "      * ro.priceactual / NULLIF(ro.linenetamt, 0)\n" +
        "      * (ro.linenetamt / NULLIF(total.total_amount, 0))\n" +
        "      * CASE WHEN ro.ismaterial = 'Y' THEN\n" +
        "          COALESCE(CASE progress_minggu_ini.ket_progress\n" +
        "            WHEN 'PTV' THEN 20 WHEN 'MOS' THEN 80 WHEN 'INS' THEN 95 WHEN 'TC' THEN 100 ELSE 0 END, 0)\n" +
        "        ELSE 100 END), 4) = 0\n" +
        "    THEN '' ELSE TO_CHAR(ROUND((COALESCE(real_minggu_ini.total_qty_actual, 0)\n" +
        "      * ro.priceactual / NULLIF(ro.linenetamt, 0)\n" +
        "      * (ro.linenetamt / NULLIF(total.total_amount, 0))\n" +
        "      * CASE WHEN ro.ismaterial = 'Y' THEN\n" +
        "          COALESCE(CASE progress_minggu_ini.ket_progress\n" +
        "            WHEN 'PTV' THEN 20 WHEN 'MOS' THEN 80 WHEN 'INS' THEN 95 WHEN 'TC' THEN 100 ELSE 0 END, 0)\n" +
        "        ELSE 100 END), 4), 'FM999990.0000') || '%'\n" +
        "  END AS \"thisweek\",\n" +

        // CUMULATIVE LAST WEEK
        "  CASE\n" +
        "    WHEN ROUND((COALESCE(real_kumulatif.total_qty_actual, 0)\n" +
        "      * ro.priceactual / NULLIF(ro.linenetamt, 0)\n" +
        "      * (ro.linenetamt / NULLIF(total.total_amount, 0))\n" +
        "      * CASE WHEN ro.ismaterial = 'Y' THEN\n" +
        "          COALESCE(CASE progress_kumulatif.ket_progress\n" +
        "            WHEN 'PTV' THEN 20 WHEN 'MOS' THEN 80 WHEN 'INS' THEN 95 WHEN 'TC' THEN 100 ELSE 0 END, 0)\n" +
        "        ELSE 100 END), 4) = 0\n" +
        "    THEN '' ELSE TO_CHAR(ROUND((COALESCE(real_kumulatif.total_qty_actual, 0)\n" +
        "      * ro.priceactual / NULLIF(ro.linenetamt, 0)\n" +
        "      * (ro.linenetamt / NULLIF(total.total_amount, 0))\n" +
        "      * CASE WHEN ro.ismaterial = 'Y' THEN\n" +
        "          COALESCE(CASE progress_kumulatif.ket_progress\n" +
        "            WHEN 'PTV' THEN 20 WHEN 'MOS' THEN 80 WHEN 'INS' THEN 95 WHEN 'TC' THEN 100 ELSE 0 END, 0)\n" +
        "        ELSE 100 END), 4), 'FM999990.0000') || '%'\n" +
        "  END AS \"cumlastweek\",\n" +

        // CUMULATIVE THIS WEEK
        "  CASE\n" +
        "    WHEN ROUND(((COALESCE(real_kumulatif.total_qty_actual, 0) + COALESCE(real_minggu_ini.total_qty_actual, 0))\n" +
        "      * ro.priceactual / NULLIF(ro.linenetamt, 0)\n" +
        "      * (ro.linenetamt / NULLIF(total.total_amount, 0))\n" +
        "      * CASE WHEN ro.ismaterial = 'Y' THEN\n" +
        "          COALESCE(CASE WHEN progress_minggu_ini.ket_progress IS NOT NULL\n" +
        "            THEN CASE progress_minggu_ini.ket_progress\n" +
        "              WHEN 'PTV' THEN 20 WHEN 'MOS' THEN 80 WHEN 'INS' THEN 95 WHEN 'TC' THEN 100 ELSE 0 END\n" +
        "            ELSE CASE progress_kumulatif.ket_progress\n" +
        "              WHEN 'PTV' THEN 20 WHEN 'MOS' THEN 80 WHEN 'INS' THEN 95 WHEN 'TC' THEN 100 ELSE 0 END\n" +
        "          END, 0)\n" +
        "        ELSE 100 END), 4) = 0\n" +
        "    THEN '' ELSE TO_CHAR(ROUND(((COALESCE(real_kumulatif.total_qty_actual, 0) + COALESCE(real_minggu_ini.total_qty_actual, 0))\n" +
        "      * ro.priceactual / NULLIF(ro.linenetamt, 0)\n" +
        "      * (ro.linenetamt / NULLIF(total.total_amount, 0))\n" +
        "      * CASE WHEN ro.ismaterial = 'Y' THEN\n" +
        "          COALESCE(CASE WHEN progress_minggu_ini.ket_progress IS NOT NULL\n" +
        "            THEN CASE progress_minggu_ini.ket_progress\n" +
        "              WHEN 'PTV' THEN 20 WHEN 'MOS' THEN 80 WHEN 'INS' THEN 95 WHEN 'TC' THEN 100 ELSE 0 END\n" +
        "            ELSE CASE progress_kumulatif.ket_progress\n" +
        "              WHEN 'PTV' THEN 20 WHEN 'MOS' THEN 80 WHEN 'INS' THEN 95 WHEN 'TC' THEN 100 ELSE 0 END\n" +
        "          END, 0)\n" +
        "        ELSE 100 END), 4), 'FM999990.0000') || '%'\n" +
        "  END AS \"cumthisweek\"\n" +

        "FROM robprj_orab ro\n" +
        "LEFT JOIN c_uom cu ON ro.c_uom_id = cu.c_uom_id\n" +
        "JOIN total ON 1=1\n" +

        // Realisasi minggu ini
        "LEFT JOIN LATERAL (\n" +
        "  SELECT SUM(COALESCE(rp.qty, 0)) AS total_qty_actual\n" +
        "  FROM robprj_parealisasi rp\n" +
        "  JOIN robprj_projectactivity pa ON rp.robprj_projectactivity_id = pa.robprj_projectactivity_id\n" +
        "  WHERE rp.wbscode = ro.wbscode AND pa.c_project_id = ? AND pa.activitydate BETWEEN ?::date AND ?::date\n" +
        ") real_minggu_ini ON TRUE\n" +

        // Progress minggu ini
        "LEFT JOIN LATERAL (\n" +
        "  SELECT rp.ket_progress\n" +
        "  FROM robprj_parealisasi rp\n" +
        "  JOIN robprj_projectactivity pa ON rp.robprj_projectactivity_id = pa.robprj_projectactivity_id\n" +
        "  WHERE rp.wbscode = ro.wbscode AND pa.c_project_id = ? AND pa.activitydate BETWEEN ?::date AND ?::date\n" +
        "  ORDER BY pa.activitydate DESC LIMIT 1\n" +
        ") progress_minggu_ini ON TRUE\n" +

        // Realisasi kumulatif
        "LEFT JOIN LATERAL (\n" +
        "  SELECT SUM(COALESCE(rp.qty, 0)) AS total_qty_actual\n" +
        "  FROM robprj_parealisasi rp\n" +
        "  JOIN robprj_projectactivity pa ON rp.robprj_projectactivity_id = pa.robprj_projectactivity_id\n" +
        "  WHERE rp.wbscode = ro.wbscode AND pa.c_project_id = ? AND pa.activitydate < ?::date\n" +
        ") real_kumulatif ON TRUE\n" +

        // Progress kumulatif
        "LEFT JOIN LATERAL (\n" +
        "  SELECT rp.ket_progress\n" +
        "  FROM robprj_parealisasi rp\n" +
        "  JOIN robprj_projectactivity pa ON rp.robprj_projectactivity_id = pa.robprj_projectactivity_id\n" +
        "  WHERE rp.wbscode = ro.wbscode AND pa.c_project_id = ? AND pa.activitydate < ?::date\n" +
        "  ORDER BY pa.activitydate DESC LIMIT 1\n" +
        ") progress_kumulatif ON TRUE\n" +

        "WHERE ro.c_order_id IN (\n" +
        "  SELECT co2.c_order_id FROM c_order co2\n" +
        "  WHERE co2.c_project_id = ? AND co2.issotrx = 'Y'\n" +
        ")\n" +
        "ORDER BY ro.line ASC";

    // =============================================
    // SQL: Total keseluruhan progress
    // Sama persis dengan server.js — CTE total tidak nested
    // =============================================
    private static final String TOTAL_SQL =
        "WITH total AS (\n" +
        "  SELECT SUM(linenetamt) AS total_amount\n" +
        "  FROM robprj_orab ro\n" +
        "  WHERE ro.c_order_id IN (\n" +
        "    SELECT co2.c_order_id FROM c_order co2\n" +
        "    WHERE co2.c_project_id = ? AND co2.issotrx = 'Y'\n" +
        "  )\n" +
        "),\n" +
        "progress_data AS (\n" +
        "  SELECT\n" +
        "    (ro.linenetamt / NULLIF(total.total_amount, 0)) * 100 AS bobot,\n" +

        "    (\n" +
        "      COALESCE(real_minggu_ini.total_qty_actual, 0)\n" +
        "      * ro.priceactual / NULLIF(ro.linenetamt, 0)\n" +
        "      * (ro.linenetamt / NULLIF(total.total_amount, 0))\n" +
        "      * CASE WHEN ro.ismaterial = 'Y' THEN\n" +
        "          COALESCE(CASE progress_minggu_ini.ket_progress\n" +
        "            WHEN 'PTV' THEN 20 WHEN 'MOS' THEN 80 WHEN 'INS' THEN 95 WHEN 'TC' THEN 100 ELSE 0 END, 0)\n" +
        "        ELSE 100 END\n" +
        "    ) AS thisweek,\n" +

        "    (\n" +
        "      COALESCE(real_kumulatif.total_qty_actual, 0)\n" +
        "      * ro.priceactual / NULLIF(ro.linenetamt, 0)\n" +
        "      * (ro.linenetamt / NULLIF(total.total_amount, 0))\n" +
        "      * CASE WHEN ro.ismaterial = 'Y' THEN\n" +
        "          COALESCE(CASE progress_kumulatif.ket_progress\n" +
        "            WHEN 'PTV' THEN 20 WHEN 'MOS' THEN 80 WHEN 'INS' THEN 95 WHEN 'TC' THEN 100 ELSE 0 END, 0)\n" +
        "        ELSE 100 END\n" +
        "    ) AS cumlastweek,\n" +

        "    (\n" +
        "      (COALESCE(real_kumulatif.total_qty_actual, 0) + COALESCE(real_minggu_ini.total_qty_actual, 0))\n" +
        "      * ro.priceactual / NULLIF(ro.linenetamt, 0)\n" +
        "      * (ro.linenetamt / NULLIF(total.total_amount, 0))\n" +
        "      * CASE WHEN ro.ismaterial = 'Y' THEN\n" +
        "          COALESCE(CASE\n" +
        "            WHEN progress_minggu_ini.ket_progress IS NOT NULL THEN\n" +
        "              CASE progress_minggu_ini.ket_progress\n" +
        "                WHEN 'PTV' THEN 20 WHEN 'MOS' THEN 80 WHEN 'INS' THEN 95 WHEN 'TC' THEN 100 ELSE 0 END\n" +
        "            ELSE\n" +
        "              CASE progress_kumulatif.ket_progress\n" +
        "                WHEN 'PTV' THEN 20 WHEN 'MOS' THEN 80 WHEN 'INS' THEN 95 WHEN 'TC' THEN 100 ELSE 0 END\n" +
        "          END, 0)\n" +
        "        ELSE 100 END\n" +
        "    ) AS cumthisweek\n" +

        "  FROM robprj_orab ro\n" +
        "  LEFT JOIN c_uom cu ON ro.c_uom_id = cu.c_uom_id\n" +
        "  JOIN total ON 1=1\n" +

        "  LEFT JOIN LATERAL (\n" +
        "    SELECT SUM(COALESCE(rp.qty, 0)) AS total_qty_actual\n" +
        "    FROM robprj_parealisasi rp\n" +
        "    JOIN robprj_projectactivity pa ON rp.robprj_projectactivity_id = pa.robprj_projectactivity_id\n" +
        "    WHERE rp.wbscode = ro.wbscode AND pa.c_project_id = ? AND pa.activitydate BETWEEN ?::date AND ?::date\n" +
        "  ) real_minggu_ini ON TRUE\n" +

        "  LEFT JOIN LATERAL (\n" +
        "    SELECT rp.ket_progress\n" +
        "    FROM robprj_parealisasi rp\n" +
        "    JOIN robprj_projectactivity pa ON rp.robprj_projectactivity_id = pa.robprj_projectactivity_id\n" +
        "    WHERE rp.wbscode = ro.wbscode AND pa.c_project_id = ? AND pa.activitydate BETWEEN ?::date AND ?::date\n" +
        "    ORDER BY pa.activitydate DESC LIMIT 1\n" +
        "  ) progress_minggu_ini ON TRUE\n" +

        "  LEFT JOIN LATERAL (\n" +
        "    SELECT SUM(COALESCE(rp.qty, 0)) AS total_qty_actual\n" +
        "    FROM robprj_parealisasi rp\n" +
        "    JOIN robprj_projectactivity pa ON rp.robprj_projectactivity_id = pa.robprj_projectactivity_id\n" +
        "    WHERE rp.wbscode = ro.wbscode AND pa.c_project_id = ? AND pa.activitydate < ?::date\n" +
        "  ) real_kumulatif ON TRUE\n" +

        "  LEFT JOIN LATERAL (\n" +
        "    SELECT rp.ket_progress\n" +
        "    FROM robprj_parealisasi rp\n" +
        "    JOIN robprj_projectactivity pa ON rp.robprj_projectactivity_id = pa.robprj_projectactivity_id\n" +
        "    WHERE rp.wbscode = ro.wbscode AND pa.c_project_id = ? AND pa.activitydate < ?::date\n" +
        "    ORDER BY pa.activitydate DESC LIMIT 1\n" +
        "  ) progress_kumulatif ON TRUE\n" +

        "  WHERE ro.c_order_id IN (\n" +
        "    SELECT co2.c_order_id FROM c_order co2\n" +
        "    WHERE co2.c_project_id = ? AND co2.issotrx = 'Y'\n" +
        "  )\n" +
        ")\n" +
        "SELECT\n" +
        "  TO_CHAR(LEAST(ROUND(SUM(bobot), 4), 100), 'FM999990.0000') || '%' AS totalbobot,\n" +
        "  TO_CHAR(ROUND(SUM(thisweek), 4), 'FM999990.0000') || '%' AS totalthisweek,\n" +
        "  TO_CHAR(ROUND(SUM(cumlastweek), 4), 'FM999990.0000') || '%' AS totalcumlastweek,\n" +
        "  TO_CHAR(ROUND(SUM(cumthisweek), 4), 'FM999990.0000') || '%' AS totalcumthisweek\n" +
        "FROM progress_data";

    // =============================================
    // Urutan parameter PROGRESS_SQL (9 parameter):
    //   ?, = projectId       → total CTE
    //   ?, ?, ?              → projectId, dateFrom, dateTo  → real_minggu_ini
    //   ?, ?, ?              → projectId, dateFrom, dateTo  → progress_minggu_ini
    //   ?, ?                 → projectId, dateFrom          → real_kumulatif
    //   ?, ?                 → projectId, dateFrom          → progress_kumulatif
    //   ?                    → projectId                    → WHERE
    // Total: 1+3+3+2+2+1 = 12 parameter
    // =============================================
    public List<Map<String, Object>> getProgress(String projectId, String dateFrom, String dateTo) {
        return jdbcTemplate.queryForList(PROGRESS_SQL,
            projectId,                    // total CTE
            projectId, dateFrom, dateTo,  // real_minggu_ini
            projectId, dateFrom, dateTo,  // progress_minggu_ini
            projectId, dateFrom,          // real_kumulatif
            projectId, dateFrom,          // progress_kumulatif
            projectId                     // WHERE filter
        );
    }

    // =============================================
    // Urutan parameter TOTAL_SQL (11 parameter):
    //   ?                    → projectId                    → total CTE
    //   ?, ?, ?              → projectId, dateFrom, dateTo  → real_minggu_ini
    //   ?, ?, ?              → projectId, dateFrom, dateTo  → progress_minggu_ini
    //   ?, ?                 → projectId, dateFrom          → real_kumulatif
    //   ?, ?                 → projectId, dateFrom          → progress_kumulatif
    //   ?                    → projectId                    → WHERE
    // Total: 1+3+3+2+2+1 = 12 parameter
    // =============================================
    public Map<String, Object> getTotal(String projectId, String dateFrom, String dateTo) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(TOTAL_SQL,
            projectId,                    // total CTE
            projectId, dateFrom, dateTo,  // real_minggu_ini
            projectId, dateFrom, dateTo,  // progress_minggu_ini
            projectId, dateFrom,          // real_kumulatif
            projectId, dateFrom,          // progress_kumulatif
            projectId                     // WHERE filter
        );
        return rows.isEmpty() ? java.util.Collections.emptyMap() : rows.get(0);
    }
}