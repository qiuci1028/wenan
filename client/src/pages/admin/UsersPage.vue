<template>
  <div>
    <h1 class="text-2xl font-semibold mb-6">用户管理</h1>
    <div class="bg-white rounded-card p-6 shadow-sm">
      <el-table :data="users" v-loading="loading" stripe>
        <el-table-column prop="username" label="用户名" />
        <el-table-column prop="wenan_id" label="文案号" />
        <el-table-column prop="bio" label="简介" show-overflow-tooltip />
        <el-table-column prop="is_admin" label="角色" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.is_admin" type="danger" size="small">管理员</el-tag>
            <el-tag v-else type="info" size="small">用户</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="注册时间" width="160">
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

      <div class="flex justify-center mt-4">
        <el-pagination
          v-model:current-page="page"
          :page-size="pageSize"
          :total="total"
          layout="prev, pager, next"
          @current-change="fetchUsers"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminApi } from '@/api/adminAuth'

const users = ref([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

async function fetchUsers() {
  loading.value = true
  try {
    const res = await adminApi.getUsers(page.value, pageSize.value)
    users.value = (res.data?.list || []).map(u => ({ ...u, deleting: false }))
    total.value = res.data?.total || 0
  } catch {
    ElMessage.error('获取用户列表失败')
  } finally {
    loading.value = false
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm('删除该用户将同时删除其所有文案、点赞和收藏，是否继续？', '警告', {
      type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消'
    })
    row.deleting = true
    await adminApi.deleteUser(row.id)
    ElMessage.success('已删除')
    fetchUsers()
  } catch {
    row.deleting = false
  }
}

onMounted(fetchUsers)
</script>
