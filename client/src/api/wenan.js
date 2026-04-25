import api from './index'

// 文案相关 API
export const wenanApi = {
  // 获取精选文案
  getFeatured() {
    return api.get('/wenan/featured')
  },

  // 获取分类每日精选
  getFeaturedByCategory(category) {
    return api.get(`/wenan/featured/category/${category}`)
  },

  // 获取所有文案
  getAll() {
    return api.get('/wenan/all')
  },

  // 按分类获取
  getByCategory(category) {
    return api.get(`/wenan/category/${category}`)
  },

  // 按风格和场景获取
  getByStyleAndScene(style, scene) {
    return api.get(`/wenan/filter?style=${style}&scene=${scene}`)
  },

  // 搜索
  search(keyword) {
    return api.get(`/wenan/search?keyword=${encodeURIComponent(keyword)}`)
  },

  // 获取单条
  getById(id) {
    return api.get(`/wenan/${id}`)
  },

  // 获取我的上传
  getMyUploads() {
    return api.get('/wenan/my/uploads')
  },

  // 获取我的点赞
  getMyLikes() {
    return api.get('/wenan/my/likes')
  },

  // 获取我的收藏
  getMyFavorites() {
    return api.get('/wenan/my/favorites')
  },

  // 获取我的统计数据
  getMyStats() {
    return api.get('/wenan/my/stats')
  },

  // 上传文案
  create(text, category) {
    return api.post('/wenan/create', { text, category })
  },

  // 修改文案
  update(id, text, category) {
    return api.put(`/wenan/${id}`, { text, category })
  },

  // 删除文案
  delete(id) {
    return api.delete(`/wenan/${id}`)
  },

  // 点赞/取消点赞
  toggleLike(id) {
    return api.post(`/wenan/${id}/like`)
  },

  // 收藏/取消收藏
  toggleFavorite(id) {
    return api.post(`/wenan/${id}/favorite`)
  }
}

export default wenanApi
