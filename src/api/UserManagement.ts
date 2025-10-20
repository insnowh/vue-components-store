import request from '../utils/request';

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

function getUserList(loginForm:FormData) {
    return request({
        url: 'user/getUserList',
        params: loginForm,
        method: 'get'
    });
}



export { getUserList };