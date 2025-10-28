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

type DictTyprData = {
    id: number | null,
    dictName: string | null,
    dictType: string | null,
    status: number | null,
    createBy: string | null,
    createTime: string | null,
    updateBy: string | null,
    updateTime: string | null,
    remark: string | null,
    dictDataList?: Array<DictData>
    
}

type DictData = {
        dictDataId: number | null,
        dictDataSort: number | null,
        dictDataLabel: string | null,
        dictDataValue: string | null,
        isDefault: string | null,
        dictDataStatus: number | null,
        dictDataCreateBy: string | null,
        dictDataCreateTime: string | null,
        dictDataUpdateBy: string | null,
        dictDataUpdateTime: string | null,
        dictDataRemark: string | null,
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

const dictTableList = ref({
  data: [] as Array<DictTyprData>,
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
  
  getDictList(payload).then((res) => {
    console.log(res);
    dictTableList.value = res;
    console.log(dictTableList.value);
  });
}


onMounted(async () => {
    getDictListData()
})

type editFormData = {
    id: number | null,
    dictName: string | null,
    dictType: string | null,
    status: number | null,
    createBy: string | null,
    createTime: string | null,
    updateBy: string | null,
    updateTime: string | null,
    remark: string | null,
    dictDataList?: Array<DictData>
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
  dialogVisible.value = true
}

function deleteUser(id: number){
  ElMessageBox.confirm('确定要删除该用户吗？', '确认', {
    type: 'warning'
  }).then(() => {
    deleteDictById(id).then((res) => {
      console.log(res);
      ElMessage.success('删除成功')
      getDictListData();
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
      updateDict(editForm.value).then((res) => {
        console.log(res);
      });
      ElMessage.success('修改成功')
    } else {
      // 新增到列表头部
      addDict(editForm.value).then((res) => {
        console.log(res);
      });
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
    deleteDictByIds(multipleSelectionByIds.value as unknown as number).then((res) => {
      console.log(res);
      getDictListData();
    });
    ElMessage.success('删除成功')
  }).catch(() => {
    // 取消
  })
}



const editFormRef = ref()
const editForm = ref<editFormData>({
  id: null,
  dictName: '',
  dictType: '',
  status: 0,
  createBy: '',
  createTime: '',
  updateBy: '',
  updateTime: '',
  remark: '',
  dictDataList: [{
    dictDataId: null,
    dictDataSort: null,
    dictDataLabel: '',
    dictDataValue: '',
    isDefault: 'N',
    dictDataStatus: 0,
    dictDataCreateBy: '',
    dictDataCreateTime: '',
    dictDataUpdateBy: '',
    dictDataUpdateTime: '',
    dictDataRemark: '',
  }]
})

const editRules = reactive<FormRules<editFormData>>({
  // username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  // password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  // email: [{ type: 'email', required: true, message: '请输入正确邮箱', trigger: 'blur' }],
  // phone: [{ required: true, message: '请输入电话', trigger: 'blur' }]
})




const handleSizeChange = (val: number) => {
  console.log(`${val} items per page`)
  pageSize.value = val;
  getDictListData()
}

const handleCurrentChange = (val: number) => {
  console.log(`current page: ${val}`)
  currentPage.value = val;
  getDictListData()
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
  getDictListData()
}

function handleReset() {
  searchForm.value = {
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
  }
  createRange.value = null
  updateRange.value = null
  currentPage.value = 1
  
  getDictListData()
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


const selectable = (row: any) => ![1, 31].includes(row.id)

</script>

<template>

  <el-form :model="searchForm" label-width="90px" class="search-form" inline>
    <el-row :gutter="12" style="margin-bottom:12px;">
      <el-col :span="6">
        <el-form-item label="字典名称">
          <el-input v-model="searchForm.dictName" placeholder="请输入字典名称" />
        </el-form-item>
      </el-col>
      <el-col :span="6">
        <el-form-item label="字典类型">
          <el-input v-model="searchForm.dictType" placeholder="请输入字典类型" />
        </el-form-item>
      </el-col>

      <el-col :span="6">
        <el-form-item label="状态">
          <el-select v-model="searchForm.status"  placeholder="请选择状态" style="width: 200px" clearable>
            <el-option label="启用" :value="0" />
            <el-option label="禁用" :value="1" />
          </el-select>
        </el-form-item>
      </el-col>

      <el-col :span="6">
        <el-form-item label="创建人">
          <el-input v-model="searchForm.createBy" placeholder="请输入创建人"/>
        </el-form-item>
      </el-col>

      <el-col :span="6">
        <el-form-item label="修改人">
          <el-input v-model="searchForm.updateBy" placeholder="请输入修改人"/>
        </el-form-item>
      </el-col>

      <el-col :span="9">
        <el-form-item label="创建时间">
          <el-date-picker
            v-model="createRange"
            type="datetimerange"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD HH:mm:ss"
            :default-time="defaultTime"
            style="width: 300px;"
          />
        </el-form-item>
      </el-col>

      <el-col :span="9">
        <el-form-item label="修改时间">
          <el-date-picker
            v-model="updateRange"
            type="datetimerange"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD HH:mm:ss"
            :default-time="defaultTime"
            style="width: 300px;"
          />
        </el-form-item>
      </el-col>

      <el-col :span="6" style="margin-left: 2vw;gap:8px;" >
        <el-button type="primary" @click="handleSearch">搜索</el-button>
        <el-button @click="handleReset">重置</el-button>
        <el-button @click="log()">打印</el-button>
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
      :data="dictTableList.data"
      :border="parentBorder"
      :preserve-expanded-content="preserveExpanded"
      :header-cell-style="{ textAlign: 'center' }"
      :cell-style="{ textAlign: 'center' }"
      style="width: 100%"
    >
    <el-table-column type="selection" width="55" :selectable="selectable" />
    <el-table-column type="expand">
      <template #default="props">
        <div m="4">
          <h3  @click="console.log(props)" style="padding-left: 20px;">字典详情</h3>
          <el-table :data="props.row.dictDataList" :border="childBorder" :header-cell-style="{ textAlign: 'center' }" :cell-style="{ textAlign: 'center' }">
            <el-table-column label="数据标签" prop="dictDataLabel" />
            <el-table-column label="数据键值" prop="dictDataValue" />
            <el-table-column label="默认" prop="isDefault" >
              <template #default="scope">
                <span v-if="scope.row.isDefault === 'Y'">是</span>
                <span v-else-if="scope.row.isDefault === 'N'">否</span>
              </template>
            </el-table-column>
            <el-table-column label="数据状态" prop="dictDataStatus" >
              <template #default="scope">
                <span v-if="scope.row.dictDataStatus === 0">启用</span>
                <span v-else-if="scope.row.dictDataStatus === 1">禁用</span>
              </template>
            </el-table-column>
            <el-table-column label="创建者" prop="dictDataCreateBy" />
            <el-table-column label="创建时间" prop="dictDataCreateTime" />
            <el-table-column label="修改者" prop="dictDataUpdateBy" />
            <el-table-column label="修改时间" prop="dictDataUpdateTime" />
            <el-table-column label="备注" prop="dictDataRemark" />
            <el-table-column label="操作" prop="dictDataRemark" >
              <template #default="scope">
                <el-button type="text" size="small" @click="openEdit(scope.row.id)">编辑</el-button>
                <el-button type="text" size="small" @click="deleteUser(scope.row.id)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </template>
    </el-table-column>
    <el-table-column label="字典名称" prop="dictName" />
    <el-table-column label="字典类型" prop="dictType" />
    <el-table-column label="字典状态" prop="status" >
      <template #default="scope">
        <span v-if="scope.row.status === 0">启用</span>
        <span v-else-if="scope.row.status === 1">禁用</span>
      </template>
    </el-table-column>
    <el-table-column label="创建人" prop="createBy" />
    <el-table-column label="创建时间" prop="createTime" />
    <el-table-column label="修改人" prop="updateBy" />
    <el-table-column label="修改时间" prop="updateTime" />
    <el-table-column label="备注" prop="remark" />
    <el-table-column label="操作" >
      <template #default="scope">
        <el-button type="text" size="small" @click="openEdit(scope.row.id)">编辑</el-button>
        <el-button type="text" size="small" @click="deleteUser(scope.row.id)">删除</el-button>
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
      :total="dictTableList.total"
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
    />
    </div>
  </div>


  

  <!-- 新增/编辑对话框 -->
  <el-dialog :title="isEditing ? '修改字典' : '新增字典'" v-model="dialogVisible" width="520px">
    <el-form :model="editForm" :rules="editRules" ref="editFormRef" label-width="100px" label-position="left">
      <el-form-item label="字典名称" prop="dictName">
        <el-input v-model="editForm.dictName" placeholder="请输入字典名称" />
      </el-form-item>
      <el-form-item label="字典类型" prop="dictType">
        <el-input v-model="editForm.dictType"  placeholder="请输入字典类型" />
      </el-form-item>
      <el-form-item label="字典状态" prop="status">
        <el-select v-model="editForm.status"  placeholder="请选择字典状态">
            <el-option label="启用" :value="0" />
            <el-option label="禁用" :value="1" />
        </el-select>
      </el-form-item>
      <el-form-item v-show="isEditing" label="创建人" prop="createBy">
        <el-input v-model="editForm.createBy" placeholder="请输入创建人"/>
      </el-form-item>
      <el-form-item v-show="isEditing" label="创建时间" prop="createTime" >
        <el-date-picker 
            v-model="editForm.createTime" 
            type="datetime" 
            value-format="yyyy-MM-DD HH:mm:ss" placeholder="请输入创建时间"/>
      </el-form-item>
      <el-form-item v-show="isEditing" label="修改人" prop="updateBy" >
        <el-input v-model="editForm.updateBy" placeholder="请输入修改人"/>
      </el-form-item>
      <el-form-item v-show="isEditing" label="修改时间" prop="updateTime" >
          <el-date-picker 
            v-model="editForm.updateTime" 
            type="datetime" 
            value-format="yyyy-MM-DD HH:mm:ss" placeholder="请输入修改时间"/>
      </el-form-item>
      <el-form-item label="备注" prop="remark" >
        <el-input v-model="editForm.remark" placeholder="请输入备注"/>
      </el-form-item>

        <el-table :data="editForm.dictDataList" :header-cell-style="{ textAlign: 'center' }" :cell-style="{ textAlign: 'center' }">
            <el-table-column label="数据标签" prop="dictDataLabel" >
              <template #default="scope">
                <el-input v-model="scope.row.dictDataLabel" placeholder="请输入数据标签"/>
              </template>
            </el-table-column>
            <el-table-column label="数据键值" prop="dictDataValue" >
              <template #default="scope">
                <el-input v-model="scope.row.dictDataValue" placeholder="请输入数据键值"/>
              </template>
            </el-table-column>
            <el-table-column label="默认" prop="isDefault" >
              <template #default="scope">
                <span v-if="scope.row.isDefault === 'Y'">是</span>
                <span v-else-if="scope.row.isDefault === 'N'">否</span>
              </template>
            </el-table-column>
            <el-table-column label="数据状态" prop="dictDataStatus" >
              <template #default="scope">
                <span v-if="scope.row.dictDataStatus === 0">启用</span>
                <span v-else-if="scope.row.dictDataStatus === 1">禁用</span>
              </template>
            </el-table-column>
            <el-table-column label="创建者" prop="dictDataCreateBy" />
            <el-table-column label="创建时间" prop="dictDataCreateTime" />
            <el-table-column label="修改者" prop="dictDataUpdateBy" />
            <el-table-column label="修改时间" prop="dictDataUpdateTime" />
            <el-table-column label="备注" prop="dictDataRemark" />
            <el-table-column label="操作" prop="dictDataRemark" >
              <template #default="scope">
                <el-button type="text" size="small" @click="openEdit(scope.row.id)">编辑</el-button>
                <el-button type="text" size="small" @click="deleteUser(scope.row.id)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
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
