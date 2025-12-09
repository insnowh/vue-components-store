<script setup lang="ts">
import { ref } from 'vue'
import { useInfoStore } from '../stores/userStores'
import { useRouter } from 'vue-router'
import { logout } from '@/api/Login';


// 获取登录的用户信息
const userInfo = useInfoStore();
const router = useRouter();

console.log('userInfo in Index.vue', userInfo.userInfo);

const BASE_URL = 'http://localhost:8083';



userInfo.resetUserInfo()

console.log('userInfo after reset in Index.vue', userInfo.userInfo);

const activeMenu = ref('')
const handleOpen = (key: string, keyPath: string[]) => {
  console.log(key, keyPath)
}
const handleClose = (key: string, keyPath: string[]) => {
  console.log(key, keyPath)
}

// 新增：弹出菜单的处理函数
const goToProfile = () => {
  router.push('/profile')
}
const goToSettings = () => {
  router.push('/settings')
}
const signOut = () => {
  logout();
  // 优先调用 store 的登出方法（如果存在），否则清 token 并跳转到登录页
  // try {
  //   if (typeof (userInfo as any).logout === 'function') {
  //     ;(userInfo as any).logout()
  //   } else {
  //     localStorage.removeItem('token')
  //   }
  //   ElMessage.success('已退出登录')
  // } catch (e) {
  //   console.error(e)
  // } finally {
  //   router.push('/login')
  // }
}
</script>

<template>
    <el-container style="height: 100vh">

        <el-aside width="13vw" style="background: #2d3a4b; color: #fff;height:100%;">
            <el-menu 
            unique-opened
            router
            :default-active="activeMenu" 
            class="el-menu-vertical-demo" 
            background-color="#2d3a4b" 
            text-color="#fff" 
            active-text-color="#ffd04b"
            @open="handleOpen"
            @close="handleClose">
            <el-menu-item index="index">首页</el-menu-item>
            <el-sub-menu index="1">
                <template #title>
                    <span>聊天</span>
                </template>
                <el-menu-item index="userManagement">用户管理</el-menu-item>
                <el-menu-item index="chatHistory">聊天历史</el-menu-item>
                <el-menu-item index="chat">聊天</el-menu-item>
                <el-sub-menu index="1-4">
                    <template #title>item four</template>
                    <el-menu-item index="1-4-1">item one</el-menu-item>
                </el-sub-menu>
            </el-sub-menu>
            <el-menu-item index="dictManagement">字典管理</el-menu-item>
            <el-menu-item index="upload">文件上传</el-menu-item>
            <el-menu-item index="aiChat">AI问答</el-menu-item>
            
            </el-menu>
        </el-aside>

        <el-container style="height: 100%;">
            <el-header style="background: #fff; box-shadow: 0 2px 8px #f0f1f2; display: flex; align-items: center; justify-content: space-between;">
                <div style="font-size: 20px; font-weight: bold;">Vue组件仓库</div>
                <el-dropdown trigger="click" placement="bottom-end">
                  <span class="user-info" style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                    <span>{{ userInfo.userInfo.username }}</span>
                    <el-avatar :size="48" :src="BASE_URL + userInfo.userInfo.avatar" />
                  </span>
                  <template #dropdown>
                    <el-dropdown-item @click="goToProfile">个人页面</el-dropdown-item>
                    <el-dropdown-item @click="goToSettings">设置</el-dropdown-item>
                    <el-dropdown-item divided @click="signOut">退出</el-dropdown-item>
                  </template>
                </el-dropdown>
                
            </el-header>
            <el-main style="height: 100%;">   
                <router-view />
            </el-main>
        </el-container>


    </el-container>
</template>

<style>
*{
    margin: 0px;
    padding: 0px;
}
.el-main{
    padding: 0px;
}
.el-menu{
    border: 0px;
}
.el-aside{
    padding: 1px;
    border: 0px;
}
</style>
