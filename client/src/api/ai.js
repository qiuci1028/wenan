import api from './index'

// AI 相关 API
export const aiApi = {
  // AI文案生成（原有方法）
  generateText(prompt, category = 'all', scene = '', style = 'literary', wordCount = 50) {
    return api.post('/ai/generate', { prompt, category, scene, style, wordCount })
  },

  // AI分析用户需求
  analyze(prompt, category = 'all', style = 'literary') {
    return api.post('/ai/analyze', { prompt, category, style })
  },

  // 基于分析结果生成文案
  generateWithAnalysis(prompt, analysis, category = 'all', style = 'literary') {
    return api.post('/ai/generate-with-analysis', { prompt, analysis, category, style })
  },

  // AI文案润色
  polishText(text) {
    return api.post('/ai/polish', { text })
  },

  // 获取生成历史
  getHistory(page = 1, pageSize = 20) {
    return api.get('/ai/history', { params: { page, pageSize } })
  },

  // 删除历史记录
  deleteHistory(id) {
    return api.delete(`/ai/history/${id}`)
  },

  // AI 对话（支持问候和闲聊）
  chat(messages, type = 'general') {
    return api.post('/ai/chat', { messages, type })
  },

  // 获取AI使用状态
  getUsage() {
    return api.get('/ai/usage')
  },

  // AI 理解用户意图并生成文案
  understandAndGenerate(prompt, category = 'all', style = 'literary') {
    return api.post('/ai/understand', { prompt, category, style })
  },

  // AI 根据上下文生成文案
  generateCopy(prompt, scene = 'moments', style = 'cold') {
    return api.post('/ai/generate-copy', { prompt, scene, style })
  },

  // AI 图片理解并生成文案（支持上传图片）
  understandWithImage(file, prompt, category = 'all', style = 'literary') {
    const formData = new FormData()
    if (file) formData.append('image', file)
    if (prompt) formData.append('prompt', prompt)
    formData.append('category', category)
    formData.append('style', style)
    return api.post('/ai/understand-with-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  }
}

export default aiApi
