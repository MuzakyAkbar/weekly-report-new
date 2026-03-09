import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as api from '../services/api'

export const useReportStore = defineStore('report', () => {
  // State
  const projects = ref([])
  const selectedProject = ref(null)
  const dateFrom = ref('')
  const dateTo = ref('')
  const progressData = ref([])
  const totalData = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const authenticated = ref(false)

  // Actions
  const setAuthCredentials = (username, password) => {
    api.setAuthCredentials(username, password)
    authenticated.value = true
  }

  const loadProjects = async () => {
    loading.value = true
    error.value = null
    try {
      projects.value = await api.fetchProjects()
    } catch (err) {
      error.value = 'Gagal memuat daftar project'
      console.error(err)
    } finally {
      loading.value = false
    }
  }

  const loadReportData = async () => {
    if (!selectedProject.value || !dateFrom.value || !dateTo.value) {
      error.value = 'Pilih project dan tanggal terlebih dahulu'
      return
    }

    loading.value = true
    error.value = null
    
    try {
      // Load progress data
      const progress = await api.executeProgressQuery(
        selectedProject.value,
        dateFrom.value,
        dateTo.value
      )
      progressData.value = progress

      // Load total data
      const total = await api.executeTotalQuery(
        selectedProject.value,
        dateFrom.value,
        dateTo.value
      )
      totalData.value = total
    } catch (err) {
      error.value = 'Gagal memuat data report'
      console.error(err)
    } finally {
      loading.value = false
    }
  }

  const clearReport = () => {
    progressData.value = []
    totalData.value = null
    error.value = null
  }

  return {
    // State
    projects,
    selectedProject,
    dateFrom,
    dateTo,
    progressData,
    totalData,
    loading,
    error,
    authenticated,
    
    // Actions
    setAuthCredentials,
    loadProjects,
    loadReportData,
    clearReport
  }
})
