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

const getAuthHeaders = () => {
  const token = btoa(`${authConfig.username}:${authConfig.password}`)
  return {
    'Authorization': `Basic ${token}`,
    'Content-Type': 'application/json'
  }
}

// Fetch Projects
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
// Menggunakan path relatif agar melewati Vite proxy (dev) atau reverse proxy (prod)
export const executeProgressQuery = async (projectId, dateFrom, dateTo) => {
  try {
    const response = await axios.post('/api/query/progress', {
      projectId,
      dateFrom,
      dateTo
    }, {
      headers: getAuthHeaders()
    })
    return response.data
  } catch (error) {
    console.error('Error executing progress query:', error)
    throw error
  }
}

// Execute total query
export const executeTotalQuery = async (projectId, dateFrom, dateTo) => {
  try {
    const response = await axios.post('/api/query/total', {
      projectId,
      dateFrom,
      dateTo
    }, {
      headers: getAuthHeaders()
    })
    return response.data
  } catch (error) {
    console.error('Error executing total query:', error)
    throw error
  }
}