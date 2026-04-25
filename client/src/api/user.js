import api from './index'

// 用户相关 API
export const userApi = {
  // 获取当前用户
  getCurrentUser() {
    return api.get('/user/me')
  },

  // 更新资料
  updateProfile(data) {
    return api.put('/user/profile', data)
  },

  // 重新生成文案号
  regenerateWenanId() {
    return api.post('/user/regenerate-wenanid')
  }
}

export default userApi
