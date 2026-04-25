<template>
  <div class="home-page">
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-bg">
        <div class="hero-gradient"></div>
      </div>
      <div class="hero-content">
        <h1 class="hero-title">文字的力量</h1>
        <h2 class="hero-subtitle">心灵的共鸣</h2>
        <p class="hero-desc">发现触动心灵的文字，让每一句话都成为力量</p>
        <div class="hero-actions">
          <router-link to="/wenan" class="btn-primary">
            <span>探索文案</span>
            <span class="btn-icon">→</span>
          </router-link>
          <router-link to="/ai/generate" class="btn-secondary">
            <span>✨</span>
            <span>AI创作</span>
          </router-link>
        </div>
      </div>
    </section>

    <!-- Featured Section -->
    <section class="section">
      <div class="section-inner">
        <div class="section-header">
          <h2 class="section-title">
            <span class="title-icon">✨</span>
            每日精选
          </h2>
          <router-link to="/wenan" class="section-more">
            查看更多 →
          </router-link>
        </div>

        <div v-if="loadingFeatured" class="loading-state">
          <el-icon class="is-loading loading-icon"><Loading /></el-icon>
        </div>
        <div v-else class="cards-grid">
          <div
            v-for="item in wenanStore.featured"
            :key="item.id"
            class="card"
          >
            <p class="card-text">{{ item.text }}</p>
            <div class="card-footer">
              <div class="card-stats">
                <button class="stat" @click.stop="handleLike(item.id)">
                  <span class="stat-icon">{{ item.liked ? '❤️' : '🤍' }}</span>
                  {{ item.likes || 0 }}
                </button>
                <button class="stat" @click.stop="handleFavorite(item.id)">
                  <span class="stat-icon">{{ item.favorited ? '⭐' : '☆' }}</span>
                  {{ item.favorites || 0 }}
                </button>
              </div>
              <button class="card-copy" @click.stop="handleCopy(item.text)">
                复制
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Category Featured -->
    <section class="section">
      <div class="section-inner">
        <div class="section-header">
          <h2 class="section-title">
            <span class="title-icon">💫</span>
            分类精选
          </h2>
        </div>

        <div class="category-tabs">
          <button
            v-for="cat in categoryTabs"
            :key="cat.id"
            class="tab-btn"
            :class="{ active: activeCategoryTab === cat.id }"
            @click="switchCategoryTab(cat.id)"
          >
            <el-icon><component :is="cat.icon" /></el-icon>
            {{ cat.name }}
          </button>
        </div>

        <div v-if="loadingCategory" class="loading-state">
          <el-icon class="is-loading loading-icon"><Loading /></el-icon>
        </div>
        <div v-else class="cards-grid">
          <div
            v-for="item in currentCategoryItems"
            :key="item.id"
            class="card"
          >
            <p class="card-text">{{ item.text }}</p>
            <div class="card-footer">
              <div class="card-stats">
                <button class="stat" @click.stop="handleLike(item.id)">
                  <span class="stat-icon">{{ item.liked ? '❤️' : '🤍' }}</span>
                  {{ item.likes || 0 }}
                </button>
                <button class="stat" @click.stop="handleFavorite(item.id)">
                  <span class="stat-icon">{{ item.favorited ? '⭐' : '☆' }}</span>
                  {{ item.favorites || 0 }}
                </button>
              </div>
              <button class="card-copy" @click.stop="handleCopy(item.text)">
                复制
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="section cta-section">
      <div class="section-inner">
        <div class="cta-card">
          <h3 class="cta-title">✨ 开始你的 AI 创作之旅</h3>
          <p class="cta-desc">输入关键词，让 AI 为你创作独特文案</p>
          <router-link to="/ai/generate" class="btn-primary">
            立即体验 →
          </router-link>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Loading, Star, Top, ChatDotRound } from '@element-plus/icons-vue'
import { useWenanStore } from '@/stores/wenan'
import { useCategoryStore } from '@/stores/category'

const wenanStore = useWenanStore()
const categoryStore = useCategoryStore()

const loadingFeatured = ref(false)
const loadingCategory = ref(false)
const activeCategoryTab = ref('love')

const categoryTabs = [
  { id: 'love', name: '爱情', icon: 'Star' },
  { id: 'life', name: '人生', icon: 'Star' },
  { id: 'inspirational', name: '励志', icon: 'Top' },
  { id: 'emotion', name: '情感', icon: 'ChatDotRound' }
]

const currentCategoryItems = computed(() => {
  return wenanStore.featuredByCategory[activeCategoryTab.value] || []
})

async function switchCategoryTab(categoryId) {
  activeCategoryTab.value = categoryId
  if (!wenanStore.featuredByCategory[categoryId]) {
    loadingCategory.value = true
    await wenanStore.fetchFeaturedByCategory(categoryId)
    loadingCategory.value = false
  }
}

onMounted(async () => {
  loadingFeatured.value = true
  await wenanStore.fetchFeatured()
  loadingFeatured.value = false

  loadingCategory.value = true
  await wenanStore.fetchFeaturedByCategory('love')
  loadingCategory.value = false
})

function handleCopy(text) {
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success('已复制到剪贴板')
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}

async function handleLike(id) {
  try {
    await wenanStore.toggleLike(id)
    ElMessage.success('已点赞')
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

async function handleFavorite(id) {
  try {
    await wenanStore.toggleFavorite(id)
    ElMessage.success('已收藏')
  } catch (error) {
    ElMessage.error('操作失败')
  }
}
</script>

<style scoped>
.home-page {
  background: transparent;
}

/* Hero */
.hero {
  position: relative;
  padding: 40px 24px 50px;
  text-align: center;
  overflow: hidden;
}

.hero-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.hero-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #6B90AE 0%, #6B90AE 50%, #F5F0E8 100%);
  opacity: 1;
}

.hero-content {
  position: relative;
  z-index: 1;
  max-width: 700px;
  margin: 0 auto;
}

.hero-title {
  font-size: 2.2rem;
  font-weight: 700;
  color: white;
  letter-spacing: -0.02em;
  margin-bottom: 8px;
  line-height: 1.2;
}

.hero-subtitle {
  font-size: 1.5rem;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 16px;
}

.hero-desc {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 32px;
}

.hero-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 28px;
  background: white;
  color: #667eea;
  border-radius: 30px;
  text-decoration: none;
  font-weight: 600;
  font-size: 1rem;
  transition: all 0.3s;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 25px rgba(0, 0, 0, 0.2);
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 28px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 30px;
  text-decoration: none;
  font-weight: 500;
  font-size: 1rem;
  transition: all 0.3s;
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.btn-icon {
  font-size: 1.1rem;
}

/* Section */
.section {
  padding: 48px 24px;
}

.section-inner {
  max-width: 1200px;
  margin: 0 auto;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.3rem;
  font-weight: 600;
  color: white;
}

.title-icon {
  font-size: 1.2rem;
}

.section-more {
  color: white;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  opacity: 0.9;
}

.section-more:hover {
  opacity: 1;
  text-decoration: underline;
}

/* Cards Grid */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(14, 165, 233, 0.25);
}

.card-text {
  font-size: 1rem;
  line-height: 1.8;
  color: #333;
  margin-bottom: 20px;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.card-stats {
  display: flex;
  gap: 16px;
}

.stat {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.9rem;
  color: #999;
}

.stat-icon {
  font-size: 0.95rem;
}

.card-copy {
  padding: 6px 14px;
  background: #6B90AE;
  border: none;
  border-radius: 16px;
  font-size: 0.85rem;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.card-copy:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

/* Category Tabs */
.category-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(14, 165, 233, 0.3);
  border-radius: 25px;
  font-size: 0.95rem;
  color: #6B90AE;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  background: white;
  border-color: #6B90AE;
}

.tab-btn.active {
  background: #6B90AE;
  border-color: transparent;
  color: white;
}

/* Loading */
.loading-state {
  text-align: center;
  padding: 60px 20px;
}

.loading-icon {
  font-size: 2rem;
  color: white;
}

/* CTA Section */
.cta-section {
  padding: 48px 24px 80px;
}

.cta-card {
  background: #6B90AE;
  border-radius: 24px;
  padding: 48px 40px;
  text-align: center;
  color: white;
}

.cta-title {
  font-size: 1.6rem;
  font-weight: 600;
  margin-bottom: 12px;
}

.cta-desc {
  font-size: 1rem;
  opacity: 0.9;
  margin-bottom: 24px;
}

.cta-card .btn-primary {
  background: white;
  color: #667eea;
}

/* Responsive */
@media (max-width: 768px) {
  .hero {
    padding: 32px 20px 40px;
  }

  .hero-title {
    font-size: 1.8rem;
  }

  .hero-subtitle {
    font-size: 1.2rem;
  }

  .cards-grid {
    grid-template-columns: 1fr;
  }

  .cta-card {
    padding: 32px 24px;
  }

  .cta-title {
    font-size: 1.3rem;
  }
}
</style>