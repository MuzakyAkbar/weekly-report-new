<template>
  <div class="filter-container">
    <h3>Filter Report</h3>
    <div class="filter-form">
      <div class="form-group">
        <label for="project">Project</label>
        <div class="searchable-select" ref="selectContainer">
          <input
            type="text"
            v-model="searchQuery"
            @focus="handleFocus"
            @blur="handleBlur"
            @input="handleInput"
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
        <label for="dateFrom">Tanggal Dari</label>
        <input
          type="date"
          id="dateFrom"
          v-model="reportStore.dateFrom"
        />
      </div>

      <div class="form-group">
        <label for="dateTo">Tanggal Sampai</label>
        <input
          type="date"
          id="dateTo"
          v-model="reportStore.dateTo"
        />
      </div>

      <button
        @click="handleGenerate"
        :disabled="!canGenerate"
        class="btn-generate"
      >
        Generate Report
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useReportStore } from '../stores/report'

const reportStore = useReportStore()
const searchQuery = ref('')
const showDropdown = ref(false)
const selectedProjectName = ref('')

const filteredProjects = computed(() => {
  if (!searchQuery.value.trim()) {
    return reportStore.projects
  }
  const query = searchQuery.value.toLowerCase()
  return reportStore.projects.filter(project => 
    project.name.toLowerCase().includes(query)
  )
})

const canGenerate = computed(() => {
  return reportStore.selectedProject && 
         reportStore.dateFrom && 
         reportStore.dateTo
})

const handleFocus = () => {
  showDropdown.value = true
  if (selectedProjectName.value) {
    searchQuery.value = ''
  }
}

const handleInput = () => {
  showDropdown.value = true
}

const selectProject = (project) => {
  reportStore.selectedProject = project.id
  searchQuery.value = project.name
  selectedProjectName.value = project.name
  showDropdown.value = false
  reportStore.clearReport()
}

const handleBlur = () => {
  setTimeout(() => {
    showDropdown.value = false
    if (!reportStore.selectedProject && selectedProjectName.value) {
      searchQuery.value = selectedProjectName.value
    } else if (reportStore.selectedProject) {
      const selected = reportStore.projects.find(p => p.id === reportStore.selectedProject)
      if (selected) {
        searchQuery.value = selected.name
        selectedProjectName.value = selected.name
      }
    }
  }, 200)
}

const handleGenerate = async () => {
  await reportStore.loadReportData()
}

watch(() => reportStore.projects, (newProjects) => {
  if (newProjects.length > 0 && reportStore.selectedProject) {
    const selected = newProjects.find(p => p.id === reportStore.selectedProject)
    if (selected) {
      searchQuery.value = selected.name
      selectedProjectName.value = selected.name
    }
  }
}, { immediate: true })
</script>

<style scoped>
.filter-container {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
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

.searchable-select {
  position: relative;
  width: 100%;
}

.search-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.3s;
}

.search-input:focus {
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
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.dropdown-item {
  padding: 0.75rem;
  cursor: pointer;
  transition: background-color 0.2s;
  border-bottom: 1px solid #f0f0f0;
}

.dropdown-item:last-child {
  border-bottom: none;
}

.dropdown-item:hover {
  background-color: #f5f7fa;
}

.dropdown-item.selected {
  background-color: #e8eaf6;
  color: #667eea;
  font-weight: 500;
}

.dropdown-item.disabled {
  color: #999;
  cursor: not-allowed;
}

.dropdown-item.disabled:hover {
  background-color: white;
}

.form-group select,
.form-group input {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.form-group select:focus,
.form-group input:focus {
  outline: none;
  border-color: #667eea;
}

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

.btn-generate:hover:not(:disabled) {
  background: #5568d3;
}

.btn-generate:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>