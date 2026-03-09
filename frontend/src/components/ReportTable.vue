<template>
  <div v-if="reportStore.progressData.length > 0" class="report-container">
    <div class="report-header">
      <h2>Weekly Activity Report (DAR)</h2>
    </div>

    <div class="table-wrapper">
      <table class="report-table">
        <thead>
          <tr>
            <th rowspan="2">No</th>
            <th rowspan="2">Pekerjaan</th>
            <th rowspan="2">Satuan</th>
            <th rowspan="2">BOQ</th>
            <th rowspan="2">Bobot</th>
            <th colspan="3">Progress (%)</th>
          </tr>
          <tr>
            <th>This Week</th>
            <th>Cum. Last Week</th>
            <th>Cum. This Week</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in reportStore.progressData" :key="row.no">
            <td class="text-center">{{ row.no }}</td>
            <td>{{ row.col2 }}</td>
            <td class="text-center">{{ row.satuan }}</td>
            <td class="text-right">{{ row.boq }}</td>
            <td class="text-right">{{ row.bobot }}</td>
            <td class="text-right progress-cell">{{ row.thisweek }}</td>
            <td class="text-right progress-cell">{{ row.cumlastweek }}</td>
            <td class="text-right progress-cell">{{ row.cumthisweek }}</td>
          </tr>
        </tbody>
        <tfoot v-if="reportStore.totalData">
          <tr class="total-row">
            <td colspan="4" class="text-right"><strong>TOTAL</strong></td>
            <td class="text-right"><strong>{{ reportStore.totalData.totalbobot }}</strong></td>
            <td class="text-right"><strong>{{ reportStore.totalData.totalthisweek }}</strong></td>
            <td class="text-right"><strong>{{ reportStore.totalData.totalcumlastweek }}</strong></td>
            <td class="text-right"><strong>{{ reportStore.totalData.totalcumthisweek }}</strong></td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
  
  <div v-else-if="!reportStore.loading" class="no-data">
    <p>Silakan pilih project dan tanggal untuk menampilkan report</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useReportStore } from '../stores/report'
import { exportToExcel, exportToPDF, printReport } from '../services/export'

const reportStore = useReportStore()

const selectedProjectName = computed(() => {
  if (!reportStore.selectedProject) return ''
  const project = reportStore.projects.find(p => p.id === reportStore.selectedProject)
  return project ? project.name : ''
})

const handleExportExcel = () => {
  if (!reportStore.progressData.length || !reportStore.totalData) {
    alert('Tidak ada data untuk di-export')
    return
  }
  
  exportToExcel(
    reportStore.progressData,
    reportStore.totalData,
    selectedProjectName.value,
    reportStore.dateFrom,
    reportStore.dateTo
  )
}

const handleExportPDF = () => {
  if (!reportStore.progressData.length || !reportStore.totalData) {
    alert('Tidak ada data untuk di-export')
    return
  }
  
  exportToPDF(
    reportStore.progressData,
    reportStore.totalData,
    selectedProjectName.value,
    reportStore.dateFrom,
    reportStore.dateTo
  )
}

const handlePrint = () => {
  if (!reportStore.progressData.length || !reportStore.totalData) {
    alert('Tidak ada data untuk di-print')
    return
  }
  
  printReport(
    reportStore.progressData,
    reportStore.totalData,
    selectedProjectName.value,
    reportStore.dateFrom,
    reportStore.dateTo
  )
}
</script>

<style scoped>
.report-container {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.report-header h2 {
  color: #333;
  margin: 0;
}

.export-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.btn-export {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.btn-export:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.btn-export:active {
  transform: translateY(0);
}

.btn-export.excel {
  background: #10b981;
}

.btn-export.excel:hover {
  background: #059669;
}

.btn-export.pdf {
  background: #ef4444;
}

.btn-export.pdf:hover {
  background: #dc2626;
}

.btn-export.print {
  background: #667eea;
}

.btn-export.print:hover {
  background: #5568d3;
}

.btn-export svg {
  width: 16px;
  height: 16px;
}

.table-wrapper {
  overflow-x: auto;
}

.report-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.report-table th,
.report-table td {
  padding: 0.75rem;
  border: 1px solid #ddd;
}

.report-table thead th {
  background: #667eea;
  color: white;
  font-weight: 600;
  text-align: center;
  position: sticky;
  top: 0;
  z-index: 10;
}

.report-table tbody tr:nth-child(even) {
  background: #f9fafb;
}

.report-table tbody tr:hover {
  background: #f3f4f6;
}

.text-center {
  text-align: center;
}

.text-right {
  text-align: right;
}

.progress-cell {
  color: #059669;
  font-weight: 500;
}

.total-row {
  background: #f3f4f6 !important;
  font-weight: 600;
}

.total-row td {
  border-top: 2px solid #667eea;
}

.no-data {
  background: white;
  padding: 3rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.no-data p {
  color: #666;
  font-size: 1.1rem;
}

@media (max-width: 768px) {
  .report-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .export-buttons {
    justify-content: stretch;
  }
  
  .btn-export {
    flex: 1;
    justify-content: center;
  }
}
</style>