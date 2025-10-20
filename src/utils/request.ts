import axios from 'axios';
import {getToken} from './auth';
import {tansParams} from './reqestUtils';
import errorCode from './errorCode';
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus';
import cache from './cache'
// import {useRequestStore} from '../stores/useRequestStore.js';

// Extend Axios request config to include custom properties
declare module 'axios' {
    export interface InternalAxiosRequestConfig {
        isCaptcha?: boolean;
    }
}



// const requestStore = useRequestStore()


let captcha:any;


let isRelogin = {show:false}

const service = axios.create({
    baseURL:"http://localhost:8083/web",
    timeout:10000
})



axios.defaults.headers['Content-Type'] = 'application/json;charset=utf-8'

axios.defaults.headers['Access-Control-Allow-Origin'] = "*"

// 配置请求拦截器
service.interceptors.request.use(config=>{
    const isToken = (config.headers || {}).isToken === false
    
    if (config["isCaptcha"]) {
        config.responseType = "blob"
    }

    if (getToken() && !isToken) {
        config.headers['Authorization'] = getToken()
    }else{

        // config.headers["captcha"] = captcha
    }
    // console.log(config.headers['Authorization']);
    if (config.method === 'get' && config.params) {
        let url = config.url + "?" + tansParams(config.params)
        url = url.slice(0,-1)
        config.params = {}
        config.url = url

        console.log(url);
        
    }
    if (config.method === 'post' || config.method === 'put') {
        const requestObj = {
            url : config.url,
            data : typeof config.data === 'object' ? JSON.stringify(config.data) : config.data,
            time : new Date().getTime()
        }

        //判断传输过去数据的大小
        const requestSize = Object.keys(JSON.stringify(requestObj)).length
        //限制存放的最大为5MB
        const limitSize = 5*1024*1024
        //判断大小是否超出限制范围
        if (requestSize>=limitSize) {
            //打印警告
            console.warn(`[${config.url}]:` + '请求数据大小超出允许的5M限制，无法进行放重复提交验证');
            //返回config
            return config
        }

        //没有超出
        //sessionObj 可能包含有关用户会话的信息，例如用户的身份验证状态、配置选项或其他相关数据。
        const sessionObj = cache.session.getJSON('sessionObj')
        //判断sessionObj是否为空
        if (sessionObj === undefined || sessionObj === null || sessionObj === '') {
            cache.session.setJSON('sessionObj', requestObj)
          } else {
            const s_url = sessionObj.url;                  // 请求地址
            const s_data = sessionObj.data;                // 请求数据
            const s_time = sessionObj.time;                // 请求时间
            const interval = 1000;                         // 间隔时间(ms)，小于此时间视为重复提交
            if (s_data === requestObj.data && requestObj.time - s_time < interval && s_url === requestObj.url) {
              const message = '数据正在处理，请勿重复提交';
              console.warn(`[${s_url}]: ` + message)
              return Promise.reject(new Error(message))
            } else {
              cache.session.setJSON('sessionObj', requestObj)
            }
          }
    }
    return config
},error=>{
    Promise.reject(error)
})

// 配置拦截器
service.interceptors.response.use(res=>{

    // TODO:验证码，须进行校验排查
    if (typeof res.headers.get === 'function') {
        // 现在 TypeScript 知道这是可调用的
        if (res.headers.get("Captcha")) {
            captcha = res.headers.get("Captcha")
        }
    }

    const code = res.data.code || 200
    const codeKey = String(res.data.code) as keyof typeof errorCode;
    const msg = errorCode[codeKey] || res.data.msg || errorCode["default"]
    //二进制数据直接返回
    // Blob 是一个术语，用于描述一种数据类型，通常用于存储大块的二进制数据
    // ArrayBuffer 是一个用于表示通用、固定长度的原始二进制数据缓冲区的对象。它是一个字节数组
    // if (res.request.responseType === 'blob' || res.request.responseType === 'arraybuffer'){
    //     return res.data
    // }

    

    
    if (code === 401) {
        if (!isRelogin.show) {
            isRelogin.show = true;
            ElMessageBox.confirm(
                '登录状态已过期，您可以继续留在该页面，或者重新登录',
                '系统提示',
                {
                    confirmButtonText: '重新登录',
                    cancelButtonText: '取消',
                    type: 'warning',
                }
            )
            .then(() => {
                // TODO:调用定义好的退出系统方法
                // useRequestStore.LogOut().then(res=>[
                //     location.href = "/"
                // ])
            })
            .catch(() => {
                isRelogin.show = false
            })
        }
        // TODO:
        return Promise.reject("无效的会话，或者会话已过期，请重新登录。")
    } else if (code === 500) {
        ElMessage({ message: msg, type: 'error' })
        return Promise.reject(new Error(msg))
    } else if (code === 601) {
        ElMessage({ message: msg, type: 'warning' })
        return Promise.reject('error')
    } else if (code !== 200) {
        ElNotification.error({ title: msg })
        return Promise.reject('error')
    } else {
        
        return res.data
    }
},error=>{
    let {message} = error

    if (message=="Network Error") {
        message = "后端接口连接异常";
    } else if(message.includes("timeout")){
        message = "系统接口请求超时";
    } else if(message.includes("Request failed with status code")){
        message = "系统接口" + message.substr(message.length - 3) + "异常";
    }
    ElMessage({ message: message, type: 'error', duration: 5 * 1000 })
    return Promise.reject(error)
})




export default service