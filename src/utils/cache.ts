const sessionCache = {
    set (key:any,value:any){
        //这行代码检查浏览器是否支持 sessionStorage。如果不支持，函数会直接返回，不执行后续操作。
        if (!sessionStorage) {
            return
        }
        //在key和value都不为空的情况下将其存到sessionStorage中
        if (key != null && value != null) {
            sessionStorage.setItem(key,value)
        }
    },
    get(key:any){
        if (!sessionStorage) {
            return null
        }
        //如果key为null，就是没有，返回null
        if (key == null) {
            return null
        }
        //否则就是有，从sessionStorage中取出对应的value值
        return sessionStorage.getItem(key)
    },
    setJSON(key:any,jsonValue:any){
        //确保 jsonValue 不为空的情况下，将 JSON 数据转换为字符串并存储到 sessionStorage 中
        if (jsonValue != null) {
            this.set(key,JSON.stringify(jsonValue))
        }
    },
    getJSON(key:any){
        const value = this.get(key)
        if (value != null) {
            return JSON.parse(value)
        }
    },
    remove(key:any){
        sessionStorage.removeItem(key)
    }
}

const localCache = {
    set(key:any,value:any){
        //判断是否支持localStorage
        if (!localStorage) {
            return
        }
        if (key != null && value != null) {
            localStorage.setItem(key,value)
        }
    },
    get (key:any){
        if (!localStorage) {
            return null
        }
        if (key == null) {
            return null
        }
        return localStorage.getItem(key)
    },
    setJSON(key:any,jsonValue:any){
        if (jsonValue != null) {
            this.set(key,JSON.stringify(jsonValue))
        }
    },
    getJSON(key:any){
        const value = this.get(key)
        if (value != null) {
            return JSON.parse(value)
        }
    },
    remove(key:any){
        localStorage.removeItem(key)
    }
}

export default {
    //TODO:会话级缓存
    session:sessionCache,
    //TODO:本地缓存
    local:localCache
}