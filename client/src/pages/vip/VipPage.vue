<template>
  <div class="vip-page">
    <!-- Hero -->
    <section class="vip-hero">
      <div class="hero-content">
        <el-icon class="hero-badge" :size="48"><Star /></el-icon>
        <h1 class="hero-title">{{ isVip ? 'VIP 会员中心' : '开通 VIP 会员' }}</h1>
        <p class="hero-subtitle">{{ isVip ? '感谢您的支持，当前会员状态正常' : '解锁全部文案，畅享无限制使用' }}</p>
      </div>
    </section>

    <div class="vip-container">
      <!-- VIP Status Card -->
      <section v-if="isVip" class="section">
        <div class="vip-status-card">
          <div class="vip-info">
            <el-icon class="vip-badge" :size="40"><Star /></el-icon>
            <div class="vip-details">
              <h2 class="vip-title">当前会员</h2>
              <p class="vip-expire">到期时间：{{ formatDate(vipExpireTime) }}</p>
              <p class="vip-plan">套餐：{{ getPlanName(vipPlan) }}</p>
            </div>
          </div>
          <div class="vip-actions">
            <el-button type="primary" @click="showRenewDialog = true">续费</el-button>
          </div>
        </div>
      </section>

      <!-- Benefits -->
      <section class="section">
        <div class="section-header">
          <h2 class="section-title">会员特权</h2>
        </div>
        <div class="benefits-grid">
          <div v-for="benefit in benefits" :key="benefit.title" class="benefit-card">
            <el-icon class="benefit-icon"><component :is="benefit.icon" /></el-icon>
            <div class="benefit-info">
              <h3 class="benefit-title">{{ benefit.title }}</h3>
              <p class="benefit-desc">{{ benefit.desc }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Plans -->
      <section class="section">
        <div class="section-header">
          <h2 class="section-title">{{ isVip ? '续费套餐' : '选择套餐' }}</h2>
        </div>
        <div class="plans-grid">
          <div
            v-for="plan in plans"
            :key="plan.id"
            class="plan-card"
            :class="{ popular: plan.popular }"
            @click="handleSelectPlan(plan)"
          >
            <div v-if="plan.popular" class="popular-tag">
              <span>最受欢迎</span>
            </div>

            <h3 class="plan-name">{{ plan.name }}</h3>

            <div class="plan-price">
              <span class="price-symbol">¥</span>
              <span class="price-num">{{ plan.price }}</span>
              <span class="price-period">/{{ plan.period }}</span>
            </div>

            <ul class="plan-features">
              <li v-for="feature in plan.features" :key="feature">
                <span class="check-icon">✓</span>
                {{ feature }}
              </li>
            </ul>

            <button class="plan-btn" :class="{ primary: plan.popular }">
              {{ isVip ? '续费' : '立即开通' }}
            </button>
          </div>
        </div>
      </section>

      <!-- Notice -->
      <section class="section notice-section">
        <div class="notice-card">
          <p class="notice-item">• 会员服务一经开通，不支持退款</p>
          <p class="notice-item">• 如有疑问，请联系客服</p>
        </div>
      </section>
    </div>

    <!-- Payment Dialog -->
    <el-dialog v-model="showPaymentDialog" title="确认订单" width="400px">
      <div v-if="selectedPlan" class="payment-content">
        <h3 class="payment-plan">{{ selectedPlan.name }}</h3>
        <div class="payment-price">
          <span class="symbol">¥</span>
          <span class="amount">{{ selectedPlan.price }}</span>
        </div>
        <p class="payment-note">支付成功后，会员权限将立即生效</p>
      </div>
      <template #footer>
        <el-button @click="showPaymentDialog = false">取消</el-button>
        <el-button type="primary" :loading="purchasing" @click="handleMockPayment">
          确认支付
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { vipApi } from '@/api/vip'
import { Document, Star, Present, ChatDotRound, Cellphone, MagicStick } from '@element-plus/icons-vue'

const authStore = useAuthStore()
const showPaymentDialog = ref(false)
const showRenewDialog = ref(false)
const selectedPlan = ref(null)
const purchasing = ref(false)
const plans = ref([])
const vipStatus = ref(null)

const isVip = computed(() => {
  return vipStatus.value?.vipStatus === 'active'
})

const vipExpireTime = computed(() => {
  return vipStatus.value?.vipExpireTime
})

const vipPlan = computed(() => {
  return vipStatus.value?.vipPlan
})

const benefits = [
  { icon: 'Document', title: '解锁全部文案', desc: '查看平台所有优质文案' },
  { icon: 'MagicStick', title: 'AI 无限使用', desc: 'AI 文案生成无次数限制' },
  { icon: 'Star', title: '专属收藏夹', desc: '创建多个收藏夹分类管理' },
  { icon: 'Cellphone', title: '多设备同步', desc: '手机、电脑，平板同步使用' },
  { icon: 'Present', title: '专属活动', desc: '参与会员专属活动获得奖励' },
  { icon: 'ChatDotRound', title: '优先客服', desc: '享受 7x24 小时优先客服' }
]

async function fetchVipStatus() {
  if (!authStore.isLoggedIn) return
  try {
    const res = await vipApi.getVipStatus()
    vipStatus.value = res.data
  } catch (err) {
    console.error('获取VIP状态失败:', err)
  }
}

async function fetchPlans() {
  try {
    const res = await vipApi.getPlans()
    plans.value = (res.data || []).map(plan => ({
      ...plan,
      features: parseFeatures(plan.features)
    }))
  } catch {
    plans.value = [
      { id: 'basic_monthly', name: '基础VIP月卡', price: 9.9, period: '月', popular: 0, features: ['解锁全部文案', 'AI 无限使用', '风格复刻', '文案图片导出', '专属素材库无上限', '无广告'] },
      { id: 'basic_yearly', name: '基础VIP年卡', price: 39.9, period: '年', popular: 1, features: ['解锁全部文案', 'AI 无限使用', '风格复刻', '文案图片导出', '专属素材库无上限', '无广告'] },
      { id: 'pro_monthly', name: '高级VIP月卡', price: 19.9, period: '月', popular: 0, features: ['基础VIP全部权益', '高阶场景生成', '素材导出', '新功能优先体验', '专属客服'] },
      { id: 'pro_yearly', name: '高级VIP年卡', price: 99, period: '年', popular: 0, features: ['基础VIP全部权益', '高阶场景生成', '素材导出', '新功能优先体验', '专属客服'] }
    ]
  }
}

function parseFeatures(featuresJson) {
  try {
    return JSON.parse(featuresJson) || []
  } catch {
    return []
  }
}

function getPlanName(planId) {
  const plan = plans.value.find(p => p.id === planId)
  return plan?.name || planId || '未知'
}

function formatDate(dateStr) {
  if (!dateStr) return '无'
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function handleSelectPlan(plan) {
  selectedPlan.value = plan
  showPaymentDialog.value = true
}

async function handleMockPayment() {
  if (!authStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    showPaymentDialog.value = false
    return
  }
  purchasing.value = true
  try {
    await vipApi.purchase(selectedPlan.value.id, selectedPlan.value.name, selectedPlan.value.price)
    ElMessage.success('支付成功！会员权限已开通')
    showPaymentDialog.value = false
    await fetchVipStatus()
    await authStore.fetchUserInfo()
  } catch {
    ElMessage.error('购买失败，请重试')
  } finally {
    purchasing.value = false
  }
}

onMounted(async () => {
  await Promise.all([fetchVipStatus(), fetchPlans()])
})
</script>

<style scoped>
.vip-page {
  min-height: 100vh;
  background: #f0f9ff;
}

/* Hero */
.vip-hero {
  background: #6B90AE;
  padding: 60px 24px;
  text-align: center;
  color: white;
}

.hero-badge {
  font-size: 3rem;
  display: block;
  margin-bottom: 16px;
}

.hero-title {
  font-size: 2rem;
  font-weight: 600;
  margin-bottom: 8px;
}

.hero-subtitle {
  font-size: 1.1rem;
  opacity: 0.9;
}

/* Container */
.vip-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 24px;
}

/* Section */
.section {
  padding: 48px 0;
}

.section-header {
  text-align: center;
  margin-bottom: 32px;
}

/* VIP Status Card */
.vip-status-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  padding: 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
  box-shadow: 0 8px 30px rgba(102, 126, 234, 0.4);
}

.vip-info {
  display: flex;
  align-items: center;
  gap: 20px;
}

.vip-badge {
  font-size: 3rem;
}

.vip-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.vip-title {
  font-size: 1.4rem;
  font-weight: 600;
  margin: 0;
}

.vip-expire, .vip-plan {
  font-size: 0.95rem;
  opacity: 0.9;
  margin: 0;
}

.vip-actions .el-button {
  background: white;
  color: #667eea;
  border: none;
  font-weight: 600;
}

.section-title {
  font-size: 1.4rem;
  font-weight: 600;
  color: #1e3a5f;
}

/* Benefits Grid */
.benefits-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.benefit-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(14, 165, 233, 0.06);
  border: 1px solid rgba(14, 165, 233, 0.08);
}

.benefit-icon {
  font-size: 1.8rem;
  flex-shrink: 0;
}

.benefit-title {
  font-size: 1rem;
  font-weight: 600;
  color: #1e3a5f;
  margin-bottom: 4px;
}

.benefit-desc {
  font-size: 0.9rem;
  color: #7A7A7A;
}

/* Plans Grid */
.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}

.plan-card {
  position: relative;
  background: white;
  border-radius: 20px;
  padding: 32px 24px;
  box-shadow: 0 4px 16px rgba(14, 165, 233, 0.06);
  border: 2px solid transparent;
  transition: all 0.3s;
  cursor: pointer;
  display: flex;
  flex-direction: column;
}

.plan-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(14, 165, 233, 0.15);
}

.plan-card.popular {
  border-color: #6B90AE;
}

.popular-tag {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: #6B90AE;
  color: white;
  padding: 4px 16px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
}

.plan-name {
  font-size: 1.2rem;
  font-weight: 600;
  color: #1e3a5f;
  text-align: center;
  margin-bottom: 16px;
}

.plan-price {
  text-align: center;
  margin-bottom: 24px;
}

.price-symbol {
  font-size: 1.2rem;
  color: #6B90AE;
  vertical-align: top;
}

.price-num {
  font-size: 2.5rem;
  font-weight: 700;
  color: #6B90AE;
}

.price-period {
  font-size: 0.9rem;
  color: #A0A0A0;
}

.plan-features {
  list-style: none;
  padding: 0;
  margin: 0 0 24px 0;
  flex: 1;
}

.plan-features li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  font-size: 0.95rem;
  color: #475569;
}

.check-icon {
  color: #22c55e;
  font-weight: 600;
}

.plan-btn {
  width: 100%;
  padding: 12px;
  border-radius: 25px;
  border: 2px solid #6B90AE;
  background: white;
  color: #6B90AE;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.plan-btn:hover {
  background: #f0f9ff;
}

.plan-btn.primary {
  background: #6B90AE;
  color: white;
  border-color: transparent;
}

.plan-btn.primary:hover {
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.4);
}

/* Notice */
.notice-section {
  padding-bottom: 60px;
}

.notice-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  border: 1px solid #e2e8f0;
}

.notice-item {
  font-size: 0.9rem;
  color: #A0A0A0;
  margin: 6px 0;
}

/* Payment Dialog */
.payment-content {
  text-align: center;
  padding: 20px 0;
}

.payment-plan {
  font-size: 1.2rem;
  font-weight: 600;
  color: #1e3a5f;
  margin-bottom: 12px;
}

.payment-price {
  margin-bottom: 12px;
}

.payment-price .symbol {
  font-size: 1.2rem;
  color: #6B90AE;
}

.payment-price .amount {
  font-size: 2.5rem;
  font-weight: 700;
  color: #6B90AE;
}

.payment-note {
  font-size: 0.9rem;
  color: #A0A0A0;
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 1.6rem;
  }

  .plans-grid {
    grid-template-columns: 1fr;
  }
}
</style>