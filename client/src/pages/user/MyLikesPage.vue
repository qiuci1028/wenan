<template>
  <div class="py-8">
    <div class="max-w-page mx-auto px-6">
      <h1 class="text-2xl font-semibold mb-6">我的点赞</h1>

      <div v-if="loading" class="flex justify-center py-16">
        <el-icon class="is-loading text-3xl text-secondary"><Loading /></el-icon>
      </div>

      <div v-else-if="wenanStore.myLikes.length === 0" class="empty-state">
        <div class="empty-state-icon">❤️</div>
        <p class="text-lg mb-2">还没有点赞过文案</p>
        <router-link to="/wenan" class="text-accent hover:underline">
          去文案库看看
        </router-link>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <wenan-card
          v-for="item in wenanStore.myLikes"
          :key="item.id"
          :wenan="item"
          @like="handleLike"
          @favorite="handleFavorite"
          @copy="handleCopy"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import { useWenanStore } from '@/stores/wenan'
import WenanCard from '@/components/common/WenanCard.vue'

const wenanStore = useWenanStore()
const loading = ref(true)

onMounted(async () => {
  try {
    await wenanStore.fetchMyLikes()
  } finally {
    loading.value = false
  }
})

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
    ElMessage.success('复制成功')
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}
</script>
