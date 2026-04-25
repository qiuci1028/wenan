<template>
  <div class="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 flex items-center justify-center">
    <div class="w-full max-w-md p-8 bg-white rounded-card shadow-lg">
      <div class="text-center mb-8">
        <div class="flex justify-center mb-3">
          <img src="/logo.png" alt="logo" class="w-16 h-16 object-contain">
        </div>
        <h1 class="text-2xl font-serif mb-2">管理员登录</h1>
        <p class="text-secondary">秋辞文案馆后台管理系统</p>
      </div>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        @submit.prevent="handleSubmit"
      >
        <el-form-item prop="username">
          <el-input
            v-model="form.username"
            placeholder="请输入管理员账号"
            size="large"
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            size="large"
            show-password
            @keyup.enter="handleSubmit"
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            class="w-full"
            :loading="loading"
            @click="handleSubmit"
          >
            登录
          </el-button>
        </el-form-item>
      </el-form>

      <div class="text-center text-sm text-secondary mt-6">
        <router-link to="/" class="hover:text-primary">← 返回前台</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAdminAuthStore } from '@/stores/adminAuth'

onMounted(() => {
  document.title = '管理登录 - 秋辞文案馆'
})

const router = useRouter()
const adminAuthStore = useAdminAuthStore()

const formRef = ref(null)
const loading = ref(false)

const form = reactive({
  username: '',
  password: ''
})

const rules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

async function handleSubmit() {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    loading.value = true
    try {
      await adminAuthStore.login(form.username, form.password)
      ElMessage.success('登录成功')
      router.push('/admin')
    } catch (error) {
      // 错误已在拦截器处理
    } finally {
      loading.value = false
    }
  })
}
</script>
