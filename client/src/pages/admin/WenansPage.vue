<template>
  <div>
    <h1 class="text-2xl font-semibold mb-6">文案管理</h1>
    <div class="bg-white rounded-card p-6 shadow-sm">
      <el-table :data="wenans" v-loading="loading" stripe>
        <el-table-column prop="text" label="文案内容" show-overflow-tooltip />
        <el-table-column prop="category" label="分类" width="100" />
        <el-table-column prop="username" label="发布者" width="120" />
        <el-table-column prop="likes" label="点赞" width="80" />
        <el-table-column prop="favorites" label="收藏" width="80" />
        <el-table-column prop="created_at" label="时间" width="160">
          <template #default="{ row }">
            {{ new Date(row.created_at).toLocaleString('zh-CN') }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button type="primary" size="small" plain @click="handleEdit(row)">
              编辑
            </el-button>
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
          @current-change="fetchWenans"
        />
      </div>
    </div>

    <!-- Edit Dialog -->
    <el-dialog v-model="showEditDialog" title="编辑文案" width="600px">
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="文案内容">
          <el-input
            v-model="editForm.text"
            type="textarea"
            :rows="6"
            placeholder="请输入文案内容..."
          />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="editForm.category" placeholder="请选择分类" style="width: 100%">
            <el-option
              v-for="cat in categories"
              :key="cat.id"
              :label="cat.name"
              :value="cat.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditDialog = false">取消</el-button>
        <el-button type="primary" :loading="editing" @click="handleUpdate">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminApi } from '@/api/adminAuth'

const wenans = ref([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const categories = ref([])
const showEditDialog = ref(false)
const editing = ref(false)

const editForm = reactive({
  id: '',
  text: '',
  category: ''
})

async function fetchWenans() {
  loading.value = true
  try {
    const res = await adminApi.getWenans(page.value, pageSize.value)
    wenans.value = (res.data?.list || []).map(w => ({ ...w, deleting: false }))
    total.value = res.data?.total || 0
  } catch {
    ElMessage.error('获取文案列表失败')
  } finally {
    loading.value = false
  }
}

async function fetchCategories() {
  try {
    const res = await adminApi.getCategories()
    categories.value = res.data || []
  } catch {
    // ignore
  }
}

function handleEdit(row) {
  editForm.id = row.id
  editForm.text = row.text
  editForm.category = row.category || ''
  showEditDialog.value = true
}

async function handleUpdate() {
  if (!editForm.text.trim()) {
    ElMessage.warning('请输入文案内容')
    return
  }
  editing.value = true
  try {
    await adminApi.updateWenan(editForm.id, {
      text: editForm.text,
      category: editForm.category
    })
    ElMessage.success('修改成功')
    showEditDialog.value = false
    fetchWenans()
  } catch {
    ElMessage.error('修改失败')
  } finally {
    editing.value = false
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm('确认删除该文案？', '提示', {
      type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消'
    })
    row.deleting = true
    await adminApi.deleteWenan(row.id)
    ElMessage.success('已删除')
    fetchWenans()
  } catch {
    row.deleting = false
  }
}

onMounted(() => {
  fetchWenans()
  fetchCategories()
})
</script>
