import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api/auth'
import { userApi } from '@/api/user'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
  // State
  const token = ref(localStorage.getItem('qiucci_token') || null)
  const userInfo = ref(JSON.parse(localStorage.getItem('qiucci_current_user') || 'null'))

  // Getters
  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => !!userInfo.value?.isAdmin)
  const isVip = computed(() => {
    // 根据用户会员状态判断
    return userInfo.value?.vipStatus === 'active'
  })

  // Actions
  async function login(username, password) {
    const res = await authApi.login(username, password)
    token.value = res.data.token
    localStorage.setItem('qiucci_token', res.data.token)
    userInfo.value = res.data.user
    localStorage.setItem('qiucci_current_user', JSON.stringify(res.data.user))
    return res
  }

  async function register(username, password, confirmPassword) {
    const res = await authApi.register(username, password, confirmPassword)
    return res
  }

  function logout() {
    token.value = null
    userInfo.value = null
    localStorage.removeItem('qiucci_token')
    localStorage.removeItem('qiucci_current_user')
    router.push('/')
  }

  async function fetchUserInfo() {
    if (!token.value) return null
    try {
      const res = await userApi.getCurrentUser()
      userInfo.value = res.data
      localStorage.setItem('qiucci_current_user', JSON.stringify(res.data))
      return res.data
    } catch (error) {
      logout()
      return null
    }
  }

  async function updateUserInfo(data) {
    const res = await userApi.updateProfile(data)
    if (res && res.data) {
      userInfo.value = res.data
      localStorage.setItem('qiucci_current_user', JSON.stringify(res.data))
    }
    return res
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    isAdmin,
    isVip,
    login,
    register,
    logout,
    fetchUserInfo,
    updateUserInfo
  }
})
