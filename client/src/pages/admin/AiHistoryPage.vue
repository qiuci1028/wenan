<template>
  <div>
    <h1 class="text-2xl font-semibold mb-6">AI 生成记录</h1>

    <!-- Filter -->
    <div class="bg-white rounded-card p-4 shadow-sm mb-6">
      <div class="flex gap-4 items-center">
        <el-select v-model="filterCategory" placeholder="筛选分类" clearable style="width: 150px">
          <el-option label="全部" value="" />
          <el-option label="爱情" value="love" />
          <el-option label="人生" value="life" />
          <el-option label="励志" value="inspirational" />
          <el-option label="情感" value="emotion" />
        </el-select>
        <el-select v-model="filterStyle" placeholder="筛选风格" clearable style="width: 150px">
          <el-option label="全部" value="" />
          <el-option label="文艺清新" value="literary" />
          <el-option label="幽默风趣" value="humor" />
          <el-option label="深情款款" value="romantic" />
          <el-option label="励志向上" value="inspirational" />
          <el-option label="简约大气" value="simple" />
        </el-select>
        <el-button @click="clearFilters">清除筛选</el-button>
      </div>
    </div>

    <!-- History List -->
    <div class="bg-white rounded-card p-6 shadow-sm">
      <div v-if="loading" class="text-center py-10">
        <el-icon class="is-loading text-2xl"><Loading /></el-icon>
      </div>

      <el-empty v-else-if="filteredList.length === 0" description="暂无 AI 生成记录" />

      <div v-else class="space-y-4">
        <div
          v-for="item in filteredList"
          :key="item.id"
          class="border border-gray-100 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div class="flex justify-between items-start mb-3">
            <div class="flex gap-2">
              <el-tag size="small" type="info">{{ getCategoryName(item.category) }}</el-tag>
              <el-tag size="small">{{ getStyleName(item.style) }}</el-tag>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-sm text-gray-400">{{ formatDate(item.created_at) }}</span>
              <button
                class="text-gray-400 hover:text-red-500 transition-colors"
                @click="handleDelete(item.id)"
              >
                <el-icon><Delete /></el-icon>
              </button>
            </div>
          </div>

          <div class="mb-3">
            <p class="text-sm text-gray-500 mb-1">用户需求：</p>
            <p class="text-gray-700">{{ item.prompt }}</p>
          </div>

          <div class="bg-gray-50 rounded-lg p-3 mb-3">
            <p class="text-sm text-gray-500 mb-1">生成结果：</p>
            <p class="text-gray-800 whitespace-pre-wrap">{{ item.result }}</p>
          </div>

          <div class="flex gap-2">
            <el-button size="small" @click="copyResult(item.result)">
              <el-icon><Document /></el-icon> 复制
            </el-button>
            <el-button size="small" type="primary" @click="uploadToWenan(item)">
              <el-icon><Top /></el-icon> 上传文案库
            </el-button>
            <el-button size="small" @click="regenerate(item)">
              <el-icon><RefreshRight /></el-icon> 重新生成
            </el-button>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="total > pageSize" class="mt-6 flex justify-center">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="total"
          layout="prev, pager, next"
          @current-change="handlePageChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Loading, Delete, Document, Top, RefreshRight } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { adminApi } from '@/api/adminAuth'

const router = useRouter()

const loading = ref(false)
const historyList = ref([])
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)

const filterCategory = ref('')
const filterStyle = ref('')

const categoryMap = {
  'love': '爱情',
  'life': '人生',
  'inspirational': '励志',
  'emotion': '情感',
  'all': '全部'
}

const styleMap = {
  'literary': '文艺清新',
  'humor': '幽默风趣',
  'romantic': '深情款款',
  'inspirational': '励志向上',
  'simple': '简约大气'
}

const filteredList = computed(() => {
  let result = historyList.value
  if (filterCategory.value) {
    result = result.filter(item => item.category === filterCategory.value)
  }
  if (filterStyle.value) {
    result = result.filter(item => item.style === filterStyle.value)
  }
  return result
})

function getCategoryName(cat) {
  return categoryMap[cat] || cat || '未知'
}

function getStyleName(style) {
  return styleMap[style] || style || '未知'
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

async function loadHistory() {
  loading.value = true
  try {
    const res = await adminApi.getAiHistory(currentPage.value, pageSize.value)
    if (res.code === 0 || res.code === 200) {
      historyList.value = res.data?.list || []
      total.value = res.data?.total || 0
    }
  } catch (err) {
    console.error('加载历史失败:', err)
    ElMessage.error('加载历史记录失败')
  } finally {
    loading.value = false
  }
}

function handlePageChange(page) {
  currentPage.value = page
  loadHistory()
}

function clearFilters() {
  filterCategory.value = ''
  filterStyle.value = ''
}

function copyResult(text) {
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success('已复制到剪贴板')
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}

function uploadToWenan(item) {
  router.push({
    path: '/wenan',
    query: {
      upload: 'true',
      text: encodeURIComponent(item.result),
      category: item.category || 'all'
    }
  })
}

function regenerate(item) {
  // 可以跳转到AI生成页面并带上之前的内容
  router.push({
    path: '/ai/generate',
    query: {
      prompt: encodeURIComponent(item.prompt),
      category: item.category || 'all',
      style: item.style || 'literary'
    }
  })
}

async function handleDelete(id) {
  try {
    await ElMessageBox.confirm('确认删除这条记录？', '提示', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })
    await adminApi.deleteAiHistory(id)
    ElMessage.success('已删除')
    loadHistory()
  } catch {
    // 用户取消
  }
}

onMounted(() => {
  loadHistory()
})
</script>

<style scoped>
.is-loading {
  animation: rotating 2s linear infinite;
}
@keyframes rotating {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>