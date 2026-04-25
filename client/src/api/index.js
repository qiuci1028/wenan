import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'

const API_BASE_URL = '/api'

// 创建 axios 实例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器：自动附加 JWT Token
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('qiucci_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器：统一错误处理
api.interceptors.response.use(
  response => {
    return response.data
  },
  error => {
    console.error('API Error:', error)
    if (error.response) {
      const { status, data } = error.response
      if (status === 401) {
        localStorage.removeItem('qiucci_token')
        localStorage.removeItem('qiucci_current_user')
        if (window.location.pathname.includes('/auth/login')) {
          // 登录页：显示服务器返回的具体错误信息
          ElMessage.error(data?.message || '用户名或密码错误')
        } else {
          router.push('/auth/login')
          ElMessage.error('登录已过期，请重新登录')
        }
      } else {
        ElMessage.error(data?.message || '网络错误')
      }
    } else {
      ElMessage.error('网络连接失败')
    }
    return Promise.reject(error)
  }
)

export default api
