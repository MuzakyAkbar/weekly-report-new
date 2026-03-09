package com.tatahuy.report.model;

public class QueryRequest {
    private String projectId;
    private String dateFrom;
    private String dateTo;

    public String getProjectId() { return projectId; }
    public void setProjectId(String projectId) { this.projectId = projectId; }

    public String getDateFrom() { return dateFrom; }
    public void setDateFrom(String dateFrom) { this.dateFrom = dateFrom; }

    public String getDateTo() { return dateTo; }
    public void setDateTo(String dateTo) { this.dateTo = dateTo; }

    public boolean isValid() {
        return projectId != null && !projectId.isEmpty()
            && dateFrom != null && !dateFrom.isEmpty()
            && dateTo != null && !dateTo.isEmpty();
    }
}
