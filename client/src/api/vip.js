import api from './index'

export const vipApi = {
  purchase(planId, planName, amount) {
    return api.post('/vip/purchase', { planId, planName, amount })
  },

  getPlans() {
    return api.get('/vip/plans')
  },

  getVipStatus() {
    return api.get('/vip/status')
  }
}

export default vipApi
