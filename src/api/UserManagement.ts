import request from '../utils/request';
import { toRaw } from 'vue'

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

function getUserList(loginForm:searchFormData) {
    return request({
        url: 'user/getUserList',
        params: loginForm,
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

function updateUser(userForm:FormData) {
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

export { getUserList, addUser, updateUser, selectUserById, deleteUserById, deleteUserByIds };