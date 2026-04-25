<template>
  <div class="min-h-screen bg-[#F5F0E8] flex">
    <!-- Sidebar -->
    <aside
      class="fixed left-0 top-0 bottom-0 w-64 bg-white shadow-lg z-40 transition-transform border-r border-[#E8E0D8]"
      :class="{ '-translate-x-full': !sidebarOpen }"
    >
      <div class="h-16 flex items-center px-6 border-b border-[#E8E0D8] gap-3">
        <img src="/logo.png" alt="logo" class="w-8 h-8 object-contain">
        <div class="flex flex-col">
          <span class="text-base font-semibold text-[#2D2D2D]">秋辞文案馆</span>
          <span class="text-xs text-[#7A7A7A]">管理后台</span>
        </div>
      </div>

      <nav class="p-4">
        <div v-for="group in menuGroups" :key="group.title" class="mb-4">
          <h4 class="text-xs uppercase text-[#7A7A7A] mb-2 px-3 font-medium">{{ group.title }}</h4>
          <router-link
            v-for="item in group.items"
            :key="item.path"
            :to="item.path"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all duration-200"
            :class="isActive(item.path)
              ? 'bg-[#6B90AE] text-white shadow-md'
              : 'text-[#7A7A7A] hover:bg-[#F5F0E8] hover:text-[#6B90AE]'"
          >
            <el-icon class="text-base"><component :is="item.icon" /></el-icon>
            <span class="font-medium">{{ item.name }}</span>
          </router-link>
        </div>
      </nav>
    </aside>

    <!-- Main Content -->
    <div class="flex-1 ml-64">
      <!-- Top Nav -->
      <header class="fixed top-0 right-0 left-64 h-16 bg-white/90 backdrop-blur-md shadow-sm z-30 border-b border-[#E8E0D8]">
        <div class="h-full flex items-center justify-between px-6">
          <button
            class="p-2 rounded-lg hover:bg-[#F5F0E8] transition-colors"
            @click="sidebarOpen = !sidebarOpen"
          >
            <el-icon size="20"><Operation /></el-icon>
          </button>

          <div class="flex items-center gap-4">
            <router-link to="/" class="text-sm text-[#7A7A7A] hover:text-[#6B90AE] transition-colors flex items-center gap-1">
              <el-icon><HomeFilled /></el-icon> 前台首页
            </router-link>
            <el-dropdown trigger="click" placement="bottom-end">
              <div class="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-[#F5F0E8] transition-colors">
                <el-avatar :size="32" :src="adminAuthStore.adminInfo?.avatar" class="bg-[#6B90AE] text-white">
                  {{ adminAuthStore.adminInfo?.username?.[0] }}
                </el-avatar>
                <span class="text-sm font-medium text-[#2D2D2D]">{{ adminAuthStore.adminInfo?.username }}</span>
                <span class="text-[#7A7A7A]">▾</span>
              </div>
              <template #dropdown>
                <el-dropdown-menu class="shadow-lg">
                  <el-dropdown-item @click="router.push('/')">
                    <span class="flex items-center gap-2"><el-icon><HomeFilled /></el-icon> 前往前台</span>
                  </el-dropdown-item>
                  <el-dropdown-item divided @click="handleLogout">
                    <span class="flex items-center gap-2 text-[#D9A8A8]"><el-icon><SwitchButton /></el-icon> 退出登录</span>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </header>

      <!-- Page Content -->
      <main class="pt-16 p-6 bg-[#F5F0E8] min-h-screen">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAdminAuthStore } from '@/stores/adminAuth'
import { ElMessage } from 'element-plus'
import { User, Document, Goods, DataLine, Collection, ShoppingCart, Memo, Operation, SwitchButton, HomeFilled } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const adminAuthStore = useAdminAuthStore()
const sidebarOpen = ref(true)

onMounted(() => {
  document.title = '秋辞文案馆 - 管理后台'
  if (!adminAuthStore.isAdminLoggedIn) {
    router.push('/admin/login')
  }
})

const menuGroups = [
  {
    title: '首页',
    items: [
      { name: '控制台', path: '/admin', icon: 'DataLine' }
    ]
  },
  {
    title: '用户管理',
    items: [
      { name: '用户管理', path: '/admin/users', icon: 'User' }
    ]
  },
  {
    title: '内容管理',
    items: [
      { name: '文案管理', path: '/admin/wenans', icon: 'Document' },
      { name: '分类管理', path: '/admin/categories', icon: 'Collection' }
    ]
  },
  {
    title: '会员管理',
    items: [
      { name: '套餐管理', path: '/admin/plans', icon: 'Goods' },
      { name: '订单管理', path: '/admin/orders', icon: 'ShoppingCart' }
    ]
  },
  {
    title: 'AI 管理',
    items: [
      { name: '生成记录', path: '/admin/ai-history', icon: 'Memo' }
    ]
  },
  {
    title: '系统',
    items: [
      { name: '系统设置', path: '/admin/settings', icon: 'Operation' }
    ]
  }
]

function isActive(path) {
  if (path === '/admin') {
    return route.path === '/admin'
  }
  return route.path.startsWith(path)
}

function handleLogout() {
  adminAuthStore.logout()
  ElMessage.success('已退出登录')
}
</script>