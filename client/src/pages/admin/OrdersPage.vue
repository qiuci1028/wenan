<template>
  <div>
    <h1 class="text-2xl font-semibold mb-6">会员订单管理</h1>
    <div class="bg-white rounded-card p-6 shadow-sm">
      <el-table :data="orders" v-loading="loading" stripe>
        <el-table-column prop="id" label="订单号" width="180" show-overflow-tooltip />
        <el-table-column prop="username" label="用户" width="120">
          <template #default="{ row }">
            {{ row.username || '未知用户' }}
          </template>
        </el-table-column>
        <el-table-column prop="plan_name" label="套餐名称" width="120">
          <template #default="{ row }">
            <el-tag size="small" type="success">{{ row.plan_name }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="amount" label="金额（元）" width="100">
          <template #default="{ row }">
            <span class="text-accent font-semibold">¥{{ row.amount }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.status === 'paid'" type="success" size="small">已支付</el-tag>
            <el-tag v-else-if="row.status === 'refunded'" type="warning" size="small">已退款</el-tag>
            <el-tag v-else type="info" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="购买时间" width="160">
          <template #default="{ row }">
            {{ new Date(row.created_at).toLocaleString('zh-CN') }}
          </template>
        </el-table-column>
      </el-table>

      <div class="flex justify-center mt-4">
        <el-pagination
          v-model:current-page="page"
          :page-size="pageSize"
          :total="total"
          layout="prev, pager, next"
          @current-change="fetchOrders"
        />
      </div>

      <div v-if="orders.length === 0 && !loading" class="text-center text-secondary py-8">
        暂无订单记录
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { adminApi } from '@/api/adminAuth'

const orders = ref([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

async function fetchOrders() {
  loading.value = true
  try {
    const res = await adminApi.getOrders(page.value, pageSize.value)
    orders.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch {
    ElMessage.error('获取订单列表失败')
  } finally {
    loading.value = false
  }
}

onMounted(fetchOrders)
</script>
