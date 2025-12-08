<script lang='ts' setup>
import { computed, ref, reactive, watch, nextTick } from 'vue'
import { useInfoStore } from '@/stores/userStores'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
    updateUserSelfInfoById, 
    verifyUserPassword, 
    editUserPassword, 
    uploadUserAvatar 
} from "@/api/UserManagement";
import type { userEditFormData } from '@/types/user';

const userInfo = useInfoStore();

// const BASE_URL = import.meta.env.VITE_APP_BASE_API as string;

const BASE_URL = 'http://localhost:8083';

// 将 store 中的 userInfo 作为响应式数据在模板中使用
const profile = computed(() => userInfo.userInfo || {});

// console.log('profile in Profile.vue', profile.value);

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

// 头像相关状态
const avatarFile = ref<File | null>(null)
const avatarPreviewUrl = ref<string>('')
const avatarUploading = ref(false)

// 将 store 的数据同步到表单
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
    },
    { deep: true }
)

// 处理头像选择
const handleAvatarSelect = (event: Event) => {
    const input = event.target as HTMLInputElement
    if (!input.files || input.files.length === 0) return
    
    const file = input.files[0]
    
    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
        ElMessage.error('只支持 JPG、PNG、GIF、WebP 格式的图片')
        return
    }
    
    // 验证文件大小（2MB）
    const maxSize = 2 * 1024 * 1024
    if (file.size > maxSize) {
        ElMessage.error('图片大小不能超过 2MB')
        return
    }
    
    // 保存文件
    avatarFile.value = file
    
    // 创建预览
    const reader = new FileReader()
    reader.onload = (e) => {
        avatarPreviewUrl.value = e.target?.result as string
        
        // 在预览中显示
        const previewAvatar = document.getElementById('avatar-preview')
        if (previewAvatar) {
            previewAvatar.src = avatarPreviewUrl.value
        }
        
        // 显示上传按钮
        const uploadButton = document.getElementById('avatar-upload-button')
        if (uploadButton) {
            uploadButton.style.display = 'block'
        }
    }
    reader.readAsDataURL(file)
    
    // 重置输入框
    input.value = ''
}

// 上传头像
const uploadAvatar = async () => {
    if (!avatarFile.value || !form.value.id) {
        ElMessage.warning('请先选择头像图片')
        return
    }
    
    try {
        avatarUploading.value = true
        
        // 创建 FormData
        const formData = new FormData()
        formData.append('avatar', avatarFile.value)
        formData.append('userId', form.value.id.toString())
        
        // 调用上传接口
        const response = await uploadUserAvatar(formData).then(res => {
        //   console.log(res);
          
          return res;
        }).catch(error => {
        //   console.error("头像上传接口调用失败", error);
          throw error;
        });

        
        
        if (response.code === 200) {
            const avatarUrl = response.data.avatarUrl as string;
            
            // 更新表单和store
            form.value.avatar = avatarUrl
            const updatedUser = {
                ...userInfo.userInfo,
                avatar: avatarUrl
            }
            userInfo.setUserInfo(updatedUser)
            
            // ElMessage.success('头像上传成功')
            
            // 重置状态
            avatarFile.value = null
            avatarPreviewUrl.value = ''
            
            // 隐藏上传按钮
            const uploadButton = document.getElementById('avatar-upload-button')
            if (uploadButton) {
                uploadButton.style.display = 'none'
            }
            
        } else {
            ElMessage.error(response.message || '头像上传失败')
        }
    } catch (error: any) {
        console.error('头像上传失败:', error)
        ElMessage.error(error.message || '头像上传失败')
    } finally {
        avatarUploading.value = false
    }
}

// 操作：编辑 / 取消 / 保存
const edit = () => {
    // console.log(form.value)
    isEditing.value = true
    
    // 重置头像预览
    avatarFile.value = null
    avatarPreviewUrl.value = ''
    
    // 隐藏上传按钮
    nextTick(() => {
        const uploadButton = document.getElementById('avatar-upload-button')
        if (uploadButton) {
            uploadButton.style.display = 'none'
        }
        
        // 恢复预览头像
        const previewAvatar = document.getElementById('avatar-preview')
        if (previewAvatar && form.value.avatar) {
            previewAvatar.src = form.value.avatar
        }
    })
}

const cancel = () => {
    // 恢复为 store 中的值
    form.value = {
        id: profile.value.id ?? null,
        username: profile.value.username ?? '',
        email: profile.value.email ?? '',
        password: '·····',
        sex: profile.value.sex ?? null,
        phone: profile.value.phone ?? '',
        registerDate: profile.value.registerDate ?? '',
        avatar: profile.value.avatar ?? ''
    }
    
    // 重置头像状态
    avatarFile.value = null
    avatarPreviewUrl.value = ''
    
    isEditing.value = false
}

const save = async () => {
    try {
        // console.log("准备更新用户信息", form.value)

        const result = uploadAvatar();
        // console.log(result);
        
        
        // 更新用户信息（排除头像字段，头像已单独上传）
        const userInfoData = {
            id: form.value.id,
            username: form.value.username,
            email: form.value.email,
            sex: form.value.sex,
            phone: form.value.phone
        }
        
        const response = await updateUserSelfInfoById(userInfoData as any)
        
        if (response.code === 200) {
            // 更新 store
            const updatedUser = {
                ...userInfo.userInfo,
                ...userInfoData
            }
            userInfo.setUserInfo(updatedUser)
            
            

            ElMessage.success('个人信息更新成功')
            isEditing.value = false
        } else {
            ElMessage.error(response.message || '更新失败')
        }
    } catch (error) {
        console.error(error)
        ElMessage.error('保存失败')
    }
}

// 修改密码流程（保持原有实现）
const editPassword = async (): Promise<void> => {
    try {
        const currentRes = await ElMessageBox.prompt('请输入当前密码', '验证当前密码', {
            confirmButtonText: '确认',
            cancelButtonText: '取消',
            inputType: 'password',
            inputPlaceholder: '当前密码',
            closeOnClickModal: false
        }) as any
        const currentPassword: string = currentRes.value

        let resp = await verifyUserPassword(currentPassword).then((res) => {
            // console.log("当前密码验证成功", res)
            return res.data
        }).catch((error) => {
            // console.error("当前密码验证失败", error)
            ElMessage.error('当前密码不正确')
            return
        })

        if (!resp) {
            ElMessage.error('当前密码错误')
            return
        }

        const newRes = await ElMessageBox.prompt('请输入新密码（至少6位）', '设置新密码', {
            confirmButtonText: '下一步',
            cancelButtonText: '取消',
            inputType: 'password',
            inputPlaceholder: '新密码',
            closeOnClickModal: false
        }) as any
        const newPassword: string = newRes.value

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

        resp = await editUserPassword(newPassword).then((res) => {
            // console.log("修改密码成功", res)
            ElMessage.success('密码修改成功')
        }).catch((error) => {
            // console.error("修改密码失败", error)
            ElMessage.error('修改密码失败')
        })
    } catch (e) {
        console.error(e)
    }
}
</script>

<template>
    <el-card style="max-width:760px; margin:16px auto;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px">
            <div style="display:flex; align-items:center; gap:12px;">
                <el-avatar :size="48" :src="BASE_URL + profile.avatar" v-if="!isEditing" />
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
                    <el-avatar :size="80" :src="BASE_URL + profile.avatar" />
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
                    <div style="display: flex; align-items: center; gap: 20px;">
                        <!-- 头像预览 -->
                        <el-avatar 
                            :size="80" 
                            :src="avatarPreviewUrl || BASE_URL + form.avatar" 
                            id="avatar-preview"
                            @click="$refs.avatarInput.click()"
                        />
                        
                        <!-- 上传按钮 -->
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            <!-- <el-button 
                                size="small" 
                                type="primary" 
                                @click="$refs.avatarInput.click()"
                            >
                                选择头像
                            </el-button> -->
                            
                            <input
                                ref="avatarInput"
                                type="file"
                                accept="image/*"
                                style="display: none"
                                @change="handleAvatarSelect"
                            />
                            
                            <!-- <el-button 
                                id="avatar-upload-button"
                                size="small" 
                                type="success" 
                                @click="uploadAvatar"
                                :loading="avatarUploading"
                                style="display: none;"
                            >
                                上传头像
                            </el-button> -->
                            
                            <div style="font-size: 12px; color: #909399;">
                                支持 JPG、PNG、GIF、WebP，最大 2MB
                            </div>
                        </div>
                    </div>
                </el-form-item>

                <el-form-item label="用户名" prop="username" 
                    :rules="[{ required: true, message: '请输入用户名', trigger: 'blur' }]">
                    <el-input v-model="form.username" />
                </el-form-item>

                <el-form-item label="性别">
                    <el-select v-model="form.sex" placeholder="请选择性别">
                        <el-option label="男" :value="0" />
                        <el-option label="女" :value="1" />
                        <el-option label="保密" :value="2" />
                    </el-select>
                </el-form-item>

                <el-form-item label="邮箱" prop="email" 
                    :rules="[{ type: 'email', message: '邮箱格式不正确', trigger: 'blur' }]">
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
.el-card {
    padding: 12px;
}
</style>