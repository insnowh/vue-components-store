import request from '../utils/request';

function getUserList() {
    return request({
        url: 'user/getUserList',
        method: 'get',
        // data: loginForm
    });
}



export { getUserList };