import { defineStore } from 'pinia'
import { ref } from 'vue'
import { wenanApi } from '@/api/wenan'

export const useWenanStore = defineStore('wenan', () => {
  // State
  const list = ref([])
  const featured = ref([])
  const featuredByCategory = ref({})  // { love: [...], life: [...], ... }
  const currentWenan = ref(null)
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(20)
  const loading = ref(false)
  const filters = ref({
    category: 'all',
    keyword: ''
  })

  // 我的数据
  const myUploads = ref([])
  const myLikes = ref([])
  const myFavorites = ref([])
  const myStats = ref(null)

  // Actions
  async function fetchFeatured() {
    try {
      loading.value = true
      const res = await wenanApi.getFeatured()
      featured.value = res.data || []
    } catch (error) {
      console.error('获取精选失败:', error)
    } finally {
      loading.value = false
    }
  }

  async function fetchFeaturedByCategory(category) {
    try {
      const res = await wenanApi.getFeaturedByCategory(category)
      featuredByCategory.value[category] = res.data || []
    } catch (error) {
      console.error('获取分类精选失败:', error)
    }
  }

  async function fetchList(params = {}) {
    try {
      loading.value = true
      const res = await wenanApi.getAll()
      list.value = res.data || []
      total.value = list.value.length
    } catch (error) {
      console.error('获取文案列表失败:', error)
    } finally {
      loading.value = false
    }
  }

  async function fetchByCategory(category) {
    try {
      loading.value = true
      filters.value.category = category
      if (category === 'all') {
        const res = await wenanApi.getAll()
        list.value = res.data || []
      } else {
        const res = await wenanApi.getByCategory(category)
        list.value = res.data || []
      }
      total.value = list.value.length
    } catch (error) {
      console.error('获取分类文案失败:', error)
    } finally {
      loading.value = false
    }
  }

  async function fetchByStyleAndScene(style, scene) {
    try {
      loading.value = true
      const res = await wenanApi.getByStyleAndScene(style, scene)
      list.value = res.data || []
      total.value = list.value.length
    } catch (error) {
      console.error('获取风格场景文案失败:', error)
    } finally {
      loading.value = false
    }
  }

  async function search(keyword) {
    try {
      loading.value = true
      filters.value.keyword = keyword
      const res = await wenanApi.search(keyword)
      list.value = res.data || []
      total.value = list.value.length
    } catch (error) {
      console.error('搜索失败:', error)
    } finally {
      loading.value = false
    }
  }

  async function fetchById(id) {
    try {
      const res = await wenanApi.getById(id)
      currentWenan.value = res.data
      return res.data
    } catch (error) {
      console.error('获取文案详情失败:', error)
      return null
    }
  }

  async function toggleLike(id) {
    try {
      const res = await wenanApi.toggleLike(id)
      const isLiked = res.data?.liked
      const newLikes = res.data?.likes
      // 更新列表中的点赞状态
      if (isLiked !== undefined) {
        updateItemState(id, 'liked', isLiked)
      }
      if (newLikes !== undefined) {
        updateItemState(id, 'likes', newLikes)
      }
      // 重新获取所有相关列表
      await Promise.all([
        fetchList(),
        fetchFeatured(),
        fetchMyUploads(),
        fetchMyLikes(),
        fetchMyStats()
      ])
      return res.data
    } catch (error) {
      console.error('点赞失败:', error)
      throw error
    }
  }

  async function toggleFavorite(id) {
    try {
      const res = await wenanApi.toggleFavorite(id)
      const isFavorited = res.data?.favorited
      const newFavorites = res.data?.favorites
      // 更新列表中的收藏状态
      if (isFavorited !== undefined) {
        updateItemState(id, 'favorited', isFavorited)
      }
      if (newFavorites !== undefined) {
        updateItemState(id, 'favorites', newFavorites)
      }
      // 重新获取所有相关列表
      await Promise.all([
        fetchList(),
        fetchFeatured(),
        fetchMyUploads(),
        fetchMyFavorites(),
        fetchMyStats()
      ])
      return res.data
    } catch (error) {
      console.error('收藏失败:', error)
      throw error
    }
  }

  function updateItemState(id, key, value) {
    // 更新主列表
    const index = list.value.findIndex(i => i.id === id)
    if (index !== -1) {
      list.value[index][key] = value
      list.value = [...list.value]
    }
    // 更新精选列表
    const featuredIndex = featured.value.findIndex(i => i.id === id)
    if (featuredIndex !== -1) {
      featured.value[featuredIndex][key] = value
      featured.value = [...featured.value]
    }
    // 同步分类精选
    Object.keys(featuredByCategory.value).forEach(cat => {
      const catIndex = featuredByCategory.value[cat].findIndex(i => i.id === id)
      if (catIndex !== -1) {
        featuredByCategory.value[cat][catIndex][key] = value
        featuredByCategory.value[cat] = [...featuredByCategory.value[cat]]
      }
    })
    // 更新当前文案
    if (currentWenan.value?.id === id) {
      currentWenan.value[key] = value
      currentWenan.value = { ...currentWenan.value }
    }
    // 同步我的上传
    const myUploadIndex = myUploads.value.findIndex(i => i.id === id)
    if (myUploadIndex !== -1) {
      myUploads.value[myUploadIndex][key] = value
      myUploads.value = [...myUploads.value]
    }
    // 同步我的点赞
    const myLikeIndex = myLikes.value.findIndex(i => i.id === id)
    if (myLikeIndex !== -1) {
      myLikes.value[myLikeIndex][key] = value
      myLikes.value = [...myLikes.value]
    }
    // 同步我的收藏
    const myFavIndex = myFavorites.value.findIndex(i => i.id === id)
    if (myFavIndex !== -1) {
      myFavorites.value[myFavIndex][key] = value
      myFavorites.value = [...myFavorites.value]
    }
  }

  async function fetchMyUploads() {
    try {
      const res = await wenanApi.getMyUploads()
      myUploads.value = res.data || []
      return myUploads.value
    } catch (error) {
      console.error('获取我的上传失败:', error)
      return []
    }
  }

  async function fetchMyLikes() {
    try {
      const res = await wenanApi.getMyLikes()
      myLikes.value = res.data || []
      return myLikes.value
    } catch (error) {
      console.error('获取我的点赞失败:', error)
      return []
    }
  }

  async function fetchMyFavorites() {
    try {
      const res = await wenanApi.getMyFavorites()
      myFavorites.value = res.data || []
      return myFavorites.value
    } catch (error) {
      console.error('获取我的收藏失败:', error)
      return []
    }
  }

  async function fetchMyStats() {
    try {
      const res = await wenanApi.getMyStats()
      myStats.value = res.data
      return myStats.value
    } catch (error) {
      console.error('获取统计数据失败:', error)
      return null
    }
  }

  async function create(text, category) {
    const res = await wenanApi.create(text, category)
    return res
  }

  async function update(id, text, category) {
    console.log('wenanStore update called', id, text, category)
    const res = await wenanApi.update(id, text, category)
    console.log('wenanStore update result', res)
    return res
  }

  async function remove(id) {
    console.log('wenanStore remove called', id)
    const res = await wenanApi.delete(id)
    console.log('wenanStore remove result', res)
    myUploads.value = myUploads.value.filter(i => i.id !== id)
    return res
  }

  return {
    // State
    list,
    featured,
    featuredByCategory,
    currentWenan,
    total,
    page,
    pageSize,
    loading,
    filters,
    myUploads,
    myLikes,
    myFavorites,
    myStats,
    // Actions
    fetchFeatured,
    fetchFeaturedByCategory,
    fetchList,
    fetchByCategory,
    fetchByStyleAndScene,
    search,
    fetchById,
    toggleLike,
    toggleFavorite,
    fetchMyUploads,
    fetchMyLikes,
    fetchMyFavorites,
    fetchMyStats,
    create,
    update,
    remove,
    delete: remove
  }
})
