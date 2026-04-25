<template>
  <div>
    <h1 class="text-2xl font-semibold mb-6">分类管理</h1>
    <div class="bg-white rounded-card p-6 shadow-sm">
      <el-table :data="categories" v-loading="loading" stripe>
        <el-table-column prop="name" label="名称" />
        <el-table-column prop="icon" label="图标" width="80">
          <template #default="{ row }">
            <span class="text-xl">{{ row.icon }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="color" label="颜色" width="120">
          <template #default="{ row }">
            <span class="flex items-center gap-2">
              <span class="w-4 h-4 rounded" :style="{ backgroundColor: row.color }"></span>
              {{ row.color }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="user_id" label="创建者ID" />
        <el-table-column prop="created_at" label="创建时间" width="160">
          <template #default="{ row }">
            {{ new Date(row.created_at).toLocaleString('zh-CN') }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button type="danger" size="small" plain :loading="row.deleting" @click="handleDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="categories.length === 0 && !loading" class="text-center text-secondary py-8">
        暂无自定义分类
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminApi } from '@/api/adminAuth'

const categories = ref([])
const loading = ref(false)

async function fetchCategories() {
  loading.value = true
  try {
    const res = await adminApi.getCategories()
    categories.value = (res.data || []).map(c => ({ ...c, deleting: false }))
  } catch {
    ElMessage.error('获取分类列表失败')
  } finally {
    loading.value = false
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确认删除分类「${row.name}」？`, '提示', {
      type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消'
    })
    row.deleting = true
    await adminApi.deleteCategory(row.id)
    ElMessage.success('已删除')
    categories.value = categories.value.filter(c => c.id !== row.id)
  } catch {
    row.deleting = false
  }
}

onMounted(fetchCategories)
</script>
