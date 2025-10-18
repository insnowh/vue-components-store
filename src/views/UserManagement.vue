<script lang='ts' setup>


import { getUserList } from "../api/UserManagement";
import { onMounted, ref } from "vue";

const userList = ref([]);


onMounted(async () => {
   getUserListData();
})


function getUserListData() {
  getUserList().then((res) => {
    console.log(res);
    
      userList.value = res.data;
      console.log(userList.value);
   });
}

function handleClick() {
  
}

</script>

<template>
    <el-table :data="userList" style="width: 100%">
    <el-table-column fixed prop="username" label="用户名" />
    <el-table-column prop="password" label="密码" />
    <el-table-column prop="sex" label="性别" />
    <el-table-column prop="email" label="邮箱" />
    <el-table-column prop="phone" label="电话" />
    <el-table-column prop="status" label="账户状态" />
    <el-table-column prop="permission" label="用户权限" />
    <el-table-column prop="registerTime" label="注册日期" />
    <el-table-column fixed="right" label="Operations" >
      <template #default>
        <el-button link type="primary" size="small" @click="handleClick">
          Detail
        </el-button>
        <el-button link type="primary" size="small">Edit</el-button>
      </template>
    </el-table-column>
  </el-table>
</template>

<style scoped>

</style>
