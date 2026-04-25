import api from './index'

// 分类相关 API
export const categoryApi = {
  // 获取所有分类
  getAll() {
    return api.get('/categories')
  },

  // 创建自定义分类
  create(name, icon, color) {
    return api.post('/categories', { name, icon, color })
  },

  // 删除自定义分类
  delete(id) {
    return api.delete(`/categories/${id}`)
  }
}

// 风格标签 API
export const styleApi = {
  getAll() {
    return api.get('/styles')
  }
}

// 场景标签 API
export const sceneApi = {
  getAll() {
    return api.get('/scenes')
  }
}

export default categoryApi
