package com.tatahuy.report.controller;

import com.tatahuy.report.model.QueryRequest;
import com.tatahuy.report.service.QueryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;

@RestController
public class ReportController {

    @Autowired
    private QueryService queryService;

    private boolean isAuthorized(String authHeader) {
        return authHeader != null && authHeader.startsWith("Basic ");
    }

    // =============================================
    // GET /health
    // =============================================
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        Map<String, String> resp = new LinkedHashMap<>();
        resp.put("status", "OK");
        resp.put("timestamp", Instant.now().toString());
        return ResponseEntity.ok(resp);
    }

    // =============================================
    // POST /api/query/progress
    // =============================================
    @PostMapping("/api/query/progress")
    public ResponseEntity<?> progress(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody QueryRequest req) {

        if (!isAuthorized(authHeader)) {
            return ResponseEntity.status(401).body(error("Unauthorized"));
        }
        if (!req.isValid()) {
            return ResponseEntity.status(400).body(error("projectId, dateFrom, and dateTo are required"));
        }

        try {
            List<Map<String, Object>> rows = queryService.getProgress(
                req.getProjectId(), req.getDateFrom(), req.getDateTo());
            return ResponseEntity.ok(rows);
        } catch (Exception e) {
            System.err.println("Error executing progress query: " + e.getMessage());
            return ResponseEntity.status(500).body(errorDetail("Database query failed", e.getMessage()));
        }
    }

    // =============================================
    // POST /api/query/total
    // =============================================
    @PostMapping("/api/query/total")
    public ResponseEntity<?> total(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody QueryRequest req) {

        if (!isAuthorized(authHeader)) {
            return ResponseEntity.status(401).body(error("Unauthorized"));
        }
        if (!req.isValid()) {
            return ResponseEntity.status(400).body(error("projectId, dateFrom, and dateTo are required"));
        }

        try {
            Map<String, Object> row = queryService.getTotal(
                req.getProjectId(), req.getDateFrom(), req.getDateTo());
            return ResponseEntity.ok(row);
        } catch (Exception e) {
            System.err.println("Error executing total query: " + e.getMessage());
            return ResponseEntity.status(500).body(errorDetail("Database query failed", e.getMessage()));
        }
    }

    // =============================================
    // POST /api/query/projectdetail
    // =============================================
    @PostMapping("/api/query/projectdetail")
    public ResponseEntity<?> projectDetail(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody Map<String, String> body) {

        if (!isAuthorized(authHeader)) {
            return ResponseEntity.status(401).body(error("Unauthorized"));
        }

        String projectId = body.get("projectId");
        if (projectId == null || projectId.isBlank()) {
            return ResponseEntity.status(400).body(error("projectId is required"));
        }

        try {
            Map<String, Object> detail = queryService.getProjectDetail(projectId);
            return ResponseEntity.ok(detail);
        } catch (Exception e) {
            System.err.println("Error fetching project detail: " + e.getMessage());
            return ResponseEntity.status(500).body(errorDetail("Database query failed", e.getMessage()));
        }
    }

    // =============================================
    // Helpers
    // =============================================
    private Map<String, String> error(String message) {
        Map<String, String> map = new HashMap<>();
        map.put("error", message);
        return map;
    }

    private Map<String, String> errorDetail(String message, String detail) {
        Map<String, String> map = new HashMap<>();
        map.put("error", message);
        map.put("details", detail);
        return map;
    }
}