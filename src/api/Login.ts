import axios from 'axios';
import request from '../utils/request';
import cache from '../utils/cache';

type LoginForm = {
  username: string
  password: string
  captcha: string
}

function login(loginForm: LoginForm) {
    return request({
        url: '/login',
        method: 'post',
        data: loginForm
    });
}


export { login }