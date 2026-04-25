import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { adminApi } from '@/api/adminAuth'
import router from '@/router'

export const useAdminAuthStore = defineStore('adminAuth', () => {
  const token = ref(localStorage.getItem('qiucci_admin_token') || null)
  const adminInfo = ref(JSON.parse(localStorage.getItem('qiucci_admin_info') || 'null'))

  const isAdminLoggedIn = computed(() => !!token.value)

  async function login(username, password) {
    const res = await adminApi.login(username, password)
    token.value = res.data.token
    adminInfo.value = res.data.admin
    localStorage.setItem('qiucci_admin_token', res.data.token)
    localStorage.setItem('qiucci_admin_info', JSON.stringify(res.data.admin))
    return res
  }

  function logout() {
    token.value = null
    adminInfo.value = null
    localStorage.removeItem('qiucci_admin_token')
    localStorage.removeItem('qiucci_admin_info')
    router.push('/admin/login')
  }

  return {
    token,
    adminInfo,
    isAdminLoggedIn,
    login,
    logout
  }
})
