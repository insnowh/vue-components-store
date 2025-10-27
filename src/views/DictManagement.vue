<script lang='ts' setup>
import { getDictList, addDict, updateDict, selectDictById, deleteDictById, deleteDictByIds } from "../api/DictManagement";
import { onMounted, reactive, ref } from "vue";
import type { ComponentSize, FormRules } from 'element-plus'

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
    dictName: string | null,
    dictType: string | null,
    status: number | null,
    createBy: string | null,
    createStartTime: string | null,
    createEndTime: string | null,
    updateBy: string | null,
    updateStartTime: string | null,
    updateEndTime: string | null,
    pageSize: number | null,
    pageNum: number | null,
}

type FormData = {
    dictName: string | null,
    dictType: string | null,
    status: number | null,
    createBy: string | null,
    createTime: string | null,
    updateBy: string | null,
    updateTime: string | null,
    
}

const searchForm = ref<searchFormData>({
    dictName: null,
    dictType: null,
    status: null,
    createBy: null,
    createStartTime: null,
    createEndTime: null,
    updateBy: null,
    updateStartTime: null,
    updateEndTime: null,
    pageNum: null,
    pageSize: null
})

const currentPage = ref(1);

const pageSize = ref(10);

const createRange = ref<[string, string] | null>(null);

const updateRange = ref<[string, string] | null>(null);

const dictList = ref({
  data: [] as Array<FormData>,
  total: 0
});

function getDictListData() {
  // 同步分页参数
  searchForm.value.pageNum = currentPage.value
  searchForm.value.pageSize = pageSize.value

  // 构造请求参数：如果有 registerRange 则拆成 registerStart / registerEnd
  const payload: any = { ...searchForm.value }
  if (createRange.value && createRange.value.length === 2) {
    payload.createStartTime = createRange.value[0]
    payload.createEndTime = createRange.value[1]
  } else {
    payload.createStartTime = null
    payload.createEndTime = null
  }
  if (updateRange.value && updateRange.value.length === 2) {
    payload.updateStartTime = updateRange.value[0]
    payload.updateEndTime = updateRange.value[1]
  } else {
    payload.updateStartTime = null
    payload.updateEndTime = null
  }
  // 不向后端传递 registerRange 数组（如后端需要可保留）
  // delete payload.registerRange

  getDictList(payload).then((res) => {
    console.log(res);
    dictList.value = res;
  });
}


onMounted(async () => {
    getDictListData()
})

type editFormData = {
    
}



const multipleSelection = ref<FormData[]>([])


const size = ref<ComponentSize>('default')

const background = ref(false)
const disabled = ref(false)

const dialogVisible = ref(false);

const isEditing = ref(true);

const editingIndex = ref<number | null>(null)

/* 新增：打开新增对话框 */
function openAdd() {
  editForm.value = Object.assign(editForm.value, {
    
  })
  isEditing.value = false
  editingIndex.value = null

  
  dialogVisible.value = true
}


/* 修改：点击表格行的修改按钮时打开编辑对话框并填充数据 */
function openEdit(id: number) {
  selectDictById(id as number).then((res) => {
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
    deleteDictById(id).then((res) => {
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
      updateDict(editForm.value).then((res) => {
        console.log(res);
      });
      ElMessage.success('修改成功')
    } else {
      // 新增到列表头部
      addDict(editForm.value).then((res) => {
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
    deleteDictByIds(multipleSelectionByIds.value as unknown as number).then((res) => {
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



const parentBorder = ref(false)
const childBorder = ref(false)
const preserveExpanded = ref(false)
const tableData = [
  {
    date: '2016-05-03',
    name: 'Tom',
    state: 'California',
    city: 'San Francisco',
    address: '3650 21st St, San Francisco',
    zip: 'CA 94114',
    family: [
      {
        name: 'Jerry',
        state: 'California',
        city: 'San Francisco',
        address: '3650 21st St, San Francisco',
        zip: 'CA 94114',
      },
      {
        name: 'Spike',
        state: 'California',
        city: 'San Francisco',
        address: '3650 21st St, San Francisco',
        zip: 'CA 94114',
      },
      {
        name: 'Tyke',
        state: 'California',
        city: 'San Francisco',
        address: '3650 21st St, San Francisco',
        zip: 'CA 94114',
      },
    ],
  },
  {
    date: '2016-05-02',
    name: 'Tom',
    state: 'California',
    city: 'San Francisco',
    address: '3650 21st St, San Francisco',
    zip: 'CA 94114',
    family: [
      {
        name: 'Jerry',
        state: 'California',
        city: 'San Francisco',
        address: '3650 21st St, San Francisco',
        zip: 'CA 94114',
      },
      {
        name: 'Spike',
        state: 'California',
        city: 'San Francisco',
        address: '3650 21st St, San Francisco',
        zip: 'CA 94114',
      },
      {
        name: 'Tyke',
        state: 'California',
        city: 'San Francisco',
        address: '3650 21st St, San Francisco',
        zip: 'CA 94114',
      },
    ],
  },
  {
    date: '2016-05-04',
    name: 'Tom',
    state: 'California',
    city: 'San Francisco',
    address: '3650 21st St, San Francisco',
    zip: 'CA 94114',
    family: [
      {
        name: 'Jerry',
        state: 'California',
        city: 'San Francisco',
        address: '3650 21st St, San Francisco',
        zip: 'CA 94114',
      },
      {
        name: 'Spike',
        state: 'California',
        city: 'San Francisco',
        address: '3650 21st St, San Francisco',
        zip: 'CA 94114',
      },
      {
        name: 'Tyke',
        state: 'California',
        city: 'San Francisco',
        address: '3650 21st St, San Francisco',
        zip: 'CA 94114',
      },
    ],
  },
  {
    date: '2016-05-01',
    name: 'Tom',
    state: 'California',
    city: 'San Francisco',
    address: '3650 21st St, San Francisco',
    zip: 'CA 94114',
    family: [
      {
        name: 'Jerry',
        state: 'California',
        city: 'San Francisco',
        address: '3650 21st St, San Francisco',
        zip: 'CA 94114',
      },
      {
        name: 'Spike',
        state: 'California',
        city: 'San Francisco',
        address: '3650 21st St, San Francisco',
        zip: 'CA 94114',
      },
      {
        name: 'Tyke',
        state: 'California',
        city: 'San Francisco',
        address: '3650 21st St, San Francisco',
        zip: 'CA 94114',
      },
    ],
  },
  {
    date: '2016-05-08',
    name: 'Tom',
    state: 'California',
    city: 'San Francisco',
    address: '3650 21st St, San Francisco',
    zip: 'CA 94114',
    family: [
      {
        name: 'Jerry',
        state: 'California',
        city: 'San Francisco',
        address: '3650 21st St, San Francisco',
        zip: 'CA 94114',
      },
      {
        name: 'Spike',
        state: 'California',
        city: 'San Francisco',
        address: '3650 21st St, San Francisco',
        zip: 'CA 94114',
      },
      {
        name: 'Tyke',
        state: 'California',
        city: 'San Francisco',
        address: '3650 21st St, San Francisco',
        zip: 'CA 94114',
      },
    ],
  },
  {
    date: '2016-05-06',
    name: 'Tom',
    state: 'California',
    city: 'San Francisco',
    address: '3650 21st St, San Francisco',
    zip: 'CA 94114',
    family: [
      {
        name: 'Jerry',
        state: 'California',
        city: 'San Francisco',
        address: '3650 21st St, San Francisco',
        zip: 'CA 94114',
      },
      {
        name: 'Spike',
        state: 'California',
        city: 'San Francisco',
        address: '3650 21st St, San Francisco',
        zip: 'CA 94114',
      },
      {
        name: 'Tyke',
        state: 'California',
        city: 'San Francisco',
        address: '3650 21st St, San Francisco',
        zip: 'CA 94114',
      },
    ],
  },
  {
    date: '2016-05-07',
    name: 'Tom',
    state: 'California',
    city: 'San Francisco',
    address: '3650 21st St, San Francisco',
    zip: 'CA 94114',
    family: [
      {
        name: 'Jerry',
        state: 'California',
        city: 'San Francisco',
        address: '3650 21st St, San Francisco',
        zip: 'CA 94114',
      },
      {
        name: 'Spike',
        state: 'California',
        city: 'San Francisco',
        address: '3650 21st St, San Francisco',
        zip: 'CA 94114',
      },
      {
        name: 'Tyke',
        state: 'California',
        city: 'San Francisco',
        address: '3650 21st St, San Francisco',
        zip: 'CA 94114',
      },
    ],
  },
]

</script>

<template>
    
  <!-- 操作按钮：新增 与 批量删除 -->
  <div style="margin-bottom:12px; display:flex; gap:8px;padding-left: 2vw;">
    <el-button type="primary" @click="openAdd">新增</el-button>
    <el-button type="danger" @click="batchDelete">批量删除</el-button>
  </div>

  <div>

    <el-table
    :data="tableData"
    :border="parentBorder"
    :preserve-expanded-content="preserveExpanded"
    style="width: 100%"
  >
    <el-table-column type="expand">
      <template #default="props">
        <div m="4">
          <p m="t-0 b-2">State: {{ props.row.state }}</p>
          <p m="t-0 b-2">City: {{ props.row.city }}</p>
          <p m="t-0 b-2">Address: {{ props.row.address }}</p>
          <p m="t-0 b-2">Zip: {{ props.row.zip }}</p>
          <h3>Family</h3>
          <el-table :data="props.row.family" :border="childBorder">
            <el-table-column label="Name" prop="name" />
            <el-table-column label="State" prop="state" />
            <el-table-column label="City" prop="city" />
            <el-table-column label="Address" prop="address" />
            <el-table-column label="Zip" prop="zip" />
          </el-table>
        </div>
      </template>
    </el-table-column>
    <el-table-column label="Date" prop="date" />
    <el-table-column label="Name" prop="name" />
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
      :total="50"
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
    />
    </div>
  </div>

  <!-- 新增/编辑对话框 -->
  <el-dialog :title="isEditing ? '修改用户' : '新增用户'" v-model="dialogVisible" width="520px">
    <el-form :model="editForm" :rules="editRules" ref="editFormRef" label-width="100px" label-position="left">
      
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
