import axios from 'axios';
import request from '../utils/request';
import cache from '../utils/cache';

type LoginForm = {
  username: string
  password: string
  captcha: string
}

type RegisterForm = {
  username: string
  email: string
  password: string
  confirm: string
  sex: 0 | 1 | 2
}

function login(loginForm: LoginForm) {
    return request({
        url: '/login',
        method: 'post',
        data: loginForm,
        headers:{
            isToken : false
        }
    });
}

function register(registerForm: RegisterForm) {
    return request({
        url: '/register',
        method: 'post',
        data: registerForm
    });
}

function getCaptcha() {
    return request({
        url:`/captcha?${Math.random()}`,
        method:"get",
        headers:{
            isToken : false
        },
        isCaptcha:true
    })
}


export { login , register , getCaptcha };