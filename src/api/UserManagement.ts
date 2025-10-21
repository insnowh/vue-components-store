import request from '../utils/request';

type FormData = {
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

function getUserList(loginForm:FormData) {
    return request({
        url: 'user/getUserList',
        params: loginForm,
        method: 'get'
    });
}



export { getUserList };