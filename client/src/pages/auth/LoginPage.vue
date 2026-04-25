<template>
  <div class="w-full max-w-md p-8 bg-white rounded-card shadow-lg">
    <div class="text-center mb-8">
      <h1 class="text-2xl font-serif mb-2">欢迎回来</h1>
      <p class="text-secondary">登录秋辞文案馆</p>
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
          placeholder="请输入用户名"
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
      还没有账号？
      <router-link to="/auth/register" class="text-accent hover:underline">
        立即注册
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const formRef = ref(null)
const loading = ref(false)

const form = reactive({
  username: '',
  password: ''
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

async function handleSubmit() {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    loading.value = true
    try {
      await authStore.login(form.username, form.password)
      ElMessage.success('登录成功')

      const redirect = route.query.redirect || '/'
      router.push(redirect)
    } catch (error) {
      // 错误已在拦截器处理
    } finally {
      loading.value = false
    }
  })
}
</script>
