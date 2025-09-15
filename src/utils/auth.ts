import Cookies from "js-cookie"

// 将Authorization存储到Cookie中

const Tokenkey = "Authorization"

export function getToken() {
    
    return Cookies.get(Tokenkey)
}

export function setToken(token:any) {
    return Cookies.set(Tokenkey,token)
}

export function removeToken() {
    return Cookies.remove(Tokenkey)
}