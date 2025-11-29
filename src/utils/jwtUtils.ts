import { getToken, removeToken } from './auth';

class JWTUtils {
  // 解析JWT
  static parseToken(token:string) {
    // try {
    //   const payload = jwtDecode(token);
    //   return {
    //     header: jwtDecode(token, { header: true }),
    //     payload: payload,
    //     isValid: this.validateToken(payload)
    //   };
    // } catch (error) {
    //   return null;
    // }

    try {
    // 分割JWT的三个部分
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }
    
    // Base64Url解码（需要处理特殊字符）
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('JWT解析失败:', error);
    return null;
  }
  }
  
  // 验证token是否过期
  static validateToken(payload:any) {
    
    if (!payload.exp) return true;
    
    const currentTime = Date.now() / 1000;
    return payload.exp > currentTime;
  }
  
  // 检查token即将过期（在5分钟内过期）
  static isTokenExpiringSoon(thresholdMinutes = 5) {

    const payload = this.getStoredToken();

    console.log("payload" + payload);
    
    if (!payload.exp) return false;
    
    const currentTime = Date.now() / 1000;
    const threshold = thresholdMinutes * 60;
    return (payload.exp - currentTime) < threshold;
  }
  
  // 获取剩余时间（秒）
  static getRemainingTime() {

    const payload = this.getStoredToken();
    
    if (!payload.exp) return null;
    
    const currentTime = Date.now() / 1000;
    return Math.max(0, payload.exp - currentTime);
  }
  
  // 从localStorage获取并解析token
  static getStoredToken() {
    // const token = localStorage.getItem(tokenKey);
    const token = getToken();
    
    if (!token) return null;
    
    const parsed = this.parseToken(token);
    console.log(parsed);
    
    if (!parsed || !this.validateToken(parsed)) {
        console.log(parsed);
        
    //   localStorage.removeItem(tokenKey);
    // removeToken();
      return null;
    }
    
    return parsed;
  }

  static getUserInfo(){
    return this.getStoredToken().payload;
  }

}

export default JWTUtils;