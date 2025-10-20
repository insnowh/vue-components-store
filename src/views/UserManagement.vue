<script lang='ts' setup>


import { getUserList } from "../api/UserManagement";
import { onMounted, ref } from "vue";
import type { ComponentSize } from 'element-plus'

type FormData = {
  username: string
  email: string
  password: string
  sex: 0 | 1 | 2 | null
  phone: string
  status: 0 | 1 | null
  permission: 0 | 1 | 2 | null
  pageSize: number
  pageNum: number
}

const userList = ref([]);

const currentPage = ref(1);

const pageSize = ref(10);

const size = ref<ComponentSize>('default')

const background = ref(false)
const disabled = ref(false)

const formData = ref<FormData>({
  username: "",
  email: "",
  password: "",
  sex: null,
  phone: "",
  status: null,
  permission: null,
  pageNum: currentPage.value,
  pageSize: pageSize.value,
})



onMounted(async () => {
   getUserListData();
})


function getUserListData() {
  getUserList(formData.value).then((res) => {
    console.log(res);
    
      userList.value = res.data;
      console.log(userList.value);
   });
}

function handleClick() {
  
}

const handleSizeChange = (val: number) => {
  console.log(`${val} items per page`)
}
const handleCurrentChange = (val: number) => {
  console.log(`current page: ${val}`)
}

</script>

<template>
  <div>
    <el-table :data="userList" style="width: 100%" table-layout="fixed">
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

    <div class="example-pagination-block">
      <el-pagination
      v-model:current-page="currentPage"
      v-model:page-size="pageSize"
      :page-sizes="[10, 20, 30, 50]"
      :size="size"
      :disabled="disabled"
      :background="background"
      layout="total, sizes, prev, pager, next, jumper"
      :total="400"
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
    />
    </div>
  </div>
    
</template>

<style scoped>

</style>
