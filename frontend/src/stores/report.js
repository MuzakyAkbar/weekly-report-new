import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as api from '../services/api'

export const useReportStore = defineStore('report', () => {
  // State
  const projects        = ref([])
  const selectedProject = ref(null)
  const dateFrom        = ref('')
  const dateTo          = ref('')
  const progressData    = ref([])
  const totalData       = ref(null)
  const loading         = ref(false)
  const error           = ref(null)
  const authenticated   = ref(false)

  // Extra info project — diisi otomatis saat project dipilih
  const extraInfo = ref({
    kodeProyek:    '',   // robprj_paket.value
    namaSubProyek: '',   // c_project.subName
    lokasi:        '',   // diisi manual di form jika diperlukan
    noPO:          '',   // diisi manual di form jika diperlukan
  })

  // Actions
  const setAuthCredentials = (username, password) => {
    api.setAuthCredentials(username, password)
    authenticated.value = true
  }

  const loadProjects = async () => {
    loading.value = true
    error.value   = null
    try {
      projects.value = await api.fetchProjects()
    } catch (err) {
      error.value = 'Gagal memuat daftar project'
      console.error(err)
    } finally {
      loading.value = false
    }
  }

  // Dipanggil saat user memilih project dari dropdown
  const selectProject = async (projectId) => {
    selectedProject.value = projectId

    // Reset extraInfo dulu
    extraInfo.value = { kodeProyek: '', namaSubProyek: '', lokasi: '', noPO: '' }

    if (!projectId) return

    try {
      const detail = await api.fetchProjectDetail(projectId)
      if (detail) {
        extraInfo.value.kodeProyek    = detail.kodeProyek
        extraInfo.value.namaSubProyek = detail.namaSubProyek
        extraInfo.value.lokasi        = detail.lokasi
        extraInfo.value.noPO          = detail.noPO
        // lokasi & noPO tetap diisi manual dari form
      }
    } catch (err) {
      console.error('Gagal memuat detail project:', err)
      // Tidak set error global — detail gagal tidak halangi user lanjut
    }
  }

  const loadReportData = async () => {
    if (!selectedProject.value || !dateFrom.value || !dateTo.value) {
      error.value = 'Pilih project dan tanggal terlebih dahulu'
      return
    }

    loading.value = true
    error.value   = null

    try {
      const progress = await api.executeProgressQuery(
        selectedProject.value,
        dateFrom.value,
        dateTo.value
      )
      progressData.value = progress

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
    totalData.value    = null
    error.value        = null
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
    extraInfo,

    // Actions
    setAuthCredentials,
    loadProjects,
    selectProject,    // ← ganti dari set selectedProject langsung
    loadReportData,
    clearReport
  }
})