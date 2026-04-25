<template>
  <div class="ai-page">
    <!-- Hero Section -->
    <div class="ai-hero">
      <div class="hero-content">
        <h1 class="hero-title">✨ AI 文案助手</h1>
        <p class="hero-subtitle">选场景 + 选风格 + AI创作 = 一键生成专属文案</p>
      </div>
    </div>

    <div class="ai-container">
      <!-- Chat Area -->
      <div class="chat-wrapper">
        <!-- Chat Header with History Toggle -->
        <div class="chat-header">
          <div class="header-left">
            <button class="history-toggle" @click="showHistory = !showHistory">
              <el-icon><Memo /></el-icon>
              <span>历史记录</span>
              <span class="toggle-icon" :class="{ open: showHistory }">▼</span>
            </button>
            <div class="usage-indicator" :class="{ 'is-vip': aiUsage.isVip }">
              <span v-if="aiUsage.isVip"><el-icon><Star /></el-icon> VIP</span>
              <span v-else>今日剩余：{{ aiUsage.remaining }}/{{ aiUsage.limit }}</span>
            </div>
          </div>

          <!-- 场景和风格选择 -->
          <div class="generation-settings" v-if="messages.length === 0">
            <div class="setting-group">
              <span class="setting-label">场景：</span>
              <el-select v-model="selectedScene" placeholder="选择场景" size="small" class="setting-select">
                <el-option
                  v-for="scene in categoryStore.scenes"
                  :key="scene.id"
                  :label="scene.name"
                  :value="scene.id"
                >
                  <span>{{ scene.icon }} {{ scene.name }}</span>
                </el-option>
              </el-select>
            </div>
            <div class="setting-group">
              <span class="setting-label">风格：</span>
              <el-select v-model="selectedStyle" placeholder="选择风格" size="small" class="setting-select">
                <el-option
                  v-for="style in categoryStore.styles"
                  :key="style.id"
                  :label="style.name"
                  :value="style.id"
                >
                  <span>{{ style.icon }} {{ style.name }}</span>
                </el-option>
              </el-select>
            </div>
          </div>

          <button v-if="messages.length > 0" class="new-chat-btn" @click="startNewChat">
            <el-icon><Plus /></el-icon>
            <span>新对话</span>
          </button>
        </div>

        <!-- Collapsible History -->
        <div v-show="showHistory" class="chat-history">
          <div v-if="history.length === 0" class="empty-history">
            <span>暂无历史记录</span>
          </div>
          <div v-else class="history-list">
            <div
              v-for="item in history"
              :key="item.id"
              class="history-item"
              @click="loadHistory(item)"
            >
              <p class="history-text">{{ item.prompt }}</p>
              <div class="history-meta">
                <span>{{ formatDate(item.created_at) }}</span>
                <button class="delete-btn" @click.stop="deleteHistory(item.id)">×</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Messages -->
        <div class="chat-messages" ref="messagesContainer">
          <!-- Welcome Message -->
          <div v-if="messages.length === 0" class="welcome-state">
            <el-icon class="welcome-icon" :size="60"><ChatRound /></el-icon>
            <h3>你好，我是 AI 文案助手</h3>
            <p>告诉我你想要什么样的文案，或者聊聊你的想法</p>
            <div class="quick-prompts">
              <button
                v-for="prompt in quickPrompts"
                :key="prompt.text"
                class="quick-prompt-btn"
                @click="sendMessage(prompt.text)"
              >
                {{ prompt.text }}
              </button>
            </div>
          </div>

          <!-- Message List -->
          <div
            v-for="(msg, index) in messages"
            :key="index"
            :class="['message', msg.role]"
          >
            <div class="message-avatar">
              <img v-if="msg.role === 'assistant'" src="/logo.png" alt="AI" class="avatar-img" />
              <el-avatar v-else :size="40" class="user-avatar" :src="authStore.userInfo?.avatar">
                {{ authStore.userInfo?.username?.[0] }}
              </el-avatar>
            </div>
            <div class="message-content">
              <!-- Thinking Process -->
              <div v-if="msg.thinking && msg.showThinking" class="thinking-box">
                <div class="thinking-header" @click="msg.showThinking = !msg.showThinking">
                  <span class="thinking-icon">🤔</span>
                  <span>AI 正在思考...</span>
                  <span class="thinking-toggle">{{ msg.showThinking ? '收起' : '展开' }}</span>
                </div>
                <div v-show="msg.showThinking" class="thinking-content">{{ msg.thinking }}</div>
              </div>
              <!-- Main Content -->
              <div v-if="msg.content" class="message-bubble" :class="msg.role">
                <p>{{ msg.content }}</p>
              </div>
              <!-- User Uploaded Image -->
              <img v-if="msg.hasImage && msg.imagePreview" :src="msg.imagePreview" alt="用户上传" class="message-image" />
              <!-- Action Buttons for Copy Generation -->
              <div v-if="msg.role === 'assistant' && msg.type === 'copy' && msg.copyable" class="message-actions">
                <button class="msg-action-btn primary" @click="generateCopy(index)">
                  ✨ 生成文案
                </button>
              </div>
              <!-- Copy Actions for Generated Copy -->
              <div v-if="msg.role === 'assistant' && msg.type === 'copy_result' && msg.copyable" class="message-actions">
                <button class="msg-action-btn" @click="copyMessage(msg.content)">
                  <el-icon><ChatDotRound /></el-icon> 复制
                </button>
                <button class="msg-action-btn regenerate" @click="regenerateCopy(index)">
                  <el-icon><RefreshRight /></el-icon> 重新生成
                </button>
                <button class="msg-action-btn upload" @click="uploadToWenan(msg.content)">
                  <el-icon><Top /></el-icon> 上传文案
                </button>
              </div>
            </div>
          </div>

          <!-- Loading Indicator -->
          <div v-if="loading" class="message assistant loading">
            <div class="message-avatar">
              <img src="/logo.png" alt="AI" class="avatar-img" />
            </div>
            <div class="message-content">
              <div class="message-bubble assistant">
                <span class="loading-dot"></span>
                <span class="loading-dot"></span>
                <span class="loading-dot"></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Input Area -->
        <div class="chat-input-area">
          <div class="input-row">
            <el-input
              v-model="inputText"
              type="textarea"
              :rows="1"
              :placeholder="inputPlaceholder"
              resize="none"
              @keydown.enter.exact.prevent="handleSend"
            />
            <button
              class="send-btn"
              :disabled="!inputText.trim() && !selectedImage || loading"
              @click="handleSend"
            >
              <span>发送</span>
            </button>
          </div>

          <!-- 已上传的图片预览 -->
          <div v-if="selectedImage" class="image-preview-area">
            <div class="image-preview-item">
              <img :src="imagePreviewUrl" alt="预览" class="preview-image" />
              <button class="remove-image-btn" @click="removeSelectedImage">
                <el-icon><Close /></el-icon>
              </button>
            </div>
          </div>

          <div class="input-hint">
            <span v-if="intent === 'greeting'">💡 按 Enter 发送，或直接和我聊天</span>
            <span v-else-if="intent === 'copy_request'">💡 告诉我要生成什么主题的文案</span>
            <span v-else>💡 按 Enter 发送消息</span>
          </div>
        </div>

        <!-- 图片上传按钮 -->
        <div class="image-upload-area">
          <input
            type="file"
            ref="imageInput"
            accept="image/*"
            @change="handleImageSelect"
            style="display: none"
          />
          <button class="upload-image-btn" @click="triggerImageUpload">
            <el-icon><Picture /></el-icon>
            <span>上传图片</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, nextTick, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { useCategoryStore } from '@/stores/category'
import { aiApi } from '@/api/ai'
import { wenanApi } from '@/api/wenan'
import { Memo, ChatDotRound, Plus, Star, Top, RefreshRight, ChatRound, Picture, Close } from '@element-plus/icons-vue'

const authStore = useAuthStore()
const categoryStore = useCategoryStore()
const router = useRouter()

const messages = ref([])
const inputText = ref('')
const loading = ref(false)
const messagesContainer = ref(null)
const history = ref([])
const showHistory = ref(false)
const conversationContext = ref([])
const imageInput = ref(null)
const selectedImage = ref(null)
const imagePreviewUrl = ref('')

const selectedScene = ref('moments')
const selectedStyle = ref('cold')

const settings = reactive({
  category: 'all',
  style: 'literary'
})

const aiUsage = reactive({
  isVip: false,
  remaining: 0,
  limit: 3,
  plan: null
})

const inputPlaceholder = computed(() => {
  if (messages.value.length === 0) return '输入你的需求或想法...'
  const lastMsg = messages.value[messages.value.length - 1]
  if (lastMsg?.type === 'copy_result') return '还有其他文案需求吗？'
  if (lastMsg?.type === 'copy_request') return '描述你想要什么样的文案...'
  return '继续输入...'
})

const intent = computed(() => {
  const text = inputText.value.trim().toLowerCase()
  if (!text) return 'idle'

  const greetings = ['你好', '您好', 'hi', 'hello', '嗨', '嘿', '在吗', '在嘛', '早上好', '晚上好', '下午好']
  const copyKeywords = ['生成', '写', '创作', '帮我想', '帮我写', '要一段', '来一段', '来一句', '一句']

  const isGreeting = greetings.some(g => text.includes(g))
  const isCopyRequest = copyKeywords.some(k => text.includes(k))

  if (isGreeting && messages.value.length === 0) return 'greeting'
  if (isCopyRequest) return 'copy_request'
  return 'chat'
})

const quickPrompts = [
  { text: '写一条朋友圈文案' },
  { text: '帮我写小红书种草文案' },
  { text: '创作短视频口播文案' },
  { text: '写一句高级清冷的文案' }
]

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

function triggerImageUpload() {
  imageInput.value?.click()
}

function handleImageSelect(event) {
  const file = event.target.files[0]
  if (file) {
    selectedImage.value = file
    imagePreviewUrl.value = URL.createObjectURL(file)
  }
}

function removeSelectedImage() {
  selectedImage.value = null
  if (imagePreviewUrl.value) {
    URL.revokeObjectURL(imagePreviewUrl.value)
    imagePreviewUrl.value = ''
  }
  if (imageInput.value) {
    imageInput.value.value = ''
  }
}

function handleSend() {
  const text = inputText.value.trim()
  if (!text && !selectedImage.value) return
  sendMessage(text)
}

function sendMessage(text) {
  inputText.value = ''
  messages.value.push({
    role: 'user',
    content: text,
    showThinking: false,
    thinking: '',
    hasImage: !!selectedImage.value,
    imagePreview: imagePreviewUrl.value
  })
  const imageFile = selectedImage.value
  const imageUrl = imagePreviewUrl.value
  removeSelectedImage()
  scrollToBottom()
  processWithAI(text, imageFile, imageUrl)
}

async function processWithAI(userMessage, imageFile = null, imageUrl = '') {
  loading.value = true

  const isGreeting = /^(你好|您好|hi|hello|嗨|嘿|在吗|在嘛|早上好|晚上好|下午好)[。.。]?$/.test(userMessage)
  const isCopyRequest = /^(生成|写|创作|帮我想|帮我写|要一段|来一段|来一句)/.test(userMessage)

  const aiMsg = {
    role: 'assistant',
    type: 'chat',
    content: '',
    thinking: '',
    showThinking: true,
    copyable: false
  }
  messages.value.push(aiMsg)

  const contextMessages = conversationContext.value.concat([{ role: 'user', content: userMessage }])

  try {
    if (imageFile) {
      aiMsg.thinking = '正在分析图片内容...'
      aiMsg.type = 'copy_request'

      const intentRes = await aiApi.understandWithImage(imageFile, userMessage, settings.category, settings.style)

      if (intentRes.data?.response) {
        aiMsg.content = intentRes.data.response
        aiMsg.type = 'copy_result'
        aiMsg.showThinking = false
        aiMsg.copyable = true
        loadHistoryList()
        loadAiUsage()
      } else if (intentRes.data?.copy) {
        aiMsg.content = intentRes.data.copy
        aiMsg.type = 'copy_result'
        aiMsg.showThinking = false
        aiMsg.copyable = true
        loadHistoryList()
        loadAiUsage()
      } else {
        aiMsg.content = intentRes.data?.response || '抱歉，我没有理解图片内容。可以换个图片试试或补充说明需求。'
        aiMsg.showThinking = false
      }
    } else if (isGreeting && messages.value.length <= 2) {
      const greetingRes = await aiApi.chat(contextMessages, 'greeting')
      aiMsg.content = greetingRes.data?.response || '你好！很高兴认识你。我是 AI 文案助手，可以帮你创作各种类型的文案哦～'
      aiMsg.type = 'greeting'
      aiMsg.showThinking = false
    } else if (isCopyRequest) {
      aiMsg.thinking = '正在理解你的需求...'
      aiMsg.type = 'copy_request'

      const intentRes = await aiApi.understandAndGenerate(userMessage, settings.category, settings.style)

      if (intentRes.data?.response) {
        aiMsg.content = intentRes.data.response
        aiMsg.type = 'copy_request'
        aiMsg.showThinking = false
        aiMsg.copyable = true
        loadHistoryList()
        loadAiUsage()
      } else if (intentRes.data?.copy) {
        aiMsg.content = intentRes.data.copy
        aiMsg.type = 'copy_result'
        aiMsg.showThinking = false
        aiMsg.copyable = true
        loadHistoryList()
        loadAiUsage()
      } else {
        aiMsg.content = intentRes.data?.response || '抱歉，我没有理解你的需求。可以告诉我你想要什么类型的文案吗？'
        aiMsg.showThinking = false
      }
    } else {
      aiMsg.thinking = '正在分析你的意图...'
      aiMsg.type = 'chat'

      const chatRes = await aiApi.chat(contextMessages, 'general')

      if (chatRes.data?.response) {
        aiMsg.content = chatRes.data.response
        aiMsg.showThinking = false
        if (chatRes.data?.suggestCopy) {
          aiMsg.copyable = true
          aiMsg.type = 'copy_suggestion'
        }
      } else {
        aiMsg.content = '抱歉，我现在无法回应。有什么文案需要我帮你创作吗？'
        aiMsg.showThinking = false
      }
    }
  } catch (err) {
    console.error('AI处理失败:', err)
    if (err.response?.status === 403) {
      aiMsg.content = err.response.data?.message || '今日AI使用次数已用完'
      ElMessage.warning(err.response.data?.message || '今日AI使用次数已用完')
      await loadAiUsage()
    } else {
      aiMsg.content = '抱歉出错了，请稍后重试。'
    }
    aiMsg.showThinking = false
  } finally {
    loading.value = false
    scrollToBottom()
  }
}

async function generateCopy(index) {
  const msg = messages.value[index]
  if (!msg || msg.role !== 'assistant') return

  const copyMsg = {
    role: 'assistant',
    type: 'copy_result',
    content: '',
    thinking: '正在为你创作文案...',
    showThinking: true,
    copyable: false
  }
  messages.value.splice(index + 1, 0, copyMsg)
  loading.value = true

  try {
    const relevantContext = messages.value
      .filter((m, i) => i <= index && m.role === 'user')
      .slice(-3)
      .map(m => m.content)
      .join(' ')

    const res = await aiApi.generateCopy(relevantContext, selectedScene.value, selectedStyle.value)

    if (res.data?.copy) {
      copyMsg.content = res.data.copy
      copyMsg.type = 'copy_result'
      copyMsg.showThinking = false
      copyMsg.copyable = true
      loadHistoryList()
      loadAiUsage()
    } else {
      copyMsg.content = res.data?.response || '抱歉，生成失败了。'
      copyMsg.showThinking = false
    }
  } catch (err) {
    if (err.response?.status === 403) {
      copyMsg.content = err.response.data?.message || '今日AI使用次数已用完'
      ElMessage.warning(err.response.data?.message || '今日AI使用次数已用完')
      await loadAiUsage()
    } else {
      copyMsg.content = '抱歉，生成失败了，请稍后重试。'
    }
    copyMsg.showThinking = false
  } finally {
    loading.value = false
    scrollToBottom()
  }
}

async function regenerateCopy(index) {
  let userMsg = ''
  for (let i = index - 1; i >= 0; i--) {
    if (messages.value[i].role === 'user') {
      userMsg = messages.value[i].content
      break
    }
  }

  messages.value[index].content = ''
  messages.value[index].thinking = '重新创作中...'
  messages.value[index].showThinking = true

  try {
    const res = await aiApi.generateCopy(userMsg, selectedScene.value, selectedStyle.value)
    if (res.data?.copy) {
      messages.value[index].content = res.data.copy
      messages.value[index].showThinking = false
      loadHistoryList()
    } else {
      messages.value[index].content = '抱歉，重新生成失败了。'
      messages.value[index].showThinking = false
    }
  } catch (err) {
    if (err.response?.status === 403) {
      messages.value[index].content = err.response.data?.message || '今日AI使用次数已用完'
      ElMessage.warning(err.response.data?.message || '今日AI使用次数已用完')
      await loadAiUsage()
    } else {
      messages.value[index].content = '抱歉，重新生成失败了，请稍后重试。'
    }
    messages.value[index].showThinking = false
  }

  scrollToBottom()
}

function copyMessage(text) {
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success('已复制到剪贴板')
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}

async function uploadToWenan(text) {
  router.push({
    path: '/wenan',
    query: {
      upload: 'true',
      text: encodeURIComponent(text),
      category: settings.category || 'all'
    }
  })
}

function startNewChat() {
  messages.value = []
  conversationContext.value = []
}

async function loadHistory(item) {
  messages.value = [
    { role: 'user', content: item.prompt, type: 'user' },
    { role: 'assistant', content: item.result, type: 'copy_result', thinking: '', showThinking: false, copyable: true }
  ]
  conversationContext.value = [
    { role: 'user', content: item.prompt },
    { role: 'assistant', content: item.result }
  ]
  settings.category = item.category || 'all'
  settings.style = item.style || 'literary'
  showHistory.value = false
  scrollToBottom()
}

async function deleteHistory(id) {
  try {
    await aiApi.deleteHistory(id)
    ElMessage.success('已删除')
    loadHistoryList()
  } catch {
    ElMessage.error('删除失败')
  }
}

async function loadHistoryList() {
  try {
    const res = await aiApi.getHistory()
    if (res.code === 0 || res.code === 200) {
      history.value = res.data?.list || []
    }
  } catch (err) {
    console.error('加载历史失败:', err)
  }
}

const formatDate = (dateStr) => {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

async function loadAiUsage() {
  try {
    const res = await aiApi.getUsage()
    if (res.code === 200) {
      aiUsage.isVip = res.data?.isVip || false
      aiUsage.remaining = res.data?.remaining || 0
      aiUsage.limit = res.data?.limit || 3
      aiUsage.plan = res.data?.plan || null
    }
  } catch (err) {
    console.error('加载AI使用状态失败:', err)
  }
}

onMounted(async () => {
  await Promise.all([
    loadHistoryList(),
    loadAiUsage(),
    categoryStore.fetchStyles(),
    categoryStore.fetchScenes()
  ])
})
</script>

<style scoped>
.ai-page {
  min-height: 100vh;
  background: #F5F0E8;
}

.ai-hero {
  background: #6B90AE;
  padding: 40px 20px;
  text-align: center;
  color: white;
}

.hero-title {
  font-size: 2rem;
  font-weight: 600;
  margin-bottom: 8px;
}

.hero-subtitle {
  font-size: 1rem;
  opacity: 0.9;
}

.ai-container {
  max-width: 800px;
  margin: -30px auto 0;
  padding: 0 20px 40px;
}

.chat-wrapper {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(107, 144, 174, 0.12);
  display: flex;
  flex-direction: column;
  height: calc(100vh - 220px);
  min-height: 580px;
  overflow: hidden;
}

.chat-header {
  padding: 14px 20px;
  border-bottom: 1px solid #E8E0D8;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #FAFAFA;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.usage-indicator {
  padding: 6px 14px;
  background: #F5F0E8;
  border-radius: 20px;
  font-size: 0.8rem;
  color: #6B90AE;
  font-weight: 500;
}

.usage-indicator.is-vip {
  background: linear-gradient(135deg, #6B90AE, #8AA8C0);
  color: white;
  display: flex;
  align-items: center;
  gap: 4px;
}

.generation-settings {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 16px;
  border-left: 1px solid #E8E0D8;
  border-right: 1px solid #E8E0D8;
}

.setting-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.setting-label {
  font-size: 0.8rem;
  color: #7A7A7A;
  white-space: nowrap;
}

.setting-select {
  width: 130px;
}

.setting-select :deep(.el-input__wrapper) {
  border-radius: 16px;
  font-size: 0.85rem;
}

.history-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: white;
  border: 1px solid #E8E0D8;
  border-radius: 20px;
  font-size: 0.85rem;
  color: #7A7A7A;
  cursor: pointer;
  transition: all 0.2s;
}

.history-toggle:hover {
  border-color: #6B90AE;
  color: #6B90AE;
}

.toggle-icon {
  font-size: 0.65rem;
  transition: transform 0.2s;
}

.toggle-icon.open {
  transform: rotate(180deg);
}

.new-chat-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #6B90AE;
  border: none;
  border-radius: 20px;
  font-size: 0.85rem;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.new-chat-btn:hover {
  background: #557590;
}

.chat-history {
  padding: 16px 20px;
  background: #F5F0E8;
  border-bottom: 1px solid #E8E0D8;
  max-height: 180px;
  overflow-y: auto;
}

.empty-history {
  text-align: center;
  color: #A0A0A0;
  padding: 12px;
  font-size: 0.9rem;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  padding: 12px 14px;
  background: white;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #E8E0D8;
}

.history-item:hover {
  border-color: #D9A8A8;
  background: #FAFAFA;
}

.history-text {
  font-size: 0.85rem;
  color: #2D2D2D;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 6px;
}

.history-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.7rem;
  color: #A0A0A0;
}

.delete-btn {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: transparent;
  border: none;
  color: #A0A0A0;
  cursor: pointer;
  font-size: 0.9rem;
  line-height: 1;
}

.delete-btn:hover {
  background: #D9A8A8;
  color: white;
}

.welcome-state {
  text-align: center;
  padding: 60px 40px;
  color: #7A7A7A;
}

.welcome-icon {
  font-size: 3.5rem;
  margin-bottom: 16px;
}

.welcome-state h3 {
  font-size: 1.2rem;
  color: #2D2D2D;
  margin-bottom: 8px;
  font-weight: 600;
}

.welcome-state p {
  margin-bottom: 24px;
  font-size: 0.95rem;
}

.quick-prompts {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

.quick-prompt-btn {
  padding: 10px 20px;
  background: #F5F0E8;
  border: 1px solid #E8E0D8;
  border-radius: 20px;
  font-size: 0.85rem;
  color: #6B90AE;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-prompt-btn:hover {
  background: #6B90AE;
  color: white;
  border-color: #6B90AE;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message {
  display: flex;
  gap: 12px;
  max-width: 85%;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.message.user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message.assistant {
  align-self: flex-start;
}

.message-avatar {
  flex-shrink: 0;
}

.avatar-img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.user-avatar {
  background: #D9A8A8;
  color: white;
}

.message-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.thinking-box {
  background: linear-gradient(135deg, #F5F0E8 0%, #FAFAFA 100%);
  border: 1px solid #E8E0D8;
  border-radius: 12px;
  padding: 10px 14px;
  margin-bottom: 4px;
}

.thinking-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  color: #6B90AE;
  font-weight: 500;
  cursor: pointer;
}

.thinking-toggle {
  margin-left: auto;
  font-size: 0.7rem;
  color: #A0A0A0;
  font-weight: normal;
}

.thinking-icon {
  font-size: 0.95rem;
}

.thinking-content {
  font-size: 0.85rem;
  color: #7A7A7A;
  line-height: 1.6;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #E8E0D8;
}

.message-bubble {
  padding: 14px 18px;
  border-radius: 16px;
  line-height: 1.7;
  font-size: 0.95rem;
  white-space: pre-wrap;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.message-bubble.user {
  background: #6B90AE;
  color: white;
  border-bottom-right-radius: 6px;
}

.message-bubble.assistant {
  background: #F5F0E8;
  color: #2D2D2D;
  border-bottom-left-radius: 6px;
}

.message-actions {
  display: flex;
  gap: 8px;
  padding-left: 4px;
  flex-wrap: wrap;
}

.msg-action-btn {
  padding: 6px 14px;
  background: white;
  border: 1px solid #E8E0D8;
  border-radius: 16px;
  font-size: 0.8rem;
  color: #7A7A7A;
  cursor: pointer;
  transition: all 0.2s;
}

.msg-action-btn:hover {
  background: #F5F0E8;
  color: #6B90AE;
  border-color: #6B90AE;
}

.msg-action-btn.primary {
  background: #6B90AE;
  border-color: #6B90AE;
  color: white;
}

.msg-action-btn.primary:hover {
  background: #557590;
  box-shadow: 0 4px 12px rgba(107, 144, 174, 0.3);
}

.msg-action-btn.regenerate:hover {
  color: #D9A8A8;
  border-color: #D9A8A8;
}

.loading-dot {
  width: 8px;
  height: 8px;
  background: #D9A8A8;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}

.loading-dot:nth-child(1) { animation-delay: -0.32s; }
.loading-dot:nth-child(2) { animation-delay: -0.16s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

.chat-input-area {
  padding: 16px 20px 20px;
  border-top: 1px solid #E8E0D8;
  background: white;
}

.input-row {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.input-row :deep(.el-textarea) {
  flex: 1;
}

.input-row :deep(.el-textarea__inner) {
  border-radius: 16px;
  padding: 12px 16px;
  resize: none;
  border-color: #E8E0D8;
  font-size: 0.95rem;
}

.input-row :deep(.el-textarea__inner:focus) {
  border-color: #6B90AE;
}

.send-btn {
  height: 42px;
  padding: 0 24px;
  border-radius: 16px;
  background: #6B90AE;
  border: none;
  color: white;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.send-btn:hover:not(:disabled) {
  background: #557590;
}

.send-btn:disabled {
  background: #A0A0A0;
  cursor: not-allowed;
}

.input-hint {
  margin-top: 10px;
  font-size: 0.75rem;
  color: #A0A0A0;
  text-align: center;
}

.image-preview-area {
  margin-top: 12px;
  padding: 12px;
  background: #F5F0E8;
  border-radius: 12px;
}

.image-preview-item {
  position: relative;
  display: inline-block;
}

.preview-image {
  max-width: 120px;
  max-height: 120px;
  border-radius: 8px;
  object-fit: cover;
}

.remove-image-btn {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #D9A8A8;
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.remove-image-btn:hover {
  background: #C89090;
}

.image-upload-area {
  padding: 12px 20px;
  border-top: 1px solid #E8E0D8;
  background: white;
  display: flex;
  justify-content: flex-start;
}

.upload-image-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #F5F0E8;
  border: 1px dashed #D9C4C4;
  border-radius: 20px;
  font-size: 0.85rem;
  color: #6B90AE;
  cursor: pointer;
  transition: all 0.2s;
}

.upload-image-btn:hover {
  background: #E8E0D8;
  border-color: #6B90AE;
}

.upload-image-btn .el-icon {
  font-size: 18px;
}

.message-image {
  max-width: 200px;
  max-height: 200px;
  border-radius: 8px;
  margin-top: 8px;
}
</style>
