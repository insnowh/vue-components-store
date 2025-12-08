import request from '../utils/request';
import { toRaw } from 'vue'
import type { userEditFormData } from '@/types/user';
import { useInfoStore } from '@/stores/userStores';

type searchFormData = {
  username: string
  email: string
  password: string
  sex: number | null
  phone: string
  status: number | null
  permission: number | null
  pageSize: number
  pageNum: number
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

function getUserList(searchFormData:searchFormData) {
    return request({
        url: 'user/getUserList',
        params: searchFormData,
        method: 'get'
    });
}

function addUser(userForm:editFormData) {
    return request({
        url: 'user/addUser',
        data: userForm,
        method: 'post'
    });
}

function updateUser(userForm:editFormData) {
    return request({
        url: 'user/updateUser',
        data: userForm,
        method: 'put'
    });
}

function selectUserById(id:number) {
    return request({
        url: `user/getUser/${id}`,
        method: 'get'
    });
}

function deleteUserById(id:number) {
    return request({
        url: `user/deleteUser/${id}`,
        method: 'delete'
    });
}

function deleteUserByIds(id:number) {
    return request({
        url: `user/deleteUserByIds`,
        method: 'delete'
    });
}

function updateUserSelfInfoById(userForm:userEditFormData){
    return request({
        url: `user/updateUserSelfInfo`,
        data: userForm,
        method: 'put'
    })
}

// 验证用户输入密码是否正确
function verifyUserPassword(password: string) {

    // 不提取到外面是因为会在Stroe未创建时调用报错
    const userInfo = useInfoStore();
    const currentUserId = userInfo.userInfo.id;

    console.log(currentUserId);
    return request({
        url: `user/verifyUserPassword`,
        data: {
            id: currentUserId,
            password: password
        },
        method: 'post'
    })
}

// 修改用户密码
function editUserPassword(password: string) {

    const userInfo = useInfoStore();
    const currentUserId = userInfo.userInfo.id;

    console.log(currentUserId);
    return request({
        url: `user/editUserPassword`,
        data: {
            id: currentUserId,
            password: password
        },
        method: 'put'
    })
}

// 上传用户头像（返回头像URL）
function uploadUserAvatar(formData: FormData) {
    return request({
        url: 'user/uploadAvatar',
        data: formData,
        method: 'post',
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
}

export { getUserList, addUser, updateUser, selectUserById, deleteUserById, deleteUserByIds, updateUserSelfInfoById, verifyUserPassword, editUserPassword, uploadUserAvatar };