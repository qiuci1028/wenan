import { defineStore } from 'pinia'
import { ref } from 'vue'
import { categoryApi, styleApi, sceneApi } from '@/api/category'

export const useCategoryStore = defineStore('category', () => {
  // State - 分类
  const categories = ref([])
  const activeCategory = ref('all')
  const loading = ref(false)

  // State - 风格标签
  const styles = ref([])
  const activeStyle = ref('all')

  // State - 场景标签
  const scenes = ref([])
  const activeScene = ref('all')

  // 默认分类（保留兼容性）
  const defaultCategories = [
    { id: 'all', name: '全部', icon: '✦', color: '#6B90AE', isDefault: true },
    { id: 'love', name: '爱情', icon: '♥', color: '#D9A8A8', isDefault: true },
    { id: 'life', name: '人生', icon: '☀', color: '#8AA8C0', isDefault: true },
    { id: 'inspirational', name: '励志', icon: '✊', color: '#6B90AE', isDefault: true },
    { id: 'emotion', name: '情感', icon: '💧', color: '#9b59b6', isDefault: true }
  ]

  // 默认风格标签
  const defaultStyles = [
    { id: 'all', name: '全部', icon: '✦', color: '#6B90AE', isDefault: true },
    { id: 'cold', name: '高级清冷', icon: '❄', color: '#6B90AE', isDefault: true },
    { id: 'literary', name: '简约文艺', icon: '📖', color: '#8AA8C0', isDefault: true },
    { id: 'gentle', name: '温柔治愈', icon: '🌸', color: '#D9A8A8', isDefault: true },
    { id: 'cool', name: '酷拽短句', icon: '⚡', color: '#2D2D2D', isDefault: true },
    { id: 'ancient', name: '国风古风', icon: '🏮', color: '#C89090', isDefault: true }
  ]

  // 默认场景标签
  const defaultScenes = [
    { id: 'all', name: '全部场景', icon: '✦', color: '#6B90AE', isDefault: true },
    { id: 'moments', name: '朋友圈配图', icon: '📱', color: '#6B90AE', isDefault: true },
    { id: 'xiaohongshu', name: '小红书种草', icon: '📕', color: '#ff6b9d', isDefault: true },
    { id: 'video', name: '短视频口播', icon: '🎬', color: '#f5a623', isDefault: true },
    { id: 'job', name: '求职社交', icon: '💼', color: '#4a9eff', isDefault: true },
    { id: 'birthday', name: '生日祝福', icon: '🎂', color: '#9b59b6', isDefault: true }
  ]

  // Actions
  async function fetchCategories() {
    try {
      loading.value = true
      const res = await categoryApi.getAll()
      const customCategories = res.data || []
      categories.value = [...defaultCategories, ...customCategories.filter(c => !c.isDefault)]
    } catch (error) {
      console.error('获取分类失败:', error)
      categories.value = defaultCategories
    } finally {
      loading.value = false
    }
  }

  async function fetchStyles() {
    try {
      const res = await styleApi.getAll()
      styles.value = res.data || defaultStyles
    } catch (error) {
      console.error('获取风格标签失败:', error)
      styles.value = defaultStyles
    }
  }

  async function fetchScenes() {
    try {
      const res = await sceneApi.getAll()
      scenes.value = res.data || defaultScenes
    } catch (error) {
      console.error('获取场景标签失败:', error)
      scenes.value = defaultScenes
    }
  }

  function setActiveCategory(id) {
    activeCategory.value = id
  }

  function setActiveStyle(id) {
    activeStyle.value = id
  }

  function setActiveScene(id) {
    activeScene.value = id
  }

  function getCategoryName(id) {
    const category = categories.value.find(c => c.id === id)
    return category?.name || id
  }

  function getCategoryColor(id) {
    const category = categories.value.find(c => c.id === id)
    return category?.color || '#666666'
  }

  function getStyleName(id) {
    const style = styles.value.find(s => s.id === id)
    return style?.name || id
  }

  function getStyleColor(id) {
    const style = styles.value.find(s => s.id === id)
    return style?.color || '#6B90AE'
  }

  function getSceneName(id) {
    const scene = scenes.value.find(s => s.id === id)
    return scene?.name || id
  }

  function getSceneColor(id) {
    const scene = scenes.value.find(s => s.id === id)
    return scene?.color || '#6B90AE'
  }

  async function createCategory(name, icon, color) {
    const res = await categoryApi.create(name, icon, color)
    await fetchCategories()
    return res
  }

  async function deleteCategory(id) {
    const res = await categoryApi.delete(id)
    await fetchCategories()
    return res
  }

  return {
    // 分类
    categories,
    activeCategory,
    loading,
    defaultCategories,
    fetchCategories,
    setActiveCategory,
    getCategoryName,
    getCategoryColor,
    createCategory,
    deleteCategory,
    // 风格标签
    styles,
    activeStyle,
    defaultStyles,
    fetchStyles,
    setActiveStyle,
    getStyleName,
    getStyleColor,
    // 场景标签
    scenes,
    activeScene,
    defaultScenes,
    fetchScenes,
    setActiveScene,
    getSceneName,
    getSceneColor
  }
})
