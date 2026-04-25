<template>
  <div class="py-8">
    <div class="max-w-2xl mx-auto px-6">
      <div v-if="wenanStore.loading" class="flex justify-center py-16">
        <el-icon class="is-loading text-3xl text-secondary"><Loading /></el-icon>
      </div>

      <div v-else-if="!wenanStore.currentWenan" class="empty-state">
        <div class="empty-state-icon">📝</div>
        <p class="text-lg mb-4">文案不存在</p>
        <router-link to="/wenan" class="text-accent hover:underline">
          返回文案库
        </router-link>
      </div>

      <div v-else class="bg-white rounded-card p-8 shadow-sm">
        <!-- Text -->
        <div class="mb-8">
          <p class="text-xl leading-relaxed text-primary whitespace-pre-wrap">
            {{ wenanStore.currentWenan.text }}
          </p>
        </div>

        <!-- Meta -->
        <div class="flex items-center justify-between text-sm text-secondary border-t border-border pt-6">
          <div class="flex items-center gap-4">
            <!-- Author -->
            <span v-if="wenanStore.currentWenan.username">
              @{{ wenanStore.currentWenan.username }}
            </span>
            <!-- Date -->
            <span>{{ formatDate(wenanStore.currentWenan.created_at) }}</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-6 mt-6">
          <button
            class="flex items-center gap-2 px-4 py-2 rounded-full transition-all"
            :class="wenanStore.currentWenan.liked ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-secondary hover:bg-gray-200'"
            @click="handleLike"
          >
            <span class="text-lg">{{ wenanStore.currentWenan.liked ? '❤️' : '🤍' }}</span>
            {{ wenanStore.currentWenan.likes || 0 }}
          </button>

          <button
            class="flex items-center gap-2 px-4 py-2 rounded-full transition-all"
            :class="wenanStore.currentWenan.favorited ? 'bg-yellow-50 text-yellow-500' : 'bg-gray-100 text-secondary hover:bg-gray-200'"
            @click="handleFavorite"
          >
            <span class="text-lg">{{ wenanStore.currentWenan.favorited ? '⭐' : '☆' }}</span>
            {{ wenanStore.currentWenan.favorites || 0 }}
          </button>

          <button
            class="flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-white hover:bg-opacity-90 transition-all"
            @click="handleCopy"
          >
            复制文案
          </button>
        </div>
      </div>

      <!-- Back -->
      <div class="mt-8 text-center">
        <router-link to="/wenan" class="text-secondary hover:text-primary">
          ← 返回文案库
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import { useWenanStore } from '@/stores/wenan'

const route = useRoute()
const wenanStore = useWenanStore()

onMounted(async () => {
  await wenanStore.fetchById(route.params.id)
})

function formatDate(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

async function handleLike() {
  try {
    await wenanStore.toggleLike(wenanStore.currentWenan.id)
    ElMessage.success('已点赞')
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

async function handleFavorite() {
  try {
    await wenanStore.toggleFavorite(wenanStore.currentWenan.id)
    ElMessage.success('已收藏')
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

function handleCopy() {
  navigator.clipboard.writeText(wenanStore.currentWenan.text).then(() => {
    ElMessage.success('复制成功')
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}
</script>
