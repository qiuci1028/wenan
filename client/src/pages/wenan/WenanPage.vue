<template>
  <div class="wenan-page">
    <!-- Hero Section -->
    <div class="wenan-hero">
      <div class="hero-content">
        <h1 class="hero-title">文案库</h1>
        <p class="hero-subtitle">发现触动心灵的文字</p>
      </div>
    </div>

    <div class="wenan-container">
      <!-- 风格标签栏 -->
      <div class="filter-section">
        <h3 class="filter-title">风格调性</h3>
        <div class="filter-pills">
          <button
            v-for="style in categoryStore.styles"
            :key="style.id"
            class="filter-pill"
            :class="{ active: categoryStore.activeStyle === style.id }"
            :style="categoryStore.activeStyle === style.id ? { background: style.color, borderColor: style.color } : {}"
            @click="handleStyleChange(style.id)"
          >
            <span>{{ style.icon }}</span>
            <span>{{ style.name }}</span>
          </button>
        </div>
      </div>

      <!-- 场景标签栏 -->
      <div class="filter-section">
        <h3 class="filter-title">使用场景</h3>
        <div class="filter-pills">
          <button
            v-for="scene in categoryStore.scenes"
            :key="scene.id"
            class="filter-pill"
            :class="{ active: categoryStore.activeScene === scene.id }"
            :style="categoryStore.activeScene === scene.id ? { background: scene.color, borderColor: scene.color } : {}"
            @click="handleSceneChange(scene.id)"
          >
            <span>{{ scene.icon }}</span>
            <span>{{ scene.name }}</span>
          </button>
        </div>
      </div>

      <!-- 分类标签栏（保留兼容） -->
      <div class="filter-section" v-if="false">
        <div class="category-pills">
          <button
            v-for="cat in categoryStore.categories"
            :key="cat.id"
            class="pill-item"
            :class="{ active: categoryStore.activeCategory === cat.id }"
            @click="handleCategoryChange(cat.id)"
          >
            <span class="pill-icon">{{ cat.icon }}</span>
            <span class="pill-name">{{ cat.name }}</span>
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="wenanStore.loading" class="loading-state">
        <el-icon class="is-loading loading-icon"><Loading /></el-icon>
        <p>加载中...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="wenanStore.list.length === 0" class="empty-state">
        <span class="empty-icon">📝</span>
        <h3>暂无文案</h3>
        <p>试试其他分类或关键词</p>
      </div>

      <!-- Cards Grid -->
      <div v-else class="cards-masonry">
        <div
          v-for="item in wenanStore.list"
          :key="item.id"
          class="wenan-card"
        >
          <p class="card-text">{{ item.text }}</p>
          <div class="card-footer">
            <div class="card-actions">
              <button
                class="action-btn"
                :class="{ active: item.liked }"
                @click.stop="handleLike(item.id)"
              >
                <span class="action-icon">{{ item.liked ? '❤️' : '🤍' }}</span>
                <span class="action-count">{{ item.likes || 0 }}</span>
              </button>

              <button
                class="action-btn"
                :class="{ active: item.favorited }"
                @click.stop="handleFavorite(item.id)"
              >
                <span class="action-icon">{{ item.favorited ? '⭐' : '☆' }}</span>
                <span class="action-count">{{ item.favorites || 0 }}</span>
              </button>

              <button
                class="action-btn copy-btn"
                @click.stop="handleCopy(item.text)"
              >
                <el-icon class="action-icon"><Document /></el-icon>
                <span class="action-count">复制</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="wenanStore.total > wenanStore.pageSize" class="pagination-wrap">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="wenanStore.pageSize"
          :total="wenanStore.total"
          layout="prev, pager, next"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <!-- Add Category Dialog -->
    <el-dialog v-model="showAddCategory" title="添加自定义分类" width="400px">
      <el-form :model="categoryForm" label-width="60px">
        <el-form-item label="名称">
          <el-input v-model="categoryForm.name" placeholder="分类名称（最多10字）" maxlength="10" />
        </el-form-item>
        <el-form-item label="图标">
          <el-input v-model="categoryForm.icon" placeholder="输入一个 Emoji，如 🌟" maxlength="2" />
        </el-form-item>
        <el-form-item label="颜色">
          <div class="flex items-center gap-2">
            <input type="color" v-model="categoryForm.color" class="w-10 h-10 cursor-pointer rounded" />
            <span class="text-secondary text-sm">{{ categoryForm.color }}</span>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddCategory = false">取消</el-button>
        <el-button type="primary" :loading="addingCategory" @click="handleAddCategory">
          创建
        </el-button>
      </template>
    </el-dialog>

    <!-- Upload Dialog -->
    <el-dialog v-model="showUploadDialog" title="上传文案" width="600px">
      <el-form :model="uploadForm" label-width="80px">
        <el-form-item label="文案内容">
          <el-input
            v-model="uploadForm.text"
            type="textarea"
            :rows="6"
            placeholder="请输入文案内容..."
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="分类">
          <div class="flex gap-2">
            <el-select v-model="uploadForm.category" placeholder="请选择分类" style="width: 100%">
              <el-option
                v-for="cat in categoryStore.categories.filter(c => c.id !== 'all')"
                :key="cat.id"
                :label="`${cat.icon} ${cat.name}`"
                :value="cat.id"
              />
            </el-select>
            <el-button @click="showNewCategory = true">＋ 新分类</el-button>
          </div>
          <!-- 已选择的分类标签 -->
          <div v-if="uploadForm.category" class="mt-2 flex items-center gap-2">
            <span class="text-sm text-secondary">已选择：</span>
            <el-tag
              v-for="cat in categoryStore.categories.filter(c => c.id === uploadForm.category)"
              :key="cat.id"
              :color="cat.color"
              effect="dark"
              size="small"
              round
            >
              {{ cat.icon }} {{ cat.name }}
            </el-tag>
          </div>
        </el-form-item>

        <el-form-item v-if="showNewCategory" label="新分类">
          <div class="flex flex-col gap-3 w-full">
            <div class="flex gap-2 items-center">
              <el-input v-model="newCategory.name" placeholder="分类名称（最多10字）" maxlength="10" style="width: 140px" />
              <div class="flex items-center gap-1">
                <span class="text-sm text-secondary">图标：</span>
                <div class="flex gap-1 flex-wrap">
                  <button
                    v-for="icon in categoryIcons"
                    :key="icon"
                    type="button"
                    class="w-8 h-8 rounded flex items-center justify-center text-lg transition-all"
                    :class="newCategory.icon === icon ? 'bg-accent text-white scale-110' : 'bg-gray-100 hover:bg-gray-200'"
                    @click="newCategory.icon = icon"
                  >
                    {{ icon }}
                  </button>
                </div>
              </div>
            </div>
            <div class="flex gap-2 items-center">
              <span class="text-sm text-secondary">颜色：</span>
              <input type="color" v-model="newCategory.color" class="w-8 h-8 cursor-pointer rounded" />
              <span class="text-xs text-secondary">{{ newCategory.color }}</span>
            </div>
            <div class="flex gap-2">
              <el-button type="primary" size="small" :loading="addingCategory" @click="handleQuickAddCategory">
                创建并选用
              </el-button>
              <el-button size="small" @click="showNewCategory = false">取消</el-button>
            </div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showUploadDialog = false">取消</el-button>
        <el-button type="primary" :loading="uploading" @click="handleUpload">
          上传
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Loading, Document } from '@element-plus/icons-vue'
import { useWenanStore } from '@/stores/wenan'
import { useCategoryStore } from '@/stores/category'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const wenanStore = useWenanStore()
const categoryStore = useCategoryStore()
const authStore = useAuthStore()

const searchKeyword = ref('')
const currentPage = ref(1)
const showAddCategory = ref(false)
const addingCategory = ref(false)
const showUploadDialog = ref(false)
const uploading = ref(false)
const showNewCategory = ref(false)

const categoryIcons = ['🌟', '💎', '🔥', '🌙', '🎵', '💫', '🌸', '🍃', '📖', '✨']

const newCategory = reactive({
  name: '',
  icon: '🌟',
  color: '#6B90AE'
})

const categoryForm = reactive({
  name: '',
  icon: '📂',
  color: '#6B90AE'
})

const uploadForm = reactive({
  text: '',
  category: ''
})

onMounted(async () => {
  await categoryStore.fetchCategories()
  await categoryStore.fetchStyles()
  await categoryStore.fetchScenes()

  if (route.query.upload) {
    showUploadDialog.value = true
    if (route.query.text) {
      uploadForm.text = decodeURIComponent(route.query.text)
    }
    if (route.query.category) {
      uploadForm.category = route.query.category
    }
  } else if (route.query.keyword) {
    searchKeyword.value = route.query.keyword
    wenanStore.search(searchKeyword.value)
  } else if (route.query.category) {
    categoryStore.setActiveCategory(route.query.category)
    wenanStore.fetchByCategory(route.query.category)
  } else {
    wenanStore.fetchList()
  }
})

watch(() => route.query, (query) => {
  if (query.upload) {
    showUploadDialog.value = true
    if (query.text) {
      uploadForm.text = decodeURIComponent(query.text)
    }
    if (query.category) {
      uploadForm.category = query.category
    }
  } else if (query.keyword) {
    searchKeyword.value = query.keyword
    wenanStore.search(searchKeyword.value)
  } else if (query.category) {
    categoryStore.setActiveCategory(query.category)
    wenanStore.fetchByCategory(query.category)
  }
})

function handleStyleChange(styleId) {
  categoryStore.setActiveStyle(styleId)
  fetchWenans()
}

function handleSceneChange(sceneId) {
  categoryStore.setActiveScene(sceneId)
  fetchWenans()
}

function fetchWenans() {
  const style = categoryStore.activeStyle
  const scene = categoryStore.activeScene
  if (style === 'all' && scene === 'all') {
    wenanStore.fetchList()
  } else {
    wenanStore.fetchByStyleAndScene(style, scene)
  }
}

function handleCategoryChange(categoryId) {
  searchKeyword.value = ''
  categoryStore.setActiveCategory(categoryId)
  if (categoryId === 'all') {
    wenanStore.fetchList()
  } else {
    wenanStore.fetchByCategory(categoryId)
  }
}

function handlePageChange(page) {
  currentPage.value = page
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function handleAddCategory() {
  if (!categoryForm.name.trim()) {
    ElMessage.warning('请输入分类名称')
    return
  }
  addingCategory.value = true
  try {
    await categoryStore.createCategory(categoryForm.name, categoryForm.icon, categoryForm.color)
    ElMessage.success('分类已创建')
    showAddCategory.value = false
    categoryForm.name = ''
    categoryForm.icon = '📂'
    categoryForm.color = '#6B90AE'
  } catch {
    ElMessage.error('创建失败')
  } finally {
    addingCategory.value = false
  }
}

async function handleDeleteCategory(id, name) {
  try {
    await ElMessageBox.confirm(`确认删除分类「${name}」？`, '提示', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })
    await categoryStore.deleteCategory(id)
    ElMessage.success('已删除')
    if (categoryStore.activeCategory === id) {
      handleCategoryChange('all')
    }
  } catch {
    // 用户取消
  }
}

async function handleQuickAddCategory() {
  if (!newCategory.name.trim()) {
    ElMessage.warning('请输入分类名称')
    return
  }
  addingCategory.value = true
  try {
    await categoryStore.createCategory(newCategory.name, newCategory.icon, newCategory.color)
    const created = categoryStore.categories.find(c => c.name === newCategory.name)
    if (created) {
      uploadForm.category = created.id
    }
    ElMessage.success('分类已创建')
    showNewCategory.value = false
    newCategory.name = ''
    newCategory.icon = '🌟'
    newCategory.color = '#6B90AE'
  } catch {
    ElMessage.error('创建失败')
  } finally {
    addingCategory.value = false
  }
}

async function handleUpload() {
  if (!uploadForm.text.trim()) {
    ElMessage.warning('请输入文案内容')
    return
  }
  if (!uploadForm.category) {
    ElMessage.warning('请选择分类')
    return
  }
  uploading.value = true
  try {
    await wenanStore.create(uploadForm.text, uploadForm.category)
    ElMessage.success('上传成功')
    showUploadDialog.value = false
    uploadForm.text = ''
    uploadForm.category = ''
    if (categoryStore.activeCategory === 'all') {
      wenanStore.fetchList()
    } else {
      wenanStore.fetchByCategory(categoryStore.activeCategory)
    }
  } catch {
    ElMessage.error('上传失败')
  } finally {
    uploading.value = false
  }
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

function handleCopy(text) {
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success('已复制')
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}
</script>

<style scoped>
.wenan-page {
  min-height: 100vh;
  background: #f0f9ff;
}

.wenan-hero {
  background: #6B90AE;
  padding: 50px 20px;
  text-align: center;
  color: white;
}

.hero-title {
  font-size: 2.2rem;
  font-weight: 600;
  margin-bottom: 8px;
}

.hero-subtitle {
  font-size: 1rem;
  opacity: 0.9;
}

.wenan-container {
  max-width: 1400px;
  margin: -30px auto 0;
  padding: 0 20px 50px;
}

/* 筛选区块 */
.filter-section {
  background: white;
  border-radius: 16px;
  padding: 16px 20px;
  margin-bottom: 16px;
  box-shadow: 0 2px 10px rgba(14, 165, 233, 0.06);
}

.filter-title {
  font-size: 0.85rem;
  color: #7A7A7A;
  margin-bottom: 12px;
  font-weight: 500;
}

.filter-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.filter-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #f8f8f8;
  border: 1px solid #e8e8e8;
  border-radius: 20px;
  font-size: 0.9rem;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-pill:hover {
  background: #f0f0f0;
  border-color: #ddd;
}

.filter-pill.active {
  color: white;
  font-weight: 500;
}

/* Category Pills */
.category-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 30px;
  padding: 20px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 2px 10px rgba(14, 165, 233, 0.06);
}

.pill-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  font-size: 0.9rem;
  color: #7A7A7A;
  cursor: pointer;
  transition: all 0.2s;
}

.pill-item:hover {
  background: #F5F0E8;
  border-color: #F5F0E8;
}

.pill-item.active {
  background: #6B90AE;
  border-color: transparent;
  color: white;
}

.pill-icon {
  font-size: 1rem;
}

.pill-delete {
  margin-left: 4px;
  opacity: 0.6;
  font-size: 1rem;
  line-height: 1;
}

.pill-delete:hover {
  opacity: 1;
  color: #dc2626;
}

.add-pill {
  background: transparent;
  border: 2px dashed #cbd5e1;
  color: #A0A0A0;
}

.add-pill:hover {
  border-color: #6B90AE;
  color: #6B90AE;
  background: rgba(37, 99, 235, 0.05);
}

/* Loading State */
.loading-state {
  text-align: center;
  padding: 80px 20px;
  color: #7A7A7A;
}

.loading-icon {
  font-size: 3rem;
  color: #6B90AE;
  margin-bottom: 16px;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 80px 20px;
  background: white;
  border-radius: 16px;
}

.empty-icon {
  font-size: 4rem;
  display: block;
  margin-bottom: 16px;
}

.empty-state h3 {
  font-size: 1.2rem;
  color: #1e3a5f;
  margin-bottom: 8px;
}

.empty-state p {
  color: #7A7A7A;
}

/* Cards Masonry */
.cards-masonry {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.wenan-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 15px rgba(14, 165, 233, 0.08);
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(14, 165, 233, 0.06);
}

.wenan-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(14, 165, 233, 0.15);
}

.card-text {
  font-size: 1rem;
  line-height: 1.8;
  color: #334155;
  flex: 1;
  margin-bottom: 20px;
  display: -webkit-box;
  -webkit-line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-footer {
  border-top: 1px solid #e2e8f0;
  padding-top: 16px;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
  transition: all 0.2s;
  color: #7A7A7A;
}

.action-btn:hover {
  background: #f1f5f9;
}

.action-btn.active {
  color: inherit;
}

.action-icon {
  font-size: 1rem;
}

.action-count {
  font-size: 0.85rem;
}

.copy-btn {
  margin-left: auto;
  color: #6B90AE;
}

.copy-btn:hover {
  background: rgba(59, 130, 246, 0.1);
}

/* Pagination */
.pagination-wrap {
  display: flex;
  justify-content: center;
  margin-top: 40px;
}

.pagination-wrap :deep(.el-pager li) {
  border-radius: 8px;
  margin: 0 4px;
}

.pagination-wrap :deep(.el-pager li.is-active) {
  background: #6B90AE;
}

@media (max-width: 768px) {
  .filter-bar {
    flex-direction: column;
  }

  .search-box {
    max-width: 100%;
    width: 100%;
  }

  .upload-btn {
    width: 100%;
    justify-content: center;
  }

  .cards-masonry {
    grid-template-columns: 1fr;
  }
}
</style>