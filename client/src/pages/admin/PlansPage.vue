<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-semibold">套餐管理</h1>
      <el-button type="primary" @click="openCreateDialog">添加套餐</el-button>
    </div>

    <div class="bg-white rounded-card p-6 shadow-sm">
      <el-table :data="plans" v-loading="loading" stripe>
        <el-table-column prop="name" label="套餐名称" width="150">
          <template #default="{ row }">
            <span class="font-medium">{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="price" label="价格" width="100">
          <template #default="{ row }">
            <span class="text-accent font-semibold">¥{{ row.price }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="period" label="周期" width="80">
          <template #default="{ row }">
            <el-tag size="small">{{ row.period }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="popular" label="推荐" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.popular" type="danger" size="small">最受欢迎</el-tag>
            <span v-else class="text-gray-400">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="features" label="功能" min-width="200">
          <template #default="{ row }">
            <div class="text-sm text-gray-600">
              <span v-for="(feature, idx) in parseFeatures(row.features)" :key="idx" class="mr-2">
                · {{ feature }}
              </span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" text @click="openEditDialog(row)">编辑</el-button>
            <el-button type="danger" size="small" text @click="handleDelete(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="plans.length === 0 && !loading" class="text-center text-secondary py-8">
        暂无套餐数据
      </div>
    </div>

    <!-- 创建/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogMode === 'create' ? '添加套餐' : '编辑套餐'" width="500px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="套餐名称">
          <el-input v-model="form.name" placeholder="如：月卡会员" />
        </el-form-item>
        <el-form-item label="价格">
          <el-input-number v-model="form.price" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item label="周期">
          <el-input v-model="form.period" placeholder="如：月、季、年" />
        </el-form-item>
        <el-form-item label="功能">
          <el-input v-model="form.featuresText" type="textarea" :rows="3" placeholder="每行一个功能" />
        </el-form-item>
        <el-form-item label="推荐">
          <el-switch v-model="form.popular" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminApi } from '@/api/adminAuth'

const plans = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const dialogMode = ref('create')
const saving = ref(false)
const editingId = ref(null)

const form = ref({
  name: '',
  price: 0,
  period: '',
  featuresText: '',
  popular: false
})

async function fetchPlans() {
  loading.value = true
  try {
    const res = await adminApi.getPlans()
    plans.value = res.data || []
  } catch {
    ElMessage.error('获取套餐列表失败')
  } finally {
    loading.value = false
  }
}

function parseFeatures(featuresJson) {
  try {
    return JSON.parse(featuresJson) || []
  } catch {
    return []
  }
}

function openCreateDialog() {
  dialogMode.value = 'create'
  editingId.value = null
  form.value = { name: '', price: 0, period: '', featuresText: '', popular: false }
  dialogVisible.value = true
}

function openEditDialog(plan) {
  dialogMode.value = 'edit'
  editingId.value = plan.id
  form.value = {
    name: plan.name,
    price: Number(plan.price),
    period: plan.period,
    featuresText: parseFeatures(plan.features).join('\n'),
    popular: !!plan.popular
  }
  dialogVisible.value = true
}

async function handleSave() {
  if (!form.value.name || !form.value.price || !form.value.period) {
    ElMessage.warning('请填写完整的套餐信息')
    return
  }
  saving.value = true
  try {
    const features = form.value.featuresText.split('\n').filter(f => f.trim())
    const planData = {
      name: form.value.name,
      price: form.value.price,
      period: form.value.period,
      features,
      popular: form.value.popular
    }
    if (dialogMode.value === 'create') {
      await adminApi.createPlan(planData)
      ElMessage.success('套餐创建成功')
    } else {
      await adminApi.updatePlan(editingId.value, planData)
      ElMessage.success('套餐更新成功')
    }
    dialogVisible.value = false
    fetchPlans()
  } catch {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

async function handleDelete(id) {
  try {
    await ElMessageBox.confirm('确定要删除该套餐吗？', '提示', { type: 'warning' })
    await adminApi.deletePlan(id)
    ElMessage.success('删除成功')
    fetchPlans()
  } catch {
    // 用户取消
  }
}

onMounted(fetchPlans)
</script>
