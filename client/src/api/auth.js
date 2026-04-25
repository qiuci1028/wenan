import api from './index'

// 认证相关 API
export const authApi = {
  // 发送验证码
  sendCode(contact) {
    return api.post(`/auth/send-code?contact=${encodeURIComponent(contact)}`)
  },

  // 注册
  register(username, password, confirmPassword) {
    return api.post('/auth/register', { username, password, confirmPassword })
  },

  // 登录
  login(username, password) {
    return api.post('/auth/login', { username, password })
  }
}

export default authApi
