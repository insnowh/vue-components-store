<script lang='ts' setup>
import { computed, ref, reactive, watch } from 'vue'
import { useInfoStore } from '@/stores/userStores'
import { ElMessage, ElMessageBox } from 'element-plus'
import { updateUserSelfInfoById, verifyUserPassword, editUserPassword } from "@/api/UserManagement";
import type { userEditFormData } from '@/types/user';

const userInfo = useInfoStore();

// 将 store 中的 userInfo 作为响应式数据在模板中使用
const profile = computed(() => userInfo.userInfo || {});

console.log('profile in Profile.vue', profile.value);

// 编辑状态与表单
const isEditing = ref(false)
const formRef = ref()
const form = ref<userEditFormData & { avatar?: string }>({
    id: profile.value.id ?? null,
    username: profile.value.username ?? '',
    email: profile.value.email ?? '',
    password: '·····',
    sex: profile.value.sex ?? null,
    phone: profile.value.phone ?? '',
    registerDate: profile.value.registerDate ?? '',
    avatar: profile.value.avatar ?? ''
});

// 将 store 的数据同步到表单（初始化及后续变化）
watch(
  profile,
  (v) => {
    Object.assign(form.value, {
      id: v.id ?? null,
      username: v.username ?? '',
      password: v.password ?? '',
      sex: v.sex ?? null,
      email: v.email ?? '',
      phone: v.phone ?? '',
      registerDate: v.registerDate ?? '',
      avatar: v.avatar ?? ''
    })
})

//------------------------------------------------------------------------------------------------------------
// 上传相关设置（示例：action 可按后端要求修改）
const uploadAction = '/api/user/upload-avatar' // 若后端路径不同请替换
const uploadHeaders = {
  Authorization: `Bearer ${localStorage.getItem('token') ?? ''}`
}

// 检查文件类型和大小（2MB 限制）
const beforeUpload = (file: File) => {
  const isImage = file.type.startsWith('image/')
  const isLt2M = file.size / 1024 / 1024 < 2
  if (!isImage) {
    ElMessage.error('只能上传图片文件')
  }
  if (!isLt2M) {
    ElMessage.error('图片大小不能超过 2MB')
  }
  return isImage && isLt2M
}

// 上传成功处理：后端应返回新头像的 URL（示例 res.data.url）
const handleUploadSuccess = (res: any) => {
  // 根据后端返回结构调整
  const url = (res && (res.data?.url || res.url || res)) || ''
  if (url) {
    form.value.avatar = url
    ElMessage.success('头像上传成功')
  } else {
    ElMessage.error('未能获取头像地址，请检查后端返回')
  }
}
//------------------------------------------------------------------------------------------------------------

// 操作：编辑 / 取消 / 保存
const edit = () => {
  console.log(form.value);
  isEditing.value = true
}

const cancel = () => {
  // 恢复为 store 中的值，显式赋值以保证类型与 editFormData 匹配（避免 undefined）
  form.value = {
    id: profile.value.id ?? null,
    username: profile.value.username ?? '',
    email: profile.value.email ?? '',
    password: '·····',
    sex: profile.value.sex ?? null,
    phone: profile.value.phone ?? '',
    registerDate: profile.value.registerDate ?? '',
    avatar: profile.value.avatar ?? ''
  };
  isEditing.value = false
}

const save = async () => {
  try {
    console.log("准备更新用户信息",form.value);
    
    updateUserSelfInfoById(form.value).then((res)=>{
        console.log("更新用户信息成功",res);
        // 更新 store 中的用户信息
        userInfo.setUserInfo(res.data);
    }).catch((error)=>{
        console.error("更新用户信息失败",error);
        ElMessage.error('保存失败');
    });
    ElMessage.success('保存成功')
    isEditing.value = false
  } catch (e) {
    console.error(e)
    ElMessage.error('保存失败')
  }
}

// 新增：修改密码流程（保留现有实现）
const editPassword = async (): Promise<void> => {
  try {
    // 1) 请求当前密码（点击蒙版不关闭）
    const currentRes = await ElMessageBox.prompt('请输入当前密码', '验证当前密码', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      inputType: 'password',
      inputPlaceholder: '当前密码',
      closeOnClickModal: false
    }) as any
    const currentPassword: string = currentRes.value

    // 2) 向后端验证当前密码（根据后端接口调整 URL/参数）
    let resp = await verifyUserPassword(currentPassword).then((res)=>{
        console.log("当前密码验证成功",res);
        return res.data;
    }).catch((error)=>{
        console.error("当前密码验证失败",error);
        ElMessage.error('当前密码不正确');
        return;
    });

    if (!resp) {
      ElMessage.error('当前密码错误')
      return
    }

    // 3) 输入新密码（点击蒙版不关闭）
    const newRes = await ElMessageBox.prompt('请输入新密码（至少6位）', '设置新密码', {
      confirmButtonText: '下一步',
      cancelButtonText: '取消',
      inputType: 'password',
      inputPlaceholder: '新密码',
      closeOnClickModal: false
    }) as any
    const newPassword: string = newRes.value

    // 4) 确认新密码（点击蒙版不关闭）
    const confirmRes = await ElMessageBox.prompt('请再次输入新密码以确认', '确认新密码', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      inputType: 'password',
      inputPlaceholder: '确认新密码',
      closeOnClickModal: false
    }) as any
    const confirmPassword: string = confirmRes.value

    if (newPassword !== confirmPassword) {
      ElMessage.error('两次输入的密码不一致')
      return
    }
    if (newPassword.length < 6) {
      ElMessage.error('密码长度至少 6 位')
      return
    }

    // 5) 发送修改请求
    resp = await editUserPassword(newPassword).then((res)=>{
        console.log("修改密码成功",res);
        ElMessage.success('密码修改成功');
    }).catch((error)=>{
        console.error("修改密码失败",error);
        ElMessage.error('修改密码失败');
    });
  } catch (e) {
    // 用户取消或其他异常，不额外提示
    console.error(e)
  }
}
</script>

<template>
  <el-card style="max-width:760px; margin:16px auto;">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px">
      <div style="display:flex; align-items:center; gap:12px;">
        <!-- 头像展示（非编辑时使用） -->
        <el-avatar :size="48" :src="profile.avatar" v-if="!isEditing" />
        <div style="font-weight:600">个人信息</div>
      </div>
      <div>
        <el-button v-if="!isEditing" type="primary" size="small" @click="editPassword">修改密码</el-button>
        <el-button v-if="!isEditing" type="primary" size="small" @click="edit">编辑个人资料</el-button>
        <el-button v-else type="primary" size="small" @click="save">保存</el-button>
        <el-button v-if="isEditing" size="small" @click="cancel">取消</el-button>
      </div>
    </div>

    <div v-if="!isEditing">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="头像">
          <el-avatar :size="80" :src="profile.avatar" />
        </el-descriptions-item>
        <el-descriptions-item label="用户名">{{ profile.username }}</el-descriptions-item>
        <el-descriptions-item label="密码">·····</el-descriptions-item>
        <el-descriptions-item label="性别">
            <div v-show="profile.sex==0">男</div>
            <div v-show="profile.sex==1">女</div>
            <div v-show="profile.sex==2">保密</div>
        </el-descriptions-item>
        <el-descriptions-item label="邮箱">{{ profile.email }}</el-descriptions-item>
        <el-descriptions-item label="电话">{{ profile.phone }}</el-descriptions-item>
        <el-descriptions-item label="注册时间">{{ profile.registerDate }}</el-descriptions-item>
      </el-descriptions>
    </div>

    <div v-else>
      <el-form :model="form" ref="formRef" label-width="80px">
        <el-form-item label="头像">
          <el-upload
            class="avatar-uploader"
            :action="uploadAction"
            :headers="uploadHeaders"
            :show-file-list="false"
            :before-upload="beforeUpload"
            :on-success="handleUploadSuccess">
            <el-avatar :size="80" :src="form.avatar" v-if="form.avatar"></el-avatar>
            <div v-else class="avatar-placeholder">
              <i class="el-icon-plus"></i>
              <div style="font-size:12px;margin-top:6px;">上传头像</div>
            </div>
          </el-upload>
        </el-form-item>

        <el-form-item label="用户名" prop="username" :rules="[{ required: true, message: '请输入用户名', trigger: 'blur' }]">
          <el-input v-model="form.username" />
        </el-form-item>

        <el-form-item label="性别">
          <el-select v-model="form.sex" placeholder="请选择性别">
            <el-option label="男" :value="0" />
            <el-option label="女" :value="1" />
            <el-option label="保密" :value="2" />
          </el-select>
        </el-form-item>

        <el-form-item label="邮箱" prop="email" :rules="[{ type: 'email', message: '邮箱格式不正确', trigger: 'blur' }]">
          <el-input v-model="form.email" />
        </el-form-item>

        <el-form-item label="电话">
          <el-input v-model="form.phone" />
        </el-form-item>

        <el-form-item label="注册时间">
          <el-input v-model="form.registerDate" disabled />
        </el-form-item>
      </el-form>
    </div>
  </el-card>
</template>

<style scoped>
.el-card{
  padding: 12px;
}
.avatar-uploader {
  display: inline-block;
  cursor: pointer;
}
.avatar-placeholder {
  width:80px;
  height:80px;
  display:flex;
  align-items:center;
  justify-content:center;
  flex-direction:column;
  border:1px dashed #d9d9d9;
  border-radius:4px;
  color:#909399;
}
</style>
