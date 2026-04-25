<template>
  <div class="w-full max-w-md p-8 bg-white rounded-card shadow-lg">
    <div class="text-center mb-8">
      <h1 class="text-2xl font-serif mb-2">创建账号</h1>
      <p class="text-secondary">加入秋辞文案馆</p>
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
        />
      </el-form-item>

      <el-form-item prop="confirmPassword">
        <el-input
          v-model="form.confirmPassword"
          type="password"
          placeholder="请确认密码"
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
          注册
        </el-button>
      </el-form-item>
    </el-form>

    <div class="text-center text-sm text-secondary mt-6">
      已有账号？
      <router-link to="/auth/login" class="text-accent hover:underline">
        立即登录
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const formRef = ref(null)
const loading = ref(false)

const form = reactive({
  username: '',
  password: '',
  confirmPassword: ''
})

const validateConfirmPassword = (rule, value, callback) => {
  if (value !== form.password) {
    callback(new Error('两次密码不一致'))
  } else {
    callback()
  }
}

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名3-20个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少6个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ]
}

async function handleSubmit() {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    loading.value = true
    try {
      await authStore.register(form.username, form.password, form.confirmPassword)
      ElMessage.success('注册成功，请登录')
      router.push('/auth/login')
    } catch (error) {
      // 错误已在拦截器处理
    } finally {
      loading.value = false
    }
  })
}
</script>
