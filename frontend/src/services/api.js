import axios from 'axios'

const API_BASE_URL = '/api/openbravo/org.openbravo.service.json.jsonrest'

// Konfigurasi Basic Auth
let authConfig = {
  username: '',
  password: ''
}

export const setAuthCredentials = (username, password) => {
  authConfig.username = username
  authConfig.password = password
}

// Generate Header Auth
const getAuthHeaders = () => {
  const token = btoa(`${authConfig.username}:${authConfig.password}`)
  return {
    Authorization: `Basic ${token}`,
    'Content-Type': 'application/json'
  }
}

// Fetch Projects (list ringkas untuk dropdown)
export const fetchProjects = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/Project`, {
      headers: getAuthHeaders()
    })
    return response.data.response.data
  } catch (error) {
    console.error('Error fetching projects:', error)
    throw error
  }
}

// Fetch detail project — langsung query DB via backend
// Mengambil: sub_name (c_project) dan value (robprj_paket)
export const fetchProjectDetail = async (projectId) => {
  try {
    const response = await axios.post(
      '/api/query/projectdetail',
      { projectId },
      { headers: getAuthHeaders() }
    )
    const data = response.data
    return {
      kodeProyek:    data?.kodeProyek    ?? '',
      namaSubProyek: data?.namaSubProyek ?? '',
      lokasi:        data?.lokasi        ?? '',
      noPO:          data?.noPO          ?? '',
    }
  } catch (error) {
    console.error('Error fetching project detail:', error)
    throw error
  }
}

// Fetch Sales Orders by Project
export const fetchSalesOrdersByProject = async (projectId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/Order`, {
      headers: getAuthHeaders(),
      params: {
        _where: `project='${projectId}' and salesTransaction=true`
      }
    })
    return response.data.response.data
  } catch (error) {
    console.error('Error fetching sales orders:', error)
    throw error
  }
}

// Fetch Project Activities
export const fetchProjectActivities = async (projectId, dateFrom, dateTo) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/robprj_projectactivity`, {
      headers: getAuthHeaders(),
      params: {
        _where: `project='${projectId}' and activityDate>='${dateFrom}' and activityDate<='${dateTo}'`
      }
    })
    return response.data.response.data
  } catch (error) {
    console.error('Error fetching project activities:', error)
    throw error
  }
}

// Execute custom SQL query via backend
export const executeProgressQuery = async (projectId, dateFrom, dateTo) => {
  try {
    const response = await axios.post(
      '/api/query/progress',
      { projectId, dateFrom, dateTo },
      { headers: getAuthHeaders() }
    )
    return response.data
  } catch (error) {
    console.error('Error executing progress query:', error)
    throw error
  }
}

// Execute total query
export const executeTotalQuery = async (projectId, dateFrom, dateTo) => {
  try {
    const response = await axios.post(
      '/api/query/total',
      { projectId, dateFrom, dateTo },
      { headers: getAuthHeaders() }
    )
    return response.data
  } catch (error) {
    console.error('Error executing total query:', error)
    throw error
  }
}