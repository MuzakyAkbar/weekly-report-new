<template>
  <div class="report-view">
    <LoginForm v-if="!reportStore.authenticated" />

    <div v-else class="main-content">
      <header class="app-header">
        <h1>Activity Report</h1>
        <p class="subtitle">Sistem Monitoring Progress Pekerjaan</p>
      </header>

      <!-- ── Tabs ─────────────────────────────────────────────────────────── -->
      <div class="tab-bar">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'weekly' }"
          @click="switchTab('weekly')"
        >
          📅 Weekly Report
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'monthly' }"
          @click="switchTab('monthly')"
        >
          🗓️ Monthly Report
        </button>
      </div>

      <div class="content-wrapper">

        <!-- ── Filter Weekly ─────────────────────────────────────────────── -->
        <div v-if="activeTab === 'weekly'" class="filter-container">
          <h3>Filter Weekly Report</h3>
          <div class="filter-form">
            <div class="form-group">
              <label>Project</label>
              <div class="searchable-select">
                <input
                  type="text"
                  v-model="searchQuery"
                  @focus="handleFocus"
                  @blur="handleBlur"
                  @input="showDropdown = true"
                  placeholder="Ketik untuk mencari project..."
                  class="search-input"
                />
                <div v-if="showDropdown" class="dropdown">
                  <div
                    v-for="project in filteredProjects"
                    :key="project.id"
                    @mousedown.prevent="selectProject(project)"
                    class="dropdown-item"
                    :class="{ selected: reportStore.selectedProject === project.id }"
                  >
                    {{ project.name }}
                  </div>
                  <div v-if="filteredProjects.length === 0" class="dropdown-item disabled">
                    Tidak ada hasil
                  </div>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label>Tanggal Dari</label>
              <input type="date" v-model="reportStore.dateFrom" @change="validateDates" />
            </div>

            <div class="form-group">
              <label>Tanggal Sampai</label>
              <input type="date" v-model="reportStore.dateTo" @change="validateDates" />
              <span v-if="dateError" class="date-error">{{ dateError }}</span>
            </div>

            <button
              @click="handleGenerate"
              :disabled="!canGenerateWeekly"
              class="btn-generate"
            >
              Generate Report
            </button>
          </div>
        </div>

        <!-- ── Filter Monthly ────────────────────────────────────────────── -->
        <div v-if="activeTab === 'monthly'" class="filter-container">
          <h3>Filter Monthly Report</h3>
          <div class="filter-form">
            <div class="form-group">
              <label>Project</label>
              <div class="searchable-select">
                <input
                  type="text"
                  v-model="searchQuery"
                  @focus="handleFocus"
                  @blur="handleBlur"
                  @input="showDropdown = true"
                  placeholder="Ketik untuk mencari project..."
                  class="search-input"
                />
                <div v-if="showDropdown" class="dropdown">
                  <div
                    v-for="project in filteredProjects"
                    :key="project.id"
                    @mousedown.prevent="selectProject(project)"
                    class="dropdown-item"
                    :class="{ selected: reportStore.selectedProject === project.id }"
                  >
                    {{ project.name }}
                  </div>
                  <div v-if="filteredProjects.length === 0" class="dropdown-item disabled">
                    Tidak ada hasil
                  </div>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label>Tanggal Dari</label>
              <input type="date" v-model="calFrom" @change="validateMonthlyDates" />
            </div>

            <div class="form-group">
              <label>Tanggal Sampai</label>
              <input type="date" v-model="calTo" @change="validateMonthlyDates" />
              <span v-if="monthlyDateError" class="date-error">{{ monthlyDateError }}</span>
            </div>

            <button
              @click="handleGenerate"
              :disabled="!canGenerateMonthly"
              class="btn-generate"
            >
              Generate Report
            </button>
          </div>
        </div>

        <!-- ── Error ─────────────────────────────────────────────────────── -->
        <div v-if="reportStore.error" class="error-message">
          {{ reportStore.error }}
        </div>

        <!-- ── Export Bar ─────────────────────────────────────────────────── -->
        <div v-if="reportStore.progressData?.length" class="export-bar">
          <span class="export-label">Export:</span>

          <button class="btn-export btn-pdf"   :disabled="exporting" @click="handleExport('pdf')">
            <span class="btn-icon">📄</span> PDF
            <span v-if="exporting === 'pdf'" class="btn-spinner" />
          </button>

          <button class="btn-export btn-excel" :disabled="exporting" @click="handleExport('excel')">
            <span class="btn-icon">📊</span> Excel
            <span v-if="exporting === 'excel'" class="btn-spinner" />
          </button>

          <button class="btn-export btn-word"  :disabled="exporting" @click="handleExport('word')">
            <span class="btn-icon">📝</span> Word
            <span v-if="exporting === 'word'" class="btn-spinner" />
          </button>

          <button class="btn-export btn-print" :disabled="exporting" @click="handleExport('print')">
            <span class="btn-icon">🖨️</span> Print
            <span v-if="exporting === 'print'" class="btn-spinner" />
          </button>

          <span v-if="exportError" class="export-error">{{ exportError }}</span>
        </div>

        <ReportTable />
      </div>
    </div>

    <LoadingSpinner v-if="reportStore.loading" />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useReportStore } from '../stores/report'
import LoginForm from '../components/LoginForm.vue'
import ReportTable from '../components/ReportTable.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'
import { exportToPDF, exportToExcel, exportToWord, printReport } from '../services/export'

const reportStore = useReportStore()

// ── Tab ─────────────────────────────────────────────────────────────────────
const activeTab = ref('weekly')

function switchTab(tab) {
  activeTab.value = tab
  reportStore.clearReport()
  searchQuery.value = ''
  selectedProjectName.value = ''
  reportStore.selectedProject = null
  calFrom.value = ''
  calTo.value   = ''
  monthlyDateError.value = ''
}

// ── Shared project search ────────────────────────────────────────────────────
const searchQuery         = ref('')
const showDropdown        = ref(false)
const selectedProjectName = ref('')

const filteredProjects = computed(() => {
  if (!searchQuery.value.trim()) return reportStore.projects
  const q = searchQuery.value.toLowerCase()
  return reportStore.projects.filter(p => p.name.toLowerCase().includes(q))
})

const handleFocus = () => {
  showDropdown.value = true
  if (selectedProjectName.value) searchQuery.value = ''
}

const handleBlur = () => {
  setTimeout(() => {
    showDropdown.value = false
    if (reportStore.selectedProject) {
      const sel = reportStore.projects.find(p => p.id === reportStore.selectedProject)
      if (sel) {
        searchQuery.value = sel.name
        selectedProjectName.value = sel.name
      }
    }
  }, 200)
}

const selectProject = (project) => {
  reportStore.selectedProject = project.id
  searchQuery.value = project.name
  selectedProjectName.value = project.name
  showDropdown.value = false
  reportStore.clearReport()
}

watch(() => reportStore.projects, (list) => {
  if (list.length > 0 && reportStore.selectedProject) {
    const sel = list.find(p => p.id === reportStore.selectedProject)
    if (sel) { searchQuery.value = sel.name; selectedProjectName.value = sel.name }
  }
}, { immediate: true })

// ── Monthly filter ───────────────────────────────────────────────────────────
const calFrom = ref('')
const calTo   = ref('')
const monthlyDateError = ref('')

const validateMonthlyDates = () => {
  monthlyDateError.value = ''
  if (!calFrom.value || !calTo.value) return
  if (calTo.value < calFrom.value) {
    monthlyDateError.value = 'Tanggal sampai tidak boleh kurang dari tanggal mulai'
    return
  }
  const diff = (new Date(calTo.value) - new Date(calFrom.value)) / 86400000
  if (diff > 30) {
    monthlyDateError.value = 'Rentang tanggal tidak boleh lebih dari 31 hari'
  }
}

// ── Date validation ──────────────────────────────────────────────────────────
const dateError = ref('')

const validateDates = () => {
  dateError.value = ''
  if (!reportStore.dateFrom || !reportStore.dateTo) return
  if (reportStore.dateTo < reportStore.dateFrom) {
    dateError.value = 'Tanggal sampai tidak boleh kurang dari tanggal mulai'
    return
  }
  const diff = (new Date(reportStore.dateTo) - new Date(reportStore.dateFrom)) / 86400000
  if (diff > 6) {
    dateError.value = 'Rentang tanggal tidak boleh lebih dari 7 hari'
  }
}

// ── Can Generate ─────────────────────────────────────────────────────────────
const canGenerateWeekly  = computed(() =>
  reportStore.selectedProject && reportStore.dateFrom && reportStore.dateTo && !dateError.value
)
const canGenerateMonthly = computed(() =>
  reportStore.selectedProject && calFrom.value && calTo.value && !monthlyDateError.value
)

// ── Generate ─────────────────────────────────────────────────────────────────
const handleGenerate = async () => {
  if (activeTab.value === 'monthly') {
    reportStore.dateFrom = calFrom.value
    reportStore.dateTo   = calTo.value
  }
  await reportStore.loadReportData()
}

// ── Export ───────────────────────────────────────────────────────────────────
const exporting   = ref(null)
const exportError = ref('')

const exportArgs = () => [
  reportStore.progressData,
  reportStore.totalData,
  reportStore.projectName,
  reportStore.dateFrom,
  reportStore.dateTo,
  {
    kodeProyek:    reportStore.kodeProyek    ?? '',
    namaSubProyek: reportStore.namaSubProyek ?? '',
    lokasi:        reportStore.lokasi        ?? '',
    noPO:          reportStore.noPO          ?? '',
  },
  activeTab.value === 'monthly',
]

async function handleExport(type) {
  if (exporting.value) return
  exporting.value   = type
  exportError.value = ''
  try {
    if (type === 'pdf')   await exportToPDF(...exportArgs())
    if (type === 'excel') await exportToExcel(...exportArgs())
    if (type === 'word')  await exportToWord(...exportArgs())
    if (type === 'print') await printReport(...exportArgs())
  } catch (e) {
    console.error('Export error:', e)
    exportError.value = `Gagal export ${type.toUpperCase()}: ${e.message}`
  } finally {
    exporting.value = null
  }
}
</script>

<style scoped>
.report-view {
  min-height: 100vh;
  background: #f5f7fa;
}

.main-content {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.app-header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.app-header h1 {
  color: #333;
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: #666;
  font-size: 1.1rem;
}

/* ── Tab Bar ─────────────────────────────────────────────────────────────── */
.tab-bar {
  display: flex;
  gap: 0;
  margin-bottom: 0;
  border-bottom: 2px solid #667eea;
}

.tab-btn {
  padding: 0.65rem 1.75rem;
  border: 2px solid transparent;
  border-bottom: none;
  border-radius: 8px 8px 0 0;
  background: #e8eaf6;
  color: #555;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  margin-bottom: -2px;
}

.tab-btn:hover:not(.active) {
  background: #d1d5f7;
}

.tab-btn.active {
  background: #fff;
  color: #667eea;
  border-color: #667eea;
  border-bottom-color: #fff;
}

/* ── Content ─────────────────────────────────────────────────────────────── */
.content-wrapper {
  background: #fff;
  border: 2px solid #667eea;
  border-top: none;
  border-radius: 0 0 8px 8px;
  padding: 1.5rem;
}

/* ── Filter ──────────────────────────────────────────────────────────────── */
.filter-container {
  margin-bottom: 1.5rem;
}

.filter-container h3 {
  margin-bottom: 1rem;
  color: #333;
}

.filter-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  align-items: end;
}

.form-group {
  display: flex;
  flex-direction: column;
  position: relative;
}

.form-group label {
  margin-bottom: 0.5rem;
  color: #555;
  font-weight: 500;
  font-size: 0.9rem;
}

.searchable-select { position: relative; width: 100%; }

.search-input,
.form-group select,
.form-group input[type="date"] {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.3s;
  box-sizing: border-box;
}

.search-input:focus,
.form-group select:focus,
.form-group input[type="date"]:focus {
  outline: none;
  border-color: #667eea;
}

.dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-top: none;
  border-radius: 0 0 4px 4px;
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

.dropdown-item {
  padding: 0.75rem;
  cursor: pointer;
  transition: background-color 0.2s;
  border-bottom: 1px solid #f0f0f0;
}
.dropdown-item:last-child { border-bottom: none; }
.dropdown-item:hover { background-color: #f5f7fa; }
.dropdown-item.selected { background-color: #e8eaf6; color: #667eea; font-weight: 500; }
.dropdown-item.disabled { color: #999; cursor: not-allowed; }
.dropdown-item.disabled:hover { background-color: white; }

.btn-generate {
  padding: 0.75rem 1.5rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s;
  height: fit-content;
}
.btn-generate:hover:not(:disabled) { background: #5568d3; }
.btn-generate:disabled { background: #ccc; cursor: not-allowed; }

.date-error {
  display: block;
  margin-top: 0.35rem;
  font-size: 0.78rem;
  color: #c62828;
  background: #ffebee;
  border-left: 3px solid #c62828;
  padding: 0.3rem 0.5rem;
  border-radius: 3px;
}

/* ── Error ───────────────────────────────────────────────────────────────── */
.error-message {
  background: #fee;
  color: #c00;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  border-left: 4px solid #c00;
}

/* ── Export Bar ──────────────────────────────────────────────────────────── */
.export-bar {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  background: #f5f7fa;
  border-radius: 8px;
  border: 1px solid #e8eaf6;
}

.export-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #555;
  margin-right: 0.25rem;
}

.btn-export {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.1s;
  color: #fff;
  white-space: nowrap;
}
.btn-export:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
.btn-export:active:not(:disabled){ transform: translateY(0); }
.btn-export:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-pdf   { background: #e53935; }
.btn-excel { background: #1e8e3e; }
.btn-word  { background: #1565c0; }
.btn-print { background: #546e7a; }
.btn-icon  { font-size: 0.9rem; }

.btn-spinner {
  display: inline-block;
  width: 12px; height: 12px;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  margin-left: 2px;
}
@keyframes spin { to { transform: rotate(360deg); } }

.export-error {
  font-size: 0.78rem;
  color: #c00;
  margin-left: 0.5rem;
}

</style>