<template>
  <el-aside width="200px" style="background: #2d3a4b; color: #fff">
    <el-menu :default-active="props.activeMenu" class="el-menu-vertical-demo" background-color="#2d3a4b" text-color="#fff" active-text-color="#ffd04b">
      <el-menu-item index="1">
        <span>首页</span>
      </el-menu-item>
      <el-menu-item index="2">
        <span>数据分析</span>
      </el-menu-item>
      <el-menu-item index="3">
        <span>设置</span>
      </el-menu-item>
    </el-menu>
  </el-aside>
</template>

<script setup lang="ts">
import { defineProps } from 'vue'

const props = defineProps<{ activeMenu: string }>()

</script>