<script setup lang="ts">
import { ref } from 'vue'

const activeMenu = ref('')
const handleOpen = (key: string, keyPath: string[]) => {
  console.log(key, keyPath)
}
const handleClose = (key: string, keyPath: string[]) => {
  console.log(key, keyPath)
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
            <el-menu-item index="">首页</el-menu-item>
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
            </el-menu>
        </el-aside>

        <el-container style="height: 100%;">
            <el-header style="background: #fff; box-shadow: 0 2px 8px #f0f1f2; display: flex; align-items: center; justify-content: space-between;">
                <div style="font-size: 20px; font-weight: bold;">Vue组件仓库</div>
                <el-avatar icon="el-icon-user" />
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
