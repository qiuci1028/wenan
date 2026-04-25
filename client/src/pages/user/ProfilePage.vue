<template>
  <div class="py-8">
    <div class="max-w-page mx-auto px-6">
      <!-- Profile Header -->
      <div class="bg-white rounded-card overflow-hidden shadow-sm mb-8">
        <!-- Cover -->
        <div
          class="h-48 md:h-64 relative cursor-pointer hover:opacity-90 transition-opacity overflow-hidden"
          @click="handleChangeCover"
        >
          <div class="absolute inset-0 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400"></div>
          <!-- 背景视频 -->
          <video
            v-if="authStore.userInfo?.coverVideo"
            :src="authStore.userInfo.coverVideo"
            class="absolute inset-0 w-full h-full object-cover"
            autoplay muted loop playsinline
          />
          <!-- 背景图片 -->
          <img
            v-else-if="authStore.userInfo?.coverImage"
            :src="authStore.userInfo.coverImage"
            class="absolute inset-0 w-full h-full object-cover"
            @error="handleCoverError"
          />
          <div class="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all flex items-center justify-center">
            <span class="text-white text-opacity-0 hover:text-opacity-100 transition-all text-sm">
              📷 点击更换背景（支持图片/视频）
            </span>
          </div>
        </div>

        <!-- Avatar & Info -->
        <div class="px-6 pb-6 -mt-16 relative z-10">
          <div class="flex items-end gap-4">
            <el-avatar
              :size="96"
              :src="authStore.userInfo?.avatar"
              class="border-4 border-white shadow-md cursor-pointer bg-gradient-to-br from-purple-500 to-pink-500"
              @click="handleChangeAvatar"
            >
              {{ authStore.userInfo?.username?.[0] }}
            </el-avatar>
            <div class="pb-2">
              <h1 class="text-2xl font-semibold text-primary drop-shadow-sm">
                {{ authStore.userInfo?.username || '用户' }}
              </h1>
              <p class="text-secondary">@{{ authStore.userInfo?.wenanId || '' }}</p>
            </div>
          </div>

          <div class="flex items-start justify-between mt-4">
            <div class="flex flex-wrap gap-4 text-sm text-primary">
              <span v-if="authStore.userInfo?.birthday">🎂 {{ authStore.userInfo.birthday }}</span>
              <span v-if="authStore.userInfo?.constellation">⭐ {{ authStore.userInfo.constellation }}</span>
              <span v-if="authStore.userInfo?.location">📍 {{ authStore.userInfo.location }}</span>
            </div>

            <el-button @click="showEditDialog = true">
              编辑资料
            </el-button>
          </div>

          <p v-if="authStore.userInfo?.bio" class="mt-4 text-primary">
            {{ authStore.userInfo.bio }}
          </p>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div class="bg-white rounded-card p-6 text-center shadow-sm">
          <div class="text-3xl font-semibold text-accent mb-1">
            {{ wenanStore.myStats?.uploads || 0 }}
          </div>
          <div class="text-secondary text-sm">上传文案</div>
        </div>
        <div class="bg-white rounded-card p-6 text-center shadow-sm">
          <div class="text-3xl font-semibold text-accent-red mb-1">
            {{ wenanStore.myStats?.likes || 0 }}
          </div>
          <div class="text-secondary text-sm">点赞</div>
        </div>
        <div class="bg-white rounded-card p-6 text-center shadow-sm">
          <div class="text-3xl font-semibold text-accent-gold mb-1">
            {{ wenanStore.myStats?.favorites || 0 }}
          </div>
          <div class="text-secondary text-sm">收藏</div>
        </div>
      </div>

      <!-- Content Tabs -->
      <div class="bg-white rounded-card shadow-sm">
        <!-- Tab Header -->
        <div class="tabs-header">
          <button
            v-for="tab in tabs"
            :key="tab.name"
            class="tab-btn"
            :class="{ active: activeTab === tab.name }"
            @click="activeTab = tab.name"
          >
            <el-icon class="tab-icon"><component :is="tab.icon" /></el-icon>
            <span class="tab-name">{{ tab.label }}</span>
          </button>
        </div>

        <!-- Tab Content -->
        <div class="tab-content">
          <!-- 我的上传 -->
          <div v-show="activeTab === 'uploads'" class="content-panel">
            <div v-if="wenanStore.myUploads.length === 0" class="empty-state py-8">
              <div class="empty-state-icon">📝</div>
              <p>还没有上传过文案</p>
            </div>
            <div v-else class="cards-grid">
              <wenan-card
                v-for="item in wenanStore.myUploads"
                :key="item.id"
                :wenan="item"
                :show-edit-delete="true"
                @like="handleLike"
                @favorite="handleFavorite"
                @copy="handleCopy"
              />
            </div>
          </div>

          <!-- 我的点赞 -->
          <div v-show="activeTab === 'likes'" class="content-panel">
            <div v-if="wenanStore.myLikes.length === 0" class="empty-state py-8">
              <div class="empty-state-icon">❤️</div>
              <p>还没有点赞过文案</p>
            </div>
            <div v-else class="cards-grid">
              <wenan-card
                v-for="item in wenanStore.myLikes"
                :key="item.id + '-' + likesKey"
                :wenan="item"
                @like="handleLike"
                @favorite="handleFavorite"
                @copy="handleCopy"
              />
            </div>
          </div>

          <!-- 我的收藏 -->
          <div v-show="activeTab === 'favorites'" class="content-panel">
            <div v-if="wenanStore.myFavorites.length === 0" class="empty-state py-8">
              <div class="empty-state-icon">⭐</div>
              <p>还没有收藏过文案</p>
            </div>
            <div v-else class="cards-grid">
              <wenan-card
                v-for="item in wenanStore.myFavorites"
                :key="item.id + '-' + favoritesKey"
                :wenan="item"
                @like="handleLike"
                @favorite="handleFavorite"
                @copy="handleCopy"
              />
            </div>
          </div>

          <!-- AI生成 -->
          <div v-show="activeTab === 'ai'" class="content-panel">
            <div v-if="aiHistory.length === 0" class="empty-state py-8">
              <div class="empty-state-icon">🤖</div>
              <p>还没有AI生成的文案</p>
            </div>
            <div v-else class="ai-list">
              <div
                v-for="item in aiHistory"
                :key="item.id"
                class="ai-item"
              >
                <p class="ai-text">{{ item.result }}</p>
                <div class="ai-meta">
                  <div class="ai-tags">
                    <span v-if="item.category" class="ai-tag">{{ getCategoryName(item.category) }}</span>
                    <span v-if="item.style" class="ai-tag">{{ getStyleName(item.style) }}</span>
                    <span class="ai-date">{{ formatDate(item.created_at) }}</span>
                  </div>
                  <div class="ai-actions">
                    <el-button size="small" @click="copyAiResult(item.result)">复制</el-button>
                    <el-button size="small" type="danger" @click="deleteAiHistory(item.id)">删除</el-button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Dialog -->
    <el-dialog v-model="showEditDialog" title="编辑资料" width="500px">
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="头像">
          <div class="flex items-center gap-4">
            <el-avatar :size="64" :src="editForm.avatar">
              {{ editForm.username?.[0] }}
            </el-avatar>
            <el-button size="small" @click="avatarInputRef?.click()">更换头像</el-button>
          </div>
        </el-form-item>
        <el-form-item label="用户名">
          <el-input v-model="editForm.username" />
          <div class="text-xs text-gray-400 mt-1">一周内修改上限5次</div>
        </el-form-item>
        <el-form-item label="文案号">
          <div class="flex items-center gap-2">
            <el-input v-model="editForm.wenanId" style="flex: 1" />
            <span v-if="wenanIdChangeInfo" class="text-xs text-gray-400">{{ wenanIdChangeInfo }}</span>
          </div>
        </el-form-item>
        <el-form-item label="简介">
          <el-input v-model="editForm.bio" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="生日">
          <el-date-picker
            v-model="editForm.birthday"
            type="date"
            placeholder="选择生日"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="星座">
          <el-select v-model="editForm.constellation" placeholder="选择星座" style="width: 100%">
            <el-option v-for="item in constellations" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="地区">
          <el-input v-model="editForm.location" placeholder="请输入地区" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSaveProfile">
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- Avatar Upload Input -->
    <input
      ref="avatarInputRef"
      type="file"
      accept="image/*"
      class="hidden"
      @change="handleAvatarUpload"
    />

    <!-- Avatar/Cover Upload -->
    <input
      ref="coverInputRef"
      type="file"
      accept="image/*,video/*"
      class="hidden"
      @change="handleCoverUpload"
    />
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { useWenanStore } from '@/stores/wenan'
import WenanCard from '@/components/common/WenanCard.vue'
import { aiApi } from '@/api/ai'
import { Document, Star, ChatDotRound } from '@element-plus/icons-vue'

const authStore = useAuthStore()
const wenanStore = useWenanStore()

const activeTab = ref('uploads')
const showEditDialog = ref(false)
const saving = ref(false)
const coverInputRef = ref(null)
const avatarInputRef = ref(null)
const aiHistory = ref([])
const likesKey = ref(0)
const favoritesKey = ref(0)

// 动态Tab列表
const tabs = [
  { name: 'uploads', label: '我的上传', icon: 'Document' },
  { name: 'likes', label: '我的点赞', icon: 'Star' },
  { name: 'favorites', label: '我的收藏', icon: 'Star' },
  { name: 'ai', label: 'AI生成', icon: 'ChatDotRound' }
]

const constellations = [
  '白羊座', '金牛座', '双子座', '巨蟹座',
  '狮子座', '处女座', '天秤座', '天蝎座',
  '射手座', '摩羯座', '水瓶座', '双鱼座'
]

// 根据生日自动识别星座
function getConstellationFromBirthday(birthday) {
  if (!birthday) return ''
  const month = parseInt(birthday.substring(5, 7))
  const day = parseInt(birthday.substring(8, 10))
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return '白羊座'
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return '金牛座'
  if ((month === 5 && day >= 21) || (month === 6 && day <= 21)) return '双子座'
  if ((month === 6 && day >= 22) || (month === 7 && day <= 22)) return '巨蟹座'
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return '狮子座'
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return '处女座'
  if ((month === 9 && day >= 23) || (month === 10 && day <= 23)) return '天秤座'
  if ((month === 10 && day >= 24) || (month === 11 && day <= 22)) return '天蝎座'
  if ((month === 11 && day >= 23) || (month === 12 && day <= 21)) return '射手座'
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return '摩羯座'
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return '水瓶座'
  if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return '双鱼座'
  return ''
}

const editForm = reactive({
  username: '',
  bio: '',
  birthday: '',
  constellation: '',
  location: '',
  avatar: '',
  wenanId: ''
})

const wenanIdChangeInfo = ref('')

// 监听生日变化，自动更新星座
watch(() => editForm.birthday, (newBirthday) => {
  if (newBirthday) {
    editForm.constellation = getConstellationFromBirthday(newBirthday)
  }
})

onMounted(async () => {
  await Promise.all([
    wenanStore.fetchMyUploads(),
    wenanStore.fetchMyLikes(),
    wenanStore.fetchMyFavorites(),
    wenanStore.fetchMyStats(),
    loadAiHistory()
  ])

  if (authStore.userInfo) {
    editForm.username = authStore.userInfo.username || ''
    editForm.bio = authStore.userInfo.bio || ''
    editForm.birthday = authStore.userInfo.birthday || ''
    editForm.constellation = authStore.userInfo.constellation || ''
    editForm.location = authStore.userInfo.location || ''
    editForm.avatar = authStore.userInfo.avatar || ''
    editForm.wenanId = authStore.userInfo.wenanId || ''
    updateWenanIdChangeInfo()
  }
})

function updateWenanIdChangeInfo() {
  const lastChanged = authStore.userInfo?.wenanIdLastChanged
  if (lastChanged) {
    const last = new Date(lastChanged)
    const oneYearLater = new Date(last.getTime() + 365 * 24 * 60 * 60 * 1000)
    const now = new Date()
    if (now < oneYearLater) {
      const daysLeft = Math.ceil((oneYearLater - now) / (24 * 60 * 60 * 1000))
      wenanIdChangeInfo.value = `需要等到 ${oneYearLater.toLocaleDateString()} 才能再次修改（还剩${daysLeft}天）`
    } else {
      wenanIdChangeInfo.value = '已可修改'
    }
  } else {
    wenanIdChangeInfo.value = ''
  }
}

function handleChangeCover() {
  coverInputRef.value?.click()
}

function handleCoverUpload(event) {
  const file = event.target.files[0]
  if (!file) return

  const isVideo = file.type.startsWith('video/')
  const reader = new FileReader()
  reader.onload = async (e) => {
    const base64 = e.target.result
    try {
      if (isVideo) {
        await authStore.updateUserInfo({ coverVideo: base64, coverImage: null })
        ElMessage.success('背景视频已更新')
      } else {
        await authStore.updateUserInfo({ coverImage: base64, coverVideo: null })
        ElMessage.success('背景图片已更新')
      }
    } catch (error) {
      ElMessage.error('更新失败')
    }
  }
  reader.readAsDataURL(file)
  event.target.value = ''
}

function handleCoverError() {
  // 背景加载失败时的处理
}

function handleChangeAvatar() {
  avatarInputRef.value?.click()
}

function handleAvatarUpload(event) {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = async (e) => {
    const base64 = e.target.result
    editForm.avatar = base64
    // 同时更新显示
    if (authStore.userInfo) {
      authStore.userInfo.avatar = base64
    }
  }
  reader.readAsDataURL(file)
  event.target.value = ''
}

async function handleSaveProfile() {
  saving.value = true
  try {
    await authStore.updateUserInfo({
      username: editForm.username,
      bio: editForm.bio,
      birthday: editForm.birthday,
      constellation: editForm.constellation,
      location: editForm.location,
      avatar: editForm.avatar,
      wenanId: editForm.wenanId !== authStore.userInfo?.wenanId ? editForm.wenanId : undefined
    })
    ElMessage.success('资料已更新')
    showEditDialog.value = false
    updateWenanIdChangeInfo()
  } catch (error) {
    ElMessage.error('更新失败')
  } finally {
    saving.value = false
  }
}

async function handleLike(id) {
  try {
    await wenanStore.toggleLike(id)
    likesKey.value++
    ElMessage.success('已点赞')
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

async function handleFavorite(id) {
  try {
    await wenanStore.toggleFavorite(id)
    favoritesKey.value++
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

function copyAiResult(text) {
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success('已复制')
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}

async function loadAiHistory() {
  try {
    const res = await aiApi.getHistory(1, 100)
    if (res.code === 200) {
      aiHistory.value = res.data?.list || []
    }
  } catch (err) {
    console.error('加载AI历史失败:', err)
  }
}

async function deleteAiHistory(id) {
  try {
    await aiApi.deleteHistory(id)
    ElMessage.success('已删除')
    loadAiHistory()
  } catch (err) {
    ElMessage.error('删除失败')
  }
}

function getCategoryName(cat) {
  const map = { love: '爱情', life: '人生', inspirational: '励志', emotion: '情感', all: '全部' }
  return map[cat] || cat
}

function getStyleName(style) {
  const map = { literary: '文艺清新', humor: '幽默风趣', romantic: '深情款款', inspirational: '励志向上', simple: '简约大气' }
  return map[style] || style
}

function formatDate(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
/* Tab Header */
.tabs-header {
  display: flex;
  gap: 8px;
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
  overflow-x: auto;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 25px;
  font-size: 0.9rem;
  color: #7A7A7A;
  cursor: pointer;
  transition: all 0.25s;
  white-space: nowrap;
}

.tab-btn:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.tab-btn.active {
  background: linear-gradient(135deg, #6B90AE, #6B90AE);
  border-color: transparent;
  color: white;
  box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);
}

.tab-icon {
  font-size: 1.1rem;
}

.tab-name {
  font-weight: 500;
}

/* Tab Content */
.tab-content {
  padding: 24px;
}

.content-panel {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Cards Grid */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

/* AI List */
.ai-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ai-item {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px 20px;
  transition: all 0.2s;
}

.ai-item:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.ai-text {
  font-size: 0.95rem;
  line-height: 1.7;
  color: #334155;
  margin-bottom: 12px;
  white-space: pre-wrap;
}

.ai-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.ai-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.ai-tag {
  padding: 2px 10px;
  background: #F5F0E8;
  color: #6B90AE;
  border-radius: 12px;
  font-size: 0.75rem;
}

.ai-date {
  color: #A0A0A0;
  font-size: 0.75rem;
}

.ai-actions {
  display: flex;
  gap: 8px;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 40px 20px;
}

.empty-state-icon {
  font-size: 3rem;
  margin-bottom: 12px;
}

.empty-state p {
  color: #A0A0A0;
  font-size: 0.95rem;
}

/* Responsive */
@media (max-width: 768px) {
  .tabs-header {
    padding: 12px 16px;
    gap: 6px;
  }

  .tab-btn {
    padding: 8px 14px;
    font-size: 0.85rem;
  }

  .tab-icon {
    font-size: 1rem;
  }

  .cards-grid {
    grid-template-columns: 1fr;
  }

  .ai-meta {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
