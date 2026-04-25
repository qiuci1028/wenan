<template>
  <div>
    <h1 class="text-2xl font-semibold mb-6">控制台</h1>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div class="bg-white rounded-card p-6 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-secondary text-sm">用户总数</p>
            <p class="text-3xl font-semibold mt-1">{{ stats.users || 0 }}</p>
          </div>
          <div class="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-2xl">
            👤
          </div>
        </div>
      </div>

      <div class="bg-white rounded-card p-6 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-secondary text-sm">文案总数</p>
            <p class="text-3xl font-semibold mt-1">{{ stats.wenans || 0 }}</p>
          </div>
          <div class="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-2xl">
            📄
          </div>
        </div>
      </div>

      <div class="bg-white rounded-card p-6 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-secondary text-sm">管理员总数</p>
            <p class="text-3xl font-semibold mt-1">{{ stats.admins || 0 }}</p>
          </div>
          <div class="w-12 h-12 rounded-full bg-yellow-50 flex items-center justify-center text-2xl">
            ⭐
          </div>
        </div>
      </div>

      <div class="bg-white rounded-card p-6 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-secondary text-sm">订单总数</p>
            <p class="text-3xl font-semibold mt-1">{{ stats.orders || 0 }}</p>
          </div>
          <div class="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-2xl">
            🛒
          </div>
        </div>
      </div>

      <div class="bg-white rounded-card p-6 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-secondary text-sm">自定义分类</p>
            <p class="text-3xl font-semibold mt-1">{{ stats.categories || 0 }}</p>
          </div>
          <div class="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-2xl">
            📁
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="bg-white rounded-card p-6 shadow-sm">
      <h2 class="text-lg font-semibold mb-4">系统概览</h2>
      <p class="text-secondary text-sm">数据统计来源：主数据库 wenan_001</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { adminApi } from '@/api/adminAuth'

const stats = ref({
  users: 0,
  wenans: 0,
  admins: 0,
  categories: 0,
  orders: 0
})

onMounted(async () => {
  try {
    const res = await adminApi.getStats()
    stats.value = res.data || stats.value
  } catch (e) {
    console.error('获取统计失败', e)
  }
})
</script>
