<script lang='ts' setup>
import { getUserList, addUser, updateUser, selectUserById, deleteUserById, deleteUserByIds } from "../api/UserManagement";
import { onMounted, reactive, ref } from "vue";
import type { ComponentSize, FormRules } from 'element-plus'
import { getDict } from "../api/Utils";

/* 新增：引入 Element Plus 表单/输入/选择/日期等组件（按需引入样式） */
import {
  ElForm,
  ElFormItem,
  ElInput,
  ElSelect,
  ElOption,
  ElDatePicker,
  ElButton,
  ElRow,
  ElCol,
  ElDialog,
  ElMessageBox,
  ElMessage
} from 'element-plus'
import 'element-plus/es/components/form/style/css'
import 'element-plus/es/components/form-item/style/css'
import 'element-plus/es/components/input/style/css'
import 'element-plus/es/components/select/style/css'
import 'element-plus/es/components/option/style/css'
import 'element-plus/es/components/date-picker/style/css'
import 'element-plus/es/components/button/style/css'
import 'element-plus/es/components/row/style/css'
import 'element-plus/es/components/col/style/css'

type searchFormData = {
  username: string
  email: string
  password: string
  sex: 0 | 1 | 2 | null
  phone: string
  status: 0 | 1 | null
  permission: 0 | 1 | 2 | null
  pageSize: number
  pageNum: number
  registerStart?: string | null
  registerEnd?: string | null
}

type FormData = {
  id: number | null
  username: string
  email: string
  password: string
  sex: 0 | 1 | 2 | null
  phone: string
  status: 0 | 1 | null
  permission: 0 | 1 | 2 | null
  registerDate: '' | string
}

type editFormData = {
  id: number | null
  username: string
  email: string
  password: string
  sex: 0 | 1 | 2 | null
  phone: string
  status: 0 | 1 | null
  permission: 0 | 1 | 2 | null
  registerDate: '' | string
}

const userList = ref({
  data: [] as Array<FormData>,
  total: 0
});

const multipleSelection = ref<FormData[]>([])

const currentPage = ref(1);

const pageSize = ref(10);

const size = ref<ComponentSize>('default')
const registerRange = ref<[string, string] | null>(null);

const background = ref(false)
const disabled = ref(false)

const dialogVisible = ref(false);

const isEditing = ref(true);

const editingIndex = ref<number | null>(null)

/* 新增：打开新增对话框 */
function openAdd() {
  editForm.value = Object.assign(editForm.value, {
    username: '',
    email: '',
    password: '',
    sex: 2,
    phone: '',
    status: 0,
    permission: 2,
    registerDate: ''
  })
  isEditing.value = false
  editingIndex.value = null

  
  dialogVisible.value = true
}


/* 修改：点击表格行的修改按钮时打开编辑对话框并填充数据 */
function openEdit(id: number) {
  selectUserById(id as number).then((res) => {
    console.log(res);
    editForm.value = res.data;
  });
  isEditing.value = true
  // editingIndex.value = index
  dialogVisible.value = true
}

function deleteUser(id: number){
  ElMessageBox.confirm('确定要删除该用户吗？', '确认', {
    type: 'warning'
  }).then(() => {
    deleteUserById(id).then((res) => {
      console.log(res);
      ElMessage.success('删除成功')
      getUserListData();
    });
  }).catch(() => {
    // 取消
  })
}


/* 新增/保存处理（前端示例：直接修改本地列表；实际应调用后端接口） */
function saveUser() {
  editFormRef.value?.validate(async (valid: boolean) => {
    if (!valid) return
    if (isEditing.value && editingIndex.value !== null) {
      // 更新本地数据
      // userList.value.data[editingIndex.value] = { ...editForm }
      updateUser(editForm.value).then((res) => {
        console.log(res);
      });
      ElMessage.success('修改成功')
    } else {
      // 新增到列表头部
      addUser(editForm.value).then((res) => {
        console.log(res);
      });
      // userList.value.data.unshift({ ...editForm })
      // userList.value.total = (userList.value.total || 0) + 1
      ElMessage.success('新增成功')
    }
    dialogVisible.value = false
  })
}

const multipleSelectionByIds = ref<number[]>([])

/* 批量删除（示例：前端删除，真实场景应调用后端接口） */
function batchDelete() {

  multipleSelectionByIds.value = multipleSelection.value.map(item => item.id as number)

  console.log(multipleSelectionByIds.value);
  
  if (!multipleSelection.value.length) {
    ElMessage.warning('请选择要删除的用户')
    return
  }
  ElMessageBox.confirm('确定要删除选中的用户吗？', '确认', {
    type: 'warning'
  }).then(() => {
    // const toDelete = new Set(multipleSelection.value)
    // userList.value.data = userList.value.data.filter(item => !toDelete.has(item))
    // multipleSelection.value = []
    deleteUserByIds(multipleSelectionByIds.value as unknown as number).then((res) => {
      console.log(res);
      getUserListData();
    });
    ElMessage.success('删除成功')
  }).catch(() => {
    // 取消
  })
}



const editFormRef = ref()
const editForm = ref<editFormData>({
  id: null,
  username: '',
  email: '',
  password: '',
  sex: 2,
  phone: '',
  status: 0,
  permission: 2,
  registerDate: ''
})

const editRules = reactive<FormRules<editFormData>>({
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  email: [{ type: 'email', required: true, message: '请输入正确邮箱', trigger: 'blur' }],
  phone: [{ required: true, message: '请输入电话', trigger: 'blur' }]
})

const searchForm = ref<searchFormData>({
  username: "",
  email: "",
  password: "",
  sex: null,
  phone: "",
  status: null,
  permission: null,
  pageNum: currentPage.value,
  pageSize: pageSize.value,
  registerStart: null,
  registerEnd: null
})

type getDicts = {
    [key: string]: DictData[]
}

type DictData = {
    dictLabel: string | undefined,
    dictValue: string | undefined,
    isDefault: string | undefined,
    status: number | undefined,
}

const dictData = ref([
  "user_sex",
  "permission"
]);

const dicts = ref<getDicts>({});

onMounted(async () => {
   getUserListData();
   getDict(dictData.value).then((res) => {
    dicts.value = res.data;
    console.log(dicts.value);
   });
})

function getUserListData() {
  // 同步分页参数
  searchForm.value.pageNum = currentPage.value
  searchForm.value.pageSize = pageSize.value

  // 构造请求参数：如果有 registerRange 则拆成 registerStart / registerEnd
  const payload: any = { ...searchForm.value }
  if (registerRange.value && registerRange.value.length === 2) {
    payload.registerStart = registerRange.value[0]
    payload.registerEnd = registerRange.value[1]
  } else {
    payload.registerStart = null
    payload.registerEnd = null
  }
  // 不向后端传递 registerRange 数组（如后端需要可保留）
  // delete payload.registerRange

  getUserList(payload).then((res) => {
    console.log(res);
    userList.value = res;
  });
}

const handleSizeChange = (val: number) => {
  console.log(`${val} items per page`)
  pageSize.value = val;
  getUserListData()
}
const handleCurrentChange = (val: number) => {
  console.log(`current page: ${val}`)
  currentPage.value = val;
  getUserListData()
}

const handleSelectionChange = (val: FormData[]) => {
  console.log(val);
  
  multipleSelection.value = val
  console.log(multipleSelection.value);
  console.log(multipleSelection.value[0]);
}

function handleSearch() {
  // 搜索时从第一页开始
  currentPage.value = 1
  getUserListData()
}

function handleReset() {
  searchForm.value = {
    username: "",
    email: "",
    password: "",
    sex: null,
    phone: "",
    status: null,
    permission: null,
    pageNum: currentPage.value,
    pageSize: pageSize.value,
    registerStart: null,
    registerEnd: null
  }
  registerRange.value = null
  currentPage.value = 1
  
  getUserListData()
}

const defaultTime: [Date, Date] = [
  new Date(2000, 1, 1, 12, 0, 0),
  new Date(2000, 2, 1, 8, 0, 0),
]

function log() {
  console.log(editForm.value);
} 

</script>

<template>
  <!-- 搜索区：使用 label 显示字段名称（非 placeholder） -->
  <el-form :model="searchForm" label-width="90px" class="search-form" inline>
    <el-row :gutter="12" style="margin-bottom:12px;">
      <el-col :span="6">
        <el-form-item label="用户名">
          <el-input v-model="searchForm.username" placeholder="请输入用户名" />
        </el-form-item>
      </el-col>

      <el-col :span="6">
        <el-form-item label="性别">
            <el-select v-model="searchForm.sex" placeholder="请选择性别" style="width: 200px" clearable>
              <el-option v-for="item in dicts['user_sex']" :key="String(item.dictValue ?? item.dictLabel ?? '')" :label="item.dictLabel" :value="item.dictValue ?? item.dictLabel ?? ''" />
            </el-select>
          </el-form-item>
      </el-col>

      <el-col :span="6">
        <el-form-item label="邮箱">
          <el-input v-model="searchForm.email" placeholder="请输入邮箱"/>
        </el-form-item>
      </el-col>

      <el-col :span="6">
        <el-form-item label="电话">
          <el-input v-model="searchForm.phone" placeholder="请输入电话"/>
        </el-form-item>
      </el-col>

      <el-col :span="6">
        <el-form-item label="用户状态">
          <el-select v-model="searchForm.status" placeholder="请选择用户状态" style="width: 200px" clearable>
            <el-option label="正常" :value="0" />
            <el-option label="锁定" :value="1" />
          </el-select>
        </el-form-item>
      </el-col>

      <el-col :span="6">
        <el-form-item label="用户权限">
            <el-select v-model="searchForm.permission" placeholder="请选择用户权限" style="width: 200px" clearable>
              <el-option  v-for="item in dicts['permission']" :key="String(item.dictValue ?? item.dictLabel ?? '')" :label="item.dictLabel" :value="item.dictValue ?? item.dictLabel ?? ''"  />
            </el-select>
          </el-form-item>
      </el-col>

      <el-col :span="8">
        <el-form-item label="注册日期">
          <!-- <el-date-picker
            v-model="searchForm.registerRange"
            type="daterange"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="yyyy-MM-dd"
            unlink-panels
            style="width:100%"
          /> -->
          <el-date-picker
            v-model="registerRange"
            type="datetimerange"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD HH:mm:ss"
            :default-time="defaultTime"
          />
        </el-form-item>
      </el-col>
      <el-col :span="6" style="margin-left: 2vw;gap:8px;" >
        <el-button type="primary" @click="handleSearch">搜索</el-button>
        <el-button @click="handleReset">重置</el-button>
        <!-- <el-button @click="log()">打印</el-button> -->
      </el-col>

      
      
    </el-row>
  </el-form>

  <!-- 操作按钮：新增 与 批量删除 -->
  <div style="margin-bottom:12px; display:flex; gap:8px;padding-left: 2vw;">
    <el-button type="primary" @click="openAdd">新增</el-button>
    <el-button type="danger" @click="batchDelete">批量删除</el-button>
  </div>

  <div>
    <el-table
      :data="userList.data"
      style="width: 100%"
      table-layout="fixed"
      :header-cell-style="{ textAlign: 'center' }"
      :cell-style="{ textAlign: 'center' }"
      show-overflow-tooltip
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="55" />
      <el-table-column fixed prop="username" label="用户名" />
      <el-table-column prop="password" label="密码" />
      <el-table-column prop="sex" label="性别" >
        <template #default="scope">
          <span v-if="scope.row.sex === 0">男</span>
          <span v-if="scope.row.sex === 1">女</span>
          <span v-if="scope.row.sex === 2">保密</span>
        </template>
      </el-table-column>
      <el-table-column prop="email" label="邮箱" width="170"/>
      <el-table-column prop="phone" label="电话" />
      <el-table-column prop="status" label="账户状态" >
        <template #default="scope">
          <span v-if="scope.row.status === 0">正常</span>
          <span v-if="scope.row.status === 1">锁定</span>
        </template>
      </el-table-column>
      <el-table-column prop="permission" label="用户权限" >
        <template #default="scope">
          <span v-if="scope.row.permission === 0">管理</span>
          <span v-if="scope.row.permission === 1">员工</span>
          <span v-if="scope.row.permission === 2">用户</span>
        </template>
      </el-table-column>
      <el-table-column prop="registerDate" label="注册日期" />
      <el-table-column fixed="right" label="Operations" >
        <template #default="scope">
          <el-button link type="primary" size="small" @click="openEdit(scope.row.id)">
            修改
          </el-button>
          <el-button link type="primary" size="small" @click="deleteUser(scope.row.id)">删除</el-button>
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
      :total="userList.total"
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
    />
    </div>
  </div>

  <!-- 新增/编辑对话框 -->
  <el-dialog :title="isEditing ? '修改用户' : '新增用户'" v-model="dialogVisible" width="520px">
    <el-form :model="editForm" :rules="editRules" ref="editFormRef" label-width="100px" label-position="left">
      <el-form-item label="用户名" prop="username">
        <el-input v-model="editForm.username" />
      </el-form-item>
      <el-form-item label="密码" prop="password">
        <el-input v-model="editForm.password" />
      </el-form-item>
      <el-form-item label="性别" prop="sex">
        <el-select v-model="editForm.sex">
          <el-option label="男" :value="0" />
          <el-option label="女" :value="1" />
          <el-option label="保密" :value="2" />
        </el-select>
      </el-form-item>
      <el-form-item label="邮箱" prop="email">
        <el-input v-model="editForm.email" />
      </el-form-item>
      <el-form-item label="电话" prop="phone">
        <el-input v-model="editForm.phone" />
      </el-form-item>
      <el-form-item label="用户状态" prop="status">
        <el-select v-model="editForm.status">
          <el-option label="正常" :value="0" />
          <el-option label="锁定" :value="1" />
        </el-select>
      </el-form-item>
      <el-form-item label="用户权限" prop="permission">
        <el-select v-model="editForm.permission">
          <el-option label="管理" :value="0" />
          <el-option label="员工" :value="1" />
          <el-option label="用户" :value="2" />
        </el-select>
      </el-form-item>
      <el-form-item label="注册日期" prop="registerDate">
        <el-date-picker 
          v-model="editForm.registerDate" 
          type="datetime" 
          value-format="yyyy-MM-DD HH:mm:ss" />
          
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="saveUser">保存</el-button>
    </template>
  </el-dialog>



</template>

<style scoped>
.example-pagination-block {
  margin-top: 20px;
  display: flex;
  justify-content: center; /* 居中分页 */
  align-items: center;
  width: 100%;
}
</style>
