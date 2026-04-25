<template>
  <div class="py-8">
    <div class="max-w-page mx-auto px-6">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-semibold">我的上传</h1>
        <el-button type="primary" @click="showUploadDialog = true">
          上传文案
        </el-button>
      </div>

      <div v-if="loading" class="flex justify-center py-16">
        <el-icon class="is-loading text-3xl text-secondary"><Loading /></el-icon>
      </div>

      <div v-else-if="wenanStore.myUploads.length === 0" class="empty-state">
        <div class="empty-state-icon">📝</div>
        <p class="text-lg mb-2">还没有上传过文案</p>
        <el-button type="primary" @click="showUploadDialog = true">
          上传第一条文案
        </el-button>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <wenan-card
          v-for="item in wenanStore.myUploads"
          :key="item.id"
          :wenan="item"
          :show-edit-delete="true"
          @like="handleLike"
          @favorite="handleFavorite"
          @copy="handleCopy"
          @edit="handleEdit"
          @delete="handleDelete"
        />
      </div>
    </div>

    <!-- Upload Dialog -->
    <el-dialog v-model="showUploadDialog" title="上传文案" width="600px">
      <el-form :model="uploadForm" label-width="80px">
        <el-form-item label="文案内容">
          <el-input
            v-model="uploadForm.text"
            type="textarea"
            :rows="6"
            placeholder="请输入文案内容..."
          />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="uploadForm.category" placeholder="请选择分类">
            <el-option
              v-for="cat in categoryStore.categories.filter(c => c.id !== 'all')"
              :key="cat.id"
              :label="cat.name"
              :value="cat.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showUploadDialog = false">取消</el-button>
        <el-button type="primary" :loading="uploading" @click="handleUpload">
          上传
        </el-button>
      </template>
    </el-dialog>

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
          <el-select v-model="editForm.category" placeholder="请选择分类">
            <el-option
              v-for="cat in categoryStore.categories.filter(c => c.id !== 'all')"
              :key="cat.id"
              :label="cat.name"
              :value="cat.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditDialog = false">取消</el-button>
        <el-button type="primary" :loading="editing" @click="handleUpdate">
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import { useWenanStore } from '@/stores/wenan'
import { useCategoryStore } from '@/stores/category'
import WenanCard from '@/components/common/WenanCard.vue'

const wenanStore = useWenanStore()
const categoryStore = useCategoryStore()

const loading = ref(true)
const showUploadDialog = ref(false)
const showEditDialog = ref(false)
const uploading = ref(false)
const editing = ref(false)

const uploadForm = reactive({
  text: '',
  category: ''
})

const editForm = reactive({
  id: '',
  text: '',
  category: ''
})

onMounted(async () => {
  try {
    await Promise.all([
      wenanStore.fetchMyUploads(),
      categoryStore.fetchCategories()
    ])
  } finally {
    loading.value = false
  }
})

async function handleUpload() {
  if (!uploadForm.text.trim()) {
    ElMessage.warning('请输入文案内容')
    return
  }
  if (!uploadForm.category) {
    ElMessage.warning('请选择分类')
    return
  }

  uploading.value = true
  try {
    await wenanStore.create(uploadForm.text, uploadForm.category)
    ElMessage.success('上传成功')
    showUploadDialog.value = false
    uploadForm.text = ''
    uploadForm.category = ''
    await wenanStore.fetchMyUploads()
  } catch (error) {
    ElMessage.error('上传失败')
  } finally {
    uploading.value = false
  }
}

async function handleLike(id) {
  try {
    await wenanStore.toggleLike(id)
    ElMessage.success('已点赞')
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

async function handleFavorite(id) {
  try {
    await wenanStore.toggleFavorite(id)
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

function handleEdit(wenan) {
  console.log('MyUploadsPage handleEdit', wenan)
  editForm.id = wenan.id
  editForm.text = wenan.text
  editForm.category = wenan.category || ''
  showEditDialog.value = true
}

async function handleUpdate() {
  console.log('handleUpdate called')
  if (!editForm.text.trim()) {
    ElMessage.warning('请输入文案内容')
    return
  }
  if (!editForm.category) {
    ElMessage.warning('请选择分类')
    return
  }

  editing.value = true
  try {
    await wenanStore.update(editForm.id, editForm.text, editForm.category)
    ElMessage.success('修改成功')
    showEditDialog.value = false
    await wenanStore.fetchMyUploads()
  } catch (error) {
    ElMessage.error('修改失败')
  } finally {
    editing.value = false
  }
}

async function handleDelete(id) {
  console.log('MyUploadsPage handleDelete', id)
  try {
    await wenanStore.delete(id)
    ElMessage.success('删除成功')
    await wenanStore.fetchMyUploads()
  } catch (error) {
    ElMessage.error('删除失败')
  }
}
</script>
