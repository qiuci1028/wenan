<template>
  <div class="app-layout">
    <!-- Header -->
    <header class="app-header">
      <div class="header-inner">
        <!-- Logo -->
        <router-link to="/" class="logo">
          <img src="/logo.png" alt="秋辞文案馆" class="logo-img" />
        </router-link>

        <!-- Navigation -->
        <nav class="main-nav">
          <router-link
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="nav-link"
            :class="{ active: isActive(item.path) }"
          >
            <el-icon class="nav-icon"><component :is="item.icon" /></el-icon>
            {{ item.name }}
          </router-link>
        </nav>

        <!-- Right Actions -->
        <div class="header-actions">
          <!-- Search Button -->
          <router-link v-if="showSearch" to="/wenan" class="search-btn">
            <el-icon><Search /></el-icon>
            <span>搜索</span>
          </router-link>

          <!-- Upload Button -->
          <router-link v-if="authStore.isLoggedIn" to="/wenan?upload=true" class="upload-btn-header">
            <el-icon><EditPen /></el-icon>
            <span>上传</span>
          </router-link>

          <!-- User Menu -->
          <template v-if="authStore.isLoggedIn">
            <el-dropdown trigger="click" placement="bottom-end">
              <div class="user-avatar-wrapper">
                <el-avatar :size="36" :src="authStore.userInfo?.avatar" class="user-avatar">
                  {{ authStore.userInfo?.username?.[0] }}
                </el-avatar>
                <div class="user-info-stack">
                  <span class="user-name">{{ authStore.userInfo?.username }}</span>
                  <span class="user-name-id">@{{ authStore.userInfo?.wenanId }}</span>
                </div>
              </div>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item v-if="authStore.isAdmin">
                    <router-link to="/admin" class="dropdown-link">
                      <el-icon><Setting /></el-icon> 管理后台
                    </router-link>
                  </el-dropdown-item>
                  <el-dropdown-item>
                    <router-link to="/user/profile" class="dropdown-link">
                      <el-icon><User /></el-icon> 个人中心
                    </router-link>
                  </el-dropdown-item>
                  <el-dropdown-item>
                    <router-link to="/user/likes" class="dropdown-link">
                      <el-icon><Star /></el-icon> 我的点赞
                    </router-link>
                  </el-dropdown-item>
                  <el-dropdown-item>
                    <router-link to="/user/favorites" class="dropdown-link">
                      <el-icon><Star /></el-icon> 我的收藏
                    </router-link>
                  </el-dropdown-item>
                  <el-dropdown-item divided @click="handleLogout">
                    <span class="dropdown-link danger"><el-icon><SwitchButton /></el-icon> 退出登录</span>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
          <template v-else>
            <router-link to="/auth/login" class="login-btn">
              登录
            </router-link>
          </template>
        </div>

        <!-- Mobile Menu Toggle -->
        <button class="mobile-menu-btn" @click="mobileMenuOpen = !mobileMenuOpen">
          <el-icon size="20"><Menu /></el-icon>
        </button>
      </div>

      <!-- Mobile Menu -->
      <transition name="slide">
        <div v-if="mobileMenuOpen" class="mobile-menu">
          <router-link
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="mobile-nav-link"
            :class="{ active: isActive(item.path) }"
            @click="mobileMenuOpen = false"
          >
            <el-icon><component :is="item.icon" /></el-icon>
            {{ item.name }}
          </router-link>
          <template v-if="authStore.isLoggedIn">
            <router-link to="/user/profile" class="mobile-nav-link" @click="mobileMenuOpen = false">
              <el-icon><User /></el-icon> 个人中心
            </router-link>
            <button class="mobile-nav-link logout" @click="handleLogout">
              <el-icon><SwitchButton /></el-icon> 退出登录
            </button>
          </template>
          <template v-else>
            <router-link to="/auth/login" class="mobile-nav-link" @click="mobileMenuOpen = false">
              <el-icon><User /></el-icon> 登录
            </router-link>
          </template>
        </div>
      </transition>
    </header>

    <!-- Main Content -->
    <main class="app-main">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'
import { HomeFilled, Document, ChatDotRound, Goods, Search, EditPen, User, Star, Setting, SwitchButton, Menu } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const searchKeyword = ref('')
const mobileMenuOpen = ref(false)

const navItems = [
  { name: '首页', path: '/', icon: 'HomeFilled' },
  { name: '文案库', path: '/wenan', icon: 'Document' },
  { name: 'AI写作', path: '/ai/generate', icon: 'ChatDotRound' },
  { name: '会员', path: '/vip', icon: 'Goods' }
]

const showSearch = computed(() => {
  return ['/', '/wenan'].includes(route.path)
})

function isActive(path) {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(path)
}

function handleSearch() {
  if (searchKeyword.value.trim()) {
    router.push({ path: '/wenan', query: { keyword: searchKeyword.value } })
    searchKeyword.value = ''
  }
}

function handleLogout() {
  authStore.logout()
  ElMessage.success('已退出登录')
  mobileMenuOpen.value = false
}
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Header */
.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: white;
  backdrop-filter: blur(10px);
  border-bottom: 1px solid #E8E0D8;
}

.header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  height: 64px;
  display: flex;
  align-items: center;
  gap: 32px;
}

/* Logo */
.logo {
  display: flex;
  align-items: center;
  text-decoration: none;
  flex-shrink: 0;
}

.logo-img {
  height: 40px;
  width: auto;
}

/* Navigation */
.main-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  text-decoration: none;
  font-size: 0.95rem;
  color: #7A7A7A;
  transition: all 0.2s;
}

.nav-link:hover {
  background: #F5F0E8;
  color: #6B90AE;
}

.nav-link.active {
  background: #6B90AE;
  color: white;
}

.nav-icon {
  font-size: 1.1rem;
}

/* Actions */
.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #F5F0E8;
  border: 1px solid #E8E0D8;
  border-radius: 20px;
  text-decoration: none;
  font-size: 0.9rem;
  color: #6B90AE;
  transition: all 0.2s;
}

.search-btn:hover {
  background: #E8E0D8;
}

.upload-btn-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #6B90AE;
  border-radius: 20px;
  text-decoration: none;
  font-size: 0.9rem;
  color: white;
  transition: all 0.2s;
}

.upload-btn-header:hover {
  background: #557590;
}

/* User Avatar */
.user-avatar {
  cursor: pointer;
  border-radius: 50%;
  transition: transform 0.2s;
  background: #D9A8A8;
}

.user-avatar:hover {
  transform: scale(1.05);
}

.user-avatar-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.user-info-stack {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}

.user-name {
  font-weight: 600;
  color: #2D2D2D;
  font-size: 0.9rem;
}

.user-name-id {
  font-size: 0.75rem;
  color: #7A7A7A;
}

.username {
  font-weight: 600;
  color: #2D2D2D;
  margin-bottom: 2px;
}

.userid {
  font-size: 0.85rem;
  color: #7A7A7A;
}

.dropdown-link {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: #2D2D2D;
  font-size: 0.95rem;
}

.dropdown-link.danger {
  color: #D9A8A8;
}

:deep(.el-dropdown-menu__item) {
  padding: 8px 16px;
}

/* Login Button */
.login-btn {
  padding: 8px 20px;
  border-radius: 20px;
  background: #6B90AE;
  color: white;
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 500;
  transition: all 0.2s;
}

.login-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(107, 144, 174, 0.4);
}

/* Mobile Menu */
.mobile-menu-btn {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: #6B90AE;
}

.mobile-menu {
  display: none;
  flex-direction: column;
  padding: 16px;
  background: white;
  border-top: 1px solid #E8E0D8;
}

.mobile-nav-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  text-decoration: none;
  color: #7A7A7A;
  font-size: 1rem;
  transition: all 0.2s;
  background: none;
  border: none;
  width: 100%;
  text-align: left;
  cursor: pointer;
}

.mobile-nav-link:hover {
  background: #F5F0E8;
  color: #6B90AE;
}

.mobile-nav-link.logout {
  color: #D9A8A8;
}

/* Main Content */
.app-main {
  flex: 1;
}

/* Transitions */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .main-nav {
    display: none;
  }

  .header-search {
    display: none;
  }

  .mobile-menu-btn {
    display: block;
  }

  .mobile-menu {
    display: flex;
  }

  .header-actions {
    display: none;
  }

  .logo-text {
    font-size: 1rem;
  }
}
</style>