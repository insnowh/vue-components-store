<script lang="ts" setup>
import { ref, reactive } from 'vue'
import {
  ElForm,
  ElFormItem,
  ElInput,
  ElButton,
  ElRadioGroup,
  ElRadio,
  ElRow,
  ElCol,
  ElCard,
  ElMessage
} from 'element-plus'

import { login , register } from '../api/Login'

import 'element-plus/es/components/form/style/css'
import 'element-plus/es/components/form-item/style/css'
import 'element-plus/es/components/input/style/css'
import 'element-plus/es/components/button/style/css'
import 'element-plus/es/components/radio/style/css'
import 'element-plus/es/components/row/style/css'
import 'element-plus/es/components/col/style/css'
import 'element-plus/es/components/card/style/css'
import router from '@/router'

type LoginForm = {
  username: string
  password: string
  captcha: string
}

type RegisterForm = {
  username: string
  email: string
  password: string
  confirm: string
  sex: 0 | 1 | 2
}

const isLogin = ref(true)

const loginFormRef = ref()
const registerFormRef = ref()

const loginForm = reactive<LoginForm>({
  username: '',
  password: '',
  captcha: ''
})

const registerForm = reactive<RegisterForm>({
  username: '',
  email: '',
  password: '',
  confirm: '',
  sex: 2
})

const loginRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  captcha: [{ required: true, message: '请输入验证码', trigger: 'blur' }]
}

const registerRules = {
  username: [
        { required: true, message: '请输入用户名', trigger: 'blur' }
    ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
  ],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  confirm: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (_rule: any, value: string, callback: any) => {
        if (!value) return callback(new Error('请确认密码'))
        if (value !== registerForm.password) return callback(new Error('两次输入密码不一致'))
        callback()
      },
      trigger: 'blur'
    }
  ]
}

/* 简单验证码示例（前端演示用） */
const captcha = ref(generateCaptcha())
function generateCaptcha() {
  return Math.random().toString(36).slice(2, 6).toUpperCase()
}
function refreshCaptcha() {
  captcha.value = generateCaptcha()
}

/* 表单提交处理（示例：仅打印并显示提示） */
function submitLogin() {
  loginFormRef.value?.validate((valid: boolean) => {
    if (!valid) return
    if (loginForm.captcha.toUpperCase() !== captcha.value) {
      ElMessage.error('验证码错误')
      refreshCaptcha()
      return
    }
    ElMessage.success(`登录: ${loginForm.username}`)
    console.log('login payload', { ...loginForm })
    // TODO: 调用后端登录接口
    login(loginForm).then(res => {
      console.log('login response', res)
      // 处理登录成功逻辑，如存储token，跳转页面等
      ElMessage.success('登录成功')
      router.push('/index')
    }).catch(err => {
      console.error('login error', err)
      ElMessage.error('登录失败，请检查用户名和密码')
    })
  })
}

function submitRegister() {
  registerFormRef.value?.validate((valid: boolean) => {
    if (!valid) return
    ElMessage.success(`已注册: ${registerForm.username}`)
    console.log('register payload', { ...registerForm })
    // TODO: 调用后端注册接口

    register(registerForm).then(res => {
      console.log('register response', res)
      // 处理注册成功逻辑，如提示登录，自动登录等
      ElMessage.success('注册成功，请登录')
      isLogin.value = true
      // 重置注册表单
      Object.assign(registerForm, {
        username: '',
        email: '',
        password: '',
        confirm
      })
    }).catch(err => {
      console.error('register error', err)
      ElMessage.error('注册失败，请重试')
    })



  })
}

function toggleMode() {
  isLogin.value = !isLogin.value
  // 重置验证码与表单验证状态
  refreshCaptcha()
  loginFormRef.value?.clearValidate?.()
  registerFormRef.value?.clearValidate?.()
}
</script>

<template>
  <div class="login-page">
    <el-card class="login-card" shadow="hover">
      <div class="card-header">
        <h3>{{ isLogin ? '用户登录' : '用户注册' }}</h3>
        <el-button type="text" @click="toggleMode">
          {{ isLogin ? '去注册' : '去登录' }}
        </el-button>
      </div>

      <div class="card-body">
        <el-form
          v-if="isLogin"
          ref="loginFormRef"
          :model="loginForm"
          :rules="loginRules"
          label-position="top"
        >
          <el-form-item label="用户名" prop="username">
            <el-input v-model="loginForm.username" autocomplete="username" />
          </el-form-item>

          <el-form-item label="密码" prop="password">
            <el-input
              v-model="loginForm.password"
              type="password"
              autocomplete="current-password"
            />
          </el-form-item>

          <el-form-item label="验证码" prop="captcha">
            <el-row style="width: 100%;" :gutter="10">
              <el-col :span="16">
                <el-input v-model="loginForm.captcha" autocomplete="off" />
              </el-col>
              <el-col :span="8" class="captcha-col">
                <div class="captcha-box" @click="refreshCaptcha" role="button" tabindex="0">
                  {{ captcha }}
                </div>
                <!-- <el-button type="text" @click="refreshCaptcha">刷新</el-button> -->
              </el-col>
            </el-row>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" style="width: 100%;height: 35px;" block @click="submitLogin">登录</el-button>
          </el-form-item>
        </el-form>

        <el-form
          v-else
          ref="registerFormRef"
          :model="registerForm"
          :rules="registerRules"
          label-position="top"
        >
          <el-form-item label="用户名" prop="username">
            <el-input v-model="registerForm.username" autocomplete="username" />
          </el-form-item>

          <el-form-item label="邮箱" prop="email">
            <el-input v-model="registerForm.email" autocomplete="email" />
          </el-form-item>

          <el-form-item label="密码" prop="password">
            <el-input
              v-model="registerForm.password"
              type="password"
              autocomplete="new-password"
            />
          </el-form-item>

          <el-form-item label="确认密码" prop="confirm">
            <el-input v-model="registerForm.confirm" type="password" />
          </el-form-item>

          <el-form-item label="性别" prop="gender">
            <el-radio-group v-model="registerForm.sex">
              <el-radio label="0">男</el-radio>
              <el-radio label="1">女</el-radio>
              <el-radio label="2">保密</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" block @click="submitRegister">注册</el-button>
          </el-form-item>
        </el-form>
      </div>

    </el-card>
  </div>
</template>

<style scoped>

.login-page {
  height: 97vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  padding: 20px;
  box-sizing: border-box;
}

.login-card {
  width: 420px;
  max-width: 95%;
  padding: 18px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.card-body {
  margin-bottom: 8px;
}

.captcha-col {
  display: flex;
  align-items: center;
}

.captcha-box {
  width: 100%;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f2f5;
  border-radius: 4px;
  cursor: pointer;
  user-select: none;
  font-weight: 600;
  letter-spacing: 2px;
}

.card-footer {
  text-align: center;
  color: #8c8c8c;
  margin-top: 8px;
  font-size: 12px;
}
</style>

