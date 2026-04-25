import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'

const adminHttp = axios.create({
  baseURL: '/adminApi',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
})

adminHttp.interceptors.request.use(config => {
  const token = localStorage.getItem('qiucci_admin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

adminHttp.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('qiucci_admin_token')
      localStorage.removeItem('qiucci_admin_info')
      if (!window.location.pathname.includes('/admin/login')) {
        router.push('/admin/login')
        ElMessage.error('登录已过期，请重新登录')
      }
    } else {
      ElMessage.error(error.response?.data?.message || '请求失败')
    }
    return Promise.reject(error)
  }
)

export const adminApi = {
  login(username, password) {
    return adminHttp.post('/admin/login', { username, password })
  },

  getStats() {
    return adminHttp.get('/admin/stats')
  },

  getUsers(page = 1, pageSize = 20) {
    return adminHttp.get(`/admin/users?page=${page}&pageSize=${pageSize}`)
  },

  getWenans(page = 1, pageSize = 20) {
    return adminHttp.get(`/admin/wenans?page=${page}&pageSize=${pageSize}`)
  },

  getCategories() {
    return adminHttp.get('/admin/categories')
  },

  deleteCategory(id) {
    return adminHttp.delete(`/admin/categories/${id}`)
  },

  deleteUser(id) {
    return adminHttp.delete(`/admin/users/${id}`)
  },

  deleteWenan(id) {
    return adminHttp.delete(`/admin/wenans/${id}`)
  },

  updateWenan(id, data) {
    return adminHttp.put(`/admin/wenans/${id}`, data)
  },

  getOrders(page = 1, pageSize = 20) {
    return adminHttp.get(`/admin/orders?page=${page}&pageSize=${pageSize}`)
  },

  getPlans() {
    return adminHttp.get('/admin/plans')
  },

  createPlan(plan) {
    return adminHttp.post('/admin/plans', plan)
  },

  updatePlan(id, plan) {
    return adminHttp.put(`/admin/plans/${id}`, plan)
  },

  deletePlan(id) {
    return adminHttp.delete(`/admin/plans/${id}`)
  },

  getAiHistory(page = 1, pageSize = 20) {
    return adminHttp.get(`/admin/ai-history?page=${page}&pageSize=${pageSize}`)
  },

  deleteAiHistory(id) {
    return adminHttp.delete(`/admin/ai-history/${id}`)
  }
}

export default adminApi
