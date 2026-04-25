import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// 路由配置
const routes = [
  {
    path: '/',
    component: () => import('@/layouts/DefaultLayout.vue'),
    children: [
      {
        path: '',
        name: 'Home',
        component: () => import('@/pages/home/HomePage.vue')
      },
      {
        path: 'wenan',
        name: 'Wenan',
        component: () => import('@/pages/wenan/WenanPage.vue')
      },
      {
        path: 'wenan/:id',
        name: 'WenanDetail',
        component: () => import('@/pages/wenan/WenanDetailPage.vue')
      },
      {
        path: 'ai/generate',
        name: 'AiGenerate',
        component: () => import('@/pages/ai/AiGeneratePage.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'user/profile',
        name: 'Profile',
        component: () => import('@/pages/user/ProfilePage.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'user/likes',
        name: 'MyLikes',
        component: () => import('@/pages/user/MyLikesPage.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'user/favorites',
        name: 'MyFavorites',
        component: () => import('@/pages/user/MyFavoritesPage.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'user/uploads',
        name: 'MyUploads',
        component: () => import('@/pages/user/MyUploadsPage.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'vip',
        name: 'Vip',
        component: () => import('@/pages/vip/VipPage.vue')
      }
    ]
  },
  {
    path: '/auth',
    component: () => import('@/layouts/BlankLayout.vue'),
    children: [
      {
        path: 'login',
        name: 'Login',
        component: () => import('@/pages/auth/LoginPage.vue')
      },
      {
        path: 'register',
        name: 'Register',
        component: () => import('@/pages/auth/RegisterPage.vue')
      }
    ]
  },
  {
    path: '/admin',
    component: () => import('@/layouts/AdminLayout.vue'),
    children: [
      { path: '', name: 'Dashboard', component: () => import('@/pages/admin/DashboardPage.vue') },
      { path: 'users', name: 'AdminUsers', component: () => import('@/pages/admin/UsersPage.vue') },
      { path: 'wenans', name: 'AdminWenans', component: () => import('@/pages/admin/WenansPage.vue') },
      { path: 'categories', name: 'AdminCategories', component: () => import('@/pages/admin/CategoriesPage.vue') },
      { path: 'plans', name: 'AdminPlans', component: () => import('@/pages/admin/PlansPage.vue') },
      { path: 'orders', name: 'AdminOrders', component: () => import('@/pages/admin/OrdersPage.vue') },
      { path: 'ai-history', name: 'AdminAiHistory', component: () => import('@/pages/admin/AiHistoryPage.vue') },
      { path: 'settings', name: 'AdminSettings', component: () => import('@/pages/admin/SettingsPage.vue') }
    ]
  },
  {
    path: '/admin/login',
    name: 'AdminLogin',
    component: () => import('@/pages/admin/LoginPage.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
  } else {
    next()
  }
})

export default router
